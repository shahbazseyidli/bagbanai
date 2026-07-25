"""Auth endpoints: signup / login / logout / me + OTP email verification (U3).

Own JWT in an httpOnly cookie. Email verification degrades gracefully: OTP is only issued/enforced
when an email transport (Resend/SMTP) is configured — otherwise signups auto-verify so production
signup is never blocked by missing email config."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from ..ai import notify
from ..config import settings
from ..db import connection
from ..deps import get_current_user_id
from ..schemas import LoginIn, ResendOtpIn, SignupIn, UserOut, VerifyOtpIn
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
_MAX_OTP_ATTEMPTS = 6


def _set_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        key=settings.cookie_name, value=token, httponly=True, samesite="lax",
        secure=settings.next_public_app_url.startswith("https"),
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
    """Create the account. If email is configured, issue an OTP and return {needs_verification:true};
    otherwise auto-verify and log the user in immediately."""
    async with connection() as conn:
        exists = await conn.fetchval("select 1 from public.users where lower(email)=lower($1)", body.email)
        if exists:
            raise HTTPException(status_code=409, detail="email_taken")
        row = await conn.fetchrow(
            """insert into public.users
                 (email, password_hash, full_name, locale, role, country, region, name_public)
               values ($1,$2,$3,$4,$5::user_role,$6,$7,$8)
               returning id, email, full_name, locale, role, country, region""",
            body.email, hash_password(body.password), body.full_name, body.locale,
            body.role.value, body.country, body.region, body.name_public)
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


@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select id, email, full_name, locale, is_admin, role, country, region "
            "from public.users where id=$1::uuid", user_id)
        # Activity signal for lifecycle/re-engagement emails; throttled to ~1/hour to avoid churn.
        await conn.execute(
            "update public.users set last_seen_at=now() where id=$1::uuid "
            "and (last_seen_at is null or last_seen_at < now() - interval '1 hour')", user_id)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"],
                   role=row["role"], country=row["country"], region=row["region"])


@router.get("/email-alerts")
async def get_email_alerts(user_id: str = Depends(get_current_user_id)):
    """Whether this user receives email alerts (#4)."""
    async with connection(user_id) as conn:
        val = await conn.fetchval("select email_alerts from public.users where id=$1::uuid", user_id)
    return {"enabled": bool(val)}


@router.post("/email-alerts")
async def set_email_alerts(body: dict, user_id: str = Depends(get_current_user_id)):
    """Toggle this user's email alerts (#4)."""
    enabled = bool(body.get("enabled"))
    async with connection(user_id) as conn:
        await conn.execute("update public.users set email_alerts=$2 where id=$1::uuid", user_id, enabled)
    return {"enabled": enabled}


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
