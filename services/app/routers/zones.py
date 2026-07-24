"""Productivity zones (A6) + VRA-lite fertilizer plan (A7) — HYBRID_PLAN W8.

READ-ONLY over the raster maths: this module NEVER imports rasterio/numpy. The heavy work runs
in the geo image (services/geo_pipeline/zones.py) driven by the deploy/process-zones.sh cron;
here we only enqueue a public.field_zone_runs row and read the results back out of Postgres.

A7 is plain arithmetic over the zones a run produced, so it lives here: a per-zone dose derived
from rel_to_field (zone mean ÷ field mean), a uniform-vs-VRA total and the expected saving.
"""
import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field as PField

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["zones"])

# ── validation allowlists (never cast unvalidated text into SQL/enums) ───────────────────
ALLOWED_INDEXES = {"NDVI", "EVI", "SAVI", "MSAVI", "NDRE", "CIre"}
ALLOWED_SENSORS = {"S2", "S30", "L30", "HLS"}
ALLOWED_NUTRIENTS = {"N", "P", "K"}
ALLOWED_STRATEGIES = {"compensate", "maximize"}

MIN_ZONES, MAX_ZONES = 3, 7
# Dose modifier band. Agronomically, a variable-rate map that moves more than ±40 % off the
# uniform rate is not defensible from a vegetation index alone (soil depth, salinity or drainage
# may be the real limit), so the modifier is always clamped into this band.
DOSE_MIN_FACTOR, DOSE_MAX_FACTOR = 0.6, 1.4
# Rough AZ retail cost of one kg of ELEMENTAL nutrient — an assumption, overridable per request.
DEFAULT_PRICE_AZN_PER_KG = 1.2

_NUTRIENT_COL = {"N": "n_total_kg", "P": "p_total_kg", "K": "k_total_kg"}


class ZoneRunIn(BaseModel):
    index_name: str = "NDVI"
    sensor: str = "S2"
    n_zones: int = 5
    month_from: int = 5
    month_to: int = 8
    season_from: Optional[int] = None
    season_to: Optional[int] = None
    max_cloud_pct: float = 60.0


class VraIn(BaseModel):
    nutrient: str = "N"
    strategy: str = "compensate"
    base_dose_kg_ha: Optional[float] = PField(default=None, ge=0, le=2000)
    price_azn_per_kg: Optional[float] = PField(default=None, ge=0, le=100)
    season_year: Optional[int] = None
    notes: Optional[str] = None


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


# ── A6 helpers ──────────────────────────────────────────────────────────────────────────
_REASON_AZ = {
    "not_enough_scenes": ("Çoxillik zonalama üçün kifayət qədər buludsuz peyk şəkli yoxdur. "
                          "Əvvəlcə keçmiş mövsümlərin arxivini yükləyin (geriyə doldurma), "
                          "sonra zonaları yenidən hesablayın."),
    "not_enough_pixels": ("Sahə seçilmiş peyk üçün çox kiçikdir — zona başına kifayət qədər "
                          "piksel düşmür. Sentinel-2 (10 m) seçin və ya zona sayını azaldın."),
    "no_zone_polygons": "Zona sərhədləri çıxarıla bilmədi — zona sayını azaldıb yenidən yoxlayın.",
    "field_has_no_geometry": "Sahənin sərhədi yoxdur.",
    "no_readable_raster": "Peyk faylları oxuna bilmədi — bir azdan yenidən cəhd edin.",
}

_HOMOGENEITY_AZ = {
    "uniform": ("Sahə bircinsdir — zonalar arasında fərq peyk ölçmə səhvi səviyyəsindədir. "
                "Dəyişkən normalı gübrələmə burada ciddi qənaət verməyəcək."),
    "moderate": ("Sahədə orta səviyyəli fərqlilik var — zonalı gübrələmə qismən fayda verə bilər. "
                 "Zəif zonaları çöldə yoxlayın (torpaq, suvarma, sıxlıq)."),
    "variable": ("Sahə dəyişkəndir — güclü və zəif hissələr aydın seçilir. Zonalı (VRA) "
                 "gübrələmə real qənaət və məhsul artımı verə bilər."),
}


