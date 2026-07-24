"""Equipment register + service reminders (HYBRID_PLAN W7, B13 — migration 0038).

`public.equipment` is the org's machine register; `public.equipment_service` is a *rolling*
schedule row per machine + service type (not an append-only log): marking a service done moves
`last_done_on`/`last_done_hours` forward and re-computes `next_due_on` from `interval_days`.

Reminders surface three ways:
  1. GET /orgs/{org_id}/equipment/due   — read model for the UI (overdue first).
  2. POST .../materialize-tasks         — turns due services into real public.tasks rows.
     Idempotency is carried by equipment_service.task_id (an FK), NOT by a magic string in
     tasks.notes, so re-running never duplicates and a task deleted upstream re-materializes.
  3. An in-app notification per *overdue* service, deduped through public.org_alert_state
     (key 'service_due:<service_id>', 24h cooldown) — alert_state (0016) needs a field_id, and
     equipment has no field, hence the org-scoped dedup table.

Gating is server-side (require_member read / require_role ROLES_WRITE write); RLS is only
defense-in-depth. Status is validated in Python against a fixed set — never trusted into the
column — so a bad value is a clean 400 rather than a 500.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..db import connection
from ..deps import (ROLES_WRITE, get_current_user_id, require_member,
                    require_role)

router = APIRouter(prefix="/api", tags=["equipment"])

# equipment.status domain (db/migrations/0038_ledger_ops.sql). Plain text column — validated here.
_STATUSES = {"active", "service", "retired"}
# NB: public.tasks.status domain (0005) is todo|in_progress|done|cancelled, DEFAULT 'todo'.
# 'open' does NOT exist — a materialized reminder is created as 'todo' and is "live" while it is
# todo or in_progress.

ALERT_COOLDOWN_HOURS = 24
DEFAULT_DUE_DAYS = 30


# ---------- payloads (kept local on purpose — see file-ownership note in HYBRID_PLAN) ----------
class EquipmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: Optional[str] = None            # tractor | sprayer | harvester | pump | other
    make_model: Optional[str] = None
    serial_no: Optional[str] = None
    purchase_date: Optional[date] = None
    hours: Optional[float] = None
    status: str = "active"
    notes: Optional[str] = None


class ServiceIn(BaseModel):
    service_type: str = Field(min_length=1, max_length=120)   # oil | filter | tyres | inspection | other
    interval_days: Optional[int] = None
    interval_hours: Optional[float] = None
    last_done_on: Optional[date] = None
    last_done_hours: Optional[float] = None
    next_due_on: Optional[date] = None
    cost: Optional[float] = None
    notes: Optional[str] = None


class ServiceDoneIn(BaseModel):
    done_on: Optional[date] = None
    hours: Optional[float] = None          # machine hours at service time (also updates equipment.hours)
    cost: Optional[float] = None
    notes: Optional[str] = None


# ---------- helpers ----------
def _num(v) -> Optional[float]:
    return float(v) if v is not None else None


def _iso(v) -> Optional[str]:
    return v.isoformat() if v else None


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


def _check_status(status: str) -> str:
    s = (status or "").strip().lower()
    if s not in _STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")
    return s


async def _org_of_equipment(conn, equipment_id: str) -> str:
    org_id = await conn.fetchval(
        "select org_id from public.equipment where id=$1::uuid", equipment_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="equipment_not_found")
    return str(org_id)


async def _service_row(conn, service_id: str):
    row = await conn.fetchrow(
        """select s.*, e.name as equipment_name, e.hours as equipment_hours
           from public.equipment_service s
           join public.equipment e on e.id = s.equipment_id
           where s.id=$1::uuid""", service_id)
    if not row:
        raise HTTPException(status_code=404, detail="service_not_found")
    return row


def _equipment_out(r) -> dict:
    return {
        "id": str(r["id"]),
        "org_id": str(r["org_id"]),
        "name": r["name"],
        "kind": r["kind"],
        "make_model": r["make_model"],
        "serial_no": r["serial_no"],
        "purchase_date": _iso(r["purchase_date"]),
        "hours": _num(r["hours"]),
        "status": r["status"],
        "notes": r["notes"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


def _service_out(r, today: Optional[date] = None) -> dict:
    today = today or date.today()
    due = r["next_due_on"]
    days_left = (due - today).days if due else None
    return {
        "id": str(r["id"]),
        "equipment_id": str(r["equipment_id"]),
        "service_type": r["service_type"],
        "interval_days": r["interval_days"],
        "interval_hours": _num(r["interval_hours"]),
        "last_done_on": _iso(r["last_done_on"]),
        "last_done_hours": _num(r["last_done_hours"]),
        "next_due_on": _iso(due),
        "days_left": days_left,
        "overdue": bool(due is not None and days_left is not None and days_left < 0),
        "task_id": str(r["task_id"]) if r["task_id"] else None,
        "cost": _num(r["cost"]),
        "notes": r["notes"],
    }


def _next_due(last_done: Optional[date], interval_days: Optional[int]) -> Optional[date]:
    """Schedule roll-forward: last done + interval. None when either half is missing."""
    if last_done and interval_days and interval_days > 0:
        return last_done + timedelta(days=int(interval_days))
    return None


_DUE_SELECT = """select s.id, s.equipment_id, s.service_type, s.interval_days, s.interval_hours,
                        s.last_done_on, s.last_done_hours, s.next_due_on, s.task_id, s.cost, s.notes,
                        e.name as equipment_name, e.kind as equipment_kind, e.status as equipment_status
                 from public.equipment_service s
                 join public.equipment e on e.id = s.equipment_id
                 where s.org_id=$1::uuid and s.next_due_on is not null
                   and e.status <> 'retired'
                   and s.next_due_on <= (current_date + $2::int)"""


async def _fire_overdue_alerts(conn, org_id: str, rows) -> int:
    """One in-app notification per OVERDUE service, at most once per 24h (org_alert_state)."""
    now = datetime.now(timezone.utc)
    today = date.today()
    fired = 0
    for r in rows:
        due = r["next_due_on"]
        if not due or due >= today:
            continue
        key = f"service_due:{r['id']}"
        last = await conn.fetchval(
            "select last_fired_at from public.org_alert_state where org_id=$1::uuid and alert_key=$2",
            org_id, key)
        if last and now - last < timedelta(hours=ALERT_COOLDOWN_HOURS):
            continue
        overdue_days = (today - due).days
        title = f"🔧 Texnika servisi gecikib: {r['equipment_name']}"
        body = (f"“{r['service_type']}” servisinin vaxtı {due.isoformat()} idi — "
                f"{overdue_days} gün gecikib. Texnikanı işlətməzdən əvvəl yoxlayın.")
        await conn.execute(
            """insert into public.notifications
                 (org_id, source, type, severity, title, body, delivered_channels)
               values ($1::uuid,'equipment','service_due','warning',$2,$3,array['inapp'])""",
            org_id, title, body)
        await conn.execute(
            """insert into public.org_alert_state (org_id, alert_key, last_fired_at)
               values ($1::uuid,$2,now())
               on conflict (org_id, alert_key) do update set last_fired_at = now()""",
            org_id, key)
        fired += 1
    return fired


# ---------- equipment CRUD ----------
@router.get("/orgs/{org_id}/equipment")
async def list_equipment(org_id: str, status: Optional[str] = Query(default=None),
                         user_id: str = Depends(get_current_user_id)):
    """Org register with each machine's service schedule nested (one round-trip for the UI)."""
    if status is not None and status not in _STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        sql = ("select id, org_id, name, kind, make_model, serial_no, purchase_date, hours, "
               "status, notes, created_at from public.equipment where org_id=$1::uuid")
        args: list = [org_id]
        if status:
            args.append(status)
            sql += f" and status = ${len(args)}"
        sql += " order by name"
        eq_rows = await conn.fetch(sql, *args)
        svc_rows = await conn.fetch(
            """select s.id, s.equipment_id, s.service_type, s.interval_days, s.interval_hours,
                      s.last_done_on, s.last_done_hours, s.next_due_on, s.task_id, s.cost, s.notes
               from public.equipment_service s
               join public.equipment e on e.id = s.equipment_id
               where e.org_id=$1::uuid
               order by s.next_due_on nulls last, s.service_type""", org_id)
    today = date.today()
    by_eq: dict[str, list[dict]] = {}
    for s in svc_rows:
        by_eq.setdefault(str(s["equipment_id"]), []).append(_service_out(s, today))
    out = []
    for e in eq_rows:
        item = _equipment_out(e)
        services = by_eq.get(item["id"], [])
        item["services"] = services
        dues = [s["next_due_on"] for s in services if s["next_due_on"]]
        item["next_due_on"] = min(dues) if dues else None
        item["overdue_count"] = sum(1 for s in services if s["overdue"])
        out.append(item)
    return out


