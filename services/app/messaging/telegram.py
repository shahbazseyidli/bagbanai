"""Telegram one-way alert bot (U4 / T22). Gated on TELEGRAM_BOT_TOKEN — every function is a no-op
when the token is unset, so the app runs unchanged until the owner adds the bot."""
from __future__ import annotations

import sys

import httpx

from ..config import settings


def configured() -> bool:
    return bool(settings.telegram_bot_token)


def bot_username() -> str:
    return settings.telegram_bot_username


def _api(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"


async def send(chat_id: str | int, text: str) -> bool:
    if not configured() or not chat_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(_api("sendMessage"),
                             json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True})
        return r.status_code // 100 == 2
    except Exception as exc:  # noqa: BLE001 — delivery is best-effort
        print(f"[telegram] send failed: {exc}", file=sys.stderr)
        return False


async def set_webhook(url: str) -> dict:
    if not configured():
        return {"ok": False, "reason": "no_token"}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(_api("setWebhook"),
                         json={"url": url, "secret_token": settings.telegram_webhook_secret or None,
                               "allowed_updates": ["message"]})
    return {"ok": r.status_code // 100 == 2, "status": r.status_code, "body": r.text[:300]}
