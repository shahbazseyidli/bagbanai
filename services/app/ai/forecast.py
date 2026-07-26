"""Short-horizon vegetation-index projection — the dotted continuation of the field chart.

WHY this exists: the satellite chart stops at the last cloud-free scene and every farmer asks the
same next question — "and then?". This answers with the weakest claim the data can actually carry,
and refuses to answer at all when it cannot carry one.

Three methods, tried in order; the FIRST that qualifies wins and NAMES itself in the response so the
UI can tell the farmer where the dotted line came from:

  own_history — the field's own prior seasons (>=2 seasons, >=8 scenes each). Takes the historical
                SHAPE and offsets it so it starts exactly at today's measured value. Dormant on a
                first-season field; it activates on its own once the A8 retrospective backfill lands
                — no code change, no flag.
  peers       — same crop + same region, current season, >=5 OTHER fields (k-anonymity, matching the
                threshold the 0021 benchmark function enforces).
  trend       — the field's own recent trajectory, robustly fitted and damped. This is the rung that
                works on a first-season field, which today is every field.

There is no fourth rung. When nothing qualifies the answer is method=None with points=[] — a
first-class result that the chart renders as nothing at all. A fabricated curve (a flat line, a
"typical" crop curve) on a farm decision is worse than no curve, because it looks like knowledge.

Deterministic — no LLM, no network. Cheap enough to compute inside a GET.
"""
from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Any, Optional, Sequence

# API sensor family → DB sensor codes. Mirrors routers/indices.py; duplicated rather than imported
# because ai/ must not depend on routers/ (season.py keeps its own copy for the same reason).
_FAMILY_CODES: dict[str, list[str]] = {"s2": ["S2"], "hls": ["S30", "L30"]}
_FAMILY_ORDER = ["s2", "hls"]

# A scene is USABLE when the cloud screen is unknown or mild. Above this the field mean is mostly
# measuring cloud, and one such scene is exactly what would tilt a naive fit.
MAX_CLOUD_PCT = 40.0

# --- rung 1: own history -----------------------------------------------------------------------
OWN_MIN_SEASONS = 2       # fewer than two prior seasons is an anecdote, not a shape
OWN_MIN_SCENES = 8        # per season, or the season's curve is holes
OWN_HORIZON_DAYS = 60
DOY_BIN_DAYS = 5          # day-of-year bucket width for the median curve

# --- rung 2: peers -----------------------------------------------------------------------------
# k-anonymity. HARD-CODED 5 to match public.index_benchmark (db/migrations/0021_benchmark_hardening
# .sql, "having count(distinct s.field_id) >= 5"), which is the platform's single peer-disclosure
# threshold. If that ever changes, both must change together.
PEER_K_ANON = 5
PEER_HORIZON_DAYS = 45

# --- rung 3: trend -----------------------------------------------------------------------------
TREND_LOOKBACK_DAYS = 40  # the window the fit may look at
TREND_MIN_SCENES = 4
TREND_MIN_SPAN_DAYS = 14  # four scenes inside three days describe a moment, not a trajectory
TREND_HORIZON_DAYS = 14
# The chart's x-axis is CATEGORICAL (one slot per row, SatelliteTab's XAxis has no time scale), so
# every projected point costs the same width as a real scene. Daily points made 14 days of
# projection as wide as the months of measurement behind them. A 3-day cadence is comparable to the
# scene interval, still smooth under type="monotone", and still lands exactly on t=0 and t=horizon.
TREND_STEP_DAYS = 3
TAU_DAYS = 10.0           # slope decay constant, see damped_value()
BAND_FLOOR = 0.02         # minimum half-width of the uncertainty band

# The anchor must be a RECENT measurement — projecting from a month-old scene would draw a line
# about a field nobody has looked at since.
ANCHOR_MAX_AGE_DAYS = TREND_LOOKBACK_DAYS
# How stale the newest usable scene may be and still be projected FROM. Distinct from the lookback
# above: a cloudy spell can leave four good scenes spanning 14 days that all ended weeks ago, which
# qualifies every rung — and then a 14-day horizon puts the ENTIRE dotted line in the past, under a
# chip that says "the last 14 days". A field nobody has seen for a fortnight gets no line at all.
ANCHOR_MAX_STALE_DAYS = 14

# Observed-range clamp window for the trend rung.
OBSERVED_WINDOW_DAYS = 90