@router.post("/orgs/{org_id}/equipment")
async def create_equipment(org_id: str, body: EquipmentIn,
                           user_id: str = Depends(get_current_user_id)):
    status = _check_status(body.status)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name_required")
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """insert into public.equipment
                 (org_id, name, kind, make_model, serial_no, purchase_date, hours, status, notes, created_by)
               values ($1::uuid,$2,$3,$4,$5,$6::date,$7,$8,$9,$10::uuid)
               returning id, org_id, name, kind, make_model, serial_no, purchase_date, hours,
                         status, notes, created_at""",
            org_id, name, _clean(body.kind), _clean(body.make_model), _clean(body.serial_no),
            body.purchase_date, body.hours, status, _clean(body.notes), user_id)
    item = _equipment_out(row)
    item["services"] = []
    item["next_due_on"] = None
    item["overdue_count"] = 0
    return item


@router.put("/equipment/{equipment_id}")
async def update_equipment(equipment_id: str, body: EquipmentIn,
                           user_id: str = Depends(get_current_user_id)):
    status = _check_status(body.status)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name_required")
    async with connection(user_id) as conn:
        org_id = await _org_of_equipment(conn, equipment_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """update public.equipment set
                 name=$2, kind=$3, make_model=$4, serial_no=$5, purchase_date=$6::date,
                 hours=$7, status=$8, notes=$9, updated_at=now()
               where id=$1::uuid
               returning id, org_id, name, kind, make_model, serial_no, purchase_date, hours,
                         status, notes, created_at""",
            equipment_id, name, _clean(body.kind), _clean(body.make_model), _clean(body.serial_no),
            body.purchase_date, body.hours, status, _clean(body.notes))
    return _equipment_out(row)


