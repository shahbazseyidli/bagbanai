"""Record AI token usage + cost into public.ai_usage.

Each LLM call (advice, chat) records one row here so admin endpoints can report
per-user / per-org / per-model usage and suggest billing. Best-effort: callers
wrap record_usage so a ledger failure never breaks the user-facing feature."""
from __future__ import annotations

from typing import Optional

from . import pricing


async def record_usage(conn, *, kind: str, provider: str, model: str,
                       input_tokens: int, output_tokens: int,
                       org_id: Optional[str] = None, user_id: Optional[str] = None,
                       field_id: Optional[str] = None,
                       source: Optional[str] = None,
                       web_searches: int = 0) -> float:
    """Compute the cost, insert an ai_usage row, and return the cost in USD.

    `source` is 'auto' (the system started this — a pipeline or a cron, nobody waiting) or 'user'
    (a human action started it and is plausibly waiting). It decides which calls can move to the
    50%-off Batch API, and it cannot be recovered afterwards, so it is recorded at the call site or
    left NULL rather than guessed later. See migration 0056.

    `web_searches` is the number of server-side searches the call made. That is a $0.01-each TOOL
    fee, not a token cost, and leaving it out under-reported every research job by up to $0.04."""
    cost = pricing.cost_usd(model, input_tokens, output_tokens, web_searches=web_searches)
    await conn.execute(
        """insert into public.ai_usage
             (org_id, user_id, field_id, kind, provider, model,
              input_tokens, output_tokens, cost_usd, source)
           values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10)""",
        org_id, user_id, field_id, kind, provider, model,
        input_tokens, output_tokens, cost, source)
    return cost
