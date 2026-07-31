"""Vegetation index reads (FR-2, FREE): latest indices + time series (spec §22).

Reads index_stats/index_rasters, populated by TWO sensors: HLS 30m (codes S30/L30) and
Sentinel-2 10m (code S2). Returns empty results (not 404) when the pipeline hasn't run.
Sensor families for the API: 'hls' → HLS 30m, 's2' → Sentinel-2 10m (the default map source).
The map/latest/summary endpoints take ?sensor= (default s2) and fall back to the other family
when the requested one has no rows (S2-only fields, or the pre-backfill/rollout window); the
time-series endpoint returns BOTH sensors tagged so the chart can draw two labeled lines."""
import math
from datetime import date as date_cls, datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query

from ..config import settings
from ..db import connection
from ..deps import get_current_user_id, require_member, safe_uuid
from .fields import _org_of_field

router = APIRouter(prefix="/api/fields", tags=["indices"])
# The field-list thumbnails are org-scoped, but the TiTiler URL vocabulary lives in this module,
# so the endpoint stays here under a second prefix rather than duplicating _raster_style elsewhere.
org_router = APIRouter(prefix="/api/orgs", tags=["indices"])

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


# A static PNG of ONE clipped index COG — the whole field as a single finished image, not a tile
# pyramid. The pipeline's COGs are already clipped and masked to the boundary, so the preview IS
# the field. Colours come from _raster_style so a 44px thumbnail is the same green as the map.
# max_size is a CEILING, not a resize: a typical field's NDVI COG is ~30x25px and comes back at
# native size (~1 KB), while a large HLS field is capped instead of rendering a 1024px sheet for a
# thumbnail. Upscaling is the browser's job (image-rendering: pixelated).
_THUMB_MAX_SIZE = 128


def preview_url(storage_path: str, index: str = "NDVI", max_size: int = _THUMB_MAX_SIZE) -> str:
    cmap, rescale = _raster_style(index)
    return (f"{settings.titiler_public_base}/cog/preview.png?url={quote(storage_path, safe='')}"
            f"&colormap_name={cmap}&rescale={rescale}&max_size={max_size}")


# Fixed: the list thumbnail is the "is it green" glance, not an index picker.
THUMB_INDEX = "NDVI"


@org_router.get("/{org_id}/thumbs")
async def org_thumbs(org_id: str, user_id: str = Depends(get_current_user_id)):
    """Latest NDVI raster per field of ONE org — the read model behind the field-list thumbnails.

    ONE query for the whole org (the /api/orgs/{id}/wellness rule): a request per field would turn
    opening the list into N round-trips plus N COG lookups. A field with no raster yet simply has
    no entry — the UI then renders nothing rather than a placeholder image that implies data.
    Sentinel-2 (10m) wins over NASA HLS (30m) exactly as the public share card decides it."""
    org_id = safe_uuid(org_id, "org_not_found")
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select distinct on (r.field_id)
                      r.field_id, r.storage_path, r.acquired_at, r.sensor
               from public.index_rasters r
               join public.fields f on f.id = r.field_id
               join public.farms fm on fm.id = f.farm_id
               where fm.org_id=$1::uuid and f.deleted_at is null and r.index_name=$2
                 and r.storage_path is not null
               order by r.field_id, (r.sensor = 'S2') desc, r.acquired_at desc""",
            org_id, THUMB_INDEX)
    return {"thumbs": [
        {"field_id": str(r["field_id"]), "url": preview_url(r["storage_path"], THUMB_INDEX),
         "date": r["acquired_at"].isoformat(), "sensor": _family_of(r["sensor"])}
        for r in rows]}


# A1 — per-scene contrast stretch. The fixed family rescale above keeps colours comparable
# ACROSS dates, but in a uniform orchard every pixel lands in the same green and the in-field
# variation the farmer is looking for disappears. So for each scene we ALSO derive a stretch
# from that scene's own distribution (index_stats), which the UI can switch to ("Kontrast").
# Robust window = p10..p90 (ignores a handful of outlier pixels); if that is missing or
# degenerate we try min..max, and failing that we return the fixed family rescale — the tile
# URL must always be valid.
_MIN_SPAN = 0.05  # below this the stretch just amplifies noise


def _finite(v: Any) -> Optional[float]:
    """Decimal/None/NaN-safe float (asyncpg returns numeric as Decimal; numeric can hold NaN,
    which would serialize as invalid JSON)."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def _auto_rescale(p10: Any, p90: Any, vmin: Any, vmax: Any, fallback: str) -> str:
    """Per-scene 'lo,hi' rescale string, falling back to the fixed family range."""
    for lo, hi in ((_finite(p10), _finite(p90)), (_finite(vmin), _finite(vmax))):
        if lo is None or hi is None:
            continue
        if hi - lo >= _MIN_SPAN:
            return f"{lo:.3f},{hi:.3f}"
    return fallback


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


