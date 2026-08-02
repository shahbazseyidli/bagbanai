"""The weekly digest drain — the only recurring email pass in the product (E15).

WHAT THIS USED TO BE: nine behavioral rules (no_field d1/d3/d7, edu drip d2/d5/d9, no_crop,
inactive_10d/30d, trial_ending) each firing its own template on its own day offset, run daily. A
farmer could collect several in a week, on top of one email per fired alert from the rule engine and
one per advice change. That is the flood this rewrite removes.

WHAT IT IS NOW: one pass. For every eligible user, `weekly.build_weekly()` assembles this week's
digest and `send_template` delivers it — one email, one template id, deduped on the ISO week. The
old rules did not need porting; they became variants and blocks of that one email.

ELIGIBILITY: has an email, is active, is verified, `email_lifecycle` is true, and the ISO-week
dedup key has not been used. `send_template` re-checks the opt-out and the ledger, so this query is
a narrowing filter, not the security boundary.

SCHEDULE: Wednesday 03:00 UTC = 07:00 Asia/Baku (Azerbaijan is UTC+4 with no DST), via
deploy/lifecycle-emails.sh → POST /api/internal/emails/lifecycle/drain. Safe to call on any other
day: the ISO-week dedup means an out-of-band call sends this week's digest only if it has not gone
yet, and does nothing if it has.

Best-effort per user — one failure never blocks the rest of the run.

ONE TRANSACTION PER USER, not one for the drain. Every iteration does several queries plus an HTTPS
round-trip to Resend (20 s timeout), and holding all of that open on a single pooled connection has
three costs that all grow with the user count:

  * a transaction open for the whole run stops VACUUM cleaning anything newer than its snapshot.
    At today's four candidates the drain takes 383 ms and this is theoretical; at five hundred
    users with Resend timing out it is a multi-hour transaction, which is the shape that actually
    hurts Postgres;
  * one of ten pool connections is unavailable for the duration;
  * the per-user `except` catches the PYTHON exception but cannot un-abort a POSTGRES transaction.
    One failing statement mid-drain would leave every later query failing with "current transaction
    is aborted", the loop would count them all as skipped, and the final commit would fail —
    discarding the ledger rows for everyone already mailed, so a re-run that week mails them twice.

Each user now commits on their own. The send still sits inside that per-user transaction, so a
commit failure can still lose one ledger row and cause one duplicate; moving the send fully outside
would mean reserving the ledger row before sending, which trades a rare duplicate for a rare
SILENT NON-DELIVERY. At-least-once is the right direction for mail.
"""
from __future__ import annotations

import sys

from ...db import connection
from . import weekly
from .send import send_template

# Users we consider at all. Rows are further filtered by send_template (opt-out + ledger) and by
# build_weekly (a lab/supplier with no fields gets nothing rather than a nonsense "add a field").
_ELIGIBLE = """
    select u.id, u.full_name, u.locale, u.role,
           to_char(now(), 'IYYY-"W"IW') as week
      from public.users u
     where u.email is not null and u.email <> ''
       and coalesce(u.is_active, true)
       and coalesce(u.email_verified, true)
       and coalesce(u.email_lifecycle, true)
     order by u.created_at
"""


async def run_lifecycle() -> dict:
    """Build and send this ISO week's digest to every eligible user.

    Takes no connection: it opens one short transaction to read the candidate list, then one per
    user (see the module docstring for why). Callers that used to pass a conn should stop — holding
    theirs open across the whole drain is the thing this fixes.

    Returns {"sent": {variant: n}, "total": n, "candidates": n, "skipped": n} — variant counts make
    the run legible in the cron log (how many farmers are still on the "add your first field"
    nudge vs. getting a real digest)."""
    sent: dict[str, int] = {}
    skipped = 0

    # Read the list and let go. The rows are a snapshot; a user who becomes eligible mid-run simply
    # gets next week's digest, which is exactly what happened before when the whole loop shared one
    # snapshot anyway.
    async with connection(None) as conn:
        users = await conn.fetch(_ELIGIBLE)

    for u in users:
        try:
            # A fresh transaction per user. An error here can abort THIS transaction and no other,
            # so the next user starts clean instead of inheriting an aborted one.
            async with connection(None) as conn:
                digest = await weekly.build_weekly(conn, dict(u))
                if not digest:
                    skipped += 1
                    continue
                ok = await send_template(
                    conn, str(u["id"]), weekly.TEMPLATE_ID, digest["ctx"],
                    dedup_key=u["week"], variant=digest["variant"], blocks=digest["blocks"])
            if ok:
                sent[digest["variant"]] = sent.get(digest["variant"], 0) + 1
            else:
                skipped += 1
        except Exception as exc:  # noqa: BLE001 — never let one user break the drain
            skipped += 1
            print(f"[emails] weekly digest for {u['id']} failed: {exc}", file=sys.stderr)

    return {"sent": sent, "total": sum(sent.values()),
            "candidates": len(users), "skipped": skipped}
