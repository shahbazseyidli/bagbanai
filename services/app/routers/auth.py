"""Auth endpoints: magic link / signup / login / logout / me + OTP email verification (U3).

Own JWT in an httpOnly cookie. THREE ways in, and all three end at the same cookie:
  * magic link (PRIMARY) — type an email, get a link, tap it. Signup and login are the same act.
  * password — every account that has a hash keeps logging in exactly as before. Nothing about the
    bcrypt path changed, and nothing here can strand an existing user.
  * OTP — the six-digit code the signup route still issues when email is configured.

Email verification degrades gracefully: OTP is only issued/enforced when an email transport
(Resend/SMTP) is configured — otherwise signups auto-verify so production signup is never blocked
by missing email config."""
import hashlib
import json
import secrets
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from .. import notify_prefs, ratelimit
from ..ai import notify
from ..config import settings
from ..db import connection
from ..deps import get_current_user_id
from ..schemas import (LoginIn, MagicLinkIn, MagicLoginIn, ResendOtpIn, SignupIn, UserOut,
                       UserRole, VerifyOtpIn)
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
_MAX_OTP_ATTEMPTS = 6
MIN_PASSWORD_LEN = 8

# users.password_hash is NOT NULL (0002) and a magic-link account has no password at all. '!' is not
# a value bcrypt can ever produce, so bcrypt.checkpw raises ValueError on it and verify_password
# returns False for EVERY input — the account simply cannot be entered with a password, including by
# a future collision. The account-close path (0052) writes the same sentinel for the same reason.
NO_PASSWORD = "!"


def _cookie_secure() -> bool:
    """Whether the session cookie may only travel over TLS.

    NOT derived from next_public_app_url, which is what this used to read. In production that
    variable holds the INTERNAL container URL — `http://localhost:3000` on the live box, verified —
    so the check evaluated to False and the session JWT shipped WITHOUT Secure. A cookie without it
    is attached to plain-http requests too, and the origin's :80 server block still does not force
    a redirect (a leftover from the Cloudflare Flexible era), so the token was one `http://` link
    away from crossing the browser→edge hop in cleartext.

    cookie_domain is the honest signal: empty in development, ".agradex.com" in production, and set
    precisely because the deployment is a real multi-host HTTPS site. The panel host is accepted for
    the same reason, and the old https check is kept as a third path so a plain single-host TLS
    deployment still works.
    """
    return bool(settings.cookie_domain or settings.next_public_panel_host) \
        or settings.next_public_app_url.startswith("https")


def _set_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        key=settings.cookie_name, value=token, httponly=True, samesite="lax",
        secure=_cookie_secure(),
        max_age=COOKIE_MAX_AGE, path="/",
        domain=settings.cookie_domain or None,
    )


# Localized OTP email (subject, body). Body has {code} and {ttl}. Sent from the locale's persona
# (notify.SENDERS). Brand "Agradex" kept in every language.
_OTP_EMAIL: dict[str, tuple[str, str]] = {
    "az": ("Agradex — təsdiq kodu",
           "Agradex hesabınızı təsdiqləmək üçün kod: {code}\n\n"
           "Kod {ttl} dəqiqə ərzində etibarlıdır. Bu sorğunu siz etməmisinizsə, məktubu nəzərə almayın."),
    "en": ("Agradex — verification code",
           "Your code to verify your Agradex account: {code}\n\n"
           "The code is valid for {ttl} minutes. If you didn't request this, please ignore this email."),
    "tr": ("Agradex — doğrulama kodu",
           "Agradex hesabınızı doğrulamak için kod: {code}\n\n"
           "Kod {ttl} dakika geçerlidir. Bu isteği siz yapmadıysanız, bu e-postayı dikkate almayın."),
    "de": ("Agradex — Bestätigungscode",
           "Ihr Code zur Bestätigung Ihres Agradex-Kontos: {code}\n\n"
           "Der Code ist {ttl} Minuten gültig. Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail."),
    "hu": ("Agradex — megerősítő kód",
           "Kód a Agradex-fiókja megerősítéséhez: {code}\n\n"
           "A kód {ttl} percig érvényes. Ha nem Ön kérte, hagyja figyelmen kívül ezt az e-mailt."),
    "it": ("Agradex — codice di verifica",
           "Il tuo codice per verificare l'account Agradex: {code}\n\n"
           "Il codice è valido per {ttl} minuti. Se non l'hai richiesto, ignora questa email."),
    "pl": ("Agradex — kod weryfikacyjny",
           "Twój kod weryfikacji konta Agradex: {code}\n\n"
           "Kod jest ważny {ttl} minut. Jeśli to nie Ty, zignoruj tę wiadomość."),
    # "мин." (not "минут") keeps the line grammatical for every {ttl} value.
    "ru": ("Agradex — код подтверждения",
           "Код для подтверждения вашего аккаунта Agradex: {code}\n\n"
           "Код действителен {ttl} мин. Если вы не запрашивали его, просто проигнорируйте это письмо."),
}


async def _issue_otp(conn, user_id: str, email: str, locale: str | None = None) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_min)
    await conn.execute(
        """update public.users set otp_code=$1, otp_expires_at=$2, otp_attempts=0, email_verified=false
           where id=$3::uuid""", code, exp, user_id)
    subject, tmpl = _OTP_EMAIL.get((locale or "")[:2].lower(), _OTP_EMAIL["az"])
    await notify.send_email(
        email, subject, tmpl.format(code=code, ttl=settings.otp_ttl_min), locale=locale)


# E13 — the landing quiz is anonymous input, so it is whitelisted before it touches the database.
_ONB_STR = ("crop", "crop_other", "country", "region", "challenge", "completed_at")

# A traced boundary is a handful of vertices. This cap is not a UX limit — the landing simplifies to
# ~24 points and a freehand lasso to a few hundred — it is the bound that stops an anonymous caller
# from parking a megabyte of float in users.onboarding.
_DRAFT_MAX_RINGS = 1
_DRAFT_MAX_POINTS = 2000


