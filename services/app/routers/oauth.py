"""Sign in with Google (migration 0062).

SERVER-SIDE AUTHORIZATION CODE FLOW, and deliberately not the Google Identity Services button.
The JS widget would put a Google script tag on our login and signup pages — a third-party script on
the two pages where a farmer types their identity, on a site whose privacy policy currently earns
the sentence "there is no Google Analytics, no Google Tag Manager" in eight languages. A plain link
to /api/auth/google/start keeps that sentence true: nothing Google-owned is ever loaded by the
browser on our origin.

FOUR HOPS: the browser asks us to start → we 302 it to Google → Google 302s it back to /callback
with a code → we swap the code for a token over our own TLS connection, using the client secret,
and issue the same session cookie every other way in issues. The browser never holds a Google
token; we never hold a Google password.

WHY USERINFO AND NOT THE id_token. The token response carries an id_token, a JWT we could decode —
and Google's own guidance says a token received directly from the token endpoint over HTTPS need
not have its signature verified. That is true and it is still a footgun: "decode a JWT but skip the
signature" is one careless edit away from being wrong, and the mistake is invisible. One extra call
to the userinfo endpoint with the access token is authoritative by construction, needs no crypto,
and cannot rot.

DORMANT WITHOUT KEYS. No client id/secret → is_configured() is false, /providers reports google:
false so the button never renders, and both routes answer 404. That is the same graceful-degradation
contract the LLM key, the Telegram token and the EPPO token already follow.
"""
import json
import secrets
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from ..config import settings
from ..db import connection
from ..security import create_token
from .auth import (NO_PASSWORD, SUPPORTED_LOCALES, _cookie_secure, _send_welcome,
                   _set_cookie)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# openid + email + profile. All three are NON-SENSITIVE, which is what keeps this app out of
# Google's security-review queue — do not add a scope here without knowing what it costs.
_SCOPES = "openid email profile"

# The state cookie only has to survive one redirect through Google and back.
_STATE_COOKIE = "bagban_oauth_state"
_STATE_TTL = 600  # 10 minutes


def is_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _require_configured() -> None:
    if not is_configured():
        # 404, not 503: with no credentials this endpoint does not exist as far as the world is
        # concerned, and saying "configured but unavailable" would be a fact about our deployment
        # that an anonymous caller has no business learning.
        raise HTTPException(status_code=404, detail="not_found")


def _redirect_uri() -> str:
    """Must match the Authorized redirect URI in the Google console BYTE FOR BYTE.

    Built from the panel host rather than the request, so a request arriving through some other
    hostname (a preview domain, an IP, a forged Host header) cannot redirect Google's callback
    somewhere we did not register.
    """
    host = settings.next_public_panel_host or (settings.cookie_domain or "").lstrip(".") or "agradex.com"
    return f"https://{host}/api/auth/google/callback"


def _safe_next(value: Optional[str]) -> str:
    """Only a path on our own site. An open redirect on a login route is a phishing gift: the
    victim really is signing in to us, and really does end up wherever the attacker chose."""
    v = (value or "").strip()
    if not v.startswith("/") or v.startswith("//") or "\\" in v:
        return "/"
    return v


def _app_origin() -> str:
    host = settings.next_public_panel_host or (settings.cookie_domain or "").lstrip(".") or "agradex.com"
    return f"https://{host}"


def _fail(locale: str, code: str) -> RedirectResponse:
    """Back to the login page with a machine-readable reason, never a blank 500 page.

    The farmer is mid-sign-in in a browser tab; an API error body would be a dead end. The login
    page reads ?err= and shows a sentence in their language.
    """
    prefix = f"/{locale}" if locale in SUPPORTED_LOCALES and locale != "az" else ""
    resp = RedirectResponse(f"{_app_origin()}{prefix}/login?err={code}", status_code=302)
    resp.delete_cookie(_STATE_COOKIE, path="/")
    return resp


@router.get("/providers")
async def providers():
    """Which third-party sign-in methods this deployment actually has keys for.

    Public and unauthenticated by necessity — the login page has to know before anyone signs in.
    It leaks nothing: whether a Google button is on the page is visible by looking at the page.
    """
    return {"google": is_configured()}


@router.get("/google/start")
async def google_start(next: Optional[str] = Query(None), locale: Optional[str] = Query(None)):
    """Send the browser to Google's consent screen."""
    _require_configured()
    loc = (locale or "").strip().lower()
    if loc not in SUPPORTED_LOCALES:
        loc = "az"

    state = secrets.token_urlsafe(24)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": _SCOPES,
        "state": state,
        # Ask Google to show its account chooser rather than silently reusing whichever account the
        # browser happens to be signed into — a shared family phone is the normal case here.
        "prompt": "select_account",
        # Google renders its own screen in this language when it knows it.
        "hl": loc,
    }
    resp = RedirectResponse(f"{_AUTH_URL}?{urlencode(params)}", status_code=302)
    # The state lives in an httpOnly cookie, not in a server-side store: it has to be readable only
    # by us, only for this browser, and only for a few minutes — which is exactly a cookie. SameSite
    # must be "lax", not "strict": Google's callback is a cross-site top-level navigation, and
    # "strict" would withhold the cookie precisely when we need to check it.
    resp.set_cookie(
        key=_STATE_COOKIE,
        value=json.dumps({"s": state, "n": _safe_next(next), "l": loc}),
        httponly=True, samesite="lax", secure=_cookie_secure(), max_age=_STATE_TTL, path="/",
        domain=settings.cookie_domain or None,
    )
    return resp


