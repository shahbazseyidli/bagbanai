"""Per-field, per-season feature extraction (T16 groundwork). Aggregates each season's vegetation
trajectory (NDVI peak / mean / trapezoidal integral) plus GDD total (T4) and precipitation total
(T8) into field_season_features. This is the FEATURE STORE for a future NDVI-integral ↔ yield
correlation — the model itself is deferred until ≥3 seasons of paired yield data exist. Deterministic
(no LLM); safe on partial data (returns None when a field has no vegetation scenes for the season).

A5 (HYBRID_PLAN W7) extends it with DOY-RESOLVED curves: the end-of-season aggregates above cannot
answer "as of 24 July am I behind last year?", so each season also stores a weekly-binned
[[doy, ndvi], ...] curve plus the cumulative [[doy, integral], ...] series. Binning is what makes it
cloud-gap tolerant: a week with no usable scene is simply absent (never zero-filled, never
interpolated at write time), and the same-DOY comparison interpolates only between real points."""
from __future__ import annotations

import json
from typing import Optional

# Sensor families in preference order: Sentinel-2 (10m) first, NASA HLS as fallback.
_S2 = ["S2"]
_HLS = ["S30", "L30"]

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

# Raw per-scene NDVI for the season, ordered — binned into weeks in Python (A5).
_NDVI_SERIES = """
select extract(doy from acquired_at)::int as doy, mean
from public.index_stats
where field_id=$1::uuid and index_name='NDVI' and sensor = any($3::text[])
  and extract(year from acquired_at) = $2 and mean is not null
order by acquired_at
"""

_BIN_DAYS = 7  # weekly bins — matches the S2 5-day / HLS 2-3-day revisit after cloud loss


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _bin_curve(rows) -> tuple[list[list[float]], list[list[float]], Optional[int]]:
    """Weekly-bin the raw (doy, ndvi) observations → (by_doy, integral_by_doy, peak_doy).

    Cloud-gap tolerant by construction: bins with no observation are omitted, so the curve stays
    honest (a gap reads as a gap, not as a drop to zero). The cumulative integral is trapezoidal
    across whatever bins DO exist, which is also how the live season integral is computed."""
    buckets: dict[int, list[float]] = {}
    doys: dict[int, list[int]] = {}
    peak_doy, peak_v = None, None
    for r in rows:
        doy, v = int(r["doy"]), float(r["mean"])
        b = (doy - 1) // _BIN_DAYS
        buckets.setdefault(b, []).append(v)
        doys.setdefault(b, []).append(doy)
        if peak_v is None or v > peak_v:
            peak_v, peak_doy = v, doy

    by_doy: list[list[float]] = []
    for b in sorted(buckets):
        vals = buckets[b]
        d = int(round(sum(doys[b]) / len(doys[b])))
        by_doy.append([d, round(sum(vals) / len(vals), 4)])

    integral_by_doy: list[list[float]] = []
    cum = 0.0
    for i, (d, v) in enumerate(by_doy):
        if i > 0:
            pd, pv = by_doy[i - 1]
            cum += (v + pv) / 2.0 * (d - pd)
        integral_by_doy.append([d, round(cum, 3)])
    return by_doy, integral_by_doy, peak_doy


async def season_curve(conn, field_id: str, season_year: int) -> Optional[dict]:
    """DOY-resolved NDVI curve for one field-season, read-only (A5).

    Prefers Sentinel-2 and falls back to HLS, exactly like compute_field_season. Returns None when
    the season has no usable vegetation scene."""
    rows = await conn.fetch(_NDVI_SERIES, field_id, season_year, _S2)
    used = "S2"
    if not rows:
        rows = await conn.fetch(_NDVI_SERIES, field_id, season_year, _HLS)
        used = "HLS"
    if not rows:
        return None
    by_doy, integral_by_doy, peak_doy = _bin_curve(rows)
    return {"season_year": season_year, "sensor": used, "n_scenes": len(rows),
            "by_doy": by_doy, "integral_by_doy": integral_by_doy, "peak_doy": peak_doy}


