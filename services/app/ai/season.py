"""Per-field, per-season feature extraction (T16 groundwork). Aggregates each season's vegetation
trajectory (NDVI peak / mean / trapezoidal integral) plus GDD total (T4) and precipitation total
(T8) into field_season_features. This is the FEATURE STORE for a future NDVI-integral ↔ yield
correlation — the model itself is deferred until ≥3 seasons of paired yield data exist. Deterministic
(no LLM); safe on partial data (returns None when a field has no vegetation scenes for the season)."""
from __future__ import annotations

from typing import Optional

# Trapezoidal NDVI integral over the season: Σ (v_i + v_{i-1})/2 · (day_i − day_{i-1}).
_NDVI_AGG = """
with src as (
  select acquired_at, mean from public.index_stats
  where field_id=$1::uuid and index_name='NDVI' and sensor = any($3::text[])
    and extract(year from acquired_at) = $2 and mean is not null
),
tr as (
  select acquired_at, mean,
         lag(mean) over (order by acquired_at) as pv,
         lag(acquired_at) over (order by acquired_at) as pd
  from src
)
select max(mean) as peak, avg(mean) as mean_v,
       coalesce(sum(case when pv is not null then (mean + pv) / 2 * (acquired_at - pd)
                         else 0 end), 0) as integral,
       count(*) as n
from tr
"""


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


async def compute_field_season(conn, field_id: str, season_year: int) -> Optional[dict]:
    """Compute + upsert one field's season features. Prefers Sentinel-2 (10m), falls back to HLS.
    Returns the feature dict, or None if the field is gone or has no vegetation data that season."""
    row = await conn.fetchrow(
        """select f.org_id, m.crop_type
           from public.fields f left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid and f.deleted_at is null""", field_id)
    if not row:
        return None
    org_id, crop = str(row["org_id"]), row["crop_type"]

    used = "S2"
    agg = await conn.fetchrow(_NDVI_AGG, field_id, season_year, ["S2"])
    if not agg or agg["n"] == 0:
        agg = await conn.fetchrow(_NDVI_AGG, field_id, season_year, ["S30", "L30"])
        used = "HLS"
    if not agg or agg["n"] == 0:
        return None  # no vegetation scenes this season — nothing to store yet

    gdd = await conn.fetchval(
        "select max(gdd_cumulative) from public.field_gdd_daily where field_id=$1::uuid and season_year=$2",
        field_id, season_year)
    precip = await conn.fetchval(
        "select sum(precip_mm) from public.field_water_balance where field_id=$1::uuid and extract(year from date)=$2",
        field_id, season_year)

    await conn.execute(
        """insert into public.field_season_features
             (field_id, org_id, season_year, crop_type, ndvi_peak, ndvi_mean, ndvi_integral,
              gdd_total, precip_total_mm, n_scenes, sensor, computed_at)
           values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
           on conflict (field_id, season_year) do update set
             crop_type=excluded.crop_type, ndvi_peak=excluded.ndvi_peak, ndvi_mean=excluded.ndvi_mean,
             ndvi_integral=excluded.ndvi_integral, gdd_total=excluded.gdd_total,
             precip_total_mm=excluded.precip_total_mm, n_scenes=excluded.n_scenes,
             sensor=excluded.sensor, computed_at=now()""",
        field_id, org_id, season_year, crop, _f(agg["peak"]), _f(agg["mean_v"]),
        _f(agg["integral"]), _f(gdd), _f(precip), agg["n"], used)

    return {"field_id": field_id, "season_year": season_year, "crop_type": crop,
            "ndvi_peak": _f(agg["peak"]), "ndvi_mean": _f(agg["mean_v"]),
            "ndvi_integral": _f(agg["integral"]), "gdd_total": _f(gdd),
            "precip_total_mm": _f(precip), "n_scenes": agg["n"], "sensor": used}


async def compute_all(conn, season_year: int, limit: int = 2000) -> int:
    """Compute season features for every active field; returns how many had data and were stored."""
    rows = await conn.fetch(
        "select id from public.fields where deleted_at is null limit $1", limit)
    stored = 0
    for r in rows:
        try:
            if await compute_field_season(conn, str(r["id"]), season_year):
                stored += 1
        except Exception:  # noqa: BLE001 — one bad field must not stop the batch
            continue
    return stored