# Sentinel-2's repeat cycle. NOT a constant taken from a datasheet — MEASURED against this
# database: group every acquisition date by (date mod 5) and every gap inside a group is an exact
# multiple of 5 days. 86 gaps across all seven fields and 120 days, no exceptions. A field sits in
# two or three of those groups because neighbouring swaths overlap, which is why images arrive 2
# and 3 days apart and then pause for 5.
_S2_REPEAT_DAYS = 5

# Enough history to see every group the field belongs to (three cycles) without dragging in an
# orbit that only clipped the corner of the field last spring.
_COVERAGE_LOOKBACK_DAYS = 30


def _next_pass(dates: list[date_cls], today: date_cls) -> Optional[date_cls]:
    """When the satellite next flies over — derived from when it flew over BEFORE.

    Each distinct (date mod 5) residue is one repeating ground track. Step the most recent date in
    each residue forward by 5 until it reaches today or later, then take the earliest across
    residues. No ephemeris, no hardcoded calendar, and it self-corrects: if the constellation
    changes, the answer follows the observations rather than a number someone typed in 2026.

    Returns None when there is no history to extrapolate from — a brand-new field. Saying nothing
    is correct there; guessing a date for a field we have never seen imaged would be invention.

    BACK-TESTED, and the failures are the interesting part. Replaying one field's July history and
    predicting each next acquisition from the ones before it: 07-21→07-23 and 07-23→07-26 land
    exactly; 07-06→07-08, 07-11→07-13 and 07-16→07-18 are each three days early. Those three are
    not wrong about the SATELLITE — 07-08, 07-13 and 07-18 are real passes in the 07-03 residue —
    they are wrong about the IMAGE, because all three were cloud. Which is the whole argument for
    scene_attempts: the pass calendar is predictable, the picture is not, and only the attempt log
    can tell the farmer which of the two they are waiting on.
    """
    if not dates:
        return None
    latest_in_residue: dict[int, date_cls] = {}
    for d in dates:
        k = d.toordinal() % _S2_REPEAT_DAYS
        if k not in latest_in_residue or d > latest_in_residue[k]:
            latest_in_residue[k] = d
    have = set(dates)
    candidates = []
    for d in latest_in_residue.values():
        nxt = d
        # Past the dates that have already delivered, not merely past today. Without the second
        # predicate a field imaged THIS MORNING answered "next pass: today" — true about the
        # satellite, useless to the reader, and indistinguishable from "still waiting". Skipping a
        # day we already hold an image for can only ever push the answer later, which is the safe
        # direction to be wrong in: it under-promises.
        while nxt < today or nxt in have:
            nxt += timedelta(days=_S2_REPEAT_DAYS)
        candidates.append(nxt)
    return min(candidates) if candidates else None


