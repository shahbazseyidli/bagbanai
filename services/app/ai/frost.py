"""Regional frost climatology from the Open-Meteo archive (HYBRID_PLAN W7, B18).

OneSoil/Farmbrite show "last spring frost / first autumn frost" per region; we derive the same
from ~20 years of the keyless Open-Meteo *archive* API (one call for the whole window) instead of
buying a climate dataset.

Per calendar year:
  * last spring frost  = the LAST date before 1 July with t_min <= threshold
  * first autumn frost = the FIRST date from 1 July on with t_min <= threshold
  * frost-free days    = days strictly between the two

Across years we report the median (p50) plus a SAFE percentile — p90 for the last spring frost
(9 years out of 10 the frost is over by then → safe to plant) and p10 for the first autumn frost
(9 years out of 10 the autumn frost comes later → safe to still be in the field). The gap between
the two safe dates is the planting window.

Pure computation: no DB access, no writes. The caller (routers/weather_history.py) caches the
returned dict in zone_knowledge so one computation serves every field in the rayon."""
from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Any, Optional

from .sources import openmeteo

DEFAULT_THRESHOLD_C = 0.0
DEFAULT_YEARS = 20

# The archive API lags a few days behind "today".
_ARCHIVE_LAG_DAYS = 5
# A year needs this many daily records before it can contribute to the climatology.
_MIN_DAYS_PER_YEAR = 330
# Day-of-year of 1 July in the (non-leap) reference calendar — the spring/autumn split.
_JUL1_DOY = 182
_SAFE_SPRING_PCT = 90     # later date = safer for planting
_SAFE_AUTUMN_PCT = 10     # earlier date = safer for harvest planning
# Fallback GDD start (1 March) when the zone records no frost at all.
_FALLBACK_GDD_START_DOY = 60

_DAILY_VARS = ["temperature_2m_min", "temperature_2m_max", "precipitation_sum"]
_AZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn",
              "iyl", "avq", "sen", "okt", "noy", "dek"]


# ===== small helpers =====
def _percentile(values: list[float], pct: float) -> Optional[float]:
    """Linear-interpolated percentile of a small sample (no numpy in the API image)."""
    vals = sorted(float(v) for v in values if v is not None)
    if not vals:
        return None
    if len(vals) == 1:
        return vals[0]
    k = (len(vals) - 1) * (pct / 100.0)
    lo, hi = math.floor(k), math.ceil(k)
    if lo == hi:
        return vals[int(k)]
    return vals[lo] * (hi - k) + vals[hi] * (k - lo)


def norm_doy(d: date) -> int:
    """Day-of-year in a fixed non-leap reference calendar so years are directly comparable
    (29 Feb collapses onto 1 March)."""
    if d.month == 2 and d.day == 29:
        return 60
    return date(2001, d.month, d.day).timetuple().tm_yday


def doy_to_mmdd(doy: Optional[float]) -> Optional[str]:
    """Reference-calendar day-of-year → 'MM-DD'."""
    if doy is None:
        return None
    i = max(1, min(365, int(round(float(doy)))))
    return (date(2001, 1, 1) + timedelta(days=i - 1)).strftime("%m-%d")


def mmdd_az(mmdd: Optional[str]) -> str:
    """'04-12' → '12 apr' (Azerbaijani short month)."""
    if not mmdd or len(mmdd) < 5:
        return "—"
    try:
        m, d = int(mmdd[:2]), int(mmdd[3:5])
    except ValueError:
        return "—"
    if not 1 <= m <= 12:
        return "—"
    return f"{d} {_AZ_MONTHS[m - 1]}"


def _stat(values: list[float], safe_pct: float) -> dict[str, Any]:
    p50 = _percentile(values, 50)
    safe = _percentile(values, safe_pct)
    return {
        "p50_doy": int(round(p50)) if p50 is not None else None,
        "p50_mmdd": doy_to_mmdd(p50),
        "safe_doy": int(round(safe)) if safe is not None else None,
        "safe_mmdd": doy_to_mmdd(safe),
        "percentile": safe_pct,
        "years": len(values),
        "earliest_mmdd": doy_to_mmdd(min(values)) if values else None,
        "latest_mmdd": doy_to_mmdd(max(values)) if values else None,
    }


