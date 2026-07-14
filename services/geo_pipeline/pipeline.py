"""Orchestrate the HLS-VI pipeline for one field (spec §10).

search → for each granule: read each VI band (windowed) → Fmask → zonal stats → persist.
Run:  DATABASE_URL=... python -m geo_pipeline.pipeline <field_id> [days_back]
Or import run_field() from the API's internal trigger / n8n."""
from __future__ import annotations

import os
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

    # keep the masked DataArray alongside the stats so callers can also write a COG.
    out: dict[str, tuple[dict, object]] = {}
    for name in INDEX_NAMES:
        href = _asset_for_index(granule, name)
        if not href:
            continue
        try:
            da = read_window(href, field_geojson, fill=VI_FILL, scale=VI_SCALE)
            if fmask is not None:
                da = apply_fmask(da, fmask)
            out[name] = (zonal_stats(da), da)
        except Exception as exc:  # noqa: BLE001 — skip a bad band, keep the rest
            print(f"  ! {granule.granule_id} {name}: {exc}", file=sys.stderr)
    return out


# Rough per-scene processing time (windowed COG reads over the network) → drives the
# ETA shown to the user while data is preparing.
AVG_SEC_PER_SCENE = 6


def run_field(field_id: str, days_back: int = 120, max_cloud: int = 70,
              write_rasters: bool = True, track_status: bool = True) -> dict:
    field = persist.get_field(field_id)
    if not field:
        return {"ok": False, "error": "field_not_found"}

    try:
        if track_status:
            persist.set_field_status(field_id, "processing")

        # keep mgrs_tiles current
        try:
            persist.set_mgrs_tiles(field_id, tiles_for_geom(field["geom"]))
        except Exception as exc:  # noqa: BLE001
            print(f"mgrs update skipped: {exc}", file=sys.stderr)

        date_to = date.today()
        date_from = date_to - timedelta(days=days_back)
        granules = search_scenes(field["bbox"], date_from, date_to, max_cloud=max_cloud)
        # Newest first → the latest satellite image reaches the map as soon as possible.
        granules = sorted(granules, key=lambda g: g.acquired_at, reverse=True)
        total = len(granules)
        if track_status:
            persist.set_field_status(field_id, "processing", total=total)

        from .read import write_cog
        rdir = persist.raster_dir()
        scenes_written = 0
        for i, g in enumerate(granules):
            stats_da = process_granule(field["geom"], g)
            if stats_da:
                stats = {k: v[0] for k, v in stats_da.items()}
                scene_id = persist.persist_scene(
                    field_id, field["org_id"], g.sensor, g.acquired_at,
                    g.mgrs_tile, g.cloud_pct, g.granule_id, stats)
                if write_rasters:
                    for name, (_s, da) in stats_da.items():
                        path = os.path.join(rdir, str(field_id), f"{scene_id}_{name}.tif")
                        try:
                            if not os.path.exists(path):
                                write_cog(da, path)
                            persist.persist_raster(scene_id, field_id, name, path, g.acquired_at)
                        except Exception as exc:  # noqa: BLE001
                            print(f"  ! raster {name} {g.granule_id}: {exc}", file=sys.stderr)
                scenes_written += 1
            if track_status:
                remaining = total - (i + 1)
                persist.update_field_progress(field_id, i + 1, remaining * AVG_SEC_PER_SCENE)

        if track_status:
            persist.set_field_status(field_id, "ready")
            try:
                persist.insert_ready_notification(
                    field_id, field["org_id"], field.get("name") or "Sahə")
            except Exception as exc:  # noqa: BLE001
                print(f"notification skipped: {exc}", file=sys.stderr)
        return {"ok": True, "granules_found": total, "scenes_written": scenes_written}
    except Exception as exc:  # noqa: BLE001 — surface failure to the UI, then re-raise
        if track_status:
            try:
                persist.set_field_status(field_id, "failed", message=str(exc)[:300])
            except Exception:  # noqa: BLE001
                pass
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: python -m geo_pipeline.pipeline <field_id> [days_back] [track]")
    fid = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    # track="0" for the silent daily refresh (no status reset / no ready notification);
    # default tracks status + ETA + notification (initial processing of a new field).
    track = sys.argv[3] != "0" if len(sys.argv) > 3 else True
    print(run_field(fid, days_back=days, track_status=track))