# Indices that are true normalised differences (a-b)/(a+b) and therefore live in [-1,1] by
# construction. Everything else — CIre (nir/rededge-1, ~0..4), TVI (~0..30), EVI/SAVI/MSAVI (scaled
# forms that can step outside the unit interval) — gets NO physical clamp and relies on the
# observed-range clamp instead. Ranges cross-checked against routers/indices.py::_raster_style and
# geo_pipeline/indices.py.
_NORMALIZED_DIFFERENCE = {"NDVI", "NDMI", "NDWI", "NBR", "NBR2", "NDRE"}


# ----------------------------------------------------------------------------- small numerics
def _f(v: Any) -> Optional[float]:
    """Decimal/None/NaN-safe float (asyncpg returns numeric as Decimal, and numeric can hold NaN,
    which would serialise as invalid JSON)."""
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def _percentile(values: Sequence[float], q: float) -> float:
    """Linear-interpolation percentile — the same definition as SQL percentile_cont, so a band
    computed here means the same thing as a band computed by the benchmark function."""
    xs = sorted(values)
    if len(xs) == 1:
        return xs[0]
    pos = (len(xs) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    if lo == hi:
        return xs[lo]
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def _median(values: Sequence[float]) -> float:
    return _percentile(values, 0.5)


def theil_sen(ts: Sequence[float], vs: Sequence[float]) -> tuple[float, float]:
    """Robust line fit: slope = median of the pairwise slopes over all i<j, intercept = median of
    the residual levels.

    WHY not least squares: OLS minimises squared error, so ONE cloud-contaminated scene near the end
    of the window drags the slope with it, and the projection inherits the cloud. The median of the
    pairwise slopes ignores up to ~29% contaminated points entirely. Pairs sharing a date are
    skipped — their slope is undefined, not steep.

    Returns (slope per day, intercept) on the caller's t axis."""
    slopes: list[float] = []
    n = len(ts)
    for i in range(n):
        for j in range(i + 1, n):
            dt = ts[j] - ts[i]
            if dt == 0:
                continue
            slopes.append((vs[j] - vs[i]) / dt)
    if not slopes:
        return 0.0, _median(vs)
    slope = _median(slopes)
    return slope, _median([v - slope * t for t, v in zip(ts, vs)])


def mad(values: Sequence[float]) -> float:
    """Median absolute deviation, scaled by 1.4826 so it estimates the same spread a standard
    deviation would on clean gaussian noise — without letting one outlier define that spread."""
    if not values:
        return 0.0
    m = _median(values)
    return 1.4826 * _median([abs(v - m) for v in values])


def damped_value(anchor: float, slope: float, t: float, tau: float = TAU_DAYS) -> float:
    """Projection with an exponentially decaying slope:  anchor + slope·tau·(1 − e^(−t/tau)).

    This is a DELIBERATE FLATTENING, not a fitted growth model. A straight extrapolation of a
    vegetative growth phase reaches NDVI 1.4 within a month, which is physically impossible; real
    canopy curves bend over. The damping keeps the projection's DIRECTION (the first days follow the
    measured slope almost exactly) while capping its total displacement at slope·tau — roughly ten
    days of the current rate, no matter how far out you look. It claims "this is where you are
    heading", never "this is where you will be"."""
    return anchor + slope * tau * (1.0 - math.exp(-t / tau))


def _clamp_physical(v: float, index: str) -> float:
    """[-1,1] for the normalised-difference indices; untouched for the ratio/scaled ones."""
    if index not in _NORMALIZED_DIFFERENCE:
        return v
    return max(-1.0, min(1.0, v))


def _round(v: float) -> float:
    return round(v, 4)


def _offsets(horizon: int, step: int) -> list[int]:
    """Day offsets to emit, always including 0 (the anchor) and the horizon itself."""
    out = list(range(0, horizon + 1, step))
    if out[-1] != horizon:
        out.append(horizon)
    return out


# ------------------------------------------------------------------------------- DOY curves
def _bin_medians(observations: Sequence[tuple[int, float]]) -> dict[int, float]:
    """One series of (doy, value) → {bucket: median of that bucket}. Binning is what makes the curve
    cloud-gap tolerant: an empty bucket is ABSENT, never zero-filled (the same rule ai/season.py
    follows for its weekly bins)."""
    buckets: dict[int, list[float]] = {}
    for doy, value in observations:
        buckets.setdefault((doy - 1) // DOY_BIN_DAYS, []).append(value)
    return {b: _median(vals) for b, vals in buckets.items()}


def _cross_curve(series: Sequence[dict[int, float]],
                 min_series: int) -> list[tuple[int, float, float, float]]:
    """Combine several binned series into one (doy, median, p25, p75) curve.

    A bucket is kept only when at least `min_series` of the input series contribute to it — for the
    peers rung that IS the k-anonymity gate, applied per bucket exactly as the benchmark function
    applies it per week."""
    per_bucket: dict[int, list[float]] = {}
    for one in series:
        for bucket, value in one.items():
            per_bucket.setdefault(bucket, []).append(value)
    curve: list[tuple[int, float, float, float]] = []
    for bucket in sorted(per_bucket):
        vals = per_bucket[bucket]
        if len(vals) < min_series:
            continue
        centre = bucket * DOY_BIN_DAYS + (DOY_BIN_DAYS + 1) // 2
        curve.append((centre, _median(vals), _percentile(vals, 0.25), _percentile(vals, 0.75)))
    return curve


def _curve_at(curve: Sequence[tuple[int, float, float, float]],
              doy: int) -> Optional[tuple[float, float, float]]:
    """(median, p25, p75) at a day-of-year, linearly interpolated between the two surrounding real
    buckets. None outside the curve's range — the gaps get filled, the ends do NOT get extrapolated,
    because inventing a tail is the exact failure this module is built to avoid."""
    if not curve or doy < curve[0][0] or doy > curve[-1][0]:
        return None
    prev = curve[0]
    for point in curve:
        if point[0] == doy:
            return point[1], point[2], point[3]
        if point[0] > doy:
            span = point[0] - prev[0]
            if span <= 0:
                return point[1], point[2], point[3]
            frac = (doy - prev[0]) / span
            return tuple(prev[k] + (point[k] - prev[k]) * frac for k in (1, 2, 3))  # type: ignore[return-value]
        prev = point
    return None


# ------------------------------------------------------------------------------------ queries
# Usable = the cloud screen is unknown or mild AND the mean exists. One row per DATE (least cloudy
# of that date's scenes) so two same-day scenes cannot contribute a zero-denominator pair to the
# Theil-Sen fit, and so a doubled date cannot silently double its weight.
_SERIES_SQL = """
select distinct on (st.acquired_at) st.acquired_at, st.mean
from public.index_stats st
join public.scenes s on s.id = st.scene_id
where st.field_id = $1::uuid and st.index_name = $2 and st.sensor = any($3::text[])
  and st.mean is not null and st.acquired_at >= $4::date
  and (s.cloud_pct is null or s.cloud_pct::float8 <= $5)
order by st.acquired_at, s.cloud_pct asc nulls last
"""

_PRIOR_SEASONS_SQL = """
select extract(year from st.acquired_at)::int as season_year,
       extract(doy  from st.acquired_at)::int as doy,
       st.mean
from public.index_stats st
join public.scenes s on s.id = st.scene_id
where st.field_id = $1::uuid and st.index_name = $2 and st.sensor = any($3::text[])
  and st.mean is not null
  and extract(year from st.acquired_at)::int < $4
  and (s.cloud_pct is null or s.cloud_pct::float8 <= $5)
order by st.acquired_at
"""

_OBSERVED_RANGE_SQL = """
select min(st.mean) as vmin, max(st.mean) as vmax
from public.index_stats st
join public.scenes s on s.id = st.scene_id
where st.field_id = $1::uuid and st.index_name = $2 and st.sensor = any($3::text[])
  and st.mean is not null and st.acquired_at >= $4::date
  and (s.cloud_pct is null or s.cloud_pct::float8 <= $5)
"""

# CROSSES ORG BOUNDARIES ON PURPOSE — this is the only query in the module that does. The app role
# owns these tables and therefore bypasses RLS, so the privacy guarantees have to be IN this query
# and in what the caller does with the result:
#   * o.benchmark_opt_in  — an org that opted out never contributes (same consent gate as 0021);
#   * st.field_id <> $4   — the subject field is never its own peer;
#   * field ids leave this function only as a COUNT, and only via _cross_curve's k>=5 buckets.
# Nothing downstream may return a field id, a name, an org, or a cohort smaller than PEER_K_ANON.
_PEERS_SQL = """
select st.field_id, extract(doy from st.acquired_at)::int as doy, st.mean
from public.index_stats st
join public.scenes s on s.id = st.scene_id
join public.fields f on f.id = st.field_id
join public.organizations o on o.id = f.org_id
join public.field_metadata m on m.field_id = st.field_id
where st.index_name = $1 and st.sensor = any($2::text[]) and st.mean is not null
  and extract(year from st.acquired_at)::int = $3
  and st.field_id <> $4::uuid and f.deleted_at is null
  and o.benchmark_opt_in = true
  and m.crop_type = $5 and m.region = $6
  and (s.cloud_pct is null or s.cloud_pct::float8 <= $7)
order by st.acquired_at
"""


async def _usable_series(conn, field_id: str, index: str, codes: list[str],
                         since: date) -> list[tuple[date, float]]:
    rows = await conn.fetch(_SERIES_SQL, field_id, index, codes, since, MAX_CLOUD_PCT)
    out: list[tuple[date, float]] = []
    for r in rows:
        v = _f(r["mean"])
        if v is not None:
            out.append((r["acquired_at"], v))
    return out


async def _anchor(conn, field_id: str, index: str, families: Sequence[str],
                  today: date) -> Optional[tuple[str, date, float]]:
    """The newest usable measurement, in sensor-preference order → (family, date, value).

    Both DOY-curve rungs anchor on this: the projection has to START where the field actually is,
    not where the average season says it should be."""
    since = today - timedelta(days=ANCHOR_MAX_AGE_DAYS)
    for fam in families:
        series = await _usable_series(conn, field_id, index, _FAMILY_CODES[fam], since)
        if series:
            d, v = series[-1]
            # Same freshness rule the trend rung applies. A 40-day-old anchor would eat two thirds
            # of a 60-day horizon before the line even starts, and the visible part would describe a
            # field nobody has had a clear look at since.
            if (today - d).days > ANCHOR_MAX_STALE_DAYS:
                continue
            return fam, d, v
    return None


def _empty() -> dict[str, Any]:
    """No method qualified. Says so; draws nothing."""
    return {"method": None, "method_params": {}, "horizon_days": 0, "anchor": None, "points": []}


# ------------------------------------------------------------------ rung 1: the field's own past
async def _own_history(conn, field_id: str, index: str, families: Sequence[str],
                       today: date) -> Optional[dict[str, Any]]:
    """The field's own prior seasons: historical SHAPE, offset onto today's measured value.

    Dormant while every field has a single season. It needs no activation — the moment the A8
    backfill writes 2021-2025 scenes, the qualification below starts passing."""
    anchored = await _anchor(conn, field_id, index, families, today)
    if anchored is None:
        return None
    _anchor_fam, anchor_date, anchor_value = anchored
    anchor_doy = anchor_date.timetuple().tm_yday

    for fam in families:
        rows = await conn.fetch(_PRIOR_SEASONS_SQL, field_id, index, _FAMILY_CODES[fam],
                                today.year, MAX_CLOUD_PCT)
        by_season: dict[int, list[tuple[int, float]]] = {}
        for r in rows:
            v = _f(r["mean"])
            if v is not None:
                by_season.setdefault(int(r["season_year"]), []).append((int(r["doy"]), v))
        seasons = {y: obs for y, obs in by_season.items() if len(obs) >= OWN_MIN_SCENES}
        if len(seasons) < OWN_MIN_SEASONS:
            continue

        # min_series=2: a bucket only one season reached has no spread, so it could only pretend to
        # a band. The p25..p75 across seasons IS the band here.
        curve = _cross_curve([_bin_medians(obs) for obs in seasons.values()], min_series=2)
        at_anchor = _curve_at(curve, anchor_doy)
        if at_anchor is None:
            continue  # history says nothing about this time of year → not this rung's question

        # The offset absorbs BOTH the field's current level (a strong or weak year) and any constant
        # level difference between the sensor that recorded the history (HLS, from the backfill) and
        # the one that recorded the anchor (S2). What we take from history is the shape — the
        # day-to-day differences — which that offset leaves untouched.
        offset = anchor_value - at_anchor[0]

        points: list[dict[str, Any]] = []
        for t in _offsets(OWN_HORIZON_DAYS, DOY_BIN_DAYS):
            d = anchor_date + timedelta(days=t)
            if d.year != anchor_date.year:
                break  # the curve is DOY-keyed within one season; wrapping past new year would be
                       # a different season's shape wearing this one's label
            got = _curve_at(curve, d.timetuple().tm_yday)
            if got is None:
                break  # history runs out → the projection stops, it does not continue by itself
            med, p25, p75 = got
            # BAND_FLOOR here too. With OWN_MIN_SEASONS = 2, p25..p75 is half the gap between
            # two numbers — and two seasons that happen to agree at this day-of-year would draw a
            # hairline band under a 60-day projection, implying a precision nothing supports.
            centre = med + offset
            points.append(_point(d, centre,
                                 min(p25 + offset, centre - BAND_FLOOR),
                                 max(p75 + offset, centre + BAND_FLOOR), index))
        if len(points) < 2:
            continue

        return {
            "method": "own_history",
            "method_params": {"seasons": len(seasons), "sensor": fam},
            # The ACHIEVED horizon, not the requested one: when the historical curve runs out early,
            # saying 60 would describe a line that is not on the chart.
            "horizon_days": (date.fromisoformat(points[-1]["date"]) - anchor_date).days,
            "anchor": {"date": anchor_date.isoformat(), "value": _round(anchor_value)},
            "points": points,
        }
    return None


# ------------------------------------------------------------------------- rung 2: the neighbours
async def _peers(conn, field_id: str, index: str, families: Sequence[str],
                 today: date) -> Optional[dict[str, Any]]:
    """Other fields, same crop and same region, this season. Aggregate only, k>=5, consent-gated."""
    meta = await conn.fetchrow(
        "select crop_type, region from public.field_metadata where field_id=$1::uuid", field_id)
    if not meta or not meta["crop_type"] or not meta["region"]:
        return None  # no cohort can be defined → no peer claim may be made
    crop, region = meta["crop_type"], meta["region"]

    anchored = await _anchor(conn, field_id, index, families, today)
    if anchored is None:
        return None
    _anchor_fam, anchor_date, anchor_value = anchored
    anchor_doy = anchor_date.timetuple().tm_yday

    for fam in families:
        rows = await conn.fetch(_PEERS_SQL, index, _FAMILY_CODES[fam], today.year, field_id,
                                crop, region, MAX_CLOUD_PCT)
        per_field: dict[str, list[tuple[int, float]]] = {}
        for r in rows:
            v = _f(r["mean"])
            if v is not None:
                per_field.setdefault(str(r["field_id"]), []).append((int(r["doy"]), v))
        if len(per_field) < PEER_K_ANON:
            continue

        curve = _cross_curve([_bin_medians(obs) for obs in per_field.values()],
                             min_series=PEER_K_ANON)
        at_anchor = _curve_at(curve, anchor_doy)
        if at_anchor is None:
            continue
        offset = anchor_value - at_anchor[0]

        points: list[dict[str, Any]] = []
        for t in _offsets(PEER_HORIZON_DAYS, DOY_BIN_DAYS):
            d = anchor_date + timedelta(days=t)
            if d.year != anchor_date.year:
                break
            got = _curve_at(curve, d.timetuple().tm_yday)
            if got is None:
                break
            med, p25, p75 = got
            # BAND_FLOOR here too. With OWN_MIN_SEASONS = 2, p25..p75 is half the gap between
            # two numbers — and two seasons that happen to agree at this day-of-year would draw a
            # hairline band under a 60-day projection, implying a precision nothing supports.
            centre = med + offset
            points.append(_point(d, centre,
                                 min(p25 + offset, centre - BAND_FLOOR),
                                 max(p75 + offset, centre + BAND_FLOOR), index))
        if len(points) < 2:
            continue

        return {
            "method": "peers",
            # `fields` is a cohort SIZE and is >= PEER_K_ANON by construction; no field, name or org
            # of a peer is ever returned.
            "method_params": {"fields": len(per_field), "sensor": fam},
            "horizon_days": (date.fromisoformat(points[-1]["date"]) - anchor_date).days,
            "anchor": {"date": anchor_date.isoformat(), "value": _round(anchor_value)},
            "points": points,
        }
    return None


# --------------------------------------------------------------------------- rung 3: the trend
async def _trend(conn, field_id: str, index: str, families: Sequence[str],
                 today: date) -> Optional[dict[str, Any]]:
    """The field's own recent trajectory: Theil-Sen slope, damped with horizon, residual band.

    Sensors are never mixed inside one fit. The 10 m and 30 m instruments read the same canopy a
    little differently, and a fit across both would read that instrument step as a change in the
    crop."""
    since = today - timedelta(days=TREND_LOOKBACK_DAYS)
    for fam in families:
        codes = _FAMILY_CODES[fam]
        series = await _usable_series(conn, field_id, index, codes, since)
        if len(series) < TREND_MIN_SCENES:
            continue
        span_days = (series[-1][0] - series[0][0]).days
        if span_days < TREND_MIN_SPAN_DAYS:
            continue

        anchor_date, anchor_value = series[-1]
        if (today - anchor_date).days > ANCHOR_MAX_STALE_DAYS:
            continue
        # t axis in days relative to the anchor: the measured points sit at t <= 0, the projection
        # at t >= 0, so damped_value(t=0) IS the anchor and the dotted line joins the solid one.
        ts = [float((d - anchor_date).days) for d, _ in series]
        vs = [v for _, v in series]
        slope, intercept = theil_sen(ts, vs)
        scale = mad([v - (intercept + slope * t) for t, v in zip(ts, vs)])
        half0 = max(scale, BAND_FLOOR)

        # Extrapolation may not leave the range the field has actually shown this quarter. Widened by
        # `scale` so a genuine new high is still reachable, but only by one noise width.
        obs = await conn.fetchrow(_OBSERVED_RANGE_SQL, field_id, index, codes,
                                  today - timedelta(days=OBSERVED_WINDOW_DAYS), MAX_CLOUD_PCT)
        obs_min, obs_max = _f(obs["vmin"]) if obs else None, _f(obs["vmax"]) if obs else None

        points: list[dict[str, Any]] = []
        for t in _offsets(TREND_HORIZON_DAYS, TREND_STEP_DAYS):
            value = damped_value(anchor_value, slope, float(t))
            if obs_min is not None:
                value = max(obs_min - scale, value)
            if obs_max is not None:
                value = min(obs_max + scale, value)
            # The band widens with horizon: at the anchor it is the residual spread, and it grows
            # with sqrt(1 + t/span) — the further past the measured window, the less the fit knows.
            # BAND_FLOOR stops a short, quiet series from implying a precision this method has not
            # got.
            half = half0 * math.sqrt(1.0 + t / span_days)
            points.append(_point(anchor_date + timedelta(days=t), value,
                                 value - half, value + half, index))

        return {
            "method": "trend",
            "method_params": {"days": span_days, "scenes": len(series), "sensor": fam},
            "horizon_days": TREND_HORIZON_DAYS,
            "anchor": {"date": anchor_date.isoformat(), "value": _round(anchor_value)},
            "points": points,
        }
    return None


def _point(d: date, value: float, lo: float, hi: float, index: str) -> dict[str, Any]:
    """One projected point, clamped to the index's physical range. lo <= value <= hi survives the
    clamp because all three go through the same monotone bound."""
    value = _clamp_physical(value, index)
    lo = _clamp_physical(min(lo, value), index)
    hi = _clamp_physical(max(hi, value), index)
    return {"date": d.isoformat(), "value": _round(value), "lo": _round(lo), "hi": _round(hi)}


# ------------------------------------------------------------------------------------- public
async def forecast(conn, field_id: str, index: str = "NDVI", sensor: str = "s2",
                   peers_allowed: bool = True) -> dict[str, Any]:
    """Run the method ladder and return the first projection that qualifies.

    `sensor` is an API family ('s2'|'hls') and only sets PREFERENCE — the other family is tried when
    the preferred one cannot support a method on its own, never mixed into the same fit.

    `peers_allowed` is the caller's tier decision (cross-field peer aggregates are a business-tier
    feature, see routers/indices.py::benchmark). A blocked peers rung simply falls through to the
    trend, so the chart still gets a projection.

    Never raises for want of data: the floor of this function is `_empty()`."""
    today = date.today()
    preferred = sensor if sensor in _FAMILY_CODES else "s2"
    families = [preferred] + [f for f in _FAMILY_ORDER if f != preferred]

    result = await _own_history(conn, field_id, index, families, today)
    if result is None and peers_allowed:
        result = await _peers(conn, field_id, index, families, today)
    if result is None:
        result = await _trend(conn, field_id, index, families, today)
    return result or _empty()