@router.get("/google/callback")
async def google_callback(request: Request,
                          code: Optional[str] = Query(None),
                          state: Optional[str] = Query(None),
                          error: Optional[str] = Query(None)):
    """Google sends the browser back here. Swap the code for an identity and open a session."""
    _require_configured()

    raw = request.cookies.get(_STATE_COOKIE)
    try:
        saved = json.loads(raw) if raw else {}
    except (ValueError, TypeError):
        saved = {}
    loc = saved.get("l") if saved.get("l") in SUPPORTED_LOCALES else "az"
    nxt = _safe_next(saved.get("n"))

    # The farmer pressed "cancel" on Google's screen, or Google refused. Not an error worth a stack
    # trace — put them back where they started.
    if error:
        return _fail(loc, "cancelled")
    # CSRF: the state we minted must come back, and it must come back in the same browser that has
    # the cookie. secrets.compare_digest, because a timing-variable == on a token is a bad habit
    # even where it is probably unexploitable.
    if not code or not state or not saved.get("s") or not secrets.compare_digest(str(state), str(saved["s"])):
        return _fail(loc, "state")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            tok = await client.post(_TOKEN_URL, data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": _redirect_uri(),
                "grant_type": "authorization_code",
            })
            if tok.status_code != 200:
                return _fail(loc, "exchange")
            access_token = (tok.json() or {}).get("access_token")
            if not access_token:
                return _fail(loc, "exchange")
            info = await client.get(_USERINFO_URL,
                                    headers={"Authorization": f"Bearer {access_token}"})
            if info.status_code != 200:
                return _fail(loc, "exchange")
            profile = info.json() or {}
    except httpx.HTTPError:
        return _fail(loc, "network")

    sub = str(profile.get("sub") or "").strip()
    email = str(profile.get("email") or "").strip().lower()
    # An unverified Google address proves nothing, and we are about to treat a matching address as
    # proof of ownership of an existing account. Refuse rather than link on it.
    if not sub or not email or profile.get("email_verified") is not True:
        return _fail(loc, "unverified")
    full_name = (profile.get("name") or "").strip() or None

    async with connection() as conn:
        # The subject first: it is stable across an address change, which the email is not.
        created = False
        verified_now = False
        row = await conn.fetchrow(
            "select id, is_active from public.users where google_sub=$1 and deleted_at is null", sub)
        if not row:
            # Then the address. Safe to treat as proof because Google told us it is verified, and
            # 0059 made lower(email) unique so this can match at most one account.
            row = await conn.fetchrow(
                "select id, is_active, email_verified from public.users "
                "where lower(email)=$1 and deleted_at is null", email)
            if row:
                # Link. Also clears any pending OTP: arriving here proves the mailbox as thoroughly
                # as the code would have, exactly like consuming a magic link does.
                #
                # Read BEFORE the write: RETURNING would report the NEW value, so
                # `returning (email_verified is not true)` after `set email_verified=true` is
                # always false. The old value is the one that says whether this arrival is the
                # account's FIRST verification — the only case where a welcome is honest.
                verified_now = not bool(row["email_verified"])
                await conn.execute(
                    """update public.users
                          set google_sub=$2, email_verified=true, otp_code=null,
                              otp_expires_at=null, otp_attempts=0
                        where id=$1::uuid""", row["id"], sub)
        if not row:
            # New account. NO_PASSWORD, not a random one: there is no password to have, and a real
            # hash would suggest a credential the farmer could be asked for.
            row = await conn.fetchrow(
                """insert into public.users (email, password_hash, full_name, locale, role,
                                             email_verified, google_sub)
                   values ($1,$2,$3,$4,'farmer',true,$5)
                   returning id, is_active""",
                email, NO_PASSWORD, full_name, loc, sub)
            created = True
        uid = str(row["id"])
        if not row["is_active"]:
            return _fail(loc, "disabled")
        # ONLY on a real signup. The email_sends ledger makes this once-per-account-ever, but
        # "ever" is the wrong unit: welcome is a SIGNUP email, and an account that has been in use
        # since July does not become new because its owner pressed the Google button today. That is
        # exactly what happened live — an account created 21 July received "Welcome to Agradex" on
        # 2 August, its first Google sign-in, because this call was unconditional.
        if created or verified_now:
            await _send_welcome(conn, uid, full_name)

    resp = RedirectResponse(f"{_app_origin()}{nxt}", status_code=302)
    _set_cookie(resp, create_token(uid))
    resp.delete_cookie(_STATE_COOKIE, path="/", domain=settings.cookie_domain or None)
    return resp
