"""Scouting observations (FR-11, §14). worker+ can add; members read. Photos via /api/uploads."""
import json

from fastapi import APIRouter, Depends, Query

from ..db import connection
from ..deps import ROLES_WORKER, get_current_user_id, require_member, require_role
from ..schemas import ScoutingIn
from .fields import _org_of_field

router = APIRouter(prefix="/api/scouting", tags=["scouting"])


@router.post("")
async def create_obs(body: ScoutingIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, body.field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        geom_sql = "st_setsrid(st_point($5,$6),4326)" if (body.lon is not None and body.lat is not None) else "null"
        row = await conn.fetchrow(
            f"""insert into public.scouting_observations
                  (field_id, org_id, created_by, category, severity, note, photos, geom)
                values ($1::uuid,$2::uuid,$3::uuid,$4,$7,$8,$9::text[], {geom_sql})
                returning id, observed_at""",
            body.field_id, org_id, user_id, body.category,
            body.lon, body.lat, body.severity, body.note, body.photos)
    return {"id": str(row["id"]), "observed_at": row["observed_at"].isoformat()}


@router.get("")
async def list_obs(field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, category, severity, note, photos, status,
                      st_asgeojson(geom) as geom, observed_at
               from public.scouting_observations where field_id=$1::uuid order by observed_at desc""",
            field_id)
    out = []
    for r in rows:
        d = dict(r); d["id"] = str(d["id"]); d["observed_at"] = d["observed_at"].isoformat()
        d["geom"] = json.loads(d["geom"]) if d["geom"] else None
        out.append(d)
    return out
