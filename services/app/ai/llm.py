"""The single provider seam. THIS IS THE ONLY MODULE THAT MAY KNOW A PROVIDER EXISTS.

Entry points (unchanged signatures — every caller predates this file's rewrite):
  - complete_structured(system, user, schema)        -> (validated Pydantic model, usage)   advice
  - complete_text(system, messages)                  -> (str, usage)                        chat
  - complete_vision_structured(system, user, images, schema) -> (model, usage)   photo / lab OCR
  - web_research(system, prompt)                     -> (text, sources, usage)   knowledge layer

TWO PROVIDERS, ON PURPOSE (owner's decision, 2026-07-30)
  Text  → DeepSeek (deepseek-v4-flash everywhere; v4-pro scored identically and runs 4-5x slower).
  Vision → Gemini, because DeepSeek accepts no images ANYWHERE. That is not a gap to work around:
    * the native /chat/completions parser rejects `image_url` with HTTP 400, and
    * the Anthropic-compatible endpoint ACCEPTS the image block, answers HTTP 200, and silently
      swaps in the literal string "[Unsupported Image]".
  The second one is why complete_vision_structured raises for deepseek BEFORE sending anything:
  routing photos there would have produced a green deploy with a dead feature and no error to find.

WHAT DEEPSEEK DOES NOT GIVE US, AND WHAT WE DO INSTEAD
  * No strict json_schema. `response_format: json_object` works and a forced function call gets
    close, but `required` is not guaranteed: measured 10/10 clean when the prompt and the schema
    agree, 8/10 when the prompt allowed values outside the enum. Structured output here is therefore
    STATISTICAL, so every structured path is forced-tool-call → JSON parse → Pydantic validate →
    bounded repair retry, and raises a typed failure when it never validates. Nothing downstream
    ever sees a half-filled model.
  * finish_reason == "length" is NEVER parsed. Silent truncation is this API's default failure mode
    and a truncated JSON object can still validate against a schema of optional fields.
  * No rate-limit headers exist, so backoff is blind: fixed short sleeps, bounded by a wall-clock
    budget rather than by a retry count alone, because a farmer is waiting at the other end.
  * No HTTP timeout existed in this file at all before. v4-flash averages ~15s per structured call,
    so three unbounded attempts is 45s on a user-facing route. Timeouts are explicit below.

DEGRADATION CONTRACT (matches how advice already behaves)
  No key for the configured provider → is_configured()/vision_available() are False and callers
  report the feature unavailable. Anything that goes wrong in transport is wrapped in
  LLMUnavailable, so a caller that already handles "AI is off" also handles "AI broke" — the two
  typed subclasses below exist so a caller CAN tell them apart, but nobody is forced to.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import time
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel, ValidationError

from ..config import settings

T = TypeVar("T", bound=BaseModel)


class LLMUnavailable(RuntimeError):
    """Raised when no LLM provider/key is configured, or the provider call failed.

    Every existing caller catches exactly this and degrades (advice returns None, chat 503, the
    photo routes answer ai_unavailable). The two subclasses below therefore INHERIT from it: a new
    sibling exception would escape those handlers and surface as a 500."""


class LLMInvalidOutput(LLMUnavailable):
    """The model answered, repeatedly, with something that does not satisfy the schema."""


class LLMTruncated(LLMUnavailable):
    """The answer was cut off at max_tokens. Deliberately never parsed — see the module docstring."""


# ── Provider endpoints. Constants rather than settings: an operator who needs to move these has a
#    bigger problem than a .env line, and every extra knob is another way for prod to disagree with
#    this file.
DEEPSEEK_BASE = "https://api.deepseek.com"
# The Anthropic-compatible endpoint. Used for ONE thing only: server-side web search, which the
# native endpoint does not run. Never for images (see the module docstring).
DEEPSEEK_ANTHROPIC_BASE = f"{DEEPSEEK_BASE}/anthropic"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"

# Providers we can actually drive, per capability. `gemini` is absent from text and `deepseek` from
# vision on purpose — this pair of sets is what makes is_configured()/vision_available() truthful
# instead of "a key is present somewhere".
_TEXT_PROVIDERS = {"anthropic", "deepseek"}
_VISION_PROVIDERS = {"anthropic", "gemini"}

# Model-id prefix → provider. Routing on the MODEL (not on the declared provider) is what stops a
# per-tier model override from being posted to the wrong vendor's API.
_MODEL_PREFIXES: tuple[tuple[str, str], ...] = (
    ("claude-", "anthropic"),
    ("deepseek", "deepseek"),
    ("gemini", "gemini"),
)

_GEMINI_DEFAULT_VISION_MODEL = "gemini-3.6-flash"

# Transport budget. _CALL_TIMEOUT is one HTTP attempt; _STRUCTURED_BUDGET is the wall clock for the
# whole validate-and-repair loop, and it is the real limit — attempts stop when either runs out, so
# a slow provider cannot turn "up to 3 tries" into a minute of a farmer staring at a spinner.
_CALL_TIMEOUT_S = 60.0
_CONNECT_TIMEOUT_S = 10.0
_STRUCTURED_BUDGET_S = 35.0
_STRUCTURED_ATTEMPTS = 3
_BACKOFF_S = (0.8, 2.0)          # blind: this API publishes no rate-limit headers

_TOOL_NAME = "emit_result"


# ───────────────────────────────── configuration / routing ──────────────────────────────────────

def _text_provider() -> str:
    return (settings.llm_provider or "anthropic").strip().lower()


def _vision_provider() -> str:
    return (settings.vision_provider or "anthropic").strip().lower()


def _generic_key_if(provider: str) -> str:
    """LLM_API_KEY, but ONLY for the provider LLM_PROVIDER names.

    This is the compatibility path that keeps today's deployment (LLM_PROVIDER=anthropic +
    LLM_API_KEY) working untouched. It is deliberately not a fallback for any other provider: a key
    handed to the wrong vendor is either an auth error at best or, with a compatible endpoint, a
    quietly wrong bill at worst."""
    return settings.llm_api_key if _text_provider() == provider else ""


def _key_for(provider: str) -> str:
    """The API key for one provider. NO CROSS-PROVIDER FALLBACK, by design."""
    if provider == "deepseek":
        return (settings.deepseek_api_key or _generic_key_if("deepseek")
                or os.environ.get("DEEPSEEK_API_KEY") or "").strip()
    if provider == "gemini":
        return (settings.gemini_api_key or _generic_key_if("gemini")
                or os.environ.get("GEMINI_API_KEY") or "").strip()
    if provider == "anthropic":
        return (_generic_key_if("anthropic")
                or os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    return ""


def _route(model: str) -> str:
    """Which provider serves `model`. Falls back to the declared text provider for an id we do not
    recognise, so a custom/self-hosted model id still reaches the endpoint the operator configured
    rather than being refused by this file."""
    m = (model or "").strip().lower()
    for prefix, provider in _MODEL_PREFIXES:
        if m.startswith(prefix):
            return provider
    return _text_provider()


def _text_model(model: Optional[str]) -> str:
    return (model or settings.llm_model or "claude-opus-4-8").strip()


def _vision_model(model: Optional[str]) -> str:
    """The vision model. An explicit per-call model wins, then VISION_MODEL, then the provider's
    default. The anthropic default follows LLM_MODEL so an untouched .env keeps its old behaviour;
    the gemini default is named here because LLM_MODEL will be a DeepSeek id after the migration and
    sending that to Gemini would 404."""
    if model:
        return model.strip()
    if settings.vision_model:
        return settings.vision_model.strip()
    if _vision_provider() == "gemini":
        return _GEMINI_DEFAULT_VISION_MODEL
    # Anthropic vision. Follow LLM_MODEL only while it still NAMES a Claude model: after the
    # migration LLM_MODEL is a DeepSeek id, and inheriting it here would post that id to Anthropic
    # and 404 — a confusing way to say "you set VISION_PROVIDER=anthropic without VISION_MODEL".
    inherited = (settings.llm_model or "").strip()
    return inherited if inherited.lower().startswith("claude-") else "claude-opus-4-8"


def is_configured() -> bool:
    """True when the TEXT provider is one we drive and has a key. Says nothing about vision."""
    provider = _text_provider()
    return provider in _TEXT_PROVIDERS and bool(_key_for(provider))


def vision_available() -> bool:
    """True when photographs can actually be understood.

    Separate from is_configured() because after this migration the two answers genuinely differ: the
    text provider can be fully working while vision is unavailable, and `deepseek` can never be the
    answer here no matter how many keys are set."""
    provider = _vision_provider()
    return provider in _VISION_PROVIDERS and bool(_key_for(provider))


def model_info() -> tuple[str, str]:
    """(provider, model) for the text path — what advice records next to its prose."""
    return _text_provider(), _text_model(None)


def vision_info() -> tuple[str, str]:
    return _vision_provider(), _vision_model(None)


# ───────────────────────────────────────── transport ─────────────────────────────────────────────

def _usage(provider: str, model: str, *, input_tokens: int, output_tokens: int,
           cache_read_tokens: int = 0, web_searches: int = 0) -> dict:
    """The usage dict every caller receives. `input_tokens` is always the UNCACHED input, so a
    consumer that adds cache_read_tokens on top cannot double-bill (ai/pricing.py relies on this)."""
    return {
        "provider": provider,
        "model": model,
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "cache_read_tokens": int(cache_read_tokens),
        "web_searches": int(web_searches),
    }


def _anthropic_client(provider: str):
    """AsyncAnthropic pointed at the right host. `provider` is 'anthropic' (real) or 'deepseek'
    (the compatible endpoint, used ONLY for web research)."""
    from anthropic import AsyncAnthropic

    key = _key_for(provider)
    if not key:
        raise LLMUnavailable(f"no API key configured for {provider}")
    if provider == "deepseek":
        return AsyncAnthropic(api_key=key, base_url=DEEPSEEK_ANTHROPIC_BASE,
                              timeout=_CALL_TIMEOUT_S)
    return AsyncAnthropic(api_key=key, timeout=_CALL_TIMEOUT_S)


def _wrap(exc: Exception, what: str) -> LLMUnavailable:
    """Every transport/SDK error becomes LLMUnavailable. Before this rewrite there was no try/except
    in this file at all, so a provider hiccup left FastAPI to answer 500 on a route whose caller
    already knew how to say 'AI is unavailable'. The class name is kept in the message because the
    exception text alone is often empty (httpx timeouts)."""
    if isinstance(exc, LLMUnavailable):
        return exc
    return LLMUnavailable(f"{what} failed: {type(exc).__name__}: {exc}")


async def _post_json(url: str, payload: dict, headers: dict, what: str) -> dict:
    """One JSON POST with explicit timeouts and blind backoff on 429/5xx."""
    import httpx

    timeout = httpx.Timeout(_CALL_TIMEOUT_S, connect=_CONNECT_TIMEOUT_S)
    last: Optional[Exception] = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for pause in (*_BACKOFF_S, None):     # last pass has no sleep after it
            try:
                resp = await client.post(url, json=payload, headers=headers)
            except Exception as exc:  # noqa: BLE001 — network layer; retried then wrapped
                last = exc
            else:
                if resp.status_code < 400:
                    return resp.json()
                # 4xx other than 429 is our bug (bad model id, bad schema, no credit) — retrying it
                # only spends the caller's patience.
                if resp.status_code != 429 and resp.status_code < 500:
                    raise LLMUnavailable(
                        f"{what}: HTTP {resp.status_code} {resp.text[:300]}")
                last = LLMUnavailable(f"{what}: HTTP {resp.status_code}")
            if pause is None:
                break
            await asyncio.sleep(pause)
    raise _wrap(last or LLMUnavailable("no response"), what)


# ───────────────────────────────── DeepSeek (native, text) ───────────────────────────────────────

def _deepseek_usage(model: str, raw: dict, *, web_searches: int = 0) -> dict:
    """DeepSeek reports prompt_tokens = cache HIT + cache MISS, plus the two parts separately. We
    record the MISS as input_tokens and the HIT as cache_read_tokens, because they are billed at
    different published rates — reusing Anthropic's 'input × 0.1' multiplier here would be a guess
    about a number this vendor publishes outright."""
    u = raw.get("usage") or {}
    prompt = int(u.get("prompt_tokens") or 0)
    hit = int(u.get("prompt_cache_hit_tokens") or 0)
    miss = u.get("prompt_cache_miss_tokens")
    uncached = int(miss) if miss is not None else max(prompt - hit, 0)
    return _usage("deepseek", model, input_tokens=uncached,
                  output_tokens=int(u.get("completion_tokens") or 0),
                  cache_read_tokens=hit, web_searches=web_searches)


async def _deepseek_chat(model: str, messages: list[dict], max_tokens: int, *,
                         tools: Optional[list[dict]] = None,
                         tool_choice: Optional[dict] = None,
                         thinking: bool = False) -> dict:
    key = _key_for("deepseek")
    if not key:
        raise LLMUnavailable("no API key configured for deepseek")
    payload: dict[str, Any] = {"model": model, "messages": messages, "max_tokens": max_tokens}
    if tools:
        payload["tools"] = tools
        if tool_choice:
            payload["tool_choice"] = tool_choice
            # EXPLICITLY OFF, not merely omitted. Reasoning is ON by default on these models, so
            # leaving the key out is not the same as disabling it: the first live structured call
            # came back HTTP 400 "Thinking mode does not support this tool_choice". A forced
            # function call and reasoning cannot coexist, and the whole structured path forces one.
            payload["thinking"] = {"type": "disabled"}
    else:
        # Off unless asked for, on EVERY path — not just the forced-tool one. Reasoning is on by
        # default here and its tokens are billed and budgeted as completion, so a plain chat answer
        # spends part of max_tokens thinking before it writes anything: a one-sentence reply burned
        # 81 reasoning tokens, and on the chat prompt (which carries the whole field context) that
        # is what pushed finish_reason to "length" and turned a working answer into a 503.
        payload["thinking"] = {"type": "enabled" if thinking else "disabled"}
    return await _post_json(f"{DEEPSEEK_BASE}/chat/completions", payload,
                            {"Authorization": f"Bearer {key}",
                             "Content-Type": "application/json"}, "deepseek chat")


def _deepseek_choice_text(raw: dict, what: str) -> tuple[str, dict]:
    """(assistant text, message). Raises LLMTruncated rather than returning a cut-off answer."""
    choices = raw.get("choices") or []
    if not choices:
        raise LLMUnavailable(f"{what}: response carried no choices")
    choice = choices[0]
    if choice.get("finish_reason") == "length":
        raise LLMTruncated(f"{what}: answer hit max_tokens and was cut off")
    msg = choice.get("message") or {}
    text = (msg.get("content") or "").strip()
    # A 200 carrying empty content is not an answer. This provider returns exactly that when it
    # gives up, and the callers store what they are handed: chat.py would INSERT a blank assistant
    # turn that stays in the transcript for good, having spent one of the month's questions on it.
    # Structured callers pass through here too, but they read tool_calls, not content — so only
    # complain when there is nothing at all to work with.
    if not text and not (msg.get("tool_calls") or []):
        raise LLMInvalidOutput(f"{what}: 200 with empty content and no tool call")
    return text, msg


def _tool_arguments(msg: dict) -> str:
    calls = msg.get("tool_calls") or []
    for call in calls:
        fn = call.get("function") or {}
        if fn.get("name") == _TOOL_NAME:
            return fn.get("arguments") or ""
    # The forced call is not guaranteed, only very likely — fall back to a bare JSON body so one
    # stray plain-text answer costs a repair round rather than the whole call.
    return (msg.get("content") or "").strip()


def _schema_clause(schema: Type[T]) -> str:
    """Restate the schema in the prompt. Measured: agreement between prompt and schema is what moves
    the forced tool call from 8/10 to 10/10 valid — the API enforces nothing on its own."""
    return ("\n\nCAVAB FORMATI: yalnız `" + _TOOL_NAME + "` funksiyasını çağır və bütün MƏCBURİ "
            "sahələri doldur. Sahə dəyərini bilmirsənsə boş sətir/boş siyahı ver — sahəni ATLAMA. "
            "Enum tipli sahələrdə YALNIZ sxemdə sadalanan dəyərlərdən birini yaz.\n"
            "JSON sxemi:\n" + json.dumps(schema.model_json_schema(), ensure_ascii=False))


def _repair_prompt(raw_text: str, exc: Exception) -> str:
    detail = exc.errors() if isinstance(exc, ValidationError) else str(exc)
    return ("Əvvəlki cavabın sxemə uyğun deyil.\n"
            f"Sənin cavabın: {raw_text[:1500]}\n"
            f"Xəta: {json.dumps(detail, ensure_ascii=False, default=str)[:1200]}\n"
            "Eyni məzmunu SXEMƏ TAM UYĞUN şəkildə yenidən ver. Başqa mətn yazma.")


def _merge_usage(total: Optional[dict], one: dict) -> dict:
    """Sum the attempts. A repair round is real spend; dropping it would make the ledger read as if
    retries were free."""
    if total is None:
        return dict(one)
    for k in ("input_tokens", "output_tokens", "cache_read_tokens", "web_searches"):
        total[k] = int(total.get(k, 0)) + int(one.get(k, 0))
    return total


async def _deepseek_structured(system: str, user: str, schema: Type[T], max_tokens: int,
                               model: str, attempts: int) -> tuple[T, dict]:
    tool = {"type": "function",
            "function": {"name": _TOOL_NAME,
                         "description": "Return the result in the required structure.",
                         "parameters": schema.model_json_schema()}}
    base = [{"role": "system", "content": system + _schema_clause(schema)},
            {"role": "user", "content": user}]
    deadline = time.monotonic() + _STRUCTURED_BUDGET_S
    total: Optional[dict] = None
    repair: Optional[str] = None
    last_exc: Optional[Exception] = None
    for attempt in range(attempts):
        messages = base if repair is None else base + [{"role": "user", "content": repair}]
        raw = await _deepseek_chat(
            model, messages, max_tokens, tools=[tool],
            tool_choice={"type": "function", "function": {"name": _TOOL_NAME}})
        total = _merge_usage(total, _deepseek_usage(model, raw))
        _, msg = _deepseek_choice_text(raw, "deepseek structured")   # raises on truncation
        args = _tool_arguments(msg)
        try:
            return schema.model_validate_json(args), total
        except (ValidationError, ValueError) as exc:
            last_exc = exc
            repair = _repair_prompt(args, exc)
        # Stop on the clock, not only on the count: attempts are ~15s each and someone is waiting.
        if time.monotonic() >= deadline or attempt == attempts - 1:
            break
    raise LLMInvalidOutput(
        f"deepseek did not return a valid {schema.__name__} in {attempts} attempts: {last_exc}")


# ────────────────────────────────── Gemini (vision only) ─────────────────────────────────────────

def _gemini_usage(model: str, raw: dict) -> dict:
    u = raw.get("usageMetadata") or {}
    prompt = int(u.get("promptTokenCount") or 0)
    cached = int(u.get("cachedContentTokenCount") or 0)
    # Gemini counts the image inside promptTokenCount; the cached part is reported on top of it, so
    # subtract to keep input_tokens meaning "uncached input" like everywhere else in this file.
    return _usage("gemini", model, input_tokens=max(prompt - cached, 0),
                  output_tokens=int(u.get("candidatesTokenCount") or 0),
                  cache_read_tokens=cached)


def _gemini_text(raw: dict) -> str:
    for cand in raw.get("candidates") or []:
        if cand.get("finishReason") in ("MAX_TOKENS", "LENGTH"):
            raise LLMTruncated("gemini vision: answer hit maxOutputTokens and was cut off")
        parts = ((cand.get("content") or {}).get("parts") or [])
        text = "".join(p.get("text") or "" for p in parts).strip()
        if text:
            return text
    # A safety block returns candidates without text, or none at all.
    raise LLMUnavailable("gemini vision: response carried no text "
                         f"({json.dumps(raw.get('promptFeedback') or {}, ensure_ascii=False)[:200]})")


async def _gemini_vision_structured(system: str, user: str, images: list[tuple[str, bytes]],
                                    schema: Type[T], max_tokens: int, model: str,
                                    attempts: int) -> tuple[T, dict]:
    """JSON mode + validate + repair, rather than Gemini's responseSchema.

    responseSchema does enforce, but it accepts only a subset of JSON Schema, and Pydantic emits
    $defs/anyOf for the Optional[...] fields these three prompts are full of. A schema the API
    rejects would take the feature down for a validation guarantee we already implement here."""
    key = _key_for("gemini")
    if not key:
        raise LLMUnavailable("no API key configured for gemini")
    parts: list[dict] = [
        {"inline_data": {"mime_type": mt,
                         "data": base64.standard_b64encode(raw).decode("ascii")}}
        for mt, raw in images
    ]
    parts.append({"text": user + _schema_clause(schema)})
    url = f"{GEMINI_BASE}/models/{model}:generateContent?key={key}"
    deadline = time.monotonic() + _STRUCTURED_BUDGET_S
    total: Optional[dict] = None
    extra: list[dict] = []
    last_exc: Optional[Exception] = None
    for attempt in range(attempts):
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": parts}] + extra,
            "generationConfig": {"maxOutputTokens": max_tokens,
                                 "responseMimeType": "application/json"},
        }
        raw = await _post_json(url, payload, {"Content-Type": "application/json"}, "gemini vision")
        total = _merge_usage(total, _gemini_usage(model, raw))
        text = _gemini_text(raw)          # raises on truncation
        try:
            return schema.model_validate_json(text), total
        except (ValidationError, ValueError) as exc:
            last_exc = exc
            extra = [{"role": "model", "parts": [{"text": text[:2000]}]},
                     {"role": "user", "parts": [{"text": _repair_prompt(text, exc)}]}]
        if time.monotonic() >= deadline or attempt == attempts - 1:
            break
    raise LLMInvalidOutput(
        f"gemini did not return a valid {schema.__name__} in {attempts} attempts: {last_exc}")


# ─────────────────────────────────────── public API ──────────────────────────────────────────────

async def complete_structured(system: str, user: str, schema: Type[T],
                              max_tokens: int = 3000, model: str | None = None,
                              attempts: int = _STRUCTURED_ATTEMPTS) -> tuple[T, dict]:
    """Return (validated instance of `schema`, usage).

    Anthropic uses messages.parse (real structured outputs). DeepSeek uses forced tool call +
    validate + bounded repair, because it enforces no schema — see the module docstring.
    `model` overrides the default (per-tier selection)."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    model = _text_model(model)
    provider = _route(model)
    try:
        if provider == "deepseek":
            return await _deepseek_structured(system, user, schema, max_tokens, model, attempts)
        if provider == "anthropic":
            client = _anthropic_client("anthropic")
            resp = await client.messages.parse(
                model=model, max_tokens=max_tokens, system=system,
                messages=[{"role": "user", "content": user}], output_format=schema)
            if resp.parsed_output is None:
                raise LLMInvalidOutput("model returned no structured output")
            return resp.parsed_output, _usage(
                provider, model, input_tokens=resp.usage.input_tokens,
                output_tokens=resp.usage.output_tokens,
                cache_read_tokens=int(getattr(resp.usage, "cache_read_input_tokens", 0) or 0))
    except Exception as exc:  # noqa: BLE001 — one contract out of this module
        raise _wrap(exc, f"{provider} structured completion")
    raise LLMUnavailable(f"provider {provider} is not wired for text")


