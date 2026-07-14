"""Provider-agnostic LLM adapter (default: Claude / Anthropic).

Two entry points:
  - complete_structured(system, user, schema) -> validated Pydantic model  (advice)
  - complete_text(system, messages) -> str                                  (chat)

The provider is chosen by settings.llm_provider; the API key comes from the
environment (LLM_API_KEY / ANTHROPIC_API_KEY), added to .env by the operator —
never hard-coded. If no key is configured, calls raise LLMUnavailable so callers
can degrade gracefully (skip advice, tell the chat user to try later)."""
from __future__ import annotations

from typing import Type, TypeVar

from pydantic import BaseModel

from ..config import settings

T = TypeVar("T", bound=BaseModel)


class LLMUnavailable(RuntimeError):
    """Raised when no LLM provider/key is configured."""


def _api_key() -> str:
    import os

    return (settings.llm_api_key or os.environ.get("ANTHROPIC_API_KEY")
            or os.environ.get("LLM_API_KEY") or "").strip()


def is_configured() -> bool:
    return bool(_api_key())


def _anthropic_client():
    from anthropic import AsyncAnthropic

    return AsyncAnthropic(api_key=_api_key())


async def complete_structured(system: str, user: str, schema: Type[T],
                              max_tokens: int = 3000) -> T:
    """Return a validated instance of `schema`. Anthropic path uses messages.parse
    (structured outputs); other providers can be added behind the same interface."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    provider = (settings.llm_provider or "anthropic").lower()
    if provider != "anthropic":
        # Provider-agnostic by design; only Claude is wired today (chosen provider).
        raise LLMUnavailable(f"provider {provider} not wired yet")
    client = _anthropic_client()
    resp = await client.messages.parse(
        model=settings.llm_model or "claude-opus-4-8",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_format=schema,
    )
    if resp.parsed_output is None:
        raise LLMUnavailable("model returned no structured output")
    return resp.parsed_output


async def complete_text(system: str, messages: list[dict], max_tokens: int = 1500) -> str:
    """Free-form chat completion. `messages` is a list of {role, content}."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    provider = (settings.llm_provider or "anthropic").lower()
    if provider != "anthropic":
        raise LLMUnavailable(f"provider {provider} not wired yet")
    client = _anthropic_client()
    resp = await client.messages.create(
        model=settings.llm_model or "claude-opus-4-8",
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
    return "\n".join(parts).strip()


def model_info() -> tuple[str, str]:
    return (settings.llm_provider or "anthropic", settings.llm_model or "claude-opus-4-8")
