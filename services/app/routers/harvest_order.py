"""A9 — harvest order: rank an org's fields by how ready they look for harvest.

  GET /api/orgs/{org_id}/harvest-order

Aimed at co-ops with many fields: which one do the crews go to first this week. The ranking is
built ONLY from data that actually exists in this database — no yield model, no phenology model:

  * senescence level — the latest NDVI mean from public.index_stats (a low NDVI late in the season
    means the canopy is drying down, i.e. riper),
  * senescence trend  — the same field's NDVI a few weeks earlier, from the SAME sensor (HLS vs S2
    NDVI carry a small systematic offset, so a cross-sensor delta would invent a trend),
  * planned harvest   — expected_harvest from the field's current public.field_seasons row when the
    season entity exists (0034), otherwise public.field_metadata.expected_harvest.

Honesty rules baked into the payload:
  * NDVI level is only read as ripeness when we have some evidence the season IS late (a harvest
    date within ~2 months, an explicitly 'harvest' season status, or an actually falling NDVI).
    Early-season low NDVI means a struggling crop, not a ripe one, and must never push a field up.
  * a field with none of the signals is NOT given a position — it goes to `unranked` with a reason
    naming what is missing.
  * already-harvested seasons are excluded from the ranking and say so.

Read-only, org-gated with require_member; RLS is defence-in-depth only.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query

from ..db import connection
from ..deps import get_current_user_id, require_member, safe_uuid

router = APIRouter(prefix="/api", tags=["harvest-order"])

INDEX_NAME = "NDVI"

# NDVI lookback windows (days). "latest" is the most recent usable observation; "previous" is the
# most recent one that is at least PREV_MIN_DAYS old, so the delta spans a real interval rather
# than two scenes from the same week.
LATEST_MAX_DAYS = 45
PREV_MIN_DAYS = 14
PREV_MAX_DAYS = 60

# Ripeness reading of the NDVI level: NDVI_FULL_CANOPY → 0 points, NDVI_SENESCENT → 100 points.
NDVI_FULL_CANOPY = 0.80
NDVI_SENESCENT = 0.30

# A drop of this much over the window is treated as senescence starting.
FALLING_DELTA = -0.03
# ...and this much is a fully "dropping fast" canopy (100 points on the trend signal).
STRONG_FALL = -0.15

# Beyond this many days to the planned harvest the date stops carrying ripeness information.
HARVEST_HORIZON_DAYS = 50
# "Late season" evidence: a planned harvest inside this window.
LATE_SEASON_DAYS = 60
# A planned harvest THIS far in the past is last season's leftover in field_metadata (which is
# overwritten in place and never cleared), not a field that is 300 days overdue. Without this
# guard such a field would score 100 on the date signal and squat at rank 1 forever.
STALE_HARVEST_DAYS = 45

# Signal weights; renormalised over whatever is actually present (never treat a missing signal
# as a zero).
WEIGHTS = {"harvest_date": 0.45, "ndvi_level": 0.30, "ndvi_trend": 0.25}

SIGNAL_LABELS = {
    "harvest_date": "planlaşdırılan yığım tarixi",
    "ndvi_level": "NDVI səviyyəsi",
    "ndvi_trend": "NDVI trendi",
}

# Season lifecycle values that mean the harvest is over (0034 vocabulary).
_DONE_STATUSES = ("closed",)
# ...and the one that means there is nothing planted to harvest at all.
_FALLOW_STATUSES = ("fallow",)


def _f(v: Any) -> Optional[float]:
    """numeric columns arrive as Decimal — float() before ANY arithmetic."""
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _cap(text: str) -> str:
    if not text:
        return text
    first = text[0]
    # str.upper() maps Azerbaijani dotted/dotless i wrong — handle the two letters explicitly.
    upper = {"i": "İ", "ı": "I"}.get(first, first.upper())
    return upper + text[1:]


def _harvest_date_score(days_to_harvest: int) -> float:
    """Overdue or due today = 100; decays to 0 by HARVEST_HORIZON_DAYS out."""
    if days_to_harvest <= 0:
        return 100.0
    return _clamp(100.0 * (1.0 - days_to_harvest / float(HARVEST_HORIZON_DAYS)))


def _ndvi_level_score(ndvi: float) -> float:
    span = NDVI_FULL_CANOPY - NDVI_SENESCENT
    return _clamp(100.0 * (NDVI_FULL_CANOPY - ndvi) / span)


def _ndvi_trend_score(delta: float) -> float:
    """Only a FALLING canopy scores; a rising/flat one is 0 (evidence of not being ready)."""
    if delta >= 0:
        return 0.0
    return _clamp(100.0 * (delta / STRONG_FALL))


def _reason(days_to_harvest: Optional[int], ndvi: Optional[float], ndvi_prev: Optional[float],
            delta: Optional[float], gap_days: Optional[int], score: float,
            harvest_stale: bool = False) -> str:
    parts: list[str] = []
    if days_to_harvest is not None and harvest_stale:
        parts.append(f"qeyd olunmuş yığım tarixi {abs(days_to_harvest)} gün əvvəldir "
                     "(köhnəlib, nəzərə alınmadı)")
    elif days_to_harvest is not None:
        if days_to_harvest < 0:
            parts.append(f"planlaşdırılan yığım tarixi {abs(days_to_harvest)} gün keçib")
        elif days_to_harvest == 0:
            parts.append("planlaşdırılan yığım bu gündür")
        else:
            parts.append(f"yığıma {days_to_harvest} gün qalıb")
    if ndvi is not None:
        if delta is not None and ndvi_prev is not None and abs(delta) >= abs(FALLING_DELTA):
            arrow = "düşür" if delta < 0 else "artır"
            gap = f", {gap_days} gündə" if gap_days else ""
            parts.append(f"NDVI {ndvi_prev:.2f} → {ndvi:.2f} ({arrow}{gap})")
        else:
            parts.append(f"NDVI {ndvi:.2f}")
    if score >= 70:
        tail = "yığıma hazırdır"
    elif score >= 40:
        tail = "yığım yaxınlaşır"
    else:
        tail = "yığım üçün hələ tezdir"
    head = " · ".join(parts) if parts else "kifayət qədər göstərici yoxdur"
    return f"{_cap(head)} — {tail}."


def _missing_reason(has_ndvi: bool, has_date: bool, harvested: bool,
                    harvest_stale: bool = False) -> str:
    if harvested:
        return "Yığım artıq qeydə alınıb — sıralamaya daxil edilmir."
    if harvest_stale:
        tail = (" və son 45 gündə peyk NDVI ölçüsü yoxdur" if not has_ndvi else "")
        return (f"Qeyd olunmuş yığım tarixi köhnəlib (keçən mövsümdən qalıb){tail} — "
                "mövsüm məlumatını yeniləyin.")
    if not has_ndvi and not has_date:
        return ("Peyk NDVI məlumatı və planlaşdırılan yığım tarixi yoxdur — "
                "sıralamaq üçün göstərici çatmır.")
    if not has_ndvi:
        return "Son 45 gündə buludsuz peyk NDVI ölçüsü yoxdur — sıralamaq üçün göstərici çatmır."
    return ("Yığım tarixi qeyd olunmayıb və NDVI-də yetişmə əlaməti görünmür — "
            "mövsüm məlumatını tamamlayın.")


@router.get("/orgs/{org_id}/harvest-order")
async def harvest_order(org_id: str, limit: int = Query(default=500, ge=1, le=2000),
                        user_id: str = Depends(get_current_user_id)):
    """Org's fields ordered by harvest priority, with the signals and the reason behind each rank."""
    org_id = safe_uuid(org_id, "org_not_found")
    today = date.today()

    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)

        fields = await conn.fetch(
            """select f.id, f.name, f.area_ha
               from public.fields f
               join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and f.deleted_at is null
               order by f.name limit $2""", org_id, limit)

        # Latest usable NDVI per field. `sensor` is denormalized onto index_stats (0013), so this
        # needs no scenes join and rides index_stats_sensor_idx. Same-day ties break toward the
        # observation with more valid (unmasked) pixels.
        latest_rows = await conn.fetch(
            """select distinct on (st.field_id)
                      st.field_id, st.sensor, st.mean, st.acquired_at, st.valid_pixels
               from public.index_stats st
               join public.fields f on f.id = st.field_id
               join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and f.deleted_at is null
                 and st.index_name=$2 and st.mean is not null
                 and coalesce(st.valid_pixels, 1) > 0
                 and st.acquired_at >= current_date - $3::int
               order by st.field_id, st.acquired_at desc, st.valid_pixels desc nulls last""",
            org_id, INDEX_NAME, LATEST_MAX_DAYS)

        # Earlier NDVI per (field, sensor) — the trend is only ever read within ONE sensor, because
        # HLS and S2 NDVI carry a small systematic offset that would fake a rise or a drop.
        prev_rows = await conn.fetch(
            """select distinct on (st.field_id, st.sensor)
                      st.field_id, st.sensor, st.mean, st.acquired_at, st.valid_pixels
               from public.index_stats st
               join public.fields f on f.id = st.field_id
               join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and f.deleted_at is null
                 and st.index_name=$2 and st.mean is not null
                 and coalesce(st.valid_pixels, 1) > 0
                 and st.acquired_at between current_date - $3::int and current_date - $4::int
               order by st.field_id, st.sensor, st.acquired_at desc, st.valid_pixels desc nulls last""",
            org_id, INDEX_NAME, PREV_MAX_DAYS, PREV_MIN_DAYS)

        meta_rows = await conn.fetch(
            """select m.field_id, m.crop_type, m.expected_harvest, m.growth_stage
               from public.field_metadata m
               join public.fields f on f.id = m.field_id
               join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and f.deleted_at is null""", org_id)

        # field_seasons is 0034 — probe with to_regclass rather than try/except, because a failed
        # statement would abort this transaction and take every later query down with it.
        season_rows: list = []
        if await conn.fetchval("select to_regclass('public.field_seasons') is not null"):
            season_rows = await conn.fetch(
                """select distinct on (s.field_id)
                          s.field_id, s.season_year, s.crop_type, s.status,
                          s.expected_harvest, s.actual_harvest_date, s.is_current, s.created_at
                   from public.field_seasons s
                   join public.fields f on f.id = s.field_id
                   join public.farms fa on fa.id = f.farm_id
                   where fa.org_id=$1::uuid and f.deleted_at is null
                   order by s.field_id, s.is_current desc, s.season_year desc, s.created_at desc""",
                org_id)

    latest = {str(r["field_id"]): r for r in latest_rows}
    prev = {(str(r["field_id"]), r["sensor"]): r for r in prev_rows}
    meta = {str(r["field_id"]): r for r in meta_rows}
    seasons = {str(r["field_id"]): r for r in season_rows}

    ranked: list[dict] = []
    unranked: list[dict] = []

    for f in fields:
        fid = str(f["id"])
        m = meta.get(fid)
        s = seasons.get(fid)

        crop = None
        if s is not None:
            crop = (s["crop_type"] or "").strip() or None
        if not crop and m is not None:
            crop = (m["crop_type"] or "").strip() or None

        # Planned harvest: the season row wins over the 1:1 metadata row (metadata is overwritten
        # on every save, the season row is per planting).
        expected = None
        harvest_source = None
        if s is not None and s["expected_harvest"] is not None:
            expected, harvest_source = s["expected_harvest"], "season"
        elif m is not None and m["expected_harvest"] is not None:
            expected, harvest_source = m["expected_harvest"], "metadata"

        season_status = s["status"] if s is not None else None
        actual_harvest = s["actual_harvest_date"] if s is not None else None
        harvested = actual_harvest is not None or (season_status in _DONE_STATUSES)

        days_to_harvest = (expected - today).days if expected is not None else None
        # A stale date is untrustworthy for BOTH the date signal and the "is it late in the season"
        # question, so it is discarded once here rather than second-guessed twice below.
        harvest_stale = days_to_harvest is not None and days_to_harvest < -STALE_HARVEST_DAYS
        usable_days = None if harvest_stale else days_to_harvest

        lat_row = latest.get(fid)
        ndvi = _f(lat_row["mean"]) if lat_row is not None else None
        ndvi_date = lat_row["acquired_at"] if lat_row is not None else None
        sensor = lat_row["sensor"] if lat_row is not None else None

        ndvi_prev = ndvi_prev_date = None
        delta = None
        gap_days = None
        if lat_row is not None and sensor is not None:
            p_row = prev.get((fid, sensor))
            # Guard against the same observation landing in both windows.
            if p_row is not None and ndvi_date is not None and p_row["acquired_at"] < ndvi_date:
                ndvi_prev = _f(p_row["mean"])
                ndvi_prev_date = p_row["acquired_at"]
                if ndvi is not None and ndvi_prev is not None:
                    delta = round(ndvi - ndvi_prev, 3)
                    gap_days = (ndvi_date - ndvi_prev_date).days

        base = {
            "field_id": fid,
            "name": f["name"],
            "area_ha": _f(f["area_ha"]),
            "crop_type": crop,
            "ndvi": round(ndvi, 3) if ndvi is not None else None,
            "ndvi_date": ndvi_date.isoformat() if ndvi_date is not None else None,
            "ndvi_prev": round(ndvi_prev, 3) if ndvi_prev is not None else None,
            "ndvi_prev_date": ndvi_prev_date.isoformat() if ndvi_prev_date is not None else None,
            "ndvi_delta": delta,
            "ndvi_gap_days": gap_days,
            "sensor": sensor,
            "expected_harvest": expected.isoformat() if expected is not None else None,
            "harvest_source": harvest_source,
            "days_to_harvest": days_to_harvest,
            "harvest_date_stale": harvest_stale,
            "season_year": s["season_year"] if s is not None else None,
            "season_status": season_status,
            "growth_stage": (m["growth_stage"] if m is not None else None),
            "harvested": harvested,
            "actual_harvest_date": actual_harvest.isoformat() if actual_harvest is not None else None,
        }

        if harvested:
            unranked.append({**base, "rank": None, "rankable": False, "score": None,
                             "signals": [], "missing": [],
                             "reason": _missing_reason(ndvi is not None, expected is not None, True)})
            continue

        # A fallow field has nothing to harvest — it must not compete for a position, and the
        # "already harvested" wording would be wrong for it.
        if season_status in _FALLOW_STATUSES:
            unranked.append({**base, "rank": None, "rankable": False, "score": None,
                             "signals": [], "missing": [],
                             "reason": "Sahə bu mövsüm herikdədir (əkin yoxdur) — "
                                       "yığım sırasına daxil edilmir."})
            continue

        falling = delta is not None and delta <= FALLING_DELTA
        late_season = (usable_days is not None and usable_days <= LATE_SEASON_DAYS) \
            or season_status == "harvest"

        scores: dict[str, float] = {}
        if usable_days is not None:
            scores["harvest_date"] = _harvest_date_score(usable_days)
        if delta is not None:
            scores["ndvi_trend"] = _ndvi_trend_score(delta)
        # A low NDVI is ripeness evidence ONLY once the season is demonstrably late (or the canopy
        # is already dropping). Early-season low NDVI = a struggling crop, and must not rank first.
        if ndvi is not None and (late_season or falling):
            scores["ndvi_level"] = _ndvi_level_score(ndvi)

        missing = [SIGNAL_LABELS[k] for k in WEIGHTS if k not in scores]

        if not scores:
            unranked.append({**base, "rank": None, "rankable": False, "score": None,
                             "signals": [], "missing": missing,
                             "reason": _missing_reason(ndvi is not None, usable_days is not None,
                                                       False, harvest_stale=harvest_stale)})
            continue

        weight_sum = sum(WEIGHTS[k] for k in scores)
        score = sum(WEIGHTS[k] * v for k, v in scores.items()) / weight_sum

        ranked.append({
            **base,
            "rank": None,  # assigned after the sort
            "rankable": True,
            "score": round(score, 1),
            "signals": [{"key": k, "label": SIGNAL_LABELS[k], "score": round(v, 1),
                         "weight": round(WEIGHTS[k] / weight_sum, 2)}
                        for k, v in sorted(scores.items(), key=lambda kv: -WEIGHTS[kv[0]])],
            "missing": missing,
            "late_season": late_season,
            "reason": _reason(days_to_harvest, ndvi, ndvi_prev, delta, gap_days, score,
                              harvest_stale=harvest_stale),
        })

    # Highest score first; a stable secondary key keeps the order deterministic between reloads.
    ranked.sort(key=lambda r: (-(r["score"] or 0.0), r["name"] or ""))
    for i, r in enumerate(ranked, start=1):
        r["rank"] = i
    unranked.sort(key=lambda r: r["name"] or "")

    return {
        "org_id": org_id,
        "generated_on": today.isoformat(),
        "index": INDEX_NAME,
        "fields": ranked,
        "unranked": unranked,
        "counts": {"total": len(fields), "ranked": len(ranked), "unranked": len(unranked)},
        "truncated": len(fields) >= limit,
        "basis": ("Sıralama son NDVI ölçüsü, NDVI-nin son həftələrdəki dəyişməsi və "
                  "planlaşdırılan yığım tarixinə əsaslanır."),
    }
