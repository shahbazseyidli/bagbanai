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
# S2 computes 9 indices from reflectance (vs reading ready HLS-VI COGs) → a bit slower/scene.
# Uncalibrated guess — refine on one timed real run.
AVG_SEC_PER_SCENE_S2 = 15


def _trigger_advice(field_id: str) -> None:
    """Best-effort: ask the API to regenerate AI advice after new scenes. The API
    (not the geo worker) holds the LLM client + key. Reaches it at api:8000 on the
    compose network. Silently skips if unreachable or the token is missing."""
    import json as _json
    import urllib.request

    token = (os.environ.get("INTERNAL_API_TOKEN") or "").strip()
    base = os.environ.get("API_INTERNAL_URL", "http://api:8000")
    url = f"{base}/api/internal/advice/run?field_id={field_id}"
    try:
        req = urllib.request.Request(url, method="POST",
                                     headers={"X-Internal-Token": token})
        with urllib.request.urlopen(req, timeout=120) as resp:
            print(f"  advice trigger: {_json.loads(resp.read() or b'{}')}")
    except Exception as exc:  # noqa: BLE001
        print(f"  advice trigger skipped: {exc}", file=sys.stderr)
    # Refresh the anomaly baseline (T6) then run the rule engine (T1/T2) so vegetation alerts from
    # the new scene get dispatched. Best-effort — never fail the pipeline over a notification.
    for hook in ("baseline/run", "rules/run"):
        try:
            req = urllib.request.Request(f"{base}/api/internal/{hook}?field_id={field_id}",
                                         method="POST", headers={"X-Internal-Token": token})
            with urllib.request.urlopen(req, timeout=90) as resp:
                print(f"  {hook} trigger: {_json.loads(resp.read() or b'{}')}")
        except Exception as exc:  # noqa: BLE001
            print(f"  {hook} trigger skipped: {exc}", file=sys.stderr)


def run_field(field_id: str, days_back: int = 120, max_cloud: int = 70,
              write_rasters: bool = True, track_status: bool = True,
              trigger_advice: bool = True) -> dict:
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
                            persist.persist_raster(scene_id, field_id, name, path, g.acquired_at, sensor=g.sensor)
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

        # New satellite data → regenerate AI advice (the API holds the LLM + key).
        if scenes_written > 0 and trigger_advice:
            _trigger_advice(field_id)
        return {"ok": True, "granules_found": total, "scenes_written": scenes_written}
    except Exception as exc:  # noqa: BLE001 — surface failure to the UI, then re-raise
        if track_status:
            try:
                persist.set_field_status(field_id, "failed", message=str(exc)[:300])
            except Exception:  # noqa: BLE001
                pass
        raise


# ── Sentinel-2 10m engine (computes indices from reflectance; SCL cloud mask) ──────────

