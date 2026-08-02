"""Platform admin API (/api/admin/*): cross-org usage, activity, AI cost & billing.

The API connects as a superuser role and bypasses RLS, so these endpoints query
across ALL orgs/users directly. Every endpoint is gated by require_platform_admin
(users.is_admin). Mostly read-only; the user-management + export endpoints below are
the only mutating/streaming ones and stay just as strictly gated."""
import csv
import io
import json
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from .. import tiers
from ..ai import llm
from ..db import connection
from ..deps import get_current_user_id, require_platform_admin
# The ONE closure implementation, imported rather than reimplemented — a second path would
# be a second set of columns to remember to null, and the forgotten one leaks a name.
from .auth import anonymise_account, owns_org_with_other_members

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
            """select u.id, u.email, u.full_name, u.locale, u.is_admin,
                      u.is_active, u.email_verified, u.created_at,
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
            "is_active": bool(r["is_active"]),
            "email_verified": bool(r["email_verified"]),
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


# ---------------------------------------------------------------------------
# Full field visibility (list + map) across ALL orgs.
# ---------------------------------------------------------------------------

# The one query that powers both the admin field list and the admin field map. Kept as a module
# constant so /fields and the CSV/JSON export reuse EXACTLY the same shape (no drift).
_FIELDS_SQL = """
    select f.id, f.name, f.area_ha, fm.crop_type,
           f.org_id, o.name as org_name, u.email as owner_email,
           f.data_status, f.is_demo,
           st_asgeojson(f.geom) as geom,
           st_asgeojson(coalesce(f.centroid, st_centroid(f.geom))) as centroid,
           w.score as wellness_score, w.tone as wellness_tone
    from public.fields f
    join public.organizations o on o.id = f.org_id
    left join public.users u on u.id = o.owner_id
    left join public.field_metadata fm on fm.field_id = f.id
    left join lateral (
        select score, tone from public.field_wellness fw
        where fw.field_id = f.id
        order by fw.computed_on desc
        limit 1
    ) w on true
    where f.deleted_at is null and f.geom is not null
    order by o.name asc, f.name asc
