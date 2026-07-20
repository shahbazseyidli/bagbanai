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
    # Sentinel-2 L2A — Element84 Earth Search asset KEYS (not band ids). nir='nir'=B08 (10m) is
    # the reference grid; 20m swir reproject onto it. scl = Scene Classification (cloud mask).
    "S2": {"blue": "blue", "green": "green", "red": "red", "nir": "nir", "swir1": "swir16", "swir2": "swir22",
           "rededge": "rededge1", "scl": "scl"},
}

# Sentinel-2 L2A reflectance scaling (Element84 sentinel-2-l2a): reflectance = DN*0.0001, NO
# additive BOA offset. Empirically confirmed by the PoC — subtracting 1000/0.1 drove NDVI>1, and
# offset=0 makes S2 NDVI match HLS. read_s2_band still reads the advertised raster:bands transform
# and a plausibility guard flags any future baseline/reprocessing that changes this assumption.
S2_SR_SCALE = 0.0001
S2_SR_OFFSET = 0.0
S2_SR_NODATA = 0

# Indices computed for S2. TVI is EXCLUDED (magnitude ~0-30 mis-renders under the veg rescale).
# NDRE/CIre are ADDED and S2-ONLY (E0): they use the red-edge band (705 nm) which Landsat/HLS
# lack, so they never appear for the HLS family. NDRE doesn't saturate in dense canopy (where
# NDVI does) and is azot-sensitive — it softens the false "Zəif" on mature orchards.
S2_INDEX_NAMES = [n for n in INDEX_NAMES if n != "TVI"] + ["NDRE", "CIre"]


def compute_from_reflectance(name: str, b: dict):
    """Compute an index from a dict of scaled reflectance DataArrays (blue/green/red/nir/swir1/swir2).
    Returns an xarray.DataArray. Kept import-free of xarray at module load (works on arrays too)."""
    red, nir = b["red"], b["nir"]
    green = b.get("green")
    blue = b.get("blue")
    swir1 = b.get("swir1")
    swir2 = b.get("swir2")
    rededge = b.get("rededge")
    if name == "NDRE":
        # Red-edge NDVI (S2 B8 vs B5 705 nm) — doesn't saturate in dense canopy; azot-sensitive.
        return (nir - rededge) / (nir + rededge)
    if name == "CIre":
        # Chlorophyll Index red-edge — same bands, more sensitive to N; ratio (~0-4, not -1..1).
        return nir / rededge - 1
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
