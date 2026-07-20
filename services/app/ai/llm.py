"""Provider-agnostic LLM adapter (default: Claude / Anthropic).

Two entry points:
  - complete_structured(system, user, schema) -> (validated Pydantic model, usage)  (advice)
  - complete_text(system, messages) -> (str, usage)                                  (chat)

`usage` is a dict {"provider", "model", "input_tokens", "output_tokens"} so callers
can record token consumption / cost in the AI usage ledger.

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


def _usage(provider: str, model: str, resp) -> dict:
    """Build a usage dict from an Anthropic response object."""
    return {
        "provider": provider,
        "model": model,
        "input_tokens": int(resp.usage.input_tokens),
        "output_tokens": int(resp.usage.output_tokens),
    }


async def complete_structured(system: str, user: str, schema: Type[T],
                              max_tokens: int = 3000) -> tuple[T, dict]:
    """Return (validated instance of `schema`, usage). Anthropic path uses messages.parse
    (structured outputs); other providers can be added behind the same interface."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    provider = (settings.llm_provider or "anthropic").lower()
    if provider != "anthropic":
        # Provider-agnostic by design; only Claude is wired today (chosen provider).
        raise LLMUnavailable(f"provider {provider} not wired yet")
    model = settings.llm_model or "claude-opus-4-8"
    client = _anthropic_client()
    resp = await client.messages.parse(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_format=schema,
    )
    if resp.parsed_output is None:
        raise LLMUnavailable("model returned no structured output")
    return resp.parsed_output, _usage(provider, model, resp)


async def complete_text(system: str, messages: list[dict],
                        max_tokens: int = 1500) -> tuple[str, dict]:
    """Free-form chat completion. `messages` is a list of {role, content}.
    Returns (text, usage)."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    provider = (settings.llm_provider or "anthropic").lower()
    if provider != "anthropic":
        raise LLMUnavailable(f"provider {provider} not wired yet")
    model = settings.llm_model or "claude-opus-4-8"
    client = _anthropic_client()
    resp = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
    return "\n".join(parts).strip(), _usage(provider, model, resp)


async def web_research(system: str, prompt: str, *, max_uses: int = 5,
                       max_tokens: int = 4000) -> tuple[str, list[dict], dict]:
    """Run a research turn with the provider's web search enabled (knowledge layer M3).

    Returns (text, citations, usage). `citations` is a list of {url, title} gathered from
    the search results so the synthesis step can attach source links (traceability P5).
    With the anthropic provider this uses the server-side web_search tool — search AND draft
    happen in one call (spec P3: search finds, LLM synthesizes). SEARCH_PROVIDER lets a
    dedicated search vendor (Tavily/Exa) be wired later behind the same signature.

    Raises LLMUnavailable when no key/provider is configured so callers degrade to
    structured-API-only knowledge."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    provider = (settings.llm_provider or "anthropic").lower()
    search_provider = (getattr(settings, "search_provider", "") or "anthropic").lower()
    if provider != "anthropic" or search_provider != "anthropic":
        raise LLMUnavailable(f"web search provider {search_provider} not wired yet")
    model = settings.llm_model or "claude-opus-4-8"
    client = _anthropic_client()
    resp = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": max_uses}],
    )
    text_parts: list[str] = []
    citations: list[dict] = []
    seen: set[str] = set()
    for block in resp.content:
        btype = getattr(block, "type", None)
        if btype == "text":
            text_parts.append(block.text)
            for c in (getattr(block, "citations", None) or []):
                url = getattr(c, "url", None)
                if url and url not in seen:
                    seen.add(url)
                    citations.append({"url": url, "title": getattr(c, "title", "") or ""})
    return "\n".join(text_parts).strip(), citations, _usage(provider, model, resp)


def model_info() -> tuple[str, str]:
    return (settings.llm_provider or "anthropic", settings.llm_model or "claude-opus-4-8")
