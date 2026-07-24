"""Retrospective backfill of past seasons (HYBRID_PLAN W7, A8).

HLS reaches back to 2015, but a new field is only ingested for the last ~60 days, so the
season-compare / feature-store views have nothing to compare against. This router is the
JOB QUEUE only: it validates a year range, enqueues a public.field_backfill_jobs row (0037)
and reports progress. The actual raster work happens in the geo image, driven by the cron
worker deploy/process-backfill.sh (the API image has no rasterio/numpy and must never try).

Two deliberate constraints:
  * fields.data_status / data_progress_* are NEVER touched here. They belong to the live
    queue worker and drive the "Peyk məlumatı hazırlanır" banner — a backfill running in the
    background must not make that banner claim the field is still preparing.
  * unique (field_id, year_from, year_to): re-posting the same range returns the existing
    job instead of a 409 the user cannot act on. A finished/failed job can be re-queued.

Request models live here on purpose (isolated from ..schemas)."""
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["backfill"])

# HLS v2.0 coverage floor (L30 from 2013, S30 from mid-2015 → 2015 is the safe, honest floor).
# Keep in sync with geo_pipeline.pipeline.MIN_BACKFILL_YEAR.
MIN_YEAR = 2015
# One year is minutes of windowed COG reads; cap the span so a single click cannot queue a
# multi-hour job by accident. Longer histories = several jobs.
MAX_SPAN_YEARS = 12
SENSORS = ("hls", "s2", "all")
# Per-org cap on unfinished jobs — bounds the queue and the satellite egress.
MAX_ACTIVE_PER_ORG = 3

_SELECT = ("id, field_id, org_id, year_from, year_to, sensor, status, years_done, years_total, "
           "scenes_written, message, zone_index, created_at, updated_at")


# ---------- request models ----------
class BackfillIn(BaseModel):
    year_from: int
    year_to: int
    sensor: str = "hls"
    # Also write peak-season per-pixel COGs for one index, so productivity zones (A6) — which read
    # only public.index_rasters — actually become computable. Costs disk, hence opt-in.
    for_zones: bool = False
    # A finished ('done') job is returned untouched unless the caller explicitly asks for a
    # re-run. A 'failed' job is always re-queued (retrying a failure is what the user means).
    restart: bool = False


# ---------- helpers ----------
def _uuid(value: str, detail: str = "invalid_id") -> str:
    """Reject a malformed id in Python — casting it to ::uuid in SQL raises a 500 instead."""
    try:
        return str(UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail=detail)


def _job_out(r) -> dict:
    total = int(r["years_total"] or 0)
    done = int(r["years_done"] or 0)
    return {
        "id": str(r["id"]),
        "field_id": str(r["field_id"]),
        "org_id": str(r["org_id"]),
        "year_from": r["year_from"],
        "year_to": r["year_to"],
        "sensor": r["sensor"],
        "status": r["status"],
        "years_done": done,
        "years_total": total,
        "scenes_written": int(r["scenes_written"] or 0),
        "zone_index": r["zone_index"],
        "message": r["message"],
        "percent": round(100.0 * done / total) if total > 0 else 0,
        "active": r["status"] in ("queued", "running"),
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


def _validate_range(year_from: int, year_to: int) -> tuple[int, int]:
    max_year = date.today().year
    try:
        y_from, y_to = int(year_from), int(year_to)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="invalid_year_range")
    if y_from > y_to:
        raise HTTPException(status_code=400, detail="year_from_after_year_to")
    if y_from < MIN_YEAR:
        raise HTTPException(status_code=400, detail="year_before_hls_coverage")
    if y_to > max_year:
        raise HTTPException(status_code=400, detail="year_in_future")
    if (y_to - y_from + 1) > MAX_SPAN_YEARS:
        raise HTTPException(status_code=400, detail="range_too_wide")
    return y_from, y_to


def _validate_sensor(sensor: Optional[str]) -> str:
    s = (sensor or "hls").strip().lower()
    if s not in SENSORS:
        raise HTTPException(status_code=400, detail="invalid_sensor")
    return s


