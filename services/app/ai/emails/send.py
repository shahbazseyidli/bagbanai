"""High-level template send: resolve the template for a user, enforce idempotency + lifecycle
opt-out, render, and dispatch via ai.notify (Resend, per-locale persona).

Transactional templates always send (ignore email_lifecycle); everything else is lifecycle and
honors users.email_lifecycle — the single opt-out for all non-transactional mail since E15 (the
old users.email_alerts flag is gone, migration 0047). Every send is recorded in public.email_sends,
which is also the idempotency key (user, template_id, dedup_key). Best-effort: never raises.

TWO INDEPENDENT GUARDS AGAINST FLOODING:
  1. dedup_key — one send per (user, template, key). '' for one-shots, the field id for data_ready,
     the ISO week for the weekly digest.
  2. TRANSACTIONAL_CAP_HOURS — transactional mail bypasses the opt-out, so the dedup key alone is
     not enough: a farmer who draws five fields in one afternoon has five distinct dedup keys and
     would get five "your field is ready" emails. At most one send per (user, template) per rolling
     24h; the rest are recorded as `skipped` so a later cron cannot deliver them late.
"""
from __future__ import annotations

import json
import secrets
import sys

from ..notify import email_configured, send_email
from . import catalog, layout

# Templates that always send regardless of the lifecycle opt-out (account / immediate value).
# Deliberately tiny: `welcome` once per account, `data_ready` once per field. OTP does not appear
# here because it never goes through this module (routers/auth.py calls notify.send_email directly).
TRANSACTIONAL = {"welcome", "data_ready"}

# Rolling window, not a calendar day: a calendar boundary would let a burst spanning midnight
# through, which is exactly the case ("five fields in one afternoon") the cap exists to stop.
TRANSACTIONAL_CAP_HOURS = 24


def site_url() -> str:
    """Marketing origin (agradex.com) — pricing, legal, unsubscribe."""
    from ...config import settings
    host = (settings.cookie_domain or "").lstrip(".") or "agradex.com"
    return f"https://{host}"


def app_url() -> str:
    """App origin (app.agradex.com when the panel split is active, else the site)."""
    from ...config import settings
    return f"https://{settings.next_public_panel_host}" if settings.next_public_panel_host else site_url()


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
    site, app = site_url(), app_url()
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


async def _capped(conn, user_id, template_id: str) -> bool:
    """True when this user already got this transactional template inside the cap window."""
    return bool(await conn.fetchval(
        "select 1 from public.email_sends where user_id=$1::uuid and template_id=$2 "
        "and status='sent' and created_at > now() - make_interval(hours => $3::int) limit 1",
        user_id, template_id, TRANSACTIONAL_CAP_HOURS))


async def _record(conn, user_id, template_id: str, dedup_key: str, locale, status: str,
                  meta: dict | None = None) -> None:
    await conn.execute(
        "insert into public.email_sends (user_id, template_id, dedup_key, locale, status, meta) "
        "values ($1::uuid,$2,$3,$4,$5,$6::jsonb) "
        "on conflict (user_id, template_id, dedup_key) do nothing",
        user_id, template_id, dedup_key, locale, status,
        json.dumps(meta) if meta else None)


async def send_template(conn, user_id, template_id: str, ctx: dict | None = None,
                        dedup_key: str = "", *, variant: str | None = None,
                        blocks: list[dict] | None = None) -> bool:
    """Send `template_id` to `user_id`. Returns True if dispatched. Idempotent per
    (user, template_id, dedup_key); lifecycle templates skip when the user opted out.

    `variant` selects between copy variants of one template (the weekly digest is one template id
    with four framings, so a farmer who adds a field mid-week still cannot receive two digests).
    `blocks` is the ordered body assembled at send time (see layout.BLOCKS) — data-driven templates
    keep their frame in `catalog` and hand the body in here.
    """
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
        if transactional and await _capped(conn, user_id, template_id):
            await _record(conn, user_id, template_id, dedup_key, row["locale"], "skipped",
                          {"reason": "daily_cap", "hours": TRANSACTIONAL_CAP_HOURS})
            return False

        token = await _unsub_token(conn, user_id)
        full_ctx = _ctx_urls(dict(ctx or {}))
        full_ctx["unsub_url"] = f"{site_url()}/api/emails/unsubscribe?token={token}"

        content = catalog.build(template_id, row["locale"], row["role"], full_ctx, variant=variant)
        if not content:
            return False
        if blocks:
            content = {**content, "blocks": list(blocks)}
        html, text = layout.render(
            content, locale=row["locale"], unsub_url=full_ctx["unsub_url"], show_unsub=not transactional)
        ok = await send_email(row["email"], content.get("subject", "Agradex"), text,
                              locale=row["locale"], html=html)
        await _record(conn, user_id, template_id, dedup_key, row["locale"], "sent" if ok else "failed")
        return ok
    except Exception as exc:  # noqa: BLE001 — email is best-effort, must never break the caller
        print(f"[emails] send_template {template_id} to {user_id} failed: {exc}", file=sys.stderr)
        return False