"""


def _centroid_lonlat(centroid_json: str | None):
    """Point GeoJSON string → [lon, lat] (matches the DB SRID 4326 axis order)."""
    if not centroid_json:
        return None
    try:
        coords = json.loads(centroid_json).get("coordinates")
        if isinstance(coords, list) and len(coords) >= 2:
            return [float(coords[0]), float(coords[1])]
    except (ValueError, TypeError):
        pass
    return None


def _field_row(r) -> dict:
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "area_ha": float(r["area_ha"]) if r["area_ha"] is not None else None,
        "crop_type": r["crop_type"],
        "org_id": str(r["org_id"]),
        "org_name": r["org_name"],
        "owner_email": r["owner_email"],
        "data_status": r["data_status"],
        "is_demo": bool(r["is_demo"]),
        "centroid": _centroid_lonlat(r["centroid"]),
        "geom": json.loads(r["geom"]) if r["geom"] else None,
        "wellness_score": int(r["wellness_score"]) if r["wellness_score"] is not None else None,
        "wellness_tone": r["wellness_tone"],
    }


@router.get("/fields")
async def list_all_fields(user_id: str = Depends(get_current_user_id)):
    """EVERY field across ALL orgs — powers the admin global list AND map."""
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        rows = await conn.fetch(_FIELDS_SQL)
    return {"fields": [_field_row(r) for r in rows]}


@router.get("/fields/{field_id}")
async def get_field_admin(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Admin-scoped read of ONE field — bypasses org membership (does NOT touch the normal
    require_member-gated field routes). Field row + latest advice + recent index_stats summary."""
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        row = await conn.fetchrow(
            """select f.id, f.farm_id, f.org_id, o.name as org_name, u.email as owner_email,
                      f.name, f.area_ha, f.data_status, f.created_at,
                      fm.crop_type, fm.variety, fm.planting_date, fm.growth_stage,
                      st_asgeojson(f.geom) as geom,
                      st_asgeojson(coalesce(f.centroid, st_centroid(f.geom))) as centroid,
                      w.score as wellness_score, w.tone as wellness_tone, w.headline as wellness_headline
               from public.fields f
               join public.organizations o on o.id = f.org_id
               left join public.users u on u.id = o.owner_id
               left join public.field_metadata fm on fm.field_id = f.id
               left join lateral (
                   select score, tone, headline from public.field_wellness fw
                   where fw.field_id = f.id order by fw.computed_on desc limit 1
               ) w on true
               where f.id = $1::uuid and f.deleted_at is null""", field_id)
        if not row:
            raise HTTPException(status_code=404, detail="field_not_found")
        # Deliberately still "newest wins, any language" — an admin investigating a complaint needs
        # to see the row the farmer would have been served, not a friendlier one. `lang` is selected
        # so the panel can SAY which language it is instead of silently showing foreign prose.
        advice = await conn.fetchrow(
            """select summary, findings, generated_at, lang
               from public.advice where field_id = $1::uuid
               order by generated_at desc limit 1""", field_id)
        indices = await conn.fetch(
            """select distinct on (index_name) index_name, mean, p50, acquired_at
               from public.index_stats where field_id = $1::uuid
               order by index_name asc, acquired_at desc""", field_id)
        scene_count = await conn.fetchval(
            "select count(*) from public.scenes where field_id = $1::uuid", field_id)
    return {
        "id": str(row["id"]),
        "farm_id": str(row["farm_id"]),
        "org_id": str(row["org_id"]),
        "org_name": row["org_name"],
        "owner_email": row["owner_email"],
        "name": row["name"],
        "area_ha": float(row["area_ha"]) if row["area_ha"] is not None else None,
        "crop_type": row["crop_type"],
        "variety": row["variety"],
        "planting_date": row["planting_date"].isoformat() if row["planting_date"] else None,
        "growth_stage": row["growth_stage"],
        "data_status": row["data_status"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "geom": json.loads(row["geom"]) if row["geom"] else None,
        "centroid": _centroid_lonlat(row["centroid"]),
        "wellness_score": int(row["wellness_score"]) if row["wellness_score"] is not None else None,
        "wellness_tone": row["wellness_tone"],
        "wellness_headline": row["wellness_headline"],
        "advice": {
            "summary": advice["summary"],
            # findings jsonb comes back as dict (codec) or str (raw) depending on the pool — normalize.
            "findings": (advice["findings"] if isinstance(advice["findings"], (dict, list))
                         else json.loads(advice["findings"] or "null")),
            "generated_at": advice["generated_at"].isoformat() if advice["generated_at"] else None,
            "lang": advice["lang"],
        } if advice else None,
        "scene_count": int(scene_count or 0),
        "indices": [
            {
                "index_name": r["index_name"],
                "mean": float(r["mean"]) if r["mean"] is not None else None,
                "p50": float(r["p50"]) if r["p50"] is not None else None,
                "acquired_at": r["acquired_at"].isoformat() if r["acquired_at"] else None,
            }
            for r in indices
        ],
    }


class FieldPatch(BaseModel):
    is_demo: bool


def _admin_uid(value: str, detail: str = "field_not_found") -> str:
    """Canonicalise a path uuid. Mirrors shares.py::_uid — a malformed id is a 404, not a Postgres
    22P02 surfacing as a 500.

    `detail` is a parameter because this is used by both the field and the user routes now, and a
    bad USER id answering "field_not_found" sends whoever reads the log to the wrong table.
    """
    try:
        return str(_uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail=detail)


@router.patch("/fields/{field_id}")
async def patch_field(field_id: str, body: FieldPatch,
                      user_id: str = Depends(get_current_user_id)):
    """Flag ONE field as the public /demo tour field (or clear the flag).

    Migration 0050's partial unique index allows a single demo row, so promoting a new field has to
    clear the old one FIRST — inside the same transaction, or a swap would be rejected halfway and
    leave the platform with no demo at all."""
    # A malformed id must 404, not reach Postgres and come back as a 22P02 → 500.
    target = _admin_uid(field_id)
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        async with conn.transaction():
            if body.is_demo:
                await conn.execute("update public.fields set is_demo = false where is_demo")
            row = await conn.fetchrow(
                "update public.fields set is_demo = $1 where id = $2::uuid and deleted_at is null "
                "returning id, is_demo", body.is_demo, target)
            # INSIDE the transaction on purpose. Raising here rolls the clear back; raising after
            # the block would commit it — promoting a field that no longer exists (a stale id from
            # a cached list, or one soft-deleted a second ago) would then answer 404 having already
            # left the platform with NO demo field, and /demo would break for every visitor.
            if not row:
                raise HTTPException(status_code=404, detail="field_not_found")
    return {"id": str(row["id"]), "is_demo": bool(row["is_demo"])}


# ---------------------------------------------------------------------------
# User management (activate/deactivate, grant/revoke admin, verify, rename).
# ---------------------------------------------------------------------------

class UserPatch(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None
    email_verified: bool | None = None
    full_name: str | None = None
    # Widened for the detail drawer. Deliberately NOT here: email (it is the login identity and
    # 0059's unique index; changing it silently moves an account someone else may be trying to
    # reach) and password_hash (an admin who can set a password can impersonate — support resets
    # go through the magic link the owner receives, not through us).
    locale: str | None = None
    role: str | None = None
    country: str | None = None
    region: str | None = None


@router.patch("/users/{user_id_target}")
async def patch_user(user_id_target: str, body: UserPatch,
                     user_id: str = Depends(get_current_user_id)):
    """Set is_active / is_admin / email_verified / full_name on any user.
    Guard: an admin can NEVER remove their OWN is_admin (avoids self-lockout)."""
    if body.is_admin is False and user_id_target == user_id:
        raise HTTPException(status_code=400, detail="cannot_self_demote")

    sets: list[str] = []
    vals: list = []
    idx = 1
    if body.is_active is not None:
        sets.append(f"is_active = ${idx}"); vals.append(body.is_active); idx += 1
    if body.is_admin is not None:
        sets.append(f"is_admin = ${idx}"); vals.append(body.is_admin); idx += 1
    if body.email_verified is not None:
        sets.append(f"email_verified = ${idx}"); vals.append(body.email_verified); idx += 1
    if body.full_name is not None:
        sets.append(f"full_name = ${idx}"); vals.append(body.full_name); idx += 1
    if not sets:
        raise HTTPException(status_code=400, detail="no_changes")

    vals.append(user_id_target)
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        row = await conn.fetchrow(
            f"update public.users set {', '.join(sets)} where id = ${idx}::uuid "
            "returning id, email, full_name, is_admin, is_active, email_verified", *vals)
    if not row:
        raise HTTPException(status_code=404, detail="user_not_found")
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "full_name": row["full_name"],
        "is_admin": bool(row["is_admin"]),
        "is_active": bool(row["is_active"]),
        "email_verified": bool(row["email_verified"]),
    }


# ---------------------------------------------------------------------------
# Data export (CSV / JSON) — reuses the same queries as the read endpoints.
# ---------------------------------------------------------------------------

async def _export_rows(conn, kind: str) -> tuple[list[str], list[dict]]:
    """Return (ordered column names, list-of-dict rows) for the requested dataset."""
    if kind == "orgs":
        rows = await conn.fetch(
            """select o.id as org_id, o.name, u.email as owner_email,
                      coalesce(s.tier, 'free') as tier,
                      (select count(*) from public.fields f where f.org_id=o.id and f.deleted_at is null) as fields,
                      o.created_at
               from public.organizations o
               left join public.users u on u.id = o.owner_id
               left join public.org_subscriptions s on s.org_id = o.id
               order by o.created_at desc""")
        cols = ["org_id", "name", "owner_email", "tier", "fields", "created_at"]
        data = [{
            "org_id": str(r["org_id"]), "name": r["name"], "owner_email": r["owner_email"],
            "tier": r["tier"], "fields": int(r["fields"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
        } for r in rows]
        return cols, data

    if kind == "users":
        rows = await conn.fetch(
            """select u.id, u.email, u.full_name, u.locale, u.is_admin, u.is_active,
                      u.email_verified, u.created_at
               from public.users u order by u.created_at desc""")
        cols = ["id", "email", "full_name", "locale", "is_admin", "is_active",
                "email_verified", "created_at"]
        data = [{
            "id": str(r["id"]), "email": r["email"], "full_name": r["full_name"] or "",
            "locale": r["locale"], "is_admin": bool(r["is_admin"]),
            "is_active": bool(r["is_active"]), "email_verified": bool(r["email_verified"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
        } for r in rows]
        return cols, data

    if kind == "fields":
        rows = await conn.fetch(_FIELDS_SQL)
        cols = ["id", "name", "org_name", "owner_email", "crop_type", "area_ha",
                "data_status", "wellness_score", "wellness_tone"]
        data = [{
            "id": str(r["id"]), "name": r["name"], "org_name": r["org_name"],
            "owner_email": r["owner_email"], "crop_type": r["crop_type"] or "",
            "area_ha": float(r["area_ha"]) if r["area_ha"] is not None else "",
            "data_status": r["data_status"],
            "wellness_score": int(r["wellness_score"]) if r["wellness_score"] is not None else "",
            "wellness_tone": r["wellness_tone"] or "",
        } for r in rows]
        return cols, data

    # usage — per-user AI usage totals
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
    cols = ["user_id", "email", "ai_calls", "input_tokens", "output_tokens", "cost_usd"]
    data = [{
        "user_id": str(r["user_id"]) if r["user_id"] else "",
        "email": r["email"] or "", "ai_calls": int(r["ai_calls"]),
        "input_tokens": int(r["input_tokens"]), "output_tokens": int(r["output_tokens"]),
        "cost_usd": _f6(r["cost_usd"]),
    } for r in rows]
    return cols, data


@router.get("/users/{user_id_target}")
async def user_detail(user_id_target: str, user_id: str = Depends(get_current_user_id)):
    """Everything the platform knows about ONE account, for the admin drawer.

    Seven cheap indexed reads rather than one join: the shapes are unrelated (a profile row, a
    membership list, a field list, a usage rollup, an event tail) and forcing them into a single
    statement would multiply rows and then need un-multiplying in Python.

    ADMIN-SCOPED: bypasses org membership on purpose — that is the whole point of the panel — but
    it is still a READ. Nothing here writes, and the routes that do write are separate and guarded
    one by one.
    """
    target = _admin_uid(user_id_target, "user_not_found")
    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)

        u = await conn.fetchrow(
            """select id, email, full_name, phone, locale, role, country, region, is_admin,
                      is_active, email_verified, email_lifecycle, area_unit, name_public,
                      created_at, last_seen_at, deleted_at, onboarding,
                      (password_hash <> '!') as has_password,
                      (google_sub is not null) as has_google
                 from public.users where id=$1::uuid""", target)
        if not u:
            raise HTTPException(status_code=404, detail="user_not_found")

        orgs = await conn.fetch(
            """select o.id, o.name, m.role, m.status, m.created_at,
                      (o.owner_id = $1::uuid) as is_owner,
                      coalesce(s.tier, 'free') as tier, s.valid_until,
                      (select count(*) from public.organization_members m2
                        where m2.org_id = o.id and m2.status = 'active') as members
                 from public.organization_members m
                 join public.organizations o on o.id = m.org_id
                 left join public.org_subscriptions s on s.org_id = o.id
                where m.user_id = $1::uuid
                order by is_owner desc, o.name""", target)

        # Fields the person can reach through those memberships, with the numbers the admin is
        # actually looking for: is it processing, has it ever been imaged, how healthy is it.
        fields = await conn.fetch(
            """select f.id, f.name, f.area_ha, f.data_status, f.created_at, f.deleted_at,
                      fa.name as farm_name, o.name as org_name,
                      m.crop_type, m.crop_cycle, m.region as field_region,
                      (select max(acquired_at) from public.scenes sc where sc.field_id = f.id) as last_scene,
                      (select count(*) from public.scenes sc where sc.field_id = f.id) as scenes,
                      w.score, w.tone
                 from public.fields f
                 join public.farms fa on fa.id = f.farm_id
                 join public.organizations o on o.id = f.org_id
                 left join public.field_metadata m on m.field_id = f.id
                 left join lateral (
                     select score, tone from public.field_wellness ww
                      where ww.field_id = f.id order by computed_on desc limit 1
                 ) w on true
                where f.org_id in (select org_id from public.organization_members
                                    where user_id = $1::uuid)
                order by f.deleted_at nulls first, f.created_at desc""", target)

        usage = await conn.fetchrow(
            """select count(*) as calls, coalesce(sum(input_tokens),0) as inp,
                      coalesce(sum(output_tokens),0) as outp, coalesce(sum(cost_usd),0) as cost,
                      max(created_at) as last_used
                 from public.ai_usage where user_id=$1::uuid""", target)
        by_kind = await conn.fetch(
            """select kind, count(*) as calls, coalesce(sum(cost_usd),0) as cost
                 from public.ai_usage where user_id=$1::uuid group by kind order by cost desc""",
            target)

        events = await conn.fetch(
            # The column is `name`, not `type` (0029) — aliased so the JSON key stays "type",
            # which is what the activity tab already calls it.
            """select name as type, created_at from public.user_events
                where user_id=$1::uuid order by created_at desc limit 25""", target)
        channels = await conn.fetch(
            """select channel, verified, opt_in from public.messaging_channels
                where user_id=$1::uuid""", target)
        pushes = await conn.fetchval(
            "select count(*) from public.push_subscriptions where user_id=$1::uuid", target)

        # Surfaced because it is the one thing that BLOCKS closing the account, and an admin should
        # see the reason before pressing the button rather than after.
        blocks_close = await owns_org_with_other_members(conn, target)

    return {
        "user": {
            "id": str(u["id"]), "email": u["email"], "full_name": u["full_name"],
            "phone": u["phone"], "locale": u["locale"], "role": u["role"],
            "country": u["country"], "region": u["region"],
            "is_admin": bool(u["is_admin"]), "is_active": bool(u["is_active"]),
            "email_verified": bool(u["email_verified"]),
            "email_lifecycle": bool(u["email_lifecycle"]),
            "area_unit": u["area_unit"], "name_public": u["name_public"],
            "created_at": u["created_at"].isoformat() if u["created_at"] else None,
            "last_seen_at": u["last_seen_at"].isoformat() if u["last_seen_at"] else None,
            "deleted_at": u["deleted_at"].isoformat() if u["deleted_at"] else None,
            "onboarding": u["onboarding"],
            # How this person can actually get in. An account with none of the three can only
            # arrive by magic link, which is worth seeing at a glance when someone reports being
            # locked out.
            "has_password": bool(u["has_password"]), "has_google": bool(u["has_google"]),
        },
        "orgs": [{"id": str(o["id"]), "name": o["name"], "role": o["role"],
                  "status": o["status"], "is_owner": bool(o["is_owner"]),
                  "members": int(o["members"]), "tier": o["tier"],
                  "valid_until": o["valid_until"].isoformat() if o["valid_until"] else None}
                 for o in orgs],
        "fields": [{"id": str(f["id"]), "name": f["name"],
                    "area_ha": float(f["area_ha"]) if f["area_ha"] is not None else None,
                    "farm_name": f["farm_name"], "org_name": f["org_name"],
                    "crop_type": f["crop_type"], "crop_cycle": f["crop_cycle"],
                    "region": f["field_region"], "data_status": f["data_status"],
                    "scenes": int(f["scenes"] or 0),
                    "last_scene": f["last_scene"].isoformat() if f["last_scene"] else None,
                    "score": int(f["score"]) if f["score"] is not None else None,
                    "tone": f["tone"],
                    "deleted": f["deleted_at"] is not None,
                    "created_at": f["created_at"].isoformat() if f["created_at"] else None}
                   for f in fields],
        "usage": {"calls": int(usage["calls"] or 0), "input_tokens": int(usage["inp"] or 0),
                  "output_tokens": int(usage["outp"] or 0), "cost_usd": _f6(usage["cost"]),
                  "last_used": usage["last_used"].isoformat() if usage["last_used"] else None,
                  "by_kind": [{"kind": k["kind"], "calls": int(k["calls"]),
                               "cost_usd": _f6(k["cost"])} for k in by_kind]},
        "events": [{"type": e["type"], "at": e["created_at"].isoformat()} for e in events],
        "channels": [{"channel": c["channel"], "verified": bool(c["verified"]),
                      "opt_in": bool(c["opt_in"])} for c in channels],
        "push_devices": int(pushes or 0),
        "blocks_close": bool(blocks_close),
    }


class UserDelete(BaseModel):
    # The target's own address, typed by the admin. Not a checkbox: the point is to make it
    # impossible to close the wrong account by clicking the wrong row.
    email: str


# POST, not DELETE: the body carries the typed confirmation address, api.del() sends no body,
# and the account owner's own closure (/api/auth/account/delete) is already a POST with the
# same shape. Matching it beats inventing a second convention for the same act.
@router.post("/users/{user_id_target}/close")
async def close_user_account(user_id_target: str, body: UserDelete,
                             user_id: str = Depends(get_current_user_id)):
    """Close somebody else's account, as a platform admin. Irreversible.

    Runs the SAME anonymisation the owner's own /api/auth/account/delete runs — imported, not
    reimplemented. A second closure path would be a second set of columns to remember to null, and
    the one that gets forgotten leaks a name or an email into a "deleted" account.

    Three guards, each for a failure this panel would otherwise make easy:
      * not yourself — an admin one misclick from erasing their own access, in a product with
        exactly one admin account;
      * not another platform admin — demote them first, so removing an administrator is always two
        deliberate acts;
      * not an owner of an org with other active members — the same refusal the self-service route
        gives, because the consequence is the same: colleagues' fields behind a vanished owner.
    """
    target = _admin_uid(user_id_target, "user_not_found")
    if target == user_id:
        raise HTTPException(status_code=400, detail="cannot_delete_self")

    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        row = await conn.fetchrow(
            "select email, is_admin from public.users where id=$1::uuid and deleted_at is null",
            target)
        if not row:
            raise HTTPException(status_code=404, detail="user_not_found")
        if row["is_admin"]:
            raise HTTPException(status_code=400, detail="demote_admin_first")
        if (body.email or "").strip().lower() != (row["email"] or "").lower():
            raise HTTPException(status_code=400, detail="confirm_email_mismatch")
        if await owns_org_with_other_members(conn, target):
            raise HTTPException(status_code=409, detail="transfer_ownership_first")
        await anonymise_account(conn, target)
    return {"ok": True}


@router.get("/export")
async def export_data(kind: str = Query("orgs"), format: str = Query("csv"),
                      user_id: str = Depends(get_current_user_id)):
    """Stream a CSV or JSON dump of orgs | users | fields | usage."""
    if kind not in ("orgs", "users", "fields", "usage"):
        raise HTTPException(status_code=400, detail="unknown_kind")
    if format not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="unknown_format")

    async with connection(user_id) as conn:
        await require_platform_admin(conn, user_id)
        cols, data = await _export_rows(conn, kind)

    if format == "json":
        return Response(
            content=json.dumps(data, ensure_ascii=False),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{kind}.json"'})

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    for r in data:
        writer.writerow(r)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{kind}.csv"'})
