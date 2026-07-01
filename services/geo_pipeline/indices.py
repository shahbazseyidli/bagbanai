"""Vegetation index definitions (spec §10.3).

Preferred path: read ready-made HLS-VI COGs (HLSL30_VI.002 / HLSS30_VI.002), one band
per index — no recomputation. Raw-reflectance fallback formulas are provided for when a
VI band is missing (compute from surface reflectance bands).

Traps (spec §10.3): Red = B04 on both; NIR = B08 (S30) but B05 (L30).
HLS-VI fill = -19999, scale 0.0001. Raw reflectance scale 0.0001, fill -9999."""
from __future__ import annotations

INDEX_NAMES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI"]

VI_FILL = -19999
VI_SCALE = 0.0001
SR_FILL = -9999
SR_SCALE = 0.0001

# Reflectance band names by sensor (HLS S30 = Sentinel-2, L30 = Landsat 8/9).
BANDS = {
    "S30": {"blue": "B02", "green": "B03", "red": "B04", "nir": "B08", "swir1": "B11", "swir2": "B12", "fmask": "Fmask"},
    "L30": {"blue": "B02", "green": "B03", "red": "B04", "nir": "B05", "swir1": "B06", "swir2": "B07", "fmask": "Fmask"},
}


def compute_from_reflectance(name: str, b: dict):
    """Compute an index from a dict of scaled reflectance DataArrays (blue/green/red/nir/swir1/swir2).
    Returns an xarray.DataArray. Kept import-free of xarray at module load (works on arrays too)."""
    red, nir = b["red"], b["nir"]
    green = b.get("green")
    blue = b.get("blue")
    swir1 = b.get("swir1")
    swir2 = b.get("swir2")
    if name == "NDVI":
        return (nir - red) / (nir + red)
    if name == "EVI":
        return 2.5 * (nir - red) / (nir + 6.0 * red - 7.5 * blue + 1.0)
    if name == "SAVI":
        L = 0.5
        return (1 + L) * (nir - red) / (nir + red + L)
    if name == "MSAVI":
        return (2 * nir + 1 - ((2 * nir + 1) ** 2 - 8 * (nir - red)) ** 0.5) / 2
    if name == "NDMI":
        return (nir - swir1) / (nir + swir1)
    if name == "NDWI":
        return (green - nir) / (green + nir)
    if name == "NBR":
        return (nir - swir2) / (nir + swir2)
    if name == "NBR2":
        return (swir1 - swir2) / (swir1 + swir2)
    if name == "TVI":
        # Triangular Vegetation Index (uses green/red/nir)
        return 0.5 * (120 * (nir - green) - 200 * (red - green))
    raise ValueError(f"unknown index {name}")


# HLS-VI product band suffix per index (used to pick the right COG asset).
VI_BAND_SUFFIX = {
    "NDVI": "NDVI", "EVI": "EVI", "SAVI": "SAVI", "MSAVI": "MSAVI",
    "NDMI": "NDMI", "NDWI": "NDWI", "NBR": "NBR", "NBR2": "NBR2", "TVI": "TVI",
}