@router.get("/{field_id}/coverage")
async def coverage(field_id: str, user_id: str = Depends(get_current_user_id)):
    """When the next satellite pass is, and why the recent ones produced no picture.

    THE QUESTION THIS ANSWERS. "Why has my field not updated in three weeks?" was unanswerable:
    public.scenes records what SUCCEEDED, so a run of cloudy passes and a satellite that stopped
    flying look identical — an absence. public.scene_attempts (0060) records the rejections too, so
    the honest answer ("it flew over on the 8th, 13th and 18th; every one was cloud") can finally
    be given.

    A PASS IS NOT A PICTURE. `next_pass` is when Sentinel-2 is overhead, not a promise of an image;
    cloud decides that on the day. The wording on the client has to keep that distinction — over-
    promising an image and then not delivering it is worse than saying nothing.
    """
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select distinct acquired_at from public.scenes
                where field_id=$1::uuid and sensor='S2'
                  and acquired_at > current_date - $2::int
                order by acquired_at desc""", field_id, _COVERAGE_LOOKBACK_DAYS * 3)
        attempts = await conn.fetch(
            """select acquired_at, outcome, cloud_pct, mgrs_tile
                 from public.scene_attempts
                where field_id=$1::uuid and sensor='S2'
                  and acquired_at > current_date - $2::int
                order by acquired_at desc, outcome""", field_id, _COVERAGE_LOOKBACK_DAYS)

    seen = [r["acquired_at"] for r in rows]
    today = datetime.now(timezone.utc).date()
    nxt = _next_pass(seen, today)

    # One row per DAY, not per granule: a field straddling three MGRS tiles gets three attempts for
    # the same pass, and "3 × cloudy on the 8th" is noise. A day counts as covered if any granule
    # that day was written.
    by_day: dict[date_cls, dict] = {}
    for a in attempts:
        d = a["acquired_at"]
        cur = by_day.setdefault(d, {"date": d.isoformat(), "outcome": a["outcome"],
                                    "cloud_pct": None})
        if a["outcome"] == "written":
            cur["outcome"] = "written"
        if a["cloud_pct"] is not None:
            c = float(a["cloud_pct"])
            cur["cloud_pct"] = c if cur["cloud_pct"] is None else min(cur["cloud_pct"], c)
    days = sorted(by_day.values(), key=lambda x: x["date"], reverse=True)

    return {
        "last_scene": seen[0].isoformat() if seen else None,
        "next_pass": nxt.isoformat() if nxt else None,
        "days_since_last": (today - seen[0]).days if seen else None,
        "repeat_days": _S2_REPEAT_DAYS,
        # Empty for every field processed before 0060 shipped — the pipeline only starts recording
        # from its next run. The client must treat [] as "nothing recorded yet", NOT as "no passes".
        "attempts": days,
        "lookback_days": _COVERAGE_LOOKBACK_DAYS,
    }


@router.get("/{field_id}/water-balance")
async def water_balance(field_id: str, user_id: str = Depends(get_current_user_id)):
    """FAO-56 daily soil-water balance for the field (T8) — the 'Hesablamanı gör' transparency table."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select date, et0_mm, kc, etc_mm, precip_mm, depletion_mm, raw_mm, taw_mm, reco_mm
               from public.field_water_balance where field_id=$1::uuid order by date""", field_id)
    def f(v):
        return float(v) if v is not None else None
    return {"days": [
        {"date": r["date"].isoformat(), "et0": f(r["et0_mm"]), "kc": f(r["kc"]),
         "etc": f(r["etc_mm"]), "precip": f(r["precip_mm"]), "depletion": f(r["depletion_mm"]),
         "raw": f(r["raw_mm"]), "taw": f(r["taw_mm"]), "reco_mm": f(r["reco_mm"])}
        for r in rows]}


@router.get("/{field_id}/gdd")
async def gdd(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Growing-Degree-Days for the field's current season (T4): latest cumulative + daily series."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select date, gdd_cumulative from public.field_gdd_daily
               where field_id=$1::uuid order by date""", field_id)
        latest = await conn.fetchrow(
            """select gdd_cumulative, season_year, base_c, date from public.field_gdd_daily
               where field_id=$1::uuid order by date desc limit 1""", field_id)
    return {
        "cumulative": float(latest["gdd_cumulative"]) if latest else None,
        "season_year": latest["season_year"] if latest else None,
        "base_c": float(latest["base_c"]) if latest else None,
        "as_of": latest["date"].isoformat() if latest else None,
        "series": [{"date": r["date"].isoformat(), "gdd": float(r["gdd_cumulative"])} for r in rows],
    }


