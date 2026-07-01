"""Auth dependencies + server-side gating utilities (spec §8/§22).

Gating is enforced here (primary) and mirrored by RLS (defense-in-depth)."""
from typing import Optional

import asyncpg
from fastapi import Cookie, Depends, Header, HTTPException

from .config import settings
from .schemas import OrgRole
from .security import decode_token


def _extract_token(cookie_val: Optional[str], authorization: Optional[str]) -> Optional[str]:
    if cookie_val:
        return cookie_val
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:]
    return None


async def get_current_user_id(
    session: Optional[str] = Cookie(default=None, alias=settings.cookie_name),
    authorization: Optional[str] = Header(default=None),
) -> str:
    token = _extract_token(session, authorization)
    uid = decode_token(token) if token else None
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")
    return uid


async def get_optional_user_id(
    session: Optional[str] = Cookie(default=None, alias=settings.cookie_name),
    authorization: Optional[str] = Header(default=None),
) -> Optional[str]:
    token = _extract_token(session, authorization)
    return decode_token(token) if token else None


async def require_internal(x_internal_token: Optional[str] = Header(default=None)) -> None:
    if x_internal_token != settings.internal_api_token:
        raise HTTPException(status_code=401, detail="internal_only")


# ---- gating utilities (called inside endpoints, with an open connection) ----
async def is_org_member(conn: asyncpg.Connection, user_id: str, org_id: str) -> bool:
    return bool(await conn.fetchval(
        "select public.is_org_member($1::uuid, $2::uuid)", user_id, org_id))


async def require_member(conn: asyncpg.Connection, user_id: str, org_id: str) -> None:
    if not await is_org_member(conn, user_id, org_id):
        raise HTTPException(status_code=403, detail="forbidden")


async def require_role(conn: asyncpg.Connection, user_id: str, org_id: str,
                       roles: list[OrgRole]) -> None:
    ok = await conn.fetchval(
        "select public.has_org_role($1::uuid, $2::uuid, $3::org_role[])",
        user_id, org_id, [r.value for r in roles])
    if not ok:
        raise HTTPException(status_code=403, detail="forbidden")


async def require_paid(conn: asyncpg.Connection, org_id: str) -> None:
    if not await conn.fetchval("select public.org_is_paid($1::uuid)", org_id):
        raise HTTPException(status_code=402, detail="paid_feature")


# convenience role groups (spec §8 matrix)
ROLES_WRITE = [OrgRole.owner, OrgRole.admin, OrgRole.agronomist]
ROLES_WORKER = [OrgRole.owner, OrgRole.admin, OrgRole.agronomist, OrgRole.worker]
ROLES_ADMIN = [OrgRole.owner, OrgRole.admin]
