"""Liveness + readiness (readiness pings the DB)."""
from fastapi import APIRouter

from ..db import pool

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "bagban-api"}


@router.get("/ready")
async def ready():
    try:
        val = await pool().fetchval("select 1")
        return {"status": "ready", "db": val == 1}
    except Exception as exc:  # noqa: BLE001
        return {"status": "degraded", "db": False, "error": str(exc)}
