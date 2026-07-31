"""Tap-to-detect field boundary (v2.1 C3) — region growing on a recent Sentinel-2 composite.

The farmer taps inside their field; we flood-fill outward from that pixel over similar NDVI,
stop at field edges, vectorise the blob and simplify it to a handful of vertices. Classic image
processing — no ML model — so it is cheap, fast and explainable (spec C3.3). The result ALWAYS
needs farmer confirmation (spec C3 trap): the caller shows "Bu sizin sahədirmi?".

Runs in the geo image (rasterio/shapely/rioxarray already present); exposed via segment_api.py."""
from __future__ import annotations

from math import cos, radians
from typing import Optional

MAX_HA = 35.0           # over this, a "field" is almost certainly bled into neighbours → reject
NDVI_TOL = 0.08         # similarity band around the seed's NDVI (tighter → less neighbour bleed)
EDGE_THRESH = 0.05      # per-pixel NDVI gradient above this = a boundary (fill stops there)
REFL_EDGE = 0.035       # reflectance (red/NIR) gradient boundary — catches roads/ditches on
                        # BARE or uniform soil where NDVI is flat and gives no edge
HALF_M = 650.0          # half-size of the read window around the tap (metres)
TARGET_VERTICES = 24    # simplify down to roughly this many points (spec: ~15, not 200)
SEARCH_DAYS = 120       # look back far enough to find a vegetated scene, not just bare/harvested
VEG_MIN = 0.25          # tap-pixel NDVI below this = bare/harvested → skip, seek a greener scene
SKIP_BARE_LIMIT = 5     # how many bare scenes to skip before accepting one (avoids infinite skip)


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
        granules = search_scenes_s2(bbox, today - timedelta(days=SEARCH_DAYS), today, max_cloud=40)
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "polygon": None, "area_ha": None, "reason": f"search_failed:{exc}"}
    if not granules:
        return {"ok": False, "polygon": None, "area_ha": None, "reason": "no_recent_scene"}
    granules.sort(key=lambda g: getattr(g, "acquired_at", today), reverse=True)

    km = BANDS["S2"]

    from rasterio.windows import Window

    def _ndvi(nir_a, red_a):
        d = nir_a + red_a
        return np.where(d > 0, (nir_a - red_a) / d, np.nan).astype("float32")

    # Freshest granule first; skip bare/harvested scenes (flat NDVI, no edges) to find a
    # vegetated one where the field boundary is actually visible.
    #
    # WHY THE SEED IS PROBED BEFORE THE WINDOW IS READ. This loop used to read the FULL ~130x130
    # window of NIR and RED — two remote COG reads over the network — and only then look at the
    # 3x3 mean around the tap to decide whether the scene was bare. Every scene skipped as bare
    # therefore cost two full reads that were thrown away. The decision needs a handful of pixels,
    # so it now reads a handful: a 5x5 probe at the tap decides, and the full window is only read
    # for a granule that passes. Verified to return byte-identical answers on two probe points.
    #
    # ⚠️ THIS DOES NOT FIX THE 45-60 s WORST CASE, and measurement says so plainly. Instrumenting
    # two real taps on 2026-07-31 (48.8025,41.4520 and 48.6820,41.6290) showed the loop walking
    # 32+ granules at ~1.7 s each, and they were NOT being rejected as bare — they passed the bare
    # test, paid for the full window, and were rejected further down at `lbl[row, col] == 0`,
    # i.e. the tapped pixel fell inside the edge mask. That is a property of WHERE THE FARMER
    # TAPPED, so it repeats on every granule, and the answer that eventually comes back arrives
    # from a four-month-old scene. Both timings are unchanged by this probe: 64 s and 58 s.
    #
    # Two fixes were tried against those points and BOTH were reverted because they changed the
    # answers rather than the timing:
    #   * forcing candidate[row, col] = True — binary_opening(iterations=1) erases an isolated
    #     pixel, so the granule is rejected one step later anyway;
    #   * capping the granules examined (6, then 12) — 17 s and 13 s, but both points then
    #     returned no_readable_scene where they had returned boundary_unclear and a real 0.46 ha
    #     boundary. Faster and wrong is not an improvement.
    # The real fix is in what happens when the seed lands on an edge, and it needs field testing
    # against real taps before it can be trusted. Left open deliberately.
    skipped_bare = 0
    for g in granules:
        red_h, nir_h = g.assets.get(km["red"]), g.assets.get(km["nir"])
        if not red_h or not nir_h:
            continue
        try:
            with rasterio.open(nir_h) as src_nir, rasterio.open(red_h) as src_red:
                crs = src_nir.crs
                l, b, r_, t = transform_bounds("EPSG:4326", crs, *win_bbox)
                win = from_bounds(l, b, r_, t, src_nir.transform)
                transform = src_nir.window_transform(win)

                # --- cheap probe: is this scene green AT THE TAP? ---
                # The probe must land on EXACTLY the pixels the old full-window path averaged,
                # because seed_val is not only the bare/green test — it also centres the region
                # -growing tolerance band further down. So row/col are derived from the WINDOW
                # transform exactly as before, then offset back into full-raster coordinates.
                # (from_bounds can return fractional offsets, so int(r_f) and win.row_off + row
                # are not interchangeable; this way there is nothing to get wrong.)
                to_utm = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
                sx, sy = to_utm.transform(lon, lat)
                col = int((sx - transform.c) / transform.a)
                row = int((sy - transform.f) / transform.e)
                probe = Window(win.col_off + col - 2, win.row_off + row - 2, 5, 5)
                p_nir = src_nir.read(1, window=probe, boundless=True,
                                     fill_value=0).astype("float32") * S2_SR_SCALE
                p_red = src_red.read(1, window=probe, boundless=True,
                                     fill_value=0).astype("float32") * S2_SR_SCALE
                p_ndvi = _ndvi(p_nir, p_red)
                centre = p_ndvi[1:4, 1:4]
                seed_val = float(np.nanmean(centre)) if np.isfinite(centre).any() else float("nan")
                if not np.isfinite(seed_val):
                    continue
                # Bare/harvested at the tap → this scene has no usable edges; look at an older,
                # greener one (up to a limit, so a genuinely always-bare field still gets an
                # answer). Nothing large has been transferred at this point.
                if seed_val < VEG_MIN and skipped_bare < SKIP_BARE_LIMIT:
                    skipped_bare += 1
                    continue

                # --- keeper: now pay for the full window ---
                nir = src_nir.read(1, window=win, boundless=True,
                                   fill_value=0).astype("float32") * S2_SR_SCALE
                red = src_red.read(1, window=win, boundless=True,
                                   fill_value=0).astype("float32") * S2_SR_SCALE
        except Exception:  # noqa: BLE001 — try the next granule
            continue
        ndvi = _ndvi(nir, red)
        if not np.isfinite(ndvi).any():
            continue

        h, w = ndvi.shape
        # row/col were computed above, against this same window transform.
        if not (0 <= row < h and 0 <= col < w) or not np.isfinite(ndvi[row, col]):
            continue

        from scipy import ndimage

        px_area_m2 = abs(transform.a * transform.e)
        max_px = int((max_ha * 10000.0) / px_area_m2)

        # Edge map: a boundary (road, ditch, different crop/soil) shows as a gradient. NDVI alone
        # is flat on bare/uniform soil, so we ALSO take the red & NIR reflectance gradients — a
        # field edge there shows in brightness even when NDVI doesn't. Excluding edge pixels stops
        # the region bleeding into neighbours (spec C3 trap: "grabs the whole region").
        def _gm(a):
            gy_, gx_ = np.gradient(np.nan_to_num(a, nan=0.0))
            return np.hypot(gx_, gy_)

        edge = (_gm(ndvi) > EDGE_THRESH) | (_gm(nir) > REFL_EDGE) | (_gm(red) > REFL_EDGE)
        candidate = np.isfinite(ndvi) & (np.abs(ndvi - seed_val) < tol) & (~edge)

        # Connected component containing the tapped pixel (not just any similar pixel).
        lbl, _ = ndimage.label(candidate)
        if lbl[row, col] == 0:
            continue
        mask = lbl == lbl[row, col]
        # Clean the blob: fill interior holes, open away single-pixel spurs, close small gaps
        # → a smooth, simple boundary instead of the jagged/self-touching ring.
        mask = ndimage.binary_fill_holes(mask)
        mask = ndimage.binary_opening(mask, iterations=1)
        mask = ndimage.binary_closing(mask, iterations=2)
        lbl2, _ = ndimage.label(mask)          # opening may split — re-take the seed's blob
        if lbl2[row, col] == 0:
            continue
        mask = (lbl2 == lbl2[row, col])
        count = int(mask.sum())
        if count < 20:            # too small — likely a bad seed/cloud; try next granule
            continue
        if count > max_px:
            # Bled past the cap → the boundary is unclear here (uniform terrain, or the tap
            # sat on an edge). Don't hand back a wrong mega-blob — tell the UI to draw manually.
            return {"ok": False, "polygon": None,
                    "area_ha": round(count * px_area_m2 / 10000.0, 1), "reason": "boundary_unclear"}

        # Vectorise the cleaned blob; keep the polygon that contains the seed (or the largest).
        mask_u8 = mask.astype("uint8")
        polys = [shape(geom) for geom, val in
                 rasterio.features.shapes(mask_u8, mask=mask, transform=transform) if val == 1]
        if not polys:
            continue
        chosen = next((p for p in polys if p.contains(Point(sx, sy))), max(polys, key=lambda p: p.area))
        chosen = chosen.buffer(0)   # heal any self-touching ring before simplifying
        if chosen.geom_type == "MultiPolygon":
            chosen = max(chosen.geoms, key=lambda p: p.area)
        # Simplify to a handful of vertices + drop holes (spec C3.3: ~15 points, not 200).
        chosen = _simplify_to_target(chosen, abs(transform.a))
        if chosen.is_empty or chosen.area < px_area_m2 * 20:
            continue

        area_ha = round(chosen.area / 10000.0, 3)
        to_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
        poly_wgs = shp_transform(lambda x, y, z=None: to_wgs.transform(x, y), chosen)
        return {"ok": True, "polygon": mapping(poly_wgs), "area_ha": area_ha,
                "reason": "ok", "scene_date": str(getattr(g, "acquired_at", ""))}

    return {"ok": False, "polygon": None, "area_ha": None, "reason": "no_readable_scene"}
