"""Per-field & org P&L-lite (HYBRID_PLAN W6, B1). Expenses = Σ field_operations.cost;
revenue = Σ yields.revenue (0032). Read-only aggregation, org-gated. Optional ?season=<year>."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["ledger"])


def _f(v) -> float:
    return float(v) if v is not None else 0.0


async def _field_pnl(conn, field_id: str, season: Optional[int]) -> dict:
    if season:
        exp = await conn.fetchval(
            "select coalesce(sum(cost),0) from public.field_operations "
            "where field_id=$1::uuid and extract(year from performed_on)=$2", field_id, season)
        rev = await conn.fetchval(
            "select coalesce(sum(revenue),0) from public.yields where field_id=$1::uuid and season_year=$2",
            field_id, season)
        # B7 — sales rows are the append-only revenue log; yields.revenue stays the season aggregate.
        rev_sales = await conn.fetchval(
            "select coalesce(sum(revenue),0) from public.sales where field_id=$1::uuid and season_year=$2",
            field_id, season)
    else:
        exp = await conn.fetchval(
            "select coalesce(sum(cost),0) from public.field_operations where field_id=$1::uuid", field_id)
        rev = await conn.fetchval(
            "select coalesce(sum(revenue),0) from public.yields where field_id=$1::uuid", field_id)
        rev_sales = await conn.fetchval(
            "select coalesce(sum(revenue),0) from public.sales where field_id=$1::uuid", field_id)
    total_rev = _f(rev) + _f(rev_sales)
    return {"expenses": _f(exp), "revenue": total_rev, "revenue_yields": _f(rev),
            "revenue_sales": _f(rev_sales), "profit": total_rev - _f(exp)}


async def _expense_by_category(conn, field_id: str, season: Optional[int]) -> list[dict]:
    """B2-lite: expense breakdown by operation type (the de-facto cost category)."""
    if season:
        rows = await conn.fetch(
            """select coalesce(nullif(type,''),'digər') as category, coalesce(sum(cost),0) as amount
               from public.field_operations
               where field_id=$1::uuid and cost is not null and extract(year from performed_on)=$2
               group by 1 order by amount desc""", field_id, season)
    else:
        rows = await conn.fetch(
            """select coalesce(nullif(type,''),'digər') as category, coalesce(sum(cost),0) as amount
               from public.field_operations
               where field_id=$1::uuid and cost is not null
               group by 1 order by amount desc""", field_id)
    return [{"category": r["category"], "amount": _f(r["amount"])} for r in rows]


@router.get("/fields/{field_id}/pnl")
async def field_pnl(field_id: str, season: Optional[int] = Query(default=None),
                    user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        area = await conn.fetchval("select area_ha from public.fields where id=$1::uuid", field_id)
        pnl = await _field_pnl(conn, field_id, season)
        pnl["by_category"] = await _expense_by_category(conn, field_id, season)
    # area_ha is numeric → asyncpg hands back a Decimal, and float / Decimal raises TypeError.
    # Divide by the already-floated value, never the raw column.
    area_f = _f(area)
    pnl["area_ha"] = area_f
    pnl["profit_per_ha"] = round(pnl["profit"] / area_f, 1) if area_f else None
    return pnl


@router.get("/orgs/{org_id}/ledger")
async def org_ledger(org_id: str, season: Optional[int] = Query(default=None),
                     user_id: str = Depends(get_current_user_id)):
    """Per-field P&L across the org + totals."""
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        fields = await conn.fetch(
            """select f.id, f.name, f.area_ha from public.fields f
               join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and f.deleted_at is null order by f.name""", org_id)
        rows = []
        tot_exp = tot_rev = 0.0
        for f in fields:
            p = await _field_pnl(conn, str(f["id"]), season)
            area = _f(f["area_ha"])
            rows.append({
                "field_id": str(f["id"]), "name": f["name"], "area_ha": area,
                "expenses": p["expenses"], "revenue": p["revenue"], "profit": p["profit"],
                "profit_per_ha": round(p["profit"] / area, 1) if area else None,
            })
            tot_exp += p["expenses"]; tot_rev += p["revenue"]
        # Org-wide expense breakdown by operation type (B2-lite).
        cat_sql = (
            """select coalesce(nullif(o.type,''),'digər') as category, coalesce(sum(o.cost),0) as amount
               from public.field_operations o
               join public.fields f on f.id = o.field_id
               join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and o.cost is not null and f.deleted_at is null""")
        cat_args: list = [org_id]
        if season:
            cat_args.append(season); cat_sql += f" and extract(year from o.performed_on)=${len(cat_args)}"
        cat_sql += " group by 1 order by amount desc"
        cats = await conn.fetch(cat_sql, *cat_args)
    by_category = [{"category": c["category"], "amount": _f(c["amount"])} for c in cats]
    return {"fields": rows, "totals": {"expenses": tot_exp, "revenue": tot_rev, "profit": tot_rev - tot_exp},
            "by_category": by_category}
