"""Web Push (VAPID) — the fourth delivery channel, transport AND endpoints in one file.

THE NATURAL SHAPE IS TWO FILES, and this is not it: messaging/webpush.py for the transport plus
routers/push.py for the HTTP surface, exactly mirroring messaging/telegram.py + routers/messaging.py.
It is kept together for now because the transport has precisely one caller outside this module
(rules/engine._deliver_push). If a second producer appears — the advice notifier is the obvious
candidate — split it then, and the import in rules/engine.py is the only line that has to move.

DORMANT WITHOUT KEYS, exactly like Telegram: every function here is a no-op unless
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are set and pywebpush is importable. `configured()` is the one
gate, the settings card renders "not switched on yet" instead of a dead button, and nothing else in
the app behaves differently. The operator installs the keys in /opt/bagbanai/.env (docker-compose
already passes `env_file: ../.env` to the api service) and the channel comes alive on the next
restart with no code change.

NOTE ON CONFIG: the three values are read with os.getenv rather than through config.Settings, which
makes this the only env access in the backend that bypasses it. That is a phase artefact, not a
position — move them into Settings when config.py is next touched.
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from .. import notify_prefs
from ..db import connection
from ..deps import get_current_user_id

router = APIRouter(prefix="/api/push", tags=["push"])

# Six hours. A frost warning nobody's phone collected within six hours is not worth waking anyone
# for — by then the night it was about is over, and the alert would arrive as noise.
_TTL_SECONDS = 21600

# Push services are contacted over a blocking library (pywebpush is requests-based), so each send
# costs a worker thread. Bounded so a large org cannot park the whole default thread pool.
_MAX_CONCURRENT = 8

_MAX_ENDPOINT_LEN = 2000
_MAX_TITLE_LEN = 120
_MAX_BODY_LEN = 300

_sem: Optional[asyncio.Semaphore] = None
_module: Any = None
_module_loaded = False


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _private_key() -> str:
    return _env("VAPID_PRIVATE_KEY")


def _subject() -> str:
    # Must be a mailto: or https: URI — Mozilla's push service rejects anything else outright. The
    # fallback keeps a half-configured .env (keys present, subject forgotten) working instead of
    # failing every send with a 400 nobody would think to look for.
    return _env("VAPID_SUBJECT") or "mailto:info@agradex.com"


def _pywebpush() -> Any:
    """The pywebpush module, or None. Imported lazily and cached, so a deployment whose image does
    not carry the dependency degrades the feature to dormant instead of crashing FastAPI at import
    time — the same failure mode as a missing key, which is the one this feature is designed for."""
    global _module, _module_loaded
    if not _module_loaded:
        _module_loaded = True
        try:
            import pywebpush  # noqa: PLC0415 — deliberately deferred; see docstring
            _module = pywebpush
        except Exception:  # noqa: BLE001
            _module = None
    return _module


def configured() -> bool:
    return bool(_env("VAPID_PUBLIC_KEY") and _private_key() and _pywebpush() is not None)


def public_key() -> str:
    return _env("VAPID_PUBLIC_KEY")


def _gate() -> asyncio.Semaphore:
    global _sem
    if _sem is None:
        _sem = asyncio.Semaphore(_MAX_CONCURRENT)
    return _sem


def _payload(title: str, body: str, url: Optional[str], tag: str) -> dict:
    """What app/public/sw.js parses: {title, body, url, tag}.

    `title` and `body` are the notification's ALREADY-STORED prose — the very strings
    public.notifications holds and the bell renders. Nothing is composed or translated here: the
    push and the bell entry must read identically, or the farmer meets two versions of one event and
    has to work out whether they are the same thing.

    `tag` is the category, so a repeat within one category replaces the previous banner on the
    device instead of stacking a third frost warning on top of two.
    """
    return {"title": title, "body": body, "url": url or "/notifications", "tag": tag}


async def _send_one(endpoint: str, p256dh: str, auth_key: str, payload: dict) -> str:
    """One push. Returns "sent" | "gone" | "failed". NEVER raises — delivery is best-effort."""
    mod = _pywebpush()
    if mod is None:
        return "failed"
    # Built FRESH PER CALL, and it has to be: pywebpush MUTATES the claims dict it is handed,
    # writing "exp" and "aud" into it. A module-level constant would freeze the first "exp" it ever
    # computed, and roughly a day later every push would start failing with a 401 that appears
    # nowhere in our logs — the single easiest way to break this feature.
    claims = {"sub": _subject()}
    subscription = {"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth_key}}
    try:
        async with _gate():
            await asyncio.to_thread(
                mod.webpush,
                subscription_info=subscription,
                data=json.dumps(payload),
                vapid_private_key=_private_key(),
                vapid_claims=claims,
                ttl=_TTL_SECONDS,
            )
        return "sent"
    except Exception as exc:  # noqa: BLE001 — WebPushException and everything else land here alike
        # WebPushException carries the push service's reply, but `.response` may be None (a DNS or
        # connection failure never got one), so both hops are guarded.
        status = getattr(getattr(exc, "response", None), "status_code", None)
        # 404/410 is the push service declaring this subscription dead, not slow. _fanout deletes it.
        return "gone" if status in (404, 410) else "failed"


async def _fanout(conn, rows, payload: dict) -> int:
    """Send to every row, then reconcile the table with what the push services said. Returns sent."""
    targets = [(r["endpoint"], r["p256dh"], r["auth"]) for r in rows]
    if not targets:
        return 0
    results = await asyncio.gather(
        *(_send_one(e, p, a, payload) for e, p, a in targets), return_exceptions=True)

    gone: list[str] = []
    sent: list[str] = []
    failed: list[str] = []
    for (endpoint, _p, _a), res in zip(targets, results):
        status = res if isinstance(res, str) else "failed"
        if status == "gone":
            gone.append(endpoint)
        elif status == "sent":
            sent.append(endpoint)
        else:
            failed.append(endpoint)

    if gone:
        # Deleted, not flagged: the subscription cannot be revived, and keeping the row would make
        # "devices switched on" overcount for as long as the user never looks.
        await conn.execute(
            "delete from public.push_subscriptions where endpoint = any($1::text[])", gone)
    if sent:
        await conn.execute(
            """update public.push_subscriptions set last_used_at=now(), failed_at=null
               where endpoint = any($1::text[])""", sent)
    if failed:
        await conn.execute(
            "update public.push_subscriptions set failed_at=now() where endpoint = any($1::text[])",
            failed)
    return len(sent)


async def deliver_org(conn, org_id: str, category: str, title: str, body: str,
                      url: Optional[str] = None) -> int:
    """Push one dispatched alert to every subscribed device in an org. Never raises.

    Shaped after rules/engine._deliver_telegram: a push has exactly one recipient device belonging to
    exactly one person, so unlike the org-scoped notification row, the per-user opt-out applies
    cleanly and is applied HERE, on the push path itself — any future caller inherits it instead of
    having to remember the check, the same reasoning as telegram.send_alert.
    """
    if not configured():
        return 0
    try:
        rows = await conn.fetch(
            """select s.endpoint, s.p256dh, s.auth, u.notify_prefs
                 from public.push_subscriptions s
                 join public.organization_members m on m.user_id = s.user_id
                 join public.users u on u.id = s.user_id
                where m.org_id=$1::uuid and m.status='active' and u.deleted_at is null
                limit 200""", org_id)
        # status='active' for the reason org_audience gives: an invitee who never accepted, or a
        # colleague who was removed, must not still be pushed. `u.deleted_at is null` is
        # belt-and-braces — 0052 anonymises a closed account rather than deleting it, so the FK
        # cascade never fires, but closure also drops every membership, so the join already excludes
        # them. The predicate costs nothing and survives a future change to that closure path.
        wanted = [r for r in rows if notify_prefs.allows(r["notify_prefs"], category, "push")]
        if not wanted:
            return 0
        return await _fanout(conn, wanted, _payload(title, body, url, category))
    except Exception:  # noqa: BLE001 — never let delivery break dispatch
        return 0


async def deliver_user(conn, user_id: str, title: str, body: str,
                       url: Optional[str] = None) -> int:
    """Push to one person's own devices. Used only by the test endpoint, which is why it does NOT
    consult notify_prefs: the categories decide what may interrupt someone unasked, and this is the
    opposite — a message they just tapped a button to receive."""
    if not configured():
        return 0
    try:
        rows = await conn.fetch(
            """select endpoint, p256dh, auth from public.push_subscriptions
               where user_id=$1::uuid limit 20""", user_id)
        if not rows:
            return 0
        return await _fanout(conn, rows, _payload(title, body, url, "test"))
    except Exception:  # noqa: BLE001
        return 0


async def _device_count(conn, user_id: str) -> int:
    n = await conn.fetchval(
        "select count(*) from public.push_subscriptions where user_id=$1::uuid", user_id)
    return int(n or 0)


@router.get("/vapid-public-key")
async def vapid_public_key():
    """UNAUTHENTICATED on purpose. The application server key is a public constant — it is handed to
    every browser that subscribes — and the service worker's `pushsubscriptionchange` handler has to
    fetch it in contexts where no session cookie is attached. Serving it from the API rather than a
    NEXT_PUBLIC_ build argument also means rotating the key pair never requires rebuilding the web
    image."""
    return {"configured": configured(), "key": public_key() or None}


@router.get("/status")
async def push_status(user_id: str = Depends(get_current_user_id)):
    """Whether the channel is live at all, and how many of this account's devices are subscribed.
    The settings card reports `configured` up to NotifyMatrix, which is how the matrix learns that
    its push column is dormant."""
    async with connection(user_id) as conn:
        devices = await _device_count(conn, user_id)
    return {"configured": configured(), "devices": devices}


@router.post("/subscribe")
async def push_subscribe(body: dict, user_id: str = Depends(get_current_user_id)):
    b = body or {}
    endpoint = str(b.get("endpoint") or "").strip()
    keys = b.get("keys") if isinstance(b.get("keys"), dict) else {}
    p256dh = str((keys or {}).get("p256dh") or "").strip()
    auth_key = str((keys or {}).get("auth") or "").strip()
    user_agent = str(b.get("user_agent") or "")[:400] or None
    if not endpoint or not p256dh or not auth_key or len(endpoint) > _MAX_ENDPOINT_LEN:
        raise HTTPException(status_code=400, detail="invalid_subscription")

    async with connection(user_id) as conn:
        # Upsert on the endpoint, not on (user_id, endpoint): re-subscribing on a device that is
        # already registered must reuse its row, and a device that changed hands must move to the
        # account that just subscribed rather than push for both.
        await conn.execute(
            """insert into public.push_subscriptions
                 (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
               values ($1::uuid, $2, $3, $4, $5, now())
               on conflict (endpoint) do update set
                 user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth,
                 user_agent=excluded.user_agent, failed_at=null, last_used_at=now()""",
            user_id, endpoint, p256dh, auth_key, user_agent)
        devices = await _device_count(conn, user_id)
    return {"ok": True, "devices": devices}


@router.post("/unsubscribe")
async def push_unsubscribe(body: dict, user_id: str = Depends(get_current_user_id)):
    """POST rather than DELETE because api.del() in lib/api.ts sends no body, and the endpoint is
    far too long to put in a query string."""
    endpoint = str((body or {}).get("endpoint") or "").strip()
    if not endpoint:
        raise HTTPException(status_code=400, detail="invalid_subscription")
    async with connection(user_id) as conn:
        await conn.execute(
            "delete from public.push_subscriptions where endpoint=$1 and user_id=$2::uuid",
            endpoint, user_id)
        devices = await _device_count(conn, user_id)
    return {"ok": True, "devices": devices}


@router.post("/test")
async def push_test(body: dict, user_id: str = Depends(get_current_user_id)):
    """Send the caller a test push on their own devices.

    THE CLIENT SUPPLIES THE PROSE (i18n keys push.testTitle / push.testBody). A test notification is
    user-facing text, the backend does not author user-facing text, and this is the one notification
    the backend physically sends without a stored row to quote — so the strings come from the
    reader's own locale, resolved by t() in PushSetting. It can only ever reach the caller's own
    devices, which is what makes accepting arbitrary text here harmless.
    """
    if not configured():
        raise HTTPException(status_code=503, detail="push_not_configured")
    b = body or {}
    title = str(b.get("title") or "").strip()[:_MAX_TITLE_LEN] or "Agradex"
    text = str(b.get("body") or "").strip()[:_MAX_BODY_LEN]
    async with connection(user_id) as conn:
        sent = await deliver_user(conn, user_id, title, text, url="/notifications")
    return {"ok": sent > 0, "sent": sent}
