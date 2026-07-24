"""Tasks + operation log + yields (FR-12/13, §15–16)."""
import json
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response

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


# Season task chain (HYBRID_PLAN B5): generate a set of dated tasks from the field's crop + planting
# date. Marked [auto] so re-running replaces the prior chain (no duplicates).
_AUTO_MARK = "[auto] mövsüm zənciri"
_CHAIN = [
    (20, "irrigation", "Suvarma yoxlaması"),
    (30, "fertilizing", "Gübrələmə"),
    (45, "spraying", "Çiləmə pəncərəsini yoxla"),
    (120, "harvest", "Gözlənilən yığım"),
]


def _as_date(v) -> Optional[date]:
    if isinstance(v, date):
        return v
    if isinstance(v, str) and v.strip():
        try:
            return datetime.fromisoformat(v[:10]).date()
        except ValueError:
            return None
    return None


@router.post("/fields/{field_id}/tasks/generate")
async def generate_task_chain(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Regenerate the field's auto season task chain from crop + planting date."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        meta = await conn.fetchrow(
            "select crop_type, planting_date, expected_harvest, farm_id "
            "from public.field_metadata m join public.fields f on f.id=m.field_id "
            "where m.field_id=$1::uuid", field_id)
        farm_id = await conn.fetchval("select farm_id from public.fields where id=$1::uuid", field_id)
        base = _as_date(meta["planting_date"]) if meta else None
        harvest = _as_date(meta["expected_harvest"]) if meta else None
        base = base or date.today()
        # Clear the prior auto chain (open tasks only — never touch completed history).
        await conn.execute(
            "delete from public.tasks where field_id=$1::uuid and notes=$2 and status <> 'done'",
            field_id, _AUTO_MARK)
        created = 0
        for offset, ttype, title in _CHAIN:
            due = harvest if (ttype == "harvest" and harvest) else base + timedelta(days=offset)
            await conn.execute(
                """insert into public.tasks
                     (org_id, farm_id, field_id, title, type, due_date, priority, created_by, notes, status)
                   values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::date,$7,$8::uuid,$9,'todo')""",
                org_id, farm_id, field_id, title, ttype, due, "medium", user_id, _AUTO_MARK)
            created += 1
    return {"ok": True, "created": created}


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


# Calendar export (HYBRID_PLAN B10): a field's dated tasks as an .ics file. Delivered as a plain
# same-origin download — the httpOnly auth cookie rides along, so no token feed is exposed.
def _ics_escape(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@router.get("/fields/{field_id}/tasks.ics")
async def field_tasks_ics(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        fname = await conn.fetchval("select name from public.fields where id=$1::uuid", field_id)
        rows = await conn.fetch(
            """select id, title, type, due_date, status, notes from public.tasks
               where field_id=$1::uuid and due_date is not null and status <> 'cancelled'
               order by due_date""", field_id)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agradex//Tasks//AZ", "CALSCALE:GREGORIAN"]
    for r in rows:
        due = r["due_date"]
        lines += [
            "BEGIN:VEVENT",
            f"UID:task-{r['id']}@agradex.com",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{due.strftime('%Y%m%d')}",
            f"DTEND;VALUE=DATE:{(due + timedelta(days=1)).strftime('%Y%m%d')}",
            f"SUMMARY:{_ics_escape(r['title'])}",
        ]
        desc_bits = [b for b in [r["type"], r["notes"]] if b]
        if desc_bits:
            lines.append(f"DESCRIPTION:{_ics_escape(' · '.join(desc_bits))}")
        lines += ["STATUS:" + ("COMPLETED" if r["status"] == "done" else "CONFIRMED"), "END:VEVENT"]
    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines) + "\r\n"
    safe = _ics_escape(str(fname or "sahe")).replace(" ", "_")[:40]
    return Response(
        content=body, media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="agradex-{safe}.ics"'})


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
                 (field_id, org_id, type, performed_on, inputs, cost, currency, phi_days, performed_by, notes)
               values ($1::uuid,$2::uuid,$3,$4::date,$5::jsonb,$6,$7,$8,$9::uuid,$10)
               returning id, created_at""",
            body.field_id, org_id, body.type, body.performed_on, json.dumps(body.inputs),
            body.cost, body.currency, body.phi_days, user_id, body.notes)
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat()}


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
