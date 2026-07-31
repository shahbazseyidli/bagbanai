"""Windowed COG read + Fmask cloud/shadow masking (spec §10.1/§10.2).

Only the field-geometry window is read (Hetzner is outside us-west-2 → minimise egress).
GDAL env for HTTPS COGs is set via .env (GDAL_DISABLE_READDIR_ON_OPEN, CPL_VSIL_CURL_*)."""
from __future__ import annotations

import numpy as np
import rioxarray  # noqa: F401  (registers .rio accessor)
import xarray as xr
from shapely.geometry import shape
from shapely.ops import transform as shp_transform


def _reproject_geom(field_geojson: dict, dst_crs):
    """Reproject a WGS84 GeoJSON geometry to the raster CRS for clipping."""
    from pyproj import Transformer  # imported lazily (part of rasterio/pyproj stack)
    geom = shape(field_geojson)
    transformer = Transformer.from_crs("EPSG:4326", dst_crs, always_xy=True)
    return shp_transform(lambda x, y, z=None: transformer.transform(x, y), geom)


def open_clipped(asset_href: str, field_geojson: dict) -> xr.DataArray:
    """Read ONLY the field's window out of a (usually remote) COG, then mask it to the polygon.

    THIS FUNCTION IS THE WHOLE REASON THE NIGHTLY REFRESH SURVIVES. The obvious spelling —
    `rioxarray.open_rasterio(href).rio.clip(geom)` — materialises the ENTIRE raster before it
    masks anything. A Sentinel-2 10 m band is 10980x10980, i.e. 482 MB as float32, and
    process_granule_s2 holds seven of them plus SCL at once. That peaked near 3.4 GB, and on a
    3.8 GB box the kernel OOM-killed the run for EVERY field, every night, while run-s2.sh
    swallowed the failure and still printed "S2 run complete."

    Measured on the live box, one 1.36 ha field, same granule (2026-07-31):

        windowed read (this function)        170 MB peak    2.0 s
        clip(from_disk=True), GDAL cache 64 MB      1424 MB peak   16.8 s
        clip() as it was                     OOM-killed     >6 min

    `from_disk=True` is NOT sufficient — it was tried and measured. Only a real window read is.
    HLS survived on the same code path purely because 30 m bands are ~9x smaller (53 MB), which
    is why the symptom looked S2-specific rather than like the shared bug it is.

    segment.py has always read this way; this brings the pipeline in line with it. The polygon
    clip still happens — on an array that is now a few kilobytes, so it costs nothing — because
    a bounding-box window would leave out-of-polygon corner pixels in the zonal statistics.
    """
    import math

    import rasterio
    from rasterio.warp import transform_bounds
    from rasterio.windows import Window, from_bounds

    with rasterio.open(asset_href) as src:
        left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, *shape(field_geojson).bounds)
        win = from_bounds(left, bottom, right, top, src.transform)
        # Whole pixels, plus a one-pixel margin on every side so that rounding never clips an
        # all_touched edge pixel that the polygon does in fact touch. boundless=True lets the
        # window hang off the raster (a field on a tile edge) and fills those cells with nodata.
        win = Window(math.floor(win.col_off) - 1, math.floor(win.row_off) - 1,
                     math.ceil(win.width) + 2, math.ceil(win.height) + 2)
        fill = src.nodata if src.nodata is not None else 0
        arr = src.read(1, window=win, boundless=True, fill_value=fill)
        transform, crs = src.window_transform(win), src.crs

    # Pixel-CENTRE coordinates — what rioxarray expects; the affine gives the corner.
    h, w = arr.shape
    xs = transform.c + transform.a * (np.arange(w) + 0.5)
    ys = transform.f + transform.e * (np.arange(h) + 0.5)
    da = xr.DataArray(arr, dims=("y", "x"), coords={"y": ys, "x": xs})
    da.rio.write_crs(crs, inplace=True)
    da.rio.write_transform(transform, inplace=True)
    geom = _reproject_geom(field_geojson, crs)
    return da.rio.clip([geom.__geo_interface__], crs=crs, drop=True, all_touched=True)


def read_window(asset_href: str, field_geojson: dict, fill: int, scale: float) -> xr.DataArray:
    """Open a COG, clip to the field window, apply fill→NaN and scale."""
    clipped = open_clipped(asset_href, field_geojson)
    arr = clipped.astype("float32")
    arr = arr.where(arr != fill)
    return arr * scale