# ===== the climatology =====
def compute_from_days(days: list[dict], *, threshold_c: float = DEFAULT_THRESHOLD_C,
                      today: Optional[date] = None) -> dict[str, Any]:
    """Frost climatology from already-fetched archive rows ({date, t_min, t_max, precip_mm})."""
    today = today or date.today()
    end = today - timedelta(days=_ARCHIVE_LAG_DAYS)

    by_year: dict[int, dict] = {}
    for r in days:
        raw = r.get("date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(str(raw)[:10])
        except ValueError:
            continue
        y = by_year.setdefault(d.year, {"days": 0, "last_spring": None, "first_autumn": None,
                                        "precip": 0.0, "t_min_abs": None})
        y["days"] += 1
        p = r.get("precip_mm")
        if p is not None:
            y["precip"] += float(p)
        tmn = r.get("t_min")
        if tmn is None:
            continue
        tmn = float(tmn)
        if y["t_min_abs"] is None or tmn < y["t_min_abs"]:
            y["t_min_abs"] = tmn
        if tmn > threshold_c:
            continue
        doy = norm_doy(d)
        if doy < _JUL1_DOY:
            if y["last_spring"] is None or doy > y["last_spring"]:
                y["last_spring"] = doy
        else:
            if y["first_autumn"] is None or doy < y["first_autumn"]:
                y["first_autumn"] = doy

    # Only (near-)complete years count; the running year is excluded unless it is essentially over.
    complete = {yr: v for yr, v in by_year.items()
                if v["days"] >= _MIN_DAYS_PER_YEAR and not (yr == end.year and end.month < 12)}
    if not complete:
        return {"ok": False, "reason": "archive_too_short"}

    spring = [float(v["last_spring"]) for v in complete.values() if v["last_spring"] is not None]
    autumn = [float(v["first_autumn"]) for v in complete.values() if v["first_autumn"] is not None]
    frost_free = [float(v["first_autumn"] - v["last_spring"] - 1)
                  for v in complete.values()
                  if v["last_spring"] is not None and v["first_autumn"] is not None]
    precips = [v["precip"] for v in complete.values()]
    coldest = [v["t_min_abs"] for v in complete.values() if v["t_min_abs"] is not None]

    last_spring = _stat(spring, _SAFE_SPRING_PCT)
    first_autumn = _stat(autumn, _SAFE_AUTUMN_PCT)

    ff_p50 = _percentile(frost_free, 50)
    window: dict[str, Any] = {"start_doy": None, "start_mmdd": None,
                              "end_doy": None, "end_mmdd": None, "days": None}
    if last_spring["safe_doy"] is not None and first_autumn["safe_doy"] is not None:
        s = last_spring["safe_doy"] + 1          # first safe day AFTER the safe last frost
        e = first_autumn["safe_doy"] - 1         # last safe day BEFORE the safe first frost
        if e > s:
            window = {"start_doy": s, "start_mmdd": doy_to_mmdd(s),
                      "end_doy": e, "end_mmdd": doy_to_mmdd(e), "days": e - s + 1}

    # GDD accumulation conventionally starts around the median last frost / bud-break.
    gdd_start = last_spring["p50_doy"] or _FALLBACK_GDD_START_DOY

    years_sorted = sorted(complete.keys())
    out: dict[str, Any] = {
        "ok": True,
        "threshold_c": float(threshold_c),
        "years_used": len(complete),
        "year_from": years_sorted[0],
        "year_to": years_sorted[-1],
        "frost_years": len([1 for v in complete.values()
                            if v["last_spring"] is not None or v["first_autumn"] is not None]),
        "frostless_years": len([1 for v in complete.values()
                                if v["last_spring"] is None and v["first_autumn"] is None]),
        "last_spring_frost": last_spring,
        "first_autumn_frost": first_autumn,
        "frost_free_days": {
            "p50": int(round(ff_p50)) if ff_p50 is not None else None,
            "min": int(min(frost_free)) if frost_free else None,
            "max": int(max(frost_free)) if frost_free else None,
            "years": len(frost_free),
        },
        "planting_window": window,
        "gdd_start_doy": gdd_start,
        "gdd_start_mmdd": doy_to_mmdd(gdd_start),
        "annual_precip_mm_mean": round(sum(precips) / len(precips), 0) if precips else None,
        "coldest_t_min_mean": round(sum(coldest) / len(coldest), 1) if coldest else None,
        "coldest_t_min_abs": round(min(coldest), 1) if coldest else None,
        "per_year": [
            {"year": yr,
             "last_spring_mmdd": doy_to_mmdd(complete[yr]["last_spring"]),
             "first_autumn_mmdd": doy_to_mmdd(complete[yr]["first_autumn"]),
             "frost_free_days": (complete[yr]["first_autumn"] - complete[yr]["last_spring"] - 1)
             if complete[yr]["last_spring"] is not None and complete[yr]["first_autumn"] is not None
             else None,
             "t_min_abs": complete[yr]["t_min_abs"]}
            for yr in years_sorted
        ],
    }
    out["sentence_az"] = explain_az(out)
    return out


def explain_az(clim: dict[str, Any]) -> str:
    """One short farmer-facing sentence (Azerbaijani) summarising the climatology."""
    if not clim.get("ok"):
        return "Bu bölgə üçün şaxta tarixçəsi hazırda hesablana bilmədi."
    n = clim.get("years_used") or 0
    thr = clim.get("threshold_c", 0.0)
    ls = clim.get("last_spring_frost") or {}
    fa = clim.get("first_autumn_frost") or {}
    win = clim.get("planting_window") or {}
    ff = (clim.get("frost_free_days") or {}).get("p50")
    if not ls.get("p50_mmdd") and not fa.get("p50_mmdd"):
        return (f"Son {n} ilin arxivində bu bölgədə {thr:g}°C-dən aşağı şaxta qeydə alınmayıb — "
                "şaxta riski çox aşağıdır.")
    parts = [f"Son {n} ilin arxivinə görə son yaz şaxtası (≤{thr:g}°C) orta hesabla "
             f"{mmdd_az(ls.get('p50_mmdd'))} tarixində olur"]
    if ls.get("safe_mmdd"):
        parts.append(f"10 ildən 9-da {mmdd_az(ls.get('safe_mmdd'))} tarixindən sonra şaxta düşmür")
    if fa.get("p50_mmdd"):
        parts.append(f"ilk payız şaxtası orta hesabla {mmdd_az(fa.get('p50_mmdd'))}")
    sentence = ", ".join(parts) + "."
    if win.get("start_mmdd") and win.get("end_mmdd"):
        sentence += (f" Təhlükəsiz əkin pəncərəsi: {mmdd_az(win['start_mmdd'])} – "
                     f"{mmdd_az(win['end_mmdd'])} ({win.get('days')} gün).")
    if ff:
        sentence += f" Orta şaxtasız dövr {ff} gündür."
    return sentence


async def frost_climatology(lat: float, lon: float, *, years: int = DEFAULT_YEARS,
                            threshold_c: float = DEFAULT_THRESHOLD_C,
                            base: str = "https://archive-api.open-meteo.com/v1",
                            timeout: float = 60.0) -> dict[str, Any]:
    """Fetch ~`years` years of archive data for the point in ONE call and reduce it to the frost
    climatology. Returns {"ok": False, "reason": ...} instead of raising."""
    years = max(3, min(40, int(years)))
    today = date.today()
    end = today - timedelta(days=_ARCHIVE_LAG_DAYS)
    start = date(end.year - years, 1, 1)

    res = await openmeteo.fetch_archive(lat, lon, start=start.isoformat(), end=end.isoformat(),
                                        daily=_DAILY_VARS, timeout=timeout, base=base)
    if not res.ok:
        return {"ok": False, "reason": res.error or "archive_unavailable"}

    out = compute_from_days(res.data.get("days") or [], threshold_c=threshold_c, today=today)
    if not out.get("ok"):
        return out
    out["lat"] = round(float(lat), 4)
    out["lon"] = round(float(lon), 4)
    out["requested_years"] = years
    out["source"] = res.source
    return out
