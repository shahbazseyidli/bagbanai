"""AI agronomic advice: satellite indices + crop data + completed work → summary,
risks, recommendations, next steps, written in the reader's language (`lang`, stored on
the row so the read path can tell). Stored in public.advice; when
the advice materially changes vs the previous one, notify the farmer **in-app only**.
Email is not sent per advice change (that fired every 2-3 days per field); the weekly
Wednesday digest reads the same change signal and reports it once."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from . import llm, usage as ai_usage
from .context import build_field_context

DISCLAIMER = ("Bu məsləhətlər peyk və sahə məlumatlarına əsaslanan avtomatik təhlildir; "
              "yekun qərar üçün sahəni yerində yoxlayın.")

# Phase 4 — advice can be generated in the caller's language. The severity CODES
# (aşağı/orta/yüksək) always stay Azerbaijani (the frontend maps them to badges); only the
# human-readable prose is written in the target language.
LANG_NAMES = {
    "az": "Azerbaijani (Azərbaycan dili)", "en": "English", "tr": "Turkish (Türkçe)",
    "de": "German (Deutsch)", "hu": "Hungarian (Magyar)", "it": "Italian (Italiano)",
    "pl": "Polish (Polski)", "ru": "Russian (Русский)",
}
DISCLAIMERS = {
    "az": DISCLAIMER,
    "en": "This advice is an automated analysis based on satellite and field data; verify on-site before deciding.",
    "tr": "Bu tavsiyeler uydu ve tarla verilerine dayanan otomatik bir analizdir; karar vermeden önce sahada doğrulayın.",
    "de": "Diese Empfehlungen sind eine automatische Analyse auf Basis von Satelliten- und Felddaten; vor der Entscheidung vor Ort prüfen.",
    "hu": "Ez a tanács műholdas és tábla-adatokon alapuló automatikus elemzés; döntés előtt ellenőrizze a helyszínen.",
    "it": "Questo consiglio è un'analisi automatica basata su dati satellitari e di campo; verifica sul posto prima di decidere.",
    "pl": "Ta porada to automatyczna analiza oparta na danych satelitarnych i polowych; przed decyzją sprawdź w terenie.",
    "ru": "Эта рекомендация — автоматический анализ по спутниковым и полевым данным; перед решением проверьте поле на месте.",
}


def _lang_clause(lang: str) -> str:
    if lang == "az" or lang not in LANG_NAMES:
        return ""
    name = LANG_NAMES[lang]
    return ("\n\nDİL: Bütün oxunaqlı mətni (summary, risk title/detail, recommendations, next_steps) "
            f"{name} dilində yaz. LAKİN hər riskin `severity` dəyərini DƏYİŞMƏ — o, kod kimi qalır: "
            "yalnız aşağı, orta və ya yüksək.")


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
    "Sən Azərbaycan fermerləri üçün təcrübəli aqronomsan. Sənə bir sahənin NASA/Sentinel peyk "
    "indeksləri (NDVI bitki sağlamlığı, NDMI bitki nəmliyi, NDWI su, EVI, SAVI, NBR), məhsul "
    "metadatası, görülmüş işlər (skautinq, əməliyyatlar, tapşırıqlar) və `knowledge_passport` "
    "(bitki-spesifik normalar, fenologiya, zərərvericilər, torpaq profili, fermer cavabları) "
    "JSON kimi verilir. Bu məlumatlara ƏSASLANARAQ praktiki məsləhət ver.\n"
    "Qaydalar:\n"
    "- Yalnız verilən dataya əsaslan; məlumat yoxdursa uydurma, çatışmazlığı qeyd et.\n"
    "- İndeksləri AYRI-AYRI yox, BİRLİKDƏ oxu (çarpaz sintez): məs. NDVI orta + NDMI aşağı + "
    "  enən trend → su stresinin başlanğıcı; NDVI yüksək + NDMI yüksək → sağlam.\n"
    "- Səbəb-nəticə diaqnostikası üçün `operations`-dan istifadə et: məs. son 10 gündə suvarma "
    "  qeyd olunub, amma NDMI hələ düşürsə → suvarma sistemini yoxlamağı təklif et.\n"
    "- `knowledge_passport` varsa, indeksi bitki-spesifik normalarla müqayisə et (universal həddlə yox); "
    "  fenoloji mərhələ və zona zərərvericilərini nəzərə al. Passport boşdursa peyk datasına əsaslan.\n"
    "- Konkret rəqəm (doza, gün) yalnız passport/dataya əsaslanırsa yaz; yoxsa ümumi tövsiyə ver.\n"
    "- Qısa, aydın, Azərbaycan dilində yaz. Fermerə birbaşa müraciət et.\n"
    "- Risk şiddəti yalnız: aşağı, orta, yüksək."
)


def _signature(risks: list[dict], recs: list[dict]) -> str:
    """Stable signature to detect material changes between advice generations."""
    r = sorted(f"{x.get('title','')}|{x.get('severity','')}" for x in risks)
    c = sorted(x.get("title", "") for x in recs)
    return json.dumps({"r": r, "c": c}, ensure_ascii=False)


async def generate_and_store(conn, field_id: str, force: bool = False,
                             lang: str = "az") -> Optional[dict]:
    """Generate advice for a field, store it, and notify on material change.
    Returns the stored advice dict, or None if the LLM is not configured or the
    15-day throttle skips regeneration (unless force=True). `lang` decides the prose
    language (severity codes stay Azerbaijani)."""
    if not llm.is_configured():
        return None

    # 15-day throttle: the auto-trigger fires after each new scene, but advice is
    # regenerated at most once per 15 days unless force=True (manual refresh).
    if not force:
        last_at = await conn.fetchval(
            "select generated_at from public.advice where field_id=$1::uuid "
            "order by generated_at desc limit 1", field_id)
        if last_at is not None:
            now = datetime.now(timezone.utc)
            ref = last_at if last_at.tzinfo else last_at.replace(tzinfo=timezone.utc)
            if ref > now - timedelta(days=15):
                return None

    ctx = await build_field_context(conn, field_id)
    field_row = await conn.fetchrow(
        "select org_id, name from public.fields where id=$1::uuid", field_id)
    if not field_row:
        return None
    org_id = str(field_row["org_id"])
    field_name = field_row["name"]

    # Tier gating: monthly advice quota + per-tier model (Pro=sonnet, Business=opus).
    from .. import tiers
    tier = await tiers.org_tier(conn, org_id)
    used = await tiers.month_count(conn, org_id, "advice")
    if used >= tiers.limit(tier, "advice_per_month"):
        return {"quota_exceeded": True, "tier": tier,
                "limit": tiers.limit(tier, "advice_per_month")}
    tier_model = tiers.model_for(tier)

    user = ("Sahə məlumatları (JSON):\n" + json.dumps(ctx, ensure_ascii=False, indent=2)
            + "\n\nBu sahə üçün xülasə, risklər, məsləhətlər və növbəti addımları çıxar.")

    try:
        result, usage = await llm.complete_structured(
            SYSTEM + _lang_clause(lang), user, AdviceResult, model=tier_model)
    except llm.LLMUnavailable:
        return None

    provider, model = llm.model_info()
    disclaimer = DISCLAIMERS.get(lang, DISCLAIMER)
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
              summary, findings, disclaimer, lang)
           values ($1::uuid,$2::uuid,$3,$4,$5::jsonb,$6,$7::jsonb,$8,$9)""",
        field_id, org_id, provider, model, json.dumps(ctx),
        result.summary, json.dumps(findings), disclaimer, lang)

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
        await _notify(conn, field_id, org_id, field_name, result, changed, lang)

    return {"summary": result.summary, "findings": findings, "disclaimer": disclaimer,
            "model_provider": provider, "model_name": model, "lang": lang}


