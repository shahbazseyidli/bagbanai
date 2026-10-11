"""Shared in-process sliding-window rate limiter.

EXTRACTED FROM routers/auth.py, NOT REWRITTEN. The magic-link limiter was the only one in the
codebase and it carried a carefully-reasoned comment about exactly how far it can be trusted; that
reasoning is reproduced below because it applies verbatim to every caller, and a second hand-rolled
copy in routers/geo.py would have been the third place to get it subtly wrong.

WHAT THIS IS AND IS NOT:

It is a REAL limiter, not decoration, for exactly one verified reason: services/Dockerfile runs
`uvicorn app.main:app` with no --workers, so there is one process in one api container and this
dict sees 100% of the traffic. It resets on every deploy/restart — acceptable for a burst brake.

What it cannot do, stated plainly so nobody over-trusts it:
  * request.client.host alone is useless here — the peer is the docker bridge gateway, and
    uvicorn's proxy-header trust defaults to 127.0.0.1, which the gateway is not.
  * nginx sets X-Real-IP $remote_addr, but agradex.com is Cloudflare-PROXIED, so that address is
    a CF edge shared by many farmers. Hence CF-Connecting-IP first, and deliberately generous
    caps — throttling a whole CF edge would be worse than the abuse it prevents.
  * CF-Connecting-IP USED TO BE forgeable by anyone hitting the origin directly. Closed on
    2026-10-11: deploy/nginx-agradex.conf sets `set_real_ip_from <CF ranges>` +
    `real_ip_header CF-Connecting-IP`, and then `proxy_set_header CF-Connecting-IP $remote_addr`
    OVERWRITES whatever the caller sent with the address nginx resolved. Verified end to end
    against app.agradex.com — which is not CF-proxied, so it was the exposed host — by sending
    `CF-Connecting-IP: 203.0.113.99` with a bad password: public.auth_events recorded the real
    peer address instead. ⚠️ The guarantee lives in nginx, not here, and the live config had
    silently lost it once already during the Contabo migration. If this limiter ever starts
    counting Cloudflare edge addresses again, diff the server's vhost against deploy/.

Buckets are namespaced per limiter, so the landing map cannot spend the login allowance.
"""
from __future__ import annotations

import time

from fastapi import Request

# Bound the memory per namespace. Sorting a few thousand keys happens only at the cap.
_BUCKETS_MAX = 5000

_HITS: dict[str, dict[str, list[float]]] = {}


def client_ip(request: Request) -> str:
    """Best available client address. Read the honest limits in the module docstring first."""
    for header in ("cf-connecting-ip", "x-forwarded-for", "x-real-ip"):
        v = (request.headers.get(header) or "").split(",")[0].strip()
        if v:
            return v[:64]
    return (request.client.host if request.client else "") or "?"


def allow(namespace: str, ip: str, *, limit: int, window_sec: float) -> bool:
    """True if this address may make one more call in `namespace` inside the window."""
    now = time.monotonic()
    cutoff = now - window_sec
    ns = _HITS.setdefault(namespace, {})
    hits = [t for t in ns.get(ip, ()) if t > cutoff]
    if len(hits) >= limit:
        ns[ip] = hits            # keep the pruned list; never stored empty (len >= limit)
        return False
    hits.append(now)
    ns[ip] = hits
    if len(ns) > _BUCKETS_MAX:
        stale = sorted(ns, key=lambda k: (ns[k] or [0.0])[-1])
        for k in stale[: len(ns) - _BUCKETS_MAX]:
            ns.pop(k, None)
    return True
