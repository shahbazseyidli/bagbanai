"""Per-field Agradex chatbot. Context = the field's NASA data + latest advice +
prior conversation. Every turn is stored in public.ai_chat_messages so later turns
(and analyses) stay aware of the history."""
from __future__ import annotations

import logging

import json
from typing import Optional

from . import llm, usage as ai_usage
from .context import build_field_context

log = logging.getLogger(__name__)

# Persona is language-neutral; the reply language is decided per turn by _lang_directive so a farmer
# gets answers in whatever language they write (Phase 4 — 7 locales).
SYSTEM = (
    "Sən Agradex — fermerlər üçün sahə üzrə aqronom köməkçisən. Sənə həmin "
    "sahənin peyk indeksləri, məhsul məlumatı, görülmüş işlər və son AI məsləhəti kontekst "
    "kimi verilir. Suallara BU kontekstə əsaslanaraq, qısa və praktiki "
    "cavab ver. Bilmədiyini uydurma; məlumat çatışmırsa bunu de. Fermerə birbaşa müraciət et. "
    "Cavabı DÜZ MƏTN kimi yaz — Markdown işarələri (**qalın**, *kursiv*, # başlıq) istifadə etmə."
)

# Locale code → English language name the model reliably recognizes.
LANG_NAMES = {
    "az": "Azerbaijani (Azərbaycan dili)", "en": "English", "tr": "Turkish (Türkçe)",
    "de": "German (Deutsch)", "hu": "Hungarian (Magyar)", "it": "Italian (Italiano)",
    "pl": "Polish (Polski)", "ru": "Russian (Русский)",
}


def _lang_directive(locale: str) -> str:
    """Reply in the language the farmer wrote in; fall back to their UI locale when ambiguous."""
    name = LANG_NAMES.get(locale, LANG_NAMES["az"])
    return ("\n\nDİL QAYDASI: İstifadəçinin sualını hansı dildə yazdığını müəyyən et və cavabı "
            f"MÜTLƏQ EYNİ dildə ver. Dil qeyri-müəyyəndirsə cavabı {name} dilində ver.")


# Tier-gate messages, localized (fall back to az). Shown when chat is unavailable / quota is spent.
_GATE_PAID = {
    "az": "AI söhbət Pro (10 AZN) və Business paketlərindədir. Paketi yüksəldin.",
    "en": "AI chat is on the Pro (10 AZN) and Business plans. Please upgrade.",
    "tr": "AI sohbet Pro (10 AZN) ve Business paketlerindedir. Paketi yükseltin.",
    "de": "KI-Chat ist in den Paketen Pro (10 AZN) und Business enthalten. Bitte upgraden.",
    "hu": "Az AI-csevegés a Pro (10 AZN) és Business csomagban érhető el. Kérjük, váltson magasabb csomagra.",
    "it": "La chat AI è nei piani Pro (10 AZN) e Business. Esegui l'upgrade.",
    "pl": "Czat AI jest w planach Pro (10 AZN) i Business. Przejdź na wyższy plan.",
    "ru": "AI-чат доступен в тарифах Pro (10 AZN) и Business. Перейдите на более высокий тариф.",
}
_GATE_LIMIT = {
    "az": "Bu ay AI söhbət limitiniz ({n} mesaj) bitib. Növbəti ay yenilənir və ya paketi yüksəldin.",
    "en": "You've reached this month's AI chat limit ({n} messages). It resets next month — or upgrade.",
    "tr": "Bu ayki AI sohbet limitiniz ({n} mesaj) doldu. Gelecek ay yenilenir ya da paketi yükseltin.",
    "de": "Ihr KI-Chat-Limit für diesen Monat ({n} Nachrichten) ist erreicht. Es wird nächsten Monat zurückgesetzt — oder upgraden.",
    "hu": "Elérte a havi AI-csevegési korlátot ({n} üzenet). Jövő hónapban visszaáll — vagy váltson csomagot.",
    "it": "Hai raggiunto il limite di chat AI di questo mese ({n} messaggi). Si azzera il mese prossimo — o esegui l'upgrade.",
    "pl": "Osiągnięto miesięczny limit czatu AI ({n} wiadomości). Zresetuje się w przyszłym miesiącu — lub przejdź na wyższy plan.",
    "ru": "Месячный лимит AI-чата исчерпан ({n} сообщений). Он обновится в следующем месяце — или перейдите на более высокий тариф.",
}