async def complete_vision_structured(system: str, user: str, images: list[tuple[str, bytes]],
                                     schema: Type[T], max_tokens: int = 2000,
                                     model: str | None = None,
                                     attempts: int = _STRUCTURED_ATTEMPTS) -> tuple[T, dict]:
    """Structured output over one or more images (photo label, T5 diagnosis, T24 lab OCR).
    `images` is a list of (media_type, raw_bytes).

    Routed by VISION_PROVIDER, never by the text provider, and it REFUSES deepseek before opening a
    connection: that endpoint answers 200 with "[Unsupported Image]" substituted for the picture, so
    sending anyway would return a confident diagnosis of an image the model never saw.

    NOTE the `model` argument: callers pass the per-tier TEXT model (tiers.model_for). It is
    accepted and then ignored for a non-anthropic vision provider, because a DeepSeek id posted to
    Gemini is a 404 — see _vision_model()."""
    provider = _vision_provider()
    if provider == "deepseek":
        raise LLMUnavailable(
            "vision is not available on deepseek: it accepts no images on any endpoint "
            "(the compatible endpoint silently substitutes '[Unsupported Image]')")
    if not vision_available():
        raise LLMUnavailable(f"no vision key configured for {provider}")
    if provider == "gemini":
        # Ignore a claude-*/deepseek-* tier model here; only an explicit gemini id is honoured.
        model = model if (model or "").strip().lower().startswith("gemini") else None
    vmodel = _vision_model(model)
    try:
        if provider == "gemini":
            return await _gemini_vision_structured(system, user, images, schema,
                                                   max_tokens, vmodel, attempts)
        client = _anthropic_client("anthropic")
        content: list[dict] = [
            {"type": "image", "source": {"type": "base64", "media_type": mt,
                                         "data": base64.standard_b64encode(raw).decode("ascii")}}
            for mt, raw in images
        ]
        content.append({"type": "text", "text": user})
        resp = await client.messages.parse(
            model=vmodel, max_tokens=max_tokens, system=system,
            messages=[{"role": "user", "content": content}], output_format=schema)
        if resp.parsed_output is None:
            raise LLMInvalidOutput("vision model returned no structured output")
        return resp.parsed_output, _usage(
            provider, vmodel, input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
            cache_read_tokens=int(getattr(resp.usage, "cache_read_input_tokens", 0) or 0))
    except Exception as exc:  # noqa: BLE001
        raise _wrap(exc, f"{provider} vision completion")


