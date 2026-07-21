"""Subscription tiers — feature flags + monthly limits per package.

Single source of truth for gating. Tier stored in public.org_subscriptions.tier
(free|pro|business); org_is_paid() already exists for RLS. Billing (Payriff) is deferred —
the admin sets a tier manually for now. AI model is chosen per tier for cost control:
Pro → claude-sonnet-5 (≈3× cheaper), Business → claude-opus-4-8 (best quality)."""
from __future__ import annotations

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


async def org_tier(conn, org_id: str) -> str:
    """Effective tier for an org: the stored tier if the subscription is still valid, else free."""
    row = await conn.fetchrow(
        """select tier, valid_until from public.org_subscriptions where org_id=$1::uuid""", org_id)
    if not row:
        return DEFAULT_TIER
    # valid_until defaults to 'infinity'; an expired paid sub falls back to free.
    valid = await conn.fetchval(
        "select $1::timestamptz > now()", row["valid_until"]) if row["valid_until"] else False
    if row["tier"] in ("pro", "business") and not valid:
        return DEFAULT_TIER
    return row["tier"] or DEFAULT_TIER


async def month_count(conn, org_id: str, kind: str) -> int:
    """How many AI calls of `kind` (advice|chat|photo) this calendar month for the org."""
    return int(await conn.fetchval(
        """select count(*) from public.ai_usage
           where org_id=$1::uuid and kind=$2
             and created_at >= date_trunc('month', now())""", org_id, kind) or 0)