def _clean_draft_field(raw) -> dict | None:
    """Validate the polygon a signed-out visitor traced on the landing map.

    This is UNAUTHENTICATED input that gets stored, so it is parsed rather than trusted: shape,
    ring count, vertex count and every coordinate's range are checked, and anything else in the
    object is dropped. A malformed draft is discarded silently — losing it costs the visitor one
    re-trace, while accepting it would put visitor-controlled JSON into a jsonb column.
    """
    if not isinstance(raw, dict):
        return None
    poly = raw.get("polygon")
    if not isinstance(poly, dict) or poly.get("type") != "Polygon":
        return None
    rings = poly.get("coordinates")
    if not isinstance(rings, list) or not 1 <= len(rings) <= _DRAFT_MAX_RINGS:
        return None
    clean_rings = []
    for ring in rings:
        if not isinstance(ring, list) or not 4 <= len(ring) <= _DRAFT_MAX_POINTS:
            return None
        pts = []
        for pt in ring:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                return None
            try:
                lon, lat = float(pt[0]), float(pt[1])
            except (TypeError, ValueError):
                return None
            if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
                return None
            pts.append([lon, lat])
        clean_rings.append(pts)
    out: dict = {"polygon": {"type": "Polygon", "coordinates": clean_rings}}
    try:
        area = float(raw.get("area_ha"))
    except (TypeError, ValueError):
        area = None
    if area is not None and 0.0 < area < 1_000_000.0:
        out["area_ha"] = area
    return out


def _clean_onboarding(raw) -> dict | None:
    """Keep only the known keys, as short strings — never store an arbitrary visitor-supplied blob."""
    if not isinstance(raw, dict):
        return None
    out: dict = {}
    for k in _ONB_STR:
        v = raw.get(k)
        if isinstance(v, str) and v.strip():
            out[k] = v.strip()[:80]
    needs = raw.get("needs")
    if isinstance(needs, list):
        out["needs"] = [n.strip()[:40] for n in needs if isinstance(n, str) and n.strip()][:12]
    draft = _clean_draft_field(raw.get("draft_field"))
    if draft:
        out["draft_field"] = draft
    return out or None


async def _apply_onboarding_to_fields(conn, user_id: str, onb: dict) -> int:
    """Write the quiz's crop/region onto the user's fields that still have none (the "existing
    fields" half of the request; new fields are prefilled client-side from the same profile).
    Never overwrites a value the farmer already set."""
    crop = (onb or {}).get("crop") or ""
    region = (onb or {}).get("region") or ""
    if not crop or crop == "other":
        crop = ""
    if not crop and not region:
        return 0
    # crop_type is NOT NULL, so a field with no metadata row can only be seeded when we have a crop.
    n = 0
    if crop:
        res = await conn.execute(
            """insert into public.field_metadata (field_id, crop_type, region)
               select fl.id, $2, nullif($3,'')
                 from public.fields fl
                 join public.farms f on f.id = fl.farm_id
                 join public.organization_members m on m.org_id = f.org_id
                where m.user_id = $1::uuid and fl.deleted_at is null
               on conflict (field_id) do update set
                 crop_type = case when nullif(trim(public.field_metadata.crop_type),'') is null
                                  then excluded.crop_type else public.field_metadata.crop_type end,
                 region    = coalesce(nullif(trim(public.field_metadata.region),''), excluded.region),
                 updated_at = now()""",
            user_id, crop, region)
        n += int(res.split()[-1]) if res and res.split()[-1].isdigit() else 0
    elif region:
        res = await conn.execute(
            """update public.field_metadata fm set region=$2, updated_at=now()
                 from public.fields fl
                 join public.farms f on f.id = fl.farm_id
                 join public.organization_members m on m.org_id = f.org_id
                where fm.field_id = fl.id and m.user_id = $1::uuid
                  and fl.deleted_at is null
                  and nullif(trim(coalesce(fm.region,'')),'') is null""", user_id, region)
        n += int(res.split()[-1]) if res and res.split()[-1].isdigit() else 0
    return n


async def _send_welcome(conn, user_id: str, full_name) -> None:
    """Send the role-appropriate welcome email once (idempotent via email_sends). Best-effort."""
    name = (full_name or "").strip().split(" ")[0] if full_name else ""
    try:
        from ..ai.emails import send_template
        await send_template(conn, user_id, "welcome", {"name": name})
    except Exception:  # noqa: BLE001 — welcome email must never block signup/verify
        pass