# Notification titles follow the advice language — the body IS the advice summary, so a title in a
# different language than the sentence under it would read as a bug.
_NOTIFY_TITLE = {
    "az": ("“%s”: yeni AI məsləhəti", "“%s”: ilk AI təhlili hazırdır"),
    "en": ("“%s”: new AI advice", "“%s”: first AI analysis is ready"),
    "ru": ("«%s»: новая рекомендация ИИ", "«%s»: первый анализ ИИ готов"),
    "tr": ("“%s”: yeni yapay zekâ tavsiyesi", "“%s”: ilk yapay zekâ analizi hazır"),
    "de": ("„%s“: neue KI-Empfehlung", "„%s“: erste KI-Analyse ist fertig"),
    "hu": ("„%s”: új MI-tanács", "„%s”: elkészült az első MI-elemzés"),
    "it": ("“%s”: nuovo consiglio IA", "“%s”: la prima analisi IA è pronta"),
    "pl": ("„%s”: nowa porada AI", "„%s”: pierwsza analiza AI jest gotowa"),
}


async def _notify(conn, field_id: str, org_id: str, field_name: str,
                  result: AdviceResult, changed: bool, lang: str = "az") -> None:
    top = max((r for r in result.risks), key=lambda r: {"aşağı": 1, "orta": 2, "yüksək": 3}.get(r.severity, 0),
              default=None)
    sev = {"aşağı": "info", "orta": "warning", "yüksək": "critical"}.get(top.severity if top else "", "info")
    changed_tmpl, first_tmpl = _NOTIFY_TITLE.get(lang, _NOTIFY_TITLE["az"])
    title = (changed_tmpl if changed else first_tmpl) % field_name
    body = result.summary
    await conn.execute(
        """insert into public.notifications
             (field_id, org_id, source, type, severity, title, body, delivered_channels)
           values ($1::uuid,$2::uuid,'vegetation','ai_advice',$3,$4,$5,array['inapp'])""",
        field_id, org_id, sev, title, body)

    # NO EMAIL HERE — on purpose. This used to mail the org owner the full advice body on every
    # material change, i.e. after almost every new satellite scene (every 2-3 days, per field), and
    # it bypassed send_template entirely (no idempotency ledger, no opt-out gate, no unsubscribe
    # link). The in-app notification above is the immediate channel; the weekly Wednesday digest
    # picks up this same change signal and reports it once. Do not re-add.
