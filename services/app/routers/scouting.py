"""Scouting observations (FR-11, §14). worker+ can add; members read. Photos via /api/uploads."""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..display import public_display_name
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


def _row_out(r: Any) -> dict:
    """One serialiser for both scopes.

    Extracted so a note read through the org list and the same note read through its field can
    never disagree about a type. `field_name` rides through untouched: it exists only in the
    org statement's column list, and dict(row) carries exactly the columns that were selected."""
    d = dict(r)
    d["id"] = str(d["id"])
    d["field_id"] = str(d["field_id"])
    d["created_by"] = str(d["created_by"]) if d["created_by"] else None
    # WHO WROTE THIS. created_by has been stored since 0005 and returned as a bare UUID that no
    # screen rendered, so two people sharing an organization produced a note log in which nobody
    # could tell who had written what — the exact gap the research corpus says was reported against
    # the competitor within ten days of their multi-user launch. The name goes through
    # public_display_name so a farmer who turned off name visibility (0045) stays an alias here
    # too; the raw columns that decision needs are dropped rather than shipped to the client.
    d["author"] = public_display_name(
        d.pop("full_name", None), d.pop("author_role", None),
        d.pop("name_public", None), d.get("created_by")) if d.get("created_by") else None
    d["severity"] = _severity_out(d["severity"])
    d["color"] = _color(d["color"])
    d["status"] = d["status"] or "open"
    d["lat"] = float(d["lat"]) if d["lat"] is not None else None
    d["lon"] = float(d["lon"]) if d["lon"] is not None else None
    d["observed_at"] = d["observed_at"].isoformat()
    d["resolved_at"] = d["resolved_at"].isoformat() if d["resolved_at"] else None
    return d


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
async def list_obs(
    field_id: Optional[str] = Query(default=None),
    org_id: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
):
    """Notes for ONE field, or for a whole org. Exactly one scope — never neither, never both.

    The two scopes are two SEPARATE literal statements chosen by an `if`, not one statement with an
    interpolated WHERE. A branch that swaps predicates while still passing every argument leaves the
    statement with parameters it never references, which asyncpg cannot type — see the comment in
    create_obs, where that was a real bug.

    The response SHAPES differ on purpose. Field scope returns a BARE array, because that is what it
    has always returned and the field page types it that way; org scope returns {"items": [...]},
    leaving room for the list to grow a cursor or a total later without breaking the field read.

    `limit` binds the ORG statement ONLY. The field read stays unbounded: silently truncating a
    farmer's own notes for one field would be a quiet data lie, and one field genuinely holds tens
    of notes. A parameter that does nothing in one mode is worse than a sentence saying so."""
    # An explicit 422 rather than FastAPI's implicit one: making field_id optional removed the
    # required-parameter guard that used to reject "neither" for us. `?field_id=` is not a scope.
    field_id = (field_id or "").strip() or None
    org_id = (org_id or "").strip() or None
    if field_id and org_id:
        raise HTTPException(status_code=422, detail="scouting_scope_ambiguous")
    if not field_id and not org_id:
        raise HTTPException(status_code=422, detail="scouting_scope_required")

    if field_id:
        async with connection(user_id) as conn:
            owner_org = await _org_of_field(conn, field_id)
            await require_member(conn, user_id, owner_org)
            # st_y/st_x, not st_asgeojson: the client has always typed these as lat/lon numbers, so
            # the GeoJSON this used to return matched nothing and the coordinate line never once
            # rendered. Resolved notes are returned TOO — "resolved is not deleted" only means
            # something if the row still arrives; the filter belongs to the client, which fades them.
            rows = await conn.fetch(
                """select o.id, o.field_id, o.category, o.severity, o.note, o.photos, o.color,
                          o.status, st_y(o.geom) as lat, st_x(o.geom) as lon,
                          o.created_by, o.observed_at, o.resolved_at,
                          u.full_name, u.role as author_role, u.name_public
                   from public.scouting_observations o
                   left join public.users u on u.id = o.created_by
                   where o.field_id=$1::uuid order by o.observed_at desc""",
                field_id)
        return [_row_out(r) for r in rows]

    # Not an `else`: the two guards above leave org scope as the only remaining case. Narrowing
    # happens on org_id ITSELF here — safe_uuid returns a plain str — rather than being inferred
    # from the state of field_id, so the invariant lives in one variable instead of across two.
    scope_org = safe_uuid(org_id, "org_not_found")
    async with connection(user_id) as conn:
        # The same gate the field path reaches after _org_of_field, applied one step earlier.
        await require_member(conn, user_id, scope_org)
        # Filtered on o.org_id, not on a farms join: that is the very column the scouting_read
        # policy (0007) reads, so the server-side gate and the row filter cannot drift apart.
        # The join to public.fields does double duty — it supplies field_name (fields.name is
        # NOT NULL, 0003) and carries `f.deleted_at is null`, matching how every other org-scoped
        # read is written, so a soft-deleted field never surfaces its notes.
        # `o.id desc` only breaks ties on identical observed_at, keeping the page order stable.
        rows = await conn.fetch(
            """select o.id, o.field_id, f.name as field_name, o.category, o.severity, o.note,
                      o.photos, o.color, o.status,
                      st_y(o.geom) as lat, st_x(o.geom) as lon,
                      o.created_by, o.observed_at, o.resolved_at,
                      u.full_name, u.role as author_role, u.name_public
               from public.scouting_observations o
               join public.fields f on f.id = o.field_id
               left join public.users u on u.id = o.created_by
               where o.org_id=$1::uuid and f.deleted_at is null
               order by o.observed_at desc, o.id desc
               limit $2""",
            # ONE MORE than asked for. `limit` alone makes truncation invisible: a response of
            # exactly `limit` rows is indistinguishable from a farm that happens to have exactly
            # that many notes, so the client either stays silent about a truncated log or prints a
            # total it cannot support. Reading limit+1 and slicing back turns "is there more" into
            # an observed fact for the cost of a single row.
            scope_org, limit + 1)
    has_more = len(rows) > limit
    return {"items": [_row_out(r) for r in rows[:limit]], "has_more": has_more}


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
