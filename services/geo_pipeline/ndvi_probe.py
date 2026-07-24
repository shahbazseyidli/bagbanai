"""Anonymous NDVI probe for an arbitrary polygon (HYBRID_PLAN A11).

Gives a visitor a REAL satellite reading for the field they just drew on the landing page,
before they create an account — the "value before signup" moment. Runs in the geo image
(rasterio/shapely), reached only from the API container via the geoapi microservice.

Deliberately cheap and bounded: one windowed read of the freshest low-cloud Sentinel-2 scene,
area-capped, no DB writes, never raises for expected failures (returns ok=False + reason).
Nothing here is persisted — an anonymous visitor leaves no trace."""
from __future__ import annotations

from typing import Optional

# Bound the work: a hand-drawn landing polygon is small. Bigger asks are refused rather than
# silently downsampled, so the endpoint can never become an expensive open compute service.
#
# AREA ALONE IS NOT A BOUND. A thin sliver triangle can measure a few hectares while spanning
# degrees of longitude, and the read window is built from the polygon's BOUNDING BOX — so an
# unauthenticated caller could force a multi-gigabyte boundless read and OOM-kill this container
# (which also serves tap-to-detect for every logged-in user). Cap the extent and the pixel budget
# too; all three checks are cheap and happen before any raster is touched.
MAX_AREA_HA = 200.0
MAX_SPAN_DEG = 0.2          # ~22 km — far beyond any hand-drawn field
MAX_WINDOW_PX = 4_000_000   # ~2000x2000 at 10 m; a 200 ha field is orders of magnitude smaller
SEARCH_DAYS = 45
MAX_CLOUD = 40


def _area_ha(geom) -> float:
    """Approximate polygon area in hectares (equal-area projection around its centroid)."""
    from pyproj import Transformer
    from shapely.ops import transform as shp_transform

    c = geom.centroid
    tr = Transformer.from_crs(
        "EPSG:4326",
        f"+proj=aea +lat_1={c.y - 1} +lat_2={c.y + 1} +lat_0={c.y} +lon_0={c.x} +datum=WGS84 +units=m",
        always_xy=True)
    return shp_transform(tr.transform, geom).area / 10_000.0