def _gate(table: dict, locale: str) -> str:
    return table.get(locale) or table["az"]


HISTORY_LIMIT = 12


async def _load_history(conn, field_id: str) -> list[dict]:
    rows = await conn.fetch(
        """select role, content from public.ai_chat_messages
           where field_id=$1::uuid order by created_at desc limit $2""",
        field_id, HISTORY_LIMIT)
    # oldest first for the model
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


async def history(conn, field_id: str) -> list[dict]:
    rows = await conn.fetch(
        """select role, content, created_at from public.ai_chat_messages
           where field_id=$1::uuid order by created_at asc limit 200""", field_id)
    return [{"role": r["role"], "content": r["content"],
             "created_at": r["created_at"].isoformat()} for r in rows]


async def answer(conn, field_id: str, user_id: str, message: str, locale: str = "az") -> Optional[str]:
    if not llm.is_configured():
        return None

    field_row = await conn.fetchrow(
        "select org_id from public.fields where id=$1::uuid", field_id)
    if not field_row:
        return None
    org_id = str(field_row["org_id"])

    # Tier gating: chat availability + monthly quota + per-tier model. Gated replies are
    # returned as an ephemeral message (not persisted, not charged).
    from .. import tiers
    tier = await tiers.org_tier(conn, org_id)
    chat_limit = tiers.limit(tier, "chat_per_month")
    if chat_limit <= 0:
        return _gate(_GATE_PAID, locale)
    if await tiers.month_count(conn, org_id, "chat") >= chat_limit:
        return _gate(_GATE_LIMIT, locale).format(n=chat_limit)
    tier_model = tiers.model_for(tier)

    ctx = await build_field_context(conn, field_id, locale)
    # Same reason as context.py: this block is pasted verbatim into the system prompt, so a summary
    # in another language both wastes the reader's context and pulls the reply toward that language.
    # Prefer the newest row the farmer is being answered in; fall back to the newest of any language.
    latest = await conn.fetchrow(
        "select summary, findings, lang from public.advice where field_id=$1::uuid "
        "order by (lang = coalesce($2::text,'')) desc, generated_at desc limit 1", field_id, locale)
    ctx_block = {"field_context": ctx}
    if latest:
        f = latest["findings"] if isinstance(latest["findings"], dict) else json.loads(latest["findings"] or "{}")
        ctx_block["latest_advice"] = {"summary": latest["summary"], **f}
        if latest["lang"] and locale and latest["lang"] != locale:
            # Name the language rather than let the model infer it from the prose.
            ctx_block["latest_advice"]["lang"] = latest["lang"]

    system = SYSTEM + _lang_directive(locale) + "\n\nKONTEKST (JSON):\n" + json.dumps(ctx_block, ensure_ascii=False)
    msgs = await _load_history(conn, field_id)
    msgs.append({"role": "user", "content": message})

    try:
        reply, usage = await llm.complete_text(system, msgs, model=tier_model)
    except llm.LLMInvalidOutput as exc:
        log.warning("chat: model returned nothing usable for field %s (%s)", field_id, exc)
        return None
    except llm.LLMUnavailable as exc:
        log.info("chat: unavailable for field %s (%s)", field_id, exc)
        return None

    # Persist both turns (context_snapshot only on the user turn to keep rows lean).
    await conn.execute(
        """insert into public.ai_chat_messages (org_id, field_id, user_id, role, content, context_snapshot)
           values ($1::uuid,$2::uuid,$3::uuid,'user',$4,$5::jsonb)""",
        org_id, field_id, user_id, message, json.dumps(ctx_block))
    await conn.execute(
        """insert into public.ai_chat_messages (org_id, field_id, user_id, role, content)
           values ($1::uuid,$2::uuid,$3::uuid,'assistant',$4)""",
        org_id, field_id, user_id, reply)

    # Record token usage / cost for this chat turn (best-effort).
    try:
        await ai_usage.record_usage(
            conn, kind="chat", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            cache_read_tokens=int(usage.get("cache_read_tokens") or 0),
            org_id=org_id, user_id=user_id, field_id=field_id,
            # A farmer typed this and is watching for the reply. Never batch it.
            source="user")
    except Exception:
        pass

    return reply
