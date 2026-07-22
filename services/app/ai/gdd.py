"""Growing-Degree-Days accumulation (T4).

Daily GDD = max(0, (tmin + tmax) / 2 − base_c), cumulated from the season start (planting_date,
else Jan 1 of the current year). Temperatures come from the keyless Open-Meteo *archive* API; the
crop base temperature comes from crop_thresholds.gdd_base_c (fallback 10 °C). GDD is the shared
input for phenology stage (T6), FAO-56 stage-Kc (T8), and pest development windows (T9)."""
from __future__ import annotations

from datetime import date, timedelta

from .sources import openmeteo

DEFAULT_BASE_C = 10.0
# The archive API lags a few days behind "today"; cap the window end so the tail isn't empty.
_ARCHIVE_LAG_DAYS = 5
# If a planting_date is older than this it's a perennial / stale value → fall back to Jan 1.
_MAX_SEASON_DAYS = 460


async def _base_c(conn, crop_type) -> float:
    if crop_type:
        b = await conn.fetchval(
            """select gdd_base_c from public.crop_thresholds
               where crop_type=$1 and growth_stage='all' and age_class='all'""", crop_type)
        if b is not None:
            return float(b)
    return DEFAULT_BASE_C


async def refresh_field_gdd(
    conn, field_id: str, *, base: str = "https://archive-api.open-meteo.com/v1",
) -> dict:
    """Recompute daily + cumulative GDD for one field's current season. Best-effort (never raises)."""
    row = await conn.fetchrow(
        """select f.org_id,
                  st_y(coalesce(f.centroid, st_centroid(f.geom))) as lat,
                  st_x(coalesce(f.centroid, st_centroid(f.geom))) as lon,
                  m.crop_type, m.planting_date
           from public.fields f
           left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    if not row:
        return {"ok": False, "reason": "field_not_found"}
    org_id = str(row["org_id"])
    base_c = await _base_c(conn, row["crop_type"])

    today = date.today()
    end = today - timedelta(days=_ARCHIVE_LAG_DAYS)
    season_start = row["planting_date"]
    if not season_start or (today - season_start).days > _MAX_SEASON_DAYS:
        season_start = date(today.year, 1, 1)
    if season_start > end:
        return {"ok": False, "reason": "season_not_started"}

    res = await openmeteo.fetch_archive(
        row["lat"], row["lon"], start=season_start.isoformat(), end=end.isoformat(), base=base)
    if not res.ok:
        return {"ok": False, "reason": res.error}

    cum, n = 0.0, 0
    for d in res.data["days"]:
        tmn, tmx = d.get("t_min"), d.get("t_max")
        if tmn is None or tmx is None:
            continue
        gdd = max(0.0, (float(tmn) + float(tmx)) / 2.0 - base_c)
        cum += gdd
        n += 1
        await conn.execute(
            """insert into public.field_gdd_daily
                 (field_id, org_id, date, season_year, t_min, t_max, base_c, gdd_day, gdd_cumulative)
               values ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7,$8,$9)
               on conflict (field_id, date) do update set
                 t_min=excluded.t_min, t_max=excluded.t_max, base_c=excluded.base_c,
                 gdd_day=excluded.gdd_day, gdd_cumulative=excluded.gdd_cumulative, updated_at=now()""",
            field_id, org_id, date.fromisoformat(d["date"]), season_start.year,
            float(tmn), float(tmx), base_c, round(gdd, 2), round(cum, 1))

    return {"ok": True, "field_id": field_id, "gdd_cumulative": round(cum, 1),
            "days": n, "base_c": base_c, "season_year": season_start.year}
