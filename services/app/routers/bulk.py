"""Bulk action across multiple selected fields — B14 (HYBRID_PLAN W7).

"Select 40 fields -> set this season's crop on all of them." Two rules make this safe:

1. ALL-OR-NOTHING ORG CHECK. Every posted field_id is resolved against the posted org BEFORE a
   single row is written. If one id belongs to another org (or does not exist / is soft-deleted)
   the whole request is rejected with 403 — a bulk write must never leak rows across tenants.
2. ONE TRANSACTION. db.connection() opens a transaction for the whole `async with` block, so a
   failure on field #4 rolls back fields #1-#3 too.

This module used to declare three routes. POST /api/bulk/tasks went with the ERP strip (81660df).
POST /api/bulk/operations went on 2026-08-04, with the "Əməliyyatlar" field section and
routers/mgmt.py: the owner's decision was that Operations should not exist at all, and a bulk
writer is still a writer, so the last write path to public.field_operations is closed. The TABLE is
untouched and NOT dropped — ai/context.py and routers/reports.py still read those rows as real
history; nothing can add to them any more.
"""
import uuid as _uuid_mod
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_role

router = APIRouter(prefix="/api", tags=["bulk"])

# A sane ceiling: the multi-select UI cannot realistically select more, and it bounds the loop.
MAX_FIELDS = 200


# ---------- input models (kept local on purpose — schemas.py is shared) ----------
class BulkCropIn(BaseModel):
    org_id: str
    field_ids: list[str]
    crop_type: str
    crop_cycle: Optional[str] = None


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
    a farmer doing it for 552. Everything hard about a bulk write (all-or-nothing org verification,
    a single transaction, MAX_FIELDS) is above; this is that pattern with one statement.

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
