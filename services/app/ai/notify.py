"""Email delivery for notifications + OTP (optional). Prefers Resend (HTTP API), falls back to
stdlib SMTP, else no-ops (logs) — so web/in-app notifications and signup work regardless of email
configuration.

NO PERSON SENDS THIS MAIL. The history is worth keeping because it ran in both wrong directions:
first eight invented personas, one per locale, at eight @agradex.com addresses; then a single
invented person, "Ülkər Nəsirova", in every language. Collapsing to one was an improvement and
still left a farmer replying to someone who does not exist. Since 2026-10-26 the brand sends,
from two addresses split by what the mail is ABOUT — see the constants below.

⚠️ THE MAILBOX HOLE IS STILL OPEN, and it is older than either persona. agradex.com publishes no
MX record (re-checked 2026-10-26: no MX, no SPF, no DMARC on the apex — only the DKIM key and the
send.agradex.com subdomain Resend sends through). Replies to info@ and agro@ bounce exactly as
replies to ulkar@ did, so every "reply to this email" line still in the catalog is still untrue.
Fixing it is DNS, not code — ROADMAP T32, Cloudflare Email Routing. Verify with
`dig MX agradex.com` before trusting that sentence; do not soften this warning until it returns a
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


# NO PERSON IN THE FROM LINE (owner's decision, 2026-10-26). Mail used to come from a single
# invented colleague, "Ülkər Nəsirova <ulkar@agradex.com>", in every language. Two reasons it had
# to go: a farmer answering a named human who does not exist is being misled, and the name made
# the "just reply to me" lines in the copy read as a personal promise. The brand sends the mail now.
#
# TWO ADDRESSES, because these are two different conversations and a farmer should be able to tell
# them apart in an inbox and filter on them:
#   · SYSTEM — the account itself: verification code, sign-in link, welcome. Nothing about a field.
#   · FIELD  — the crop: "your field is visible from space", the Wednesday digest.
# The display NAME is the brand in both, deliberately untranslated: a localized sender name would
# be a tenth per-locale table (see app/locales.py for how the last sixteen went), and "Agradex" is
# the one word every farmer already recognises.
BRAND = "Agradex"
SYSTEM_SENDER_ADDRESS = "info@agradex.com"
FIELD_SENDER_ADDRESS = "agro@agradex.com"
SYSTEM_SENDER = f"{BRAND} <{SYSTEM_SENDER_ADDRESS}>"
FIELD_SENDER = f"{BRAND} <{FIELD_SENDER_ADDRESS}>"

# ⚠️ NEITHER ADDRESS RECEIVES MAIL TODAY. agradex.com publishes no MX record (checked again
# 2026-10-26: no MX, no SPF, no DMARC on the apex — only the DKIM key and the send.agradex.com
# subdomain Resend uses). Replies bounce, exactly as they did for the old persona. That is ROADMAP
# T32 and it is a DNS task, not a code one; the copy still invites replies in several locales and
# those lines stay wrong until the mailbox exists.


def sender_for(locale: str | None = None, *, field_mail: bool = False) -> str:
    """The From header. `field_mail=True` for anything about a crop; the default is the account.

    `locale` is ignored — kept because every call site passes it positionally and the files are
    owned elsewhere. It would only come back if the brand ever needed a localized display name,
    which is precisely the per-locale table this comment argues against.

    Honest note on the EMAIL_FROM fallback: it survives for the case where the constants are
    emptied (domain migration, mailbox handover), so the send path degrades to the configured
    address instead of an empty From header.
    """
    chosen = FIELD_SENDER if field_mail else SYSTEM_SENDER
    return chosen or settings.email_from


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
                     html: str | None = None, field_mail: bool = False) -> bool:
    """Returns True if sent. From = the brand (sender_for); `field_mail=True` picks the crop
    address instead of the account one. `html` (optional) is
    the rich part with `body` as the plain-text fallback. Prefers Resend, falls back to SMTP, else
    logs + returns False.

    Reply-To is set explicitly even though it currently duplicates From. It is DERIVED from
    `sender` rather than hard-coded a second time, so (a) the two headers cannot drift apart, and
    (b) the EMAIL_FROM fallback path points replies at itself instead of at a mailbox that may not
    exist. A monitored From with an unset — or later independently changed — Reply-To would reopen
    the exact hole this change closes.
    """
    sender = sender_for(locale, field_mail=field_mail)
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
