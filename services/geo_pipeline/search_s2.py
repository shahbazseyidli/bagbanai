"""Sentinel-2 L2A scene search via Element84 Earth Search (STAC, public, no auth) — the 10m
companion to the HLS search (search.py). Returns the shared Granule dataclass tagged sensor='S2'
so persistence/pipeline stay shared. COGs live on public AWS S3 (no Earthdata token needed)."""
from __future__ import annotations

import sys
from datetime import date
from typing import Optional

from pystac_client import Client

from .search import GRANULE_CAP, Granule, SearchResult, resolve_window

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


def search_scenes_s2_ex(field_bbox: tuple[float, float, float, float],
                        date_from: Optional[date] = None, date_to: Optional[date] = None,
                        max_cloud: int = 70, *, days_back: Optional[int] = None,
                        limit: int = GRANULE_CAP) -> SearchResult:
    """Search Sentinel-2 L2A and report cap/truncation (see search.SearchResult).

    Truncation detection mirrors the HLS search: ask for `limit + 1` items, and if more than
    `limit` come back the window does not fit in one request → trim + flag. The STAC
    `numberMatched` (search.matched()) is recorded too when the server provides it."""
    d_from, d_to = resolve_window(date_from, date_to, days_back)
    per = max(1, int(limit))
    client = Client.open(EARTH_SEARCH_URL)
    search = client.search(
        collections=[S2_COLLECTION], bbox=list(field_bbox),
        datetime=f"{d_from.isoformat()}/{d_to.isoformat()}",
        query={"eo:cloud_cover": {"lte": max_cloud}}, max_items=per + 1)
    items = list(search.items())
    n = len(items)
    truncated = n > per
    if truncated:
        items = items[:per]
        print(f"  ! S2: search hit the {per}-item cap for {d_from.isoformat()}..{d_to.isoformat()}"
              f" — history is TRUNCATED, chunk the window (one year at a time)", file=sys.stderr)
    matched = None
    try:                                    # optional STAC numberMatched; not all servers send it
        matched = search.matched()
    except Exception:                       # noqa: BLE001 — diagnostics only, never fail a search
        matched = None
    out: list[Granule] = []
    skipped = 0
    for item in items:
        g = _item_to_granule(item)
        if g is None:
            skipped += 1
            print(f"  ! S2 skip (no mgrs tile): {getattr(item, 'id', '?')}", file=sys.stderr)
            continue
        out.append(g)
    out.sort(key=lambda g: g.acquired_at)
    return SearchResult(granules=out, found=n, returned=len(out), truncated=truncated,
                        date_from=d_from, date_to=d_to,
                        detail={"S2": {"found": n, "kept": len(out), "skipped_no_tile": skipped,
                                       "truncated": truncated, "matched": matched}})


def search_scenes_s2(field_bbox: tuple[float, float, float, float],
                     date_from: Optional[date] = None, date_to: Optional[date] = None,
                     max_cloud: int = 70, *, days_back: Optional[int] = None,
                     limit: int = GRANULE_CAP) -> list[Granule]:
    """Search Sentinel-2 L2A for the field bbox + date range (no auth). Granules whose MGRS
    tile can't be resolved are skipped (idempotency needs a non-null tile).

    Unchanged for existing callers; use search_scenes_s2_ex() to see truncation."""
    return search_scenes_s2_ex(field_bbox, date_from, date_to, max_cloud,
                               days_back=days_back, limit=limit).granules
