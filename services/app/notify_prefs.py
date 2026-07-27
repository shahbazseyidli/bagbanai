"""THE per-user notification matrix: 5 alert categories × 4 delivery channels (users.notify_prefs).

This module is the single place where a written notification's (source, type) becomes a CATEGORY
the farmer recognises. Every producer that writes a notification and every reader that delivers one
imports `category_for` from here. A second copy of the mapping would drift, and the moment it drifts
the settings screen starts lying — a switch labelled "Hava" would stop matching what actually
arrives, which is the one failure this feature cannot have.

MODEL — opt-out. NULL, {}, a missing category and a missing channel all mean ON, so a user who never
opens the settings screen behaves exactly as before and the column only stores what was switched
OFF. `compact()` therefore writes `{}` for the recommended state, and `PUT {"prefs": {}}` IS reset.

A consequence worth stating plainly: "push" arrived after the column already had rows, so it is ON
for every category for every existing user. That is correct rather than presumptuous — a push can
only reach a device that deliberately subscribed from the settings screen, so the device
subscription IS the consent, and these switches only decide which categories that consented device
is allowed to interrupt someone with.

REGISTRY — a producer whose source is not listed lands in DEFAULT_CATEGORY ("system"), a category
that is ON, so a new alert type is never silently swallowed. It will, however, be mis-labelled in
the settings screen until its source is added to _BY_SOURCE below — extend the registry when you add
a producer.

This module imports nothing from the app: it takes `conn` as a parameter, which keeps it free of
import cycles with routers/, rules/ and ai/, all of which depend on it.
"""
from __future__ import annotations

import json
from typing import Any

# Fixed order — the settings screen renders the rows in exactly this sequence.
CATEGORIES = ("vegetation", "weather", "pest", "advice", "system")
# "push" sits second, right after inapp: it is the other IMMEDIATE channel, and the settings grid
# reads left-to-right from "right now" to "later". digest/telegram keep their existing positions so
# no already-stored cell changes meaning.
CHANNELS = ("inapp", "push", "digest", "telegram")

# An unregistered producer lands in a category that is ON, so nothing is lost by not knowing it.
DEFAULT_CATEGORY = "system"

# Type outranks source, and it has to: ai_advice, data_ready and data_partial are all written with
# source='vegetation' (they are about the satellite pipeline, not about plant health), so mapping by
# source alone would file "your AI advice is ready" under the vegetation-alert switch.
_BY_TYPE = {
    "ai_advice": "advice",
    "data_ready": "system",
    "data_partial": "system",
}

_BY_SOURCE = {
    "weather": "weather",
    "vegetation": "vegetation",
    "pest": "pest",
}


def category_for(source: Any, type_: Any) -> str:
    """(source, type) → one of CATEGORIES. Never raises, never returns an unknown category."""
    t = str(type_ or "")
    if t in _BY_TYPE:
        return _BY_TYPE[t]
    # rules/engine writes pest alerts as type 'pest:<name>' — the prefix carries the category.
    if t.startswith("pest:"):
        return "pest"
    return _BY_SOURCE.get(str(source or ""), DEFAULT_CATEGORY)


def _decode(raw: Any) -> dict:
    """asyncpg hands jsonb back as `str` in this codebase (no codec registered) — decode defensively.
    Anything that is not an object degrades to {}, i.e. "everything on"."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return {}
    return raw if isinstance(raw, dict) else {}


def normalize(raw: Any) -> dict[str, dict[str, bool]]:
    """None | str | dict → the full 5×3 matrix. Anything unset is True (opt-out model)."""
    stored = _decode(raw)
    out: dict[str, dict[str, bool]] = {}
    for cat in CATEGORIES:
        cell = stored.get(cat)
        cell = cell if isinstance(cell, dict) else {}
        out[cat] = {ch: cell.get(ch) is not False for ch in CHANNELS}
    return out


def compact(prefs: dict[str, dict[str, bool]]) -> dict[str, dict[str, bool]]:
    """Keep only the False cells — `{}` is the recommended state and costs nothing to store."""
    out: dict[str, dict[str, bool]] = {}
    for cat in CATEGORIES:
        cell = (prefs or {}).get(cat) or {}
        off = {ch: False for ch in CHANNELS if cell.get(ch) is False}
        if off:
            out[cat] = off
    return out


def parse(body_prefs: Any) -> dict[str, dict[str, bool]]:
    """Strict validation of a client payload → the full matrix. Sparse bodies are fine (an absent
    cell means ON), but an unknown category/channel or a non-bool value is a bug on the client and
    must not be stored — the caller turns the ValueError into a 400."""
    if body_prefs is None:
        return normalize(None)
    if not isinstance(body_prefs, dict):
        raise ValueError("prefs must be an object")
    for cat, cell in body_prefs.items():
        if cat not in CATEGORIES:
            raise ValueError(f"unknown category: {cat}")
        if not isinstance(cell, dict):
            raise ValueError(f"category {cat} must be an object")
        for ch, val in cell.items():
            if ch not in CHANNELS:
                raise ValueError(f"unknown channel: {ch}")
            if not isinstance(val, bool):
                raise ValueError(f"{cat}.{ch} must be a boolean")
    return normalize(body_prefs)


def allows(raw_or_norm: Any, category: str, channel: str) -> bool:
    """Does this user still want `category` on `channel`? Accepts the raw column value or an
    already-normalized matrix, so callers never have to remember which one they hold."""
    return normalize(raw_or_norm).get(category, {}).get(channel, True)


def allows_notification(raw_or_norm: Any, source: Any, type_: Any, channel: str) -> bool:
    return allows(raw_or_norm, category_for(source, type_), channel)


async def load(conn, user_id: str) -> dict[str, dict[str, bool]]:
    """One user's full matrix. A missing row (deleted user mid-request) is "everything on"."""
    raw = await conn.fetchval("select notify_prefs from public.users where id=$1::uuid", user_id)
    return normalize(raw)


async def org_audience(conn, org_id: str) -> list[dict]:
    """Every member of an org with their matrix, in one query — `public.notifications` rows are
    org-scoped, so deciding whether to write one is a question about the whole membership."""
    # status='active' matches is_org_member (0007_rls.sql). Without it an invitee who never
    # accepted, or a removed colleague, still counts as "someone wants this category" — any_wants
    # would never return False and the suppression this query pays for would never fire.
    rows = await conn.fetch(
        """select u.id, u.notify_prefs from public.users u
           join public.organization_members m on m.user_id = u.id
           where m.org_id=$1::uuid and m.status = 'active'""", org_id)
    return [{"user_id": str(r["id"]), "prefs": normalize(r["notify_prefs"])} for r in rows]


def any_wants(audience: list[dict], category: str, channels: tuple[str, ...]) -> bool:
    """True when at least one member still consumes `category` through any of `channels`.

    An EMPTY audience returns True on purpose. If the membership query comes back empty — bad data,
    or a race while an org is being set up — the alert must still be written. Never lose an event
    because we could not find its readers.
    """
    if not audience:
        return True
    for member in audience:
        prefs = (member or {}).get("prefs")
        if any(allows(prefs, category, ch) for ch in channels):
            return True
    return False


async def org_any(conn, org_id: str, category: str, channels: tuple[str, ...]) -> bool:
    """audience + any_wants in one shot, for callers that only ask once per run."""
    return any_wants(await org_audience(conn, org_id), category, channels)
