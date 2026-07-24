"""Receipt photo → expense extract (HYBRID_PLAN W7 / B17). A farmer photographs a shop receipt or
invoice (gübrə, dərman, yanacaq…); Claude vision reads the vendor, date, total, currency and line
items so the ledger entry can be drafted instead of typed. Same vision path as T24 soil-lab OCR
(llm.complete_vision_structured) and the same graceful degradation: no key configured → None, the
caller still stores the document and asks the farmer to fill the cost by hand.

The extract is ONLY a draft — public.field_operations is written by the router when the user
confirms (or passes create_operation=true), never silently here."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from . import llm

SYSTEM = (
    "Sən kənd təsərrüfatı qəbzlərini/fakturalarını oxuyan köməkçisən. Sənə bir qəbzin şəkli verilir. "
    "Yalnız şəkildə AÇIQ görünən məlumatı struktur formata çıxar. Qaydalar:\n"
    "- Şəkildə olmayan sahə üçün null qoy — TƏXMİN ETMƏ, uydurma.\n"
    "- vendor = mağaza/təchizatçı adı (qəbzin başlığı).\n"
    "- purchase_date = qəbzin tarixi, MÜTLƏQ 'YYYY-MM-DD' formatında (məs. 2026-07-14).\n"
    "- total = yekun ödənilən məbləğ (ƏDV daxil, ən böyük 'CƏMİ/YEKUN/TOTAL' dəyəri), yalnız rəqəm.\n"
    "- currency = valyuta kodu: AZN | USD | EUR | TRY.\n"
    "- category = alışın növü, yalnız bunlardan biri: gübrə | pestisid | toxum | yanacaq | texnika | "
    "işçi | suvarma | digər.\n"
    "- items = sətir-sətir mallar (ad, miqdar, vahid, qiymət). Oxunmayan sətri buraxma.\n"
    "- Şəkil aydın deyilsə əminliyi 'aşağı' göstər.\n"
    "- Bütün mətn Azərbaycan dilində."
)

USER = "Bu qəbzdəki satıcı, tarix, yekun məbləğ, valyuta, kateqoriya və malların siyahısını çıxar."


class ReceiptItem(BaseModel):
    name: Optional[str] = Field(default=None, description="Malın adı, məs. 'Ammonium nitrat'")
    qty: Optional[float] = Field(default=None, description="Miqdar, yalnız rəqəm")
    unit: Optional[str] = Field(default=None, description="Ölçü vahidi, məs. 'kq', 'litr', 'ədəd'")
    price: Optional[float] = Field(default=None, description="Sətir üzrə məbləğ (rəqəm)")


class ReceiptResult(BaseModel):
    vendor: Optional[str] = Field(default=None, description="Mağaza / təchizatçı adı")
    purchase_date: Optional[str] = Field(default=None, description="Qəbzin tarixi 'YYYY-MM-DD'")
    total: Optional[float] = Field(default=None, description="Yekun məbləğ (rəqəm)")
    currency: Optional[str] = Field(default=None, description="Valyuta kodu: AZN | USD | EUR | TRY")
    category: Optional[str] = Field(
        default=None,
        description="Alışın növü: gübrə | pestisid | toxum | yanacaq | texnika | işçi | suvarma | digər")
    items: list[ReceiptItem] = Field(default_factory=list, description="Qəbzdəki mal sətirləri")
    confidence: str = Field(description="Oxunun əminliyi: aşağı | orta | yüksək")


async def parse_receipt(conn, field_id: str, org_id: str, images: list[tuple[str, bytes]], *,
                        model: str | None = None) -> Optional[dict]:
    """Vision-parse a receipt image. Returns {"parsed": {...}, "model_name": str} or None when no
    LLM is configured. Raises llm.LLMUnavailable if the model cannot produce structured output —
    the caller degrades to "saved, fill the cost by hand"."""
    if not llm.is_configured():
        return None

    result, usage = await llm.complete_vision_structured(
        SYSTEM, USER, images, ReceiptResult, model=model)
    p = result.model_dump()

    try:
        from . import usage as ai_usage
        await ai_usage.record_usage(
            conn, kind="receipt", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            org_id=org_id, user_id=None, field_id=field_id)
    except Exception:  # noqa: BLE001 — usage accounting must never fail the upload
        pass

    return {"parsed": p, "model_name": usage.get("model")}
