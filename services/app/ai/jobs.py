"""research_jobs queue: debounced enqueue + claim + complete (knowledge layer M4).

Debounce (spec §7.1): a farmer editing 6 fields in one session must produce ~1 job, not 6.
An existing queued job for the same field absorbs new blocks (union) and its scheduled_for
is pushed out, so bursts collapse. The worker (deploy/process-research.sh → internal endpoint)
claims due jobs and runs research.research_field."""
from __future__ import annotations

import json
from typing import Optional

DEBOUNCE_MIN = 3  # spec §7.1 — configurable debounce window


async def enqueue(conn, *, field_id: Optional[str], org_id: Optional[str], trigger_type: str,
                  blocks: list[str], changed_fields: Optional[list] = None,
                  debounce_min: int = DEBOUNCE_MIN) -> str:
    """Enqueue (or merge into an existing queued job for the field) and return the job id.
    `blocks` is the invalidation-map output; ['ALL'] means a full crop reset."""
    if field_id:
        existing = await conn.fetchrow(
            """select id, blocks_to_refresh from public.research_jobs
               where field_id=$1::uuid and status='queued'
               order by created_at limit 1 for update""", field_id)
        if existing:
            prev = existing["blocks_to_refresh"]
            prev = json.loads(prev) if isinstance(prev, str) else (prev or [])
            merged = ["ALL"] if ("ALL" in prev or "ALL" in blocks) else sorted(set(prev) | set(blocks))
            await conn.execute(
                """update public.research_jobs
                   set blocks_to_refresh=$2::jsonb,
                       scheduled_for=now() + ($3::int || ' minutes')::interval
                   where id=$1""", existing["id"], json.dumps(merged), debounce_min)
            return str(existing["id"])
    jid = await conn.fetchval(
        """insert into public.research_jobs
             (field_id, org_id, trigger_type, changed_fields, blocks_to_refresh,
              status, scheduled_for)
           values ($1::uuid,$2::uuid,$3,$4::jsonb,$5::jsonb,'queued',
                   now() + ($6::int || ' minutes')::interval)
           returning id""",
        field_id, org_id, trigger_type,
        json.dumps(changed_fields) if changed_fields is not None else None,
        json.dumps(blocks), debounce_min)
    return str(jid)


async def claim_due(conn, limit: int = 1) -> list[dict]:
    """Atomically claim up to `limit` due queued jobs (status → running). SKIP LOCKED so
    concurrent workers don't collide."""
    rows = await conn.fetch(
        """update public.research_jobs j set status='running'
           where j.id in (
             select id from public.research_jobs
             where status='queued' and scheduled_for <= now()
             order by scheduled_for
             limit $1 for update skip locked)
           returning j.id, j.field_id, j.org_id, j.trigger_type, j.blocks_to_refresh""", limit)
    out = []
    for r in rows:
        b = r["blocks_to_refresh"]
        out.append({"id": str(r["id"]),
                    "field_id": str(r["field_id"]) if r["field_id"] else None,
                    "org_id": str(r["org_id"]) if r["org_id"] else None,
                    "trigger_type": r["trigger_type"],
                    "blocks": json.loads(b) if isinstance(b, str) else (b or [])})
    return out


async def complete(conn, job_id: str, ok: bool, *, error: Optional[str] = None,
                   cost: Optional[float] = None) -> None:
    await conn.execute(
        """update public.research_jobs
           set status=$2, error=$3, cost_estimate=$4, completed_at=now()
           where id=$1::uuid""", job_id, "done" if ok else "failed", error, cost)
