"""Phase-1 research orchestrator (knowledge layer M3, spec §8).

Builds a field's Knowledge Passport BEFORE / independently of satellite data:
  * structured APIs (no LLM, no hallucination): SoilGrids → soil_profile, FAOSTAT → yield,
    EPPO → pest list. These run and persist even with NO LLM key configured.
  * one LLM web-research + one synthesis pass (spec P3): crop_profile, phenology,
    water_requirements, pest_disease, agro_practice — cached at the ZONE layer so the same
    (crop_type, rayon) is researched once and serves every field in it.

Everything degrades gracefully: a missing key or an unreachable source drops that block,
never the whole run. Called by the research_jobs worker and by the manual-refresh endpoint."""
from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field

from . import knowledge as kb
from . import llm

# Zone blocks the LLM synthesizes (structured-API blocks are handled separately).
_SYNTH_BLOCKS = ["crop_profile", "phenology", "water_requirements", "pest_disease", "agro_practice"]


def _season(d: date) -> str:
    m = d.month
    return ("winter" if m in (12, 1, 2) else "spring" if m in (3, 4, 5)
            else "summer" if m in (6, 7, 8) else "autumn")


class ZoneBlock(BaseModel):
    block_type: Literal["crop_profile", "phenology", "water_requirements",
                        "pest_disease", "agro_practice"]
    summary: str = Field(description="1-2 cümləlik xülasə (Azərbaycanca)")
    details: list[str] = Field(description="Konkret, mənbəyə əsaslanan faktlar/tövsiyələr")
    confidence: float = Field(ge=0.0, le=1.0, description="Mənbələrin gücünə görə 0..1")


class ZoneSynthesis(BaseModel):
    blocks: list[ZoneBlock] = Field(description="Yalnız mənbələrlə dəstəklənən bloklar")


_SYNTH_SYSTEM = (
    "Sən aqronomik bilik sintez edən köməkçisən. Sənə bir bitki növü və Azərbaycan rayonu "
    "verilir; sən veb axtarışdan topladığın faktları QISA, struktur bloklara çevir. "
    "Qaydalar:\n"
    "- YALNIZ tapdığın mənbələrə əsaslan; uydurma. Dəstəklənməyən bloku buraxma.\n"
    "- Hər blok Azərbaycan dilində, fermerə yönəlik, praktiki olsun.\n"
    "- Konkret rəqəm (temperatur, gün, doza) yalnız mənbədə varsa yaz.\n"
    "- block_type yalnız: crop_profile, phenology, water_requirements, pest_disease, agro_practice."
)


async def _synthesize_zone(crop_type: str, zone_label: str) -> tuple[list[dict], list[dict], dict]:
    """web_research (search) → structured synthesis (spec P3). Returns (blocks, citations, usage).
    Raises llm.LLMUnavailable when the LLM/search is not configured."""
    research_prompt = (
        f"Bitki: {crop_type}. Region: {zone_label}, Azərbaycan (Cənubi Qafqaz iqlimi).\n"
        "Aşağıdakılar üçün mötəbər mənbələrdən (FAO, Ecocrop, universitet extension, EPPO, "
        "elmi məqalələr) məlumat topla:\n"
        "1) Bitkinin fiziologiyası və böyümə mərhələləri (crop_profile)\n"
        "2) Fenoloji təqvim — hansı ayda hansı mərhələ (phenology)\n"
        "3) Su tələbatı, suvarma normaları, Kc əmsalları (water_requirements)\n"
        "4) Bu regionda tipik zərərvericilər/xəstəliklər və mövsümi risk (pest_disease)\n"
        "5) Gübrələmə, budama, becərmə praktikası (agro_practice)"
    )
    text, citations, usage1 = await llm.web_research(
        "Sən kənd təsərrüfatı üzrə tədqiqatçısan. Mötəbər mənbələrdən dəqiq məlumat topla və "
        "mənbələri göstər.", research_prompt, max_uses=6)
    synth_user = (
        f"Bitki: {crop_type}, Region: {zone_label}.\n"
        f"Veb axtarışdan toplanan məlumat:\n{text}\n\n"
        "Bunu struktur bloklara çevir (yalnız dəstəklənənləri)."
    )
    result, usage2 = await llm.complete_structured(_SYNTH_SYSTEM, synth_user, ZoneSynthesis)
    blocks = [b.model_dump() for b in result.blocks if b.block_type in _SYNTH_BLOCKS]
    usage = {"provider": usage2["provider"], "model": usage2["model"],
             "input_tokens": usage1["input_tokens"] + usage2["input_tokens"],
             "output_tokens": usage1["output_tokens"] + usage2["output_tokens"]}
    return blocks, citations, usage


