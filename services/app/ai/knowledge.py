"""Knowledge store + zone resolution + invalidation map (knowledge layer M3/M4).

Two layers (spec P2):
  * zone_knowledge  — shared by (crop_type, zone_id); one research serves N fields.
  * field_knowledge — per-field passport blocks (soil, context, history).

This module is pure storage + policy: the orchestrator (research.py) fills the blocks, the
worker (routers/knowledge.py + deploy/process-research.sh) schedules the work. Everything is
read/written through the RLS-scoped connection the caller already holds."""
from __future__ import annotations

import hashlib
import json
import unicodedata
from typing import Any, Iterable, Optional

from .sources.base import get_json

ZONE_BLOCKS = ["crop_profile", "index_norms", "phenology",
               "water_requirements", "pest_disease", "agro_practice"]
FIELD_BLOCKS = ["soil_profile", "field_context", "field_history", "resolved_clarifications"]

# ===== Invalidation / dependency map (spec §6) — the heart of cost control =====
# A change to a metadata field dirties only the listed blocks; "ALL" = full crop reset.
# Operation/task logs are deliberately ABSENT → they are context, not knowledge, and must
# never trigger (paid) research (spec §6 critical rule).
DEPENDENCY_MAP: dict[str, Any] = {
    "crop_type": "ALL",
    "variety": "ALL",
    "planting_date": ["index_norms", "phenology"],          # age changes norms/phenology
    "geometry": ["soil_profile"],                            # + zone re-resolve (handled by caller)
    "irrigation_method": ["water_requirements"],
    "irrigation_available": ["water_requirements"],
    "seeding_density": ["index_norms"],
    "growth_stage": ["index_norms", "phenology"],
}
# Non-metadata triggers with a fixed target block.
SCOUTING_BLOCKS = ["pest_disease"]


def blocks_for_change(changed_fields: Iterable[str]) -> list[str]:
    """Map a set of changed metadata field names → the union of blocks to refresh.
    Returns the sentinel ['ALL'] when any change forces a full reset."""
    out: set[str] = set()
    for f in changed_fields:
        dep = DEPENDENCY_MAP.get(f)
        if dep == "ALL":
            return ["ALL"]
        if isinstance(dep, list):
            out.update(dep)
    return sorted(out)


def input_hash(payload: Any) -> str:
    """Stable hash of the inputs a block was built from (staleness detection)."""
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


# ===== Zone resolution (rayon) — spec D3 =====
_AZ_MAP = str.maketrans({"ə": "e", "ı": "i", "ö": "o", "ü": "u", "ç": "c",
                         "ş": "s", "ğ": "g", "Ə": "e", "İ": "i"})


