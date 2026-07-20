"""Shared contract for structured-data source adapters (knowledge layer M2).

Each adapter is a pure async function that hits ONE external structured API and returns a
normalized SourceResult. Adapters NEVER raise — network/parse failures come back as
ok=False so the research orchestrator can degrade gracefully (spec P4: structured APIs
carry no hallucination risk; a missing block is better than a made-up one).

The `source` dict is the traceability record (spec P5) persisted alongside every block:
  {url, name, type, retrieved_at, confidence}
type ∈ structured_api | text_source | farmer_input.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

DEFAULT_TIMEOUT = 12.0
DEFAULT_RETRIES = 2


@dataclass
class SourceResult:
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    source: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def source_meta(url: str, name: str, stype: str = "structured_api",
                confidence: float = 0.9) -> dict[str, Any]:
    return {"url": url, "name": name, "type": stype,
            "retrieved_at": now_iso(), "confidence": confidence}


async def get_json(url: str, *, params: Optional[dict] = None, headers: Optional[dict] = None,
                   timeout: float = DEFAULT_TIMEOUT, retries: int = DEFAULT_RETRIES) -> Any:
    """GET → parsed JSON, with bounded retries + exponential backoff. Raises on final failure;
    callers wrap in try/except and return ok=False (adapters never propagate)."""
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.get(url, params=params, headers=headers)
                r.raise_for_status()
                return r.json()
        except Exception as exc:  # noqa: BLE001 — retry any transient error
            last = exc
            if attempt < retries:
                await asyncio.sleep(0.5 * (2 ** attempt))
    raise last if last else RuntimeError("get_json failed")