@router.post("/signup")
async def signup(body: SignupIn, response: Response):
    """Create the account from an EMAIL ALONE. If email is configured, issue an OTP and return
    {needs_verification:true}; otherwise auto-verify and log the user in immediately.

    Everything except the address is now optional (see SignupIn). What that costs, and why it is
    still right:
      * no password → the sentinel hash goes in and the account is reachable by magic link, or by
        the OTP this very call issues (which signs the person in). It is not a dead end.
      * no country → _effective_area_unit() below skips its `if c:` branch and falls through to the
        interface language: tr → dönüm, everything else → ha. That is the documented degradation,
        not a wrong unit, and defaultAreaUnit() in app/src/lib/units.ts already behaves the same.
      * no full_name → _send_welcome resolves the greeting name to "" and the copy handles it.
    Anything still worth knowing is asked later, in /account, where it is optional."""
    onb = _clean_onboarding(body.onboarding)
    # Validated here rather than as a Field(min_length=...) on an Optional[str]: this raises the
    # detail code the client already maps, instead of a 422 constraint array nothing renders.
    if body.password is not None and len(body.password) < MIN_PASSWORD_LEN:
        raise HTTPException(status_code=400, detail="password_too_short")
    password_hash = hash_password(body.password) if body.password else NO_PASSWORD
    # NORMALISED, like every other write path. This route stored body.email VERBATIM while
    # /magic-link stored it lowercased, so two concurrent requests could write two different
    # strings for one mailbox and `on conflict (email)` would not fire — two accounts, one farmer,
    # and their fields in whichever one they are not looking at. 0059 now makes that impossible at
    # the database level; this makes the two paths agree at the application level as well.
    email = str(body.email).strip().lower()
    async with connection() as conn:
        exists = await conn.fetchval("select 1 from public.users where lower(email)=lower($1)", email)
        if exists:
            raise HTTPException(status_code=409, detail="email_taken")
        row = await conn.fetchrow(
            """insert into public.users
                 (email, password_hash, full_name, locale, role, country, region, name_public,
                  onboarding)
               values ($1,$2,$3,$4,$5::user_role,$6,$7,$8,$9::jsonb)
               returning id, email, full_name, locale, role, country, region""",
            email, password_hash, body.full_name, body.locale,
            body.role.value, body.country, body.region, body.name_public,
            json.dumps(onb) if onb else None)
        uid = str(row["id"])
        if notify.email_configured():
            await _issue_otp(conn, uid, row["email"], row["locale"])
            return {"needs_verification": True, "email": row["email"]}
        # No email transport → auto-verified; still send the welcome (no-op if email is off).
        await _send_welcome(conn, uid, row["full_name"])
    _set_cookie(response, create_token(uid))
    return {"needs_verification": False, "user": UserOut(
        id=uid, email=row["email"], full_name=row["full_name"], locale=row["locale"],
        role=row["role"], country=row["country"], region=row["region"])}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpIn, response: Response):
    """Confirm the emailed code → mark verified + log in. Reads and each write run in their own
    committed transaction so a failed-attempt counter persists (raising inside a tx would roll it
    back)."""
    async with connection() as conn:
        row = await conn.fetchrow(
            """select id, email, full_name, locale, is_admin, email_verified,
                      otp_code, otp_expires_at, otp_attempts, role, country, region
               from public.users where lower(email)=lower($1)""", body.email)
    if not row:
        raise HTTPException(status_code=404, detail="user_not_found")
    if not row["email_verified"]:
        if not row["otp_code"] or not row["otp_expires_at"]:
            raise HTTPException(status_code=400, detail="no_otp")
        if row["otp_attempts"] >= _MAX_OTP_ATTEMPTS:
            raise HTTPException(status_code=429, detail="too_many_attempts")
        if row["otp_expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="otp_expired")
        if body.code.strip() != row["otp_code"]:
            async with connection() as conn:
                await conn.execute(
                    "update public.users set otp_attempts=otp_attempts+1 where id=$1::uuid", row["id"])
            raise HTTPException(status_code=400, detail="invalid_otp")
        async with connection() as conn:
            await conn.execute(
                """update public.users set email_verified=true, otp_code=null,
                          otp_expires_at=null, otp_attempts=0 where id=$1::uuid""", row["id"])
            await _send_welcome(conn, str(row["id"]), row["full_name"])
    _set_cookie(response, create_token(str(row["id"])))
    return {"ok": True, "user": UserOut(id=str(row["id"]), email=row["email"],
            full_name=row["full_name"], locale=row["locale"], is_admin=row["is_admin"],
            role=row["role"], country=row["country"], region=row["region"])}


@router.post("/resend-otp")
async def resend_otp(body: ResendOtpIn):
    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, email_verified, locale from public.users where lower(email)=lower($1)", body.email)
        if not row:
            raise HTTPException(status_code=404, detail="user_not_found")
        if row["email_verified"]:
            return {"ok": True, "already_verified": True}
        await _issue_otp(conn, str(row["id"]), row["email"], row["locale"])
    return {"ok": True}


@router.post("/login", response_model=UserOut)
async def login(body: LoginIn, response: Response):
    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, password_hash, full_name, locale, is_admin, is_active, "
            "email_verified, role, country, region from public.users "
            "where lower(email)=lower($1)", body.email)
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    if not row["is_active"]:
        raise HTTPException(status_code=403, detail="account_disabled")
    if not row["email_verified"] and notify.email_configured():
        raise HTTPException(status_code=403, detail="email_not_verified")
    _set_cookie(response, create_token(str(row["id"])))
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"],
                   role=row["role"], country=row["country"], region=row["region"])


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.cookie_name, path="/", domain=settings.cookie_domain or None)
    return {"ok": True}


# ---------------------------------------------------------------------------
# MAGIC LINK — the primary way in. Type an email, get a link, tap it, you are signed in.
#
# One route is both signup and login on purpose: a farmer should not have to know whether they
# already have an account, and the response is byte-identical either way so an unauthenticated
# caller cannot use this to discover who is registered.
#
# The token: secrets.token_urlsafe(32) = 256 bits, because it travels in a URL where a six-digit
# code would be brute-forceable. The DATABASE holds only sha256 of it (db/migrations/0055), so a
# leak of that table yields nothing usable. 15 minutes, single use.
#
# The password path below is untouched. Every account that has a bcrypt hash keeps signing in with
# it; this is an additional door, not a replacement lock.
# ---------------------------------------------------------------------------

# Its own constant, NOT settings.otp_ttl_min. An operator widening OTP_TTL_MIN (a code typed by
# hand, from a mailbox the person is already reading) must not silently widen the window on a
# credential that sits in a URL, in a forwarded email, in a shared screenshot.
MAGIC_TTL_MIN = 15
MAGIC_MAX_PER_EMAIL_15M = 3
MAGIC_MAX_PER_EMAIL_24H = 10
MAGIC_MAX_PER_IP_15M = 20
MAGIC_IP_WINDOW_SEC = 15 * 60


