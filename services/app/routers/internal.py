"""Internal triggers for n8n (spec §22, §24). Protected by X-Internal-Token.

The HLS pipeline needs the geo deps (requirements-geo.txt). If they aren't installed in
this image, the endpoint returns 501 and n8n should instead run
`python -m geo_pipeline.pipeline <field_id>` on the geo worker."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException

from ..db import connection
from ..deps import require_internal

router = APIRouter(prefix="/api/internal", tags=["internal"], dependencies=[Depends(require_internal)])


@router.post("/advice/run")
async def run_advice(field_id: str):
    """Regenerate AI advice for a field (called by the geo pipeline after new scenes,
    or by n8n). Notifies the farmer on material change. No-op if AI isn't configured."""
    from ..ai import advice as advice_svc
    from ..ai import llm
    if not llm.is_configured():
        return {"ok": False, "reason": "ai_not_configured"}
    async with connection(None) as conn:
        result = await advice_svc.generate_and_store(conn, field_id)
    return {"ok": result is not None}


@router.post("/pipeline/run")
async def run_pipeline(field_id: str, days_back: int = 120):
    try:
        from geo_pipeline.pipeline import run_field
    except ImportError:
        raise HTTPException(status_code=501, detail="geo_deps_unavailable_run_on_worker")
    result = await asyncio.to_thread(run_field, field_id, days_back)
    return result


@router.post("/weather/run")
async def run_weather(field_id: str):
    # Weather service is Phase 2 (Open-Meteo). Placeholder contract for n8n wiring.
    raise HTTPException(status_code=501, detail="weather_phase_2")


@router.post("/rules/run")
async def run_rules(field_id: str):
    # Rule engine is Phase 2 (notifications are PAID). Placeholder contract.
    raise HTTPException(status_code=501, detail="rules_phase_2")
