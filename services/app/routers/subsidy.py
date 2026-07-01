"""Subsidy calculator API (spec §30.6). options/calculate/rates are FREE (public);
save/history require a signed-in member."""
import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import get_current_user_id, get_optional_user_id, is_org_member
from ..schemas import SubsidyCalcIn, SubsidySaveIn
from ..subsidy.engine import calculate, match_rate

router = APIRouter(prefix="/api/subsidy", tags=["subsidy"])

_RATE_COLS = (
    "id, subsidy_type, crop_group, crop, intensity, region_category, irrigation, "
    "planting_period, coefficient, amount_per_unit, unit, min_area_ha, "
    "min_density_per_ha, eligible_regions, conditions, label_az"
)


def _row_to_rate(r) -> dict:
    d = dict(r)
    d["id"] = str(d["id"])
    for k in ("coefficient", "amount_per_unit", "min_area_ha"):
        if d.get(k) is not None:
            d[k] = float(d[k])
    if isinstance(d.get("conditions"), str):
        d["conditions"] = json.loads(d["conditions"])
    return d


async def _load_rates(conn, year: int, subsidy_type=None, crop_group=None, crop=None) -> list[dict]:
    q = f"select {_RATE_COLS} from public.subsidy_rates where year=$1"
    args = [year]
    if subsidy_type:
        args.append(subsidy_type); q += f" and subsidy_type=${len(args)}"
    if crop_group:
        args.append(crop_group); q += f" and crop_group=${len(args)}"
    if crop:
        args.append(crop); q += f" and crop=${len(args)}"
    return [_row_to_rate(r) for r in await conn.fetch(q, *args)]


async def _load_mods(conn, year: int) -> list[dict]:
    rows = await conn.fetch(
        "select code, description_az, applies_to, effect from public.subsidy_modifiers where year=$1", year)
    out = []
    for r in rows:
        d = dict(r)
        for k in ("applies_to", "effect"):
            if isinstance(d.get(k), str):
                d[k] = json.loads(d[k])
        out.append(d)
    return out


@router.get("/options")
async def options(type: Optional[str] = None, group: Optional[str] = None,
                  crop: Optional[str] = None, year: int = 2026):
    async with connection() as conn:
        if not type:
            types = [r["subsidy_type"] for r in await conn.fetch(
                "select distinct subsidy_type from public.subsidy_rates where year=$1 order by 1", year)]
            return {"level": "subsidy_type", "subsidy_types": types}
        if not group:
            groups = [r["crop_group"] for r in await conn.fetch(
                "select distinct crop_group from public.subsidy_rates where year=$1 and subsidy_type=$2 order by 1",
                year, type)]
            return {"level": "crop_group", "crop_groups": groups}
        if not crop:
            crops = [r["crop"] for r in await conn.fetch(
                "select distinct crop from public.subsidy_rates where year=$1 and subsidy_type=$2 and crop_group=$3 order by 1",
                year, type, group)]
            return {"level": "crop", "crops": crops}
        rates = await _load_rates(conn, year, type, group, crop)
    def distinct(key):
        return sorted({r[key] for r in rates if r.get(key)})
    regions = await _regions_for(rates)
    return {
        "level": "dimensions",
        "intensities": distinct("intensity"),
        "region_categories": distinct("region_category"),
        "irrigations": distinct("irrigation"),
        "planting_periods": distinct("planting_period"),
        "needs_region_rayon": any(r.get("eligible_regions") for r in rates),
        "eligible_regions": regions,
        "units": distinct("unit"),
    }


async def _regions_for(rates: list[dict]) -> list[str]:
    regs: set[str] = set()
    for r in rates:
        for x in (r.get("eligible_regions") or []):
            regs.add(x)
    return sorted(regs)


def _quantity(body: SubsidyCalcIn) -> float:
    if body.subsidy_type == "product":
        return float(body.tons or 0)
    return float(body.quantity_ha or 0)


def _inputs(body: SubsidyCalcIn) -> dict:
    return {
        "subsidy_type": body.subsidy_type, "crop_group": body.crop_group, "crop": body.crop,
        "intensity": body.intensity, "region_category": body.region_category,
        "region_rayon": body.region_rayon, "irrigation": body.irrigation,
        "planting_period": body.planting_period, "quantity": _quantity(body),
        "modifiers": body.modifiers,
    }


@router.post("/calculate")
async def calc(body: SubsidyCalcIn):
    async with connection() as conn:
        rates = await _load_rates(conn, body.year, body.subsidy_type, body.crop_group, body.crop)
        mods = await _load_mods(conn, body.year)
    as_of = date.fromisoformat(body.as_of_date) if body.as_of_date else None
    result = calculate(rates, mods, _inputs(body), as_of=as_of)
    matched = match_rate(rates, _inputs(body))
    result["matched_rate_id"] = matched["id"] if matched else None
    return result


@router.post("/save")
async def save(body: SubsidySaveIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = body.org_id
        if body.field_id:
            org_id = str(await conn.fetchval("select org_id from public.fields where id=$1::uuid", body.field_id)) or org_id
        if org_id and not await is_org_member(conn, user_id, org_id):
            raise HTTPException(status_code=403, detail="forbidden")
        rates = await _load_rates(conn, body.year, body.subsidy_type, body.crop_group, body.crop)
        mods = await _load_mods(conn, body.year)
        inp = _inputs(body)
        as_of = date.fromisoformat(body.as_of_date) if body.as_of_date else None
        result = calculate(rates, mods, inp, as_of=as_of)
        matched = match_rate(rates, inp)
        row = await conn.fetchrow(
            """insert into public.subsidy_calculations
                 (org_id, user_id, field_id, year, inputs, matched_rate_id, amount_per_unit,
                  quantity, unit, modifiers_applied, total_amount, warnings)
               values ($1,$2::uuid,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb)
               returning id, created_at""",
            org_id, user_id, body.field_id, body.year, json.dumps(body.model_dump()),
            matched["id"] if matched else None,
            (result["matched_rate"] or {}).get("amount_per_unit"), result["quantity"],
            (result["matched_rate"] or {}).get("unit"), json.dumps(result["modifiers_applied"]),
            result["total_amount"], json.dumps(result["warnings"]))
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat(), "result": result}


@router.get("/history")
async def history(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        rows = await conn.fetch(
            """select id, year, inputs, total_amount, unit, amount_per_unit, field_id, created_at
               from public.subsidy_calculations where user_id=$1::uuid order by created_at desc limit 100""",
            user_id)
    out = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"]); d["field_id"] = str(d["field_id"]) if d["field_id"] else None
        d["created_at"] = d["created_at"].isoformat()
        d["total_amount"] = float(d["total_amount"]) if d["total_amount"] is not None else None
        d["amount_per_unit"] = float(d["amount_per_unit"]) if d["amount_per_unit"] is not None else None
        if isinstance(d.get("inputs"), str):
            d["inputs"] = json.loads(d["inputs"])
        out.append(d)
    return out


@router.get("/rates")
async def rates(year: int = Query(2026)):
    async with connection() as conn:
        rows = await conn.fetch(
            f"select {_RATE_COLS} from public.subsidy_rates where year=$1 "
            "order by subsidy_type, crop_group, crop, coefficient desc", year)
    return [_row_to_rate(r) for r in rows]
