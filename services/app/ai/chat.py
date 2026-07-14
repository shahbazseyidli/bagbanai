"""Per-field Bağban AI chatbot. Context = the field's NASA data + latest advice +
prior conversation. Every turn is stored in public.ai_chat_messages so later turns
(and analyses) stay aware of the history."""
from __future__ import annotations

import json
from typing import Optional

from . import llm, usage as ai_usage
from .context import build_field_context

SYSTEM = (
    "Sən Bağban AI — Azərbaycan fermeri üçün sahə üzrə aqronom köməkçisən. Sənə həmin "
    "sahənin peyk indeksləri, məhsul məlumatı, görülmüş işlər və son AI məsləhəti kontekst "
    "kimi verilir. Suallara BU kontekstə əsaslanaraq, qısa və praktiki, Azərbaycan dilində "
    "cavab ver. Bilmədiyini uydurma; məlumat çatışmırsa bunu de. Fermerə birbaşa müraciət et."
)

HISTORY_LIMIT = 12


async def _load_history(conn, field_id: str) -> list[dict]:
    rows = await conn.fetch(
        """select role, content from public.ai_chat_messages
           where field_id=$1::uuid order by created_at desc limit $2""",
        field_id, HISTORY_LIMIT)
    # oldest first for the model
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


async def history(conn, field_id: str) -> list[dict]:
    rows = await conn.fetch(
        """select role, content, created_at from public.ai_chat_messages
           where field_id=$1::uuid order by created_at asc limit 200""", field_id)
    return [{"role": r["role"], "content": r["content"],
             "created_at": r["created_at"].isoformat()} for r in rows]


async def answer(conn, field_id: str, user_id: str, message: str) -> Optional[str]:
    if not llm.is_configured():
        return None

    field_row = await conn.fetchrow(
        "select org_id from public.fields where id=$1::uuid", field_id)
    if not field_row:
        return None
    org_id = str(field_row["org_id"])

    ctx = await build_field_context(conn, field_id)
    latest = await conn.fetchrow(
        "select summary, findings from public.advice where field_id=$1::uuid "
        "order by generated_at desc limit 1", field_id)
    ctx_block = {"field_context": ctx}
    if latest:
        f = latest["findings"] if isinstance(latest["findings"], dict) else json.loads(latest["findings"] or "{}")
        ctx_block["latest_advice"] = {"summary": latest["summary"], **f}

    system = SYSTEM + "\n\nKONTEKST (JSON):\n" + json.dumps(ctx_block, ensure_ascii=False)
    msgs = await _load_history(conn, field_id)
    msgs.append({"role": "user", "content": message})

    try:
        reply, usage = await llm.complete_text(system, msgs)
    except llm.LLMUnavailable:
        return None

    # Persist both turns (context_snapshot only on the user turn to keep rows lean).
    await conn.execute(
        """insert into public.ai_chat_messages (org_id, field_id, user_id, role, content, context_snapshot)
           values ($1::uuid,$2::uuid,$3::uuid,'user',$4,$5::jsonb)""",
        org_id, field_id, user_id, message, json.dumps(ctx_block))
    await conn.execute(
        """insert into public.ai_chat_messages (org_id, field_id, user_id, role, content)
           values ($1::uuid,$2::uuid,$3::uuid,'assistant',$4)""",
        org_id, field_id, user_id, reply)

    # Record token usage / cost for this chat turn (best-effort).
    try:
        await ai_usage.record_usage(
            conn, kind="chat", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            org_id=org_id, user_id=user_id, field_id=field_id)
    except Exception:
        pass

    return reply