def _status_message(run: Optional[dict]) -> tuple[str, Optional[str]]:
    """(ui_status, azerbaijani hint). ui_status ∈ none|queued|running|ready|insufficient_data|failed."""
    if not run:
        return "none", None
    st = run.get("status")
    if st in ("queued", "running"):
        return st, "Zonalar hesablanır — bu bir neçə dəqiqə çəkə bilər."
    if st == "ready":
        return "ready", _HOMOGENEITY_AZ.get(run.get("homogeneity_class") or "", None)
    msg = (run.get("message") or "")
    code = msg.split(":", 1)[0]
    if code in _REASON_AZ:
        ui = "insufficient_data" if code in ("not_enough_scenes", "not_enough_pixels") else "failed"
        return ui, _REASON_AZ[code]
    return "failed", "Zonalar hesablanmadı — yenidən cəhd edin."


def _run_out(run) -> dict:
    return {
        "id": str(run["id"]),
        "index_name": run["index_name"],
        "sensor": run["sensor"],
        "n_zones": run["n_zones"],
        "month_from": run["month_from"],
        "month_to": run["month_to"],
        "season_from": run["season_from"],
        "season_to": run["season_to"],
        "n_scenes": run["n_scenes"],
        "pixel_size_m": _f(run["pixel_size_m"]),
        "valid_pixels": run["valid_pixels"],
        "field_mean": _f(run["field_mean"]),
        "homogeneity_cv": _f(run["homogeneity_cv"]),
        "homogeneity_class": run["homogeneity_class"],
        "status": run["status"],
        "message": run["message"],
        "computed_at": run["computed_at"].isoformat() if run["computed_at"] else None,
    }


async def _latest_run(conn, field_id: str):
    return await conn.fetchrow(
        """select id, field_id, org_id, index_name, sensor, n_zones, season_from, season_to,
                  month_from, month_to, n_scenes, pixel_size_m, valid_pixels, field_mean,
                  homogeneity_cv, homogeneity_class, status, message, computed_at
           from public.field_zone_runs
           where field_id=$1::uuid order by computed_at desc limit 1""", field_id)


async def _latest_ready_run(conn, field_id: str):
    return await conn.fetchrow(
        """select id, field_id, org_id, index_name, sensor, n_zones, field_mean,
                  homogeneity_cv, homogeneity_class, computed_at
           from public.field_zone_runs
           where field_id=$1::uuid and status='ready'
           order by computed_at desc limit 1""", field_id)


@router.post("/fields/{field_id}/zones")
async def enqueue_zones(field_id: str, body: ZoneRunIn,
                        user_id: str = Depends(get_current_user_id)):
    """Queue an A6 zone computation. The geo cron worker (deploy/process-zones.sh) picks the row
    up within ~5 min; the UI polls GET /zones for the result."""
    # Normalise to the exact spelling used by index_rasters.index_name (CIre is mixed-case).
    index_name = (body.index_name or "NDVI").upper()
    if index_name == "CIRE":
        index_name = "CIre"
    if index_name not in ALLOWED_INDEXES:
        raise HTTPException(status_code=400, detail="unknown_index")
    sensor = (body.sensor or "S2").upper()
    if sensor not in ALLOWED_SENSORS:
        raise HTTPException(status_code=400, detail="unknown_sensor")
    if not (MIN_ZONES <= body.n_zones <= MAX_ZONES):
        raise HTTPException(status_code=400, detail="n_zones_out_of_range")
    if not (1 <= body.month_from <= 12 and 1 <= body.month_to <= 12) or body.month_from > body.month_to:
        raise HTTPException(status_code=400, detail="invalid_month_window")
    if not (0 <= body.max_cloud_pct <= 100):
        raise HTTPException(status_code=400, detail="invalid_max_cloud")
    this_year = date.today().year
    for y in (body.season_from, body.season_to):
        if y is not None and not (2013 <= y <= this_year + 1):
            raise HTTPException(status_code=400, detail="invalid_season_year")
    if body.season_from and body.season_to and body.season_from > body.season_to:
        raise HTTPException(status_code=400, detail="invalid_season_range")

    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """insert into public.field_zone_runs
                 (field_id, org_id, index_name, sensor, n_zones, season_from, season_to,
                  month_from, month_to, max_cloud_pct, status, message, computed_at)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,'queued',null,now())
               on conflict (field_id, index_name, sensor, n_zones) do update set
                 season_from=excluded.season_from, season_to=excluded.season_to,
                 month_from=excluded.month_from, month_to=excluded.month_to,
                 max_cloud_pct=excluded.max_cloud_pct, status='queued', message=null,
                 computed_at=now()
               returning id""",
            field_id, org_id, index_name, sensor, body.n_zones, body.season_from, body.season_to,
            body.month_from, body.month_to, body.max_cloud_pct)
    return {"run_id": str(row["id"]), "status": "queued",
            "message": "Zonalar növbəyə alındı — hesablama bir neçə dəqiqə çəkə bilər."}


