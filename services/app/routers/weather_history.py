"""Regional frost dates (HYBRID_PLAN W7, B18) + observed weather history & farmer rain log (B19).

B18 — GET /fields/{id}/frost-dates: last spring / first autumn frost climatology for the field's
rayon, computed once from ~20 years of the Open-Meteo archive and cached in the existing
zone_knowledge table (crop_type='*', block_type='frost_dates') so every field in the rayon reuses
it. NOT paid-gated (the Knowledge Passport is; this is basic safety information).

B19 — observed daily weather per field (field_weather_daily, backfilled from the archive) plus the
farmer's own rain-gauge readings (field_rain_log), aggregated per year+month so the UI can draw a
year-over-year comparison of "how wet was this season vs the last ones".
"""
import json
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field as PField

from ..ai import frost as frost_mod
from ..ai import knowledge as kb
from ..ai.sources import openmeteo
from ..db import connection
from ..deps import (ROLES_WORKER, ROLES_WRITE, get_current_user_id, require_member,
                    require_role)
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["weather-history"])

# Frost climatology cache key inside zone_knowledge. crop_type='*' = crop-independent block.
FROST_CROP = "*"
FROST_BLOCK = "frost_dates"
FROST_TTL_DAYS = 365

# The archive API lags a few days behind today.
_ARCHIVE_LAG_DAYS = 5
_ARCHIVE_DAILY = ["temperature_2m_min", "temperature_2m_max",
                  "precipitation_sum", "et0_fao_evapotranspiration"]


# ===== request models (kept local on purpose — schemas.py is shared) =====
class BackfillIn(BaseModel):
    years: int = PField(default=5, ge=1, le=30)


class RainIn(BaseModel):
    observed_on: date
    amount_mm: float = PField(ge=0, le=1000)
    note: Optional[str] = None


# ===== helpers =====
def _num(v) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


async def _field_point(conn, field_id: str) -> tuple[str, float, float, Optional[str]]:
    """(org_id, lat, lon, region) of the field centroid."""
    row = await conn.fetchrow(
        """select f.org_id,
                  st_y(coalesce(f.centroid, st_centroid(f.geom))) as lat,
                  st_x(coalesce(f.centroid, st_centroid(f.geom))) as lon,
                  m.region
           from public.fields f
           left join public.field_metadata m on m.field_id = f.id
           where f.id=$1::uuid""", field_id)
    if not row or row["lat"] is None or row["lon"] is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    return str(row["org_id"]), float(row["lat"]), float(row["lon"]), row["region"]


async def _cached_zone_id(conn, field_id: str) -> Optional[str]:
    """Rayon code already resolved by the research pipeline (field_context block). Avoids a
    Nominatim round-trip inside the request transaction."""
    ctx = await conn.fetchval(
        """select content from public.field_knowledge
           where field_id=$1::uuid and block_type='field_context'""", field_id)
    if not ctx:
        return None
    c = json.loads(ctx) if isinstance(ctx, str) else ctx
    return (c or {}).get("zone_id") or None


