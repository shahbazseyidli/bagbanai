"""Auth endpoints: signup / login / logout / me + OTP email verification (U3).

Own JWT in an httpOnly cookie. Email verification degrades gracefully: OTP is only issued/enforced
when an email transport (Resend/SMTP) is configured — otherwise signups auto-verify so production
signup is never blocked by missing email config."""
import json
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
_ONB_STR = ("crop", "country", "region", "challenge", "completed_at")


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
    """Create the account. If email is configured, issue an OTP and return {needs_verification:true};
    otherwise auto-verify and log the user in immediately."""
    onb = _clean_onboarding(body.onboarding)
    async with connection() as conn:
        exists = await conn.fetchval("select 1 from public.users where lower(email)=lower($1)", body.email)
        if exists:
            raise HTTPException(status_code=409, detail="email_taken")
        row = await conn.fetchrow(
            """insert into public.users
                 (email, password_hash, full_name, locale, role, country, region, name_public,
                  onboarding)
               values ($1,$2,$3,$4,$5::user_role,$6,$7,$8,$9::jsonb)
               returning id, email, full_name, locale, role, country, region""",
            body.email, hash_password(body.password), body.full_name, body.locale,
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
