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
  * Prompt-cache reads: yes, and as of the 2026-07-30 DeepSeek migration they are no longer
    hypothetical. Anthropic caching is opt-in and we never opted in (the advice prefix is ~940
    tokens, below the 1,024-token minimum, so it would have silently no-opped); DeepSeek caches
    server-side WITHOUT being asked and reports the hit as its own usage field. So cache_read_tokens
    now arrives non-zero on ordinary calls, and it is priced from CACHE_READ_RATES — a published
    per-model price — rather than from Anthropic's input × 0.1 multiplier.
  * Cache WRITES: still multiplier-based and still unused; DeepSeek does not bill a write.
  * Web search: yes, and it is NOT a token cost. Anthropic bills $10 per 1,000 searches on top of
    tokens. ai/research.py runs web_research with max_uses=4, so a research job carries up to $0.04
    of tool fees that this module used to ignore entirely. ⚠️ WEB_SEARCH_USD is the ANTHROPIC rate;
    after the migration research runs through DeepSeek's Anthropic-compatible endpoint, whose search
    fee we have not measured, so a research row's tool fee is an upper-bound estimate, not a fact.
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

    # ── Google Gemini. IN PRODUCTION since the 2026-07-30 migration: vision only (photo label, T5
    #    diagnosis, T24 lab OCR), because DeepSeek accepts no images. Images are billed as input
    #    tokens inside promptTokenCount, so no separate per-image line is needed here.
    # `gemini-3.1-pro` was priced here and recommended as the fallback for poor lab scans; it is
    # a 404 on this account. The served pro ids are these two (checked against the models list).
    "gemini-3.1-pro-preview": [(date(2026, 1, 1), 2.0, 12.0)],
    "gemini-pro-latest":   [(date(2026, 1, 1), 2.0, 12.0)],
    "gemini-3.6-flash":    [(date(2026, 1, 1), 1.5, 7.5)],
    "gemini-3.5-flash-lite": [(date(2026, 1, 1), 0.30, 2.50)],

    # ── DeepSeek. IN PRODUCTION since the 2026-07-30 migration: every text path (advice, chat,
    #    research, season summary). v4-flash is the one the owner chose everywhere — v4-pro scored
    #    identically on our prompts and ran 4-5x slower — but both are priced so a bake-off row is
    #    meaningful. Roughly 35x cheaper than the Opus rate this table used to fall back to, which
    #    is exactly why assert_priced() below exists.
    "deepseek-v4-pro":     [(date(2026, 1, 1), 0.435, 0.87)],
    "deepseek-v4-flash":   [(date(2026, 1, 1), 0.14, 0.28)],

    # ── OpenAI: never wired in llm.py. Here only so a comparison spreadsheet has real numbers.
    "gpt-5.6-sol":         [(date(2026, 1, 1), 5.0, 30.0)],
    "gpt-5.6-terra":       [(date(2026, 1, 1), 2.5, 15.0)],
    "gpt-5.6-luna":        [(date(2026, 1, 1), 1.0, 6.0)],
    "gpt-5.4-nano":        [(date(2026, 1, 1), 0.20, 1.25)],
}

# An unknown model is priced as flagship-Anthropic. Deliberately the EXPENSIVE end: an unrecognised
# model should overstate the bill, never understate it, so a mistake shows up as a scary number
# rather than as silence.
#
# THAT DIRECTION FLIPPED MEANING WITH THE DEEPSEEK MIGRATION. When everything was Claude, an
# unlisted id was a near-miss on a listed one and the fallback was a rounding error. Now the models
# in production are ~35x cheaper than this constant, so one typo'd or renamed model id turns the
# admin cost panel into fiction in the other direction — $0.02 of real spend reported as $0.70 — and
# every "should we switch" decision built on that panel is made on a number nobody checked. The
# fallback stays (silently under-reporting is worse), but assert_priced() makes it loud.
DEFAULT: tuple[float, float] = (5.0, 25.0)

