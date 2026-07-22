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
        "mənbələri göstər.", research_prompt, max_uses=4)
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


# ===== T17: per-crop vegetation-index calibration (write-back to crop_thresholds.index_norms) =====

class CropIndexBands(BaseModel):
    """Per-index band edges [e1,e2,e3,e4] splitting the 5 status tiers (çox zəif → çox sağlam).
    Only NDVI is required; other indices may be null when the sources don't support them."""
    ndvi: list[float] = Field(description="4 artan kənar (0..1): çox-zəif|zəif|orta|sağlam sərhədləri")
    evi: Optional[list[float]] = Field(default=None, description="4 artan kənar (0..1) və ya null")
    savi: Optional[list[float]] = Field(default=None, description="4 artan kənar (0..1) və ya null")
    ndre: Optional[list[float]] = Field(default=None, description="4 artan kənar (0..1) və ya null")
    cire: Optional[list[float]] = Field(default=None, description="4 artan kənar (0..~5) və ya null")
    rationale: str = Field(description="Bantların bitki örtüyü sıxlığı/mərhələsinə görə əsaslandırması")


_NORMS_SYSTEM = (
    "Sən dəqiq əkinçilik kalibrasiyası üzrə mütəxəssissən. Sənə bitki növü və Azərbaycan regionu "
    "verilir. Peyk vegetasiya indeksləri üçün 5 status pilləsini (çox zəif, zəif, orta, sağlam, çox "
    "sağlam) ayıran 4 ARTAN kənar dəyər ver. Qaydalar:\n"
    "- Dəyərlər həmin bitkinin TİPİK sağlam mövsümi zirvəsinə uyğun olsun (sıx meşəbağ yüksək NDVI, "
    "seyrək/cavan əkin aşağı NDVI).\n"
    "- NDVI/EVI/SAVI/NDRE 0..1; kənarlar ciddi artan olmalı; CIre 0..~5.\n"
    "- Əmin olmadığın indeksi null burax. Uydurma — yalnız aqronomik cəhətdən əsaslı dəyərlər."
)


def _valid_edges(v, lo: float, hi: float) -> Optional[list[float]]:
    """Accept only a strictly-increasing 4-tuple within [lo, hi]; else None."""
    if not v or len(v) != 4 or any(not isinstance(x, (int, float)) for x in v):
        return None
    v = [float(x) for x in v]
    if not all(lo <= x <= hi for x in v) or not all(v[i] < v[i + 1] for i in range(3)):
        return None
    return v


async def _synthesize_index_norms(crop_type: str, zone_label: str) -> tuple[dict, dict]:
    """Structured LLM → validated per-crop vegetation-index band edges. Returns (norms, usage);
    norms is {} if nothing validated. Raises llm.LLMUnavailable when not configured."""
    user = (f"Bitki: {crop_type}. Region: {zone_label}, Azərbaycan (Cənubi Qafqaz iqlimi).\n"
            "Bu bitki üçün NDVI, EVI, SAVI, NDRE və CIre indekslərinin status kənarlarını ver.")
    res, usage = await llm.complete_structured(_NORMS_SYSTEM, user, CropIndexBands)
    norms: dict = {}
    for key, lo, hi in (("NDVI", -0.1, 1.0), ("EVI", -0.1, 1.0), ("SAVI", -0.1, 1.0),
                        ("NDRE", -0.1, 1.0), ("CIre", 0.0, 6.0)):
        edges = _valid_edges(getattr(res, key.lower()), lo, hi)
        if edges:
            norms[key] = edges
    return norms, usage


async def _writeback_norms(conn, crop_type: str, norms: dict) -> None:
    """Write researched bands to crop_thresholds.index_norms for (crop,'all','all'), but NEVER
    over a curated seed: only rows with NULL index_norms or norms_source='research' are (re)written."""
    import json
    await conn.execute(
        """insert into public.crop_thresholds
             (crop_type, growth_stage, age_class, index_norms, norms_source, norms_updated_at)
           values ($1,'all','all',$2::jsonb,'research', now())
           on conflict (crop_type, growth_stage, age_class) do update
             set index_norms=excluded.index_norms, norms_source='research', norms_updated_at=now()
             where crop_thresholds.index_norms is null
                or crop_thresholds.norms_source='research'""",
        crop_type, json.dumps(norms))


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
    # T24: a lab soil analysis takes precedence over SoilGrids — don't clobber it.
    lab_soil = bool(await conn.fetchval(
        "select 1 from public.soil_profiles where field_id=$1::uuid and source='lab' limit 1",
        field_id)) if wants("soil_profile") else False
    if wants("soil_profile") and lab_soil:
        written.append("soil_profile:lab")
    if wants("soil_profile") and not lab_soil:
        try:
            from .sources import soilgrids
            from . import soil as soil_calc
            res = await soilgrids.fetch_soil(lat, lon)
            if res.ok:
                content = dict(res.data)
                sources = [res.source]
                # E1: derive FAO-56 water-holding params (FC/WP/TAW/RAW) from the texture so
                # B2 irrigation can use them without recomputing (Saxton-Rawls pedotransfer).
                swp = soil_calc.soil_water_params(res.data, crop_type)
                if swp:
                    content["water_params"] = swp
                    sources.append(swp["source"])
                await kb.upsert_field_block(
                    conn, field_id, org_id, "soil_profile", content, sources,
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

    # --- Per-crop vegetation-index calibration → crop_thresholds.index_norms write-back (T17) ---
    if crop_type and wants("index_norms") and llm.is_configured():
        try:
            norms, norms_usage = await _synthesize_index_norms(crop_type, zone_label)
            if norms:
                await _writeback_norms(conn, crop_type, norms)
                # Keep a zone-level audit record of the researched bands + provenance.
                await kb.upsert_zone_block(conn, crop_type, zone_id, "index_norms",
                                           {"norms": norms}, [], confidence=0.6)
                written.append("crop_index_norms")
                if total_usage:
                    total_usage["input_tokens"] += norms_usage["input_tokens"]
                    total_usage["output_tokens"] += norms_usage["output_tokens"]
                else:
                    total_usage = norms_usage
        except llm.LLMUnavailable:
            degraded.append("index_norms:llm_not_configured")
        except Exception as exc:  # noqa: BLE001
            degraded.append(f"index_norms:{exc}")

    return {"ok": True, "field_id": field_id, "org_id": org_id, "crop_type": crop_type,
            "zone_id": zone_id, "written": written, "degraded": degraded, "usage": total_usage}
