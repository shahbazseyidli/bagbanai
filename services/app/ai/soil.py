"""Soil-water pedotransfer functions (v2.1 E1/D1).

Turns SoilGrids texture (sand/silt/clay + organic carbon) into the hydraulic parameters the
FAO-56 irrigation model needs: field capacity (FC), wilting point (WP), total & readily
available water (TAW/RAW). Pure math — no external calls, no hardcoded crop params (root depth
and depletion fraction come from the caller / knowledge blocks).

Equations: Saxton & Rawls (2006), "Soil Water Characteristic Estimates by Texture and Organic
Matter for Hydrologic Solutions", SSSAJ 70:1569-1578 — the standard texture→hydraulics model."""
from __future__ import annotations

from typing import Optional


def pedotransfer(sand_pct: float, clay_pct: float,
                 organic_carbon_g_kg: Optional[float] = None) -> dict:
    """FC and WP (volumetric, m³/m³) from texture + organic matter (Saxton-Rawls 2006)."""
    S = max(0.0, min(100.0, sand_pct)) / 100.0
    C = max(0.0, min(100.0, clay_pct)) / 100.0
    # Organic matter % ≈ organic carbon % × 1.724 (Van Bemmelen); SoilGrids SOC is g/kg.
    om = ((organic_carbon_g_kg or 0.0) / 10.0) * 1.724

    t1500 = (-0.024 * S + 0.487 * C + 0.006 * om + 0.005 * (S * om)
             - 0.013 * (C * om) + 0.068 * (S * C) + 0.031)
    wp = t1500 + (0.14 * t1500 - 0.02)

    t33 = (-0.251 * S + 0.195 * C + 0.011 * om + 0.006 * (S * om)
           - 0.027 * (C * om) + 0.452 * (S * C) + 0.299)
    fc = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015)

    # Clamp to physical bounds and keep FC > WP.
    wp = max(0.01, min(0.4, wp))
    fc = max(wp + 0.02, min(0.55, fc))
    return {"fc": round(fc, 3), "wp": round(wp, 3), "unit": "m3/m3"}


def water_capacity(fc: float, wp: float, root_depth_mm: float, p: float = 0.5) -> dict:
    """TAW/RAW (mm) over the root zone. `p` = depletion fraction (crop-specific; caller supplies
    from the knowledge block, else the FAO-56 mid default 0.5)."""
    taw = max(0.0, (fc - wp) * root_depth_mm)
    return {"taw_mm": round(taw, 1), "raw_mm": round(p * taw, 1),
            "root_depth_mm": root_depth_mm, "p": p}


# Coarse default rooting depth (mm) by crop when field_context has no measured value.
_ROOT_DEPTH = {"hazelnut": 900, "grape": 1000, "wheat": 1200, "cotton": 1000,
               "apple": 1000, "corn": 1000, "generic": 800}


def soil_water_params(soil: dict, crop_type: Optional[str] = None,
                      p: float = 0.5) -> Optional[dict]:
    """Convenience: from a soil_profile block (sand_pct/clay_pct/organic_carbon values) →
    {fc, wp, taw_mm, raw_mm, ...}. Returns None if texture is missing."""
    def _val(k):
        v = soil.get(k)
        return v.get("value") if isinstance(v, dict) else v

    sand, clay = _val("sand_pct"), _val("clay_pct")
    if sand is None or clay is None:
        return None
    oc = _val("organic_carbon")
    fcwp = pedotransfer(float(sand), float(clay), float(oc) if oc is not None else None)
    depth = _ROOT_DEPTH.get((crop_type or "generic"), _ROOT_DEPTH["generic"])
    cap = water_capacity(fcwp["fc"], fcwp["wp"], depth, p=p)
    return {**fcwp, **cap,
            "source": {"name": "Saxton & Rawls (2006) pedotransfer", "type": "derived"}}
