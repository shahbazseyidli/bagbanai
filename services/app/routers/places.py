"""Non-field map places — B16 (HYBRID_PLAN W7, db/migrations/0040_share_places.sql).

Everything on a farm map that is NOT a crop field: buildings, water lines, storages, hazards,
roads. public.map_places.geom is geometry(Geometry,4326) so a place may be a Point, a LineString
or a Polygon. Rows are org-scoped and soft-deleted (deleted_at).

public.map_places carries no RLS policy, so access control is entirely the server-side gating
below: every endpoint resolves the owning org and calls require_member (read) / require_role
(write). `kind` is free text in the DB but is validated against a closed set here — an unchecked
value would create a category nothing can render (and casting user text into an enum column has
already caused a 22P02 -> 500 in this repo)."""
import json
import uuid as _uuid_mod
from typing import Any, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role

router = APIRouter(prefix="/api", tags=["places"])

# Allowed map_places.kind labels (0040 comment). Validated in Python -> 400.
KINDS = {"building", "water", "storage", "hazard", "road", "other"}

# GeoJSON geometry types the column accepts, and the matching PostGIS geometrytype() labels.
GEOM_TYPES = {"Point", "LineString", "Polygon"}
_PG_GEOM_TYPES = {"POINT", "LINESTRING", "POLYGON"}

_MAX_NAME = 200
_MAX_NOTES = 4000

_SELECT = ("id, org_id, farm_id, field_id, name, kind, notes, created_at, updated_at, "
           "st_asgeojson(geom) as geom")


# ---------- input models (kept local on purpose — schemas.py is shared) ----------
class PlaceIn(BaseModel):
    name: str
    kind: str = "other"
    geometry: dict[str, Any]            # GeoJSON geometry: Point | LineString | Polygon
    notes: Optional[str] = None
    farm_id: Optional[str] = None
    field_id: Optional[str] = None


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    notes: Optional[str] = None
    geometry: Optional[dict[str, Any]] = None


# ---------- validation helpers ----------
def _as_uuid(value: str, detail: str) -> str:
    """Reject a malformed id in Python: `$1::uuid` on junk raises Postgres 22P02 -> HTTP 500."""
    try:
        return str(_uuid_mod.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail=detail)


