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


def read_window(asset_href: str, field_geojson: dict, fill: int, scale: float) -> xr.DataArray:
    """Open a COG, clip to the field window, apply fill→NaN and scale."""
    da = rioxarray.open_rasterio(asset_href, masked=False, chunks=None)
    if "band" in da.dims and da.sizes.get("band", 1) == 1:
        da = da.squeeze("band", drop=True)
    geom = _reproject_geom(field_geojson, da.rio.crs)
    clipped = da.rio.clip([geom.__geo_interface__], crs="EPSG:4326"
                          if False else da.rio.crs, drop=True, all_touched=True)
    arr = clipped.astype("float32")
    arr = arr.where(arr != fill)
    return arr * scale


def read_fmask(asset_href: str, field_geojson: dict) -> xr.DataArray:
    da = rioxarray.open_rasterio(asset_href, masked=False)
    if "band" in da.dims and da.sizes.get("band", 1) == 1:
        da = da.squeeze("band", drop=True)
    geom = _reproject_geom(field_geojson, da.rio.crs)
    return da.rio.clip([geom.__geo_interface__], crs=da.rio.crs, drop=True, all_touched=True)


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