@router.get("/{field_id}/season-features")
async def season_features(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Per-season vegetation + weather feature history for the field (T16): NDVI peak/mean/integral,
    GDD total, precipitation total. Groundwork for the future NDVI-integral ↔ yield correlation."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select season_year, crop_type, ndvi_peak, ndvi_mean, ndvi_integral,
                      gdd_total, precip_total_mm, n_scenes, sensor, computed_at
               from public.field_season_features where field_id=$1::uuid
               order by season_year desc""", field_id)
    def f(v):
        return float(v) if v is not None else None
    return {"seasons": [
        {"season_year": r["season_year"], "crop_type": r["crop_type"],
         "ndvi_peak": f(r["ndvi_peak"]), "ndvi_mean": f(r["ndvi_mean"]),
         "ndvi_integral": f(r["ndvi_integral"]), "gdd_total": f(r["gdd_total"]),
         "precip_total_mm": f(r["precip_total_mm"]), "n_scenes": r["n_scenes"],
         "sensor": r["sensor"], "computed_at": r["computed_at"].isoformat()}
        for r in rows]}


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
    when the requested one has no rasters (so the map is never empty if any sensor has data).

    Per scene, besides the fixed-range `tile_url` (unchanged — other callers depend on it):
      * `value`         — that scene's field mean for `index` (timeline chip, A2), may be null
      * `rescale_auto`  — contrast-stretched range from the scene's own p10..p90 (A1)
      * `tile_url_auto` — the same tile template rendered with `rescale_auto`
    """
    fam = _validate_sensor(sensor) or "s2"
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)

        async def q(codes):
            # One scene per date (least-cloudy), newest first — a clean timeline for the UI.
            # index_stats is LEFT joined (unique per scene+index) so a raster without stats
            # still shows up, just without a value/auto-stretch.
            return await conn.fetch(
                """select storage_path, acquired_at, scene_id, cloud_pct, sensor,
                          mean, p10, p90, vmin, vmax from (
                     select distinct on (r.acquired_at)
                            r.storage_path, r.acquired_at, r.scene_id, s.cloud_pct, r.sensor,
                            st.mean, st.p10, st.p90, st.min as vmin, st.max as vmax
                     from public.index_rasters r
                     join public.scenes s on s.id = r.scene_id
                     left join public.index_stats st
                            on st.scene_id = r.scene_id and st.index_name = r.index_name
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
        tile_base = (f"{base}/cog/tiles/WebMercatorQuad/{{z}}/{{x}}/{{y}}.png"
                     f"?url={url_param}&colormap_name={cmap}&rescale=")
        auto = _auto_rescale(r["p10"], r["p90"], r["vmin"], r["vmax"], rescale)
        scenes_out.append({
            "scene_id": str(r["scene_id"]),
            "date": r["acquired_at"].isoformat(),
            "cloud_pct": _finite(r["cloud_pct"]),
            "sensor": _family_of(r["sensor"]),
            "tile_url": tile_base + rescale,
            "value": _finite(r["mean"]),
            "rescale_auto": auto,
            "tile_url_auto": tile_base + auto,
        })
    return {"index": index, "sensor": used, "colormap": cmap, "rescale": rescale, "scenes": scenes_out}


@router.get("/{field_id}/indices/benchmark")
async def benchmark(field_id: str, index: str = Query("NDVI"),
                    user_id: str = Depends(get_current_user_id)):
    """Weekly regional/peer benchmark for `index` — the average across OTHER fields with the
    same crop (or, if none, across all other fields). HLS-only inside index_benchmark() (0013)
    so the baseline stays single-resolution. Returns an empty series when there are no peers."""
    from .. import tiers
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        # Regional benchmark is a business-tier feature (T10).
        if not tiers.allows(await tiers.org_tier(conn, org_id), "benchmark"):
            return {"index": index, "gated": True, "series": []}
        crop = await conn.fetchval(
            "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
        scope = "crop"
        rows = await conn.fetch(
            "select week, p10, p50, p90, n from public.index_benchmark($1, $2, $3::uuid)",
            index, crop, field_id)
        if not rows:  # no same-crop peers (or k-anon suppressed) → fall back to all other fields
            scope = "all"
            rows = await conn.fetch(
                "select week, p10, p50, p90, n from public.index_benchmark($1, $2, $3::uuid)",
                index, None, field_id)
    return {
        "index": index,
        "scope": scope,
        "crop_type": crop,
        # `mean` kept (= p50) for chart back-compat; p10/p90 enable a percentile band.
        "series": [
            {"date": r["week"].isoformat(), "mean": round(float(r["p50"]), 4),
             "p10": round(float(r["p10"]), 4), "p90": round(float(r["p90"]), 4), "n": int(r["n"])}
            for r in rows
        ],
    }


@router.get("/{field_id}/forecast")
async def forecast(field_id: str, index: str = Query("NDVI"), sensor: str = Query("s2"),
                   user_id: str = Depends(get_current_user_id)):
    """Short-horizon projection of `index` — the dotted continuation the chart draws after the last
    measurement (ai/forecast.py). Lives next to the series endpoint because it answers the same
    question one step further out, from the same index_stats rows.

    `method` is null with `points: []` whenever the data cannot support a projection, and that is a
    normal answer, not an error: the chart then simply ends at the last scene. `index` accepts the
    same names as the series endpoint (unknown ones just have no rows → method null)."""
    from .. import tiers
    from ..ai import forecast as forecast_mod
    fam = _validate_sensor(sensor) or "s2"
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        # The peers rung aggregates OTHER orgs' fields — the same cross-field data the regional
        # benchmark sells at the business tier (T10). Gating it here keeps one commercial rule for
        # one dataset; a blocked rung falls through to the trend, so the chart is never empty
        # because of a tier.
        peers_allowed = tiers.allows(await tiers.org_tier(conn, org_id), "benchmark")
        result = await forecast_mod.forecast(conn, field_id, index=index, sensor=fam,
                                             peers_allowed=peers_allowed)
    return {"index": index, **result}


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
