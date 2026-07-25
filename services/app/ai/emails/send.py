"""High-level template send: resolve the template for a user, enforce idempotency + lifecycle
opt-out, render, and dispatch via ai.notify (Resend, per-locale persona).

Transactional templates always send (ignore email_lifecycle); everything else is lifecycle and
honors users.email_lifecycle. Every send is recorded in public.email_sends, which is also the
idempotency key (user, template_id, dedup_key). Best-effort: never raises to the caller."""
from __future__ import annotations

import secrets
import sys

from ..notify import email_configured, send_email
from . import catalog, layout

# Templates that always send regardless of the lifecycle opt-out (account/security/immediate value).
TRANSACTIONAL = {"welcome", "data_ready", "first_advice"}


def _site_url() -> str:
    from ...config import settings
    host = (settings.cookie_domain or "").lstrip(".") or "agradex.com"
    return f"https://{host}"


def _app_url() -> str:
    from ...config import settings
    return f"https://{settings.next_public_panel_host}" if settings.next_public_panel_host else _site_url()


async def _unsub_token(conn, user_id) -> str:
    tok = await conn.fetchval(
        "select token from public.email_unsub_tokens where user_id=$1::uuid", user_id)
    if tok:
        return tok
    tok = secrets.token_urlsafe(24)
    await conn.execute(
        "insert into public.email_unsub_tokens (token, user_id) values ($1,$2::uuid) "
        "on conflict do nothing", tok, user_id)
    return await conn.fetchval(
        "select token from public.email_unsub_tokens where user_id=$1::uuid", user_id) or tok


def _ctx_urls(ctx: dict) -> dict:
    site, app = _site_url(), _app_url()
    fid = ctx.get("field_id")
    out = {
        "site_url": site,
        "app_url": app,
        "add_field_url": f"{app}/onboarding",
        "field_url": f"{app}/fields/{fid}" if fid else app,
        "pricing_url": f"{site}/pricing",
    }
    out.update(ctx)  # caller-supplied values (name, field, area, ...) win / add
    return out


async def send_template(conn, user_id, template_id: str, ctx: dict | None = None,
                        dedup_key: str = "") -> bool:
    """Send `template_id` to `user_id`. Returns True if dispatched. Idempotent per
    (user, template_id, dedup_key); lifecycle templates skip when the user opted out."""
    if not email_configured():
        return False
    try:
        row = await conn.fetchrow(
            "select email, locale, role, coalesce(email_lifecycle, true) as email_lifecycle "
            "from public.users where id=$1::uuid", user_id)
        if not row or not row["email"]:
            return False
        transactional = template_id in TRANSACTIONAL
        if not transactional and not row["email_lifecycle"]:
            return False
        exists = await conn.fetchval(
            "select 1 from public.email_sends where user_id=$1::uuid and template_id=$2 and dedup_key=$3",
            user_id, template_id, dedup_key)
        if exists:
            return False

        token = await _unsub_token(conn, user_id)
        full_ctx = _ctx_urls(dict(ctx or {}))
        full_ctx["unsub_url"] = f"{_site_url()}/api/emails/unsubscribe?token={token}"

        content = catalog.build(template_id, row["locale"], row["role"], full_ctx)
        if not content:
            return False
        html, text = layout.render(
            content, locale=row["locale"], unsub_url=full_ctx["unsub_url"], show_unsub=not transactional)
        ok = await send_email(row["email"], content.get("subject", "Agradex"), text,
                              locale=row["locale"], html=html)
        await conn.execute(
            "insert into public.email_sends (user_id, template_id, dedup_key, locale, status) "
            "values ($1::uuid,$2,$3,$4,$5) on conflict (user_id, template_id, dedup_key) do nothing",
            user_id, template_id, dedup_key, row["locale"], "sent" if ok else "failed")
        return ok
    except Exception as exc:  # noqa: BLE001 — email is best-effort, must never break the caller
        print(f"[emails] send_template {template_id} to {user_id} failed: {exc}", file=sys.stderr)
        return False
