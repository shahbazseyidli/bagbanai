"""Regional frost dates (HYBRID_PLAN W7, B18).

B18 — GET /fields/{id}/frost-dates: last spring / first autumn frost climatology for the field's
rayon, computed once from ~20 years of the Open-Meteo archive and cached in the existing
zone_knowledge table (crop_type='*', block_type='frost_dates') so every field in the rayon reuses
it. NOT paid-gated (the Knowledge Passport is; this is basic safety information).

B19 is gone from this file (2026-08-04). It served the two weather blocks that were removed from
the field page — the farmer's rain log (GET/POST/DELETE /fields/{id}/rain) and the year-over-year
precipitation comparison (GET /fields/{id}/weather/yearly, POST /fields/{id}/weather/backfill) —
and nothing called them afterwards. The TABLES stay: public.field_weather_daily is still read by
ai/season.py (season precipitation with its provenance), and public.field_rain_log keeps whatever a
farmer already measured. No migration.
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..ai import frost as frost_mod
from ..ai import knowledge as kb
from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["weather-history"])

# Frost climatology cache key inside zone_knowledge. crop_type='*' = crop-independent block.
FROST_CROP = "*"
FROST_BLOCK = "frost_dates"
FROST_TTL_DAYS = 365


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
    # Quantized below so a member cannot mint unlimited distinct cache keys (each miss is an
    # external 20-year archive call plus a write to the CROSS-ORG shared zone_knowledge row).
    user_id: str = Depends(get_current_user_id),
):
    """Frost climatology for the field's rayon. Cached per zone for a year; free for all members."""
    # Snap the cache key space: rounding the threshold and whitelisting the window means a
    # member cannot bypass the cache (and the write gate) just by nudging a query param.
    threshold_c = round(float(threshold_c), 1)
    years = min((10, 20, 30, 40), key=lambda y: abs(y - int(years)))
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

    # Cache miss → this is the same expensive work `refresh` is gated on (external archive call +
    # a write to the shared zone_knowledge row), so it needs the same role, not just membership.
    if not refresh:
        async with connection(user_id) as conn:
            await require_role(conn, user_id, org_id, ROLES_WRITE)
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