@router.get("/fields/{field_id}/zones")
async def get_zones(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Latest zone run + its polygons as GeoJSON. Never 404s on 'no zones yet' — the UI needs a
    status it can render ('none' / 'queued' / 'insufficient_data' / 'ready')."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        run = await _latest_run(conn, field_id)
        zone_rows = []
        if run is not None and run["status"] == "ready":
            zone_rows = await conn.fetch(
                """select id, zone_no, st_asgeojson(geom) as geom, area_ha, pixel_count,
                          mean_value, min_value, max_value, std_value, p10, p50, p90, rel_to_field
                   from public.field_zones where run_id=$1 order by zone_no""", run["id"])
        area_ha = await conn.fetchval(
            "select area_ha from public.fields where id=$1::uuid", field_id)

    run_d = _run_out(run) if run is not None else None
    status, hint = _status_message(run_d)
    zones_total = sum(float(z["area_ha"] or 0) for z in zone_rows) or None
    zones = [{
        "id": str(z["id"]),
        "zone_no": z["zone_no"],
        "geom": json.loads(z["geom"]) if z["geom"] else None,
        "area_ha": _f(z["area_ha"]),
        "area_pct": (round(float(z["area_ha"]) * 100.0 / zones_total, 1)
                     if zones_total and z["area_ha"] is not None else None),
        "pixel_count": z["pixel_count"],
        "mean_value": _f(z["mean_value"]),
        "min_value": _f(z["min_value"]),
        "max_value": _f(z["max_value"]),
        "std_value": _f(z["std_value"]),
        "p10": _f(z["p10"]), "p50": _f(z["p50"]), "p90": _f(z["p90"]),
        "rel_to_field": _f(z["rel_to_field"]),
    } for z in zone_rows]
    return {"status": status, "hint": hint, "run": run_d, "zones": zones,
            "field_area_ha": _f(area_ha)}


# ── A7 VRA-lite ─────────────────────────────────────────────────────────────────────────
def vra_doses(zones: list[dict], base_dose_kg_ha: float, strategy: str,
              price_azn_per_kg: float) -> dict:
    """Plain arithmetic (no rasterio) — turn zones into a per-zone dose plan.

    'compensate' feeds the WEAK zones more (dose ∝ 1/rel_to_field): the classic "lift the poor
    parts" strategy, right when the weakness is a nutrient deficit.
    'maximize' feeds the STRONG zones more (dose ∝ rel_to_field): right when the weak parts are
    limited by something fertilizer cannot fix (shallow soil, salinity, waterlogging) and the
    money is better spent where the yield response is real.
    Both modifiers are clamped to [DOSE_MIN_FACTOR, DOSE_MAX_FACTOR].
    Zone 1 = LOWEST productivity … zone n = HIGHEST (set by geo_pipeline/zones.py).
    """
    rows: list[dict] = []
    total_area = 0.0
    vra_total = 0.0
    for z in zones:
        area = float(z.get("area_ha") or 0.0)
        rel = z.get("rel_to_field")
        rel = float(rel) if rel not in (None, 0) else 1.0
        if rel <= 0:
            rel = 1.0
        factor = (1.0 / rel) if strategy == "compensate" else rel
        factor = max(DOSE_MIN_FACTOR, min(DOSE_MAX_FACTOR, factor))
        dose = round(base_dose_kg_ha * factor, 1)
        total = round(dose * area, 1)
        total_area += area
        vra_total += total
        rows.append({"zone_id": z.get("id"), "zone_no": z["zone_no"], "area_ha": round(area, 4),
                     "rel_to_field": round(rel, 4), "factor": round(factor, 3),
                     "dose_kg_ha": dose, "total_kg": total})
    uniform_total = round(base_dose_kg_ha * total_area, 1)
    vra_total = round(vra_total, 1)
    saved_kg = round(uniform_total - vra_total, 1)
    return {
        "rows": rows,
        "area_ha": round(total_area, 4),
        "uniform_total_kg": uniform_total,
        "vra_total_kg": vra_total,
        "saved_kg": saved_kg,
        "price_azn_per_kg": price_azn_per_kg,
        "saved_azn": round(saved_kg * price_azn_per_kg, 2),
    }


async def _base_dose_from_plan(conn, field_id: str, nutrient: str) -> Optional[float]:
    """Reuse the agronomic rate the T11 fertilizer engine already computed (fertilizer_plans holds
    season totals + area_ha → kg/ha). Read-only: we never trigger a plan write from here."""
    # `col` is a constant from the _NUTRIENT_COL whitelist keyed by an already-validated nutrient —
    # never raw user input (the caller 400s on anything outside {N,P,K} before we get here).
    col = _NUTRIENT_COL[nutrient]
    row = await conn.fetchrow(
        f"""select {col} as total_kg, area_ha, season_year from public.fertilizer_plans
            where field_id=$1::uuid order by season_year desc limit 1""", field_id)
    if not row or row["total_kg"] is None or not row["area_ha"]:
        return None
    area = float(row["area_ha"])
    return round(float(row["total_kg"]) / area, 1) if area > 0 else None


@router.post("/fields/{field_id}/vra")
async def create_vra(field_id: str, body: VraIn, user_id: str = Depends(get_current_user_id)):
    """Build + persist a VRA-lite plan from the latest READY zone run."""
    nutrient = (body.nutrient or "N").upper()
    if nutrient not in ALLOWED_NUTRIENTS:
        raise HTTPException(status_code=400, detail="unknown_nutrient")
    strategy = (body.strategy or "compensate").lower()
    if strategy not in ALLOWED_STRATEGIES:
        raise HTTPException(status_code=400, detail="unknown_strategy")
    this_year = date.today().year
    season_year = body.season_year or this_year
    if not (2013 <= season_year <= this_year + 1):
        raise HTTPException(status_code=400, detail="invalid_season_year")
    price = body.price_azn_per_kg if body.price_azn_per_kg is not None else DEFAULT_PRICE_AZN_PER_KG

    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        run = await _latest_ready_run(conn, field_id)
        if run is None:
            raise HTTPException(status_code=409, detail="no_ready_zone_run")
        zone_rows = await conn.fetch(
            """select id, zone_no, area_ha, mean_value, rel_to_field
               from public.field_zones where run_id=$1 order by zone_no""", run["id"])
        if not zone_rows:
            raise HTTPException(status_code=409, detail="no_ready_zone_run")

        base = body.base_dose_kg_ha
        if base is None:
            base = await _base_dose_from_plan(conn, field_id, nutrient)
        if base is None or base <= 0:
            raise HTTPException(status_code=400, detail="no_base_dose")

        crop = await conn.fetchval(
            "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
        zones = [{"id": str(z["id"]), "zone_no": z["zone_no"],
                  "area_ha": _f(z["area_ha"]), "rel_to_field": _f(z["rel_to_field"])}
                 for z in zone_rows]
        calc = vra_doses(zones, float(base), strategy, float(price))

        plan = await conn.fetchrow(
            """insert into public.vra_plans
                 (field_id, org_id, run_id, season_year, crop_type, nutrient, base_dose_kg_ha,
                  uniform_total_kg, vra_total_kg, saved_kg, price_azn_per_kg, saved_azn,
                  strategy, notes, created_by)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid)
               returning id, created_at""",
            field_id, org_id, run["id"], season_year, crop, nutrient, float(base),
            calc["uniform_total_kg"], calc["vra_total_kg"], calc["saved_kg"], float(price),
            calc["saved_azn"], strategy, body.notes, user_id)
        for r in calc["rows"]:
            await conn.execute(
                """insert into public.vra_zone_doses
                     (plan_id, zone_id, zone_no, area_ha, dose_kg_ha, total_kg)
                   values ($1,$2::uuid,$3,$4,$5,$6)
                   on conflict (plan_id, zone_no) do update set
                     zone_id=excluded.zone_id, area_ha=excluded.area_ha,
                     dose_kg_ha=excluded.dose_kg_ha, total_kg=excluded.total_kg""",
                plan["id"], r["zone_id"], r["zone_no"], r["area_ha"], r["dose_kg_ha"], r["total_kg"])

    return {
        "id": str(plan["id"]), "run_id": str(run["id"]), "season_year": season_year,
        "crop_type": crop, "nutrient": nutrient, "strategy": strategy,
        "base_dose_kg_ha": round(float(base), 1),
        "area_ha": calc["area_ha"], "uniform_total_kg": calc["uniform_total_kg"],
        "vra_total_kg": calc["vra_total_kg"], "saved_kg": calc["saved_kg"],
        "price_azn_per_kg": float(price), "saved_azn": calc["saved_azn"],
        "created_at": plan["created_at"].isoformat(),
        "doses": [{"zone_no": r["zone_no"], "area_ha": r["area_ha"],
                   "rel_to_field": r["rel_to_field"], "dose_kg_ha": r["dose_kg_ha"],
                   "total_kg": r["total_kg"]} for r in calc["rows"]],
        "disclaimer": ("Dozalar ELEMENT əsaslıdır (kq N/P/K), kommersiya gübrəsi deyil. "
                       "Konkret məhsul və norma üçün torpaq analizi və aqronom məsləhəti lazımdır."),
    }


@router.get("/fields/{field_id}/vra")
async def get_vra(field_id: str, nutrient: Optional[str] = Query(default=None),
                  user_id: str = Depends(get_current_user_id)):
    """Latest VRA plan (optionally for one nutrient) + its per-zone doses."""
    nut = None
    if nutrient:
        nut = nutrient.upper()
        if nut not in ALLOWED_NUTRIENTS:
            raise HTTPException(status_code=400, detail="unknown_nutrient")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        cols = ("""id, run_id, season_year, crop_type, nutrient, strategy, base_dose_kg_ha,
                   uniform_total_kg, vra_total_kg, saved_kg, price_azn_per_kg, saved_azn,
                   notes, created_at""")
        if nut:
            plan = await conn.fetchrow(
                f"""select {cols} from public.vra_plans
                    where field_id=$1::uuid and nutrient=$2
                    order by created_at desc limit 1""", field_id, nut)
        else:
            plan = await conn.fetchrow(
                f"""select {cols} from public.vra_plans where field_id=$1::uuid
                    order by created_at desc limit 1""", field_id)
        doses = []
        if plan is not None:
            doses = await conn.fetch(
                """select zone_no, area_ha, dose_kg_ha, total_kg from public.vra_zone_doses
                   where plan_id=$1 order by zone_no""", plan["id"])
    if plan is None:
        return {"plan": None, "doses": []}
    return {
        "plan": {
            "id": str(plan["id"]),
            "run_id": str(plan["run_id"]) if plan["run_id"] else None,
            "season_year": plan["season_year"], "crop_type": plan["crop_type"],
            "nutrient": plan["nutrient"], "strategy": plan["strategy"],
            "base_dose_kg_ha": _f(plan["base_dose_kg_ha"]),
            "uniform_total_kg": _f(plan["uniform_total_kg"]),
            "vra_total_kg": _f(plan["vra_total_kg"]),
            "saved_kg": _f(plan["saved_kg"]),
            "price_azn_per_kg": _f(plan["price_azn_per_kg"]),
            "saved_azn": _f(plan["saved_azn"]),
            "notes": plan["notes"],
            "created_at": plan["created_at"].isoformat(),
        },
        "doses": [{"zone_no": d["zone_no"], "area_ha": _f(d["area_ha"]),
                   "dose_kg_ha": _f(d["dose_kg_ha"]), "total_kg": _f(d["total_kg"])}
                  for d in doses],
    }
