"""Organizations, membership, invites, roles (spec §18, §22, §8 matrix)."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..db import connection
from ..deps import ROLES_ADMIN, get_current_user_id, require_member, require_role
from ..schemas import InviteIn, OrgIn, OrgOut, RoleChangeIn

router = APIRouter(prefix="/api/orgs", tags=["orgs"])


@router.post("", response_model=OrgOut)
async def create_org(body: OrgIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org = await conn.fetchrow(
            "insert into public.organizations (name, owner_id, country) values ($1,$2::uuid,$3) returning id, name, country",
            body.name, user_id, body.country)
        await conn.execute(
            "insert into public.organization_members (org_id, user_id, role, status) values ($1,$2::uuid,'owner','active')",
            org["id"], user_id)
        await conn.execute(
            "insert into public.org_subscriptions (org_id, tier) values ($1,'free') on conflict do nothing",
            org["id"])
    return OrgOut(id=str(org["id"]), name=org["name"], country=org["country"], role="owner")


@router.get("", response_model=list[OrgOut])
async def list_orgs(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        rows = await conn.fetch(
            """select o.id, o.name, o.country, m.role
               from public.organizations o
               join public.organization_members m on m.org_id=o.id
               where m.user_id=$1::uuid and m.status='active'
               order by o.created_at""", user_id)
    return [OrgOut(id=str(r["id"]), name=r["name"], country=r["country"], role=r["role"]) for r in rows]


@router.get("/{org_id}/members")
async def list_members(org_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select m.user_id, u.email, u.full_name, m.role, m.status
               from public.organization_members m
               join public.users u on u.id=m.user_id
               where m.org_id=$1::uuid order by m.created_at""", org_id)
    return [dict(user_id=str(r["user_id"]), email=r["email"], full_name=r["full_name"],
                 role=r["role"], status=r["status"]) for r in rows]


@router.post("/{org_id}/invite")
async def invite(org_id: str, body: InviteIn, user_id: str = Depends(get_current_user_id)):
    token = secrets.token_urlsafe(24)
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_ADMIN)
        await conn.execute(
            "insert into public.org_invites (org_id, email, role, token, expires_at) values ($1::uuid,$2,$3::org_role,$4,$5)",
            org_id, body.email, body.role.value, token, expires)
    # Email dispatch is deferred (Phase 2 / n8n); return the acceptance link for now.
    return {"token": token, "expires_at": expires.isoformat(),
            "accept_path": f"/invite/{token}"}


@router.post("/invites/{token}/accept", response_model=OrgOut)
async def accept_invite(token: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        inv = await conn.fetchrow(
            "select org_id, email, role, expires_at, accepted_at from public.org_invites where token=$1", token)
        if not inv:
            raise HTTPException(status_code=404, detail="invite_not_found")
        if inv["accepted_at"] is not None:
            raise HTTPException(status_code=409, detail="invite_used")
        if inv["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="invite_expired")
        await conn.execute(
            """insert into public.organization_members (org_id, user_id, role, status)
               values ($1,$2::uuid,$3,'active')
               on conflict (org_id, user_id) do update set role=excluded.role, status='active'""",
            inv["org_id"], user_id, inv["role"])
        await conn.execute("update public.org_invites set accepted_at=now() where token=$1", token)
        org = await conn.fetchrow(
            "select id, name, country from public.organizations where id=$1", inv["org_id"])
    return OrgOut(id=str(org["id"]), name=org["name"], country=org["country"], role=inv["role"])


@router.post("/{org_id}/members/{member_id}/role")
async def change_role(org_id: str, member_id: str, body: RoleChangeIn,
                      user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_ADMIN)
        # protect the owner from being demoted here
        target = await conn.fetchrow(
            "select role from public.organization_members where org_id=$1::uuid and user_id=$2::uuid",
            org_id, member_id)
        if not target:
            raise HTTPException(status_code=404, detail="member_not_found")
        if target["role"] == "owner":
            raise HTTPException(status_code=409, detail="cannot_change_owner")
        await conn.execute(
            "update public.organization_members set role=$3::org_role where org_id=$1::uuid and user_id=$2::uuid",
            org_id, member_id, body.role.value)
    return {"ok": True, "role": body.role.value}
