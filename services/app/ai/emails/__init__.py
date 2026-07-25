"""Agradex lifecycle / transactional email system.

`catalog` holds the localized copy for every template (7 langs × role variants); `layout` renders
a content dict into email-safe HTML + a plain-text alternative; `send` is the high-level entry that
resolves the template for a user, enforces idempotency + lifecycle opt-out, and dispatches via
`ai.notify` (Resend, per-locale persona)."""
from .send import send_template, TRANSACTIONAL  # noqa: F401
