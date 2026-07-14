"""LLM token pricing (USD per 1,000,000 tokens) as (input, output).

Used to convert recorded token counts into a cost in the AI usage ledger. Prices
are per-model; unknown models fall back to DEFAULT (Opus-class pricing)."""
from __future__ import annotations

# USD per 1,000,000 tokens as (input, output)
PRICING: dict[str, tuple[float, float]] = {
    "claude-opus-4-8": (5, 25),
    "claude-opus-4-7": (5, 25),
    "claude-opus-4-6": (5, 25),
    "claude-sonnet-5": (3, 15),
    "claude-sonnet-4-6": (3, 15),
    "claude-haiku-4-5": (1, 5),
    "claude-fable-5": (10, 50),
}

DEFAULT: tuple[float, float] = (5, 25)


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Return the cost in USD for the given model and token counts."""
    pin, pout = PRICING.get(model, DEFAULT)
    return round(input_tokens / 1e6 * pin + output_tokens / 1e6 * pout, 6)
