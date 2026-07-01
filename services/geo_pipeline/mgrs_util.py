"""MGRS tile helpers — which Sentinel-2 100 km tiles intersect a field (spec §10)."""
from __future__ import annotations

import mgrs
from shapely.geometry import shape

_m = mgrs.MGRS()


def tiles_for_geom(field_geojson: dict) -> list[str]:
    """Approximate the set of MGRS 100 km grid squares covering the field by sampling
    its exterior vertices + centroid. Good enough for small fields; the search step
    also filters by bbox intersection."""
    geom = shape(field_geojson)
    pts = list(geom.exterior.coords) if geom.geom_type == "Polygon" else []
    c = geom.centroid
    pts.append((c.x, c.y))
    tiles = set()
    for lon, lat in pts:
        # 100 km precision -> first 5 chars of the MGRS string (e.g. 38SMF)
        code = _m.toMGRS(lat, lon, MGRSPrecision=0)
        tiles.add(code[:5])
    return sorted(tiles)
