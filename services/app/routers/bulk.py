"""Bulk actions across multiple selected fields — B14 (HYBRID_PLAN W7).

"Select 5 fields -> add the same task / log the same operation to all of them." Two rules make
this safe:

1. ALL-OR-NOTHING ORG CHECK. Every posted field_id is resolved against the posted org BEFORE a
   single row is written. If one id belongs to another org (or does not exist / is soft-deleted)
   the whole request is rejected with 403 — a bulk write must never leak rows across tenants.
2. ONE TRANSACTION. db.connection() opens a transaction for the whole `async with` block, so a
   failure on field #4 rolls back fields #1-#3 too.

No new tables: rows land in public.field_operations exactly like the single-field
endpoints in mgmt.py."""
import json
import uuid as _uuid_mod
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_role

router = APIRouter(prefix="/api", tags=["bulk"])

# tasks.priority is free text in the DB (0005) but the UI only ever offers these three.
PRIORITIES = {"low", "medium", "high"}
# field_operations.currency is free text too; keep it to what the UI can render.
CURRENCIES = {"AZN", "USD", "EUR", "TRY", "RUB"}
# tasks.type / field_operations.type are deliberately free text (the UI posts Azerbaijani labels
# such as "Suvarma"), so they are only length-capped, never matched against an enum.
_MAX_TYPE = 80
_MAX_TITLE = 200
_MAX_NOTES = 4000
# A sane ceiling: the multi-select UI cannot realistically select more, and it bounds the loop.
MAX_FIELDS = 200


# ---------- input models (kept local on purpose — schemas.py is shared) ----------
class BulkTaskIn(BaseModel):
    org_id: str
    field_ids: list[str]
    title: str
    type: Optional[str] = None
    due_date: Optional[str] = None      # YYYY-MM-DD
    priority: Optional[str] = None      # low | medium | high
    notes: Optional[str] = None


class BulkCropIn(BaseModel):
    org_id: str
    field_ids: list[str]
    crop_type: str
    crop_cycle: Optional[str] = None


class BulkOperationIn(BaseModel):
    org_id: str
    field_ids: list[str]
    type: str
    performed_on: str                   # YYYY-MM-DD
    cost: Optional[float] = None
    currency: str = "AZN"
    notes: Optional[str] = None


# ---------- helpers ----------
def _as_uuid(value: str, detail: str) -> str:
    """Reject malformed ids in Python: `$1::uuid` on junk raises Postgres 22P02 -> HTTP 500."""
    try:
        return str(_uuid_mod.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail=detail)


def _field_ids(raw: list[str]) -> list[str]:
    """Validate + de-duplicate the selection, preserving order."""
    if not raw:
        raise HTTPException(status_code=400, detail="no_fields_selected")
    if len(raw) > MAX_FIELDS:
        raise HTTPException(status_code=400, detail="too_many_fields")
    out: list[str] = []
    seen: set[str] = set()
    for v in raw:
        fid = _as_uuid(v, "invalid_field_id")
        if fid not in seen:
            seen.add(fid)
            out.append(fid)
    return out


def _text(value: Optional[str], limit: int) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s[:limit] if s else None


def _parse_date(value: Optional[str], required: bool, detail: str) -> Optional[date]:
    if value is None or str(value).strip() == "":
        if required:
            raise HTTPException(status_code=400, detail=detail)
        return None
    try:
        return datetime.fromisoformat(str(value)[:10]).date()
    except ValueError:
        raise HTTPException(status_code=400, detail=detail)


def _priority(value: Optional[str]) -> Optional[str]:
    if value is None or str(value).strip() == "":
        return None
    p = str(value).strip().lower()
    if p not in PRIORITIES:
        raise HTTPException(status_code=400, detail="invalid_priority")
    return p


def _currency(value: Optional[str]) -> str:
    c = (str(value or "AZN")).strip().upper()
    if c not in CURRENCIES:
        raise HTTPException(status_code=400, detail="invalid_currency")
    return c


def _cost(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        c = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="invalid_cost")
    if c < 0:
        raise HTTPException(status_code=400, detail="invalid_cost")
    return c