# Anthropic prompt-cache multipliers, applied to that model's INPUT rate.
CACHE_READ = 0.1     # a hit costs a tenth of fresh input
CACHE_WRITE_5M = 1.25
CACHE_WRITE_1H = 2.0

# Per-model cache-READ rates, in USD per 1M tokens, for vendors that publish the cache price as a
# price rather than as a multiplier of input. DeepSeek does: a cache hit is billed at its own line
# item, not at "input × something", so applying Anthropic's 0.1 here would be us inventing a number
# for a figure the vendor states. Values are the published cache-hit rate for each model.
# A model absent from this dict falls back to CACHE_READ × its input rate.
CACHE_READ_RATES: dict[str, list[tuple[date, float]]] = {
    "deepseek-v4-pro":   [(date(2026, 1, 1), 0.0435)],
    "deepseek-v4-flash": [(date(2026, 1, 1), 0.014)],
}

# Server-side tool fee, NOT a token cost: $10 per 1,000 searches.
WEB_SEARCH_USD = 0.01

# The Batch API discount, applied by the caller to both directions.
BATCH_MULTIPLIER = 0.5


def _in_force(entries: list, on: Optional[date]):
    """The last entry whose effective_from has arrived. Entries are oldest-first."""
    day = on or date.today()
    chosen = entries[0]
    for entry in entries:
        if entry[0] <= day:
            chosen = entry
        else:
            break
    return chosen


def is_priced(model: str) -> bool:
    """Whether we hold a real published rate for this model id."""
    return model in RATES


def assert_priced(model: str) -> None:
    """Raise if `model` would be billed at DEFAULT.

    Not called on the hot path — cost_usd must never break a farmer's advice over a bookkeeping
    detail. This is the check to run when ADDING a provider or flipping LLM_MODEL/VISION_MODEL: an
    id that is not in RATES does not fail, it silently bills at the Opus fallback, which after the
    DeepSeek migration overstates the truth by ~35x. Making that a one-line assertion at the point
    of change is cheaper than noticing it in the admin panel three months later."""
    if not is_priced(model):
        raise KeyError(
            f"no published rate recorded for model {model!r} — it would bill at the DEFAULT "
            f"{DEFAULT} (Opus-class). Add it to ai/pricing.RATES with its effective date and "
            f"source before putting it in front of traffic.")


def unpriced_models(models: list[str]) -> list[str]:
    """Which of `models` would fall back to DEFAULT. For a startup/admin check over the ids actually
    configured (LLM_MODEL, VISION_MODEL, and every tiers.py model)."""
    return sorted({m for m in models if m and not is_priced(m)})


def rate_for(model: str, on: Optional[date] = None) -> tuple[float, float]:
    """The (input, output) USD-per-1M rate in force for `model` on `on` (default: today)."""
    entries = RATES.get(model)
    if not entries:
        return DEFAULT
    chosen = _in_force(entries, on)
    return chosen[1], chosen[2]


def cache_read_rate(model: str, on: Optional[date] = None) -> float:
    """USD per 1M cache-READ tokens. A published per-model price when the vendor states one
    (DeepSeek), otherwise the Anthropic multiplier applied to that model's input rate."""
    entries = CACHE_READ_RATES.get(model)
    if entries:
        return _in_force(entries, on)[1]
    return rate_for(model, on)[0] * CACHE_READ


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
    usage fields, and DeepSeek reports prompt_tokens as hit+miss (ai/llm.py hands us the miss), so
    passing the cached part here as well would double-bill it."""
    pin, pout = rate_for(model, on)
    total = input_tokens / 1e6 * pin + output_tokens / 1e6 * pout
    total += cache_read_tokens / 1e6 * cache_read_rate(model, on)
    total += cache_write_tokens / 1e6 * pin * (CACHE_WRITE_1H if cache_write_1h else CACHE_WRITE_5M)
    if batch:
        total *= BATCH_MULTIPLIER
    # Tool fees sit OUTSIDE the batch discount — the search is billed per call, not per token.
    total += web_searches * WEB_SEARCH_USD
    return round(total, 6)