@router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_equipment(conn, equipment_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        # equipment_service rows cascade (FK on delete cascade, 0038).
        await conn.execute("delete from public.equipment where id=$1::uuid", equipment_id)
    return {"ok": True}


# ---------- service schedule ----------
@router.get("/equipment/{equipment_id}/service")
async def list_service(equipment_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_equipment(conn, equipment_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, equipment_id, service_type, interval_days, interval_hours,
                      last_done_on, last_done_hours, next_due_on, task_id, cost, notes
               from public.equipment_service where equipment_id=$1::uuid
               order by next_due_on nulls last, service_type""", equipment_id)
    today = date.today()
    return [_service_out(r, today) for r in rows]


@router.post("/equipment/{equipment_id}/service")
async def create_service(equipment_id: str, body: ServiceIn,
                         user_id: str = Depends(get_current_user_id)):
    """Add a schedule row. next_due_on is derived from last_done_on + interval_days when the
    caller does not supply it (and from today when nothing was ever done)."""
    service_type = (body.service_type or "").strip()
    if not service_type:
        raise HTTPException(status_code=400, detail="service_type_required")
    if body.interval_days is not None and body.interval_days <= 0:
        raise HTTPException(status_code=400, detail="invalid_interval_days")
    next_due = body.next_due_on or _next_due(body.last_done_on or date.today(), body.interval_days)
    async with connection(user_id) as conn:
        org_id = await _org_of_equipment(conn, equipment_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """insert into public.equipment_service
                 (org_id, equipment_id, service_type, interval_days, interval_hours,
                  last_done_on, last_done_hours, next_due_on, cost, notes, created_by)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6::date,$7,$8::date,$9,$10,$11::uuid)
               returning id, equipment_id, service_type, interval_days, interval_hours,
                         last_done_on, last_done_hours, next_due_on, task_id, cost, notes""",
            org_id, equipment_id, service_type, body.interval_days, body.interval_hours,
            body.last_done_on, body.last_done_hours, next_due, body.cost,
            _clean(body.notes), user_id)
    return _service_out(row)


@router.post("/service/{service_id}/done")
async def mark_service_done(service_id: str, body: ServiceDoneIn,
                            user_id: str = Depends(get_current_user_id)):
    """Mark a scheduled service as performed: stamp last_done_*, roll next_due_on forward by
    interval_days, record the cost, close the materialized reminder task."""
    async with connection(user_id) as conn:
        row = await _service_row(conn, service_id)
        org_id = str(row["org_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        done_on = body.done_on or date.today()
        hours = body.hours if body.hours is not None else _num(row["equipment_hours"])
        cost = body.cost if body.cost is not None else _num(row["cost"])
        next_due = _next_due(done_on, row["interval_days"])
        updated = await conn.fetchrow(
            """update public.equipment_service set
                 last_done_on=$2::date, last_done_hours=$3, next_due_on=$4::date,
                 cost=$5, notes=coalesce($6, notes)
               where id=$1::uuid
               returning id, equipment_id, service_type, interval_days, interval_hours,
                         last_done_on, last_done_hours, next_due_on, task_id, cost, notes""",
            service_id, done_on, hours, next_due, cost, _clean(body.notes))
        # Keep the machine's hour meter in sync when the caller reported hours.
        if body.hours is not None:
            await conn.execute(
                "update public.equipment set hours=$2, updated_at=now() where id=$1::uuid",
                str(row["equipment_id"]), body.hours)
        # Close the materialized reminder (if it is still live) — the task_id link stays, so
        # materialize-tasks can mint a fresh reminder for the NEXT due date.
        if row["task_id"]:
            await conn.execute(
                "update public.tasks set status='done' where id=$1::uuid and status in ('todo','in_progress')",
                str(row["task_id"]))
        # A completed service clears its overdue alert cooldown.
        await conn.execute(
            "delete from public.org_alert_state where org_id=$1::uuid and alert_key=$2",
            org_id, f"service_due:{service_id}")
    return _service_out(updated)


# ---------- due list / reminders ----------
@router.get("/orgs/{org_id}/equipment/due")
async def due_services(org_id: str, days: int = Query(default=DEFAULT_DUE_DAYS, ge=0, le=365),
                       user_id: str = Depends(get_current_user_id)):
    """Services due within `days` (overdue included, listed first). Overdue rows also raise a
    deduped in-app notification — this endpoint is the only reliable reminder hook today."""
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(_DUE_SELECT + " order by s.next_due_on", org_id, days)
        notified = await _fire_overdue_alerts(conn, org_id, rows)
    today = date.today()
    items = []
    for r in rows:
        d = _service_out(r, today)
        d["equipment_name"] = r["equipment_name"]
        d["equipment_kind"] = r["equipment_kind"]
        d["equipment_status"] = r["equipment_status"]
        items.append(d)
    return {"days": days, "items": items,
            "overdue": sum(1 for i in items if i["overdue"]), "notified": notified}


@router.post("/orgs/{org_id}/equipment/materialize-tasks")
async def materialize_tasks(org_id: str, days: int = Query(default=DEFAULT_DUE_DAYS, ge=0, le=365),
                            user_id: str = Depends(get_current_user_id)):
    """Create a public.tasks row for every service due within `days` that has no LIVE task.

    Idempotent through equipment_service.task_id: a service whose linked task is still
    todo/in_progress is skipped; one whose task was completed, cancelled or deleted gets a new
    reminder. Tasks are org-scoped with field_id NULL (allowed by 0005) and status 'todo'."""
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        rows = await conn.fetch(
            _DUE_SELECT + """ and (s.task_id is null or not exists (
                                select 1 from public.tasks t
                                where t.id = s.task_id and t.status in ('todo','in_progress')))
                              order by s.next_due_on""",
            org_id, days)
        created = 0
        for r in rows:
            title = f"Texnika servisi: {r['equipment_name']} — {r['service_type']}"
            note = "Texnika servis xatırlatması (avtomatik yaradılıb)."
            task_id = await conn.fetchval(
                """insert into public.tasks
                     (org_id, farm_id, field_id, title, type, due_date, priority, created_by, notes, status)
                   values ($1::uuid, null, null, $2, 'other', $3::date, 'medium', $4::uuid, $5, 'todo')
                   returning id""",
                org_id, title, r["next_due_on"], user_id, note)
            await conn.execute(
                "update public.equipment_service set task_id=$2::uuid where id=$1::uuid",
                str(r["id"]), str(task_id))
            created += 1
        notified = await _fire_overdue_alerts(conn, org_id, rows)
    return {"ok": True, "created": created, "notified": notified, "days": days}
