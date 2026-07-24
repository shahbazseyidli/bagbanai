"""Platform admin API (/api/admin/*): cross-org usage, activity, AI cost & billing.

The API connects as a superuser role and bypasses RLS, so these endpoints query
across ALL orgs/users directly. Every endpoint is gated by require_platform_admin
(users.is_admin). Read-only; no org scoping."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from .. import tiers
from ..ai import llm
from ..db import connection
from ..deps import get_current_user_id, require_platform_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

MARKUP_X = 3.0


def _f6(v) -> float:
    return round(float(v or 0), 6)


@router.get("/overview")
async def overview(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        row = await conn.fetchrow(
            """select
                 (select count(*) from public.users) as users,
                 (select count(*) from public.organizations) as orgs,
                 (select count(*) from public.farms) as farms,
                 (select count(*) from public.fields) as fields,
                 (select count(*) from public.advice) as advice_count,
                 (select count(*) from public.ai_chat_messages where role='user') as chat_count,
                 (select count(*) from public.ai_usage) as ai_calls,
                 (select coalesce(sum(input_tokens),0) from public.ai_usage) as input_tokens,
                 (select coalesce(sum(output_tokens),0) from public.ai_usage) as output_tokens,
                 (select coalesce(sum(cost_usd),0) from public.ai_usage) as cost_usd,
                 (select coalesce(sum(cost_usd),0) from public.ai_usage
                    where created_at >= date_trunc('month', now())) as cost_usd_month""")
    provider, model = llm.model_info()
    return {
        "users": int(row["users"]),
        "orgs": int(row["orgs"]),
        "farms": int(row["farms"]),
        "fields": int(row["fields"]),
        "advice_count": int(row["advice_count"]),
        "chat_count": int(row["chat_count"]),
        "ai_calls": int(row["ai_calls"]),
        "input_tokens": int(row["input_tokens"]),
        "output_tokens": int(row["output_tokens"]),
        "cost_usd": _f6(row["cost_usd"]),
        "cost_usd_month": _f6(row["cost_usd_month"]),
        "provider": provider,
        "model": model,
        "ai_configured": llm.is_configured(),
    }


@router.get("/tiers")
async def list_tiers(user_id: str = Depends(get_current_user_id)):
    """The tier catalogue (labels, price, limits) for the admin UI."""
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
    return {"tiers": tiers.TIERS}


@router.get("/subscriptions")
async def subscriptions(user_id: str = Depends(get_current_user_id)):
    """Every org with its effective package + owner + field count + this-month AI usage."""
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        rows = await conn.fetch(
            """select o.id, o.name,
                      u.email as owner_email,
                      coalesce(s.tier, 'free') as tier,
                      s.valid_until, s.hectare_cap, s.seats, s.updated_at,
                      (select count(*) from public.fields f where f.org_id=o.id) as fields,
                      (select count(*) from public.ai_usage a where a.org_id=o.id and a.kind='advice'
                         and a.created_at >= date_trunc('month', now())) as advice_month,
                      (select count(*) from public.ai_usage a where a.org_id=o.id and a.kind='chat'
                         and a.created_at >= date_trunc('month', now())) as chat_month
               from public.organizations o
               left join public.users u on u.id=o.owner_id
               left join public.org_subscriptions s on s.org_id=o.id
               order by o.created_at desc""")
    out = []
    for r in rows:
        out.append({
            "org_id": str(r["id"]), "name": r["name"], "owner_email": r["owner_email"],
            "tier": r["tier"], "label": tiers.tier_config(r["tier"])["label_az"],
            "valid_until": r["valid_until"].isoformat() if r["valid_until"] else None,
            "hectare_cap": float(r["hectare_cap"]) if r["hectare_cap"] is not None else None,
            "seats": r["seats"], "fields": int(r["fields"]),
            "advice_month": int(r["advice_month"]), "chat_month": int(r["chat_month"]),
            "advice_limit": tiers.limit(r["tier"], "advice_per_month"),
            "chat_limit": tiers.limit(r["tier"], "chat_per_month"),
        })
    return {"subscriptions": out}


class SubUpdate(BaseModel):
    tier: str
    valid_until: str | None = None   # ISO date; null → 'infinity' (admin-granted, no expiry)
    hectare_cap: float | None = None
    seats: int | None = None


@router.put("/subscriptions/{org_id}")
async def set_subscription(org_id: str, body: SubUpdate,
                           user_id: str = Depends(get_current_user_id)):
    """Admin sets an org's package (billing deferred → manual). Upserts org_subscriptions."""
    if body.tier not in tiers.TIERS:
        raise HTTPException(status_code=400, detail="unknown_tier")
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        await conn.execute(
            """insert into public.org_subscriptions (org_id, tier, valid_until, hectare_cap, seats, source, updated_at)
               values ($1::uuid, $2, coalesce($3::timestamptz, 'infinity'), $4, coalesce($5, 1), 'manual', now())
               on conflict (org_id) do update set
                 tier=excluded.tier, valid_until=excluded.valid_until,
                 hectare_cap=excluded.hectare_cap, seats=excluded.seats,
                 source='manual', updated_at=now()""",
            org_id, body.tier, body.valid_until, body.hectare_cap, body.seats)
    return {"ok": True, "tier": body.tier}


