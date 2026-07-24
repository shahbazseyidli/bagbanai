"""Field analytics (HYBRID_PLAN W7): the B8 Wellness Score + the A5 season-vs-season curve.

Both endpoints are read-mostly and org-gated with require_member (RLS is defence-in-depth only).

  GET /api/fields/{id}/wellness        — today's 0-100 score, computed on demand when stale/absent.
                                         Always ships `components` + `missing` so the UI can EXPLAIN
                                         the number instead of asserting it.
  GET /api/fields/{id}/season-compare  — per-season DOY-keyed NDVI curve + cumulative integral plus a
                                         same-day-of-year verdict against the previous season. When a
                                         prior season has no data the endpoint SAYS SO; it never
                                         invents a comparison."""
from __future__ import annotations

import json
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query

from ..ai import season as season_mod
from ..ai import wellness as wellness_mod
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["analytics"])

_MAX_YEARS = 10  # upper bound on ?years= — validated by Query(ge/le), never trusted raw


# ---------------------------------------------------------------- B8 wellness
@router.get("/fields/{field_id}/wellness")
async def field_wellness(field_id: str, refresh: bool = Query(default=False),
                         user_id: str = Depends(get_current_user_id)):
    """Today's Field Wellness Score. Stored per (field, day); recomputed on demand when the stored
    row is absent or `refresh=1`."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        stored = None if refresh else await wellness_mod.load_wellness(conn, field_id)
        if stored:
            return stored
        result = await wellness_mod.compute_wellness(conn, field_id)
    result["computed_on"] = date.today().isoformat()
    return result


# ------------------------------------------------------- A5 season comparison
def _pairs(raw: Any) -> list[list[float]]:
    """jsonb → [[doy, value], ...]; tolerant of asyncpg returning jsonb as a str."""
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    out: list[list[float]] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, (list, tuple)) and len(item) >= 2 and item[0] is not None and item[1] is not None:
                try:
                    out.append([int(item[0]), float(item[1])])
                except (TypeError, ValueError):
                    continue
    out.sort(key=lambda p: p[0])
    return out


def _at_doy(series: list[list[float]], doy: int) -> Optional[float]:
    """Value at a day-of-year, linearly interpolated between the two surrounding real points.
    Returns None outside the series range — no extrapolation, because a fabricated tail is exactly
    the kind of comparison this feature must not make."""
    if not series or doy < series[0][0] or doy > series[-1][0]:
        return None
    prev = series[0]
    for point in series:
        if point[0] == doy:
            return point[1]
        if point[0] > doy:
            span = point[0] - prev[0]
            if span <= 0:
                return point[1]
            frac = (doy - prev[0]) / span
            return prev[1] + (point[1] - prev[1]) * frac
        prev = point
    return None


def _pct(cur: Optional[float], prior: Optional[float]) -> Optional[float]:
    if cur is None or prior is None or abs(prior) < 1e-6:
        return None
    return round((cur - prior) / abs(prior) * 100.0, 1)


def _sentence(pct: Optional[float], prior_year: int) -> str:
    if pct is None:
        return f"{prior_year}-ci mövsümlə müqayisə üçün kifayət qədər məlumat yoxdur."
    if pct <= -5:
        return f"Keçən ilin bu vaxtından {abs(pct):.0f}% geridəsiniz."
    if pct >= 5:
        return f"Keçən ilin bu vaxtından {pct:.0f}% qabaqdasınız."
    return "Keçən ilin bu vaxtı ilə demək olar eyni səviyyədəsiniz."


async def _stored_seasons(conn, field_id: str, years: list[int]) -> dict[int, Any]:
    """Read the 0028 feature store rows (with the 0037 DOY columns). Empty dict on a pre-0037 DB."""
    has_doy = await conn.fetchval(
        """select count(*) = 3 from information_schema.columns
           where table_schema='public' and table_name='field_season_features'
             and column_name in ('ndvi_by_doy','integral_by_doy','ndvi_peak_doy')""")
    if not has_doy:
        return {}
    rows = await conn.fetch(
        """select season_year, sensor, n_scenes, ndvi_peak, ndvi_mean, ndvi_integral,
                  ndvi_peak_doy, ndvi_by_doy, integral_by_doy, gdd_total, precip_total_mm,
                  precip_total_src
           from public.field_season_features
           where field_id=$1::uuid and season_year = any($2::int[])""", field_id, years)
    return {int(r["season_year"]): r for r in rows}


@router.get("/fields/{field_id}/season-compare")
async def season_compare(field_id: str, years: int = Query(default=3, ge=1, le=_MAX_YEARS),
                         user_id: str = Depends(get_current_user_id)):
    """DOY-keyed NDVI curve + cumulative integral per season, newest first, plus a same-DOY verdict
    for the current season against the previous one."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)

        current_year = date.today().year
        wanted = [current_year - i for i in range(years)]
        stored = await _stored_seasons(conn, field_id, wanted)

        seasons: list[dict[str, Any]] = []
        for y in wanted:
            row = stored.get(y)
            curve = _pairs(row["ndvi_by_doy"]) if row is not None else []
            integral = _pairs(row["integral_by_doy"]) if row is not None else []
            sensor = row["sensor"] if row is not None else None
            n_scenes = int(row["n_scenes"] or 0) if row is not None else 0
            peak = float(row["ndvi_peak"]) if row is not None and row["ndvi_peak"] is not None else None
            peak_doy = int(row["ndvi_peak_doy"]) if row is not None and row["ndvi_peak_doy"] is not None else None
            total_integral = (float(row["ndvi_integral"])
                              if row is not None and row["ndvi_integral"] is not None else None)

            if not curve:
                # Not in the feature store yet (the T16 cron runs monthly) — derive it live so the
                # chart is useful immediately. Read-only: the cron stays the writer.
                live = await season_mod.season_curve(conn, field_id, y)
                if live:
                    curve = [[int(d), float(v)] for d, v in live["by_doy"]]
                    integral = [[int(d), float(v)] for d, v in live["integral_by_doy"]]
                    sensor = sensor or live["sensor"]
                    n_scenes = n_scenes or live["n_scenes"]
                    peak_doy = peak_doy if peak_doy is not None else live["peak_doy"]
                    if peak is None and curve:
                        peak = max(p[1] for p in curve)
                    if total_integral is None and integral:
                        total_integral = integral[-1][1]

            seasons.append({
                "season_year": y, "sensor": sensor, "n_scenes": n_scenes,
                "ndvi_peak": round(peak, 3) if peak is not None else None,
                "ndvi_peak_doy": peak_doy,
                "ndvi_integral": round(total_integral, 2) if total_integral is not None else None,
                "curve": curve, "integral": integral, "has_data": bool(curve),
            })

    verdict = _verdict(seasons, current_year)
    return {"field_id": field_id, "years": wanted, "current_year": current_year,
            "seasons": seasons, "verdict": verdict}


