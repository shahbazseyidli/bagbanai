"""AI agronomic advice: NASA indices + crop data + completed work → summary,
risks, recommendations, next steps (Azerbaijani). Stored in public.advice; when
the advice materially changes vs the previous one, notify the farmer (in-app + email)."""
from __future__ import annotations

import json
from typing import Literal, Optional

from pydantic import BaseModel, Field

from . import llm, notify, usage as ai_usage
from .context import build_field_context

DISCLAIMER = ("Bu məsləhətlər peyk və sahə məlumatlarına əsaslanan avtomatik təhlildir; "
              "yekun qərar üçün sahəni yerində yoxlayın.")


class Risk(BaseModel):
    title: str = Field(description="Riskin qısa adı (Azərbaycanca)")
    severity: Literal["aşağı", "orta", "yüksək"]
    detail: str = Field(description="Riskin izahı və nəyə əsaslandığı")


class Recommendation(BaseModel):
    title: str
    detail: str


class AdviceResult(BaseModel):
    summary: str = Field(description="Sahənin cari vəziyyətinin 2-3 cümləlik xülasəsi")
    risks: list[Risk]
    recommendations: list[Recommendation]
    next_steps: list[str] = Field(description="Konkret, ardıcıl növbəti addımlar")


SYSTEM = (
    "Sən Azərbaycan fermerləri üçün təcrübəli aqronomsan. Sənə bir sahənin NASA peyk "
    "indeksləri (NDVI bitki sağlamlığı, NDMI bitki nəmliyi, NDWI su, EVI, SAVI, NBR), "
    "məhsul metadatası və görülmüş işləri (skautinq, əməliyyatlar, tapşırıqlar) JSON kimi "
    "verilir. Bu məlumatlara ƏSASLANARAQ praktiki məsləhət ver.\n"
    "Qaydalar:\n"
    "- Yalnız verilən dataya əsaslan; məlumat yoxdursa uydurma, çatışmazlığı qeyd et.\n"
    "- NDVI düşürsə su/qida stresi, xəstəlik və ya mövsümi dəyişiklik ola bilər — konteksti nəzərə al.\n"
    "- Məhsula (məs. fındıq) və inkişaf mərhələsinə uyğun məsləhət ver.\n"
    "- Qısa, aydın, Azərbaycan dilində yaz. Fermerə birbaşa müraciət et.\n"
    "- Risk şiddəti yalnız: aşağı, orta, yüksək."
)


def _signature(risks: list[dict], recs: list[dict]) -> str:
    """Stable signature to detect material changes between advice generations."""
    r = sorted(f"{x.get('title','')}|{x.get('severity','')}" for x in risks)
    c = sorted(x.get("title", "") for x in recs)
    return json.dumps({"r": r, "c": c}, ensure_ascii=False)


async def generate_and_store(conn, field_id: str) -> Optional[dict]:
    """Generate advice for a field, store it, and notify on material change.
    Returns the stored advice dict, or None if the LLM is not configured."""
    if not llm.is_configured():
        return None

    ctx = await build_field_context(conn, field_id)
    field_row = await conn.fetchrow(
        "select org_id, name from public.fields where id=$1::uuid", field_id)
    if not field_row:
        return None
    org_id = str(field_row["org_id"])
    field_name = field_row["name"]

    user = ("Sahə məlumatları (JSON):\n" + json.dumps(ctx, ensure_ascii=False, indent=2)
            + "\n\nBu sahə üçün xülasə, risklər, məsləhətlər və növbəti addımları çıxar.")

    try:
        result, usage = await llm.complete_structured(SYSTEM, user, AdviceResult)
    except llm.LLMUnavailable:
        return None

    provider, model = llm.model_info()
    findings = {
        "risks": [r.model_dump() for r in result.risks],
        "recommendations": [r.model_dump() for r in result.recommendations],
        "next_steps": result.next_steps,
    }

    # Previous advice signature (before inserting the new one).
    prev = await conn.fetchrow(
        "select findings from public.advice where field_id=$1::uuid "
        "order by generated_at desc limit 1", field_id)
    prev_sig = None
    if prev and prev["findings"]:
        pf = prev["findings"] if isinstance(prev["findings"], dict) else json.loads(prev["findings"])
        prev_sig = _signature(pf.get("risks", []), pf.get("recommendations", []))
    new_sig = _signature(findings["risks"], findings["recommendations"])

    await conn.execute(
        """insert into public.advice
             (field_id, org_id, model_provider, model_name, input_snapshot,
              summary, findings, disclaimer)
           values ($1::uuid,$2::uuid,$3,$4,$5::jsonb,$6,$7::jsonb,$8)""",
        field_id, org_id, provider, model, json.dumps(ctx),
        result.summary, json.dumps(findings), DISCLAIMER)

    # Record token usage / cost, attributed to the org owner (best-effort).
    try:
        owner_id = await conn.fetchval(
            "select owner_id from public.organizations where id=$1::uuid", org_id)
        await ai_usage.record_usage(
            conn, kind="advice", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            org_id=org_id, user_id=str(owner_id) if owner_id else None, field_id=field_id)
    except Exception:
        pass

    changed = prev_sig is not None and prev_sig != new_sig
    is_first = prev_sig is None
    if changed or is_first:
        await _notify(conn, field_id, org_id, field_name, result, changed)

    return {"summary": result.summary, "findings": findings, "disclaimer": DISCLAIMER,
            "model_provider": provider, "model_name": model}


async def _notify(conn, field_id: str, org_id: str, field_name: str,
                  result: AdviceResult, changed: bool) -> None:
    top = max((r for r in result.risks), key=lambda r: {"aşağı": 1, "orta": 2, "yüksək": 3}.get(r.severity, 0),
              default=None)
    sev = {"aşağı": "info", "orta": "warning", "yüksək": "critical"}.get(top.severity if top else "", "info")
    title = ("“%s”: yeni AI məsləhəti" % field_name) if changed else ("“%s”: ilk AI təhlili hazırdır" % field_name)
    body = result.summary
    await conn.execute(
        """insert into public.notifications
             (field_id, org_id, source, type, severity, title, body, delivered_channels)
           values ($1::uuid,$2::uuid,'vegetation','ai_advice',$3,$4,$5,array['inapp'])""",
        field_id, org_id, sev, title, body)

    # Email the org owner (best-effort; skipped if SMTP not configured).
    owner = await conn.fetchrow(
        """select u.email from public.organizations o
           join public.users u on u.id=o.owner_id where o.id=$1::uuid""", org_id)
    if owner and owner["email"]:
        lines = [body, "", "Risklər:"]
        lines += [f"• [{r.severity}] {r.title} — {r.detail}" for r in result.risks] or ["• (yoxdur)"]
        lines += ["", "Məsləhətlər:"]
        lines += [f"• {r.title}: {r.detail}" for r in result.recommendations]
        lines += ["", "Növbəti addımlar:"] + [f"{i+1}. {s}" for i, s in enumerate(result.next_steps)]
        lines += ["", DISCLAIMER, "", "— Bağban AI · https://agradex.com"]
        await notify.send_email(owner["email"], title, "\n".join(lines))
