"""AI advice + per-field chatbot + notifications (§AI advice/chat)."""
import json

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

_LOCALES = {"az", "en", "tr", "de", "hu", "it", "pl", "ru"}


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


class ChatIn(BaseModel):
    message: str
    locale: Optional[str] = None


@router.get("/fields/{field_id}/advice")
async def get_advice(field_id: str, request: Request,
                     user_id: str = Depends(get_current_user_id)):
    """Newest advice for the field, plus the language it was written in.

    The newest row wins even when it is in another language — a fresh analysis the reader can
    have translated beats a stale one they can read. `lang_mismatch` tells the UI to offer a
    one-tap regeneration in the reader's language instead of silently showing foreign prose."""
    locale = _resolve_locale(request, None)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        row = await conn.fetchrow(
            """select summary, findings, disclaimer, model_name, generated_at, lang
               from public.advice where field_id=$1::uuid
               order by generated_at desc limit 1""", field_id)
    if not row:
        return {"advice": None, "configured": llm.is_configured()}
    f = row["findings"] if isinstance(row["findings"], dict) else json.loads(row["findings"] or "{}")
    lang = row["lang"] or "az"
    return {"advice": {"summary": row["summary"], **f, "disclaimer": row["disclaimer"],
                       "model": row["model_name"], "generated_at": row["generated_at"].isoformat(),
                       "lang": lang, "lang_mismatch": lang != locale},
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
        result = await advice_svc.generate_and_store(conn, field_id, force=True, lang=locale)
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
         "created_at": r["created_at"].isoformat(), "read": r["read_at"] is not None}
        for r in visible]}


@router.post("/notifications/read")
async def mark_read(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await conn.execute(
            """update public.notifications n set read_at = now()
               from public.organization_members m
               where m.org_id = n.org_id and m.user_id = $1::uuid and n.read_at is null""",
            user_id)
    return {"ok": True}