@router.get("/users")
async def users(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        rows = await conn.fetch(
            """select u.id, u.email, u.full_name, u.locale, u.is_admin, u.created_at,
                      om.org_name, om.role,
                      coalesce(us.ai_calls, 0)      as ai_calls,
                      coalesce(us.input_tokens, 0)  as input_tokens,
                      coalesce(us.output_tokens, 0) as output_tokens,
                      coalesce(us.cost_usd, 0)      as cost_usd,
                      greatest(u.created_at, us.last_used) as last_active
               from public.users u
               left join lateral (
                   select o.name as org_name, m.role
                   from public.organization_members m
                   join public.organizations o on o.id = m.org_id
                   where m.user_id = u.id
                   order by (m.role = 'owner') desc, m.created_at asc
                   limit 1
               ) om on true
               left join (
                   select user_id, count(*) as ai_calls,
                          sum(input_tokens) as input_tokens,
                          sum(output_tokens) as output_tokens,
                          sum(cost_usd) as cost_usd,
                          max(created_at) as last_used
                   from public.ai_usage group by user_id
               ) us on us.user_id = u.id
               order by coalesce(us.cost_usd, 0) desc, u.created_at desc""")
    return {"users": [
        {
            "id": str(r["id"]),
            "email": r["email"],
            "full_name": r["full_name"],
            "locale": r["locale"],
            "is_admin": bool(r["is_admin"]),
            "created_at": r["created_at"].isoformat(),
            "org_name": r["org_name"],
            "role": r["role"],
            "ai_calls": int(r["ai_calls"]),
            "input_tokens": int(r["input_tokens"]),
            "output_tokens": int(r["output_tokens"]),
            "cost_usd": _f6(r["cost_usd"]),
            "last_active": r["last_active"].isoformat() if r["last_active"] else None,
        }
        for r in rows
    ]}


@router.get("/activity")
async def activity(limit: int = Query(60, ge=1, le=500),
                   user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        rows = await conn.fetch(
            """select at, user_email, type, detail from (
                 select u.created_at::timestamptz as at, u.email as user_email,
                        'signup' as type, 'Qeydiyyatdan keçdi' as detail
                 from public.users u
                 union all
                 select f.created_at::timestamptz, u.email, 'field', 'Sahə: ' || f.name
                 from public.fields f join public.users u on u.id = f.created_by
                 union all
                 select a.generated_at::timestamptz, u.email, 'advice', 'AI məsləhət: ' || f.name
                 from public.advice a
                 join public.fields f on f.id = a.field_id
                 join public.organizations o on o.id = a.org_id
                 join public.users u on u.id = o.owner_id
                 union all
                 select m.created_at::timestamptz, u.email, 'chat', 'Sual: ' || left(m.content, 60)
                 from public.ai_chat_messages m
                 join public.users u on u.id = m.user_id
                 where m.role = 'user'
                 union all
                 select s.observed_at::timestamptz, u.email, 'scouting',
                        'Skautinq: ' || coalesce(s.category, '')
                 from public.scouting_observations s
                 join public.users u on u.id = s.created_by
                 union all
                 select t.created_at::timestamptz, u.email, 'task', 'Tapşırıq: ' || t.title
                 from public.tasks t join public.users u on u.id = t.created_by
               ) e
               order by at desc
               limit $1""", limit)
    return {"activity": [
        {
            "at": r["at"].isoformat(),
            "user_email": r["user_email"],
            "type": r["type"],
            "detail": r["detail"],
        }
        for r in rows
    ]}


@router.get("/usage")
async def usage(group: str = Query("user"),
                user_id: str = Depends(get_current_user_id)):
    if group not in ("user", "model", "day"):
        group = "user"
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        if group == "user":
            rows = await conn.fetch(
                """select us.user_id, u.email,
                          count(*) as ai_calls,
                          coalesce(sum(us.input_tokens), 0) as input_tokens,
                          coalesce(sum(us.output_tokens), 0) as output_tokens,
                          coalesce(sum(us.cost_usd), 0) as cost_usd
                   from public.ai_usage us
                   left join public.users u on u.id = us.user_id
                   group by us.user_id, u.email
                   order by coalesce(sum(us.cost_usd), 0) desc""")
            out = [
                {
                    "user_id": str(r["user_id"]) if r["user_id"] else None,
                    "email": r["email"],
                    "ai_calls": int(r["ai_calls"]),
                    "input_tokens": int(r["input_tokens"]),
                    "output_tokens": int(r["output_tokens"]),
                    "cost_usd": _f6(r["cost_usd"]),
                }
                for r in rows
            ]
        elif group == "model":
            rows = await conn.fetch(
                """select model,
                          count(*) as ai_calls,
                          coalesce(sum(input_tokens), 0) as input_tokens,
                          coalesce(sum(output_tokens), 0) as output_tokens,
                          coalesce(sum(cost_usd), 0) as cost_usd
                   from public.ai_usage
                   group by model
                   order by coalesce(sum(cost_usd), 0) desc""")
            out = [
                {
                    "model": r["model"],
                    "ai_calls": int(r["ai_calls"]),
                    "input_tokens": int(r["input_tokens"]),
                    "output_tokens": int(r["output_tokens"]),
                    "cost_usd": _f6(r["cost_usd"]),
                }
                for r in rows
            ]
        else:  # day
            rows = await conn.fetch(
                """select date_trunc('day', created_at)::date as day,
                          count(*) as ai_calls,
                          coalesce(sum(input_tokens), 0) as input_tokens,
                          coalesce(sum(output_tokens), 0) as output_tokens,
                          coalesce(sum(cost_usd), 0) as cost_usd
                   from public.ai_usage
                   where created_at >= now() - interval '30 days'
                   group by 1
                   order by day asc""")
            out = [
                {
                    "day": r["day"].isoformat(),
                    "ai_calls": int(r["ai_calls"]),
                    "input_tokens": int(r["input_tokens"]),
                    "output_tokens": int(r["output_tokens"]),
                    "cost_usd": _f6(r["cost_usd"]),
                }
                for r in rows
            ]
    return {"group": group, "rows": out}


@router.get("/billing")
async def billing(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        rows = await conn.fetch(
            """select o.id as org_id, o.name as org_name,
                      coalesce(s.tier, 'free') as plan,
                      coalesce(us.ai_calls, 0)      as ai_calls,
                      coalesce(us.input_tokens, 0)  as input_tokens,
                      coalesce(us.output_tokens, 0) as output_tokens,
                      coalesce(us.cost_usd, 0)      as cost_usd
               from public.organizations o
               left join public.org_subscriptions s on s.org_id = o.id
               left join (
                   select org_id, count(*) as ai_calls,
                          sum(input_tokens) as input_tokens,
                          sum(output_tokens) as output_tokens,
                          sum(cost_usd) as cost_usd
                   from public.ai_usage group by org_id
               ) us on us.org_id = o.id
               order by coalesce(us.cost_usd, 0) desc""")
        month_cost = await conn.fetchval(
            """select coalesce(sum(cost_usd), 0) from public.ai_usage
               where created_at >= date_trunc('month', now())""")
    orgs = []
    total_cost = 0.0
    total_suggested = 0.0
    for r in rows:
        cost = _f6(r["cost_usd"])
        suggested = round(cost * MARKUP_X, 2)
        total_cost += cost
        total_suggested += suggested
        orgs.append({
            "org_id": str(r["org_id"]),
            "org_name": r["org_name"],
            "plan": r["plan"],
            "ai_calls": int(r["ai_calls"]),
            "input_tokens": int(r["input_tokens"]),
            "output_tokens": int(r["output_tokens"]),
            "cost_usd": cost,
            "suggested_charge_usd": suggested,
        })
    return {
        "markup_x": MARKUP_X,
        "orgs": orgs,
        "total_cost_usd": round(total_cost, 6),
        "total_suggested_usd": round(total_suggested, 2),
        "month_cost_usd": _f6(month_cost),
    }