async def research_field(conn, field_id: str, blocks: Optional[list[str]] = None) -> dict:
    """Run Phase-1 research for a field. `blocks` limits the refresh (from the invalidation
    map); None/['ALL'] = everything. Returns a summary dict (written blocks, zone, degraded)."""
    row = await conn.fetchrow(
        """select f.org_id, f.name,
                  st_y(coalesce(f.centroid, st_centroid(f.geom))) as lat,
                  st_x(coalesce(f.centroid, st_centroid(f.geom))) as lon,
                  m.crop_type, m.region, m.planting_date
           from public.fields f
           left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    if not row:
        return {"ok": False, "reason": "field_not_found"}
    org_id = str(row["org_id"])
    crop_type = row["crop_type"]
    lat, lon = row["lat"], row["lon"]
    want = None if not blocks or "ALL" in blocks else set(blocks)

    def wants(b: str) -> bool:
        return want is None or b in want

    written: list[str] = []
    degraded: list[str] = []
    total_usage: Optional[dict] = None

    # --- Zone resolution (cached in field_context) ---
    zone_id = await kb.resolve_zone(lat, lon, row["region"])
    zone_label = row["region"] or zone_id.replace("az-", "").replace("-", " ")
    await kb.upsert_field_block(
        conn, field_id, org_id, "field_context",
        {"zone_id": zone_id, "lat": lat, "lon": lon,
         "planting_date": row["planting_date"].isoformat() if row["planting_date"] else None},
        [], kb.input_hash({"zone": zone_id, "lat": lat, "lon": lon}))
    written.append("field_context")

    # --- FIELD structured: SoilGrids → soil_profile (keyless) ---
    if wants("soil_profile"):
        try:
            from .sources import soilgrids
            res = await soilgrids.fetch_soil(lat, lon)
            if res.ok:
                await kb.upsert_field_block(
                    conn, field_id, org_id, "soil_profile", res.data, [res.source],
                    kb.input_hash({"lat": lat, "lon": lon}), confidence=res.source.get("confidence"))
                written.append("soil_profile")
            else:
                degraded.append(f"soil_profile:{res.error}")
        except Exception as exc:  # noqa: BLE001
            degraded.append(f"soil_profile:{exc}")

    # --- ZONE structured: FAOSTAT yield + EPPO pests (crop-scoped, shared) ---
    if crop_type:
        try:
            from .sources import faostat
            fy = await faostat.fetch_yield(crop_type)
            if fy.ok:
                await kb.upsert_zone_block(conn, crop_type, "az", "faostat_yield",
                                           fy.data, [fy.source], confidence=fy.source.get("confidence"))
        except Exception as exc:  # noqa: BLE001
            degraded.append(f"faostat:{exc}")
        if wants("pest_disease"):
            try:
                from .sources import eppo
                ep = await eppo.fetch_pests(crop_type)
                if ep.ok:
                    await kb.upsert_zone_block(conn, crop_type, zone_id, "pest_disease_eppo",
                                               ep.data, [ep.source], confidence=ep.source.get("confidence"))
                else:
                    degraded.append(f"eppo:{ep.error}")
            except Exception as exc:  # noqa: BLE001
                degraded.append(f"eppo:{exc}")

    # --- ZONE LLM synthesis (best-effort; skipped without a key) ---
    if crop_type and (want is None or want & set(_SYNTH_BLOCKS)):
        try:
            season = _season(date.today())
            syn_blocks, citations, usage = await _synthesize_zone(crop_type, zone_label)
            total_usage = usage
            for b in syn_blocks:
                if not wants(b["block_type"]):
                    continue
                sc = season if b["block_type"] in ("phenology", "pest_disease") else "any"
                await kb.upsert_zone_block(
                    conn, crop_type, zone_id, b["block_type"],
                    {"summary": b["summary"], "details": b["details"]},
                    citations, season_context=sc, confidence=b.get("confidence"))
                written.append(f"zone:{b['block_type']}")
        except llm.LLMUnavailable:
            degraded.append("synthesis:llm_not_configured")
        except Exception as exc:  # noqa: BLE001
            degraded.append(f"synthesis:{exc}")

    return {"ok": True, "field_id": field_id, "org_id": org_id, "crop_type": crop_type,
            "zone_id": zone_id, "written": written, "degraded": degraded, "usage": total_usage}