def _norm_zone(name: str) -> str:
    """Normalize a rayon label to a stable zone_id so free-text 'Balakən rayonu' and a
    reverse-geocoded 'Balakan District' collapse to the same key ('balaken')."""
    s = (name or "").strip().lower()
    for junk in (" rayonu", " rayon", " district", " r.", " şəhəri", " city"):
        s = s.replace(junk, "")
    s = s.translate(_AZ_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = "-".join(s.split())
    return s or "unknown"


async def resolve_zone(lat: float, lon: float, region_hint: Optional[str] = None) -> str:
    """Rayon code for the field. Reverse-geocode via OSM Nominatim (free, admin-level),
    falling back to the farmer's free-text region, then 'az-unknown'. Callers should cache
    the result (field_context block) so this network hit runs once per field, not per read."""
    from ..config import settings
    base = (getattr(settings, "nominatim_base", "") or "https://nominatim.openstreetmap.org").rstrip("/")
    try:
        js = await get_json(
            f"{base}/reverse",
            params={"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 8, "accept-language": "az"},
            headers={"User-Agent": "BagbanAI/1.0 (+https://agradex.com)"},
            timeout=8.0, retries=1)
        addr = (js or {}).get("address", {}) or {}
        rayon = (addr.get("county") or addr.get("state_district")
                 or addr.get("municipality") or addr.get("city") or addr.get("town"))
        if rayon:
            return f"az-{_norm_zone(rayon)}"
    except Exception:  # noqa: BLE001 — geocode is best-effort
        pass
    if region_hint:
        return f"az-{_norm_zone(region_hint)}"
    return "az-unknown"


# ===== zone_knowledge read/write =====
def _as_obj(v: Any) -> Any:
    return json.loads(v) if isinstance(v, str) else v


async def read_zone_blocks(conn, crop_type: str, zone_id: str) -> dict[str, dict]:
    """All fresh zone blocks for (crop_type, zone_id), keyed by block_type. Rows past
    expires_at are omitted so the orchestrator re-researches them."""
    rows = await conn.fetch(
        """select block_type, content, sources, season_context, confidence, refreshed_at
           from public.zone_knowledge
           where crop_type=$1 and zone_id=$2
             and (expires_at is null or expires_at > now())""", crop_type, zone_id)
    out: dict[str, dict] = {}
    for r in rows:
        out[r["block_type"]] = {
            "content": _as_obj(r["content"]),
            "sources": _as_obj(r["sources"]),
            "season_context": r["season_context"],
            "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
            "refreshed_at": r["refreshed_at"].isoformat() if r["refreshed_at"] else None,
        }
    return out


async def upsert_zone_block(conn, crop_type: str, zone_id: str, block_type: str,
                            content: Any, sources: list, *, season_context: str = "any",
                            derived_from: str = "external", confidence: Optional[float] = None,
                            ttl_days: Optional[int] = 180) -> None:
    await conn.execute(
        """insert into public.zone_knowledge
             (crop_type, zone_id, block_type, content, sources, season_context,
              derived_from, confidence, expires_at)
           values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,
                   case when $9::int is null then null else now() + ($9::int || ' days')::interval end)
           on conflict (crop_type, zone_id, block_type, season_context) do update set
             content=excluded.content, sources=excluded.sources, derived_from=excluded.derived_from,
             confidence=excluded.confidence, refreshed_at=now(), expires_at=excluded.expires_at,
             version=public.zone_knowledge.version + 1""",
        crop_type, zone_id, block_type, json.dumps(content, ensure_ascii=False),
        json.dumps(sources, ensure_ascii=False), season_context, derived_from, confidence, ttl_days)


# ===== field_knowledge read/write =====
async def read_field_blocks(conn, field_id: str) -> dict[str, dict]:
    rows = await conn.fetch(
        """select block_type, content, sources, input_hash, confidence, refreshed_at
           from public.field_knowledge where field_id=$1::uuid""", field_id)
    out: dict[str, dict] = {}
    for r in rows:
        out[r["block_type"]] = {
            "content": _as_obj(r["content"]),
            "sources": _as_obj(r["sources"]),
            "input_hash": r["input_hash"],
            "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
            "refreshed_at": r["refreshed_at"].isoformat() if r["refreshed_at"] else None,
        }
    return out


async def upsert_field_block(conn, field_id: str, org_id: str, block_type: str,
                             content: Any, sources: list, input_hash_val: str,
                             confidence: Optional[float] = None) -> None:
    await conn.execute(
        """insert into public.field_knowledge
             (field_id, org_id, block_type, content, sources, input_hash, confidence)
           values ($1::uuid,$2::uuid,$3,$4::jsonb,$5::jsonb,$6,$7)
           on conflict (field_id, block_type) do update set
             content=excluded.content, sources=excluded.sources, input_hash=excluded.input_hash,
             confidence=excluded.confidence, refreshed_at=now(),
             version=public.field_knowledge.version + 1""",
        field_id, org_id, block_type, json.dumps(content, ensure_ascii=False),
        json.dumps(sources, ensure_ascii=False), input_hash_val, confidence)


async def load_passport(conn, field_id: str, crop_type: Optional[str],
                        zone_id: Optional[str]) -> dict[str, Any]:
    """Merged knowledge passport (zone + field blocks) for advice/context (M6).
    Safe on partial data — returns whatever blocks exist."""
    passport: dict[str, Any] = {"zone": {}, "field": {}}
    if crop_type and zone_id:
        passport["zone"] = await read_zone_blocks(conn, crop_type, zone_id)
    passport["field"] = await read_field_blocks(conn, field_id)
    return passport
