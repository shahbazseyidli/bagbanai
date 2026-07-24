"""Read-only public geo helpers for field onboarding (terrain + reverse-geocoded region).

All sub-steps are best-effort: any outbound failure or missing datum yields a null field,
never a 500. No org gating — this only touches keyless public geo services.
"""
from math import atan, atan2, cos, degrees, radians, sqrt

import httpx
from fastapi import APIRouter, Depends, Query

from ..db import connection
from ..deps import get_current_user_id

router = APIRouter(prefix="/api/geo", tags=["geo"])

# Tap-to-detect boundary (v2.1 C3). Proxies to the geoapi microservice (heavy geo deps live
# there, not in this image). Auth-gated: any logged-in user creating a field. The result
# ALWAYS needs farmer confirmation before saving (spec C3 trap) — enforced in the UI.
_GEOAPI_URL = "http://geoapi:8010"


@router.post("/segment")
async def segment_boundary(body: dict, user_id: str = Depends(get_current_user_id)):
    try:
        lon = float(body.get("lon"))
        lat = float(body.get("lat"))
    except (TypeError, ValueError):
        return {"ok": False, "reason": "bad_coords", "polygon": None}
    try:
        async with httpx.AsyncClient(timeout=50.0) as client:
            r = await client.post(f"{_GEOAPI_URL}/segment", json={"lon": lon, "lat": lat})
            r.raise_for_status()
            return r.json()
    except Exception as exc:  # noqa: BLE001 — degrade to manual draw on any failure
        return {"ok": False, "reason": f"geoapi_unavailable:{exc}", "polygon": None}


@router.post("/segment-public")
async def segment_boundary_public(body: dict):
    """Anonymous tap-to-detect for the public landing (D3.1) — same read-only NDVI segmentation as
    /segment, but no auth and NOTHING is written. Lets a visitor see their own field boundary before
    creating an account (value-before-account). Area-capped inside the geoapi microservice; degrades
    to manual draw on any failure."""
    try:
        lon = float(body.get("lon"))
        lat = float(body.get("lat"))
    except (TypeError, ValueError):
        return {"ok": False, "reason": "bad_coords", "polygon": None}
    try:
        async with httpx.AsyncClient(timeout=50.0) as client:
            r = await client.post(f"{_GEOAPI_URL}/segment", json={"lon": lon, "lat": lat})
            r.raise_for_status()
            return r.json()
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": f"geoapi_unavailable:{exc}", "polygon": None}


@router.post("/ndvi-public")
async def ndvi_public(body: dict):
    """A11 — anonymous NDVI reading for a polygon drawn on the public landing page.

    The visitor sees a REAL satellite number for their own field before signing up. No auth and
    nothing is written; the geoapi microservice area-caps the request and does a single windowed
    read. Degrades quietly (ok=False + reason) so the landing page never breaks."""
    polygon = body.get("polygon")
    if not isinstance(polygon, dict) or not polygon.get("type"):
        return {"ok": False, "reason": "bad_polygon"}
    try:
        async with httpx.AsyncClient(timeout=50.0) as client:
            r = await client.post(f"{_GEOAPI_URL}/ndvi", json={"polygon": polygon})
            r.raise_for_status()
            return r.json()
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": f"geoapi_unavailable:{exc}"}


_OCTANTS = ["Şimal", "Şimal-Şərq", "Şərq", "Cənub-Şərq",
            "Cənub", "Cənub-Qərb", "Qərb", "Şimal-Qərb"]


def _octant_label(aspect_deg: float) -> str:
    # 8 octants of 45°, North centered on 0/360.
    idx = int((aspect_deg + 22.5) % 360 // 45)
    return _OCTANTS[idx]


async def _terrain(lat: float, lon: float) -> dict:
    """Open-Meteo Elevation API (keyless): center + 4 neighbors at 90 m offset."""
    out = {"elevation_m": None, "slope_deg": None, "aspect_deg": None, "aspect_label": None}
    try:
        d = 90.0
        dlat = d / 111320.0
        dlon = d / (111320.0 * cos(radians(lat)))
        lats = [lat, lat + dlat, lat - dlat, lat, lat]           # center, N, S, E, W
        lons = [lon, lon, lon, lon + dlon, lon - dlon]
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/elevation",
                params={
                    "latitude": ",".join(str(v) for v in lats),
                    "longitude": ",".join(str(v) for v in lons),
                },
            )
        resp.raise_for_status()
        elev = resp.json().get("elevation")
        if not elev or len(elev) < 5:
            return out
        c, n, s, e, w = elev[0], elev[1], elev[2], elev[3], elev[4]
        out["elevation_m"] = round(float(c), 1)
        gx = (e - w) / (2 * 90.0)
        gy = (n - s) / (2 * 90.0)
        out["slope_deg"] = round(degrees(atan(sqrt(gx * gx + gy * gy))), 1)
        if gx == 0 and gy == 0:
            return out  # flat: aspect undefined
        a = degrees(atan2(gx, gy))          # azimuth of uphill from north
        aspect = (a + 180.0) % 360.0        # aspect faces downhill
        out["aspect_deg"] = round(aspect, 0)
        out["aspect_label"] = _octant_label(aspect)
    except Exception:
        pass
    return out


async def _region(lat: float, lon: float, user_id: str) -> dict:
    """Nominatim reverse (keyless) → rayon; map rayon → economic_region via subsidy_regions."""
    out = {"region": None, "economic_region": None}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "jsonv2", "accept-language": "az"},
                headers={"User-Agent": "BagbanAI/1.0 (agradex.com)"},
            )
        resp.raise_for_status()
        addr = resp.json().get("address") or {}
        rayon = (addr.get("county") or addr.get("state_district")
                 or addr.get("province") or addr.get("region"))
        if not rayon:
            return out
        out["region"] = rayon
        # Strip a trailing " rayonu" for matching against subsidy_regions.name_az.
        match = rayon
        if match.lower().endswith(" rayonu"):
            match = match[: -len(" rayonu")]
        match = match.strip()
        async with connection(user_id) as conn:
            eco = await conn.fetchval(
                "select economic_region from public.subsidy_regions where name_az ilike $1 limit 1",
                match)
        if eco:
            out["economic_region"] = eco
    except Exception:
        pass
    return out


@router.get("/site")
async def get_site(lat: float = Query(...), lon: float = Query(...),
                   user_id: str = Depends(get_current_user_id)):
    terrain = await _terrain(lat, lon)
    region = await _region(lat, lon, user_id)
    return {
        "elevation_m": terrain["elevation_m"],
        "slope_deg": terrain["slope_deg"],
        "aspect_deg": terrain["aspect_deg"],
        "aspect_label": terrain["aspect_label"],
        "region": region["region"],
        "economic_region": region["economic_region"],
    }
