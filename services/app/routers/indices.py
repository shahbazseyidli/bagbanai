"""Vegetation index reads (FR-2, FREE): latest indices + time series (spec §22).

Reads index_stats/index_rasters, populated by TWO sensors: HLS 30m (codes S30/L30) and
Sentinel-2 10m (code S2). Returns empty results (not 404) when the pipeline hasn't run.
Sensor families for the API: 'hls' → HLS 30m, 's2' → Sentinel-2 10m (the default map source).
The map/latest/summary endpoints take ?sensor= (default s2) and fall back to the other family
when the requested one has no rows (S2-only fields, or the pre-backfill/rollout window); the
time-series endpoint returns BOTH sensors tagged so the chart can draw two labeled lines."""
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query

from ..config import settings
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api/fields", tags=["indices"])

# NDRE/CIre are S2-only red-edge indices (E0); they appear for the s2 family only (HLS lacks
# the 705 nm band) and simply return empty for hls, handled by the existing sensor fallback.
INDEX_NAMES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI", "NDRE", "CIre"]

# API sensor families → DB sensor codes.
_SENSOR_FAMILIES = {"hls": ["S30", "L30"], "s2": ["S2"]}


def _validate_sensor(fam: Optional[str]) -> Optional[str]:
    """Normalize a sensor family param: None/'' → None; a known family → itself; unknown → 422
    (so a typo returns a clear error instead of a silently-empty 200)."""
    if fam is None or fam == "":
        return None
    f = fam.lower()
    if f not in _SENSOR_FAMILIES:
        raise HTTPException(status_code=422, detail="unknown_sensor")
    return f


def _other(fam: str) -> str:
    return "hls" if fam == "s2" else "s2"


def _family_of(code: Optional[str]) -> str:
    return "hls" if code in ("S30", "L30") else "s2"


# TiTiler colormap + value range per index family (drives the map raster overlay).
_WATER = {"NDMI", "NDWI"}
_BURN = {"NBR", "NBR2"}


def _raster_style(index: str) -> tuple[str, str]:
    if index in _WATER:
        return "rdbu", "-0.5,0.5"
    if index in _BURN:
        return "rdylgn", "-0.5,0.8"
    if index == "CIre":
        return "rdylgn", "0,3"      # chlorophyll ratio (~0-4), not bounded like NDVI
    return "rdylgn", "-0.1,0.9"  # vegetation (NDVI/EVI/SAVI/MSAVI/TVI/NDRE)


@router.get("/{field_id}/indices/latest")
async def latest(field_id: str, sensor: str = Query("s2"),
                 user_id: str = Depends(get_current_user_id)):
    fam = _validate_sensor(sensor) or "s2"
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)

        async def q(codes):
            return await conn.fetch(
                """select distinct on (index_name)
                       index_name, sensor, mean, min, max, std, p10, p50, p90, valid_pixels, acquired_at
                   from public.index_stats
                   where field_id=$1::uuid and sensor = any($2)
                   order by index_name, acquired_at desc""", field_id, codes)

        rows = await q(_SENSOR_FAMILIES[fam])
        used = fam
        if not rows:
            rows = await q(_SENSOR_FAMILIES[_other(fam)])
            used = _other(fam) if rows else fam
    items = {}
    for r in rows:
        d = dict(r)
        d["acquired_at"] = d["acquired_at"].isoformat()
        for k in ("mean", "min", "max", "std", "p10", "p50", "p90"):
            d[k] = float(d[k]) if d[k] is not None else None
        items[d["index_name"]] = d
    return {"indices": items, "available_indices": INDEX_NAMES, "sensor": used}


# NDRE included so the at-a-glance card surfaces the red-edge reading (E0) — it only has data
# for the s2 family (empty for hls, dropped client-side), so it appears only when S2 is active.
_SUMMARY_INDICES = ["NDVI", "NDRE", "NDMI", "NDWI", "EVI", "SAVI", "NBR"]


