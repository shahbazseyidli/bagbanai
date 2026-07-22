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


@router.post("/research/enqueue-seasonal")
async def enqueue_seasonal(limit: int = 200, stale_days: int = 120):
    """Seasonal auto-enqueue (T17): queue Phase-1 research for fields whose crop calibration is
    absent or older than `stale_days`, so zone blocks + researched index_norms refresh across
    seasons. Called by the deploy/enqueue-research-seasonal.sh cron (monthly). Idempotent: fields
    with an in-flight job are skipped and jobs.enqueue merges any remaining duplicates. Curated
    seed norms are never a refresh trigger — only absent or research-derived (stale) ones are."""
    from ..ai import jobs
    async with connection(None) as conn:
        rows = await conn.fetch(
            """select f.id as field_id, f.org_id
               from public.fields f
               join public.field_metadata m on m.field_id=f.id
               where f.deleted_at is null and m.crop_type is not null
                 and not exists (
                    select 1 from public.research_jobs j
                    where j.field_id=f.id and j.status in ('queued','running'))
                 and (
                    not exists (
                      select 1 from public.crop_thresholds ct
                      where ct.crop_type=m.crop_type and ct.growth_stage='all'
                        and ct.age_class='all' and ct.index_norms is not null)
                    or exists (
                      select 1 from public.crop_thresholds ct
                      where ct.crop_type=m.crop_type and ct.growth_stage='all'
                        and ct.age_class='all' and ct.norms_source='research'
                        and (ct.norms_updated_at is null
                             or ct.norms_updated_at < now() - ($1::int || ' days')::interval)))
               limit $2""", stale_days, limit)
        n = 0
        for r in rows:
            await jobs.enqueue(conn, field_id=str(r["field_id"]), org_id=str(r["org_id"]),
                               trigger_type="seasonal", blocks=["ALL"], debounce_min=0)
            n += 1
    return {"enqueued": n, "candidates": len(rows)}


@router.post("/season/compute")
async def compute_season(season_year: int, limit: int = 2000):
    """Compute per-field season features (T16) for `season_year` — vegetation (NDVI peak/mean/
    integral) + GDD total + precipitation total aggregates → field_season_features. Groundwork for
    a future NDVI-integral ↔ yield correlation. Driven by deploy/compute-season-features.sh."""
    from ..ai import season
    async with connection(None) as conn:
        n = await season.compute_all(conn, season_year, limit)
    return {"computed": n, "season_year": season_year}


@router.post("/weather/run")
async def run_weather(field_id: str):
    """Refresh the Open-Meteo forecast + water_requirements block for one field (M8), then run the
    rule engine so any fresh weather alerts get dispatched (T1)."""
    from ..ai import weather as weather_svc
    from ..rules import run_rules
    async with connection(None) as conn:
        result = await weather_svc.refresh_field(conn, field_id)
        try:
            result["rules"] = await run_rules(conn, field_id)
        except Exception as exc:  # noqa: BLE001 — dispatch is best-effort
            result["rules"] = {"ok": False, "error": str(exc)[:200]}
    return result


@router.post("/gdd/run")
async def run_gdd(field_id: str):
    """Recompute Growing-Degree-Days for one field's current season (T4)."""
    from ..ai import gdd as gdd_svc
    async with connection(None) as conn:
        return await gdd_svc.refresh_field_gdd(conn, field_id)


@router.post("/weather/drain")
async def drain_weather(limit: int = 50):
    """Refresh weather (+ GDD) for the least-recently-updated fields (called by the daily cron)."""
    from ..ai import gdd as gdd_svc
    from ..ai import weather as weather_svc
    from ..rules import run_rules
    async with connection(None) as conn:
        ids = await conn.fetch(
            """select f.id from public.fields f
               left join (select field_id, max(fetched_at) mx from public.weather_cache group by 1) w
                 on w.field_id=f.id
               order by w.mx nulls first limit $1""", limit)
    done = 0
    for r in ids:
        try:
            async with connection(None) as conn:
                res = await weather_svc.refresh_field(conn, str(r["id"]))
                if res.get("ok"):
                    done += 1
                # Dispatch any fresh weather alerts through the rule engine (T1).
                await run_rules(conn, str(r["id"]))
            # GDD refresh is independent + best-effort — a failure must not stall the batch.
            async with connection(None) as conn:
                await gdd_svc.refresh_field_gdd(conn, str(r["id"]))
        except Exception:  # noqa: BLE001 — one field must not stall the batch
            pass
    return {"refreshed": done, "considered": len(ids)}


@router.post("/rules/run")
async def run_rules_endpoint(field_id: str):
    """Evaluate all alert rules for a field and dispatch surviving alerts (T1). Called after a
    weather refresh or a new satellite scene."""
    from ..rules import run_rules
    async with connection(None) as conn:
        return await run_rules(conn, field_id)


@router.post("/telegram/setup")
async def telegram_setup(base_url: str = "https://agradex.com"):
    """Register the Telegram webhook (U4). Call once after TELEGRAM_BOT_TOKEN is set in .env."""
    from ..messaging import telegram
    return await telegram.set_webhook(f"{base_url.rstrip('/')}/api/telegram/webhook")


@router.post("/baseline/run")
async def run_baseline(field_id: str):
    """Recompute the per-week index baseline for a field (T6), so anomaly rules have a norm."""
    from ..ai import analytics
    async with connection(None) as conn:
        return await analytics.refresh_baseline(conn, field_id)
