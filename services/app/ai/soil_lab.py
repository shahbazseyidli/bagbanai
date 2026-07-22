"""Lab soil-analysis OCR (T24 / E1b). A farmer or agronomist uploads a photo/scan of a soil
laboratory report; Claude vision extracts the structured values (pH, humus, N/P/K, texture, EC,
CaCO3). Reuses the T5 vision path (llm.complete_vision_structured). The parsed profile is stored in
soil_profiles AND promoted to the field_knowledge 'soil_profile' block with source='lab', which the
knowledge passport / advice prefer over SoilGrids (precedence: lab > manual > soilgrids)."""
from __future__ import annotations

import json
from typing import Optional

from pydantic import BaseModel, Field

from . import knowledge as kb
from . import llm

SYSTEM = (
    "Sən torpaq laboratoriya analizlərini oxuyan köməkçisən. Sənə bir torpaq analizi hesabatının "
    "şəkli/skanı verilir. Yalnız şəkildə AÇIQ görünən dəyərləri struktur formata çıxar. Qaydalar:\n"
    "- Şəkildə olmayan göstərici üçün null qoy — TƏXMİN ETMƏ, uydurma.\n"
    "- pH, üzvi maddə (humus %), azot (N), fosfor (P2O5), kalium (K2O), mexaniki tərkib (texture), "
    "duzluluq (EC), karbonat (CaCO3 %) dəyərlərini axtar.\n"
    "- N/P/K üçün ölçü vahidi ilə birlikdə mətn kimi ver (məs. '25 mq/kq' və ya 'aşağı').\n"
    "- Şəkil aydın deyilsə əminliyi 'aşağı' göstər.\n"
    "- Bütün mətn (notes) Azərbaycan dilində."
)


class SoilLabResult(BaseModel):
    ph: Optional[float] = Field(default=None, description="Torpağın pH-ı, məs. 6.8")
    organic_matter_pct: Optional[float] = Field(default=None, description="Üzvi maddə / humus %")
    nitrogen: Optional[str] = Field(default=None, description="Azot (N) dəyəri + vahid, məs. '25 mq/kq'")
    phosphorus: Optional[str] = Field(default=None, description="Fosfor (P2O5) dəyəri + vahid")
    potassium: Optional[str] = Field(default=None, description="Kalium (K2O) dəyəri + vahid")
    texture: Optional[str] = Field(default=None, description="Mexaniki tərkib, məs. 'gilli-qumlu'")
    ec: Optional[float] = Field(default=None, description="Duzluluq / elektrik keçiriciliyi (dS/m)")
    caco3_pct: Optional[float] = Field(default=None, description="Karbonat CaCO3 %")
    notes: Optional[str] = Field(default=None, description="Əlavə qeyd (yalnız hesabatdan)")
    confidence: str = Field(description="Oxunun əminliyi: aşağı | orta | yüksək")


async def parse_and_store(conn, field_id: str, org_id: str, images: list[tuple[str, bytes]], *,
                          model: str | None = None) -> dict:
    """Vision-parse the report, persist to soil_profiles, and promote to the soil_profile passport
    block (lab precedence). Returns the parsed profile dict. Raises llm.LLMUnavailable if the model
    can't process the image."""
    user = "Bu torpaq laboratoriya analizi hesabatındakı göstəriciləri çıxar."
    result, usage = await llm.complete_vision_structured(SYSTEM, user, images, SoilLabResult, model=model)
    p = result.model_dump()

    row = await conn.fetchrow(
        """insert into public.soil_profiles
             (field_id, org_id, source, ph, organic_matter_pct, nitrogen, phosphorus, potassium,
              texture, ec, caco3_pct, parsed, notes, confidence, model_name)
           values ($1::uuid,$2::uuid,'lab',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)
           returning id, created_at""",
        field_id, org_id, p["ph"], p["organic_matter_pct"], p["nitrogen"], p["phosphorus"],
        p["potassium"], p["texture"], p["ec"], p["caco3_pct"],
        json.dumps(p, ensure_ascii=False), p["notes"], p["confidence"], usage.get("model"))

    # Promote to the knowledge passport — lab wins over SoilGrids (research skips its write when a
    # lab profile exists). Mark the source so provenance is explicit downstream.
    content = {"source": "lab", **{k: p[k] for k in (
        "ph", "organic_matter_pct", "nitrogen", "phosphorus", "potassium",
        "texture", "ec", "caco3_pct", "notes")}}
    await kb.upsert_field_block(
        conn, field_id, org_id, "soil_profile", content,
        [{"type": "lab_report", "confidence": 0.9}], kb.input_hash(content), confidence=0.9)

    try:
        from . import usage as ai_usage
        await ai_usage.record_usage(
            conn, kind="soil_lab", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            org_id=org_id, user_id=None, field_id=field_id)
    except Exception:  # noqa: BLE001 — usage accounting must never fail the upload
        pass

    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat(), **p}