@router.get("/{field_id}/norms")
async def index_norms(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Crop-specific index band edges for the UI status labels (M5). Resolves the field's
    crop_type → crop_thresholds.index_norms; falls back to 'generic' when the crop has no
    calibration. `calibrated` is true only when a crop-specific (non-generic) row supplied
    the bands — the UI shows a "calibrated for <crop>" hint in that case. NULL norms → the
    frontend uses its universal thresholds."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        crop = await conn.fetchval(
            "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
        norms = None
        calibrated = False
        if crop:
            norms = await conn.fetchval(
                """select index_norms from public.crop_thresholds
                   where crop_type=$1 and growth_stage='all' and age_class='all'""", crop)
            calibrated = norms is not None
        if norms is None:  # crop unknown, or crop row has no calibration → generic
            norms = await conn.fetchval(
                """select index_norms from public.crop_thresholds
                   where crop_type='generic' and growth_stage='all' and age_class='all'""")
    # asyncpg returns jsonb as a str — parse to an object for the JSON response.
    if isinstance(norms, str):
        import json
        norms = json.loads(norms)
    return {"crop_type": crop, "calibrated": calibrated, "norms": norms or {}}


@router.get("/{field_id}/indices/summary")
async def summary(field_id: str, sensor: str = Query("s2"),
                  user_id: str = Depends(get_current_user_id)):
    """Latest value per index for the İcmal explanation block, for the requested sensor
    (default s2, matching the map), with fallback to the other family when empty."""
    fam = _validate_sensor(sensor) or "s2"
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)

        async def q(codes):
            return await conn.fetch(
                """select distinct on (index_name) index_name, sensor, mean, acquired_at
                   from public.index_stats
                   where field_id=$1::uuid and sensor = any($2)
                   order by index_name, acquired_at desc""", field_id, codes)

        rows = await q(_SENSOR_FAMILIES[fam])
        used = fam
        if not rows:
            rows = await q(_SENSOR_FAMILIES[_other(fam)])
            used = _other(fam) if rows else fam
    by_name = {r["index_name"]: r for r in rows}
    return {
        "sensor": used,
        "indices": [
            {
                "index": name,
                "latest": (float(by_name[name]["mean"])
                           if name in by_name and by_name[name]["mean"] is not None else None),
                "date": (by_name[name]["acquired_at"].isoformat()
                         if name in by_name else None),
            }
            for name in _SUMMARY_INDICES
        ],
    }