async def _verify_fields(conn, org_id: str, field_ids: list[str]) -> dict[str, Optional[str]]:
    """Map field_id -> farm_id, but ONLY for fields that live in this org. Any id that does not
    resolve (other org, deleted, unknown) fails the whole request — never a partial apply."""
    # text[]::uuid[] (not a bare uuid[]) so asyncpg encodes plain strings; every element was
    # already validated as a UUID above, so the cast cannot fail.
    rows = await conn.fetch(
        """select f.id, f.farm_id from public.fields f
           join public.farms fa on fa.id = f.farm_id
           where f.id = any($1::text[]::uuid[]) and f.org_id = $2::uuid and fa.org_id = $2::uuid
             and f.deleted_at is null""", field_ids, org_id)
    found = {str(r["id"]): (str(r["farm_id"]) if r["farm_id"] else None) for r in rows}
    if len(found) != len(field_ids):
        raise HTTPException(status_code=403, detail="field_not_in_org")
    return found


# ---------- endpoints ----------
@router.post("/bulk/crop")
async def bulk_crop(body: BulkCropIn, user_id: str = Depends(get_current_user_id)):
    """Set the crop on many fields at once.

    Setting this year's crop on forty fields meant forty page visits — the research corpus records
    a farmer doing it for 552. Everything hard about a bulk write already existed for
    /bulk/operations: all-or-nothing org verification, a single transaction, MAX_FIELDS. This is
    that pattern with a different statement.

    ONLY crop_type and crop_cycle are touched. The upsert names those two columns and leaves the
    rest of field_metadata alone, because a farmer selecting forty fields to set a crop is not
    asking to erase forty soil analyses — and the single-field PUT, which sends the WHOLE record,
    would do exactly that if it were reused here.
    """
    org_id = _as_uuid(body.org_id, "invalid_org_id")
    field_ids = _field_ids(body.field_ids)
    crop = _text(body.crop_type, 80)
    if not crop:
        raise HTTPException(status_code=400, detail="crop_required")
    cycle = _text(body.crop_cycle, 40) or None

    async with connection(user_id) as conn:                       # single transaction
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await _verify_fields(conn, org_id, field_ids)
        for fid in field_ids:
            await conn.execute(
                """insert into public.field_metadata (field_id, crop_type, crop_cycle)
                   values ($1::uuid, $2, $3)
                   on conflict (field_id) do update set
                     crop_type = excluded.crop_type,
                     -- coalesce: an explicit cycle wins, but sending none must not WIPE a cycle the
                     -- farmer already set on one of the selected fields.
                     crop_cycle = coalesce(excluded.crop_cycle, public.field_metadata.crop_cycle),
                     updated_at = now()""",
                fid, crop, cycle)
    return {"ok": True, "updated": len(field_ids)}



@router.post("/bulk/operations")
async def bulk_operations(body: BulkOperationIn, user_id: str = Depends(get_current_user_id)):
    """One public.field_operations row per selected field."""
    org_id = _as_uuid(body.org_id, "invalid_org_id")
    field_ids = _field_ids(body.field_ids)
    otype = _text(body.type, _MAX_TYPE)
    if not otype:
        raise HTTPException(status_code=400, detail="type_required")
    performed_on = _parse_date(body.performed_on, True, "invalid_performed_on")
    notes = _text(body.notes, _MAX_NOTES)
    currency = _currency(body.currency)
    cost = _cost(body.cost)
    empty_inputs = json.dumps([])

    created_ids: list[str] = []
    async with connection(user_id) as conn:                       # single transaction
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await _verify_fields(conn, org_id, field_ids)
        for fid in field_ids:
            row = await conn.fetchrow(
                """insert into public.field_operations
                     (field_id, org_id, type, performed_on, inputs, cost, currency,
                      performed_by, notes)
                   values ($1::uuid,$2::uuid,$3,$4::date,$5::jsonb,$6,$7,$8::uuid,$9)
                   returning id""",
                fid, org_id, otype, performed_on, empty_inputs, cost, currency, user_id, notes)
            created_ids.append(str(row["id"]))
    return {"ok": True, "created": len(created_ids), "ids": created_ids}
