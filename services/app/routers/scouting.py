"""Scouting observations (FR-11, §14). worker+ can add; members read. Photos via /api/uploads."""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import (
    ROLES_ADMIN, ROLES_WORKER, get_current_user_id, require_member, require_role, safe_uuid,
)
from ..schemas import ScoutingIn, ScoutingUpdateIn
from .fields import _org_of_field

router = APIRouter(prefix="/api/scouting", tags=["scouting"])

# Kept in lockstep with scouting_color_chk (migration 0054) and with the frontend's name→hex table
# (app/src/components/field/scouting/pins.ts). The database stores the NAME; the hex is a design
# decision and belongs where the design lives.
PIN_COLORS = ("red", "orange", "yellow", "green", "blue", "violet", "pink")
DEFAULT_COLOR = "red"

STATUSES = ("open", "resolved")


def _color(value: Optional[str]) -> str:
    """An unrecognised colour becomes the default rather than a 400.

    The CHECK constraint is the real guard; rejecting the whole note because a client sent a colour
    this build has never heard of would lose the farmer's text over a swatch."""
    return value if value in PIN_COLORS else DEFAULT_COLOR


def _severity_out(raw: Any) -> Optional[int]:
    """Read severity back tolerantly.

    The column is `text` and always was: the original design stored low|medium|high (0005), the UI
    has only ever offered 1..5, and an `alter … using severity::int` would fail the migration on any
    surviving legacy row. So the column keeps both vocabularies and this maps them to one number."""
    if raw is None:
        return None
    s = str(raw).strip().lower()
    legacy = {"low": 2, "medium": 3, "high": 5}
    if s in legacy:
        return legacy[s]
    try:
        n = int(s)
    except ValueError:
        return None
    return n if 1 <= n <= 5 else None


