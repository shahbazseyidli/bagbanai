"""Scene search via NASA Earthdata (earthaccess / CMR-STAC) — spec §10.2.

Auth uses ~/.netrc or EARTHDATA_USERNAME/PASSWORD. Prefers the HLS-VI collections
(ready-made indices). HLSS30 gaps fall back to HLSL30 with a wider composite window.

NOTE: asset/collection naming must be validated against a live Earthdata account on
the server (flagged dependency). This module encapsulates that so the rest of the
pipeline is stable."""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from datetime import date
from typing import Optional

import earthaccess

# HLS Vegetation Indices collections (ready-made VI COGs).
VI_COLLECTIONS = {"S30": "HLSS30_VI", "L30": "HLSL30_VI"}


@dataclass
class Granule:
    sensor: str                 # S30 | L30
    acquired_at: date
    granule_id: str
    mgrs_tile: Optional[str]
    cloud_pct: Optional[float]
    assets: dict = dc_field(default_factory=dict)   # index_name/band -> href


def login() -> None:
    """Earthdata auth: prefer EARTHDATA_USERNAME/PASSWORD env (set in .env), else ~/.netrc.

    Also hands the Earthdata bearer token to GDAL so /vsicurl COG reads authenticate
    against the LP DAAC protected endpoint (otherwise GDAL gets the login HTML and
    reports 'not recognized as being in a supported file format')."""
    import os
    if os.environ.get("EARTHDATA_USERNAME") and os.environ.get("EARTHDATA_PASSWORD"):
        auth = earthaccess.login(strategy="environment", persist=False)
    else:
        auth = earthaccess.login(strategy="netrc", persist=True)

    if not getattr(auth, "authenticated", False):
        raise RuntimeError(
            "Earthdata authentication FAILED — URS rejected the credentials. "
            "Check EARTHDATA_USERNAME (exact URS username) and EARTHDATA_PASSWORD in .env.")

    token = None
    try:
        tok = getattr(auth, "token", None)
        if isinstance(tok, dict):
            token = tok.get("access_token")
        elif isinstance(tok, str):
            token = tok
    except Exception:  # noqa: BLE001
        token = None
    if token:
        os.environ["GDAL_HTTP_HEADERS"] = f"Authorization: Bearer {token}"
        # follow the URS redirect and keep cookies as a fallback
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


def search_scenes(field_bbox: tuple[float, float, float, float],
                  date_from: date, date_to: date, max_cloud: int = 70) -> list[Granule]:
    """Search both HLS-VI collections for the field bbox and date range."""
    login()
    out: list[Granule] = []
    for sensor, short_name in VI_COLLECTIONS.items():
        try:
            results = earthaccess.search_data(
                short_name=short_name,
                bounding_box=field_bbox,
                temporal=(date_from.isoformat(), date_to.isoformat()),
                count=200,
            )
        except Exception:  # noqa: BLE001 — collection may be unavailable; skip sensor
            continue
        for g in results:
            gran = _parse_granule(sensor, g)
            if gran.cloud_pct is not None and gran.cloud_pct > max_cloud:
                continue
            out.append(gran)
    out.sort(key=lambda g: g.acquired_at)
    return out
