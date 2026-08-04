"""Record AI token usage + cost into public.ai_usage.

Each LLM call (advice, chat) records one row here so admin endpoints can report
per-user / per-org / per-model usage and suggest billing. Best-effort: callers
wrap record_usage so a ledger failure never breaks the user-facing feature."""
from __future__ import annotations

import logging
from typing import Optional

from . import pricing

log = logging.getLogger(__name__)


async def record_usage(conn, *, kind: str, provider: str, model: str,
                       input_tokens: int, output_tokens: int,
                       org_id: Optional[str] = None, user_id: Optional[str] = None,
                       field_id: Optional[str] = None,
                       source: Optional[str] = None,
                       web_searches: int = 0,
                       cache_read_tokens: int = 0) -> float:
    """Compute the cost, insert an ai_usage row, and return the cost in USD.

    `source` is 'auto' (the system started this — a pipeline or a cron, nobody waiting) or 'user'
    (a human action started it and is plausibly waiting). It decides which calls can move to the
    50%-off Batch API, and it cannot be recovered afterwards, so it is recorded at the call site or
    left NULL rather than guessed later. See migration 0056.

    `web_searches` is the number of server-side searches the call made. That is a $0.01-each TOOL
    fee, not a token cost, and leaving it out under-reported every research job by up to $0.04.

    `cache_read_tokens` is the part of the prompt the provider served from ITS cache, billed at a
    lower rate. Pass it straight from the llm.py usage dict (`usage.get("cache_read_tokens", 0)`).
    Before the DeepSeek migration this was always zero — Anthropic caching is opt-in and we never
    opted in — but DeepSeek caches server-side without being asked and reports the hit separately
    from the miss. llm.py therefore hands us the MISS as input_tokens, which means a caller that
    forgets this argument under-reports the cached part rather than double-billing it. That is the
    safe direction to be wrong in, and it is still wrong: the two columns stored below are the raw
    counts, so a row written without it says the prompt was smaller than it was.

    ⚠️ public.ai_usage has no cache column, so the count is folded into cost_usd only. Adding one is
    a migration nobody has needed yet; if the ledger ever has to explain a bill line by line, that
    is the first thing missing."""
    # A model id the price table does not know falls through to DEFAULT, which is the Opus rate —
    # roughly 35x a deepseek-v4-flash row. That silence is what makes a renamed model look cheap
    # for a month. Complain once, in the log, and still record the row: a wrong cost is bad, a
    # missing usage row is worse.
    if not pricing.is_priced(model):
        log.warning("ai_usage: %s is not in the price table — billed at the DEFAULT rate", model)
    cost = pricing.cost_usd(model, input_tokens, output_tokens,
                            cache_read_tokens=cache_read_tokens, web_searches=web_searches)
    await conn.execute(
        """insert into public.ai_usage
             (org_id, user_id, field_id, kind, provider, model,
              input_tokens, output_tokens, cost_usd, source)
           values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10)""",
        org_id, user_id, field_id, kind, provider, model,
        input_tokens, output_tokens, cost, source)
    return cost