# Localized sign-in link email (subject, body). Body has {url} and {ttl}. Sent from the locale's
# persona (notify.sender_for) exactly like the OTP mail above.
#
# WHY notify.send_email DIRECTLY AND NOT ai.emails.send_template: send_template's ledger is
# idempotent per (user, template_id, dedup_key), so the SECOND link a farmer ever asks for would be
# silently dropped — the mail that never arrives is the whole failure mode this feature has to
# survive. Its lifecycle opt-out is also wrong here: nobody unsubscribes from being able to log in.
# The URL sits on its own line so every mail client autolinks it.
_MAGIC_EMAIL: dict[str, tuple[str, str]] = {
    "az": ("Agradex — giriş keçidi",
           "Agradex-ə daxil olmaq üçün keçid:\n\n{url}\n\n"
           "Keçid {ttl} dəqiqə ərzində və yalnız bir dəfə etibarlıdır. "
           "Bu sorğunu siz etməmisinizsə, məktubu nəzərə almayın."),
    "en": ("Agradex — your sign-in link",
           "Your link to sign in to Agradex:\n\n{url}\n\n"
           "The link is valid for {ttl} minutes and can be used once. "
           "If you didn't request this, please ignore this email."),
    "tr": ("Agradex — giriş bağlantınız",
           "Agradex'e giriş yapmak için bağlantınız:\n\n{url}\n\n"
           "Bağlantı {ttl} dakika geçerlidir ve yalnızca bir kez kullanılabilir. "
           "Bu isteği siz yapmadıysanız, bu e-postayı dikkate almayın."),
    "de": ("Agradex — Ihr Anmeldelink",
           "Ihr Link zur Anmeldung bei Agradex:\n\n{url}\n\n"
           "Der Link ist {ttl} Minuten gültig und kann einmal verwendet werden. "
           "Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail."),
    "hu": ("Agradex — bejelentkezési link",
           "Az Ön bejelentkezési linkje az Agradexhez:\n\n{url}\n\n"
           "A link {ttl} percig érvényes, és egyszer használható fel. "
           "Ha nem Ön kérte, hagyja figyelmen kívül ezt az e-mailt."),
    "it": ("Agradex — il tuo link di accesso",
           "Il tuo link per accedere ad Agradex:\n\n{url}\n\n"
           "Il link è valido per {ttl} minuti e può essere usato una sola volta. "
           "Se non l'hai richiesto, ignora questa email."),
    "pl": ("Agradex — link do logowania",
           "Twój link do logowania w Agradex:\n\n{url}\n\n"
           "Link jest ważny {ttl} minut i może zostać użyty tylko raz. "
           "Jeśli to nie Ty, zignoruj tę wiadomość."),
    # "мин." (not "минут") keeps the line grammatical for every {ttl} value.
    "ru": ("Agradex — ссылка для входа",
           "Ваша ссылка для входа в Agradex:\n\n{url}\n\n"
           "Ссылка действительна {ttl} мин. и может быть использована один раз. "
           "Если вы не запрашивали её, просто проигнорируйте это письмо."),
}


def _token_hash(raw: str) -> str:
    """sha256 hex. The raw token is never written to the database, a log line, or a response."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _magic_locale(request: Request, body_locale) -> str | None:
    """The language EXPLICITLY asked for: the body value, then the X-Locale header the web client
    sends on every request (the convention routers/advice.py::_resolve_locale documents).

    Returns None when neither is present, so the caller can fall back to the account's stored
    locale — a guess must never overwrite the language the farmer actually chose. SUPPORTED_LOCALES
    is defined further down this module; Python resolves it at call time."""
    header = (request.headers.get("x-locale") or "").strip().lower()
    for cand in (body_locale, header):
        if isinstance(cand, str) and cand.strip().lower() in SUPPORTED_LOCALES:
            return cand.strip().lower()
    return None


def _magic_url(token: str, locale: str) -> str:
    """The link, on the MARKETING APEX — not the app host, and this is load-bearing.

    app.agradex.com has no session cookie for a visitor who is signing in, so middleware.ts bounces
    them to `<apex>/login` carrying only `next=<path>` — `search` is dropped (see
    `u.searchParams.set("next", path)` there), and the token would die in that redirect. site_url()
    is the same helper the share links and the unsubscribe link use.

    az is the default locale and has no path prefix (middleware.ts routing); the other seven do.

    THE TOKEN IS IN THE FRAGMENT, NOT THE QUERY, and that is a security control rather than a style
    choice. A browser never transmits the part after `#`: it is absent from the request line, so it
    cannot reach an access log, and absent from the Referer header, so the same-origin `_next/static`
    fetches this page makes cannot carry it either. As a query parameter it was written to nginx's
    combined log twice per sign-in. The path is `/auth/link` — the route that actually exists
    (app/src/app/auth/link/page.tsx); an earlier version mailed `/magic`, which was never a route,
    so every link 404'd and the whole feature was dead end to end."""
    from ..ai.emails.send import site_url
    prefix = f"/{locale}" if locale in SUPPORTED_LOCALES and locale != "az" else ""
    return f"{site_url()}{prefix}/auth/link#token={token}"


# The limiter itself now lives in app/ratelimit.py so routers/geo.py can use the same one instead
# of hand-rolling a second copy — the honest account of what it can and cannot stop moved with it.
# The per-EMAIL limit further down is still the durable one: it is in SQL, exact, and survives
# restarts, whereas this is a burst brake that resets on deploy.
def _client_ip(request: Request) -> str:
    return ratelimit.client_ip(request)


def _ip_rate_ok(ip: str) -> bool:
    return ratelimit.allow("magic_link", ip,
                           limit=MAGIC_MAX_PER_IP_15M, window_sec=MAGIC_IP_WINDOW_SEC)


