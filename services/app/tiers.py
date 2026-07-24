"""Subscription tiers — feature flags + monthly limits per package.

Single source of truth for gating. Tier stored in public.org_subscriptions.tier
(free|pro|business); org_is_paid() already exists for RLS. Billing (Payriff) is deferred —
the admin sets a tier manually for now. AI model is chosen per tier for cost control:
Pro → claude-sonnet-5 (≈3× cheaper), Business → claude-opus-4-8 (best quality).

C2 — TRIAL: a newly created org (see routers/orgs.py) is opened on a 1-month Pro trial, because the
marketing copy promises "1 ay pulsuz sınaq". The trial is just a normal org_subscriptions row with
tier='pro', valid_until = trial end, trial_ends_at = the same instant and source='trial'; nothing
mutates or deletes it when it lapses, so the UI can still say "sınaq bitdi". Existing orgs were NOT
backfilled (migration 0043) — they keep whatever tier they have today."""
from __future__ import annotations

import math
from datetime import datetime, timezone

# Paket 1 = free, Paket 2 (10 AZN) = pro, Paket 3 (25 AZN) = business.
TIERS: dict[str, dict] = {
    "free": {
        "label_az": "Pulsuz", "price_azn": 0,
        "max_fields": 1,
        "sensors": ["hls", "s2"],          # S2 10m free on the single field (wow-factor)
        "advice_per_month": 1,             # 1 taste/month
        "chat_per_month": 0,
        "photo_per_month": 0,
        "passport": False, "weather_alerts": False, "irrigation": False,
        "email": False, "whatsapp": False,
        "pest_risk": False, "fertilizer": False, "benchmark": False, "reports": False,
        "research_depth": "regional",      # global + regional, no local
        "model": "claude-sonnet-5",
    },
    "pro": {
        "label_az": "Pro", "price_azn": 10,
        "max_fields": 5,
        "sensors": ["hls", "s2"],
        "advice_per_month": 8,
        "chat_per_month": 50,
        "photo_per_month": 0,
        "passport": True, "weather_alerts": True, "irrigation": True,
        "email": True, "whatsapp": False,
        "pest_risk": False, "fertilizer": False, "benchmark": False, "reports": False,
        "research_depth": "regional",
        "model": "claude-sonnet-5",
    },
    "business": {
        "label_az": "Business", "price_azn": 25,
        "max_fields": 100000,
        "sensors": ["hls", "s2"],
        "advice_per_month": 30,
        "chat_per_month": 300,
        "photo_per_month": 30,
        "passport": True, "weather_alerts": True, "irrigation": True,
        "email": True, "whatsapp": True,
        "pest_risk": True, "fertilizer": True, "benchmark": True, "reports": True,
        "research_depth": "local",
        "model": "claude-opus-4-8",
    },
}

DEFAULT_TIER = "free"

# C2 trial parameters. TRIAL_INTERVAL_SQL is inlined into the INSERT in routers/orgs.py as a
# Postgres interval literal (it is a constant in this file, never user input).
TRIAL_TIER = "pro"
TRIAL_INTERVAL_SQL = "1 month"
TRIAL_SOURCE = "trial"


def tier_config(tier: str | None) -> dict:
    return TIERS.get((tier or DEFAULT_TIER), TIERS[DEFAULT_TIER])


def allows(tier: str | None, feature: str) -> bool:
    """Boolean feature flag (passport, weather_alerts, irrigation, pest_risk, ...)."""
    return bool(tier_config(tier).get(feature, False))


def limit(tier: str | None, key: str) -> int:
    """Numeric monthly/quantity limit (advice_per_month, chat_per_month, max_fields, ...)."""
    return int(tier_config(tier).get(key, 0))


def model_for(tier: str | None) -> str:
    return tier_config(tier).get("model", "claude-sonnet-5")


