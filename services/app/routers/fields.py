"""Fields (FR-1) + field metadata (FR-5). PostGIS computes area/bbox on save.

Note (see CLAUDE.md): mgrs_tiles is populated by the HLS pipeline (Step 7), which has
the geo deps to intersect the field with the Sentinel-2 tile grid. Field creation
computes area_ha/centroid/bbox and validates the polygon."""
import json

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import ROLES_WORKER, ROLES_WRITE, get_current_user_id, require_member, require_role
from ..schemas import FieldIn, FieldMetadataIn, FieldOut

router = APIRouter(prefix="/api/fields", tags=["fields"])


async def _org_of_farm(conn, farm_id: str) -> str:
    org_id = await conn.fetchval("select org_id from public.farms where id=$1::uuid", farm_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="farm_not_found")
    return str(org_id)


async def _org_of_field(conn, field_id: str) -> str:
    org_id = await conn.fetchval("select org_id from public.fields where id=$1::uuid", field_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="field_not_found")
    return str(org_id)


@router.post("", response_model=FieldOut)
async def create_field(body: FieldIn, user_id: str = Depends(get_current_user_id)):
    geojson = json.dumps(body.geometry)
    async with connection(user_id) as conn:
        org_id = await _org_of_farm(conn, body.farm_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)

        # Validate geometry server-side (turf validates client-side too).
        chk = await conn.fetchrow(
            """select st_isvalid(g) as valid, geometrytype(g) as gtype, st_npoints(g) as npts,
                      st_area(g::geography)/10000.0 as area_ha
               from (select st_setsrid(st_geomfromgeojson($1),4326) as g) s""", geojson)
        if chk is None or chk["gtype"] != "POLYGON":
            raise HTTPException(status_code=400, detail="not_a_polygon")
        if not chk["valid"]:
            raise HTTPException(status_code=400, detail="invalid_polygon_self_intersection")
        if chk["npts"] < 4:  # closed ring: 3 distinct vertices + repeat
            raise HTTPException(status_code=400, detail="need_at_least_3_vertices")
        # Reject absurdly small fields: below ~0.05 ha (500 m²) no satellite pixel analysis is
        # possible (even Sentinel-2 10m gives ~5 pixels) and it is almost always a drawing error.
        if chk["area_ha"] is not None and float(chk["area_ha"]) < 0.05:
            raise HTTPException(status_code=400, detail="field_too_small")

        # Queue satellite processing (a cron worker picks it up within ~2 min). The UI
        # shows a "preparing…" banner with progress/ETA until data_status flips to ready.
        row = await conn.fetchrow(
            """insert into public.fields
                 (farm_id, org_id, name, geom, area_ha, bbox, created_by, data_status, data_eta_seconds)
               select $1::uuid, $2::uuid, $3, g.geom,
                      round((st_area(g.geom::geography)/10000.0)::numeric, 4),
                      st_envelope(g.geom), $5::uuid, 'queued', 600
               from (select st_setsrid(st_geomfromgeojson($4),4326) as geom) g
               returning id, farm_id, org_id, name, area_ha, mgrs_tiles""",
            body.farm_id, org_id, body.name, geojson, user_id)
        # Kick off Phase-1 knowledge research (soil + zone; crop blocks fill in once the
        # profile is added). Debounced via research_jobs; the worker picks it up (M4).
        try:
            from ..ai import jobs
            await jobs.enqueue(conn, field_id=str(row["id"]), org_id=org_id,
                               trigger_type="field_created", blocks=["ALL"])
        except Exception:  # noqa: BLE001 — research is best-effort, never blocks field creation
            pass
    return FieldOut(id=str(row["id"]), farm_id=str(row["farm_id"]), org_id=str(row["org_id"]),
                    name=row["name"], area_ha=float(row["area_ha"]) if row["area_ha"] is not None else None,
                    mgrs_tiles=row["mgrs_tiles"])