@router.post("/magic-link")
async def magic_link(body: MagicLinkIn, request: Request):
    """Email a sign-in link. Creates the account if there is none — signup and login are one act.

    ALWAYS answers with the same body whether the account existed, was just created, has a password
    or has none. Registration status is not something an unauthenticated caller gets to learn."""
    # A 200 promising a mail that no transport can send is a lie. This branch depends only on server
    # configuration, never on the address, so it discloses nothing about the account.
    if not notify.email_configured():
        raise HTTPException(status_code=503, detail="email_not_configured")
    if not _ip_rate_ok(_client_ip(request)):
        raise HTTPException(status_code=429, detail="too_many_requests")

    email = str(body.email).strip().lower()
    req_locale = _magic_locale(request, body.locale)

    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, locale from public.users "
            "where lower(email)=lower($1) and deleted_at is null", email)
        if not row:
            # email_verified MUST be written explicitly: the 0024 column default is TRUE, and a
            # brand-new passwordless account has proven nothing yet. Consuming the link is what
            # verifies the address.
            row = await conn.fetchrow(
                """insert into public.users (email, password_hash, locale, role, email_verified)
                   values ($1,$2,$3,$4::user_role,false)
                   on conflict (email) do nothing
                   returning id, email, locale""",
                email, NO_PASSWORD, req_locale or "az", UserRole.farmer.value)
            if not row:
                # users.email is UNIQUE (0002), so an empty return means a concurrent double-submit
                # inserted it first. Re-read rather than handle an exception — read-committed shows
                # us the committed row. (A CLOSED account cannot land here: 0052 rewrites its email
                # to a placeholder, which frees the real address for re-registration.)
                row = await conn.fetchrow(
                    "select id, email, locale from public.users "
                    "where lower(email)=lower($1) and deleted_at is null", email)
            if not row:
                raise HTTPException(status_code=500, detail="magic_link_failed")
        uid = str(row["id"])

        # Durable per-email rate limit, exact and restart-proof, over login_tokens_user_idx (0055).
        # Cannot trip on a first-ever request (both counts are 0), so it never blocks the
        # create-on-first-use path this endpoint depends on.
        counts = await conn.fetchrow(
            """select count(*) filter (where created_at > now() - interval '15 minutes') as w15,
                      count(*) filter (where created_at > now() - interval '24 hours')   as d24
                 from public.login_tokens where user_id=$1::uuid""", uid)
        if counts and (counts["w15"] >= MAGIC_MAX_PER_EMAIL_15M
                       or counts["d24"] >= MAGIC_MAX_PER_EMAIL_24H):
            raise HTTPException(status_code=429, detail="too_many_requests")

        # No reaper cron exists for this table, so prune here: a week of spent/expired rows stays
        # readable as an audit trail, growth stays bounded. Seq scan on a table that stays small.
        await conn.execute(
            "delete from public.login_tokens where expires_at < now() - interval '7 days'")

        raw = secrets.token_urlsafe(32)
        await conn.execute(
            "insert into public.login_tokens (user_id, token_hash, expires_at) "
            "values ($1::uuid, $2, now() + make_interval(mins => $3::int))",
            uid, _token_hash(raw), MAGIC_TTL_MIN)

    stored = row["locale"] if row["locale"] in SUPPORTED_LOCALES else None
    locale = req_locale or stored or "az"
    subject, tmpl = _MAGIC_EMAIL.get(locale, _MAGIC_EMAIL["az"])
    # Sent only after the transaction above has COMMITTED — a rolled-back insert would otherwise
    # produce a link that looks alive and matches no row. Delivered to the stored address (same
    # mailbox, original casing); the response echoes the normalised one.
    sent = await notify.send_email(
        row["email"], subject, tmpl.format(url=_magic_url(raw, locale), ttl=MAGIC_TTL_MIN),
        locale=locale)
    # send_email RETURNS whether the transport accepted it, and discarding that told the farmer
    # "check your inbox" for a message that does not exist. The upfront email_configured() guard
    # only proves a key is SET — a rotated key, a suppressed or hard-bounced address, a 429 from
    # Resend or a plain timeout all land here with ok=False.
    #
    # Leaks nothing: like the 503 above, this branch depends only on the transport, never on whether
    # the address belongs to an account, so it cannot be used to enumerate users. The token row is
    # already committed and stays valid — a farmer who retries after a transient failure gets a
    # second link, and the first one still works if it did go out.
    if not sent:
        raise HTTPException(status_code=502, detail="email_send_failed")
    return {"ok": True, "email": email}


@router.post("/magic-login", response_model=UserOut)
async def magic_login(body: MagicLoginIn, response: Response):
    """Redeem a sign-in link. Same response shape as /login, same cookie, same token lifetime."""
    async with connection() as conn:
        # Spend it ATOMICALLY. A returned row means WE are the ones who spent it, so two clicks on
        # the same link (the mail client's preview fetch and the farmer's tap) yield one session.
        uid = await conn.fetchval(
            """update public.login_tokens set used_at = now()
                where token_hash = $1 and used_at is null and expires_at > now()
                returning user_id""", _token_hash(body.token.strip()))
    # Expired, already used, or never existed — one message for all three. Branching here would tell
    # a guesser which of their guesses was a real token that had merely lapsed.
    if not uid:
        raise HTTPException(status_code=400, detail="magic_link_invalid")
    uid = str(uid)

    # Read, check, then write, each in its own committed transaction — raising inside
    # db.connection() rolls its transaction back, which is why verify_otp above is written the same
    # way. The spend is already committed by design: a link that reaches a disabled account is
    # burnt, not left available to retry.
    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, full_name, locale, is_admin, is_active, role, country, region "
            "from public.users where id=$1::uuid and deleted_at is null", uid)
    if not row:
        raise HTTPException(status_code=400, detail="magic_link_invalid")
    if not row["is_active"]:
        # The same code /login returns. Not an enumeration surface: holding a valid token already
        # proves control of the mailbox.
        raise HTTPException(status_code=403, detail="account_disabled")

    async with connection() as conn:
        # Consuming the link IS the verification — it proves the same thing the OTP proves. That is
        # what lets /login keep its email_not_verified gate for the password path.
        await conn.execute(
            """update public.users set email_verified=true, otp_code=null, otp_expires_at=null,
                      otp_attempts=0
                where id=$1::uuid and email_verified is not true""", uid)
        # Idempotent through email_sends, so this fires once per account ever — on the first link
        # consumed, exactly as signup and verify-otp call it.
        await _send_welcome(conn, uid, row["full_name"])

    _set_cookie(response, create_token(uid))
    return UserOut(id=uid, email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"],
                   role=row["role"], country=row["country"], region=row["region"])