async def complete_text(system: str, messages: list[dict],
                        max_tokens: int = 1500, model: str | None = None) -> tuple[str, dict]:
    """Free-form chat completion. `messages` is a list of {role, content}. Returns (text, usage)."""
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    model = _text_model(model)
    provider = _route(model)
    try:
        if provider == "deepseek":
            raw = await _deepseek_chat(
                model, [{"role": "system", "content": system}] + list(messages), max_tokens,
                thinking=bool(settings.deepseek_thinking))
            text, _ = _deepseek_choice_text(raw, "deepseek chat")
            return text, _deepseek_usage(model, raw)
        if provider == "anthropic":
            client = _anthropic_client("anthropic")
            resp = await client.messages.create(
                model=model, max_tokens=max_tokens, system=system, messages=messages)
            parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
            joined = "\n".join(parts).strip()
            if not joined:
                # Same rule as the DeepSeek branch: a reply with no text is a failure, not a reply.
                raise LLMInvalidOutput("anthropic chat: response carried no text block")
            return joined, _usage(
                provider, model, input_tokens=resp.usage.input_tokens,
                output_tokens=resp.usage.output_tokens,
                cache_read_tokens=int(getattr(resp.usage, "cache_read_input_tokens", 0) or 0))
    except Exception as exc:  # noqa: BLE001
        raise _wrap(exc, f"{provider} text completion")
    raise LLMUnavailable(f"provider {provider} is not wired for text")


