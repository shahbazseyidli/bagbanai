"""Tap-to-detect field boundary (v2.1 C3) — region growing on a recent Sentinel-2 composite.

The farmer taps inside their field; we flood-fill outward from that pixel over similar NDVI,
stop at field edges, vectorise the blob and simplify it to a handful of vertices. Classic image
processing — no ML model — so it is cheap, fast and explainable (spec C3.3). The result ALWAYS
needs farmer confirmation (spec C3 trap): the caller shows "Bu sizin sahədirmi?".

Runs in the geo image (rasterio/shapely/rioxarray already present); exposed via segment_api.py."""
from __future__ import annotations

from collections import deque
from math import cos, radians
from typing import Optional

MAX_HA = 60.0           # hard cap so the fill can't swallow a whole valley (spec trap)
NDVI_TOL = 0.08         # similarity band around the seed's NDVI (tighter → less neighbour bleed)
HALF_M = 650.0          # half-size of the read window around the tap (metres)
TARGET_VERTICES = 24    # simplify down to roughly this many points (spec: ~15, not 200)


def _simplify_to_target(poly, px_m: float):
    """Douglas-Peucker with an increasing tolerance until the exterior ring is small enough
    (spec C3.3 step 4 — 15 points, not 200). Drops holes: a field boundary is one ring."""
    from shapely.geometry import Polygon
    ring = Polygon(poly.exterior)
    tol = max(px_m, 12.0)
    for _ in range(8):
        s = ring.simplify(tol, preserve_topology=True)
        if not s.is_empty and len(s.exterior.coords) <= TARGET_VERTICES:
            return s
        tol *= 1.6
    return ring.simplify(tol, preserve_topology=True)


def _bbox_geojson(lon: float, lat: float, half_m: float = HALF_M) -> dict:
    dlat = half_m / 111320.0
    dlon = half_m / (111320.0 * max(cos(radians(lat)), 1e-6))
    x0, y0, x1, y1 = lon - dlon, lat - dlat, lon + dlon, lat + dlat
    return {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}


def detect_boundary(lon: float, lat: float, *, max_ha: float = MAX_HA,
                    tol: float = NDVI_TOL) -> dict:
    """Return {ok, polygon(GeoJSON 4326)|None, area_ha, reason}. Never raises for the
    expected failure modes (no scene / cloudy / fill hit the cap) — returns ok=False."""
    import numpy as np
    import rasterio
    import rasterio.features
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds
    from shapely.geometry import shape, mapping, Point
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer

    from .read import prepare_gdal_for_public_cog
    from .search_s2 import search_scenes_s2
    from .indices import BANDS, S2_SR_SCALE

    from datetime import date, timedelta
    from math import cos, radians

    prepare_gdal_for_public_cog()
    # Read window in WGS84 around the tap (bounded → windowed COG reads stay tiny, no full-tile
    # load; a full-tile eager read was OOM-killing the shared host).
    _dlat = HALF_M / 111320.0
    _dlon = HALF_M / (111320.0 * max(cos(radians(lat)), 1e-6))
    win_bbox = (lon - _dlon, lat - _dlat, lon + _dlon, lat + _dlat)
    bbox = (lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02)
    today = date.today()
    try:
        granules = search_scenes_s2(bbox, today - timedelta(days=45), today, max_cloud=40)
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "polygon": None, "area_ha": None, "reason": f"search_failed:{exc}"}
    if not granules:
        return {"ok": False, "polygon": None, "area_ha": None, "reason": "no_recent_scene"}
    granules.sort(key=lambda g: getattr(g, "acquired_at", today), reverse=True)

    km = BANDS["S2"]

    def _read_window(href, crs, win):
        """Windowed COG read → float32 reflectance array (only the window loads)."""
        with rasterio.open(href) as src:
            arr = src.read(1, window=win, boundless=True, fill_value=0).astype("float32")
        return arr * S2_SR_SCALE

    # Freshest granule first; use the first that reads cleanly over the window.
    for g in granules:
        red_h, nir_h = g.assets.get(km["red"]), g.assets.get(km["nir"])
        if not red_h or not nir_h:
            continue
        try:
            with rasterio.open(nir_h) as src:
                crs = src.crs
                l, b, r_, t = transform_bounds("EPSG:4326", crs, *win_bbox)
                win = from_bounds(l, b, r_, t, src.transform)
                transform = src.window_transform(win)
            nir = _read_window(nir_h, crs, win)
            red = _read_window(red_h, crs, win)
        except Exception:  # noqa: BLE001 — try the next granule
            continue
        denom = nir + red
        ndvi = np.where(denom > 0, (nir - red) / denom, np.nan).astype("float32")
        if not np.isfinite(ndvi).any():
            continue

        h, w = ndvi.shape
        # Seed pixel = the tap point, projected into the raster CRS then to row/col.
        to_utm = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
        sx, sy = to_utm.transform(lon, lat)
        col = int((sx - transform.c) / transform.a)
        row = int((sy - transform.f) / transform.e)
        if not (0 <= row < h and 0 <= col < w) or not np.isfinite(ndvi[row, col]):
            continue

        seed_val = float(ndvi[row, col])
        px_area_m2 = abs(transform.a * transform.e)
        max_px = int((max_ha * 10000.0) / px_area_m2)

        # BFS flood-fill over 4-neighbours within the NDVI tolerance, bounded by max_px.
        mask = np.zeros((h, w), dtype="uint8")
        seen = np.zeros((h, w), dtype=bool)
        dq = deque([(row, col)])
        seen[row, col] = True
        count = 0
        capped = False
        while dq:
            r, c = dq.popleft()
            v = ndvi[r, c]
            if not np.isfinite(v) or abs(v - seed_val) > tol:
                continue
            mask[r, c] = 1
            count += 1
            if count > max_px:
                capped = True
                break
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and not seen[nr, nc]:
                    seen[nr, nc] = True
                    dq.append((nr, nc))
        if count < 20:            # too small — likely a bad seed/cloud; try next granule
            continue

        # Vectorise the blob; keep the polygon that contains the seed (or the largest).
        polys = [shape(geom) for geom, val in
                 rasterio.features.shapes(mask, mask=mask.astype(bool), transform=transform) if val == 1]
        if not polys:
            continue
        chosen = next((p for p in polys if p.contains(Point(sx, sy))), max(polys, key=lambda p: p.area))
        # Simplify to a handful of vertices + drop holes (spec C3.3: ~15 points, not 200).
        chosen = _simplify_to_target(chosen, abs(transform.a))
        if chosen.is_empty or chosen.area < px_area_m2 * 20:
            continue

        area_ha = round(chosen.area / 10000.0, 3)
        to_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
        poly_wgs = shp_transform(lambda x, y, z=None: to_wgs.transform(x, y), chosen)
        return {"ok": True, "polygon": mapping(poly_wgs), "area_ha": area_ha,
                "reason": "capped" if capped else "ok", "scene_date": str(getattr(g, "acquired_at", ""))}

    return {"ok": False, "polygon": None, "area_ha": None, "reason": "no_readable_scene"}