@router.get("/{field_id}/insights")
async def insights(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Per-index trend snapshot (latest, ~3-weeks-ago prior, delta, % change, direction) for
    BOTH sensors, powering the Overview ("İcmal") insight page. The page prefers Sentinel-2
    (10m, sharper) and falls back to NASA HLS (30m) when S2 hasn't arrived yet — showing the
    first data available while the rest is still processing. Also returns crop calibration and
    the field's processing status so the page can render the right 'still preparing' note."""
    from ..ai.context import index_trends, INSIGHT_INDICES
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        s2 = await index_trends(conn, field_id, sensor="S2", indices=INSIGHT_INDICES)
        hls = await index_trends(conn, field_id, sensor="HLS", indices=INSIGHT_INDICES)
        crop = await conn.fetchval(
            "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
        calibrated = False
        if crop:
            calibrated = await conn.fetchval(
                """select index_norms is not null from public.crop_thresholds
                   where crop_type=$1 and growth_stage='all' and age_class='all'""", crop) or False
        status = await conn.fetchrow(
            """select data_status, data_ready_at from public.fields where id=$1::uuid""", field_id)
    return {
        "s2": s2,
        "hls": hls,
        "crop_type": crop,
        "calibrated": bool(calibrated),
        "data_status": status["data_status"] if status else "ready",
    }


@router.get("/{field_id}/scenes")
async def scenes(field_id: str, index: str = Query("NDVI"), sensor: str = Query("s2"),
                 user_id: str = Depends(get_current_user_id)):
    """Scenes with a rendered raster for `index` + sensor (default s2), newest first, each with
    a TiTiler XYZ tile-URL template for the map overlay. Falls back to the other sensor family
    when the requested one has no rasters (so the map is never empty if any sensor has data)."""
    fam = _validate_sensor(sensor) or "s2"
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)

        async def q(codes):
            # One scene per date (least-cloudy), newest first — a clean timeline for the UI.
            return await conn.fetch(
                """select storage_path, acquired_at, scene_id, cloud_pct, sensor from (
                     select distinct on (r.acquired_at)
                            r.storage_path, r.acquired_at, r.scene_id, s.cloud_pct, r.sensor
                     from public.index_rasters r
                     join public.scenes s on s.id = r.scene_id
                     where r.field_id=$1::uuid and r.index_name=$2 and r.sensor = any($3)
                     order by r.acquired_at, s.cloud_pct asc nulls last
                   ) t order by acquired_at desc""", field_id, index, codes)

        rows = await q(_SENSOR_FAMILIES[fam])
        used = fam
        if not rows:
            rows = await q(_SENSOR_FAMILIES[_other(fam)])
            used = _other(fam) if rows else fam
    cmap, rescale = _raster_style(index)
    base = settings.titiler_public_base
    scenes_out = []
    for r in rows:
        url_param = quote(r["storage_path"], safe="")
        # TiTiler needs the TileMatrixSet id (WebMercatorQuad) in the tile path.
        tile_url = (f"{base}/cog/tiles/WebMercatorQuad/{{z}}/{{x}}/{{y}}.png"
                    f"?url={url_param}&colormap_name={cmap}&rescale={rescale}")
        scenes_out.append({
            "scene_id": str(r["scene_id"]),
            "date": r["acquired_at"].isoformat(),
            "cloud_pct": float(r["cloud_pct"]) if r["cloud_pct"] is not None else None,
            "sensor": _family_of(r["sensor"]),
            "tile_url": tile_url,
        })
    return {"index": index, "sensor": used, "colormap": cmap, "rescale": rescale, "scenes": scenes_out}


@router.get("/{field_id}/indices/benchmark")
async def benchmark(field_id: str, index: str = Query("NDVI"),
                    user_id: str = Depends(get_current_user_id)):
    """Weekly regional/peer benchmark for `index` — the average across OTHER fields with the
    same crop (or, if none, across all other fields). HLS-only inside index_benchmark() (0013)
    so the baseline stays single-resolution. Returns an empty series when there are no peers."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        crop = await conn.fetchval(
            "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
        scope = "crop"
        rows = await conn.fetch(
            "select week, mean_avg, n from public.index_benchmark($1, $2, $3::uuid)",
            index, crop, field_id)
        if not rows:  # no same-crop peers → fall back to all other fields (national avg)
            scope = "all"
            rows = await conn.fetch(
                "select week, mean_avg, n from public.index_benchmark($1, $2, $3::uuid)",
                index, None, field_id)
    return {
        "index": index,
        "scope": scope,
        "crop_type": crop,
        "series": [
            {"date": r["week"].isoformat(), "mean": round(float(r["mean_avg"]), 4), "n": int(r["n"])}
            for r in rows
        ],
    }


@router.get("/{field_id}/indices")
async def series(field_id: str, index: str = Query("NDVI"),
                 from_: Optional[str] = Query(None, alias="from"),
                 to: Optional[str] = Query(None),
                 sensor: Optional[str] = Query(None),
                 user_id: str = Depends(get_current_user_id)):
    """Time series for `index`. With no ?sensor= it returns BOTH sensors, each point tagged with
    its family ('hls'|'s2') so the chart draws two labeled lines (HLS = dense series, S2 = 10m)."""
    fam = _validate_sensor(sensor)  # None → all sensors (merged chart)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        q = ("select acquired_at, sensor, mean, p10, p50, p90 from public.index_stats "
             "where field_id=$1::uuid and index_name=$2")
        args: list = [field_id, index]
        if fam:
            args.append(_SENSOR_FAMILIES[fam])
            q += f" and sensor = any(${len(args)})"
        if from_:
            args.append(from_)
            q += f" and acquired_at >= ${len(args)}::date"
        if to:
            args.append(to)
            q += f" and acquired_at <= ${len(args)}::date"
        q += " order by acquired_at"
        rows = await conn.fetch(q, *args)
    return {
        "index": index,
        "series": [
            {"date": r["acquired_at"].isoformat(),
             "sensor": _family_of(r["sensor"]),
             "mean": float(r["mean"]) if r["mean"] is not None else None,
             "p10": float(r["p10"]) if r["p10"] is not None else None,
             "p50": float(r["p50"]) if r["p50"] is not None else None,
             "p90": float(r["p90"]) if r["p90"] is not None else None}
            for r in rows
        ],
    }
