"""Tiny FastAPI service exposing tap-to-detect boundary (v2.1 C3).

Runs in the geo image (has rasterio/shapely/rioxarray). Reached only from the API container
on the compose network (geoapi:8010) — never exposed publicly; the API proxies /api/geo/segment
to it and enforces auth. Kept separate from the API image so the heavy geo deps stay out of it.

Start:  uvicorn geo_pipeline.segment_api:app --host 0.0.0.0 --port 8010 --workers 1"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .segment import detect_boundary

app = FastAPI(title="Bağban Geo-Segment")


class SegmentRequest(BaseModel):
    lon: float
    lat: float


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "geo-segment"}


@app.post("/segment")
def segment(req: SegmentRequest) -> dict:
    # Sync (def) → FastAPI runs it in the threadpool; detect_boundary is CPU/IO heavy but
    # single-shot. Never raises for expected failures (returns ok=False + reason).
    return detect_boundary(req.lon, req.lat)
