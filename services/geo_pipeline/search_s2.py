"""Sentinel-2 L2A scene search via Element84 Earth Search (STAC, public, no auth) — the 10m
companion to the HLS search (search.py). Returns the shared Granule dataclass tagged sensor='S2'
so persistence/pipeline stay shared. COGs live on public AWS S3 (no Earthdata token needed)."""
from __future__ import annotations

import sys
from datetime import date
from typing import Optional

from pystac_client import Client

from .search import Granule

EARTH_SEARCH_URL = "https://earth-search.aws.element84.com/v1"
S2_COLLECTION = "sentinel-2-l2a"
# Element84 v1 asset KEYS (not band ids). red/green/blue/nir are 10m; swir/nir08 are 20m.
S2_ASSET_KEYS = ["red", "green", "blue", "nir", "nir08", "swir16", "swir22", "scl", "rededge1"]


def _mgrs_from_item(item) -> Optional[str]:
    """Resolve the MGRS tile (e.g. '38SMF'). Non-null is a HARD invariant: the scenes
    unique(field_id,sensor,acquired_at,mgrs_tile) key treats NULL as distinct, so a null tile
    would make every daily re-run INSERT a duplicate scene. Return None → the caller skips it."""
    p = item.properties
    code = p.get("grid:code")                                   # e.g. 'MGRS-38SMF'
    if isinstance(code, str) and code.upper().startswith("MGRS-"):
        t = code.split("-", 1)[1].strip()
        if len(t) == 5:
            return t
    z, lb, gs = p.get("mgrs:utm_zone"), p.get("mgrs:latitude_band"), p.get("mgrs:grid_square")
    if z and lb and gs:
        try:
            return f"{int(z):02d}{lb}{gs}"
        except (TypeError, ValueError):
            pass
    for tok in str(getattr(item, "id", "")).split("_"):         # e.g. 'S2A_38SMF_20240628_0_L2A'
        if len(tok) == 5 and tok[:2].isdigit() and tok[2:].isalnum():
            return tok
    return None


def _item_to_granule(item) -> Optional[Granule]:
    tile = _mgrs_from_item(item)
    if not tile:
        return None                                             # cannot dedup without a tile
    acq = (item.properties.get("datetime") or "")[:10]
    acquired = date.fromisoformat(acq) if acq else date.today()
    cloud = item.properties.get("eo:cloud_cover")
    assets = {k: item.assets[k].href for k in S2_ASSET_KEYS if k in item.assets}
    band_meta: dict = {}                                        # advertised raster:bands scale/offset
    for k in ("red", "green", "blue", "nir", "swir16", "swir22"):
        a = item.assets.get(k)
        rb = (getattr(a, "extra_fields", {}).get("raster:bands") if a is not None else None) or []
        if isinstance(rb, list) and rb:
            band_meta[k] = {"scale": rb[0].get("scale"), "offset": rb[0].get("offset")}
    return Granule(sensor="S2", acquired_at=acquired,
                   granule_id=str(getattr(item, "id", "")), mgrs_tile=tile,
                   cloud_pct=float(cloud) if cloud is not None else None,
                   assets=assets, band_meta=band_meta)


def search_scenes_s2(field_bbox: tuple[float, float, float, float],
                     date_from: date, date_to: date, max_cloud: int = 70) -> list[Granule]:
    """Search Sentinel-2 L2A for the field bbox + date range (no auth). Granules whose MGRS
    tile can't be resolved are skipped (idempotency needs a non-null tile)."""
    client = Client.open(EARTH_SEARCH_URL)
    search = client.search(
        collections=[S2_COLLECTION], bbox=list(field_bbox),
        datetime=f"{date_from.isoformat()}/{date_to.isoformat()}",
        query={"eo:cloud_cover": {"lte": max_cloud}}, max_items=200)
    out: list[Granule] = []
    for item in search.items():
        g = _item_to_granule(item)
        if g is None:
            print(f"  ! S2 skip (no mgrs tile): {getattr(item, 'id', '?')}", file=sys.stderr)
            continue
        out.append(g)
    out.sort(key=lambda g: g.acquired_at)
    return out