def _clean_name(value: Optional[str]) -> str:
    name = (str(value or "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="name_required")
    return name[:_MAX_NAME]


def _clean_notes(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    notes = str(value).strip()
    return notes[:_MAX_NOTES] if notes else None


def _clean_kind(value: Optional[str]) -> str:
    kind = (str(value or "other")).strip().lower()
    if kind not in KINDS:
        raise HTTPException(status_code=400, detail="invalid_kind")
    return kind


def _geometry_json(geometry: Any) -> str:
    """Shallow-validate a GeoJSON geometry and return it as a JSON string for st_geomfromgeojson."""
    if not isinstance(geometry, dict):
        raise HTTPException(status_code=400, detail="geometry_required")
    gtype = geometry.get("type")
    if gtype not in GEOM_TYPES:
        raise HTTPException(status_code=400, detail="unsupported_geometry_type")
    coords = geometry.get("coordinates")
    if not isinstance(coords, list) or not coords:
        raise HTTPException(status_code=400, detail="invalid_geometry")
    try:
        return json.dumps({"type": gtype, "coordinates": coords})
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="invalid_geometry")


async def _check_geometry(conn, geojson: str) -> None:
    """Let PostGIS be the final word on the geometry (parseable, valid, right type)."""
    try:
        chk = await conn.fetchrow(
            """select geometrytype(g) as gtype, st_isvalid(g) as valid, st_isempty(g) as empty
               from (select st_setsrid(st_geomfromgeojson($1::text),4326) as g) s""", geojson)
    except asyncpg.PostgresError:
        # The failed statement aborts the transaction; raising here rolls it back cleanly.
        raise HTTPException(status_code=400, detail="invalid_geometry")
    if chk is None or chk["gtype"] not in _PG_GEOM_TYPES:
        raise HTTPException(status_code=400, detail="unsupported_geometry_type")
    if chk["empty"]:
        raise HTTPException(status_code=400, detail="empty_geometry")
    if not chk["valid"]:
        raise HTTPException(status_code=400, detail="invalid_geometry")


async def _org_of_place(conn, place_id: str) -> str:
    org_id = await conn.fetchval(
        "select org_id from public.map_places where id=$1::uuid and deleted_at is null", place_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="place_not_found")
    return str(org_id)


def _feature(r) -> dict:
    """One GeoJSON Feature — mirrors how fields.py hands geometry to the map (st_asgeojson +
    json.loads), but wrapped as a Feature so a place list drops straight into MapLibre."""
    return {
        "type": "Feature",
        "id": str(r["id"]),
        "geometry": json.loads(r["geom"]) if r["geom"] else None,
        "properties": {
            "id": str(r["id"]),
            "org_id": str(r["org_id"]),
            "farm_id": str(r["farm_id"]) if r["farm_id"] else None,
            "field_id": str(r["field_id"]) if r["field_id"] else None,
            "name": r["name"],
            "kind": r["kind"],
            "notes": r["notes"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        },
    }


# ---------- endpoints ----------
@router.get("/orgs/{org_id}/places")
async def list_places(org_id: str, kind: Optional[str] = Query(default=None),
                      farm_id: Optional[str] = Query(default=None),
                      user_id: str = Depends(get_current_user_id)):
    """All non-deleted places of an org as a GeoJSON FeatureCollection."""
    oid = _as_uuid(org_id, "invalid_org_id")
    args: list = [oid]
    where = ["org_id=$1::uuid", "deleted_at is null"]
    if kind:
        args.append(_clean_kind(kind)); where.append(f"kind=${len(args)}")
    if farm_id:
        args.append(_as_uuid(farm_id, "invalid_farm_id")); where.append(f"farm_id=${len(args)}::uuid")
    sql = (f"select {_SELECT} from public.map_places where " + " and ".join(where) +
           " order by kind, name")
    async with connection(user_id) as conn:
        await require_member(conn, user_id, oid)
        rows = await conn.fetch(sql, *args)
    return {"type": "FeatureCollection", "features": [_feature(r) for r in rows]}


@router.post("/orgs/{org_id}/places")
async def create_place(org_id: str, body: PlaceIn, user_id: str = Depends(get_current_user_id)):
    """Create a place from a GeoJSON geometry (agronomist+)."""
    oid = _as_uuid(org_id, "invalid_org_id")
    name = _clean_name(body.name)
    kind = _clean_kind(body.kind)
    notes = _clean_notes(body.notes)
    geojson = _geometry_json(body.geometry)
    farm_id = _as_uuid(body.farm_id, "invalid_farm_id") if body.farm_id else None
    field_id = _as_uuid(body.field_id, "invalid_field_id") if body.field_id else None

    async with connection(user_id) as conn:
        await require_role(conn, user_id, oid, ROLES_WRITE)
        # A place may hang off a farm / field, but only one inside the SAME org.
        if farm_id and not await conn.fetchval(
                "select 1 from public.farms where id=$1::uuid and org_id=$2::uuid", farm_id, oid):
            raise HTTPException(status_code=400, detail="farm_not_in_org")
        if field_id and not await conn.fetchval(
                "select 1 from public.fields where id=$1::uuid and org_id=$2::uuid "
                "and deleted_at is null", field_id, oid):
            raise HTTPException(status_code=400, detail="field_not_in_org")
        await _check_geometry(conn, geojson)
        row = await conn.fetchrow(
            f"""with ins as (
                  insert into public.map_places
                    (org_id, farm_id, field_id, name, kind, geom, notes, created_by)
                  select $1::uuid, $2::uuid, $3::uuid, $4, $5,
                         st_setsrid(st_geomfromgeojson($6::text),4326), $7, $8::uuid
                  returning *
                )
                select {_SELECT} from ins""",
            oid, farm_id, field_id, name, kind, geojson, notes, user_id)
    return _feature(row)


@router.put("/places/{place_id}")
async def update_place(place_id: str, body: PlaceUpdate,
                       user_id: str = Depends(get_current_user_id)):
    """Rename / recategorise / re-note / re-locate a place (agronomist+)."""
    pid = _as_uuid(place_id, "invalid_place_id")
    sets: list[str] = []
    args: list = []
    geojson: Optional[str] = None
    if body.name is not None:
        args.append(_clean_name(body.name)); sets.append(f"name=${len(args)}")
    if body.kind is not None:
        args.append(_clean_kind(body.kind)); sets.append(f"kind=${len(args)}")
    if body.notes is not None:
        args.append(_clean_notes(body.notes)); sets.append(f"notes=${len(args)}")
    if body.geometry is not None:
        geojson = _geometry_json(body.geometry)
        args.append(geojson)
        sets.append(f"geom=st_setsrid(st_geomfromgeojson(${len(args)}::text),4326)")
    if not sets:
        raise HTTPException(status_code=400, detail="nothing_to_update")
    args.append(pid)
    sql = (f"update public.map_places set {', '.join(sets)} "
           f"where id=${len(args)}::uuid and deleted_at is null returning {_SELECT}")

    async with connection(user_id) as conn:
        org_id = await _org_of_place(conn, pid)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        if geojson is not None:
            await _check_geometry(conn, geojson)
        row = await conn.fetchrow(sql, *args)
    if not row:
        raise HTTPException(status_code=404, detail="place_not_found")
    return _feature(row)


@router.delete("/places/{place_id}")
async def delete_place(place_id: str, user_id: str = Depends(get_current_user_id)):
    """Soft-delete (stamps deleted_at) so the row survives for history/undo."""
    pid = _as_uuid(place_id, "invalid_place_id")
    async with connection(user_id) as conn:
        org_id = await _org_of_place(conn, pid)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await conn.execute(
            "update public.map_places set deleted_at=now() where id=$1::uuid and deleted_at is null",
            pid)
    return {"ok": True}
