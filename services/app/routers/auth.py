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
    )


async def _issue_otp(conn, user_id: str, email: str) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_min)
    await conn.execute(
        """update public.users set otp_code=$1, otp_expires_at=$2, otp_attempts=0, email_verified=false
           where id=$3::uuid""", code, exp, user_id)
    await notify.send_email(
        email, "Bağban AI — təsdiq kodu",
        f"Bağban AI hesabınızı təsdiqləmək üçün kod: {code}\n\n"
        f"Kod {settings.otp_ttl_min} dəqiqə ərzində etibarlıdır. Bu sorğunu siz etməmisinizsə, "
        f"məktubu nəzərə almayın.")


@router.post("/signup")
async def signup(body: SignupIn, response: Response):
    """Create the account. If email is configured, issue an OTP and return {needs_verification:true};
    otherwise auto-verify and log the user in immediately."""
    async with connection() as conn:
        exists = await conn.fetchval("select 1 from public.users where lower(email)=lower($1)", body.email)
        if exists:
            raise HTTPException(status_code=409, detail="email_taken")
        row = await conn.fetchrow(
            """insert into public.users (email, password_hash, full_name, locale)
               values ($1,$2,$3,$4) returning id, email, full_name, locale""",
            body.email, hash_password(body.password), body.full_name, body.locale)
        uid = str(row["id"])
        if notify.email_configured():
            await _issue_otp(conn, uid, row["email"])
            return {"needs_verification": True, "email": row["email"]}
    _set_cookie(response, create_token(uid))
    return {"needs_verification": False, "user": UserOut(
        id=uid, email=row["email"], full_name=row["full_name"], locale=row["locale"])}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpIn, response: Response):
    """Confirm the emailed code → mark verified + log in."""
    async with connection() as conn:
        row = await conn.fetchrow(
            """select id, email, full_name, locale, is_admin, email_verified,
                      otp_code, otp_expires_at, otp_attempts
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
                await conn.execute(
                    "update public.users set otp_attempts=otp_attempts+1 where id=$1::uuid", row["id"])
                raise HTTPException(status_code=400, detail="invalid_otp")
            await conn.execute(
                """update public.users set email_verified=true, otp_code=null,
                          otp_expires_at=null, otp_attempts=0 where id=$1::uuid""", row["id"])
    _set_cookie(response, create_token(str(row["id"])))
    return {"ok": True, "user": UserOut(id=str(row["id"]), email=row["email"],
            full_name=row["full_name"], locale=row["locale"], is_admin=row["is_admin"])}


@router.post("/resend-otp")
async def resend_otp(body: ResendOtpIn):
    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, email_verified from public.users where lower(email)=lower($1)", body.email)
        if not row:
            raise HTTPException(status_code=404, detail="user_not_found")
        if row["email_verified"]:
            return {"ok": True, "already_verified": True}
        await _issue_otp(conn, str(row["id"]), row["email"])
    return {"ok": True}


@router.post("/login", response_model=UserOut)
async def login(body: LoginIn, response: Response):
    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, password_hash, full_name, locale, is_admin, email_verified "
            "from public.users where lower(email)=lower($1)", body.email)
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    if not row["email_verified"] and notify.email_configured():
        raise HTTPException(status_code=403, detail="email_not_verified")
    _set_cookie(response, create_token(str(row["id"])))
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"])


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select id, email, full_name, locale, is_admin from public.users where id=$1::uuid", user_id)
    if not row:
        raise HTTPException(status_code=401, detail="unauthorized")
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"],
                   locale=row["locale"], is_admin=row["is_admin"])