async def _precipitation(conn, field_id: str, season_year: int) -> tuple[Optional[float], Optional[str]]:
    """Season precipitation with its provenance. The observed archive (0036 field_weather_daily) is
    authoritative; the FAO-56 balance (0020) is forecast-derived and gets wiped on every recompute,
    so it is only a fallback and is labelled as such.

    Table presence is probed with to_regclass rather than try/except: a failed statement would abort
    the surrounding transaction (db.connection opens one), poisoning every later query."""
    has_archive = await conn.fetchval("select to_regclass('public.field_weather_daily') is not null")
    if has_archive:
        v = await conn.fetchval(
            """select sum(precip_mm) from public.field_weather_daily
               where field_id=$1::uuid and extract(year from date)=$2""", field_id, season_year)
        if v is not None:
            return float(v), "archive"
    v = await conn.fetchval(
        "select sum(precip_mm) from public.field_water_balance where field_id=$1::uuid and extract(year from date)=$2",
        field_id, season_year)
    if v is None:
        return None, None
    return float(v), "forecast_only"


async def compute_field_season(conn, field_id: str, season_year: int,
                               source: str = "live") -> Optional[dict]:
    """Compute + upsert one field's season features. Prefers Sentinel-2 (10m), falls back to HLS.
    Returns the feature dict, or None if the field is gone or has no vegetation data that season.
    `source` marks how the row was produced ('live' cron vs 'backfill' worker, A8)."""
    source = source if source in ("live", "backfill") else "live"
    row = await conn.fetchrow(
        """select f.org_id, m.crop_type
           from public.fields f left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid and f.deleted_at is null""", field_id)
    if not row:
        return None
    org_id, crop = str(row["org_id"]), row["crop_type"]

    used = "S2"
    agg = await conn.fetchrow(_NDVI_AGG, field_id, season_year, _S2)
    if not agg or agg["n"] == 0:
        agg = await conn.fetchrow(_NDVI_AGG, field_id, season_year, _HLS)
        used = "HLS"
    if not agg or agg["n"] == 0:
        return None  # no vegetation scenes this season — nothing to store yet

    # A5: DOY-resolved curve from the SAME sensor family the aggregates came from.
    series = await conn.fetch(_NDVI_SERIES, field_id, season_year, _S2 if used == "S2" else _HLS)
    by_doy, integral_by_doy, peak_doy = _bin_curve(series)

    gdd = await conn.fetchval(
        "select max(gdd_cumulative) from public.field_gdd_daily where field_id=$1::uuid and season_year=$2",
        field_id, season_year)
    precip, precip_src = await _precipitation(conn, field_id, season_year)

    await conn.execute(
        """insert into public.field_season_features
             (field_id, org_id, season_year, crop_type, ndvi_peak, ndvi_mean, ndvi_integral,
              gdd_total, precip_total_mm, n_scenes, sensor, computed_at,
              ndvi_peak_doy, ndvi_by_doy, integral_by_doy, precip_total_src, source)
           values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),
                   $12,$13::jsonb,$14::jsonb,$15,$16)
           on conflict (field_id, season_year) do update set
             crop_type=excluded.crop_type, ndvi_peak=excluded.ndvi_peak, ndvi_mean=excluded.ndvi_mean,
             ndvi_integral=excluded.ndvi_integral, gdd_total=excluded.gdd_total,
             precip_total_mm=excluded.precip_total_mm, n_scenes=excluded.n_scenes,
             sensor=excluded.sensor, computed_at=now(),
             ndvi_peak_doy=excluded.ndvi_peak_doy, ndvi_by_doy=excluded.ndvi_by_doy,
             integral_by_doy=excluded.integral_by_doy,
             precip_total_src=excluded.precip_total_src, source=excluded.source""",
        field_id, org_id, season_year, crop, _f(agg["peak"]), _f(agg["mean_v"]),
        _f(agg["integral"]), _f(gdd), precip, agg["n"], used,
        peak_doy, json.dumps(by_doy), json.dumps(integral_by_doy), precip_src, source)

    return {"field_id": field_id, "season_year": season_year, "crop_type": crop,
            "ndvi_peak": _f(agg["peak"]), "ndvi_mean": _f(agg["mean_v"]),
            "ndvi_integral": _f(agg["integral"]), "gdd_total": _f(gdd),
            "precip_total_mm": precip, "precip_total_src": precip_src,
            "n_scenes": agg["n"], "sensor": used, "source": source,
            "ndvi_peak_doy": peak_doy, "ndvi_by_doy": by_doy, "integral_by_doy": integral_by_doy}


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