@router.post("")
async def create_obs(body: ScoutingIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, body.field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        # One statement, no interpolated branch. The old version swapped `st_setsrid(st_point($5,$6)
        # ,4326)` for the literal `null` when there were no coordinates, but still PASSED $5 and $6
        # — leaving the statement with parameters it never references, which asyncpg cannot type.
        # ST_Point and ST_SetSRID are both STRICT, so NULL in is NULL out and the plain expression
        # already means "no location".
        row = await conn.fetchrow(
            """insert into public.scouting_observations
                 (field_id, org_id, created_by, category, severity, note, photos, color, geom)
               values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::text[],$8,
                       st_setsrid(st_point($9::double precision,$10::double precision),4326))
               returning id, observed_at""",
            body.field_id, org_id, user_id, body.category,
            None if body.severity is None else str(body.severity),
            body.note, body.photos, _color(body.color),
            body.lon, body.lat)
    return {"id": str(row["id"]), "observed_at": row["observed_at"].isoformat()}


@router.get("")
async def list_obs(field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        # st_y/st_x, not st_asgeojson: the client has always typed these as lat/lon numbers, so the
        # GeoJSON this used to return matched nothing and the coordinate line never once rendered.
        # Resolved notes are returned TOO — "resolved is not deleted" only means something if the
        # row still arrives; the filter belongs to the client, which shows them faded.
        rows = await conn.fetch(
            """select id, field_id, category, severity, note, photos, color, status,
                      st_y(geom) as lat, st_x(geom) as lon,
                      created_by, observed_at, resolved_at
               from public.scouting_observations where field_id=$1::uuid order by observed_at desc""",
            field_id)
    out = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"])
        d["field_id"] = str(d["field_id"])
        d["created_by"] = str(d["created_by"]) if d["created_by"] else None
        d["severity"] = _severity_out(d["severity"])
        d["color"] = _color(d["color"])
        d["status"] = d["status"] or "open"
        d["lat"] = float(d["lat"]) if d["lat"] is not None else None
        d["lon"] = float(d["lon"]) if d["lon"] is not None else None
        d["observed_at"] = d["observed_at"].isoformat()
        d["resolved_at"] = d["resolved_at"].isoformat() if d["resolved_at"] else None
        out.append(d)
    return out


@router.patch("/{obs_id}")
async def update_obs(obs_id: str, body: ScoutingUpdateIn, user_id: str = Depends(get_current_user_id)):
    obs_id = safe_uuid(obs_id, "scouting_not_found")
    sets: list[str] = []
    args: list[Any] = []

    def add(sql: str, value: Any) -> None:
        args.append(value)
        sets.append(sql.format(n=len(args)))

    # model_fields_set, not truthiness: "note omitted" and "note cleared" are different edits, and
    # a client that sends {"note": null} means the second one.
    given = body.model_fields_set
    if "category" in given and body.category:
        add("category=${n}", body.category)
    if "severity" in given:
        add("severity=${n}", None if body.severity is None else str(body.severity))
    if "note" in given:
        add("note=${n}", body.note)
    if "color" in given:
        add("color=${n}", _color(body.color))
    if "status" in given:
        if body.status not in STATUSES:
            raise HTTPException(status_code=400, detail="scouting_bad_status")
        add("status=${n}", body.status)
        # The router owns the pairing so the two can never disagree: resolving stamps the date,
        # reopening clears it. Nothing else in the system writes resolved_at.
        sets.append("resolved_at=" + ("now()" if body.status == "resolved" else "null"))

    # Coordinates move together or not at all — a point with one axis is not a place. Both present
    # → set the geometry; both explicitly null → clear it; anything else → leave it alone.
    if "lat" in given and "lon" in given:
        if body.lat is not None and body.lon is not None:
            args.append(body.lon)
            lon_n = len(args)
            args.append(body.lat)
            sets.append(
                f"geom=st_setsrid(st_point(${lon_n}::double precision,"
                f"${len(args)}::double precision),4326)")
        elif body.lat is None and body.lon is None:
            sets.append("geom=null")

    if not sets:
        return {"ok": True, "updated": 0}

    async with connection(user_id) as conn:
        org_id = await conn.fetchval(
            "select org_id from public.scouting_observations where id=$1::uuid", obs_id)
        if not org_id:
            raise HTTPException(status_code=404, detail="scouting_not_found")
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        args.append(obs_id)
        res = await conn.execute(
            f"update public.scouting_observations set {', '.join(sets)} where id=${len(args)}::uuid",
            *args)
    # asyncpg returns the command tag, e.g. "UPDATE 1".
    try:
        updated = int(str(res).strip().split()[-1])
    except (ValueError, IndexError):
        updated = 0
    if updated == 0:
        raise HTTPException(status_code=404, detail="scouting_not_found")
    return {"ok": True, "updated": updated}


@router.delete("/{obs_id}")
async def delete_obs(obs_id: str, user_id: str = Depends(get_current_user_id)):
    """Hard delete, and deliberately not a soft one.

    'resolved' is the "I finished this" state and keeps the record; delete means "I typed this by
    mistake". A tombstone for a mistyped note serves nobody, and a second deleted_at column would
    make every read in the system carry another predicate."""
    obs_id = safe_uuid(obs_id, "scouting_not_found")
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select org_id, created_by from public.scouting_observations where id=$1::uuid", obs_id)
        if not row:
            raise HTTPException(status_code=404, detail="scouting_not_found")
        org_id = str(row["org_id"])
        # Mirrors the scouting_delete policy (0054): destroying someone else's record is narrower
        # than editing one, so it is the author or an org admin — not every worker.
        if str(row["created_by"] or "") != user_id:
            try:
                await require_role(conn, user_id, org_id, ROLES_ADMIN)
            except HTTPException as exc:
                # A named detail, because the client has a specific sentence for this case ("only
                # the author or an admin can delete this") and a bare "forbidden" would send it to
                # the generic error text. Only the 403 is renamed; anything else propagates.
                if exc.status_code != 403:
                    raise
                raise HTTPException(status_code=403, detail="scouting_delete_forbidden") from exc
        else:
            await require_member(conn, user_id, org_id)
        res = await conn.execute(
            "delete from public.scouting_observations where id=$1::uuid", obs_id)
    try:
        deleted = int(str(res).strip().split()[-1])
    except (ValueError, IndexError):
        deleted = 0
    if deleted == 0:
        raise HTTPException(status_code=404, detail="scouting_not_found")
    return {"ok": True}
