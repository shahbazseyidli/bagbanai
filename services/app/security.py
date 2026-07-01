"""Password hashing (bcrypt) + JWT issue/verify (spec §5 auth, adapted to own JWT)."""
import datetime as dt
from typing import Optional

import bcrypt
import jwt

from .config import settings

ALGO = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: str) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + dt.timedelta(hours=settings.jwt_expires_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def decode_token(token: str) -> Optional[str]:
    """Return user_id (sub) if valid, else None."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None