# ---------- endpoints ----------
@router.post("/fields/{field_id}/backfill")
async def enqueue_backfill(field_id: str, body: BackfillIn,
                           user_id: str = Depends(get_current_user_id)):
    """Queue a retrospective ingest of <year_from>..<year_to> for one field.

    Idempotent by (field_id, year_from, year_to): the same request twice gives the same job."""
    fid = _uuid(field_id, "invalid_field_id")
    y_from, y_to = _validate_range(body.year_from, body.year_to)
    sensor = _validate_sensor(body.sensor)
    years_total = y_to - y_from + 1

    created = requeued = False
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, fid)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        alive = await conn.fetchval(
            "select 1 from public.fields where id=$1::uuid and deleted_at is null", fid)
        if not alive:
            raise HTTPException(status_code=404, detail="field_not_found")

        # `do nothing` cannot raise a unique violation, so the transaction stays usable and we
        # can fall through to "return the existing job" instead of erroring the user out.
        row = await conn.fetchrow(
            f"""insert into public.field_backfill_jobs
                  (field_id, org_id, year_from, year_to, sensor, status, years_total, message, zone_index)
                values ($1::uuid,$2::uuid,$3,$4,$5,'queued',$6,$7,$8)
                on conflict (field_id, year_from, year_to) do nothing
                returning {_SELECT}""",
            fid, org_id, y_from, y_to, sensor, years_total, "Növbədə gözləyir",
            "NDVI" if body.for_zones else None)
        created = row is not None

        if row is None:
            existing = await conn.fetchrow(
                f"""select {_SELECT} from public.field_backfill_jobs
                    where field_id=$1::uuid and year_from=$2 and year_to=$3""",
                fid, y_from, y_to)
            if existing is None:                       # conflict but no row → deleted mid-flight
                raise HTTPException(status_code=409, detail="backfill_conflict")
            status = existing["status"]
            if status == "failed" or (status == "done" and body.restart):
                row = await conn.fetchrow(
                    f"""update public.field_backfill_jobs
                        set status='queued', years_done=0, scenes_written=0,
                            sensor=$2, years_total=$3, message=$4
                        where id=$1::uuid returning {_SELECT}""",
                    str(existing["id"]), sensor, years_total, "Yenidən növbəyə alındı")
                requeued = True
            else:
                row = existing
        else:
            # Only count the queue AFTER a successful insert, so re-posting an existing job is
            # never blocked by the cap. Raising here rolls the whole transaction back (asyncpg
            # transaction context), so the row we just inserted does not survive.
            active = await conn.fetchval(
                """select count(*) from public.field_backfill_jobs
                   where org_id=$1::uuid and status in ('queued','running')""", org_id)
            if int(active or 0) > MAX_ACTIVE_PER_ORG:
                raise HTTPException(status_code=429, detail="too_many_backfill_jobs")

    out = _job_out(row)
    out["created"] = created
    out["requeued"] = requeued
    return out


@router.get("/fields/{field_id}/backfill")
async def get_backfill(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Current (queued/running) job, or the most recent one, plus the field's existing
    per-year scene coverage so the UI can pre-select the years worth requesting."""
    fid = _uuid(field_id, "invalid_field_id")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, fid)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            f"""select {_SELECT} from public.field_backfill_jobs
                where field_id=$1::uuid order by created_at desc""", fid)
        cov = await conn.fetch(
            """select extract(year from acquired_at)::int as y, count(*)::int as n
               from public.scenes where field_id=$1::uuid
               group by 1 order by 1""", fid)
    jobs = [_job_out(r) for r in rows]
    current = next((j for j in jobs if j["active"]), jobs[0] if jobs else None)
    return {
        "current": current,
        "jobs": jobs,
        "min_year": MIN_YEAR,
        "max_year": date.today().year,
        "max_span": MAX_SPAN_YEARS,
        "covered_years": [{"year": r["y"], "scenes": r["n"]} for r in cov],
    }


@router.delete("/backfill/{job_id}")
async def cancel_backfill(job_id: str, user_id: str = Depends(get_current_user_id)):
    """Cancel a job that has not started yet. A running job is left alone (the geo worker
    owns it); it finishes or the worker's stale-recovery re-queues it."""
    jid = _uuid(job_id, "invalid_job_id")
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            """select b.id, b.status, f.org_id
               from public.field_backfill_jobs b
               join public.fields f on f.id = b.field_id
               where b.id=$1::uuid""", jid)
        if not row:
            raise HTTPException(status_code=404, detail="job_not_found")
        await require_role(conn, user_id, str(row["org_id"]), ROLES_WRITE)
        if row["status"] != "queued":
            raise HTTPException(status_code=409, detail="job_not_cancelable")
        deleted = await conn.fetchval(
            "delete from public.field_backfill_jobs where id=$1::uuid and status='queued' "
            "returning id", jid)
        if not deleted:                                 # claimed by the worker in the meantime
            raise HTTPException(status_code=409, detail="job_not_cancelable")
    return {"ok": True, "id": jid}
