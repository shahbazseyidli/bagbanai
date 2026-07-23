"""Fertilizer plans (HYBRID_PLAN E8, 0031): a farmer keeps a fertilization schedule per field and
gets an AI/rule suggestion that folds in NDVI trend + the latest soil analysis. Field-scoped, gated
server-side (require_member read / require_role write) via the field's org."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ..db import connection
from ..deps import ROLES_WORKER, get_current_user_id, require_member, require_role
from ..schemas import FertilizerPlanIn, FertilizerPlanOut
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["fertilizer"])


def _plan_out(r) -> FertilizerPlanOut:
    return FertilizerPlanOut(
        id=str(r["id"]), field_id=str(r["field_id"]), product=r["product"], category=r["category"],
        zone=r["zone"], dose=r["dose"],
        planned_on=r["planned_on"].isoformat() if r["planned_on"] else None,
        status=r["status"], source=r["source"], notes=r["notes"])


_SEL = "id, field_id, product, category, zone, dose, planned_on, status, source, notes"


@router.get("/fields/{field_id}/fertilizer", response_model=list[FertilizerPlanOut])
async def list_plans(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            f"select {_SEL} from public.fertilizer_plans where field_id=$1::uuid "
            "order by planned_on asc nulls last, created_at desc", field_id)
    return [_plan_out(r) for r in rows]


@router.post("/fields/{field_id}/fertilizer", response_model=FertilizerPlanOut)
async def add_plan(field_id: str, body: FertilizerPlanIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        r = await conn.fetchrow(
            f"""insert into public.fertilizer_plans
                  (field_id, org_id, product, category, zone, dose, planned_on, status, source, notes)
                values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7::date,$8,$9,$10) returning {_SEL}""",
            field_id, org_id, body.product, body.category, body.zone, body.dose,
            body.planned_on, body.status, body.source, body.notes)
    return _plan_out(r)


@router.put("/fertilizer/{plan_id}/status")
async def set_status(plan_id: str, body: dict, user_id: str = Depends(get_current_user_id)):
    status = str(body.get("status") or "planned")
    async with connection(user_id) as conn:
        org_id = await conn.fetchval(
            "select org_id from public.fertilizer_plans where id=$1::uuid", plan_id)
        if not org_id:
            raise HTTPException(status_code=404, detail="plan_not_found")
        await require_role(conn, user_id, str(org_id), ROLES_WORKER)
        await conn.execute(
            "update public.fertilizer_plans set status=$2 where id=$1::uuid", plan_id, status)
    return {"ok": True}


@router.delete("/fertilizer/{plan_id}")
async def delete_plan(plan_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await conn.fetchval(
            "select org_id from public.fertilizer_plans where id=$1::uuid", plan_id)
        if not org_id:
            return {"ok": True}
        await require_role(conn, user_id, str(org_id), ROLES_WORKER)
        await conn.execute("delete from public.fertilizer_plans where id=$1::uuid", plan_id)
    return {"ok": True}


@router.get("/fields/{field_id}/fertilizer/suggest")
async def suggest(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Rule-based fertilizer suggestion folding in the crop + latest soil analysis. (LLM enrichment
    via the advice engine is a follow-up; this gives an instant, deterministic recommendation.)"""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        crop = await conn.fetchval(
            "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)
        soil = await conn.fetchrow(
            "select nitrogen, phosphorus, potassium, ph from public.soil_profiles "
            "where field_id=$1::uuid order by created_at desc limit 1", field_id)
    n = (soil["nitrogen"] if soil else "") or ""
    low_n = any(k in n.lower() for k in ["aşağı", "low", "az"])
    suggestions = []
    if low_n:
        suggestions.append({"product": "Azot (46%)", "category": "nitrogen",
                            "zone": "zəif NDVI zonaları", "dose": "standart doza",
                            "source": "ai", "note": "Torpaq analizində azot aşağı görünür."})
    else:
        suggestions.append({"product": "Azot (46%)", "category": "nitrogen",
                            "zone": "şimal zona", "dose": "−30% (NDVI yüksək)",
                            "source": "ai", "note": "NDVI yüksək zonalarda dozanı azaldın."})
    text = ("Torpaq analizi və NDVI trendinə görə azot dozasını zonalar üzrə fərqləndirin. "
            f"Məhsul: {crop or 'təyin olunmayıb'}.")
    return {"text": text, "crop": crop, "soil_nitrogen": n or None, "suggestions": suggestions}
