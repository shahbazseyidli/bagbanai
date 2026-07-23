"""In-app messaging (HYBRID_PLAN §E, 0031): farmer↔provider and farmer↔farmer conversations, plus
contextual peer suggestions (E7 — other growers with the same crop / nearby region). User-scoped:
a caller may only read conversations they participate in. Distinct from routers/messaging.py, which
is the Telegram delivery channel."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import get_current_user_id
from ..schemas import ConversationOut, MessageIn, MessageOut, StartConversationIn

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _iso(v):
    return v.isoformat() if v is not None else None


@router.get("", response_model=list[ConversationOut])
async def list_conversations(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        rows = await conn.fetch(
            """select c.id, c.kind, c.last_text, c.last_at,
                      case when c.a_user_id=$1::uuid then c.b_user_id else c.a_user_id end as other_id
               from public.conversations c
               where c.a_user_id=$1::uuid or c.b_user_id=$1::uuid
               order by c.last_at desc nulls last, c.created_at desc limit 100""", user_id)
        out = []
        for r in rows:
            other = await conn.fetchrow(
                "select full_name, role from public.users where id=$1", r["other_id"])
            out.append(ConversationOut(
                id=str(r["id"]), other_user_id=str(r["other_id"]),
                other_name=other["full_name"] if other else None,
                other_role=other["role"] if other else None,
                kind=r["kind"], last_text=r["last_text"], last_at=_iso(r["last_at"])))
    return out


@router.post("/start")
async def start_conversation(body: StartConversationIn, user_id: str = Depends(get_current_user_id)):
    """Get-or-create a conversation with another user; optionally post a first message."""
    if body.other_user_id == user_id:
        raise HTTPException(status_code=400, detail="cannot_message_self")
    a, b = sorted([user_id, body.other_user_id])
    async with connection(user_id) as conn:
        exists = await conn.fetchval(
            "select 1 from public.users where id=$1::uuid", body.other_user_id)
        if not exists:
            raise HTTPException(status_code=404, detail="user_not_found")
        conv_id = await conn.fetchval(
            """insert into public.conversations (a_user_id, b_user_id, kind)
               values ($1::uuid, $2::uuid, $3)
               on conflict (a_user_id, b_user_id) do update set kind=public.conversations.kind
               returning id""", a, b, body.kind)
        if body.body:
            await conn.execute(
                "insert into public.messages (conversation_id, sender_id, body) values ($1::uuid,$2::uuid,$3)",
                conv_id, user_id, body.body)
            await conn.execute(
                "update public.conversations set last_text=$2, last_at=now() where id=$1::uuid",
                conv_id, body.body[:200])
    return {"id": str(conv_id)}


async def _assert_participant(conn, conv_id: str, user_id: str) -> None:
    ok = await conn.fetchval(
        "select 1 from public.conversations where id=$1::uuid and ($2::uuid in (a_user_id, b_user_id))",
        conv_id, user_id)
    if not ok:
        raise HTTPException(status_code=403, detail="forbidden")


@router.get("/{conv_id}/messages", response_model=list[MessageOut])
async def list_messages(conv_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await _assert_participant(conn, conv_id, user_id)
        rows = await conn.fetch(
            "select id, sender_id, body, created_at from public.messages "
            "where conversation_id=$1::uuid order by created_at asc limit 500", conv_id)
        await conn.execute(
            "update public.messages set read_at=now() where conversation_id=$1::uuid "
            "and sender_id<>$2::uuid and read_at is null", conv_id, user_id)
    return [MessageOut(id=str(r["id"]), sender_id=str(r["sender_id"]), body=r["body"],
                       created_at=_iso(r["created_at"]), mine=str(r["sender_id"]) == user_id)
            for r in rows]


@router.post("/{conv_id}/messages", response_model=MessageOut)
async def send_message(conv_id: str, body: MessageIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await _assert_participant(conn, conv_id, user_id)
        r = await conn.fetchrow(
            "insert into public.messages (conversation_id, sender_id, body) "
            "values ($1::uuid,$2::uuid,$3) returning id, sender_id, body, created_at",
            conv_id, user_id, body.body)
        await conn.execute(
            "update public.conversations set last_text=$2, last_at=now() where id=$1::uuid",
            conv_id, body.body[:200])
    return MessageOut(id=str(r["id"]), sender_id=str(r["sender_id"]), body=r["body"],
                      created_at=_iso(r["created_at"]), mine=True)


@router.get("/peers")
async def peer_suggestions(
    field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    """E7 — suggest other farmers growing the same crop or in the same region as this field, so the
    farmer can consult a peer. Best-effort: any query error returns an empty list (never blocks UI)."""
    try:
        async with connection(user_id) as conn:
            fm = await conn.fetchrow(
                """select fm.crop_type, coalesce(fm.region, '') as region
                   from public.fields f left join public.field_metadata fm on fm.field_id=f.id
                   where f.id=$1::uuid""", field_id)
            crop = fm["crop_type"] if fm else None
            region = fm["region"] if fm else None
            rows = await conn.fetch(
                """select distinct u.id, u.full_name, fm.crop_type, coalesce(fm.region, u.region) as region
                   from public.field_metadata fm
                   join public.fields f on f.id = fm.field_id
                   join public.farms fa on fa.id = f.farm_id
                   join public.organization_members om on om.org_id = fa.org_id
                   join public.users u on u.id = om.user_id
                   where u.id <> $1::uuid and u.role = 'farmer'
                     and (($2::text is not null and fm.crop_type = $2)
                          or ($3::text <> '' and fm.region = $3))
                   limit 6""", user_id, crop, region or "")
        return [{"user_id": str(r["id"]), "name": r["full_name"],
                 "crop": r["crop_type"], "region": r["region"]} for r in rows]
    except Exception:  # noqa: BLE001 — suggestions must never surface an error
        return []