# ---------------------------------------------------------------------------
# Account self-service: change your password, edit your profile, close your account.
#
# None of this existed until now. A live product with real accounts had no way for anyone to change
# their own password — someone whose password leaked could do nothing about it — and no way to leave.
#
# MIN_PASSWORD_LEN moved to the constants at the top of this file: signup now validates the password
# itself (it became optional) and needs the same floor, so one definition serves both.
# ---------------------------------------------------------------------------


@router.post("/change-password")
async def change_password(body: dict, response: Response,
                          user_id: str = Depends(get_current_user_id)):
    """Change the password, proving the current one first.

    Re-issues the session cookie: the JWT itself is untouched by a password change, so without this
    the caller keeps a valid token and — more to the point — so does anyone else who had one. Rotating
    here at least gives the legitimate user a fresh session in the same breath."""
    current = body.get("current_password") if isinstance(body, dict) else None
    new = body.get("new_password") if isinstance(body, dict) else None
    if not isinstance(current, str) or not isinstance(new, str):
        raise HTTPException(status_code=400, detail="invalid_password")
    if len(new) < MIN_PASSWORD_LEN:
        raise HTTPException(status_code=400, detail="password_too_short")
    if new == current:
        raise HTTPException(status_code=400, detail="password_unchanged")

    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select password_hash from public.users where id=$1::uuid and deleted_at is null",
            user_id)
        if not row:
            raise HTTPException(status_code=401, detail="unauthorized")
        if not verify_password(current, row["password_hash"]):
            # Deliberately its own code: "your current password is wrong" is useful and safe to say
            # to someone who is already authenticated as this account.
            raise HTTPException(status_code=403, detail="wrong_password")
        await conn.execute("update public.users set password_hash=$2 where id=$1::uuid",
                           user_id, hash_password(new))
    _set_cookie(response, create_token(user_id))
    return {"ok": True}


