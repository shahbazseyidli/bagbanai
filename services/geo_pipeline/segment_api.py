"""Tiny FastAPI service exposing tap-to-detect boundary (v2.1 C3).

Runs in the geo image (has rasterio/shapely/rioxarray). Reached only from the API container
on the compose network (geoapi:8010) — never exposed publicly; the API proxies /api/geo/segment
to it and enforces auth. Kept separate from the API image so the heavy geo deps stay out of it.

Start:  uvicorn geo_pipeline.segment_api:app --host 0.0.0.0 --port 8010 --workers 1"""
from __future__ import annotations

import time
from collections import OrderedDict
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from .segment import detect_boundary

app = FastAPI(title="Bağban Geo-Segment")


class SegmentRequest(BaseModel):
    lon: float
    lat: float


class NdviRequest(BaseModel):
    polygon: dict[str, Any]      # GeoJSON geometry (Polygon/MultiPolygon)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "geo-segment"}


# Tap results, keyed on the tap rounded to ~11 m (5 decimal places), which is finer than the 10 m
# pixel the answer is derived from — so two taps that share a key would have shared a seed pixel
# and therefore an answer. Worth having because taps CLUSTER: a farmer re-taps to compare, and a
# village gets tapped by several people in the same week. A hit turns ~10-45 s into nothing.
# Bounded and TTL'd because this process is long-lived; not shared between restarts, which is fine
# for something whose only job is to avoid repeating work.
_CACHE: "OrderedDict[tuple[float, float], tuple[float, dict]]" = OrderedDict()
_CACHE_TTL_SEC = 3600.0
_CACHE_MAX = 512


def _cache_get(key):
    hit = _CACHE.get(key)
    if not hit:
        return None
    ts, val = hit
    if time.monotonic() - ts > _CACHE_TTL_SEC:
        _CACHE.pop(key, None)
        return None
    _CACHE.move_to_end(key)
    return val


def _cache_put(key, val) -> None:
    # Only successes. A failure is usually about the SCENE (too cloudy, nothing recent), and those
    # change under us — caching "boundary_unclear" for an hour would keep answering no after the
    # next overpass has already made it a yes.
    if not val.get("ok"):
        return
    _CACHE[key] = (time.monotonic(), val)
    _CACHE.move_to_end(key)
    while len(_CACHE) > _CACHE_MAX:
        _CACHE.popitem(last=False)


@app.post("/segment")
def segment(req: SegmentRequest) -> dict:
    # Sync (def) → FastAPI runs it in the threadpool; detect_boundary is CPU/IO heavy but
    # single-shot. Never raises for expected failures (returns ok=False + reason).
    key = (round(req.lon, 5), round(req.lat, 5))
    cached = _cache_get(key)
    if cached is not None:
        return cached
    out = detect_boundary(req.lon, req.lat)
    _cache_put(key, out)
    return out


@app.post("/ndvi")
def ndvi(req: NdviRequest) -> dict:
    # A11 — real NDVI for a polygon an anonymous visitor just drew. Area-capped inside
    # probe_ndvi; nothing is persisted. Same never-raise contract as /segment.
    from .ndvi_probe import probe_ndvi
    return probe_ndvi(req.polygon)
