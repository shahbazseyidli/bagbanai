"""Field photo auto-labeling via the vision model (HYBRID_PLAN E10, 0031). A farmer snaps any field /
crop / tree / leaf photo; the vision model identifies WHAT it is (subject) + a coarse condition. The
photo + label are stored in field_photos and later feed the advice context, so AI recommendations
factor the visual state. Lighter than the T5 disease diagnosis: identification + condition only, no
treatment advice.

Vision runs on Gemini after the 2026-07-30 migration (DeepSeek accepts no images anywhere) — but
this module names no provider: ai/llm.py routes on VISION_PROVIDER and is the only file that knows.

METERED AS kind='photo_label', NOT 'photo'. Diagnosis owns 'photo', and that is the counter the
pricing page's "30 per month" refers to; when this automatic call shared it, filling the gallery
silently spent the diagnoses the farmer paid for."""
from __future__ import annotations

import json

from pydantic import BaseModel, Field

from . import llm

SYSTEM = (
    "Sən Azərbaycan fermerləri üçün aqronom köməkçisisən. Sənə bir təsərrüfat şəkli verilir "
    "(sahə/bitki/ağac/yarpaq/meyvə/torpaq). Şəkildə nə olduğunu QISA adlandır və ümumi vəziyyəti "
    "təyin et. Konkret pestisid/gübrə adı və ya doza VERMƏ. Bütün cavab Azərbaycan dilində, qısa."
)


class PhotoLabel(BaseModel):
    subject: str = Field(description="Şəkildə nə var — qısa ad, məs. 'Fındıq yarpağı', 'Bitki çətiri', 'Torpaq', 'Meyvə'")
    condition: str = Field(description="Ümumi vəziyyət (yalnız biri): healthy | stress | pest | disease | nutrient | other")
    notes: str = Field(description="1 cümlə obyektiv müşahidə (Azərbaycanca)")


async def label_and_store(conn, field_id: str, org_id: str, photo_path: str,
                          images: list[tuple[str, bytes]], *, model: str | None = None) -> dict:
    """Auto-label the image and persist a field_photos row. Returns the stored row dict."""
    crop = await conn.fetchval(
        "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
    user = (f"Sahə məhsulu: {crop or 'naməlum'}.\n\nBu şəkli adlandır və vəziyyətini təyin et.")
    result, usage = await llm.complete_vision_structured(SYSTEM, user, images, PhotoLabel, model=model)
    p = result.model_dump()
    row = await conn.fetchrow(
        """insert into public.field_photos
             (field_id, org_id, photo_path, ai_label, ai_condition, ai_notes, parsed, model_name)
           values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7::jsonb,$8)
           returning id, created_at""",
        field_id, org_id, photo_path, p.get("subject"), p.get("condition"), p.get("notes"),
        json.dumps(p, ensure_ascii=False), usage.get("model"))
    try:
        from . import usage as ai_usage
        await ai_usage.record_usage(
            conn, kind="photo_label", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            cache_read_tokens=usage.get("cache_read_tokens", 0),
            org_id=org_id, user_id=None, field_id=field_id,
            # The farmer pressed "upload", not "label this" — the labelling is our idea, so it is
            # 'auto' for the batch-API question (0056) even though a human is on the other end.
            source="auto")
    except Exception:  # noqa: BLE001 — usage accounting is best-effort
        pass
    return {"id": str(row["id"]), "field_id": field_id, "photo_path": photo_path,
            "ai_label": p.get("subject"), "ai_condition": p.get("condition"),
            "ai_notes": p.get("notes"), "created_at": row["created_at"].isoformat()}
