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


def email_configured() -> bool:
    """True when any email transport (Resend or SMTP) is configured."""
    return bool(settings.resend_api_key or settings.smtp_host)


async def _send_resend(to: str, subject: str, body: str) -> bool:
    """Send via the Resend HTTP API (from EMAIL_FROM). Returns True on 2xx."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}",
                         "Content-Type": "application/json"},
                json={"from": settings.email_from, "to": [to], "subject": subject, "text": body})
        if r.status_code // 100 == 2:
            return True
        print(f"[notify] resend to {to} failed: {r.status_code} {r.text[:200]}", file=sys.stderr)
        return False
    except Exception as exc:  # noqa: BLE001 — email is best-effort
        print(f"[notify] resend to {to} error: {exc}", file=sys.stderr)
        return False


def _send_sync(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
        s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


async def send_email(to: str, subject: str, body: str) -> bool:
    """Returns True if sent. Prefers Resend, falls back to SMTP, else logs + returns False."""
    if settings.resend_api_key:
        if await _send_resend(to, subject, body):
            return True
    if settings.smtp_host:
        try:
            await asyncio.to_thread(_send_sync, to, subject, body)
            return True
        except Exception as exc:  # noqa: BLE001 — email is best-effort
            print(f"[notify] smtp to {to} failed: {exc}", file=sys.stderr)
            return False
    print(f"[notify] no email transport configured; skipping email to {to}", file=sys.stderr)
    return False
