"""LLM token pricing, as DATED rates rather than constants.

Why dated: a published price is a fact with a start date, not a property of a model. Claude Sonnet 5
is $2/$10 as an introductory rate that ENDS 2026-08-31 and becomes $3/$15 on 2026-09-01. A table of
bare constants would silently keep billing the old number, and every figure the admin panel shows
the owner — and every "is it cheaper to switch" decision built on those figures — would be wrong by
50% from that morning onward, with nothing to notice it.

So each model maps to a list of (effective_from, input, output) and the rate in force on the day of
the call is the one used. Adding a future price change is a one-line append, done BEFORE it takes
effect, and the ledger stays correct across the boundary without anyone remembering.

WHAT IS AND IS NOT COUNTED HERE
  * Token rates: yes, per model, dated.
  * Prompt-cache reads and writes: yes, as multipliers, but only when the caller passes those
    counts. Nothing in this codebase uses prompt caching today (the advice prefix is ~940 tokens,
    below the 1,024-token minimum for opus-4-8/sonnet-5, so it would silently no-op) — the support
    is here so that the day it IS used, the ledger does not quietly under-report.
  * Web search: yes, and it is NOT a token cost. Anthropic bills $10 per 1,000 searches on top of
    tokens. ai/research.py runs web_research with max_uses=4, so a research job carries up to $0.04
    of tool fees that this module used to ignore entirely.
  * Batch: a 50% multiplier the caller applies; not inferred here.

Sources, fetched 2026-07-30: platform.claude.com/docs/en/about-claude/pricing ·
developers.openai.com/api/docs/pricing · ai.google.dev/gemini-api/docs/pricing ·
api-docs.deepseek.com/quick_start/pricing
"""
from __future__ import annotations

from datetime import date
from typing import Optional

# USD per 1,000,000 tokens, as (effective_from, input, output), oldest first.
# A model with one entry has never changed price; the date is when we recorded it.
RATES: dict[str, list[tuple[date, float, float]]] = {
    # ── Anthropic ────────────────────────────────────────────────────────────────────────────────
    "claude-opus-5":     [(date(2026, 1, 1), 5.0, 25.0)],
    "claude-opus-4-8":   [(date(2026, 1, 1), 5.0, 25.0)],
    "claude-opus-4-7":   [(date(2026, 1, 1), 5.0, 25.0)],
    "claude-opus-4-6":   [(date(2026, 1, 1), 5.0, 25.0)],
    # The introductory rate and the rate that replaces it. BOTH are listed on purpose: the change is
    # already published, so recording it now means nobody has to act on 2026-09-01.
    "claude-sonnet-5":   [(date(2026, 1, 1), 2.0, 10.0), (date(2026, 9, 1), 3.0, 15.0)],
    "claude-sonnet-4-6": [(date(2026, 1, 1), 3.0, 15.0)],
    "claude-haiku-4-5":  [(date(2026, 1, 1), 1.0, 5.0)],
    "claude-haiku-4-5-20251001": [(date(2026, 1, 1), 1.0, 5.0)],
    "claude-fable-5":    [(date(2026, 1, 1), 10.0, 50.0)],

    # ── Non-Anthropic, present so a bake-off writes a MEANINGFUL ledger row rather than falling to
    #    DEFAULT (which is Opus-class and would flatter every cheap model into looking expensive).
    #    Not used in production: LLM_PROVIDER is anthropic and llm.py has no other client wired.
    "gpt-5.6-sol":         [(date(2026, 1, 1), 5.0, 30.0)],
    "gpt-5.6-terra":       [(date(2026, 1, 1), 2.5, 15.0)],
    "gpt-5.6-luna":        [(date(2026, 1, 1), 1.0, 6.0)],
    "gpt-5.4-nano":        [(date(2026, 1, 1), 0.20, 1.25)],
    "gemini-3.1-pro":      [(date(2026, 1, 1), 2.0, 12.0)],
    "gemini-3.6-flash":    [(date(2026, 1, 1), 1.5, 7.5)],
    "gemini-3.5-flash-lite": [(date(2026, 1, 1), 0.30, 2.50)],
    "deepseek-v4-pro":     [(date(2026, 1, 1), 0.435, 0.87)],
    "deepseek-v4-flash":   [(date(2026, 1, 1), 0.14, 0.28)],
}

# An unknown model is priced as flagship-Anthropic. Deliberately the EXPENSIVE end: an unrecognised
# model should overstate the bill, never understate it, so a mistake shows up as a scary number
# rather than as silence.
DEFAULT: tuple[float, float] = (5.0, 25.0)

# Anthropic prompt-cache multipliers, applied to that model's INPUT rate.
CACHE_READ = 0.1     # a hit costs a tenth of fresh input
CACHE_WRITE_5M = 1.25
CACHE_WRITE_1H = 2.0

# Server-side tool fee, NOT a token cost: $10 per 1,000 searches.
WEB_SEARCH_USD = 0.01

# The Batch API discount, applied by the caller to both directions.
BATCH_MULTIPLIER = 0.5


def rate_for(model: str, on: Optional[date] = None) -> tuple[float, float]:
    """The (input, output) USD-per-1M rate in force for `model` on `on` (default: today)."""
    entries = RATES.get(model)
    if not entries:
        return DEFAULT
    day = on or date.today()
    chosen = entries[0]
    for entry in entries:
        if entry[0] <= day:
            chosen = entry
        else:
            break
    return chosen[1], chosen[2]


def cost_usd(
    model: str,
    input_tokens: int,
    output_tokens: int,
    *,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    cache_write_1h: bool = False,
    web_searches: int = 0,
    batch: bool = False,
    on: Optional[date] = None,
) -> float:
    """Cost in USD. The three positional arguments are the original signature and still mean the
    same thing, so every existing caller is unaffected; everything else is opt-in.

    `input_tokens` must be the UNCACHED input. Anthropic reports cache reads and writes in separate
    usage fields, so passing them here as well would double-bill them."""
    pin, pout = rate_for(model, on)
    total = input_tokens / 1e6 * pin + output_tokens / 1e6 * pout
    total += cache_read_tokens / 1e6 * pin * CACHE_READ
    total += cache_write_tokens / 1e6 * pin * (CACHE_WRITE_1H if cache_write_1h else CACHE_WRITE_5M)
    if batch:
        total *= BATCH_MULTIPLIER
    # Tool fees sit OUTSIDE the batch discount — the search is billed per call, not per token.
    total += web_searches * WEB_SEARCH_USD
    return round(total, 6)
