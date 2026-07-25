"""Email delivery for notifications + OTP (optional). Prefers Resend (HTTP API), falls back to
stdlib SMTP, else no-ops (logs) — so web/in-app notifications and signup work regardless of email
configuration."""
from __future__ import annotations

import asyncio
import smtplib
import sys
from email.message import EmailMessage

import httpx

from ..config import settings


# Per-locale sender identity (display name + address). Every address is @agradex.com, so the single
# verified domain covers all of them — no extra DNS per name. The email goes out from a persona that
# matches the recipient's language; unknown locales fall back to EMAIL_FROM.
SENDERS: dict[str, str] = {
    "az": "Ülkər Nəsirova <ulkar@agradex.com>",
    "en": "Olivia Hayes <olivia@agradex.com>",
    "tr": "İrem Çelik <irem@agradex.com>",
    "it": "Chiara Moretti <chiara@agradex.com>",
    "de": "Johanna Brandt <johanna@agradex.com>",
    "hu": "Réka Tóth <reka@agradex.com>",
    "pl": "Emilia Wójcik <emilia@agradex.com>",
}


def sender_for(locale: str | None) -> str:
    """The From header for a recipient's locale, or EMAIL_FROM when unknown/unset."""
    return SENDERS.get((locale or "")[:2].lower(), settings.email_from)


def email_configured() -> bool:
    """True when any email transport (Resend or SMTP) is configured."""
    return bool(settings.resend_api_key or settings.smtp_host)


async def _send_resend(to: str, subject: str, body: str, sender: str) -> bool:
    """Send via the Resend HTTP API. Returns True on 2xx."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}",
                         "Content-Type": "application/json"},
                json={"from": sender, "to": [to], "subject": subject, "text": body})
        if r.status_code // 100 == 2:
            return True
        print(f"[notify] resend to {to} failed: {r.status_code} {r.text[:200]}", file=sys.stderr)
        return False
    except Exception as exc:  # noqa: BLE001 — email is best-effort
        print(f"[notify] resend to {to} error: {exc}", file=sys.stderr)
        return False


def _send_sync(to: str, subject: str, body: str, sender: str) -> None:
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
        s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


async def send_email(to: str, subject: str, body: str, locale: str | None = None) -> bool:
    """Returns True if sent. From = the recipient-locale persona (sender_for). Prefers Resend,
    falls back to SMTP, else logs + returns False."""
    sender = sender_for(locale)
    if settings.resend_api_key:
        if await _send_resend(to, subject, body, sender):
            return True
    if settings.smtp_host:
        try:
            await asyncio.to_thread(_send_sync, to, subject, body, sender)
            return True
        except Exception as exc:  # noqa: BLE001 — email is best-effort
            print(f"[notify] smtp to {to} failed: {exc}", file=sys.stderr)
            return False
    print(f"[notify] no email transport configured; skipping email to {to}", file=sys.stderr)
    return False
