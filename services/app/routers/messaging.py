"""Messaging-channel endpoints (U4/T22): connect status + opt-in for the signed-in user, and the
public Telegram webhook (secret-gated) that links a chat to a user via the /start deep-link token."""
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..config import settings
from ..db import connection
from ..deps import get_current_user_id
from ..messaging import telegram

router = APIRouter(tags=["messaging"])


@router.get("/api/messaging/telegram")
async def telegram_status(user_id: str = Depends(get_current_user_id)):
    """Connection status + a one-tap deep-link to bind the user's Telegram chat."""
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            """select chat_id, link_token, opt_in, verified from public.messaging_channels
               where user_id=$1::uuid and channel='telegram'""", user_id)
        if not row:
            token = secrets.token_urlsafe(12)
            await conn.execute(
                """insert into public.messaging_channels (user_id, channel, link_token)
                   values ($1::uuid, 'telegram', $2)""", user_id, token)
            row = {"chat_id": None, "link_token": token, "opt_in": True, "verified": False}
    connect_url = (
        f"https://t.me/{telegram.bot_username()}?start={row['link_token']}"
        if telegram.configured() and telegram.bot_username() else None
    )
    return {
        "configured": telegram.configured(),
        "connected": bool(row["verified"] and row["chat_id"]),
        "opt_in": row["opt_in"],
        "connect_url": connect_url,
    }


@router.post("/api/messaging/telegram/optin")
async def telegram_optin(body: dict, user_id: str = Depends(get_current_user_id)):
    opt = bool((body or {}).get("opt_in", True))
    async with connection(user_id) as conn:
        await conn.execute(
            "update public.messaging_channels set opt_in=$1 where user_id=$2::uuid and channel='telegram'",
            opt, user_id)
    return {"ok": True, "opt_in": opt}


@router.post("/api/telegram/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str = Header(default=""),
):
    """Public webhook Telegram calls. Secret-gated. Handles /start <token> (bind chat) + /stop."""
    if not telegram.configured():
        return {"ok": False}
    if settings.telegram_webhook_secret and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=403, detail="bad_secret")
    upd = await request.json()
    msg = (upd or {}).get("message") or {}
    chat = (msg.get("chat") or {}).get("id")
    text = (msg.get("text") or "").strip()
    if not chat:
        return {"ok": True}

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        link = parts[1].strip() if len(parts) > 1 else ""
        if link:
            async with connection(None) as conn:
                r = await conn.fetchrow(
                    """update public.messaging_channels
                       set chat_id=$1, verified=true, opt_in=true where link_token=$2
                       returning user_id""", str(chat), link)
            if r:
                await telegram.send(chat, "✅ Bağban AI bildirişləri qoşuldu. Sahələriniz üçün "
                                          "risk və hava xəbərdarlıqlarını burada alacaqsınız. Dayandırmaq: /stop")
                return {"ok": True}
        await telegram.send(chat, "Bağlantı kodu tapılmadı. Tətbiqdəki “Telegram-a qoşul” düyməsindən keçin.")
    elif text.startswith("/stop"):
        async with connection(None) as conn:
            await conn.execute(
                "update public.messaging_channels set opt_in=false where chat_id=$1", str(chat))
        await telegram.send(chat, "🔕 Bildirişlər dayandırıldı. Yenidən qoşmaq üçün tətbiqə keçin.")
    return {"ok": True}
