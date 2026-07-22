"""Photo disease/pest diagnosis via Claude vision (T5 / E7 / C1).

A farmer uploads a leaf/plant/fruit photo; we send it + light field context to the vision model and
get a structured Azerbaijani diagnosis. SAFETY (spec Rule 7): NEVER a specific pesticide name or
dose — only the problem TYPE, general management steps, and a pointer to the official registered-
product list + an agronomist referral. Rule 6: the confidence field is calibrated ("aşağı" when the
image is unclear) so the tone never over-promises."""
from __future__ import annotations

import json

from pydantic import BaseModel, Field

from . import llm

SYSTEM = (
    "Sən Azərbaycan fermerləri üçün aqronom köməkçisisən. Sənə bitkinin (yarpaq/gövdə/meyvə) şəkli "
    "və qısa sahə konteksti verilir. Şəkildən görünəni obyektiv təsvir et və ehtimal olunan problemi "
    "TƏYİN et (xəstəlik/zərərverici/qidalanma çatışmazlığı/su stresi/normal). "
    "MÜTLƏQ QAYDALAR: (1) Heç vaxt konkret pestisid/gübrə brend adı və ya dozası vermə — yalnız "
    "problem tipini, ümumi aqrotexniki addımları və 'Azərbaycanda qeydiyyatdan keçmiş preparatlar "
    "siyahısına baxın və aqronomla məsləhətləşin' tövsiyəsini ver. (2) Şəkil aydın deyilsə və ya "
    "əmin deyilsənsə, əminliyi 'aşağı' göstər və vizual yoxlama tövsiyə et. (3) Bütün cavab "
    "Azərbaycan dilində."
)


class PhotoDiagnosis(BaseModel):
    problem_type: str = Field(description="Qısa problem tipi, məs. 'Göbələk xəstəliyi (yarpaq ləkəsi)' və ya 'Normal'")
    confidence: str = Field(description="Əminlik: aşağı | orta | yüksək")
    observations: str = Field(description="Şəkildə görünənlərin obyektiv təsviri")
    likely_causes: list[str] = Field(default_factory=list, description="Ehtimal olunan səbəblər")
    recommended_actions: list[str] = Field(default_factory=list, description="Ümumi addımlar (pestisid adı/doza YOX)")
    disclaimer: str = Field(description="Məsuliyyət qeydi + aqronom/qeydiyyatlı preparat göstərici")


async def _light_context(conn, field_id: str) -> dict:
    row = await conn.fetchrow(
        """select m.crop_type, m.variety, m.growth_stage, f.name
           from public.fields f left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    return {k: row[k] for k in ("crop_type", "variety", "growth_stage", "name")} if row else {}


async def diagnose_photo(conn, field_id: str, org_id: str, images: list[tuple[str, bytes]], *,
                         model: str | None = None) -> dict:
    """Run the vision diagnosis, persist it, and record AI usage. Returns the diagnosis dict."""
    ctx = await _light_context(conn, field_id)
    user = ("Sahə konteksti (JSON):\n" + json.dumps(ctx, ensure_ascii=False)
            + "\n\nBu şəkildəki bitkinin vəziyyətini diaqnoz et.")
    result, usage = await llm.complete_vision_structured(SYSTEM, user, images, PhotoDiagnosis, model=model)
    payload = result.model_dump()

    row = await conn.fetchrow(
        """insert into public.photo_diagnoses (field_id, org_id, result, model_name)
           values ($1::uuid,$2::uuid,$3::jsonb,$4) returning id, created_at""",
        field_id, org_id, json.dumps(payload, ensure_ascii=False), usage.get("model"))
    try:
        from . import usage as ai_usage
        await ai_usage.record_usage(
            conn, kind="photo", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            org_id=org_id, user_id=None, field_id=field_id)
    except Exception:  # noqa: BLE001 — usage accounting is best-effort
        pass
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat(), **payload}
