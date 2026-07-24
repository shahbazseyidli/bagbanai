"""Scene search via NASA Earthdata (earthaccess / CMR-STAC) — spec §10.2.

Auth uses ~/.netrc or EARTHDATA_USERNAME/PASSWORD. Prefers the HLS-VI collections
(ready-made indices). HLSS30 gaps fall back to HLSL30 with a wider composite window.

NOTE: asset/collection naming must be validated against a live Earthdata account on
the server (flagged dependency). This module encapsulates that so the rest of the
pipeline is stable."""
from __future__ import annotations

import sys
from dataclasses import dataclass, field as dc_field
from datetime import date, timedelta
from typing import Optional

import earthaccess

# HLS Vegetation Indices collections (ready-made VI COGs).
VI_COLLECTIONS = {"S30": "HLSS30_VI", "L30": "HLSL30_VI"}

# Per-collection result cap. CMR will happily accept a 10-year window and hand back only this
# many granules — SILENT TRUNCATION. The cap stays (it bounds runtime/memory), but the search
# now reports whether it was hit so the caller can chunk the window (see
# geo_pipeline.pipeline.run_field_backfill, which walks one calendar year at a time).
GRANULE_CAP = 200
# Window used when neither an explicit date range nor days_back is given (matches the historical
# pipeline default).
DEFAULT_DAYS_BACK = 120


@dataclass
class Granule:
    sensor: str                 # S30 | L30 | S2
    acquired_at: date
    granule_id: str
    mgrs_tile: Optional[str]
    cloud_pct: Optional[float]
    assets: dict = dc_field(default_factory=dict)   # index_name/band -> href
    band_meta: dict = dc_field(default_factory=dict)  # asset_key -> {"scale","offset"} (S2 raster:bands)


@dataclass
class SearchResult:
    """A scene search plus the bookkeeping needed to detect a truncated window.

    `truncated=True` means the provider cap was reached, i.e. the requested date window is
    WIDER than one request can return and the caller must split it (per year / per season)
    or it is silently looking at a subset of history."""
    granules: list = dc_field(default_factory=list)
    found: int = 0          # granules the provider handed back (before the cloud filter)
    returned: int = 0       # granules handed to the caller (after cloud filter + cap)
    truncated: bool = False
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    detail: dict = dc_field(default_factory=dict)   # per-collection {found, kept, truncated}


def resolve_window(date_from: Optional[date], date_to: Optional[date],
                   days_back: Optional[int]) -> tuple[date, date]:
    """Normalize the three ways of asking for a window into (from, to).

    Explicit dates win; otherwise `days_back` counts back from `date_to` (default today).
    Reversed ranges are swapped rather than returning nothing."""
    d_to = date_to or date.today()
    if date_from is not None:
        d_from = date_from
    else:
        back = DEFAULT_DAYS_BACK if days_back is None else int(days_back)
        d_from = d_to - timedelta(days=max(0, back))
    if d_from > d_to:
        d_from, d_to = d_to, d_from
    return d_from, d_to


def login() -> None:
    """Earthdata auth for protected COG reads (LP DAAC).

    Preferred: an EDL **bearer token** in EARTHDATA_TOKEN — handed to GDAL via
    GDAL_HTTP_HEADERS ('Authorization: Bearer <token>'), which is exactly how NASA EDL
    expects token access. Falls back to EARTHDATA_USERNAME/PASSWORD or ~/.netrc.
    (CMR/STAC scene *search* is public and works without auth; only the /vsicurl COG
    reads need the token, otherwise GDAL gets login HTML → 'not recognized as ... format'.)"""
    import os

    token = (os.environ.get("EARTHDATA_TOKEN") or "").strip()
    user = os.environ.get("EARTHDATA_USERNAME")
    pw = os.environ.get("EARTHDATA_PASSWORD")

    # Best-effort earthaccess session (search still works even if this doesn't fully auth).
    auth = None
    try:
        if user and pw:
            auth = earthaccess.login(strategy="environment", persist=False)
        else:
            auth = earthaccess.login(strategy="netrc", persist=True)
    except Exception:  # noqa: BLE001
        auth = None

    # Resolve a bearer token for GDAL: explicit EARTHDATA_TOKEN wins, else the session's.
    if not token and auth is not None:
        tok = getattr(auth, "token", None)
        if isinstance(tok, dict):
            token = tok.get("access_token") or ""
        elif isinstance(tok, str):
            token = tok

    if not token:
        raise RuntimeError(
            "No Earthdata credentials — set EARTHDATA_TOKEN (bearer) or "
            "EARTHDATA_USERNAME/PASSWORD in .env.")

    os.environ["GDAL_HTTP_HEADERS"] = f"Authorization: Bearer {token}"
    os.environ.setdefault("GDAL_HTTP_COOKIEFILE", "/tmp/gdal_cookies.txt")
    os.environ.setdefault("GDAL_HTTP_COOKIEJAR", "/tmp/gdal_cookies.txt")


