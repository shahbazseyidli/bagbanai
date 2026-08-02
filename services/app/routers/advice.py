"""AI advice + per-field chatbot + notifications (§AI advice/chat)."""
import json

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

_LOCALES = {"az", "en", "tr", "de", "hu", "it", "pl", "ru", "es"}


def _resolve_locale(request: Request, body_locale: Optional[str]) -> str:
    """The language to write prose in: explicit body value, then the X-Locale header the web client
    sends on every request, then the cookie, then az.

    The header outranks the cookie because the cookie is genuinely ambiguous here: the app host and
    the marketing apex are different hosts, so a browser can hold both a host-only bagban_locale and
    the .agradex.com one. Next reads the first, Starlette's cookie dict keeps the last — so the
    interface could render in one language while the AI wrote in another. X-Locale is set from the
    same value t() renders with, so there is nothing left to infer."""
    header_locale = (request.headers.get("x-locale") or "").strip().lower()
    for cand in (body_locale, header_locale, request.cookies.get("bagban_locale")):
        if cand and cand in _LOCALES:
            return cand
    return "az"

from .. import notify_prefs, tiers
from ..ai import advice as advice_svc
from ..ai import chat as chat_svc
from ..ai import llm
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["ai"])

# The two ways the read path asks for an advice row. Same column list both times so the readable
# row and the foreign-language fallback can never come back with different shapes.
_ADVICE_SELECT = ("select summary, findings, disclaimer, model_name, generated_at, lang "
                  "from public.advice where field_id=$1::uuid ")
_ADVICE_NEWEST_SQL = _ADVICE_SELECT + "order by generated_at desc limit 1"
_ADVICE_IN_LANG_SQL = _ADVICE_SELECT + "and lang=$2::text order by generated_at desc limit 1"


class ChatIn(BaseModel):
    message: str
    locale: Optional[str] = None


def _age_days(generated_at: datetime) -> int:
    """Whole days since the row was written. generated_at is timestamptz, so asyncpg hands back an
    aware datetime and there is no naive/aware mixing to get wrong. Clamped at zero because a row
    written a few seconds ago by another node with a slightly fast clock is not "-1 days old"."""
    return max(0, (datetime.now(timezone.utc) - generated_at).days)


def _jsonb(v):
    """asyncpg hands a jsonb column back as a string on some paths and a dict on others; the client
    wants an object either way. Null stays null so the reader can test for it."""
    if v is None or isinstance(v, dict):
        return v
    try:
        return json.loads(v)
    except Exception:  # noqa: BLE001 — a malformed params blob must not break the whole bell
        return None


@router.get("/fields/{field_id}/advice")
async def get_advice(field_id: str, request: Request,
                     user_id: str = Depends(get_current_user_id)):
    """Advice for the field, preferring prose the reader can actually read.

    Stored prose is generated once, in one language, and is never translated on read (a deliberate
    architecture decision). "Newest row wins" is therefore only correct while every row for a field
    shares one language — and that is not what production looks like. One i18n test run left a real
    field with seven analyses in seven languages written inside three minutes; the newest of them
    was Polish, so its Azerbaijani owner opened the field and met an entirely Polish analysis. A
    fresh analysis nobody can read is worth less than an older one they can.

    So the newest row **in the reader's language** wins. Only when that language has no row at all
    do we fall back to the newest foreign one and keep `lang_mismatch` set — foreign prose behind
    the banner still beats an empty section.

    Serving the readable-but-older row would otherwise hide something the farmer is entitled to
    know, so the response says it out loud: `age_days` is the age of what we served and
    `newer_other` carries the date and language of the newer analysis we chose not to show.
    """
    locale = _resolve_locale(request, None)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        newest = await conn.fetchrow(_ADVICE_NEWEST_SQL, field_id)
        # Only go looking for a same-language row when the newest one is not already it. The normal
        # field has every analysis in the owner's language, and that case must stay one query.
        match = None
        if newest is not None and (newest["lang"] or "az") != locale:
            match = await conn.fetchrow(_ADVICE_IN_LANG_SQL, field_id, locale)
    if newest is None:
        return {"advice": None, "configured": llm.is_configured()}

    row = match if match is not None else newest
    lang = row["lang"] or "az"
    generated_at = row["generated_at"]
    # Disclose the newer row only when it really is newer. Rows arrive in bursts (the auto-trigger
    # fires per scene), so an exact timestamp tie is possible, and "a newer analysis exists" would
    # then be a claim the data does not support.
    newer_other = None
    if match is not None and newest["generated_at"] > generated_at:
        newer_other = {"lang": newest["lang"] or "az",
                       "generated_at": newest["generated_at"].isoformat()}

    f = row["findings"] if isinstance(row["findings"], dict) else json.loads(row["findings"] or "{}")
    return {"advice": {"summary": row["summary"], **f, "disclaimer": row["disclaimer"],
                       "model": row["model_name"], "generated_at": generated_at.isoformat(),
                       "lang": lang, "lang_mismatch": lang != locale,
                       "age_days": _age_days(generated_at), "newer_other": newer_other},
            "configured": llm.is_configured()}