async def web_research(system: str, prompt: str, *, max_uses: int = 5,
                       max_tokens: int = 4000) -> tuple[str, list[dict], dict]:
    """Research turn with the provider's server-side web search (knowledge layer M3).

    Returns (text, sources, usage). SOURCES ARE PAGE-LEVEL, NOT PER-CLAIM. With Anthropic the
    response carries per-sentence citations; DeepSeek documents the citation field as "Ignored" and
    empirically returns none, so on that path we can only report which pages the search consulted.
    That is the honest maximum, and it is why the list is built from the search RESULT blocks rather
    than from text citations alone — a caller that renders these must not present them as backing a
    particular sentence.

    DeepSeek runs web search only through its Anthropic-compatible endpoint, so this one function
    talks to a different host than complete_text does for the same provider.

    Raises LLMUnavailable when not configured, so callers degrade to structured-API-only knowledge.
    """
    if not is_configured():
        raise LLMUnavailable("no LLM key configured")
    provider = _text_provider()
    search_provider = (getattr(settings, "search_provider", "") or "anthropic").lower()
    if provider not in ("anthropic", "deepseek"):
        raise LLMUnavailable(f"web search is not wired for provider {provider}")
    if search_provider not in ("anthropic", "deepseek", ""):
        # SEARCH_PROVIDER still names a dedicated vendor (tavily/exa) that was never wired.
        raise LLMUnavailable(f"web search provider {search_provider} not wired yet")
    model = _text_model(None)
    try:
        client = _anthropic_client(provider)
        resp = await client.messages.create(
            model=model, max_tokens=max_tokens, system=system,
            messages=[{"role": "user", "content": prompt}],
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": max_uses}],
        )
        text_parts: list[str] = []
        sources: list[dict] = []
        seen: set[str] = set()
        searches = 0

        def add(url: Optional[str], title: Optional[str]) -> None:
            if url and url not in seen:
                seen.add(url)
                sources.append({"url": url, "title": title or ""})

        for block in resp.content:
            btype = getattr(block, "type", None)
            if btype == "text":
                text_parts.append(block.text)
                for c in (getattr(block, "citations", None) or []):
                    add(getattr(c, "url", None), getattr(c, "title", None))
            elif btype == "server_tool_use":
                searches += 1
            elif btype == "web_search_tool_result":
                # The page-level list. Present on both providers; the only list DeepSeek gives us.
                for item in (getattr(block, "content", None) or []):
                    add(getattr(item, "url", None), getattr(item, "title", None))
        return ("\n".join(text_parts).strip(), sources,
                _usage(provider, model, input_tokens=resp.usage.input_tokens,
                       output_tokens=resp.usage.output_tokens,
                       cache_read_tokens=int(getattr(resp.usage, "cache_read_input_tokens", 0) or 0),
                       # Count what happened, not what was allowed. `searches or max_uses` billed
                       # the CEILING whenever the counter stayed at zero — and on DeepSeek's
                       # compat endpoint server_tool_use blocks may never be emitted at all, so
                       # zero is the likely reading. Falling back to max_uses turns 'we could not
                       # tell' into a charge, in the direction that flatters nobody: every research
                       # row would carry the maximum fee whether or not a search ran. If we cannot
                       # count them we record none, and the tool-fee estimate is understated rather
                       # than invented — the token cost, which we DO measure, is unaffected.
                       web_searches=searches))
    except Exception as exc:  # noqa: BLE001
        raise _wrap(exc, f"{provider} web research")
