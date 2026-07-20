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


@router.post("/research/drain")
async def drain_research(limit: int = 1):
    """Claim up to `limit` due research_jobs and run Phase-1 research for each (knowledge
    layer M4). Called by the deploy/process-research.sh cron. One job per call by default so
    a slow LLM synthesis stays within the proxy timeout; the cron loops. After a successful
    run it re-detects clarifications and (best-effort) refreshes advice with the new passport."""
    from ..ai import clarify, jobs
    from ..ai import research as research_svc
    from ..ai import usage as ai_usage

    processed = []
    async with connection(None) as conn:
        claimed = await jobs.claim_due(conn, limit=limit)
    for job in claimed:
        if not job["field_id"]:
            async with connection(None) as conn:
                await jobs.complete(conn, job["id"], True, error="no_field")
            continue
        try:
            async with connection(None) as conn:
                result = await research_svc.research_field(conn, job["field_id"], job["blocks"])
                await clarify.detect_clarifications(conn, job["field_id"])
                usage = result.get("usage")
                if usage and result.get("org_id"):
                    try:
                        await ai_usage.record_usage(
                            conn, kind="research", provider=usage["provider"], model=usage["model"],
                            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
                            org_id=result["org_id"], user_id=None, field_id=job["field_id"])
                    except Exception:
                        pass
                await jobs.complete(conn, job["id"], bool(result.get("ok")),
                                    error=",".join(result.get("degraded", [])) or None)
            processed.append({"job": job["id"], "field": job["field_id"],
                              "written": result.get("written"), "degraded": result.get("degraded")})
        except Exception as exc:  # noqa: BLE001 — one bad job must not stall the queue
            async with connection(None) as conn:
                await jobs.complete(conn, job["id"], False, error=str(exc)[:400])
            processed.append({"job": job["id"], "field": job["field_id"], "error": str(exc)[:200]})
    return {"claimed": len(claimed), "processed": processed}


@router.post("/weather/run")
async def run_weather(field_id: str):
    # Weather service is Phase 2 (Open-Meteo). Placeholder contract for n8n wiring.
    raise HTTPException(status_code=501, detail="weather_phase_2")


@router.post("/rules/run")
async def run_rules(field_id: str):
    # Rule engine is Phase 2 (notifications are PAID). Placeholder contract.
    raise HTTPException(status_code=501, detail="rules_phase_2")
