"""Email delivery for notifications (optional). Uses stdlib smtplib in a thread.
No-ops (logs) when SMTP is not configured, so web/in-app notifications work regardless."""
from __future__ import annotations

import asyncio
import smtplib
import sys
from email.message import EmailMessage

from ..config import settings


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
    """Returns True if sent, False if SMTP is not configured or sending failed."""
    if not settings.smtp_host:
        print(f"[notify] SMTP not configured; skipping email to {to}", file=sys.stderr)
        return False
    try:
        await asyncio.to_thread(_send_sync, to, subject, body)
        return True
    except Exception as exc:  # noqa: BLE001 — email is best-effort
        print(f"[notify] email to {to} failed: {exc}", file=sys.stderr)
        return False
