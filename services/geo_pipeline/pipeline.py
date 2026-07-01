"""Orchestrate the HLS-VI pipeline for one field (spec §10).

search → for each granule: read each VI band (windowed) → Fmask → zonal stats → persist.
Run:  DATABASE_URL=... python -m geo_pipeline.pipeline <field_id> [days_back]
Or import run_field() from the API's internal trigger / n8n."""
from __future__ import annotations

import sys
from datetime import date, timedelta

from . import persist
from .indices import INDEX_NAMES, VI_BAND_SUFFIX, VI_FILL, VI_SCALE
from .mgrs_util import tiles_for_geom
from .search import Granule, search_scenes


def _asset_for_index(granule: Granule, index_name: str):
    """Find the VI COG href for an index by matching the band suffix in the filename."""
    suffix = VI_BAND_SUFFIX[index_name]
    for fname, href in granule.assets.items():
        if fname.lower().endswith(f"{suffix.lower()}.tif") or f".{suffix}." in fname:
            return href
    return None


def process_granule(field_geojson: dict, granule: Granule) -> dict[str, dict]:
    """Return {index_name: stats} for a single granule (VI product, Fmask-masked)."""
    from .read import apply_fmask, read_fmask, read_window
    from .stats import zonal_stats

    fmask = None
    fmask_href = next((h for n, h in granule.assets.items() if "fmask" in n.lower()), None)
    if fmask_href:
        try:
            fmask = read_fmask(fmask_href, field_geojson)
        except Exception:  # noqa: BLE001 — proceed without masking if Fmask unreadable
            fmask = None

    out: dict[str, dict] = {}
    for name in INDEX_NAMES:
        href = _asset_for_index(granule, name)
        if not href:
            continue
        try:
            da = read_window(href, field_geojson, fill=VI_FILL, scale=VI_SCALE)
            if fmask is not None:
                da = apply_fmask(da, fmask)
            out[name] = zonal_stats(da)
        except Exception as exc:  # noqa: BLE001 — skip a bad band, keep the rest
            print(f"  ! {granule.granule_id} {name}: {exc}", file=sys.stderr)
    return out


def run_field(field_id: str, days_back: int = 120, max_cloud: int = 70) -> dict:
    field = persist.get_field(field_id)
    if not field:
        return {"ok": False, "error": "field_not_found"}

    # keep mgrs_tiles current
    try:
        persist.set_mgrs_tiles(field_id, tiles_for_geom(field["geom"]))
    except Exception as exc:  # noqa: BLE001
        print(f"mgrs update skipped: {exc}", file=sys.stderr)

    date_to = date.today()
    date_from = date_to - timedelta(days=days_back)
    granules = search_scenes(field["bbox"], date_from, date_to, max_cloud=max_cloud)

    scenes_written = 0
    for g in granules:
        stats = process_granule(field["geom"], g)
        if not stats:
            continue
        persist.persist_scene(field_id, field["org_id"], g.sensor, g.acquired_at,
                              g.mgrs_tile, g.cloud_pct, g.granule_id, stats)
        scenes_written += 1
    return {"ok": True, "granules_found": len(granules), "scenes_written": scenes_written}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: python -m geo_pipeline.pipeline <field_id> [days_back]")
    fid = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    print(run_field(fid, days_back=days))
