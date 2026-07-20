"""Knowledge Passport + clarifications API (knowledge layer M3/M4/M7).

FREE for members (not paid-gated per D7). Reads the passport blocks the research worker
fills, exposes open clarifications, records structured answers, and lets a member queue a
manual refresh (debounced through research_jobs)."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..ai import jobs, knowledge as kb
from ..db import connection
from ..deps import ROLES_WORKER, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api/fields", tags=["knowledge"])


@router.get("/{field_id}/knowledge")
async def get_knowledge(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Merged Knowledge Passport (zone + field blocks) for the field."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        meta = await conn.fetchrow(
            "select crop_type, region from public.field_metadata where field_id=$1::uuid", field_id)
        crop_type = meta["crop_type"] if meta else None
        ctx = await conn.fetchval(
            """select content from public.field_knowledge
               where field_id=$1::uuid and block_type='field_context'""", field_id)
        zone_id = None
        if ctx:
            c = json.loads(ctx) if isinstance(ctx, str) else ctx
            zone_id = c.get("zone_id")
        passport = await kb.load_passport(conn, field_id, crop_type, zone_id)
    return {"crop_type": crop_type, "zone_id": zone_id, **passport}


@router.get("/{field_id}/clarifications")
async def list_clarifications(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Open clarifications for the field (drives the İcmal-tab block + counter)."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, severity, topic, question_text, evidence, options, created_at
               from public.clarifications
               where field_id=$1::uuid and status='open'
               order by (severity='critical') desc, created_at""", field_id)
    out = []
    for r in rows:
        out.append({
            "id": str(r["id"]), "severity": r["severity"], "topic": r["topic"],
            "question_text": r["question_text"],
            "evidence": json.loads(r["evidence"]) if isinstance(r["evidence"], str) else r["evidence"],
            "options": json.loads(r["options"]) if isinstance(r["options"], str) else r["options"],
            "created_at": r["created_at"].isoformat(),
        })
    return {"clarifications": out, "count": len(out)}


class ClarifyAnswer(BaseModel):
    value: str            # the chosen option value
    label: str | None = None


@router.post("/{field_id}/clarifications/{clar_id}/answer")
async def answer_clarification(field_id: str, clar_id: str, body: ClarifyAnswer,
                               user_id: str = Depends(get_current_user_id)):
    """Record a structured answer, resolve the clarification, and fold the fact into the
    field's resolved_clarifications block so it is never asked again (spec §10.4)."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        row = await conn.fetchrow(
            """select topic, status from public.clarifications
               where id=$1::uuid and field_id=$2::uuid""", clar_id, field_id)
        if not row:
            raise HTTPException(status_code=404, detail="clarification_not_found")
        answer = {"value": body.value, "label": body.label}
        await conn.execute(
            """update public.clarifications
               set status='resolved', answer=$2::jsonb, answered_at=now()
               where id=$1::uuid""", clar_id, json.dumps(answer, ensure_ascii=False))
        # Append to the resolved_clarifications field block (fact memory).
        prev = await conn.fetchval(
            """select content from public.field_knowledge
               where field_id=$1::uuid and block_type='resolved_clarifications'""", field_id)
        items = []
        if prev:
            p = json.loads(prev) if isinstance(prev, str) else prev
            items = p.get("items", []) if isinstance(p, dict) else []
        items.append({"topic": row["topic"], "answer": answer})
        await kb.upsert_field_block(
            conn, field_id, org_id, "resolved_clarifications", {"items": items}, [],
            kb.input_hash({"n": len(items)}))
    return {"ok": True}


@router.post("/{field_id}/research")
async def trigger_research(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Queue a manual full-refresh research job (debounced). Returns the job id."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        jid = await jobs.enqueue(conn, field_id=field_id, org_id=org_id,
                                 trigger_type="manual", blocks=["ALL"])
    return {"ok": True, "job_id": jid}
