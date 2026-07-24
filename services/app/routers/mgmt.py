"""Tasks + operation log + yields (FR-12/13, §15–16)."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import (ROLES_WORKER, ROLES_WRITE, get_current_user_id,
                    require_member, require_role)
from ..schemas import OperationIn, TaskIn, TaskStatusIn, YieldIn
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["mgmt"])


# ---------- tasks ----------
@router.post("/tasks")
async def create_task(body: TaskIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_role(conn, user_id, body.org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """insert into public.tasks
                 (org_id, farm_id, field_id, title, type, assigned_to, due_date, priority, created_by, notes)
               values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::uuid,$7::date,$8,$9::uuid,$10)
               returning id, created_at""",
            body.org_id, body.farm_id, body.field_id, body.title, body.type,
            body.assigned_to, body.due_date, body.priority, user_id, body.notes)
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat()}


@router.get("/tasks")
async def list_tasks(org_id: str = Query(...), field_id: Optional[str] = None,
                     user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        q = ("select id, org_id, farm_id, field_id, title, type, assigned_to, due_date, status, priority, notes "
             "from public.tasks where org_id=$1::uuid")
        args = [org_id]
        if field_id:
            args.append(field_id); q += f" and field_id=${len(args)}::uuid"
        q += " order by coalesce(due_date, current_date), created_at"
        rows = await conn.fetch(q, *args)
    out = []
    for r in rows:
        d = dict(r)
        for k in ("id", "org_id", "farm_id", "field_id", "assigned_to"):
            d[k] = str(d[k]) if d[k] else None
        d["due_date"] = d["due_date"].isoformat() if d["due_date"] else None
        out.append(d)
    return out


@router.post("/tasks/{task_id}/status")
async def set_task_status(task_id: str, body: TaskStatusIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await conn.fetchval("select org_id from public.tasks where id=$1::uuid", task_id)
        if not org_id:
            raise HTTPException(status_code=404, detail="task_not_found")
        await require_role(conn, user_id, str(org_id), ROLES_WORKER)
        await conn.execute("update public.tasks set status=$2 where id=$1::uuid", task_id, body.status)
    return {"ok": True, "status": body.status}


# ---------- operations ----------
@router.post("/operations")
async def create_op(body: OperationIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, body.field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        row = await conn.fetchrow(
            """insert into public.field_operations
                 (field_id, org_id, type, performed_on, inputs, cost, currency, performed_by, notes)
               values ($1::uuid,$2::uuid,$3,$4::date,$5::jsonb,$6,$7,$8::uuid,$9)
               returning id, created_at""",
            body.field_id, org_id, body.type, body.performed_on, json.dumps(body.inputs),
            body.cost, body.currency, user_id, body.notes)
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat()}


@router.get("/operations")
async def list_ops(field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, type, performed_on, inputs, cost, currency, notes
               from public.field_operations where field_id=$1::uuid order by performed_on desc""", field_id)
    out = []
    for r in rows:
        d = dict(r); d["id"] = str(d["id"]); d["performed_on"] = d["performed_on"].isoformat()
        d["cost"] = float(d["cost"]) if d["cost"] is not None else None
        if isinstance(d.get("inputs"), str):
            d["inputs"] = json.loads(d["inputs"])
        out.append(d)
    return out


# ---------- yields ----------
@router.post("/yields")
async def create_yield(body: YieldIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, body.field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """insert into public.yields
                 (field_id, org_id, season_year, crop_type, yield_value, yield_unit, area_ha, revenue, price, notes)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10)
               on conflict (field_id, season_year, crop_type) do update set
                 yield_value=excluded.yield_value, yield_unit=excluded.yield_unit,
                 area_ha=excluded.area_ha, revenue=excluded.revenue, price=excluded.price,
                 notes=excluded.notes
               returning id""",
            body.field_id, org_id, body.season_year, body.crop_type, body.yield_value,
            body.yield_unit, body.area_ha, body.revenue, body.price, body.notes)
    return {"id": str(row["id"])}


@router.get("/yields")
async def list_yields(field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, season_year, crop_type, yield_value, yield_unit, area_ha, revenue, price, notes
               from public.yields where field_id=$1::uuid order by season_year""", field_id)
    out = []
    for r in rows:
        d = dict(r); d["id"] = str(d["id"])
        for k in ("yield_value", "area_ha", "revenue", "price"):
            d[k] = float(d[k]) if d[k] is not None else None
        out.append(d)
    return out