async def _subscription_row(conn, org_id: str):
    """The org's subscription row with both time comparisons already resolved by Postgres.

    trial_ends_at/source are read via to_jsonb() instead of being named directly so this query also
    works against a database where migration 0043 has not been applied yet (`->>` on a missing key
    is NULL, while naming the column would raise UndefinedColumn — and because connection() runs
    inside a transaction that error would poison the whole request). Once 0043 is applied the
    values are identical to reading the columns."""
    return await conn.fetchrow(
        """select s.tier,
                  s.valid_until,
                  (s.valid_until > now())                                   as paid_valid,
                  (to_jsonb(s) ->> 'trial_ends_at')::timestamptz             as trial_ends_at,
                  coalesce(to_jsonb(s) ->> 'source', 'manual')               as source,
                  ((to_jsonb(s) ->> 'trial_ends_at')::timestamptz > now())   as trial_valid,
                  (s.valid_until > (to_jsonb(s) ->> 'trial_ends_at')::timestamptz)
                                                                             as extended_past_trial
             from public.org_subscriptions s
            where s.org_id = $1::uuid""", org_id)


async def org_tier(conn, org_id: str) -> str:
    """Effective tier for an org: the stored tier if the subscription is still valid, else free.

    ORDER MATTERS (paid check first, trial check second):
      1. The paid/valid_until rule is the original one and stays exactly as it was — an expired
         paid subscription falls back to free. It must run first because an admin- or PSP-granted
         subscription is expressed purely as tier + valid_until (see PUT /api/admin/subscriptions),
         and that grant has to win over any trial bookkeeping left on the row. A trial row is
         created with valid_until = the trial end, so this rule alone already ends the trial.
      2. The trial rule is the belt-and-braces second pass, scoped to rows the trial itself created
         (source='trial'): if trial_ends_at has passed, the org is back on free. It deliberately
         stands down when valid_until was pushed BEYOND trial_ends_at, because that is exactly how
         an admin records a real subscription for an org that started life on a trial.
    Neither rule writes anything: the row keeps tier='pro' + trial_ends_at so trial_state() (and
    the UI) can still say "sınaq bitdi"."""
    row = await _subscription_row(conn, org_id)
    if not row:
        return DEFAULT_TIER
    tier = row["tier"] or DEFAULT_TIER
    # (1) unchanged paid behaviour — valid_until defaults to 'infinity'; NULL compares as falsy.
    if tier in ("pro", "business") and not row["paid_valid"]:
        return DEFAULT_TIER
    # (2) trial expiry, never applied to a manual/billing row and never to an extended one.
    if (row["source"] == TRIAL_SOURCE
            and row["trial_ends_at"] is not None
            and not row["trial_valid"]
            and not row["extended_past_trial"]):
        return DEFAULT_TIER
    return tier


async def trial_state(conn, org_id: str) -> dict:
    """UI-facing state of the org's free trial. Never raises for a missing row/column.

    Returns {active, expired, days_left, ends_at (ISO|None), tier}. `active` and `expired` are both
    False when the org never had a trial (every organisation that predates migration 0043, and any
    row an admin created by hand)."""
    out: dict = {"active": False, "expired": False, "days_left": 0,
                 "ends_at": None, "tier": DEFAULT_TIER}
    row = await _subscription_row(conn, org_id)
    if not row:
        return out
    out["tier"] = row["tier"] or DEFAULT_TIER
    ends = row["trial_ends_at"]
    if row["source"] != TRIAL_SOURCE or ends is None:
        return out                       # no trial was ever granted to this org
    if out["tier"] not in ("pro", "business"):
        # An admin moved this org off the trial tier by hand — the row is no longer a trial story,
        # so say nothing rather than promise a trial the org does not have.
        return out
    if ends.tzinfo is None:              # defensive: asyncpg gives aware datetimes for timestamptz
        ends = ends.replace(tzinfo=timezone.utc)
    out["ends_at"] = ends.isoformat()
    active = bool(row["trial_valid"]) and not row["extended_past_trial"]
    out["active"] = active
    out["expired"] = (not active) and not row["extended_past_trial"]
    if active:
        # Round up, so the last partial day still reads "1 gün qalıb" instead of "0".
        out["days_left"] = max(
            0, math.ceil((ends - datetime.now(timezone.utc)).total_seconds() / 86400.0))
    return out


async def month_count(conn, org_id: str, kind: str) -> int:
    """How many AI calls of `kind` (advice|chat|photo) this calendar month for the org."""
    return int(await conn.fetchval(
        """select count(*) from public.ai_usage
           where org_id=$1::uuid and kind=$2
             and created_at >= date_trunc('month', now())""", org_id, kind) or 0)