def _verdict(seasons: list[dict[str, Any]], current_year: int) -> dict[str, Any]:
    """Compare the current season against the most recent prior season WITH DATA, at the current
    season's latest day-of-year. Never guesses when either side is missing."""
    cur = next((s for s in seasons if s["season_year"] == current_year and s["has_data"]), None)
    if cur is None:
        return {"available": False, "reason": "no_current_season", "pct_diff": None, "basis": None,
                "doy": None, "current_year": current_year, "prior_year": None,
                "sentence": "Bu mövsüm üçün hələ peyk məlumatı yoxdur — müqayisə mümkün deyil."}

    prior = next((s for s in seasons
                  if s["season_year"] < current_year and s["has_data"]), None)
    if prior is None:
        return {"available": False, "reason": "no_prior_season", "pct_diff": None, "basis": None,
                "doy": cur["curve"][-1][0], "current_year": current_year, "prior_year": None,
                "sentence": "Keçən mövsüm üçün peyk məlumatı yoxdur — müqayisə mümkün deyil."}

    doy = int(cur["curve"][-1][0])
    cur_ndvi = cur["curve"][-1][1]
    prior_ndvi = _at_doy(prior["curve"], doy)
    cur_int = cur["integral"][-1][1] if cur["integral"] else None
    prior_int = _at_doy(prior["integral"], doy)

    ndvi_pct = _pct(cur_ndvi, prior_ndvi)
    int_pct = _pct(cur_int, prior_int)
    basis = "integral" if int_pct is not None else ("ndvi" if ndvi_pct is not None else None)
    pct = int_pct if basis == "integral" else ndvi_pct

    if basis is None:
        return {"available": False, "reason": "no_overlap", "pct_diff": None, "basis": None,
                "doy": doy, "current_year": current_year, "prior_year": prior["season_year"],
                "sentence": (f"{prior['season_year']}-ci mövsümdə bu tarix üçün müqayisə oluna "
                             "bilən peyk məlumatı yoxdur.")}

    return {
        "available": True, "reason": None, "doy": doy,
        "current_year": current_year, "prior_year": prior["season_year"],
        "basis": basis, "pct_diff": pct,
        "current_ndvi": round(cur_ndvi, 3) if cur_ndvi is not None else None,
        "prior_ndvi": round(prior_ndvi, 3) if prior_ndvi is not None else None,
        "ndvi_pct_diff": ndvi_pct,
        "current_integral": round(cur_int, 2) if cur_int is not None else None,
        "prior_integral": round(prior_int, 2) if prior_int is not None else None,
        "integral_pct_diff": int_pct,
        "sentence": _sentence(pct, prior["season_year"]),
    }
