"""AI advice + per-field chatbot + notifications (§AI advice/chat)."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..ai import advice as advice_svc
from ..ai import chat as chat_svc
from ..ai import llm
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["ai"])


class ChatIn(BaseModel):
    message: str


@router.get("/fields/{field_id}/advice")
async def get_advice(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        row = await conn.fetchrow(
            """select summary, findings, disclaimer, model_name, generated_at
               from public.advice where field_id=$1::uuid
               order by generated_at desc limit 1""", field_id)
    if not row:
        return {"advice": None, "configured": llm.is_configured()}
    f = row["findings"] if isinstance(row["findings"], dict) else json.loads(row["findings"] or "{}")
    return {"advice": {"summary": row["summary"], **f, "disclaimer": row["disclaimer"],
                       "model": row["model_name"], "generated_at": row["generated_at"].isoformat()},
            "configured": llm.is_configured()}


@router.post("/fields/{field_id}/advice/generate")
async def generate_advice(field_id: str, user_id: str = Depends(get_current_user_id)):
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="ai_not_configured")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        result = await advice_svc.generate_and_store(conn, field_id)
    if result is None:
        raise HTTPException(status_code=503, detail="ai_unavailable")
    return result


@router.get("/fields/{field_id}/chat")
async def get_chat(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        msgs = await chat_svc.history(conn, field_id)
    return {"messages": msgs, "configured": llm.is_configured()}


@router.post("/fields/{field_id}/chat")
async def post_chat(field_id: str, body: ChatIn, user_id: str = Depends(get_current_user_id)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="empty_message")
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="ai_not_configured")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        reply = await chat_svc.answer(conn, field_id, user_id, body.message)
    if reply is None:
        raise HTTPException(status_code=503, detail="ai_unavailable")
    return {"reply": reply}


@router.get("/notifications")
async def list_notifications(user_id: str = Depends(get_current_user_id)):
    """Recent notifications across the user's organizations (in-app bell)."""
    async with connection(user_id) as conn:
        rows = await conn.fetch(
            """select n.id, n.field_id, n.type, n.severity, n.title, n.body,
                      n.created_at, n.read_at
               from public.notifications n
               join public.organization_members m
                 on m.org_id = n.org_id and m.user_id = $1::uuid
               order by n.created_at desc limit 30""", user_id)
    return {"notifications": [
        {"id": str(r["id"]), "field_id": str(r["field_id"]) if r["field_id"] else None,
         "type": r["type"], "severity": r["severity"], "title": r["title"], "body": r["body"],
         "created_at": r["created_at"].isoformat(), "read": r["read_at"] is not None}
        for r in rows]}


@router.post("/notifications/read")
async def mark_read(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await conn.execute(
            """update public.notifications n set read_at = now()
               from public.organization_members m
               where m.org_id = n.org_id and m.user_id = $1::uuid and n.read_at is null""",
            user_id)
    return {"ok": True}
