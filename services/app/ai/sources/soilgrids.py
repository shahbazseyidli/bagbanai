"""ISRIC SoilGrids v2.0 — soil profile by coordinate (250 m, global). Keyless, but beta
uptime is not guaranteed → the orchestrator caches the result as a field_knowledge
soil_profile block and reuses the cache on failure (spec §3.1 #1).

Returns topsoil (0–30 cm, depth-weighted) pH, organic carbon, texture (sand/silt/clay %),
CEC, total nitrogen — normalized to human-readable units."""
from __future__ import annotations

from .base import SourceResult, get_json, source_meta

BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query"
# property → (human key, unit label). SoilGrids returns integers scaled by unit_measure.d_factor.
_PROPS = {
    "phh2o": ("ph", "pH"),
    "soc": ("organic_carbon", "g/kg"),
    "clay": ("clay_pct", "%"),
    "sand": ("sand_pct", "%"),
    "silt": ("silt_pct", "%"),
    "cec": ("cec", "cmol/kg"),
    "nitrogen": ("nitrogen", "g/kg"),
}
_DEPTHS = {"0-5cm": 5, "5-15cm": 10, "15-30cm": 15}  # topsoil layers + their thickness (weights)


async def fetch_soil(lat: float, lon: float) -> SourceResult:
    params = [("lon", lon), ("lat", lat), ("value", "mean")]
    params += [("property", p) for p in _PROPS]
    params += [("depth", d) for d in _DEPTHS]
    try:
        js = await get_json(BASE, params=params)
    except Exception as exc:  # noqa: BLE001
        return SourceResult(ok=False, error=f"soilgrids_unreachable: {exc}")

    out: dict = {}
    try:
        for layer in (js.get("properties", {}) or {}).get("layers", []):
            name = layer.get("name")
            if name not in _PROPS:
                continue
            human, unit = _PROPS[name]
            d_factor = ((layer.get("unit_measure") or {}).get("d_factor")) or 1
            # Depth-weighted mean over the topsoil layers we requested.
            num = den = 0.0
            for dv in layer.get("depths", []):
                label = dv.get("label")
                mean = (dv.get("values") or {}).get("mean")
                w = _DEPTHS.get(label)
                if mean is None or w is None:
                    continue
                num += (mean / d_factor) * w
                den += w
            if den:
                out[human] = {"value": round(num / den, 2), "unit": unit}
    except Exception as exc:  # noqa: BLE001 — malformed payload → degrade, don't crash
        return SourceResult(ok=False, error=f"soilgrids_parse: {exc}")

    if not out:
        return SourceResult(ok=False, error="soilgrids_empty")

    # A coarse texture class helps downstream prose (LLM/advice) without extra tokens.
    if all(k in out for k in ("clay_pct", "sand_pct")):
        clay = out["clay_pct"]["value"]
        sand = out["sand_pct"]["value"]
        out["texture_class"] = ("gilli" if clay >= 40 else "qumlu" if sand >= 70
                                else "gillicə-qumlu" if sand >= 50 else "gillicəli")
    return SourceResult(
        ok=True, data=out,
        source=source_meta(
            f"{BASE}?lon={lon}&lat={lat}", "ISRIC SoilGrids v2.0", "structured_api", 0.85))
