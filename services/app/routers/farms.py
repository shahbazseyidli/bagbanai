"""Farms (spec §7, §22). agronomist+ writes; members read."""
from fastapi import APIRouter, Depends, Query

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from ..schemas import FarmIn, FarmOut

router = APIRouter(prefix="/api/farms", tags=["farms"])


@router.post("", response_model=FarmOut)
async def create_farm(body: FarmIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_role(conn, user_id, body.org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            "insert into public.farms (org_id, name, region) values ($1::uuid,$2,$3) returning id, org_id, name, region",
            body.org_id, body.name, body.region)
    return FarmOut(id=str(row["id"]), org_id=str(row["org_id"]), name=row["name"], region=row["region"])


@router.get("", response_model=list[FarmOut])
async def list_farms(org_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            "select id, org_id, name, region from public.farms where org_id=$1::uuid order by created_at", org_id)
    return [FarmOut(id=str(r["id"]), org_id=str(r["org_id"]), name=r["name"], region=r["region"]) for r in rows]
