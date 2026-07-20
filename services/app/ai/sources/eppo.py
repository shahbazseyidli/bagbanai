"""EPPO Data Services — pests & diseases associated with a host crop (knowledge layer M2).

Token-gated (free EPPO account). Until the operator adds `EPPO_TOKEN` to .env this adapter
short-circuits to ok=False WITHOUT any network call, so the platform degrades gracefully
(spec P4: a missing pest block is better than a made-up one).

REST contract (confirmed against the EPPO Data Services REST API, base
`https://data.eppo.int/api/rest/1.0/`, and the `pestr` reference client
https://github.com/mczyzj/pestr — R/eppo_api.R `eppo_rest_download`):
  - host → pests:  GET  taxon/{eppocode}/pests?authtoken={token}
                   returns a flat JSON array of records {eppocode, idclass, labelclass, fullname}
                   (an EPPO error / empty result comes back as {"message": "..."}).
  - name → code (NOT used here): GET tools/search?kw={name}&authtoken={token}. We resolve host
    codes from the static `_EPPO_CODES` table instead — deterministic, avoids an extra round-trip
    and the ambiguity of fuzzy name matching for our fixed crop vocabulary.
The legacy REST base stays live until 2026-09-01 (EPPO Data Services → EPPO Data Portal).
"""
from __future__ import annotations

from typing import Any

from ...config import settings  # app/ai/sources/ → app/config.py is two levels up (three dots)
from .base import SourceResult, get_json, source_meta

BASE = "https://data.eppo.int/api/rest/1.0/"

# Our crop_type vocabulary (db/seeds/crop_thresholds.json + subsidy seed) → EPPO code.
# Every code verified live against gd.eppo.int/taxon/{code}. NOTE: cotton uses GOSHI
# (Gossypium hirsutum, upland cotton — the dominant cultivated species); the bare genus
# form "GOSSG" is not a valid EPPO code.
_EPPO_CODES: dict[str, str] = {
    "hazelnut": "CYLAV",  # Corylus avellana
    "wheat": "TRZAX",     # Triticum aestivum subsp. aestivum
    "grape": "VITVI",     # Vitis vinifera
    "cotton": "GOSHI",    # Gossypium hirsutum (upland cotton)
    "corn": "ZEAMX",      # Zea mays
    "barley": "HORVX",    # Hordeum vulgare
    "potato": "SOLTU",    # Solanum tuberosum
    "rice": "ORYSA",      # Oryza sativa
}

# The host→pests endpoint returns a flat pest list with no first-class pest/disease flag, so we
# classify heuristically from the scientific name: viruses/viroids/phytoplasmas + a compact set of
# well-known plant-pathogenic genera → "disease"; everything else (insects, mites, nematodes,
# weeds) → "pest". Coarse but useful for downstream prose; never load-bearing for a decision.
_DISEASE_TOKENS = ("virus", "viroid", "phytoplasma")
_DISEASE_GENERA = frozenset({
    "phytophthora", "fusarium", "puccinia", "botrytis", "erysiphe", "blumeria",
    "podosphaera", "uncinula", "xanthomonas", "pseudomonas", "erwinia", "ralstonia",
    "monilinia", "venturia", "alternaria", "rhizoctonia", "verticillium", "sclerotinia",
    "colletotrichum", "plasmopara", "septoria", "cercospora", "phakopsora", "candidatus",
})


def _classify(name: str) -> str:
    low = name.lower()
    if any(t in low for t in _DISEASE_TOKENS):
        return "disease"
    genus = low.split(" ", 1)[0] if low else ""
    return "disease" if genus in _DISEASE_GENERA else "pest"


async def fetch_pests(crop_type: str, *, max_items: int = 25) -> SourceResult:
    """Pests/diseases recorded for `crop_type` as an EPPO host. Never raises."""
    # Default state until the operator provisions a token: no network call at all.
    if not settings.eppo_token:
        return SourceResult(ok=False, error="eppo_no_token")

    code = _EPPO_CODES.get((crop_type or "").strip().lower())
    if not code:
        return SourceResult(ok=False, error="eppo_unknown_crop")

    url = f"{BASE}taxon/{code}/pests"  # token kept out of the URL → passed as a param below
    try:
        # authtoken travels as a query param; the stored source url (see below) never carries it.
        js = await get_json(url, params={"authtoken": settings.eppo_token})
    except Exception as exc:  # noqa: BLE001 — network/HTTP/parse errors degrade, never propagate
        return SourceResult(ok=False, error=f"eppo_unreachable: {exc}")

    # EPPO signals an error / empty taxon with a {"message": ...} object instead of a list.
    if isinstance(js, dict) and "message" in js:
        return SourceResult(ok=False, error="eppo_error")

    pests: list[dict[str, Any]] = []
    try:
        for rec in (js if isinstance(js, list) else []):
            if not isinstance(rec, dict):
                continue
            name = rec.get("fullname") or rec.get("prefname") or rec.get("codename")
            eppo_code = rec.get("eppocode")
            if not name:
                continue
            pests.append({
                "eppo_code": eppo_code,
                "name": name,
                "type": _classify(str(name)),
            })
            if len(pests) >= max_items:
                break
    except Exception as exc:  # noqa: BLE001 — malformed payload → degrade, don't crash
        return SourceResult(ok=False, error=f"eppo_parse: {exc}")

    data = {"host": crop_type, "eppo_code": code, "pests": pests}
    return SourceResult(
        ok=True, data=data,
        # Token stripped from the traceability url on purpose (spec P5: never persist secrets).
        source=source_meta(url, "EPPO Data Services", "structured_api", 0.9))
