"""Harvest log + buyer CRM-lite + trace code + sales (HYBRID_PLAN W7, B7).

public.yields stays the season AGGREGATE (one upserted row per field/season/crop). This module adds
the append-only commercial log on top of it (0038):

  buyers        — org-scoped CRM-lite, unique (org_id, name)
  harvest_lots  — one harvest event on one field, carrying a server-generated trace code
                  ('AGX-2026-3F9A2C71') that is the farmer's proof-of-origin
  sales         — what actually left the farm: buyer, quantity, price, payment status

Gating is server-side: org-scoped routes take the org from the path, field-scoped routes resolve it
from the field, and id-scoped routes (buyer/lot/sale) resolve it from the stored row. RLS is
defence-in-depth only.

Free-text status/unit/kind columns are validated against an allowed set here and rejected with a
400 — never cast straight into the DB (an unvalidated enum cast already caused a 500 in this repo).

Request models are declared here on purpose (isolated from ..schemas)."""
import secrets
import uuid as _uuid
from datetime import date
from decimal import Decimal
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["sales"])

# Allowed vocabularies (0038 column comments). Anything else → HTTP 400.
BUYER_KINDS = ("trader", "processor", "market", "export", "other")
UNITS = ("kq", "ton")
PAYMENT_STATUSES = ("paid", "pending", "partial")
CURRENCIES = ("AZN", "USD", "EUR")

_BUYER_SELECT = ("id, org_id, name, kind, contact_name, phone, email, address, region, notes, "
                 "created_at, updated_at")
_LOT_COLS = ("id, field_id, org_id, season_id, season_year, crop_type, trace_code, harvested_on, "
             "quantity, unit, quality_grade, moisture_pct, storage, notes, created_at")
# Qualified variant — the org-wide listing joins public.fields, which also has id/org_id/created_at,
# so bare column names there would be ambiguous.
_LOT_SELECT_L = ", ".join(f"l.{c.strip()}" for c in _LOT_COLS.split(","))

_TRACE_ATTEMPTS = 6


# ---------- helpers ----------
def _num(v) -> Optional[Decimal]:
    """numeric columns take Decimal — go through str() so 0.1 stays 0.1."""
    return None if v is None else Decimal(str(v))


def _f(v) -> Optional[float]:
    return None if v is None else float(v)


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    s = v.strip()
    return s or None


def _check(value: Optional[str], allowed: tuple, detail: str, default: Optional[str] = None) -> Optional[str]:
    """Validate an enum-ish free-text value in Python (never trust it into the column)."""
    v = _clean(value)
    if v is None:
        return default
    if v not in allowed:
        raise HTTPException(status_code=400, detail=detail)
    return v


def _uid(value: Optional[str], detail: str) -> str:
    """Canonicalise a path/body uuid. A malformed id is a 404, not a Postgres 22P02 → 500."""
    try:
        return str(_uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail=detail)


def _trace_code(season_year: int) -> str:
    return f"AGX-{season_year}-{secrets.token_hex(4).upper()}"


