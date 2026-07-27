"""Field operation log + spray safety (FR-13, §15).

Was "tasks + operations + yields". Tasks and yields were removed from the product; operations stay
because they are an INPUT TO THE AI, not bookkeeping — ai/context.py reads them so the advice can
say "irrigation was logged 10 days ago and NDMI is still falling, check the system"."""
import json
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..db import connection
from ..deps import (ROLES_WORKER, ROLES_WRITE, get_current_user_id,
                    require_member, require_role)
from ..schemas import OperationIn
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["mgmt"])


# ---------- tasks ----------
@router.post("/operations")
async def create_op(body: OperationIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, body.field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        row = await conn.fetchrow(
            """insert into public.field_operations
                 (field_id, org_id, type, performed_on, inputs, cost, currency, phi_days, performed_by, notes)
               values ($1::uuid,$2::uuid,$3,$4::date,$5::jsonb,$6,$7,$8,$9::uuid,$10)
               returning id, created_at""",
            body.field_id, org_id, body.type, body.performed_on, json.dumps(body.inputs),
            body.cost, body.currency, body.phi_days, user_id, body.notes)
    op_id = str(row["id"])
    return {"id": op_id, "created_at": row["created_at"].isoformat()}


@router.get("/operations")
async def list_ops(field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, type, performed_on, inputs, cost, currency, phi_days, notes
               from public.field_operations where field_id=$1::uuid order by performed_on desc""", field_id)
    out = []
    for r in rows:
        d = dict(r); d["id"] = str(d["id"]); d["performed_on"] = d["performed_on"].isoformat()
        d["cost"] = float(d["cost"]) if d["cost"] is not None else None
        if isinstance(d.get("inputs"), str):
            d["inputs"] = json.loads(d["inputs"])
        out.append(d)
    return out


# Spray safety (HYBRID_PLAN B6): pre-harvest interval countdown. For each spray op that carries a
# phi_days, the crop is unsafe to harvest until performed_on + phi_days. The active restriction is
# the one whose safe date is furthest in the future.
@router.get("/fields/{field_id}/spray-safety")
async def spray_safety(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, type, performed_on, phi_days, inputs, notes
               from public.field_operations
               where field_id=$1::uuid and phi_days is not null and phi_days > 0
               order by performed_on desc limit 50""", field_id)
    today = date.today()
    sprays = []
    active = None
    for r in rows:
        performed = r["performed_on"]
        safe = performed + timedelta(days=int(r["phi_days"]))
        days_left = (safe - today).days
        inputs = r["inputs"]
        if isinstance(inputs, str):
            inputs = json.loads(inputs)
        products = [str(i.get("product")) for i in (inputs or []) if isinstance(i, dict) and i.get("product")]
        item = {
            "id": str(r["id"]), "type": r["type"], "performed_on": performed.isoformat(),
            "phi_days": int(r["phi_days"]), "safe_date": safe.isoformat(),
            "days_left": days_left, "safe": days_left <= 0, "products": products,
        }
        sprays.append(item)
        # Active = the still-restricting spray with the latest safe date.
        if days_left > 0 and (active is None or safe > date.fromisoformat(active["safe_date"])):
            active = item
    return {"active": active, "sprays": sprays}


# ---------- yields ----------
