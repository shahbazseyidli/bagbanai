"""FAOSTAT (FAO Statistics) — national crop yield / area / production time series.

Public data endpoint on the FENIX host (fenixservices.fao.org). This is the keyless host
used by the community wrappers (R `FAOSTAT`, Python `faostat`, OWID ETL); the newer
`faostatservices.fao.org` host is gated behind AWS API-Gateway auth and is NOT used here.
Uptime of the public host is not guaranteed → the orchestrator caches the result as a
field_knowledge regional_benchmark block and reuses the cache on failure (spec §3.1).

We query the QCL domain (Crops and livestock products) for element 5419 = Yield, for
Azerbaijan (M49 area code 31), and normalize FAOSTAT's native yield unit to t/ha so the
number is directly comparable to the field's own harvest figures."""
from __future__ import annotations

from datetime import date

from .base import SourceResult, get_json, source_meta

BASE = "https://fenixservices.fao.org/faostat/api/v1/en/data/QCL"

# crop_type (our vocabulary) → FAOSTAT item code. These are FAOSTAT/FCL numeric item codes
# accepted by the QCL data endpoint's `item` param (not CPC). Verified against FAOSTAT's
# item list historically; the live definitions endpoint was unreachable (HTTP 521) at write
# time, so these are hardcoded from the documented FCL codes.
_ITEM_CODES = {
    "hazelnut": 225,     # Hazelnuts, in shell
    "wheat": 15,         # Wheat
    "barley": 44,        # Barley
    "corn": 56,          # Maize (corn)
    "maize": 56,         # alias for corn
    "rice": 27,          # Rice
    "grape": 560,        # Grapes
    "cotton": 328,       # Seed cotton, unginned
    "potato": 116,       # Potatoes
    "apple": 515,        # Apples
    "tomato": 388,       # Tomatoes
    "sunflower": 267,    # Sunflower seed
    "soybean": 236,      # Soybeans
    "tea": 667,          # Tea leaves
}

_YIELD_ELEMENT = 5419  # FAOSTAT element code for "Yield"


def _to_t_ha(value: float, unit: str) -> float:
    """Normalize a FAOSTAT yield figure to tonnes/hectare based on the reported Unit.

    FAOSTAT stores QCL yield natively in hg/ha (hectograms per hectare = 100 g/ha), but
    some responses surface kg/ha or t/ha. Convert by the actual unit string so we never
    hardcode the wrong divisor:
      hg/ha (100 g/ha) → /10000   (e.g. 19000 hg/ha = 1.9 t/ha)
      kg/ha            → /1000    (e.g. 1900 kg/ha  = 1.9 t/ha)
      t/ha             → as-is
    Unknown/blank unit falls back to hg/ha (FAOSTAT's native QCL yield unit)."""
    u = (unit or "").lower().replace(" ", "")
    if "t/ha" in u or "tonne" in u:
        return value
    if "kg/ha" in u:
        return value / 1000.0
    # "hg/ha", "100g/ha", or unknown → treat as FAOSTAT native hg/ha
    return value / 10000.0


async def fetch_yield(crop_type: str, *, area_code: int = 31, years: int = 5) -> SourceResult:
    """Last `years` years of national yield (t/ha) for `crop_type` in Azerbaijan (M49 31).

    Never raises: any network/parse failure comes back as ok=False so the research
    orchestrator can degrade gracefully (a missing benchmark beats a wrong one)."""
    code = _ITEM_CODES.get((crop_type or "").strip().lower())
    if code is None:
        return SourceResult(ok=False, error="faostat_unknown_crop")

    # FAOSTAT lags ~2 yrs, so request a window a few years wider than `years` and keep the
    # most recent `years` records that actually carry a value (below).
    this_year = date.today().year
    year_list = ",".join(str(y) for y in range(this_year - (years + 2), this_year + 1))
    params = {
        "area": area_code,       # 31 = Azerbaijan under M49
        "area_cs": "M49",        # interpret `area` as UN M49 code (FAOSTAT default is FAO code)
        "element": _YIELD_ELEMENT,
        "item": code,
        "year": year_list,
        "output_type": "objects",  # → {"data": [ {ColName: value, ...}, ... ]}
        "show_unit": "true",
    }
    try:
        js = await get_json(BASE, params=params)
    except Exception as exc:  # noqa: BLE001 — network/HTTP failure → degrade, don't propagate
        return SourceResult(ok=False, error=f"faostat_unreachable: {exc}")

    rows: list[dict] = []
    country = "Azerbaijan"
    try:
        for rec in (js.get("data") or []):
            raw = rec.get("Value")
            yr = rec.get("Year")
            if raw in (None, "", "NA") or yr in (None, ""):
                continue
            country = rec.get("Area") or country
            rows.append({
                "year": int(yr),
                "value": round(_to_t_ha(float(raw), rec.get("Unit", "")), 3),
                "unit": "t/ha",
            })
    except Exception as exc:  # noqa: BLE001 — malformed payload → degrade, don't crash
        return SourceResult(ok=False, error=f"faostat_parse: {exc}")

    if not rows:
        return SourceResult(ok=False, error="faostat_empty")

    # Most-recent `years`, ascending for readable time series; latest = newest year.
    rows.sort(key=lambda r: r["year"])
    rows = rows[-years:]
    out = {
        "crop": crop_type,
        "country": country,
        "yield": rows,
        "latest_yield": rows[-1],
    }
    return SourceResult(
        ok=True, data=out,
        source=source_meta(
            f"{BASE}?area={area_code}&element={_YIELD_ELEMENT}&item={code}",
            "FAOSTAT (FAO)", "structured_api", 0.9))