@router.patch("/profile")
async def update_profile(body: dict, user_id: str = Depends(get_current_user_id)):
    """Edit your own name / country / region. Email is NOT editable here — changing it has to go
    back through OTP verification, which is a separate flow."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="invalid_profile")

    def _opt_str(key: str, limit: int) -> tuple[bool, str | None]:
        """(present, value). An absent key leaves the column alone; an empty string clears it."""
        if key not in body:
            return False, None
        v = body.get(key)
        if v is None:
            return True, None
        if not isinstance(v, str):
            raise HTTPException(status_code=400, detail="invalid_profile")
        v = v.strip()[:limit]
        return True, (v or None)

    sets: list[str] = []
    vals: list = []
    for key, limit in (("full_name", 120), ("country", 80), ("region", 80)):
        present, value = _opt_str(key, limit)
        if present:
            vals.append(value)
            sets.append(f"{key}=${len(vals) + 1}")
    if not sets:
        raise HTTPException(status_code=400, detail="invalid_profile")

    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            f"update public.users set {', '.join(sets)} "
            "where id=$1::uuid and deleted_at is null "
            "returning id, email, full_name, locale, is_admin, role, country, region",
            user_id, *vals)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"], role=row["role"],
                   country=row["country"], region=row["region"])


async def owns_org_with_other_members(conn, user_id: str) -> bool:
    """Would closing this account strand somebody else's fields behind a vanished owner?

    Extracted so the admin panel asks the same question this route does — a second, subtly
    different rule about when an account may be closed is exactly how one of them ends up wrong.
    """
    return bool(await conn.fetchval(
        """select count(*) from public.organizations o
            where o.owner_id = $1::uuid
              and exists (select 1 from public.organization_members m
                           where m.org_id = o.id and m.user_id <> $1::uuid
                             and m.status = 'active')""", user_id))


async def anonymise_account(conn, user_id: str) -> None:
    """Erase the PERSON, keep the RECORDS. The one implementation of closing an account.

    See db/migrations/0052 for why this is not `delete from public.users`: fifteen tables reference
    the row with ON DELETE NO ACTION, so a real DELETE fails for any account that ever created
    anything, and cascading would wipe a farm's history because one worker left.

    Callers must have already checked owns_org_with_other_members(). Runs in its own transaction.
    """
    async with conn.transaction():
        # Orgs where this person was the only member become unreachable, and their fields would
        # otherwise keep the satellite pipeline and the crons working forever on data nobody can
        # ever open. Retire them (soft-delete — the same flag the delete-a-field flow uses).
        await conn.execute(
            """update public.fields f set deleted_at = now()
                where f.deleted_at is null
                  and f.org_id in (
                    select o.id from public.organizations o
                     where o.owner_id = $1::uuid
                       and not exists (select 1 from public.organization_members m
                                        where m.org_id = o.id and m.user_id <> $1::uuid
                                          and m.status = 'active'))""", user_id)
        await conn.execute("delete from public.organization_members where user_id=$1::uuid", user_id)
        # '!' is not a valid bcrypt hash, so verify_password returns False for every input rather
        # than raising — the account cannot be logged into by any password, including a future
        # collision. google_sub is released too, or the Google button would silently re-open the
        # closed account on the next click (0062 matches on the subject before the email).
        await conn.execute(
            """update public.users set
                 email = 'deleted+' || id::text || '@agradex.invalid',
                 password_hash = '!', full_name = null, country = null, region = null,
                 onboarding = null, notify_prefs = null, otp_code = null, otp_expires_at = null,
                 google_sub = null,
                 is_active = false, email_lifecycle = false, deleted_at = now()
               where id=$1::uuid""", user_id)


@router.post("/account/delete")
async def delete_account(body: dict, response: Response,
                         user_id: str = Depends(get_current_user_id)):
    """Close the account. Irreversible.

    Confirmation is the account's own email typed back — a password would be the obvious choice, but
    it is the one thing a shared or hijacked session already has.

    WHAT ACTUALLY HAPPENS (see db/migrations/0052): the person is erased, the records survive.
    Fifteen tables reference users with ON DELETE NO ACTION — fields.created_by,
    organizations.owner_id, sales.created_by and the rest — so a real DELETE fails for any account
    that ever created anything, and cascading instead would wipe a farm's history because one worker
    left. Instead every personal column is nulled, the email is rewritten to a non-routable
    placeholder (which frees the real address for re-registration), the password hash is replaced
    with a value bcrypt can never produce, and every membership row is deleted so access ends at
    once.

    REFUSED when the caller still owns an organisation that has other active members: closing then
    would strand their colleagues' fields behind an owner who no longer exists. They are told to hand
    the organisation over first."""
    typed = body.get("email") if isinstance(body, dict) else None
    if not isinstance(typed, str) or not typed.strip():
        raise HTTPException(status_code=400, detail="confirm_email_required")

    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select email from public.users where id=$1::uuid and deleted_at is null", user_id)
        if not row:
            raise HTTPException(status_code=401, detail="unauthorized")
        if typed.strip().lower() != (row["email"] or "").lower():
            raise HTTPException(status_code=400, detail="confirm_email_mismatch")

        if await owns_org_with_other_members(conn, user_id):
            raise HTTPException(status_code=409, detail="transfer_ownership_first")
        await anonymise_account(conn, user_id)

    response.delete_cookie(settings.cookie_name, path="/", domain=settings.cookie_domain or None)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        # `and deleted_at is null` logs a closed account out everywhere. The JWT stays valid for its
        # remaining lifetime and get_current_user_id deliberately does NOT hit the database (that
        # would put a query on every authenticated request), so this is what ends the session on a
        # second device: /me 401s and the client clears itself. Org-scoped data was already out of
        # reach the moment the memberships were deleted — require_member finds nothing.
        row = await conn.fetchrow(
            "select id, email, full_name, locale, is_admin, role, country, region "
            "from public.users where id=$1::uuid and deleted_at is null", user_id)
        # Activity signal for lifecycle/re-engagement emails; throttled to ~1/hour to avoid churn.
        await conn.execute(
            "update public.users set last_seen_at=now() where id=$1::uuid "
            "and (last_seen_at is null or last_seen_at < now() - interval '1 hour')", user_id)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"],
                   role=row["role"], country=row["country"], region=row["region"])


@router.get("/onboarding")
async def get_onboarding(user_id: str = Depends(get_current_user_id)):
    """The landing quiz answers stored on this account (E13). Used to prefill the field wizard."""
    async with connection(user_id) as conn:
        val = await conn.fetchval("select onboarding from public.users where id=$1::uuid", user_id)
    if isinstance(val, str):
        try:
            val = json.loads(val)
        except ValueError:
            val = None
    return {"onboarding": val or None}


@router.post("/onboarding")
async def set_onboarding(body: dict, user_id: str = Depends(get_current_user_id)):
    """Store (or re-take) the quiz, then apply crop/region to the fields that still have none.
    Existing values are never overwritten."""
    onb = _clean_onboarding(body.get("onboarding") if "onboarding" in body else body)
    if not onb:
        raise HTTPException(status_code=400, detail="empty_onboarding")
    async with connection(user_id) as conn:
        await conn.execute("update public.users set onboarding=$2::jsonb where id=$1::uuid",
                           user_id, json.dumps(onb))
        applied = await _apply_onboarding_to_fields(conn, user_id, onb)
    return {"onboarding": onb, "fields_updated": applied}


# --- P1.2 local area unit ----------------------------------------------------------------------
# Areas are stored in hectares everywhere; this preference only changes how they are DISPLAYED.
# Turkey counts land in dönüm (= dekar = 1000 m² = 0.1 ha) and its land registry is written that
# way; the South Caucasus says sotka (= ar = 100 m² = 0.01 ha) for small plots. NULL means "derive
# from my country", so a farmer who never opens settings still sees a unit they recognise, and one
# who later corrects their country follows it. sotka is opt-in only — it reads well below ~1 ha and
# badly above it, so it is never derived as a default.
AREA_UNITS = ("ha", "donum", "sotka")
_TURKEY = {"TR", "TUR", "TURKEY", "TÜRKIYE", "TÜRKİYE"}


def _effective_area_unit(stored, country, locale) -> str:
    """The unit to actually display. Mirrors defaultAreaUnit() in app/src/lib/units.ts — keep both
    sides in step if the country→unit mapping ever grows."""
    if stored in AREA_UNITS:
        return stored
    c = (country or "").strip().upper()
    if c in _TURKEY:
        return "donum"
    if c:  # an explicit country other than Turkey outranks the interface language
        return "ha"
    if (locale or "")[:2].lower() == "tr":
        return "donum"
    return "ha"


def _clean_area_unit(raw):
    """None / "" / "auto" all mean "follow my country". Anything else must be one of the three."""
    if raw is None:
        return None
    if not isinstance(raw, str):
        raise HTTPException(status_code=400, detail="invalid_area_unit")
    v = raw.strip().lower()
    if v in ("", "auto"):
        return None
    if v not in AREA_UNITS:
        raise HTTPException(status_code=400, detail="invalid_area_unit")
    return v


@router.get("/area-unit")
async def get_area_unit(user_id: str = Depends(get_current_user_id)):
    """`unit` = what the farmer explicitly chose (null = auto); `effective` = what to render."""
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select area_unit, country, locale from public.users where id=$1::uuid", user_id)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    stored = row["area_unit"] if row["area_unit"] in AREA_UNITS else None
    return {"unit": stored,
            "effective": _effective_area_unit(stored, row["country"], row["locale"])}


@router.post("/area-unit")
async def set_area_unit(body: dict, user_id: str = Depends(get_current_user_id)):
    """Store the display unit. Pass null (or "auto") to go back to the country default."""
    unit = _clean_area_unit(body.get("unit") if isinstance(body, dict) else None)
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "update public.users set area_unit=$2 where id=$1::uuid returning country, locale",
            user_id, unit)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    return {"unit": unit,
            "effective": _effective_area_unit(unit, row["country"], row["locale"])}


# The interface language, persisted on the user. The switcher already sets a cookie, which is
# enough for anything rendered in a request — but NOT for work that runs without one: the weekly
# digest email and the advice the geo pipeline generates after each new scene both read
# users.locale. Before this the column only ever held whatever was picked at signup, so a farmer
# who switched to Russian kept getting Azerbaijani analysis and Azerbaijani mail forever.
SUPPORTED_LOCALES = ("az", "en", "ru", "tr", "de", "hu", "it", "pl")


@router.post("/locale")
async def set_locale(body: dict, user_id: str = Depends(get_current_user_id)):
    raw = body.get("locale") if isinstance(body, dict) else None
    locale = raw.strip().lower() if isinstance(raw, str) else ""
    if locale not in SUPPORTED_LOCALES:
        raise HTTPException(status_code=400, detail="invalid_locale")
    async with connection(user_id) as conn:
        await conn.execute("update public.users set locale=$2 where id=$1::uuid", user_id, locale)
    return {"locale": locale}


@router.get("/name-public")
async def get_name_public(user_id: str = Depends(get_current_user_id)):
    """Whether this (farmer) user's real name is shown to other users (New-B). Also returns the role
    so the UI can hide the control for non-farmers."""
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select name_public, role from public.users where id=$1::uuid", user_id)
    return {"enabled": bool(row["name_public"]) if row else True,
            "role": row["role"] if row else "farmer"}


@router.post("/name-public")
async def set_name_public(body: dict, user_id: str = Depends(get_current_user_id)):
    """Toggle whether this user's real name is shown to other users (New-B)."""
    enabled = bool(body.get("enabled"))
    async with connection(user_id) as conn:
        await conn.execute("update public.users set name_public=$2 where id=$1::uuid", user_id, enabled)
    return {"enabled": enabled}


