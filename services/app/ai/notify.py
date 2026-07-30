"""Email delivery for notifications + OTP (optional). Prefers Resend (HTTP API), falls back to
stdlib SMTP, else no-ops (logs) — so web/in-app notifications and signup work regardless of email
configuration.

ONE SENDER, ONE MAILBOX. Every Agradex email goes out from the same person in every language.
Until now there were eight personas at eight @agradex.com addresses, and that was not a cosmetic
problem: agradex.com publishes no MX record, so NOT ONE of those addresses could receive mail.
Every "reply to this email — I read every one" in the catalog was an invitation into a black hole.
Collapsing to one address is what makes a real mailbox affordable, and the owner is opening one on
the Hetzner webhosting package that already serves findix.az (MX www747.your-server.de). The
Azerbaijani persona is the one that survives — deliberately, because Azerbaijani farmers are the
core audience.

⚠️ AS OF THIS COMMIT THE HOLE IS STILL OPEN. This change makes the address singular; it does not
make it reachable. agradex.com still publishes no MX record, so a reply to ulkar@agradex.com still
bounces. Two things have to land outside this repo before the catalog's "reply to this email" line
becomes true: the mailbox created in konsoleH, and an MX record on the apex. Verify with
`dig MX agradex.com` before trusting that sentence — do not soften this warning until it returns a
host.
"""
from __future__ import annotations

import asyncio
import smtplib
import sys
from email.message import EmailMessage
from email.utils import parseaddr

import httpx

from ..config import settings


# The one sender. Kept as name + address separately (rather than a single literal) because
# emails/catalog.py needs the bare display name for the signoff line and must not re-type it —
# a second copy of the name is how the signoff and the From header drift apart again.
SENDER_NAME = "Ülkər Nəsirova"
SENDER_ADDRESS = "ulkar@agradex.com"
SENDER = f"{SENDER_NAME} <{SENDER_ADDRESS}>"


def sender_for(locale: str | None = None) -> str:
    """The From header. One persona for every locale now, so `locale` is ignored.

    The parameter stays because every call site passes it and they live in files owned elsewhere;
    it costs nothing and keeps this a drop-in change.

    Honest note on the EMAIL_FROM fallback: it used to be *reachable* — an unknown or NULL
    `users.locale` missed the per-locale dict and fell through to settings.email_from. It is no
    longer reached that way, because folding exactly those recipients onto the one persona is the
    point of this change. It survives only for the case where SENDER is emptied (domain migration,
    mailbox handover), so the send path degrades to the configured address instead of an empty
    From header.
    """
    return SENDER or settings.email_from


def email_configured() -> bool:
    """True when any email transport (Resend or SMTP) is configured."""
    return bool(settings.resend_api_key or settings.smtp_host)


async def _send_resend(to: str, subject: str, body: str, sender: str,
                       html: str | None = None, reply_to: str | None = None) -> bool:
    """Send via the Resend HTTP API. Returns True on 2xx. When `html` is given it is sent as the
    rich part and `body` as the plain-text alternative. Resend spells the header `reply_to`."""
    payload: dict = {"from": sender, "to": [to], "subject": subject, "text": body}
    if html:
        payload["html"] = html
    if reply_to:
        payload["reply_to"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}",
                         "Content-Type": "application/json"},
                json=payload)
        if r.status_code // 100 == 2:
            return True
        print(f"[notify] resend to {to} failed: {r.status_code} {r.text[:200]}", file=sys.stderr)
        return False
    except Exception as exc:  # noqa: BLE001 — email is best-effort
        print(f"[notify] resend to {to} error: {exc}", file=sys.stderr)
        return False


def _send_sync(to: str, subject: str, body: str, sender: str, html: str | None = None,
               reply_to: str | None = None) -> None:
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to     # set once — EmailMessage raises on a duplicate header
    msg["Subject"] = subject
    msg.set_content(body)                       # plain-text part
    if html:
        msg.add_alternative(html, subtype="html")   # rich part (multipart/alternative)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
        s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


async def send_email(to: str, subject: str, body: str, locale: str | None = None,
                     html: str | None = None) -> bool:
    """Returns True if sent. From = the single Agradex persona (sender_for). `html` (optional) is
    the rich part with `body` as the plain-text fallback. Prefers Resend, falls back to SMTP, else
    logs + returns False.

    Reply-To is set explicitly even though it currently duplicates From. It is DERIVED from
    `sender` rather than hard-coded a second time, so (a) the two headers cannot drift apart, and
    (b) the EMAIL_FROM fallback path points replies at itself instead of at a mailbox that may not
    exist. A monitored From with an unset — or later independently changed — Reply-To would reopen
    the exact hole this change closes.
    """
    sender = sender_for(locale)
    reply_to = parseaddr(sender)[1] or None
    if settings.resend_api_key:
        if await _send_resend(to, subject, body, sender, html=html, reply_to=reply_to):
            return True
    if settings.smtp_host:
        try:
            await asyncio.to_thread(_send_sync, to, subject, body, sender,
                                    html=html, reply_to=reply_to)
            return True
        except Exception as exc:  # noqa: BLE001 — email is best-effort
            print(f"[notify] smtp to {to} failed: {exc}", file=sys.stderr)
            return False
    print(f"[notify] no email transport configured; skipping email to {to}", file=sys.stderr)
    return False