def probe_ndvi(polygon: dict, *, max_area_ha: float = MAX_AREA_HA) -> dict:
    """Mean NDVI inside `polygon` (GeoJSON geometry) from the freshest usable S2 scene.

    Returns {ok, ndvi, ndvi_min, ndvi_max, acquired_at, cloud_pct, area_ha, pixels, reason}.
    Never raises for expected failures."""
    from datetime import date, timedelta

    import numpy as np
    import rasterio
    from rasterio.features import geometry_mask
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds
    from shapely.geometry import shape
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer

    from .indices import BANDS, S2_SR_SCALE
    from .read import prepare_gdal_for_public_cog
    from .search_s2 import search_scenes_s2

    try:
        geom = shape(polygon)
    except Exception as exc:  # noqa: BLE001 — malformed geometry from an anonymous caller
        return {"ok": False, "reason": f"bad_geometry:{exc}"}
    if geom.is_empty or not geom.is_valid:
        geom = geom.buffer(0)
    if geom.is_empty:
        return {"ok": False, "reason": "empty_geometry"}

    area_ha = _area_ha(geom)
    if area_ha > max_area_ha:
        return {"ok": False, "reason": "area_too_large", "area_ha": round(area_ha, 2)}

    minx, miny, maxx, maxy = geom.bounds
    # Extent guard — a sliver polygon passes the area cap but its bbox drives the read window.
    if (maxx - minx) > MAX_SPAN_DEG or (maxy - miny) > MAX_SPAN_DEG:
        return {"ok": False, "reason": "extent_too_large", "area_ha": round(area_ha, 2)}

    prepare_gdal_for_public_cog()
    pad = 0.002  # ~200 m, so the search bbox never degenerates for a tiny polygon
    today = date.today()
    try:
        granules = search_scenes_s2(
            (minx - pad, miny - pad, maxx + pad, maxy + pad),
            today - timedelta(days=SEARCH_DAYS), today, max_cloud=MAX_CLOUD)
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": f"search_failed:{exc}", "area_ha": round(area_ha, 2)}
    if not granules:
        return {"ok": False, "reason": "no_recent_scene", "area_ha": round(area_ha, 2)}

    granules.sort(key=lambda g: getattr(g, "acquired_at", today), reverse=True)
    km = BANDS["S2"]

    for g in granules[:4]:  # a few fallbacks, then give up — this must stay fast
        red_h, nir_h = g.assets.get(km["red"]), g.assets.get(km["nir"])
        if not red_h or not nir_h:
            continue
        try:
            with rasterio.open(red_h) as src:
                # Polygon bounds → raster CRS → pixel window, so only the field loads.
                l, b, r, t = transform_bounds("EPSG:4326", src.crs, minx, miny, maxx, maxy,
                                              densify_pts=21)
                win = from_bounds(l, b, r, t, transform=src.transform)
                # Final backstop: from_bounds does not validate against the dataset and
                # boundless=True happily allocates an arbitrarily large array. Refuse instead.
                if (win.width or 0) * (win.height or 0) > MAX_WINDOW_PX:
                    return {"ok": False, "reason": "extent_too_large",
                            "area_ha": round(area_ha, 2)}
                red = src.read(1, window=win, boundless=True, fill_value=0).astype("float32")
                win_tf = src.window_transform(win)
                crs = src.crs
            with rasterio.open(nir_h) as src2:
                nir = src2.read(1, window=win, boundless=True, fill_value=0).astype("float32")
            if red.size == 0 or red.shape != nir.shape:
                continue

            # Per-pixel cloud mask. Scenes up to MAX_CLOUD% are accepted, so without this a cloud
            # sitting over the drawn polygon would produce a confidently wrong verdict on a public
            # page. Same SCL classes the main pipeline drops (read.SCL_MASK_VALUES).
            cloud = None
            scl_h = g.assets.get(km.get("scl", "scl"))
            if scl_h:
                try:
                    from .read import SCL_MASK_VALUES
                    with rasterio.open(scl_h) as ssrc:
                        # SCL is 20 m; read it over the same geographic window and let rasterio
                        # resample to the 10 m grid so the masks line up pixel-for-pixel.
                        sl, sb, sr_, st = transform_bounds("EPSG:4326", ssrc.crs, minx, miny,
                                                           maxx, maxy, densify_pts=21)
                        swin = from_bounds(sl, sb, sr_, st, transform=ssrc.transform)
                        scl = ssrc.read(1, window=swin, boundless=True, fill_value=0,
                                        out_shape=red.shape)
                    cloud = np.isin(scl, list(SCL_MASK_VALUES))
                except Exception:  # noqa: BLE001 — no SCL is not fatal, just less accurate
                    cloud = None

            red *= S2_SR_SCALE
            nir *= S2_SR_SCALE
            denom = nir + red
            with np.errstate(divide="ignore", invalid="ignore"):
                ndvi = np.where(denom > 0, (nir - red) / denom, np.nan)

            # Keep only pixels actually inside the drawn polygon.
            tr = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
            geom_p = shp_transform(tr.transform, geom)
            # invert=True → True for pixels INSIDE the geometry (the default marks them False,
            # because the helper is built for numpy masked arrays where True means "masked out").
            inside = geometry_mask([geom_p], out_shape=ndvi.shape, transform=win_tf, invert=True)
            usable = inside & np.isfinite(ndvi)
            if cloud is not None and cloud.shape == ndvi.shape:
                usable &= ~cloud
            vals = ndvi[usable]
            vals = vals[(vals > -1.0) & (vals < 1.0)]
            if vals.size < 3:
                continue

            acquired = getattr(g, "acquired_at", None)
            return {
                "ok": True,
                "ndvi": round(float(np.nanmean(vals)), 3),
                "ndvi_min": round(float(np.nanmin(vals)), 3),
                "ndvi_max": round(float(np.nanmax(vals)), 3),
                "pixels": int(vals.size),
                "area_ha": round(area_ha, 2),
                "acquired_at": acquired.isoformat() if hasattr(acquired, "isoformat") else None,
                "cloud_pct": getattr(g, "cloud_pct", None),
                "sensor": "S2",
            }
        except Exception:  # noqa: BLE001 — unreadable granule, try the next one
            continue

    return {"ok": False, "reason": "no_readable_scene", "area_ha": round(area_ha, 2)}