@router.get("/email-lifecycle")
async def get_email_lifecycle(user_id: str = Depends(get_current_user_id)):
    """Whether this user receives lifecycle/onboarding/digest email (E2.4). Transactional email
    (OTP, welcome, data-ready) ignores this."""
    async with connection(user_id) as conn:
        val = await conn.fetchval("select email_lifecycle from public.users where id=$1::uuid", user_id)
    return {"enabled": bool(val) if val is not None else True}


@router.post("/email-lifecycle")
async def set_email_lifecycle(body: dict, user_id: str = Depends(get_current_user_id)):
    """Toggle this user's lifecycle/onboarding/digest email (E2.4)."""
    enabled = bool(body.get("enabled"))
    async with connection(user_id) as conn:
        await conn.execute("update public.users set email_lifecycle=$2 where id=$1::uuid", user_id, enabled)
    return {"enabled": enabled}


async def _notify_prefs_payload(conn, user_id: str) -> dict:
    """The settings screen needs more than the matrix to be honest about it: whether the weekly
    email is switched off entirely (then the digest column decides nothing right now) and whether
    Telegram is even reachable (no bot token → the column is stored but dormant)."""
    from ..messaging import telegram

    row = await conn.fetchrow(
        """select u.notify_prefs, u.email_lifecycle,
                  (c.chat_id is not null and c.verified and c.opt_in) as tg_linked
           from public.users u
           left join public.messaging_channels c
             on c.user_id = u.id and c.channel = 'telegram'
           where u.id=$1::uuid""", user_id)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    return {
        # Expanded, never the stored opt-out shape: the client should not have to know that a
        # missing key means "on".
        "prefs": notify_prefs.normalize(row["notify_prefs"]),
        "categories": list(notify_prefs.CATEGORIES),
        "channels": list(notify_prefs.CHANNELS),
        "digest_enabled": row["email_lifecycle"] is not False,
        "telegram": {"configured": telegram.configured(), "linked": bool(row["tg_linked"])},
    }


@router.get("/notify-prefs")
async def get_notify_prefs(user_id: str = Depends(get_current_user_id)):
    """The per-category notification matrix (5 categories × 3 channels) + what the UI needs to
    describe it truthfully. See services/app/notify_prefs.py for the category mapping."""
    async with connection(user_id) as conn:
        return await _notify_prefs_payload(conn, user_id)


@router.put("/notify-prefs")
async def set_notify_prefs(body: dict, user_id: str = Depends(get_current_user_id)):
    """Store the matrix. The body may be full or sparse; only the switched-OFF cells are persisted,
    so `PUT {"prefs": {}}` IS "reset to recommended". Returns the same shape as GET so the client
    reconciles from one response instead of re-fetching."""
    # An ABSENT "prefs" key is a malformed request, not a reset. parse(None) normalises to
    # all-channels-on, which compacts to {} — so a typo'd body ("pref", or {}) would have wiped
    # every opt-out and answered 200. Resetting stays explicit: {"prefs": {}}.
    if not isinstance(body, dict) or "prefs" not in body:
        raise HTTPException(status_code=400, detail="invalid_notify_prefs")
    raw = body.get("prefs")
    try:
        prefs = notify_prefs.parse(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_notify_prefs")
    stored = notify_prefs.compact(prefs)
    async with connection(user_id) as conn:
        await conn.execute("update public.users set notify_prefs=$2::jsonb where id=$1::uuid",
                           user_id, json.dumps(stored))
        return await _notify_prefs_payload(conn, user_id)
