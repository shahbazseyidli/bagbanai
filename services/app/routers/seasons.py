"""Season / planting entity + lifecycle status (HYBRID_PLAN W6, B3).

public.field_metadata is 1:1 with the field and is fully overwritten on every save, so replanting
used to erase last year's crop and no rotation history survived. public.field_seasons (0034) gives
every planting its own row with a lifecycle status; public.field_season_events keeps the transition
audit ("when did it move to Yığım").

Gating is server-side: field-scoped routes resolve the org from the field, season-scoped routes
resolve it through the season's field. RLS is defence-in-depth only.

Request models are declared here on purpose (isolated from ..schemas)."""
from datetime import date
from decimal import Decimal
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["seasons"])

# Lifecycle vocabulary (0034 comment). Anything else is rejected with 400 before it reaches the DB
# (the column is plain text — a bad value would otherwise be stored happily and break the UI).
STATUSES = ("preparation", "planted", "vegetation", "harvest", "fallow", "closed")

_SELECT = ("id, field_id, org_id, season_year, crop_type, variety, crop_cycle, status, "
           "planting_date, emergence_date, expected_harvest, actual_harvest_date, growth_stage, "
           "stage_source, stage_updated_at, seeding_density, target_yield, area_ha, is_current, "
           "source, notes, created_at, updated_at")


