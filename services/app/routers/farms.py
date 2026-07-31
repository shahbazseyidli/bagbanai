"""Farms (spec §7, §22). agronomist+ writes; members read."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

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


class FarmPatch(BaseModel):
    name: str | None = None
    region: str | None = None


@router.patch("/{farm_id}", response_model=FarmOut)
async def rename_farm(farm_id: str, body: FarmPatch, user_id: str = Depends(get_current_user_id)):
    """Rename a farm (and optionally set its region).

    THE FARM OBJECT WAS UNREACHABLE. `farms` has supported N per org since 0003, the fields list
    fans out over all of them, and the field header renders the farm name as a breadcrumb — but the
    only farm anyone had was the one onboarding auto-created, under a hardcoded name, with no way
    to rename it or add a second. So the object was visible enough to confuse and not editable at
    all, and the "one farm per client" grouping an agronomist actually needs was impossible to
    express.

    Same gate as creation (ROLES_WRITE), and the org is read from the ROW rather than the body: a
    farm_id the caller does not own must not be renamable by passing someone else's org_id.
    """
    async with connection(user_id) as conn:
        org_id = await conn.fetchval("select org_id from public.farms where id=$1::uuid", farm_id)
        if not org_id:
            raise HTTPException(status_code=404, detail="farm_not_found")
        await require_role(conn, user_id, str(org_id), ROLES_WRITE)
        name = (body.name or "").strip()
        if body.name is not None and not name:
            raise HTTPException(status_code=400, detail="name_required")
        row = await conn.fetchrow(
            """update public.farms
                  set name   = coalesce(nullif($2,''), name),
                      region = coalesce($3, region)
                where id=$1::uuid
                returning id, org_id, name, region""",
            farm_id, name, body.region)
    return FarmOut(id=str(row["id"]), org_id=str(row["org_id"]), name=row["name"], region=row["region"])
