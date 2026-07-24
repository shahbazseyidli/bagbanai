"""Open-Meteo forecast (knowledge layer M8) — keyless daily weather incl. FAO ET0.

Feeds two things: the weather_cache table (per-field forecast) and the water_requirements
block (ET0 − precip → net irrigation need, Kc-adjusted). ET0 comes straight from Open-Meteo's
`et0_fao_evapotranspiration` (FAO-56 Penman-Monteith) so we don't recompute it."""
from __future__ import annotations

from .base import SourceResult, get_json, source_meta

_DAILY = [
    "temperature_2m_max", "temperature_2m_min", "precipitation_sum",
    "precipitation_probability_max", "et0_fao_evapotranspiration",
    "wind_speed_10m_max", "relative_humidity_2m_mean",
]


async def fetch_weather(lat: float, lon: float, *, days: int = 7,
                        base: str = "https://api.open-meteo.com/v1") -> SourceResult:
    """7-day daily forecast for the field centroid. Returns per-day rows + totals. Never raises."""
    try:
        js = await get_json(
            f"{base.rstrip('/')}/forecast",
            params={"latitude": lat, "longitude": lon, "daily": ",".join(_DAILY),
                    "forecast_days": days, "timezone": "auto"})
    except Exception as exc:  # noqa: BLE001
        return SourceResult(ok=False, error=f"openmeteo_unreachable: {exc}")

    daily = (js or {}).get("daily") or {}
    dates = daily.get("time") or []
    if not dates:
        return SourceResult(ok=False, error="openmeteo_empty")

    def col(k):
        return daily.get(k) or []

    rows = []
    for i, d in enumerate(dates):
        def at(k):
            v = col(k)
            return v[i] if i < len(v) else None
        rows.append({
            "date": d, "t_min": at("temperature_2m_min"), "t_max": at("temperature_2m_max"),
            "precip_mm": at("precipitation_sum"), "precip_prob": at("precipitation_probability_max"),
            "et0_mm": at("et0_fao_evapotranspiration"), "wind_max": at("wind_speed_10m_max"),
            "rh_mean": at("relative_humidity_2m_mean"),
        })

    def _sum(k):
        return round(sum(r[k] for r in rows if r[k] is not None), 1)

    data = {"days": rows, "et0_total_mm": _sum("et0_mm"), "precip_total_mm": _sum("precip_mm")}
    return SourceResult(
        ok=True, data=data,
        source=source_meta("https://open-meteo.com/", "Open-Meteo (FAO-56 ET0)", "structured_api", 0.9))


_ARCHIVE_DAILY = ["temperature_2m_max", "temperature_2m_min"]

# Open-Meteo daily variable → our short row key. Anything unmapped keeps its API name, so a
# caller may ask for new variables without touching this module.
_ARCHIVE_ALIASES = {
    "temperature_2m_max": "t_max",
    "temperature_2m_min": "t_min",
    "temperature_2m_mean": "t_mean",
    "precipitation_sum": "precip_mm",
    "rain_sum": "rain_mm",
    "snowfall_sum": "snowfall_cm",
    "et0_fao_evapotranspiration": "et0_mm",
    "wind_speed_10m_max": "wind_max",
    "relative_humidity_2m_mean": "rh_mean",
    "shortwave_radiation_sum": "radiation_mj",
}


async def fetch_archive(lat: float, lon: float, *, start: str, end: str,
                        daily: list[str] | None = None, timeout: float = 25.0,
                        base: str = "https://archive-api.open-meteo.com/v1") -> SourceResult:
    """Daily historical weather from the keyless Open-Meteo *archive* API (separate host, ~5-day
    lag on recent days). Never raises.

    `daily` selects the requested variables (default: tmin/tmax, i.e. exactly what GDD needs, so
    existing callers are unaffected). Rows are built generically from whatever daily columns come
    back, with the well-known variables renamed to the short keys used across the codebase
    (t_min/t_max/precip_mm/et0_mm…). Long windows (B18 needs ~20 years in one call) can raise the
    per-request timeout."""
    cols = list(daily) if daily else list(_ARCHIVE_DAILY)
    try:
        js = await get_json(
            f"{base.rstrip('/')}/archive",
            params={"latitude": lat, "longitude": lon, "start_date": start, "end_date": end,
                    "daily": ",".join(cols), "timezone": "auto"},
            timeout=timeout)
    except Exception as exc:  # noqa: BLE001
        return SourceResult(ok=False, error=f"openmeteo_archive_unreachable: {exc}")

    block = (js or {}).get("daily") or {}
    dates = block.get("time") or []
    if not dates:
        return SourceResult(ok=False, error="openmeteo_archive_empty")

    # Every returned column (plus every requested one, so missing data reads as None).
    keys = [k for k in block.keys() if k != "time"]
    for k in cols:
        if k not in keys:
            keys.append(k)

    rows = []
    for i, d in enumerate(dates):
        row: dict = {"date": d}
        for k in keys:
            vals = block.get(k) or []
            row[_ARCHIVE_ALIASES.get(k, k)] = vals[i] if i < len(vals) else None
        rows.append(row)

    return SourceResult(
        ok=True, data={"days": rows, "variables": keys},
        source=source_meta("https://open-meteo.com/", "Open-Meteo Archive", "structured_api", 0.9))


_HOURLY = ["temperature_2m", "relative_humidity_2m", "dew_point_2m",
           "precipitation", "precipitation_probability", "wind_speed_10m"]


async def fetch_hourly(lat: float, lon: float, *, days: int = 5,
                       base: str = "https://api.open-meteo.com/v1") -> SourceResult:
    """Hourly forecast for the spray-window model (v2.1 B3/E2). Never raises."""
    try:
        js = await get_json(
            f"{base.rstrip('/')}/forecast",
            params={"latitude": lat, "longitude": lon, "hourly": ",".join(_HOURLY),
                    "forecast_days": days, "timezone": "auto"})
    except Exception as exc:  # noqa: BLE001
        return SourceResult(ok=False, error=f"openmeteo_unreachable: {exc}")

    hourly = (js or {}).get("hourly") or {}
    times = hourly.get("time") or []
    if not times:
        return SourceResult(ok=False, error="openmeteo_empty")

    def col(k):
        return hourly.get(k) or []

    rows = []
    for i, ts in enumerate(times):
        def at(k):
            v = col(k)
            return v[i] if i < len(v) else None
        rows.append({"ts": ts, "temp": at("temperature_2m"), "rh": at("relative_humidity_2m"),
                     "dew": at("dew_point_2m"), "precip": at("precipitation"),
                     "precip_prob": at("precipitation_probability"), "wind": at("wind_speed_10m")})
    return SourceResult(
        ok=True, data={"hours": rows},
        source=source_meta("https://open-meteo.com/", "Open-Meteo (hourly)", "structured_api", 0.9))