# ---------- request models ----------
class SeasonIn(BaseModel):
    season_year: int = Field(ge=1990, le=2100)
    crop_type: Optional[str] = None
    variety: Optional[str] = None
    crop_cycle: Optional[str] = None
    status: str = "preparation"
    planting_date: Optional[date] = None
    emergence_date: Optional[date] = None
    expected_harvest: Optional[date] = None
    growth_stage: Optional[str] = None
    seeding_density: Optional[float] = None
    target_yield: Optional[float] = None
    is_current: bool = True
    notes: Optional[str] = None

    # Browser forms post "" for untouched date/number inputs — treat that as "not provided"
    # instead of failing validation with a 422 the farmer cannot act on.
    @field_validator("planting_date", "emergence_date", "expected_harvest",
                     "seeding_density", "target_yield", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


class SeasonUpdateIn(BaseModel):
    """Partial update — only the keys actually sent are written (model_fields_set)."""
    season_year: Optional[int] = Field(default=None, ge=1990, le=2100)
    crop_type: Optional[str] = None
    variety: Optional[str] = None
    crop_cycle: Optional[str] = None
    status: Optional[str] = None
    planting_date: Optional[date] = None
    emergence_date: Optional[date] = None
    expected_harvest: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    growth_stage: Optional[str] = None
    seeding_density: Optional[float] = None
    target_yield: Optional[float] = None
    notes: Optional[str] = None
    # Set true (or send actual_harvest_date) to confirm the harvest when moving to 'harvest'.
    confirm_harvest: bool = False
    note: Optional[str] = None  # goes on the transition event, not the season row

    @field_validator("planting_date", "emergence_date", "expected_harvest", "actual_harvest_date",
                     "seeding_density", "target_yield", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


class SeasonStatusIn(BaseModel):
    status: str
    occurred_on: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    note: Optional[str] = None

    @field_validator("occurred_on", "actual_harvest_date", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


# ---------- helpers ----------
def _num(v) -> Optional[Decimal]:
    """numeric columns take Decimal — go through str() so 0.1 stays 0.1."""
    return None if v is None else Decimal(str(v))


def _f(v) -> Optional[float]:
    return None if v is None else float(v)


def _d(v) -> Optional[str]:
    return v.isoformat() if v is not None else None


def _check_status(value: str) -> str:
    s = (value or "").strip().lower()
    if s not in STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")
    return s


def _season_out(r) -> dict:
    today = date.today()
    planting = r["planting_date"]
    expected = r["expected_harvest"]
    actual = r["actual_harvest_date"]
    harvested = actual is not None or r["status"] in ("closed",)
    return {
        "id": str(r["id"]),
        "field_id": str(r["field_id"]),
        "org_id": str(r["org_id"]),
        "season_year": r["season_year"],
        "crop_type": r["crop_type"] or "",
        "variety": r["variety"],
        "crop_cycle": r["crop_cycle"],
        "status": r["status"],
        "planting_date": _d(planting),
        "emergence_date": _d(r["emergence_date"]),
        "expected_harvest": _d(expected),
        "actual_harvest_date": _d(actual),
        "growth_stage": r["growth_stage"],
        "stage_source": r["stage_source"],
        "stage_updated_at": r["stage_updated_at"].isoformat() if r["stage_updated_at"] else None,
        "seeding_density": _f(r["seeding_density"]),
        "target_yield": _f(r["target_yield"]),
        "area_ha": _f(r["area_ha"]),
        "is_current": bool(r["is_current"]),
        "source": r["source"],
        "notes": r["notes"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        # Computed: negative days_since_planting = planting still ahead; days_to_harvest is null
        # once the harvest is actually recorded.
        "days_since_planting": (today - planting).days if planting else None,
        "days_to_harvest": (expected - today).days if (expected and not harvested) else None,
    }


async def _season_ctx(conn, season_id: str):
    """Season row + the org resolved through its field (404 when missing)."""
    row = await conn.fetchrow(
        "select s.id, s.field_id, s.status, s.actual_harvest_date, f.org_id "
        "from public.field_seasons s join public.fields f on f.id = s.field_id "
        "where s.id=$1::uuid", season_id)
    if not row:
        raise HTTPException(status_code=404, detail="season_not_found")
    return row


async def _clear_current(conn, field_id: str, keep_id: Optional[str] = None) -> None:
    """Only one current season per field (partial unique index field_seasons_current_uq) — the
    clear MUST happen in the same transaction as the insert/update that sets the new one."""
    if keep_id:
        await conn.execute(
            "update public.field_seasons set is_current=false "
            "where field_id=$1::uuid and is_current and id <> $2::uuid", field_id, keep_id)
    else:
        await conn.execute(
            "update public.field_seasons set is_current=false "
            "where field_id=$1::uuid and is_current", field_id)


async def _log_event(conn, season_id: str, field_id: str, org_id: str,
                     from_status: Optional[str], to_status: str, user_id: str,
                     occurred_on: Optional[date] = None, note: Optional[str] = None,
                     source: str = "manual") -> None:
    await conn.execute(
        """insert into public.field_season_events
             (season_id, field_id, org_id, from_status, to_status, occurred_on, source, note, created_by)
           values ($1::uuid,$2::uuid,$3::uuid,$4,$5,coalesce($6::date, current_date),$7,$8,$9::uuid)""",
        season_id, field_id, org_id, from_status, to_status, occurred_on, source, note, user_id)


# ---------- field-scoped ----------
@router.get("/fields/{field_id}/seasons")
async def list_seasons(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            f"select {_SELECT} from public.field_seasons where field_id=$1::uuid "
            "order by season_year desc, created_at desc", field_id)
    return [_season_out(r) for r in rows]


@router.get("/fields/{field_id}/seasons/current")
async def current_season(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        row = await conn.fetchrow(
            f"select {_SELECT} from public.field_seasons where field_id=$1::uuid and is_current "
            "order by season_year desc limit 1", field_id)
    return _season_out(row) if row else None


@router.post("/fields/{field_id}/seasons")
async def create_season(field_id: str, body: SeasonIn,
                        user_id: str = Depends(get_current_user_id)):
    status = _check_status(body.status)
    crop = (body.crop_type or "").strip()
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        # Snapshot the field's area at season start (0034: area_ha).
        area = await conn.fetchval(
            "select area_ha from public.fields where id=$1::uuid and deleted_at is null", field_id)
        if body.is_current:
            await _clear_current(conn, field_id)
        try:
            row = await conn.fetchrow(
                f"""insert into public.field_seasons
                      (field_id, org_id, season_year, crop_type, variety, crop_cycle, status,
                       planting_date, emergence_date, expected_harvest, growth_stage,
                       seeding_density, target_yield, area_ha, is_current, source, notes, created_by)
                    values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::date,$9::date,$10::date,$11,
                            $12::numeric,$13::numeric,$14::numeric,$15,'manual',$16,$17::uuid)
                    returning {_SELECT}""",
                field_id, org_id, body.season_year, crop, body.variety, body.crop_cycle, status,
                body.planting_date, body.emergence_date, body.expected_harvest, body.growth_stage,
                _num(body.seeding_density), _num(body.target_yield), _num(area),
                body.is_current, body.notes, user_id)
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=409, detail="season_exists")
        await _log_event(conn, str(row["id"]), field_id, org_id, None, status, user_id,
                         occurred_on=body.planting_date)
    return _season_out(row)


# ---------- season-scoped ----------
@router.put("/seasons/{season_id}")
async def update_season(season_id: str, body: SeasonUpdateIn,
                        user_id: str = Depends(get_current_user_id)):
    sent = body.model_fields_set
    new_status = _check_status(body.status) if "status" in sent and body.status is not None else None
    async with connection(user_id) as conn:
        ctx = await _season_ctx(conn, season_id)
        org_id, field_id = str(ctx["org_id"]), str(ctx["field_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)

        sets: list[str] = []
        args: list = [season_id]

        def add(col: str, val, cast: str = "") -> None:
            args.append(val)
            sets.append(f"{col}=${len(args)}{cast}")

        if "season_year" in sent and body.season_year is not None:
            add("season_year", body.season_year)
        if "crop_type" in sent:
            add("crop_type", (body.crop_type or "").strip())
        for col in ("variety", "crop_cycle", "notes"):
            if col in sent:
                add(col, getattr(body, col))
        if "growth_stage" in sent:
            add("growth_stage", body.growth_stage)
            add("stage_source", "manual")
            sets.append("stage_updated_at=now()")
        for col in ("planting_date", "emergence_date", "expected_harvest"):
            if col in sent:
                add(col, getattr(body, col), "::date")
        for col in ("seeding_density", "target_yield"):
            if col in sent:
                add(col, _num(getattr(body, col)), "::numeric")

        from_status = ctx["status"]
        changed_status = new_status is not None and new_status != from_status
        if new_status is not None:
            add("status", new_status)

        # Harvest date: an explicit value always wins; otherwise moving to 'harvest' only stamps
        # today when the body confirms it (confirm_harvest), never silently.
        harvest_date = None
        if "actual_harvest_date" in sent:
            harvest_date = body.actual_harvest_date
            add("actual_harvest_date", harvest_date, "::date")
        elif changed_status and new_status == "harvest" and body.confirm_harvest \
                and ctx["actual_harvest_date"] is None:
            harvest_date = date.today()
            add("actual_harvest_date", harvest_date, "::date")

        if not sets:
            row = await conn.fetchrow(
                f"select {_SELECT} from public.field_seasons where id=$1::uuid", season_id)
            return _season_out(row)

        try:
            row = await conn.fetchrow(
                f"update public.field_seasons set {', '.join(sets)} where id=$1::uuid "
                f"returning {_SELECT}", *args)
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=409, detail="season_exists")
        if changed_status:
            await _log_event(conn, season_id, field_id, org_id, from_status, new_status, user_id,
                             occurred_on=harvest_date, note=body.note)
    return _season_out(row)


@router.post("/seasons/{season_id}/status")
async def set_season_status(season_id: str, body: SeasonStatusIn,
                            user_id: str = Depends(get_current_user_id)):
    """Dedicated lifecycle transition — validates the target before it reaches the DB."""
    to_status = _check_status(body.status)
    async with connection(user_id) as conn:
        ctx = await _season_ctx(conn, season_id)
        org_id, field_id = str(ctx["org_id"]), str(ctx["field_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        from_status = ctx["status"]
        # Moving into 'harvest' records the harvest date (explicit value wins, else today) so the
        # season carries a real end date; other transitions leave it untouched.
        harvest_date = body.actual_harvest_date
        if to_status == "harvest" and harvest_date is None and ctx["actual_harvest_date"] is None:
            harvest_date = body.occurred_on or date.today()
        if harvest_date is not None and to_status == "harvest":
            row = await conn.fetchrow(
                f"update public.field_seasons set status=$2, actual_harvest_date=$3::date "
                f"where id=$1::uuid returning {_SELECT}", season_id, to_status, harvest_date)
        else:
            row = await conn.fetchrow(
                f"update public.field_seasons set status=$2 where id=$1::uuid returning {_SELECT}",
                season_id, to_status)
        if from_status != to_status:
            await _log_event(conn, season_id, field_id, org_id, from_status, to_status, user_id,
                             occurred_on=body.occurred_on, note=body.note)
    return _season_out(row)


@router.post("/seasons/{season_id}/current")
async def make_current(season_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        ctx = await _season_ctx(conn, season_id)
        org_id, field_id = str(ctx["org_id"]), str(ctx["field_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        # Clear first — field_seasons_current_uq is a partial unique index on (field_id).
        await _clear_current(conn, field_id, keep_id=season_id)
        row = await conn.fetchrow(
            f"update public.field_seasons set is_current=true where id=$1::uuid returning {_SELECT}",
            season_id)
    return _season_out(row)


@router.delete("/seasons/{season_id}")
async def delete_season(season_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        ctx = await _season_ctx(conn, season_id)
        org_id, field_id = str(ctx["org_id"]), str(ctx["field_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        was_current = await conn.fetchval(
            "delete from public.field_seasons where id=$1::uuid returning is_current", season_id)
        promoted = None
        if was_current:
            # Never leave the field without a current season while others remain.
            promoted = await conn.fetchval(
                """update public.field_seasons set is_current=true where id = (
                     select id from public.field_seasons where field_id=$1::uuid
                     order by season_year desc, created_at desc limit 1)
                   returning id""", field_id)
    return {"ok": True, "promoted_id": str(promoted) if promoted else None}
