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
                       field_id: Optional[str] = None) -> float:
    """Compute the cost, insert an ai_usage row, and return the cost in USD."""
    cost = pricing.cost_usd(model, input_tokens, output_tokens)
    await conn.execute(
        """insert into public.ai_usage
             (org_id, user_id, field_id, kind, provider, model,
              input_tokens, output_tokens, cost_usd)
           values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9)""",
        org_id, user_id, field_id, kind, provider, model,
        input_tokens, output_tokens, cost)
    return cost