@router.post("/fields/{field_id}/advice/generate")
async def generate_advice(field_id: str, request: Request,
                          user_id: str = Depends(get_current_user_id)):
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="ai_not_configured")
    locale = _resolve_locale(request, None)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        result = await advice_svc.generate_and_store(conn, field_id, force=True, lang=locale, source="user")
    if result is None:
        raise HTTPException(status_code=503, detail="ai_unavailable")
    # The quota branch used to come back as a 200 carrying {"quota_exceeded": true}, so every
    # caller read it as success: the button stopped spinning, nothing changed on screen, and the
    # farmer had no idea the monthly limit was the reason. It is a refusal — say so with a status.
    if result.get("quota_exceeded"):
        raise HTTPException(status_code=429, detail="advice_quota_exceeded")
    return result


@router.get("/fields/{field_id}/chat")
async def get_chat(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        msgs = await chat_svc.history(conn, field_id)
        # The client needs to know the org can actually chat BEFORE the farmer commits to a
        # question: the ready-made question chips invite a tap, and chat_svc.answer() answers a
        # tier-gated org with the upgrade sentence instead of a real reply. This is a rendering
        # hint only — the tier stays enforced server-side in ai/chat.py.
        tier = await tiers.org_tier(conn, org_id)
        chat_limit = tiers.limit(tier, "chat_per_month")
        chat_used = await tiers.month_count(conn, org_id, "chat")
    return {"messages": msgs, "configured": llm.is_configured(),
            "chat_limit": chat_limit, "chat_used": chat_used,
            "chat_enabled": chat_limit > chat_used}


@router.post("/fields/{field_id}/chat")
async def post_chat(field_id: str, body: ChatIn, request: Request,
                    user_id: str = Depends(get_current_user_id)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="empty_message")
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="ai_not_configured")
    locale = _resolve_locale(request, body.locale)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        reply = await chat_svc.answer(conn, field_id, user_id, body.message, locale=locale)
    if reply is None:
        raise HTTPException(status_code=503, detail="ai_unavailable")
    return {"reply": reply}


@router.get("/notifications")
async def list_notifications(user_id: str = Depends(get_current_user_id)):
    """Recent notifications across the user's organizations (in-app bell).

    THIS is where the per-user notification matrix is enforced for the in-app channel.
    public.notifications rows are org-scoped (user_id is never set by any writer), so a member who
    muted a category cannot be served by skipping the insert — that would mute their colleagues too.
    Filtering on read also means the equipment, inventory and geo-pipeline producers are covered
    without touching them, and this one endpoint feeds the bell, /notifications and TodayHome.

    The SQL limit is 60 rather than 30 because the filter runs after it: cutting at 30 first would
    shrink the bell for exactly the farmers who muted something noisy.
    """
    async with connection(user_id) as conn:
        prefs = await notify_prefs.load(conn, user_id)
        rows = await conn.fetch(
            """select n.id, n.field_id, n.source, n.type, n.severity, n.title, n.body,
                      n.title_code, n.title_params, n.body_code, n.body_params,
                      n.created_at, n.read_at
               from public.notifications n
               join public.organization_members m
                 on m.org_id = n.org_id and m.user_id = $1::uuid
               order by n.created_at desc limit 60""", user_id)
    visible = [r for r in rows
               if notify_prefs.allows_notification(prefs, r["source"], r["type"], "inapp")][:30]
    return {"notifications": [
        {"id": str(r["id"]), "field_id": str(r["field_id"]) if r["field_id"] else None,
         "type": r["type"], "severity": r["severity"], "title": r["title"], "body": r["body"],
         # CODE + PARAMS (0057). The prose stays as the fallback for rows written before the
         # migration and for producers with no code yet; the client prefers the code so the alert
         # renders in the READER's language rather than the writer's.
         "title_code": r["title_code"], "title_params": _jsonb(r["title_params"]),
         "body_code": r["body_code"], "body_params": _jsonb(r["body_params"]),
         "created_at": r["created_at"].isoformat(), "read": r["read_at"] is not None}
        for r in visible]}


@router.post("/notifications/read")
async def mark_read(user_id: str = Depends(get_current_user_id)):
    """Mark as read only what the bell actually SHOWED.

    This used to stamp every unread row in every org the user belongs to. With the notification
    matrix that quietly destroys muted categories: a farmer mutes weather, a week of frost alerts is
    written (correctly — colleagues still want them) but hidden from this user's bell, they open the
    bell for something unrelated, NotificationBell fires this endpoint, and the hidden rows are
    stamped read. Re-enabling weather then returns a backlog that is already grey and badge-less.
    The switch says "where alerts land", not "delete alerts".

    So the visible set is re-derived with the same window and the same filter as
    list_notifications, and only those ids are updated.
    """
    async with connection(user_id) as conn:
        prefs = await notify_prefs.load(conn, user_id)
        rows = await conn.fetch(
            """select n.id, n.source, n.type
               from public.notifications n
               join public.organization_members m
                 on m.org_id = n.org_id and m.user_id = $1::uuid
               where n.read_at is null
               order by n.created_at desc limit 60""", user_id)
        ids = [r["id"] for r in rows
               if notify_prefs.allows_notification(prefs, r["source"], r["type"], "inapp")]
        if ids:
            await conn.execute(
                "update public.notifications set read_at = now() "
                "where id = any($1::uuid[]) and read_at is null", ids)
    return {"ok": True}
