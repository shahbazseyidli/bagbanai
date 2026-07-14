"""Auth endpoints: signup / login / logout / me (own JWT, httpOnly cookie)."""
from fastapi import APIRouter, Depends, HTTPException, Response

from ..config import settings
from ..db import connection
from ..deps import get_current_user_id
from ..schemas import LoginIn, SignupIn, UserOut
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def _set_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        key=settings.cookie_name, value=token, httponly=True, samesite="lax",
        secure=settings.next_public_app_url.startswith("https"),
        max_age=COOKIE_MAX_AGE, path="/",
    )


@router.post("/signup", response_model=UserOut)
async def signup(body: SignupIn, response: Response):
    async with connection() as conn:
        exists = await conn.fetchval("select 1 from public.users where lower(email)=lower($1)", body.email)
        if exists:
            raise HTTPException(status_code=409, detail="email_taken")
        row = await conn.fetchrow(
            """insert into public.users (email, password_hash, full_name, locale)
               values ($1,$2,$3,$4) returning id, email, full_name, locale""",
            body.email, hash_password(body.password), body.full_name, body.locale)
    _set_cookie(response, create_token(str(row["id"])))
    return UserOut(id=str(row["id"]), email=row["email"], full_name=row["full_name"], locale=row["locale"])


@router.post("/login", response_model=UserOut)
async def login(body: LoginIn, response: Response):
    async with connection() as conn:
        row = await conn.fetchrow(
            "select id, email, password_hash, full_name, locale, is_admin from public.users where lower(email)=lower($1)",
            body.email)
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_credentials")
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
