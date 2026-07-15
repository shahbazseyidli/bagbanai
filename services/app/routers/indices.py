"""Vegetation index reads (FR-2, FREE): latest 9 indices + time series (spec §22).

These read index_stats (populated by the HLS pipeline). They return empty results
(not 404) when the pipeline has not yet run for a field."""
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query

from ..config import settings
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api/fields", tags=["indices"])

INDEX_NAMES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI"]

# TiTiler colormap + value range per index family (drives the map raster overlay).
_WATER = {"NDMI", "NDWI"}
_BURN = {"NBR", "NBR2"}


def _raster_style(index: str) -> tuple[str, str]:
    if index in _WATER:
        return "rdbu", "-0.5,0.5"
    if index in _BURN:
        return "rdylgn", "-0.5,0.8"
    return "rdylgn", "-0.1,0.9"  # vegetation (NDVI/EVI/SAVI/MSAVI/TVI)


@router.get("/{field_id}/indices/latest")
async def latest(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select distinct on (index_name)
                   index_name, mean, min, max, std, p10, p50, p90, valid_pixels, acquired_at
               from public.index_stats
               where field_id=$1::uuid
               order by index_name, acquired_at desc""", field_id)
    items = {}
    for r in rows:
        d = dict(r)
        d["acquired_at"] = d["acquired_at"].isoformat()
        for k in ("mean", "min", "max", "std", "p10", "p50", "p90"):
            d[k] = float(d[k]) if d[k] is not None else None
        items[d["index_name"]] = d
    return {"indices": items, "available_indices": INDEX_NAMES}


_SUMMARY_INDICES = ["NDVI", "NDMI", "NDWI", "EVI", "SAVI", "NBR"]


@router.get("/{field_id}/indices/summary")
async def summary(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Latest value per index for the İcmal explanation block: one row per index in
    a fixed order, with the most recent mean/date (null when the pipeline has none)."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select distinct on (index_name) index_name, mean, acquired_at
               from public.index_stats
               where field_id=$1::uuid
               order by index_name, acquired_at desc""", field_id)
    by_name = {r["index_name"]: r for r in rows}
    return {
        "indices": [
            {
                "index": name,
                "latest": (float(by_name[name]["mean"])
                           if name in by_name and by_name[name]["mean"] is not None else None),
                "date": (by_name[name]["acquired_at"].date().isoformat()
                         if name in by_name else None),
            }
            for name in _SUMMARY_INDICES
        ],
    }


@router.get("/{field_id}/scenes")
async def scenes(field_id: str, index: str = Query("NDVI"),
                 user_id: str = Depends(get_current_user_id)):
    """Scenes that have a rendered raster for `index`, newest first, each with a TiTiler
    XYZ tile-URL template for the map overlay (§3.1 analysis suite)."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        # One scene per date (least-cloudy), newest first — a clean timeline for the UI.
        rows = await conn.fetch(
            """select storage_path, acquired_at, scene_id, cloud_pct from (
                 select distinct on (r.acquired_at)
                        r.storage_path, r.acquired_at, r.scene_id, s.cloud_pct
                 from public.index_rasters r
                 join public.scenes s on s.id = r.scene_id
                 where r.field_id=$1::uuid and r.index_name=$2
                 order by r.acquired_at, s.cloud_pct asc nulls last
               ) t order by acquired_at desc""", field_id, index)
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
            "tile_url": tile_url,
        })
    return {"index": index, "colormap": cmap, "rescale": rescale, "scenes": scenes_out}


@router.get("/{field_id}/indices/benchmark")
async def benchmark(field_id: str, index: str = Query("NDVI"),
                    user_id: str = Depends(get_current_user_id)):
    """Weekly regional/peer benchmark for `index` — the average across OTHER fields with the
    same crop (or, if none, across all other fields). Lets a farmer compare their field to a
    baseline (FarmerApp §3.1.6). Returns an empty series when there are no peer fields yet."""
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
                 user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        q = ("select acquired_at, mean, p10, p50, p90 from public.index_stats "
             "where field_id=$1::uuid and index_name=$2")
        args = [field_id, index]
        if from_:
            args.append(from_); q += f" and acquired_at >= ${len(args)}::date"
        if to:
            args.append(to); q += f" and acquired_at <= ${len(args)}::date"
        q += " order by acquired_at"
        rows = await conn.fetch(q, *args)
    return {
        "index": index,
        "series": [
            {"date": r["acquired_at"].isoformat(),
             "mean": float(r["mean"]) if r["mean"] is not None else None,
             "p10": float(r["p10"]) if r["p10"] is not None else None,
             "p50": float(r["p50"]) if r["p50"] is not None else None,
             "p90": float(r["p90"]) if r["p90"] is not None else None}
            for r in rows
        ],
    }