def process_granule_s2(field_geojson: dict, granule: Granule) -> dict[str, tuple[dict, object]]:
    """Return {index_name: (stats, masked_da)} for one S2 granule. SCL is REQUIRED (S2's only
    per-pixel cloud mask) — if it can't be read we return {} so the granule is skipped rather
    than persisting unmasked (possibly cloudy) stats."""
    from .indices import (BANDS, S2_INDEX_NAMES, S2_SR_NODATA, S2_SR_OFFSET, S2_SR_SCALE,
                          compute_from_reflectance)
    from .read import (apply_scl_mask, prepare_gdal_for_public_cog, read_s2_band, read_scl)
    from .stats import zonal_stats

    prepare_gdal_for_public_cog()
    km = BANDS["S2"]
    bm = granule.band_meta or {}
    # The advertised raster:bands offset (Element84 says -0.1) is EMPIRICALLY WRONG for this data:
    # applying it drives NDVI>1 (the DN is already harmonized, DN=reflectance*10000, so offset=0
    # matches HLS). We log any non-zero advertised offset for diagnostics but NEVER apply it.
    adv_off = (bm.get(km["red"]) or {}).get("offset")
    if adv_off not in (None, 0, 0.0):
        print(f"  · S2 {granule.granule_id}: advertised offset {adv_off} NOT applied "
              f"(offset=0 empirically correct)", file=sys.stderr)

    def _so(_asset_key: str):
        return (S2_SR_SCALE, S2_SR_OFFSET)

    nir_href = granule.assets.get(km["nir"])
    if not nir_href:
        return {}
    sc, off = _so(km["nir"])
    ref = read_s2_band(nir_href, field_geojson, ref=None, scale=sc, offset=off, nodata=S2_SR_NODATA)
    bands = {"nir": ref}
    for canon in ("red", "green", "blue", "swir1", "swir2", "rededge"):
        href = granule.assets.get(km.get(canon, ""))
        if not href:
            continue
        sc, off = _so(km[canon])
        bands[canon] = read_s2_band(href, field_geojson, ref=ref, scale=sc, offset=off,
                                    nodata=S2_SR_NODATA)

    scl_href = granule.assets.get(km["scl"])
    if not scl_href:
        return {}
    try:
        scl = read_scl(scl_href, field_geojson)
    except Exception as exc:  # noqa: BLE001 — SCL mandatory for S2; skip the whole granule
        print(f"  ! S2 SCL unreadable {granule.granule_id}: {exc} — skipping granule", file=sys.stderr)
        return {}

    out: dict[str, tuple[dict, object]] = {}
    for name in S2_INDEX_NAMES:
        try:
            idx = apply_scl_mask(compute_from_reflectance(name, bands), scl)
            stats = zonal_stats(idx)
            out[name] = (stats, idx)
            if name == "NDVI":  # plausibility guard: catches a wrong scale/offset early
                m = stats.get("mean")
                if m is not None and not (-0.3 <= m <= 1.0):
                    print(f"  ! S2 NDVI implausible ({m:.3f}) {granule.granule_id} — "
                          f"check reflectance scale/offset", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001 — skip a bad index, keep the rest
            print(f"  ! S2 {granule.granule_id} {name}: {exc}", file=sys.stderr)
    return out


def run_field_s2(field_id: str, days_back: int = 120, max_cloud: int = 70,
                 write_rasters: bool = True, track_status: bool = True,
                 trigger_advice: bool = True) -> dict:
    """S2 engine — a line-for-line mirror of run_field but Element84 search + reflectance +
    SCL. Writes scenes/index_stats/index_rasters tagged sensor='S2'. Skips granules with no
    valid pixels over the field (e.g. a neighbouring tile that barely intersects the bbox)."""
    field = persist.get_field(field_id)
    if not field:
        return {"ok": False, "error": "field_not_found"}
    from .read import write_cog
    from .search_s2 import search_scenes_s2
    try:
        if track_status:
            persist.set_field_status(field_id, "processing")
        date_to = date.today()
        date_from = date_to - timedelta(days=days_back)
        granules = sorted(search_scenes_s2(field["bbox"], date_from, date_to, max_cloud=max_cloud),
                          key=lambda g: g.acquired_at, reverse=True)
        total = len(granules)
        if track_status:
            persist.set_field_status(field_id, "processing", total=total)
        rdir = persist.raster_dir()
        scenes_written = 0
        for i, g in enumerate(granules):
            try:
                stats_da = process_granule_s2(field["geom"], g)
            except Exception as exc:  # noqa: BLE001 — skip a bad granule (transient COG read /
                # a neighbouring tile whose extent misses the field), keep the rest; mirrors HLS.
                print(f"  ! S2 granule {g.granule_id}: {exc}", file=sys.stderr)
                stats_da = {}
            if stats_da and any((v[0] or {}).get("valid_pixels", 0) for v in stats_da.values()):
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
                            persist.persist_raster(scene_id, field_id, name, path,
                                                   g.acquired_at, sensor=g.sensor)
                        except Exception as exc:  # noqa: BLE001
                            print(f"  ! S2 raster {name} {g.granule_id}: {exc}", file=sys.stderr)
                scenes_written += 1
            if track_status:
                remaining = total - (i + 1)
                persist.update_field_progress(field_id, i + 1, remaining * AVG_SEC_PER_SCENE_S2)

        if track_status:
            persist.set_field_status(field_id, "ready")
        if scenes_written > 0 and trigger_advice:
            _trigger_advice(field_id)
        return {"ok": True, "granules_found": total, "scenes_written": scenes_written}
    except Exception as exc:  # noqa: BLE001
        if track_status:
            try:
                persist.set_field_status(field_id, "failed", message=str(exc)[:300])
            except Exception:  # noqa: BLE001
                pass
        raise


def run_field_all(field_id: str, days_back: int = 120, max_cloud: int = 70,
                  write_rasters: bool = True, track_status: bool = True) -> dict:
    """Run HLS then S2 for one field under a SINGLE status/notify/advice lifecycle. HLS is
    status-authoritative; an S2 failure is logged and swallowed so it NEVER fails the field
    (the queue only re-picks status='queued', so a failed banner would strand good HLS data)."""
    field = persist.get_field(field_id)
    if not field:
        return {"ok": False, "error": "field_not_found"}
    try:
        if track_status:
            persist.set_field_status(field_id, "processing")
        hls = run_field(field_id, days_back=days_back, max_cloud=max_cloud,
                        write_rasters=write_rasters, track_status=False, trigger_advice=False)
        # T0: as soon as HLS has usable scenes, reveal the field as 'partial' (map/İcmal show data
        # within minutes) and notify — then keep processing S2 without resetting to 'processing'.
        flipped_partial = False
        if track_status and (hls.get("scenes_written", 0) or 0) > 0:
            try:
                persist.set_field_status(field_id, "partial")
                persist.insert_partial_notification(
                    field_id, field["org_id"], field.get("name") or "Sahə")
                flipped_partial = True
            except Exception as exc:  # noqa: BLE001 — reveal is best-effort, never fail the field
                print(f"partial reveal skipped: {exc}", file=sys.stderr)
        s2: dict = {"ok": False, "scenes_written": 0}
        try:
            # S2 runs second and is the longer pass. If we already flipped to 'partial', keep that
            # status (track_status=False) so the S2 pass doesn't reset the field to 'processing'
            # and re-hide the HLS data. Otherwise (HLS found nothing) let S2 drive progress/ETA.
            # A raised error still can't strand the field: the outer set_field_status('ready') wins.
            s2 = run_field_s2(field_id, days_back=days_back, max_cloud=max_cloud,
                              write_rasters=write_rasters,
                              track_status=(track_status and not flipped_partial),
                              trigger_advice=False)
        except Exception as exc:  # noqa: BLE001 — S2 must never fail the field; HLS is authoritative
            print(f"  ! S2 pass failed (HLS kept): {exc}", file=sys.stderr)
        written = (hls.get("scenes_written", 0) or 0) + (s2.get("scenes_written", 0) or 0)
        if track_status:
            persist.set_field_status(field_id, "ready")
            try:
                persist.insert_ready_notification(
                    field_id, field["org_id"], field.get("name") or "Sahə")
            except Exception as exc:  # noqa: BLE001
                print(f"notification skipped: {exc}", file=sys.stderr)
        if written > 0:
            _trigger_advice(field_id)
        return {"ok": True, "hls": hls, "s2": s2}
    except Exception as exc:  # noqa: BLE001
        if track_status:
            try:
                persist.set_field_status(field_id, "failed", message=str(exc)[:300])
            except Exception:  # noqa: BLE001
                pass
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: python -m geo_pipeline.pipeline <field_id> [days_back] [track] [sensor]")
    fid = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    # track="0" for the silent daily refresh (no status reset / no ready notification);
    # default tracks status + ETA + notification (initial processing of a new field).
    track = sys.argv[3] != "0" if len(sys.argv) > 3 else True
    # sensor: 'hls' (default, backward-compatible) | 's2' | 'all' (HLS+S2, one lifecycle).
    sensor = sys.argv[4].lower() if len(sys.argv) > 4 else "hls"
    if sensor == "all":
        print(run_field_all(fid, days_back=days, track_status=track))
    elif sensor == "s2":
        print(run_field_s2(fid, days_back=days, track_status=track))
    else:
        print(run_field(fid, days_back=days, track_status=track))