@router.get("", response_model=list[FieldOut])
async def list_fields(farm_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_farm(conn, farm_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            "select id, farm_id, org_id, name, area_ha, mgrs_tiles from public.fields where farm_id=$1::uuid order by created_at",
            farm_id)
    return [FieldOut(id=str(r["id"]), farm_id=str(r["farm_id"]), org_id=str(r["org_id"]), name=r["name"],
                     area_ha=float(r["area_ha"]) if r["area_ha"] is not None else None,
                     mgrs_tiles=r["mgrs_tiles"]) for r in rows]


@router.get("/{field_id}")
async def get_field(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        row = await conn.fetchrow(
            """select id, farm_id, org_id, name, area_ha, mgrs_tiles,
                      st_asgeojson(geom) as geom, st_asgeojson(centroid) as centroid,
                      data_status, data_progress_done, data_progress_total, data_eta_seconds
               from public.fields where id=$1::uuid""", field_id)
    return dict(id=str(row["id"]), farm_id=str(row["farm_id"]), org_id=str(row["org_id"]),
                name=row["name"], area_ha=float(row["area_ha"]) if row["area_ha"] is not None else None,
                mgrs_tiles=row["mgrs_tiles"], geom=json.loads(row["geom"]),
                centroid=json.loads(row["centroid"]) if row["centroid"] else None,
                data_status=row["data_status"], data_progress_done=row["data_progress_done"],
                data_progress_total=row["data_progress_total"], data_eta_seconds=row["data_eta_seconds"])


@router.get("/{field_id}/data-status")
async def data_status(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Lightweight poll target for the 'preparing…' banner (progress + ETA)."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        r = await conn.fetchrow(
            """select data_status, data_progress_done, data_progress_total,
                      data_eta_seconds, data_ready_at
               from public.fields where id=$1::uuid""", field_id)
    return dict(status=r["data_status"], done=r["data_progress_done"],
                total=r["data_progress_total"], eta_seconds=r["data_eta_seconds"],
                ready_at=r["data_ready_at"].isoformat() if r["data_ready_at"] else None)


@router.get("/{field_id}/metadata")
async def get_metadata(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        row = await conn.fetchrow("select * from public.field_metadata where field_id=$1::uuid", field_id)
    if not row:
        return None
    d = dict(row)
    for k in ("difficulties", "rotation_history", "fertilizer_history", "prior_yields", "pest_history"):
        if isinstance(d.get(k), str):
            d[k] = json.loads(d[k])
    d["field_id"] = str(d["field_id"])
    for k in ("planting_date", "expected_harvest", "updated_at"):
        if d.get(k) is not None:
            d[k] = d[k].isoformat()
    return d


@router.put("/{field_id}/metadata")
async def put_metadata(field_id: str, body: FieldMetadataIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        # Snapshot the knowledge-relevant fields BEFORE the upsert, so we can enqueue only the
        # research blocks the change actually invalidates (spec §6 dependency map).
        _prev = await conn.fetchrow(
            """select crop_type, variety, planting_date, irrigation_method,
                      irrigation_available, seeding_density, growth_stage
               from public.field_metadata where field_id=$1::uuid""", field_id)
        await conn.execute(
            """insert into public.field_metadata
                 (field_id, crop_type, variety, planting_date, expected_harvest, difficulties,
                  soil_type, soil_ph, irrigation_method, irrigation_available, previous_crop,
                  rotation_history, fertilizer_history, seeding_density, growth_stage, elevation_m,
                  slope_deg, aspect_deg, tillage_practice, target_yield, prior_yields, pest_history, notes,
                  crop_cycle, region, economic_region)
               values ($1::uuid,$2,$3,$4::text::date,$5::text::date,$6::jsonb,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,
                       $14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22::jsonb,$23,$24,$25,$26)
               on conflict (field_id) do update set
                 crop_type=excluded.crop_type, variety=excluded.variety, planting_date=excluded.planting_date,
                 expected_harvest=excluded.expected_harvest, difficulties=excluded.difficulties,
                 soil_type=excluded.soil_type, soil_ph=excluded.soil_ph, irrigation_method=excluded.irrigation_method,
                 irrigation_available=excluded.irrigation_available, previous_crop=excluded.previous_crop,
                 rotation_history=excluded.rotation_history, fertilizer_history=excluded.fertilizer_history,
                 seeding_density=excluded.seeding_density, growth_stage=excluded.growth_stage,
                 elevation_m=excluded.elevation_m, slope_deg=excluded.slope_deg, aspect_deg=excluded.aspect_deg,
                 tillage_practice=excluded.tillage_practice, target_yield=excluded.target_yield,
                 prior_yields=excluded.prior_yields, pest_history=excluded.pest_history, notes=excluded.notes,
                 crop_cycle=excluded.crop_cycle, region=excluded.region,
                 economic_region=excluded.economic_region, updated_at=now()""",
            field_id, body.crop_type, body.variety, body.planting_date, body.expected_harvest,
            json.dumps(body.difficulties), body.soil_type, body.soil_ph, body.irrigation_method,
            body.irrigation_available, body.previous_crop, json.dumps(body.rotation_history),
            json.dumps(body.fertilizer_history), body.seeding_density, body.growth_stage, body.elevation_m,
            body.slope_deg, body.aspect_deg, body.tillage_practice, body.target_yield,
            json.dumps(body.prior_yields), json.dumps(body.pest_history), body.notes,
            body.crop_cycle, body.region, body.economic_region)

        # Diff the dependency-map fields → enqueue only the invalidated research blocks (M4).
        try:
            from ..ai import jobs
            from ..ai.knowledge import blocks_for_change
            new_vals = {"crop_type": body.crop_type, "variety": body.variety,
                        "planting_date": body.planting_date,
                        "irrigation_method": body.irrigation_method,
                        "irrigation_available": body.irrigation_available,
                        "seeding_density": body.seeding_density, "growth_stage": body.growth_stage}
            if _prev is None:
                changed = ["crop_type"] if body.crop_type else []  # first profile → full research
            else:
                changed = [k for k, v in new_vals.items() if str(_prev[k]) != str(v)]
            blocks = blocks_for_change(changed)
            if blocks:
                await jobs.enqueue(conn, field_id=field_id, org_id=org_id,
                                   trigger_type="data_changed", blocks=blocks, changed_fields=changed)
        except Exception:  # noqa: BLE001 — research is best-effort, never blocks the save
            pass
    return {"ok": True}
