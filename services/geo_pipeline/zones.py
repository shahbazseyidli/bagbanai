"""Multi-season productivity zones (HYBRID_PLAN W8 / A6) — GEO IMAGE ONLY.

Everything in this module needs numpy/rasterio/rioxarray/shapely/scipy, which live ONLY in the
geo image (services/Dockerfile.geo + requirements-geo.txt). The API image cannot import it — the
API only enqueues a public.field_zone_runs row and later READS the results out of Postgres.

Pipeline (one run row = one field × index × sensor × n_zones):

  1. Scene stack — pick the clipped per-scene index COGs already written by the HLS/S2 pipeline
     (public.index_rasters.storage_path) inside the peak-season month window, one scene per
     acquisition date (least-cloudy), optionally limited to a season year range.
  2. Read each COG windowed/clipped to the field with the EXISTING reader (read.read_window) —
     no new GDAL/vsicurl path is introduced here. The stored COGs are local files under
     /data/rasters that are ALREADY clipped + cloud-masked to the field, float32 with NaN nodata.
  3. Regrid every scene onto one reference grid (the finest-resolution / largest scene) and stack.
  4. Reduce per pixel across the stack ROBUSTLY: each scene is first divided by its own spatial
     median (so a bright/dark/hazy scene or a different phenological stage cannot dominate), then
     the per-pixel MEDIAN of those relative values is taken. Pixels with fewer than
     MIN_OBS valid observations become nodata.
  5. Classify into n_zones by percentile breaks of the relative value; zone 1 = LOWEST
     productivity … zone n = HIGHEST. (The UI legend and the A7 VRA dose maths both depend on
     this ordering — do not flip it.)
  6. Vectorize each zone (rasterio.features.shapes), simplify, merge to one MultiPolygon per zone
     and REPROJECT from the raster CRS (UTM for HLS/S2) to EPSG:4326 before writing PostGIS.
  7. Write field_zones + finalise field_zone_runs (ready | failed + message).

Run:
    DATABASE_URL=... python -m geo_pipeline.zones <run_id>
    DATABASE_URL=... python -m geo_pipeline.zones drain [limit]     # claim queued rows

Talks to Postgres with sync psycopg (same style as persist.py) — the geo image has no access to
the API's asyncpg pool.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Optional

import psycopg

# ── tunables (documented; all deliberately conservative) ────────────────────────────────
MIN_SCENES = 5            # fewer usable scenes than this → 'not_enough_scenes' (needs an A8 backfill)
MAX_SCENES = 90           # cap the stack (memory + runtime); evenly subsampled when exceeded
MIN_OBS_ABS = 3           # a pixel needs at least this many valid observations …
MIN_OBS_FRACTION = 0.4    # … and at least this fraction of the stack, whichever is larger
DEFAULT_MAX_CLOUD = 60.0  # scene-level cloud cover ceiling when the run row leaves it null
MIN_ZONE_PIXELS = 5       # a zone with fewer pixels than this is dropped (noise, not a zone)
NODATA_SENTINEL = -9999.0 # read_window() masks this value; the stored COGs use NaN, so it is a no-op

# Homogeneity classes — CV = std/mean of the per-pixel multi-season value over the field.
# Thresholds chosen for row/orchard crops on 10–30 m pixels: below 10 % the within-field spread is
# on the order of sensor + atmospheric noise (zoning buys nothing); 10–20 % is a real but moderate
# gradient; above 20 % the field genuinely has strong/weak parts worth managing separately.
CV_UNIFORM = 0.10
CV_MODERATE = 0.20

# Sensor code families accepted in field_zone_runs.sensor.
SENSOR_CODES = {"S2": ["S2"], "S30": ["S30"], "L30": ["L30"], "HLS": ["S30", "L30"]}


# ── DB helpers (sync psycopg, mirrors persist.py) ───────────────────────────────────────
def _dsn() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("set DATABASE_URL")
    return dsn


def load_run(run_id: str) -> Optional[dict]:
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            """select r.id, r.field_id, r.org_id, r.index_name, r.sensor, r.n_zones,
                      r.season_from, r.season_to, r.month_from, r.month_to, r.max_cloud_pct,
                      r.status, st_asgeojson(f.geom) as geom, f.name
               from public.field_zone_runs r
               join public.fields f on f.id = r.field_id
               where r.id = %s""", (run_id,))
        r = cur.fetchone()
    if not r:
        return None
    return {
        "id": str(r[0]), "field_id": str(r[1]), "org_id": str(r[2]),
        "index_name": r[3], "sensor": r[4], "n_zones": int(r[5]),
        "season_from": r[6], "season_to": r[7],
        "month_from": int(r[8]), "month_to": int(r[9]),
        "max_cloud_pct": float(r[10]) if r[10] is not None else DEFAULT_MAX_CLOUD,
        "status": r[11], "geom": json.loads(r[12]) if r[12] else None, "field_name": r[13],
    }


def set_run(run_id: str, status: str, **cols) -> None:
    """Update the run row. Only whitelisted columns may be written (no SQL injection surface)."""
    allowed = ("n_scenes", "pixel_size_m", "valid_pixels", "field_mean",
               "homogeneity_cv", "homogeneity_class", "message")
    sets = ["status=%s", "computed_at=now()"]
    args: list = [status]
    for k in allowed:
        if k in cols:
            sets.append(f"{k}=%s")
            args.append(cols[k])
    args.append(run_id)
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(f"update public.field_zone_runs set {', '.join(sets)} where id=%s", args)
        conn.commit()


def claim_queued(limit: int = 1) -> list[str]:
    """Atomically flip up to `limit` queued runs to 'running' and return their ids."""
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            """update public.field_zone_runs set status='running'
               where id in (select id from public.field_zone_runs
                            where status='queued' order by computed_at limit %s
                            for update skip locked)
               returning id""", (limit,))
        ids = [str(r[0]) for r in cur.fetchall()]
        conn.commit()
    return ids


def scene_stack(run: dict) -> list[dict]:
    """One clipped index COG per acquisition date (least-cloudy), oldest first."""
    codes = SENSOR_CODES.get((run["sensor"] or "S2").upper(), [run["sensor"]])
    where = ["r.field_id = %s", "r.index_name = %s", "r.sensor = any(%s)",
             "extract(month from r.acquired_at) between %s and %s",
             "coalesce(s.cloud_pct, 100) <= %s"]
    args: list = [run["field_id"], run["index_name"], codes,
                  run["month_from"], run["month_to"], run["max_cloud_pct"]]
    if run.get("season_from"):
        where.append("extract(year from r.acquired_at) >= %s")
        args.append(run["season_from"])
    if run.get("season_to"):
        where.append("extract(year from r.acquired_at) <= %s")
        args.append(run["season_to"])
    sql = f"""select storage_path, acquired_at, sensor from (
                select distinct on (r.acquired_at)
                       r.storage_path, r.acquired_at, r.sensor, s.cloud_pct
                from public.index_rasters r
                join public.scenes s on s.id = r.scene_id
                where {' and '.join(where)}
                order by r.acquired_at, s.cloud_pct asc nulls last
              ) t order by t.acquired_at"""
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(sql, args)
        rows = cur.fetchall()
    return [{"path": r[0], "acquired_at": r[1], "sensor": r[2]} for r in rows]


def persist_zones(run: dict, zones: list[dict]) -> None:
    """Replace the run's zones (idempotent re-run) and insert the new ones."""
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute("delete from public.field_zones where run_id=%s", (run["id"],))
        for z in zones:
            cur.execute(
                """insert into public.field_zones
                     (run_id, field_id, org_id, zone_no, geom, area_ha, pixel_count,
                      mean_value, min_value, max_value, std_value, p10, p50, p90, rel_to_field)
                   values (%s,%s,%s,%s,
                           st_multi(st_collectionextract(
                             st_makevalid(st_setsrid(st_geomfromgeojson(%s),4326)), 3)),
                           %s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (run["id"], run["field_id"], run["org_id"], z["zone_no"], json.dumps(z["geom"]),
                 z["area_ha"], z["pixel_count"], z["mean_value"], z["min_value"], z["max_value"],
                 z["std_value"], z["p10"], z["p50"], z["p90"], z["rel_to_field"]))
        conn.commit()


# ── raster maths ────────────────────────────────────────────────────────────────────────
def _open_clipped(path: str, field_geojson: dict):
    """Open one stored index COG clipped/masked to the field, REUSING the pipeline's reader.

    The stored rasters are already field-clipped float32 with NaN nodata, so fill/scale are
    no-ops here; clipping again is harmless and guarantees no stray pixel outside the field.
    Falls back to a plain open when the clip raises (e.g. rioxarray NoDataInBounds on a raster
    whose extent barely differs from the field)."""
    from .read import read_window
    try:
        return read_window(path, field_geojson, fill=NODATA_SENTINEL, scale=1.0)
    except Exception as exc:  # noqa: BLE001
        print(f"  · clip fallback for {os.path.basename(path)}: {exc}", file=sys.stderr)
        import rioxarray  # noqa: F401  (registers .rio)
        da = rioxarray.open_rasterio(path, masked=True, chunks=None)
        if "band" in da.dims and da.sizes.get("band", 1) == 1:
            da = da.squeeze("band", drop=True)
        return da.astype("float32")


def _pick_reference(paths: list[str]) -> Optional[str]:
    """Reference grid = finest pixel size, then largest raster (metadata-only reads)."""
    import rasterio
    best_key = None
    best_path = None
    for p in paths:
        try:
            with rasterio.open(p) as src:
                key = (abs(src.transform.a), -(src.width * src.height))
        except Exception:  # noqa: BLE001 — unreadable file, skip
            continue
        if best_key is None or key < best_key:
            best_key, best_path = key, p
    return best_path


def _subsample(items: list, cap: int) -> list:
    """Evenly spread `cap` items across the list (keeps multi-season coverage, not just recent)."""
    if len(items) <= cap:
        return items
    step = len(items) / float(cap)
    return [items[int(i * step)] for i in range(cap)]


def _smooth_labels(labels, valid):
    """3×3 median filter over the zone labels to kill salt-and-pepper before vectorising.
    Invalid pixels stay 0; a filtered 0 inside the field falls back to the original label."""
    import numpy as np
    from scipy import ndimage
    sm = ndimage.median_filter(labels.astype("int16"), size=3, mode="nearest")
    out = np.where((sm > 0) & valid, sm, labels)
    return np.where(valid, out, 0).astype("int16")


def _zone_polygons(labels, zone_no: int, transform, crs, px_m: float):
    """Vectorize one zone → a GeoJSON MultiPolygon in EPSG:4326 (the raster CRS is UTM for
    HLS/S2, so the reprojection is mandatory)."""
    import numpy as np
    import rasterio.features
    from pyproj import Transformer
    from shapely.geometry import MultiPolygon, Polygon, mapping, shape
    from shapely.ops import transform as shp_transform
    from shapely.ops import unary_union

    mask = labels == zone_no
    if not mask.any():
        return None
    src = np.where(mask, np.uint8(1), np.uint8(0))
    polys = []
    px_area = max(px_m * px_m, 1e-6)
    for geom, val in rasterio.features.shapes(src, mask=mask, transform=transform):
        if val != 1:
            continue
        p = shape(geom)
        p = p.simplify(px_m * 0.5, preserve_topology=True).buffer(0)
        if p.is_empty:
            continue
        polys.append(p)
    if not polys:
        return None
    # Drop slivers (< ~1.5 pixels) but never drop everything.
    kept = [p for p in polys if p.area >= px_area * 1.5] or [max(polys, key=lambda p: p.area)]
    merged = unary_union(kept).buffer(0)
    if merged.is_empty:
        return None
    if isinstance(merged, Polygon):
        merged = MultiPolygon([merged])
    elif merged.geom_type == "GeometryCollection":
        parts = [g for g in merged.geoms if isinstance(g, Polygon)]
        if not parts:
            return None
        merged = MultiPolygon(parts)
    to_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    return mapping(shp_transform(lambda x, y, z=None: to_wgs.transform(x, y), merged))


def _compute(run: dict) -> dict:
    """The whole A6 computation for one run row. Returns a result dict; never writes the run row."""
    import numpy as np
    from rasterio.enums import Resampling

    if not run.get("geom"):
        return {"ok": False, "reason": "field_has_no_geometry", "n_scenes": 0}

    scenes = scene_stack(run)
    scenes = [s for s in scenes if s["path"] and os.path.exists(s["path"])]
    if len(scenes) < MIN_SCENES:
        return {"ok": False, "reason": "not_enough_scenes", "n_scenes": len(scenes)}
    scenes = _subsample(scenes, MAX_SCENES)

    ref_path = _pick_reference([s["path"] for s in scenes])
    if not ref_path:
        return {"ok": False, "reason": "no_readable_raster", "n_scenes": 0}
    ref = _open_clipped(ref_path, run["geom"])
    transform = ref.rio.transform()
    crs = ref.rio.crs
    px_m = float(abs(transform.a))

    rel_layers: list = []      # per-scene value / that scene's spatial median
    abs_layers: list = []      # per-scene raw value (for reporting in index units)
    used = 0
    for s in scenes:
        try:
            da = _open_clipped(s["path"], run["geom"])
            if da.shape != ref.shape or da.rio.crs != crs:
                da = da.rio.reproject_match(ref, resampling=Resampling.bilinear)
            arr = np.asarray(da.values, dtype="float32")
        except Exception as exc:  # noqa: BLE001 — a bad scene must not kill the run
            print(f"  ! scene {s['path']}: {exc}", file=sys.stderr)
            continue
        if arr.shape != ref.shape:
            continue
        finite = np.isfinite(arr)
        if finite.sum() < MIN_ZONE_PIXELS:
            continue
        med = float(np.nanmedian(arr[finite]))
        # Robust normalisation: a scene whose field median is ~0 (bare soil / snow / a broken
        # scene) carries no productivity signal and would explode the ratio → skip it.
        if not np.isfinite(med) or med <= 0.05:
            continue
        rel = np.where(finite, arr / med, np.nan).astype("float32")
        rel_layers.append(rel)
        abs_layers.append(np.where(finite, arr, np.nan).astype("float32"))
        used += 1

    if used < MIN_SCENES:
        return {"ok": False, "reason": "not_enough_scenes", "n_scenes": used}

    rel_stack = np.stack(rel_layers, axis=0)
    abs_stack = np.stack(abs_layers, axis=0)
    del rel_layers, abs_layers

    obs = np.isfinite(rel_stack).sum(axis=0)
    min_obs = max(MIN_OBS_ABS, int(round(MIN_OBS_FRACTION * used)))
    valid = obs >= min_obs

    with np.errstate(all="ignore"):
        rel_med = np.nanmedian(rel_stack, axis=0)
        abs_med = np.nanmedian(abs_stack, axis=0)
    del rel_stack, abs_stack
    valid = valid & np.isfinite(rel_med) & np.isfinite(abs_med)
    n_valid = int(valid.sum())
    if n_valid < MIN_ZONE_PIXELS * run["n_zones"]:
        return {"ok": False, "reason": "not_enough_pixels", "n_scenes": used,
                "valid_pixels": n_valid, "pixel_size_m": px_m}

    field_mean = float(np.mean(abs_med[valid]))
    field_std = float(np.std(abs_med[valid]))
    # CV is only meaningful for a positive mean (NDVI over a bare/flooded field can be ~0).
    cv = float(field_std / abs(field_mean)) if abs(field_mean) > 1e-6 else None
    if cv is None or not np.isfinite(cv):
        cv = None
        hclass = None
    else:
        hclass = "uniform" if cv < CV_UNIFORM else ("moderate" if cv < CV_MODERATE else "variable")

    # Percentile breaks on the RELATIVE multi-season value → equal-area zones.
    # Zone 1 = LOWEST productivity … zone n = HIGHEST (UI + A7 depend on this ordering).
    n = int(run["n_zones"])
    vals = rel_med[valid]
    edges = np.percentile(vals, [100.0 * i / n for i in range(1, n)])
    labels = np.zeros(rel_med.shape, dtype="int16")
    labels[valid] = (np.digitize(rel_med[valid], edges, right=False) + 1).astype("int16")
    labels = _smooth_labels(labels, valid)

    px_area_ha = (px_m * px_m) / 10000.0
    geographic = bool(getattr(crs, "is_geographic", False))
    zones: list[dict] = []
    for z in range(1, n + 1):
        m = labels == z
        cnt = int(m.sum())
        if cnt < MIN_ZONE_PIXELS:
            continue
        geom = _zone_polygons(labels, z, transform, crs, px_m)
        if geom is None:
            continue
        zv = abs_med[m]
        zv = zv[np.isfinite(zv)]
        if zv.size == 0:
            continue
        area_ha = round(cnt * px_area_ha, 4)
        if geographic:
            # Defensive: a degrees-based raster would make the pixel-area maths meaningless.
            try:
                from pyproj import Geod
                from shapely.geometry import shape as _shape
                area_ha = round(abs(Geod(ellps="WGS84").geometry_area_perimeter(
                    _shape(geom))[0]) / 10000.0, 4)
            except Exception:  # noqa: BLE001
                pass
        zmean = float(np.mean(zv))
        zones.append({
            "zone_no": z, "geom": geom, "area_ha": area_ha, "pixel_count": cnt,
            "mean_value": round(zmean, 5),
            "min_value": round(float(np.min(zv)), 5),
            "max_value": round(float(np.max(zv)), 5),
            "std_value": round(float(np.std(zv)), 5),
            "p10": round(float(np.percentile(zv, 10)), 5),
            "p50": round(float(np.percentile(zv, 50)), 5),
            "p90": round(float(np.percentile(zv, 90)), 5),
            "rel_to_field": round(zmean / field_mean, 4) if field_mean else None,
        })

    if not zones:
        return {"ok": False, "reason": "no_zone_polygons", "n_scenes": used,
                "valid_pixels": n_valid, "pixel_size_m": px_m}

    return {"ok": True, "zones": zones, "n_scenes": used, "valid_pixels": n_valid,
            "pixel_size_m": round(px_m, 2), "field_mean": round(field_mean, 5),
            "homogeneity_cv": round(cv, 4) if cv is not None else None,
            "homogeneity_class": hclass}


def compute_run(run_id: str) -> dict:
    """Entry point for one queued run row: running → ready|failed, zones persisted."""
    run = load_run(run_id)
    if not run:
        return {"ok": False, "error": "run_not_found"}
    set_run(run_id, "running", message=None)
    try:
        res = _compute(run)
    except Exception as exc:  # noqa: BLE001 — surface to the UI, then re-raise for the log
        set_run(run_id, "failed", message=str(exc)[:300])
        raise
    if not res.get("ok"):
        # 'not_enough_scenes' is the expected first-time outcome: zones need MULTI-SEASON COGs,
        # which only exist after an A8 backfill. The API turns this code into a helpful AZ hint.
        set_run(run_id, "failed",
                message=f"{res.get('reason')}:{res.get('n_scenes', 0)}",
                n_scenes=int(res.get("n_scenes") or 0),
                valid_pixels=res.get("valid_pixels"),
                pixel_size_m=res.get("pixel_size_m"))
        return res
    persist_zones(run, res["zones"])
    set_run(run_id, "ready", n_scenes=res["n_scenes"], valid_pixels=res["valid_pixels"],
            pixel_size_m=res["pixel_size_m"], field_mean=res["field_mean"],
            homogeneity_cv=res["homogeneity_cv"], homogeneity_class=res["homogeneity_class"],
            message=None)
    return {"ok": True, "run_id": run_id, "zones": len(res["zones"]),
            "n_scenes": res["n_scenes"], "homogeneity_class": res["homogeneity_class"]}


def drain(limit: int = 1) -> list[dict]:
    out = []
    for rid in claim_queued(limit):
        try:
            out.append(compute_run(rid))
        except Exception as exc:  # noqa: BLE001 — keep draining the rest of the queue
            print(f"! run {rid} failed: {exc}", file=sys.stderr)
            out.append({"ok": False, "run_id": rid, "error": str(exc)[:200]})
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: python -m geo_pipeline.zones <run_id> | drain [limit]")
    if sys.argv[1] == "drain":
        print(drain(int(sys.argv[2]) if len(sys.argv) > 2 else 1))
    else:
        print(compute_run(sys.argv[1]))