# ===== B18 — regional frost dates =====
@router.get("/fields/{field_id}/frost-dates")
async def frost_dates(
    field_id: str,
    refresh: bool = Query(default=False, description="recompute even if cached (agronomist+)"),
    threshold_c: float = Query(default=frost_mod.DEFAULT_THRESHOLD_C, ge=-10.0, le=5.0),
    years: int = Query(default=frost_mod.DEFAULT_YEARS, ge=5, le=40),
    user_id: str = Depends(get_current_user_id),
):
    """Frost climatology for the field's rayon. Cached per zone for a year; free for all members."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        # A forced recompute costs an external call → agronomist+; plain reads are free.
        if refresh:
            await require_role(conn, user_id, org_id, ROLES_WRITE)
        else:
            await require_member(conn, user_id, org_id)
        _org, lat, lon, region = await _field_point(conn, field_id)
        zone_id = await _cached_zone_id(conn, field_id)
        cached = None
        if zone_id and not refresh:
            blocks = await kb.read_zone_blocks(conn, FROST_CROP, zone_id)
            cached = blocks.get(FROST_BLOCK)

    if cached and isinstance(cached.get("content"), dict):
        content = dict(cached["content"])
        # Only serve the cache when it was built with the same frost threshold + window length.
        if (_num(content.get("threshold_c")) == float(threshold_c)
                and int(content.get("requested_years") or 0) == int(years)):
            content.update({"zone_id": zone_id, "cached": True,
                            "refreshed_at": cached.get("refreshed_at")})
            return content

    # Cache miss → resolve the zone (network, outside the transaction) and compute.
    if not zone_id:
        zone_id = await kb.resolve_zone(lat, lon, region)
    clim = await frost_mod.frost_climatology(lat, lon, years=years, threshold_c=threshold_c)
    if not clim.get("ok"):
        raise HTTPException(status_code=503, detail=clim.get("reason") or "frost_unavailable")
    source = clim.pop("source", None)

    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        await kb.upsert_zone_block(
            conn, FROST_CROP, zone_id, FROST_BLOCK, clim, [source] if source else [],
            derived_from="external", confidence=0.85, ttl_days=FROST_TTL_DAYS)

    out = dict(clim)
    out.update({"zone_id": zone_id, "cached": False, "refreshed_at": None})
    return out


# ===== B19 — observed weather history =====
@router.post("/fields/{field_id}/weather/backfill")
async def backfill_weather(field_id: str, body: Optional[BackfillIn] = None,
                           user_id: str = Depends(get_current_user_id)):
    """Pull the Open-Meteo archive for the field centroid and upsert it into field_weather_daily."""
    years = body.years if body else 5
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        _org, lat, lon, _region = await _field_point(conn, field_id)

    end = date.today() - timedelta(days=_ARCHIVE_LAG_DAYS)
    start = date(end.year - (years - 1), 1, 1)
    # Network call OUTSIDE the transaction — a multi-year archive fetch is slow.
    res = await openmeteo.fetch_archive(lat, lon, start=start.isoformat(), end=end.isoformat(),
                                        daily=_ARCHIVE_DAILY, timeout=60.0)
    if not res.ok:
        raise HTTPException(status_code=503, detail=res.error or "archive_unavailable")

    rows = []
    for d in res.data.get("days") or []:
        try:
            day = date.fromisoformat(str(d.get("date"))[:10])
        except (TypeError, ValueError):
            continue
        rows.append((field_id, org_id, day, _num(d.get("t_min")), _num(d.get("t_max")),
                     _num(d.get("precip_mm")), _num(d.get("et0_mm"))))
    if not rows:
        raise HTTPException(status_code=503, detail="archive_empty")

    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await conn.executemany(
            """insert into public.field_weather_daily
                 (field_id, org_id, date, t_min, t_max, precip_mm, et0_mm, source)
               values ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7,'openmeteo_archive')
               on conflict (field_id, date) do update set
                 t_min=excluded.t_min, t_max=excluded.t_max, precip_mm=excluded.precip_mm,
                 et0_mm=excluded.et0_mm, source=excluded.source, updated_at=now()""", rows)

    return {"ok": True, "days": len(rows), "years": years,
            "from": start.isoformat(), "to": end.isoformat()}


@router.get("/fields/{field_id}/weather/yearly")
async def weather_yearly(field_id: str, years: int = Query(default=5, ge=1, le=30),
                         user_id: str = Depends(get_current_user_id)):
    """Per-year monthly aggregates (archive) + the farmer's rain-log totals per month."""
    first_day = date(date.today().year - (years - 1), 1, 1)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select extract(year from w.date)::int as y, extract(month from w.date)::int as m,
                      coalesce(sum(w.precip_mm), 0) as precip,
                      avg(w.t_min) as t_min, avg(w.t_max) as t_max, count(*) as days
               from public.field_weather_daily w
               where w.field_id=$1::uuid and w.date >= $2::date
               group by 1, 2 order by 1, 2""", field_id, first_day)
        rains = await conn.fetch(
            """select extract(year from r.observed_on)::int as y,
                      extract(month from r.observed_on)::int as m,
                      coalesce(sum(r.amount_mm), 0) as amount, count(*) as n
               from public.field_rain_log r
               where r.field_id=$1::uuid and r.observed_on >= $2::date
               group by 1, 2 order by 1, 2""", field_id, first_day)
        last_day = await conn.fetchval(
            "select max(w.date) from public.field_weather_daily w where w.field_id=$1::uuid",
            field_id)

    months = [{
        "year": int(r["y"]), "month": int(r["m"]),
        "precip_mm": round(float(r["precip"]), 1),
        "t_min_mean": round(float(r["t_min"]), 1) if r["t_min"] is not None else None,
        "t_max_mean": round(float(r["t_max"]), 1) if r["t_max"] is not None else None,
        "days": int(r["days"]),
    } for r in rows]
    rain_log = [{
        "year": int(r["y"]), "month": int(r["m"]),
        "amount_mm": round(float(r["amount"]), 1), "entries": int(r["n"]),
    } for r in rains]

    return {
        "years": sorted({m["year"] for m in months}),
        "rain_years": sorted({r["year"] for r in rain_log}),
        "months": months,
        "rain_log": rain_log,
        "has_archive": bool(months),
        "last_date": last_day.isoformat() if last_day else None,
    }


# ===== B19 — farmer rain log =====
@router.get("/fields/{field_id}/rain")
async def list_rain(field_id: str, limit: int = Query(default=120, ge=1, le=1000),
                    user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, observed_on, amount_mm, note, created_at
               from public.field_rain_log
               where field_id=$1::uuid order by observed_on desc limit $2""", field_id, limit)
    return [{
        "id": str(r["id"]), "observed_on": r["observed_on"].isoformat(),
        "amount_mm": float(r["amount_mm"]), "note": r["note"],
        "created_at": r["created_at"].isoformat(),
    } for r in rows]


@router.post("/fields/{field_id}/rain")
async def add_rain(field_id: str, body: RainIn, user_id: str = Depends(get_current_user_id)):
    """One rain-gauge reading. Upserts on (field_id, observed_on) — one entry per day."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        row = await conn.fetchrow(
            """insert into public.field_rain_log
                 (field_id, org_id, observed_on, amount_mm, note, created_by)
               values ($1::uuid,$2::uuid,$3::date,$4,$5,$6::uuid)
               on conflict (field_id, observed_on) do update set
                 amount_mm=excluded.amount_mm, note=excluded.note
               returning id, observed_on, amount_mm, note, created_at""",
            field_id, org_id, body.observed_on, float(body.amount_mm), body.note, user_id)
    return {"id": str(row["id"]), "observed_on": row["observed_on"].isoformat(),
            "amount_mm": float(row["amount_mm"]), "note": row["note"],
            "created_at": row["created_at"].isoformat()}


@router.delete("/fields/{field_id}/rain/{rain_id}")
async def delete_rain(field_id: str, rain_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        res = await conn.execute(
            "delete from public.field_rain_log where id=$1::uuid and field_id=$2::uuid",
            rain_id, field_id)
    # asyncpg returns the command tag, e.g. "DELETE 1".
    deleted = 0
    try:
        deleted = int(str(res).strip().split()[-1])
    except (ValueError, IndexError):
        deleted = 0
    if deleted == 0:
        raise HTTPException(status_code=404, detail="rain_entry_not_found")
    return {"ok": True}