def _parse_granule(sensor: str, g) -> Granule:
    umm = g.get("umm", {}) if isinstance(g, dict) else {}
    gid = umm.get("GranuleUR", "") or getattr(g, "id", "")
    # acquisition date
    tempo = umm.get("TemporalExtent", {}).get("RangeDateTime", {})
    acq = (tempo.get("BeginningDateTime") or "")[:10]
    acquired = date.fromisoformat(acq) if acq else date.today()
    # cloud cover
    cloud = None
    for ad in umm.get("AdditionalAttributes", []) or []:
        if ad.get("Name") == "CLOUD_COVERAGE":
            try:
                cloud = float(ad["Values"][0])
            except (KeyError, ValueError, IndexError):
                pass
    # data asset hrefs
    assets = {}
    for url in earthaccess.results.DataGranule(g).data_links() if hasattr(earthaccess, "results") else g.data_links():
        assets[url.rsplit("/", 1)[-1]] = url
    mgrs_tile = None
    if "." in gid:
        # HLS granule id e.g. HLS.S30.T38SMF.2024180T...  -> tile token starts with T
        for tok in gid.split("."):
            if tok.startswith("T") and len(tok) == 6:
                mgrs_tile = tok[1:]
                break
    return Granule(sensor=sensor, acquired_at=acquired, granule_id=gid,
                   mgrs_tile=mgrs_tile, cloud_pct=cloud, assets=assets)


def search_scenes_ex(field_bbox: tuple[float, float, float, float],
                     date_from: Optional[date] = None, date_to: Optional[date] = None,
                     max_cloud: int = 70, *, days_back: Optional[int] = None,
                     limit: int = GRANULE_CAP) -> SearchResult:
    """Search both HLS-VI collections and report cap/truncation (see SearchResult).

    Truncation detection: we ask the provider for `limit + 1` granules; getting more than
    `limit` back proves the window does not fit, so we trim to `limit` and flag it. The
    extra granule is never handed to the caller, so behaviour matches the historical
    `count=200` search."""
    d_from, d_to = resolve_window(date_from, date_to, days_back)
    per = max(1, int(limit))
    login()
    out: list[Granule] = []
    found = 0
    truncated = False
    detail: dict = {}
    for sensor, short_name in VI_COLLECTIONS.items():
        try:
            results = earthaccess.search_data(
                short_name=short_name,
                bounding_box=field_bbox,
                temporal=(d_from.isoformat(), d_to.isoformat()),
                count=per + 1,
            )
        except Exception as exc:  # noqa: BLE001 — collection may be unavailable; skip sensor
            detail[sensor] = {"found": 0, "kept": 0, "truncated": False, "error": str(exc)[:200]}
            continue
        raw = list(results)
        n = len(raw)
        coll_truncated = n > per
        if coll_truncated:
            raw = raw[:per]
            truncated = True
            print(f"  ! HLS {short_name}: search hit the {per}-granule cap for "
                  f"{d_from.isoformat()}..{d_to.isoformat()} — history is TRUNCATED, "
                  f"chunk the window (one year at a time)", file=sys.stderr)
        kept = 0
        for g in raw:
            gran = _parse_granule(sensor, g)
            if gran.cloud_pct is not None and gran.cloud_pct > max_cloud:
                continue
            out.append(gran)
            kept += 1
        found += n
        detail[sensor] = {"found": n, "kept": kept, "truncated": coll_truncated}
    out.sort(key=lambda g: g.acquired_at)
    return SearchResult(granules=out, found=found, returned=len(out), truncated=truncated,
                        date_from=d_from, date_to=d_to, detail=detail)


def search_scenes(field_bbox: tuple[float, float, float, float],
                  date_from: Optional[date] = None, date_to: Optional[date] = None,
                  max_cloud: int = 70, *, days_back: Optional[int] = None,
                  limit: int = GRANULE_CAP) -> list[Granule]:
    """Search both HLS-VI collections for the field bbox and date range.

    Unchanged for existing callers (positional from/to, cap 200); use search_scenes_ex()
    when you need to know whether the window was truncated."""
    return search_scenes_ex(field_bbox, date_from, date_to, max_cloud,
                            days_back=days_back, limit=limit).granules