def write_cog(da: xr.DataArray, path: str) -> None:
    """Write a clipped/masked index DataArray to a Cloud-Optimized GeoTIFF (float32,
    NaN nodata) for TiTiler to serve/colorize. Falls back to plain GTiff if the COG
    driver is unavailable."""
    import os

    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = da.astype("float32")
    try:
        out = out.rio.write_nodata(float("nan"), inplace=False)
    except Exception:  # noqa: BLE001
        pass
    try:
        out.rio.to_raster(path, driver="COG", compress="DEFLATE")
    except Exception:  # noqa: BLE001 — older GDAL without COG driver
        out.rio.to_raster(path, driver="GTiff", compress="DEFLATE", tiled=True)


def read_fmask(asset_href: str, field_geojson: dict) -> xr.DataArray:
    return open_clipped(asset_href, field_geojson)


def apply_fmask(index_da: xr.DataArray, fmask_da: xr.DataArray) -> xr.DataArray:
    """Drop cloud/shadow/cirrus pixels using the HLS Fmask bit flags (spec §10.2):
    bit0=cirrus, bit1=cloud, bit3=cloud shadow."""
    fm = fmask_da.astype("int32")
    cirrus = (fm & 0b1) > 0
    cloud = (fm & 0b10) > 0
    shadow = (fm & 0b1000) > 0
    bad = cirrus | cloud | shadow
    # align grids if needed
    if index_da.shape != bad.shape:
        bad = bad.rio.reproject_match(index_da) > 0
    return index_da.where(~bad)


# ── Sentinel-2 L2A (public AWS COGs via Element84) ────────────────────────────────
# S2 has no ready-made VI product, so indices are computed from reflectance bands. These
# helpers mirror the HLS window read but (a) unset the Earthdata bearer that search.login()
# sets process-wide (S3 rejects it), (b) apply a scale+offset transform, (c) regrid 20m
# bands onto the 10m nir grid, and (d) mask clouds with the SCL band instead of Fmask.

# SCL classes to drop: 0 nodata, 1 saturated, 3 cloud-shadow, 8/9 cloud, 10 cirrus, 11 snow.
# Kept: 2 dark, 4 vegetation, 5 bare, 6 water, 7 unclassified.
SCL_MASK_VALUES = frozenset({0, 1, 3, 8, 9, 10, 11})


def prepare_gdal_for_public_cog() -> None:
    """CRITICAL: drop the HLS Earthdata bearer header before reading public S2 S3 COGs
    (the bucket 401/403s if an Authorization header is present)."""
    import os

    os.environ.pop("GDAL_HTTP_HEADERS", None)
    os.environ["GDAL_DISABLE_READDIR_ON_OPEN"] = "EMPTY_DIR"
    os.environ["CPL_VSIL_CURL_ALLOWED_EXTENSIONS"] = ".tif"
    os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")


def read_s2_band(asset_href: str, field_geojson: dict, ref: "xr.DataArray | None" = None,
                 scale: float = 0.0001, offset: float = 0.0, nodata: int = 0,
                 resampling=None) -> xr.DataArray:
    """Read one S2 reflectance band clipped to the field. `ref` (the 10m nir grid) aligns
    coarser (20m) bands via reproject_match. reflectance = DN*scale + offset; nodata and any
    physically-impossible negative reflectance (a wrong offset guard) become NaN."""
    from rasterio.enums import Resampling

    if resampling is None:
        resampling = Resampling.bilinear
    da = open_clipped(asset_href, field_geojson)
    da = da.astype("float32").where(da != nodata)          # DN nodata → NaN before regrid
    da = da.rio.write_nodata(float("nan"))
    if ref is not None and da.shape != ref.shape:
        da = da.rio.reproject_match(ref, resampling=resampling)
    refl = da * scale + offset
    return refl.where(refl >= 0)


def read_scl(asset_href: str, field_geojson: dict) -> xr.DataArray:
    """Read the Scene Classification (SCL) band clipped to the field (integer classes, no scale)."""
    return open_clipped(asset_href, field_geojson)


def apply_scl_mask(index_da: xr.DataArray, scl_da: xr.DataArray) -> xr.DataArray:
    """Drop cloud/shadow/snow/nodata pixels using the SCL classes (20m SCL regridded to the
    index grid with nearest — a class band must not be interpolated)."""
    from rasterio.enums import Resampling

    scl = scl_da
    if scl.shape != index_da.shape:
        scl = scl.rio.reproject_match(index_da, resampling=Resampling.nearest)
    bad = None
    for v in SCL_MASK_VALUES:
        b = scl == v
        bad = b if bad is None else (bad | b)
    return index_da.where(~bad)