def _buyer_out(r) -> dict:
    return {
        "id": str(r["id"]), "org_id": str(r["org_id"]), "name": r["name"], "kind": r["kind"],
        "contact_name": r["contact_name"], "phone": r["phone"], "email": r["email"],
        "address": r["address"], "region": r["region"], "notes": r["notes"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


def _lot_out(r) -> dict:
    d = {
        "id": str(r["id"]), "field_id": str(r["field_id"]), "org_id": str(r["org_id"]),
        "season_id": str(r["season_id"]) if r["season_id"] else None,
        "season_year": r["season_year"], "crop_type": r["crop_type"], "trace_code": r["trace_code"],
        "harvested_on": r["harvested_on"].isoformat() if r["harvested_on"] else None,
        "quantity": _f(r["quantity"]), "unit": r["unit"], "quality_grade": r["quality_grade"],
        "moisture_pct": _f(r["moisture_pct"]), "storage": r["storage"], "notes": r["notes"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }
    if "field_name" in r.keys():
        d["field_name"] = r["field_name"]
    if "sold_quantity" in r.keys():
        d["sold_quantity"] = _f(r["sold_quantity"]) or 0.0
    return d


def _sale_out(r) -> dict:
    return {
        "id": str(r["id"]), "org_id": str(r["org_id"]),
        "lot_id": str(r["lot_id"]) if r["lot_id"] else None,
        "field_id": str(r["field_id"]) if r["field_id"] else None,
        "buyer_id": str(r["buyer_id"]) if r["buyer_id"] else None,
        "season_year": r["season_year"],
        "sold_on": r["sold_on"].isoformat() if r["sold_on"] else None,
        "quantity": _f(r["quantity"]), "unit": r["unit"],
        "price_per_unit": _f(r["price_per_unit"]), "revenue": _f(r["revenue"]),
        "currency": r["currency"], "payment_status": r["payment_status"],
        "invoice_no": r["invoice_no"], "notes": r["notes"],
        "field_name": r["field_name"] if "field_name" in r.keys() else None,
        "buyer_name": r["buyer_name"] if "buyer_name" in r.keys() else None,
        "trace_code": r["trace_code"] if "trace_code" in r.keys() else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


async def _org_of_row(conn, table: str, row_id: str, detail: str) -> str:
    """org_id of a buyer / harvest lot / sale. `table` is a literal from this module only."""
    try:
        org_id = await conn.fetchval(f"select org_id from public.{table} where id=$1::uuid", row_id)
    except (asyncpg.exceptions.DataError, ValueError):
        raise HTTPException(status_code=404, detail=detail)
    if not org_id:
        raise HTTPException(status_code=404, detail=detail)
    return str(org_id)


async def _assert_field_in_org(conn, field_id: str, org_id: str) -> None:
    ok = await conn.fetchval(
        """select 1 from public.fields f
           join public.farms fa on fa.id = f.farm_id
           where f.id=$1::uuid and fa.org_id=$2::uuid and f.deleted_at is null""", field_id, org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="field_not_found")


# ---------- request models ----------
class BuyerIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name_required")
        return v.strip()


class HarvestLotIn(BaseModel):
    harvested_on: date
    quantity: Optional[float] = None
    unit: str = "kq"
    quality_grade: Optional[str] = None
    moisture_pct: Optional[float] = None
    storage: Optional[str] = None
    notes: Optional[str] = None
    season_year: Optional[int] = Field(default=None, ge=1990, le=2100)
    crop_type: Optional[str] = None

    # Browser forms post "" for untouched date/number inputs — treat that as "not provided"
    # instead of failing with a 422 the farmer cannot act on.
    @field_validator("quantity", "moisture_pct", "season_year", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


class SaleIn(BaseModel):
    sold_on: date
    field_id: Optional[str] = None
    lot_id: Optional[str] = None
    buyer_id: Optional[str] = None
    quantity: Optional[float] = None
    unit: str = "kq"
    price_per_unit: Optional[float] = None
    revenue: Optional[float] = None
    currency: str = "AZN"
    payment_status: str = "paid"
    invoice_no: Optional[str] = None
    notes: Optional[str] = None
    season_year: Optional[int] = Field(default=None, ge=1990, le=2100)

    @field_validator("quantity", "price_per_unit", "revenue", "season_year", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    @field_validator("field_id", "lot_id", "buyer_id", "invoice_no", "notes", mode="before")
    @classmethod
    def _blank_str_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


# ================= buyers (CRM-lite) =================
@router.get("/orgs/{org_id}/buyers")
async def list_buyers(org_id: str, q: Optional[str] = Query(default=None),
                      user_id: str = Depends(get_current_user_id)):
    org_id = _uid(org_id, "org_not_found")
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        sql = f"select {_BUYER_SELECT} from public.buyers where org_id=$1::uuid"
        args: list = [org_id]
        if _clean(q):
            args.append(f"%{q.strip()}%")
            sql += f" and (name ilike ${len(args)} or coalesce(contact_name,'') ilike ${len(args)})"
        sql += " order by name"
        rows = await conn.fetch(sql, *args)
    return [_buyer_out(r) for r in rows]


@router.post("/orgs/{org_id}/buyers")
async def create_buyer(org_id: str, body: BuyerIn, user_id: str = Depends(get_current_user_id)):
    org_id = _uid(org_id, "org_not_found")
    kind = _check(body.kind, BUYER_KINDS, "invalid_buyer_kind")
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        try:
            # Nested block = SAVEPOINT: a unique violation rolls back only this insert, so the
            # outer transaction stays usable and the caller gets a clean 409 (never a 500).
            async with conn.transaction():
                row = await conn.fetchrow(
                    f"""insert into public.buyers
                          (org_id, name, kind, contact_name, phone, email, address, region, notes, created_by)
                        values ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10::uuid)
                        returning {_BUYER_SELECT}""",
                    org_id, body.name, kind, _clean(body.contact_name), _clean(body.phone),
                    _clean(body.email), _clean(body.address), _clean(body.region),
                    _clean(body.notes), user_id)
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=409, detail="buyer_name_taken")
    return _buyer_out(row)


@router.put("/buyers/{buyer_id}")
async def update_buyer(buyer_id: str, body: BuyerIn, user_id: str = Depends(get_current_user_id)):
    kind = _check(body.kind, BUYER_KINDS, "invalid_buyer_kind")
    async with connection(user_id) as conn:
        org_id = await _org_of_row(conn, "buyers", buyer_id, "buyer_not_found")
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        try:
            async with conn.transaction():
                row = await conn.fetchrow(
                    f"""update public.buyers set
                          name=$2, kind=$3, contact_name=$4, phone=$5, email=$6, address=$7,
                          region=$8, notes=$9, updated_at=now()
                        where id=$1::uuid
                        returning {_BUYER_SELECT}""",
                    buyer_id, body.name, kind, _clean(body.contact_name), _clean(body.phone),
                    _clean(body.email), _clean(body.address), _clean(body.region), _clean(body.notes))
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=409, detail="buyer_name_taken")
    if not row:
        raise HTTPException(status_code=404, detail="buyer_not_found")
    return _buyer_out(row)


@router.delete("/buyers/{buyer_id}")
async def delete_buyer(buyer_id: str, user_id: str = Depends(get_current_user_id)):
    """Hard delete — sales.buyer_id is `on delete set null`, so the sales history survives."""
    async with connection(user_id) as conn:
        org_id = await _org_of_row(conn, "buyers", buyer_id, "buyer_not_found")
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await conn.execute("delete from public.buyers where id=$1::uuid", buyer_id)
    return {"ok": True}


# ================= harvest lots (trace code) =================
@router.get("/fields/{field_id}/harvest-lots")
async def list_field_lots(field_id: str, user_id: str = Depends(get_current_user_id)):
    field_id = _uid(field_id, "field_not_found")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            f"""select {_LOT_SELECT_L},
                       (select coalesce(sum(s.quantity),0) from public.sales s where s.lot_id = l.id)
                         as sold_quantity
                from public.harvest_lots l
                where l.field_id=$1::uuid
                order by l.harvested_on desc, l.created_at desc""", field_id)
    return [_lot_out(r) for r in rows]


@router.post("/fields/{field_id}/harvest-lots")
async def create_field_lot(field_id: str, body: HarvestLotIn,
                           user_id: str = Depends(get_current_user_id)):
    field_id = _uid(field_id, "field_not_found")
    unit = _check(body.unit, UNITS, "invalid_unit", default="kq")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)

        # Attribute the lot to a season (B3, 0034): the year the caller asked for, else the
        # field's current season, else the harvest year. season_id stays null when there is none.
        season = None
        if body.season_year is not None:
            season = await conn.fetchrow(
                """select id, season_year, crop_type from public.field_seasons
                   where field_id=$1::uuid and season_year=$2
                   order by is_current desc, updated_at desc limit 1""", field_id, body.season_year)
        if season is None:
            season = await conn.fetchrow(
                """select id, season_year, crop_type from public.field_seasons
                   where field_id=$1::uuid and is_current limit 1""", field_id)
        season_year = (body.season_year
                       or (season["season_year"] if season else None)
                       or body.harvested_on.year)
        season_id = str(season["id"]) if season else None

        crop = _clean(body.crop_type) or (_clean(season["crop_type"]) if season else None)
        if not crop:
            crop = _clean(await conn.fetchval(
                "select crop_type from public.field_metadata where field_id=$1::uuid", field_id))

        row = None
        for _ in range(_TRACE_ATTEMPTS):
            code = _trace_code(int(season_year))
            try:
                # SAVEPOINT per attempt: a trace-code collision rolls back only the failed insert
                # so we can retry inside the same request instead of returning a 500.
                async with conn.transaction():
                    row = await conn.fetchrow(
                        f"""insert into public.harvest_lots
                              (field_id, org_id, season_id, season_year, crop_type, trace_code,
                               harvested_on, quantity, unit, quality_grade, moisture_pct, storage,
                               notes, created_by)
                            values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::date,$8::numeric,$9,
                                    $10,$11::numeric,$12,$13,$14::uuid)
                            returning {_LOT_COLS}""",
                        field_id, org_id, season_id, int(season_year), crop, code,
                        body.harvested_on, _num(body.quantity), unit, _clean(body.quality_grade),
                        _num(body.moisture_pct), _clean(body.storage), _clean(body.notes), user_id)
                break
            except asyncpg.exceptions.UniqueViolationError:
                row = None
                continue
        if row is None:
            raise HTTPException(status_code=503, detail="trace_code_unavailable")
    return _lot_out(row)


@router.delete("/harvest-lots/{lot_id}")
async def delete_lot(lot_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_row(conn, "harvest_lots", lot_id, "lot_not_found")
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await conn.execute("delete from public.harvest_lots where id=$1::uuid", lot_id)
    return {"ok": True}


@router.get("/orgs/{org_id}/harvest-lots")
async def list_org_lots(org_id: str, season: Optional[int] = Query(default=None),
                        user_id: str = Depends(get_current_user_id)):
    """Org-wide lot picker for the sales form (trace code + field name + already-sold quantity)."""
    org_id = _uid(org_id, "org_not_found")
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        sql = (f"""select {_LOT_SELECT_L}, f.name as field_name,
                          (select coalesce(sum(s.quantity),0) from public.sales s where s.lot_id = l.id)
                            as sold_quantity
                   from public.harvest_lots l
                   left join public.fields f on f.id = l.field_id
                   where l.org_id=$1::uuid""")
        args: list = [org_id]
        if season:
            args.append(int(season)); sql += f" and l.season_year=${len(args)}"
        sql += " order by l.harvested_on desc, l.created_at desc limit 300"
        rows = await conn.fetch(sql, *args)
    return [_lot_out(r) for r in rows]


# ================= sales =================
async def _lot_row(conn, lot_id: str):
    try:
        lot = await conn.fetchrow(
            "select id, org_id, field_id, season_year from public.harvest_lots where id=$1::uuid",
            lot_id)
    except (asyncpg.exceptions.DataError, ValueError):
        raise HTTPException(status_code=404, detail="lot_not_found")
    if not lot:
        raise HTTPException(status_code=404, detail="lot_not_found")
    return lot


def _season_clause(args: list, season: Optional[int]) -> str:
    args.append(int(season))
    return f" and coalesce(s.season_year, extract(year from s.sold_on)::int) = ${len(args)}"


@router.get("/orgs/{org_id}/sales")
async def list_sales(org_id: str, season: Optional[int] = Query(default=None),
                     buyer_id: Optional[str] = Query(default=None),
                     field_id: Optional[str] = Query(default=None),
                     user_id: str = Depends(get_current_user_id)):
    org_id = _uid(org_id, "org_not_found")
    sql = ("""select s.id, s.org_id, s.lot_id, s.field_id, s.buyer_id, s.season_year, s.sold_on,
                     s.quantity, s.unit, s.price_per_unit, s.revenue, s.currency, s.payment_status,
                     s.invoice_no, s.notes, s.created_at,
                     f.name as field_name, b.name as buyer_name, l.trace_code as trace_code
              from public.sales s
              left join public.fields f on f.id = s.field_id
              left join public.buyers b on b.id = s.buyer_id
              left join public.harvest_lots l on l.id = s.lot_id
              where s.org_id=$1::uuid""")
    args: list = [org_id]
    if season:
        sql += _season_clause(args, season)
    if _clean(buyer_id):
        args.append(buyer_id.strip()); sql += f" and s.buyer_id=${len(args)}::uuid"
    if _clean(field_id):
        args.append(field_id.strip()); sql += f" and s.field_id=${len(args)}::uuid"
    sql += " order by s.sold_on desc, s.created_at desc limit 500"
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        try:
            rows = await conn.fetch(sql, *args)
        except (asyncpg.exceptions.DataError, ValueError):
            # A malformed uuid filter is a client error, not a server error.
            raise HTTPException(status_code=400, detail="invalid_filter")
    return [_sale_out(r) for r in rows]


@router.post("/orgs/{org_id}/sales")
async def create_sale(org_id: str, body: SaleIn, user_id: str = Depends(get_current_user_id)):
    org_id = _uid(org_id, "org_not_found")
    unit = _check(body.unit, UNITS, "invalid_unit", default="kq")
    currency = _check(body.currency, CURRENCIES, "invalid_currency", default="AZN")
    payment_status = _check(body.payment_status, PAYMENT_STATUSES,
                            "invalid_payment_status", default="paid")
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WRITE)

        field_id = _uid(body.field_id, "field_not_found") if body.field_id else None
        buyer_id = _uid(body.buyer_id, "buyer_not_found") if body.buyer_id else None
        season_year = body.season_year
        lot_id = _uid(body.lot_id, "lot_not_found") if body.lot_id else None
        if lot_id:
            lot = await _lot_row(conn, lot_id)
            if str(lot["org_id"]) != org_id:
                raise HTTPException(status_code=404, detail="lot_not_found")
            field_id = field_id or str(lot["field_id"])
            season_year = season_year or lot["season_year"]
        if field_id:
            await _assert_field_in_org(conn, field_id, org_id)
        if buyer_id:
            buyer_org = await _org_of_row(conn, "buyers", buyer_id, "buyer_not_found")
            if buyer_org != org_id:
                raise HTTPException(status_code=404, detail="buyer_not_found")
        if season_year is None:
            season_year = body.sold_on.year

        # Total: explicit revenue wins, otherwise quantity × unit price.
        revenue = body.revenue
        if revenue is None and body.quantity is not None and body.price_per_unit is not None:
            revenue = float(_num(body.quantity) * _num(body.price_per_unit))

        row = await conn.fetchrow(
            """insert into public.sales
                 (org_id, lot_id, field_id, buyer_id, season_year, sold_on, quantity, unit,
                  price_per_unit, revenue, currency, payment_status, invoice_no, notes, created_by)
               values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6::date,$7::numeric,$8,
                       $9::numeric,$10::numeric,$11,$12,$13,$14,$15::uuid)
               returning id, org_id, lot_id, field_id, buyer_id, season_year, sold_on, quantity,
                         unit, price_per_unit, revenue, currency, payment_status, invoice_no,
                         notes, created_at""",
            org_id, lot_id, field_id, buyer_id, int(season_year), body.sold_on,
            _num(body.quantity), unit, _num(body.price_per_unit), _num(revenue), currency,
            payment_status, _clean(body.invoice_no), _clean(body.notes), user_id)
    return _sale_out(row)


@router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_row(conn, "sales", sale_id, "sale_not_found")
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await conn.execute("delete from public.sales where id=$1::uuid", sale_id)
    return {"ok": True}


@router.get("/orgs/{org_id}/sales/summary")
async def sales_summary(org_id: str, season: Optional[int] = Query(default=None),
                        user_id: str = Depends(get_current_user_id)):
    """Totals by buyer and by crop + the still-unpaid (payment_status <> 'paid') amount."""
    org_id = _uid(org_id, "org_not_found")
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)

        t_args: list = [org_id]
        t_sql = ("""select coalesce(sum(s.revenue),0) as revenue,
                           coalesce(sum(s.quantity),0) as quantity,
                           count(*) as count
                    from public.sales s where s.org_id=$1::uuid""")
        if season:
            t_sql += _season_clause(t_args, season)
        tot = await conn.fetchrow(t_sql, *t_args)

        o_args: list = [org_id]
        o_sql = ("""select coalesce(sum(s.revenue),0) as amount, count(*) as count
                    from public.sales s
                    where s.org_id=$1::uuid and s.payment_status <> 'paid'""")
        if season:
            o_sql += _season_clause(o_args, season)
        out = await conn.fetchrow(o_sql, *o_args)

        b_args: list = [org_id]
        b_sql = ("""select s.buyer_id, coalesce(b.name, 'Naməlum alıcı') as buyer_name,
                           coalesce(sum(s.revenue),0) as revenue,
                           coalesce(sum(s.quantity),0) as quantity,
                           count(*) as count
                    from public.sales s
                    left join public.buyers b on b.id = s.buyer_id
                    where s.org_id=$1::uuid""")
        if season:
            b_sql += _season_clause(b_args, season)
        b_sql += " group by s.buyer_id, b.name order by revenue desc"
        buyers = await conn.fetch(b_sql, *b_args)

        c_args: list = [org_id]
        c_sql = ("""select coalesce(nullif(l.crop_type,''), nullif(m.crop_type,''), 'digər') as crop,
                           coalesce(sum(s.revenue),0) as revenue,
                           coalesce(sum(s.quantity),0) as quantity,
                           count(*) as count
                    from public.sales s
                    left join public.harvest_lots l on l.id = s.lot_id
                    left join public.field_metadata m on m.field_id = s.field_id
                    where s.org_id=$1::uuid""")
        if season:
            c_sql += _season_clause(c_args, season)
        c_sql += " group by 1 order by revenue desc"
        crops = await conn.fetch(c_sql, *c_args)

        seasons = await conn.fetch(
            """select distinct coalesce(season_year, extract(year from sold_on)::int) as year
               from public.sales where org_id=$1::uuid order by year desc""", org_id)

    return {
        "totals": {"revenue": _f(tot["revenue"]) or 0.0, "quantity": _f(tot["quantity"]) or 0.0,
                   "count": int(tot["count"])},
        "outstanding": {"amount": _f(out["amount"]) or 0.0, "count": int(out["count"])},
        "by_buyer": [{"buyer_id": str(r["buyer_id"]) if r["buyer_id"] else None,
                      "buyer_name": r["buyer_name"], "revenue": _f(r["revenue"]) or 0.0,
                      "quantity": _f(r["quantity"]) or 0.0, "count": int(r["count"])}
                     for r in buyers],
        "by_crop": [{"crop": r["crop"], "revenue": _f(r["revenue"]) or 0.0,
                     "quantity": _f(r["quantity"]) or 0.0, "count": int(r["count"])}
                    for r in crops],
        "seasons": [int(r["year"]) for r in seasons if r["year"] is not None],
    }
