"""Inventory-lite (HYBRID_PLAN W7, B12) — stock items, movements, auto-deduction from field
operations and low-stock alerts (migration 0038).

Items are org-scoped (`public.inventory_items`, unique per org+name); every quantity change is an
append-only row in `public.inventory_moves` so the stock level is always explainable. Field
operations carry free-text `inputs` ([{product, amount}]) with NO product FK, so the deduction hook
fuzzy-matches product names against the org's item names (exact, then containment) and is
idempotent per operation_id. Low-stock alerts land in `public.notifications` (org-level: field_id is
nullable) and are deduped through `public.org_alert_state` (alert_state 0016 needs a field_id).

Gating is server-side: read = member, stock mutations = ROLES_WRITE, the operation deduction hook =
ROLES_WORKER (it follows an operation log entry, which a worker may create)."""
import json
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import connection
from ..deps import (ROLES_WORKER, ROLES_WRITE, get_current_user_id,
                    require_member, require_role, safe_uuid)

router = APIRouter(prefix="/api", tags=["inventory"])

# Allowed enum-ish text values. NEVER trust a raw request value into these columns — validate in
# Python and answer 400, otherwise a bad string reaches Postgres (a real 500 was already caused by
# exactly that in this repo).
CATEGORIES = {"seed", "fertilizer", "pesticide", "fuel", "equipment", "other"}
REASONS = {"purchase", "operation", "adjust", "waste"}
CURRENCIES = {"AZN", "USD", "EUR", "TRY", "RUB"}

LOW_STOCK_COOLDOWN_HOURS = 24


# ---------- request models (kept local on purpose — schemas.py is shared) ----------
class ItemIn(BaseModel):
    name: str
    category: str = "other"
    unit: str = "kq"
    quantity: Optional[float] = 0.0
    min_quantity: Optional[float] = None
    unit_cost: Optional[float] = None
    currency: str = "AZN"
    supplier: Optional[str] = None
    notes: Optional[str] = None


class MoveIn(BaseModel):
    delta: float
    reason: str = "adjust"
    note: Optional[str] = None
    field_id: Optional[str] = None


class DeductIn(BaseModel):
    operation_id: str


# ---------- helpers ----------
def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _dec(v) -> Optional[Decimal]:
    """numeric columns: go through Decimal(str(v)) so 0.1 stays 0.1 and sums stay exact."""
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="invalid_number")


def _num(v) -> str:
    """Compact number for alert copy: 12.0 → '12', 12.50 → '12.5'."""
    try:
        return f"{float(v):g}"
    except (TypeError, ValueError):
        return str(v)


def _clean_text(v: Optional[str], limit: int = 200) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s[:limit] if s else None


def _clean_category(v: Optional[str]) -> str:
    c = (v or "other").strip().lower()
    if c not in CATEGORIES:
        raise HTTPException(status_code=400, detail="invalid_category")
    return c


def _clean_currency(v: Optional[str]) -> str:
    c = (v or "AZN").strip().upper()
    if c not in CURRENCIES:
        raise HTTPException(status_code=400, detail="invalid_currency")
    return c


def _clean_reason(v: Optional[str]) -> str:
    r = (v or "adjust").strip().lower()
    if r not in REASONS:
        raise HTTPException(status_code=400, detail="invalid_reason")
    return r


def _clean_name(v: Optional[str]) -> str:
    n = (v or "").strip()
    if not n:
        raise HTTPException(status_code=400, detail="name_required")
    return n[:120]


def _clean_unit(v: Optional[str]) -> str:
    return (str(v).strip()[:20] if v and str(v).strip() else "kq")


_ITEM_COLS = ("id, org_id, name, category, unit, quantity, min_quantity, unit_cost, currency, "
              "supplier, notes, created_at, updated_at")


def _item_out(r) -> dict:
    qty = _f(r["quantity"]) or 0.0
    minq = _f(r["min_quantity"])
    return {
        "id": str(r["id"]), "org_id": str(r["org_id"]), "name": r["name"],
        "category": r["category"], "unit": r["unit"], "quantity": qty,
        "min_quantity": minq, "unit_cost": _f(r["unit_cost"]), "currency": r["currency"],
        "supplier": r["supplier"], "notes": r["notes"],
        "low": minq is not None and qty <= minq,
        "value": round(qty * (_f(r["unit_cost"]) or 0.0), 2) if r["unit_cost"] is not None else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


def _move_out(r) -> dict:
    return {
        "id": str(r["id"]), "item_id": str(r["item_id"]), "delta": _f(r["delta"]) or 0.0,
        "reason": r["reason"],
        "operation_id": str(r["operation_id"]) if r["operation_id"] else None,
        "field_id": str(r["field_id"]) if r["field_id"] else None,
        "note": r["note"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


async def _item_row(conn, item_id: str):
    try:
        r = await conn.fetchrow(
            f"select {_ITEM_COLS} from public.inventory_items where id=$1::uuid", item_id)
    except (asyncpg.exceptions.DataError, ValueError):
        raise HTTPException(status_code=404, detail="item_not_found")
    if not r:
        raise HTTPException(status_code=404, detail="item_not_found")
    return r


async def _assert_name_free(conn, org_id: str, name: str, exclude_id: Optional[str] = None) -> None:
    """Case-insensitive duplicate guard (the DB unique index is case-sensitive; fuzzy matching is
    not, so two items differing only by case would be ambiguous)."""
    sql = ("select 1 from public.inventory_items "
           "where org_id=$1::uuid and lower(name)=lower($2)")
    args: list = [org_id, name]
    if exclude_id:
        args.append(exclude_id)
        sql += f" and id <> ${len(args)}::uuid"
    if await conn.fetchval(sql, *args):
        raise HTTPException(status_code=409, detail="inventory_name_taken")


async def _maybe_low_stock_alert(conn, org_id: str, item: dict) -> bool:
    """Fire an org-level low-stock notification, deduped for 24h via org_alert_state.

    Returns True when a notification was actually written."""
    minq = item.get("min_quantity")
    if minq is None or (item.get("quantity") or 0.0) > minq:
        return False
    # Atomic dedup: the conflicting update only fires past the cooldown, so nothing is returned
    # when the alert is still fresh.
    fired = await conn.fetchval(
        f"""insert into public.org_alert_state (org_id, alert_key, last_fired_at)
            values ($1::uuid, $2, now())
            on conflict (org_id, alert_key) do update set last_fired_at = now()
              where org_alert_state.last_fired_at < now() - interval '{LOW_STOCK_COOLDOWN_HOURS} hours'
            returning 1""",
        org_id, f"low_stock:{item['id']}")
    if not fired:
        return False
    unit = item.get("unit") or ""
    title = f"Anbar: “{item['name']}” ehtiyatı azalıb"
    body = (f"“{item['name']}” qalığı {_num(item.get('quantity'))} {unit} — "
            f"minimum {_num(minq)} {unit}. Yenidən tədarükü planlaşdırın.")
    await conn.execute(
        """insert into public.notifications
             (field_id, org_id, source, type, severity, title, body, delivered_channels)
           values (null, $1::uuid, 'inventory', 'low_stock', 'warning', $2, $3, array['inapp'])""",
        org_id, title, body)
    return True


async def _apply_move(conn, org_id: str, item_id: str, delta, reason: str,
                      user_id: str, note: Optional[str] = None,
                      operation_id: Optional[str] = None,
                      field_id: Optional[str] = None) -> dict:
    """Insert the movement + adjust the stock level in the SAME transaction."""
    d = _dec(delta)
    await conn.execute(
        """insert into public.inventory_moves
             (org_id, item_id, delta, reason, operation_id, field_id, note, created_by)
           values ($1::uuid,$2::uuid,$3::numeric,$4,$5::uuid,$6::uuid,$7,$8::uuid)""",
        org_id, item_id, d, reason, operation_id, field_id, note, user_id)
    row = await conn.fetchrow(
        f"""update public.inventory_items
              set quantity = coalesce(quantity, 0) + $2::numeric, updated_at = now()
            where id=$1::uuid returning {_ITEM_COLS}""", item_id, d)
    item = _item_out(row)
    if d < 0:
        item["alerted"] = await _maybe_low_stock_alert(conn, org_id, item)
    return item


# ---------- items ----------
@router.get("/orgs/{org_id}/inventory")
async def list_items(org_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            f"select {_ITEM_COLS} from public.inventory_items where org_id=$1::uuid "
            "order by category, name", org_id)
    return [_item_out(r) for r in rows]


@router.post("/orgs/{org_id}/inventory")
async def create_item(org_id: str, body: ItemIn, user_id: str = Depends(get_current_user_id)):
    name = _clean_name(body.name)
    category = _clean_category(body.category)
    currency = _clean_currency(body.currency)
    unit = _clean_unit(body.unit)
    qty = _dec(body.quantity if body.quantity is not None else 0)
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await _assert_name_free(conn, org_id, name)
        try:
            row = await conn.fetchrow(
                f"""insert into public.inventory_items
                      (org_id, name, category, unit, quantity, min_quantity, unit_cost,
                       currency, supplier, notes, created_by)
                    values ($1::uuid,$2,$3,$4,$5::numeric,$6::numeric,$7::numeric,$8,$9,$10,$11::uuid)
                    returning {_ITEM_COLS}""",
                org_id, name, category, unit, qty, _dec(body.min_quantity), _dec(body.unit_cost),
                currency, _clean_text(body.supplier), _clean_text(body.notes, 1000), user_id)
        except asyncpg.exceptions.UniqueViolationError:
            # Lost a race against a concurrent create — same answer as the pre-check.
            raise HTTPException(status_code=409, detail="inventory_name_taken")
        item = _item_out(row)
        # Opening stock counts as a movement so the history explains the level from day one.
        if qty and qty != 0:
            await conn.execute(
                """insert into public.inventory_moves
                     (org_id, item_id, delta, reason, note, created_by)
                   values ($1::uuid,$2::uuid,$3::numeric,'purchase','Başlanğıc qalıq',$4::uuid)""",
                org_id, item["id"], qty, user_id)
    return item


@router.put("/inventory/{item_id}")
async def update_item(item_id: str, body: ItemIn, user_id: str = Depends(get_current_user_id)):
    name = _clean_name(body.name)
    category = _clean_category(body.category)
    currency = _clean_currency(body.currency)
    unit = _clean_unit(body.unit)
    async with connection(user_id) as conn:
        cur = await _item_row(conn, item_id)
        org_id = str(cur["org_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await _assert_name_free(conn, org_id, name, exclude_id=item_id)
        row = await conn.fetchrow(
            f"""update public.inventory_items
                  set name=$2, category=$3, unit=$4, min_quantity=$5::numeric,
                      unit_cost=$6::numeric, currency=$7, supplier=$8, notes=$9, updated_at=now()
                where id=$1::uuid returning {_ITEM_COLS}""",
            item_id, name, category, unit, _dec(body.min_quantity), _dec(body.unit_cost),
            currency, _clean_text(body.supplier), _clean_text(body.notes, 1000))
        item = _item_out(row)
        # A quantity edit is recorded as an 'adjust' movement, never a silent overwrite.
        if body.quantity is not None:
            diff = _dec(body.quantity) - Decimal(str(item["quantity"] or 0))
            if diff != 0:
                item = await _apply_move(conn, org_id, item_id, diff, "adjust", user_id,
                                         note="Düzəliş (redaktə)")
    return item


@router.delete("/inventory/{item_id}")
async def delete_item(item_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        cur = await _item_row(conn, item_id)
        await require_role(conn, user_id, str(cur["org_id"]), ROLES_WRITE)
        await conn.execute("delete from public.inventory_items where id=$1::uuid", item_id)
    return {"ok": True}


# ---------- movements ----------
@router.post("/inventory/{item_id}/move")
async def move_item(item_id: str, body: MoveIn, user_id: str = Depends(get_current_user_id)):
    reason = _clean_reason(body.reason)
    delta = _dec(body.delta if body.delta is not None else 0)
    if delta == 0:
        raise HTTPException(status_code=400, detail="delta_required")
    async with connection(user_id) as conn:
        cur = await _item_row(conn, item_id)
        org_id = str(cur["org_id"])
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        field_id = None
        if body.field_id:
            # Guard before the ::uuid cast — junk here would be 22P02 → 500 instead of 404.
            field_id = await conn.fetchval(
                "select id from public.fields where id=$1::uuid and org_id=$2::uuid",
                safe_uuid(body.field_id, "field_not_found"), org_id)
            if not field_id:
                raise HTTPException(status_code=404, detail="field_not_found")
            field_id = str(field_id)
        item = await _apply_move(conn, org_id, item_id, delta, reason, user_id,
                                 note=_clean_text(body.note, 500), field_id=field_id)
    return item


@router.get("/inventory/{item_id}/moves")
async def list_moves(item_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        cur = await _item_row(conn, item_id)
        await require_member(conn, user_id, str(cur["org_id"]))
        rows = await conn.fetch(
            """select id, item_id, delta, reason, operation_id, field_id, note, created_at
               from public.inventory_moves where item_id=$1::uuid
               order by created_at desc limit 200""", item_id)
    return [_move_out(r) for r in rows]


@router.get("/orgs/{org_id}/inventory/low-stock")
async def low_stock(org_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            f"""select {_ITEM_COLS} from public.inventory_items
                where org_id=$1::uuid and min_quantity is not null and quantity <= min_quantity
                order by name""", org_id)
    return [_item_out(r) for r in rows]


# ---------- auto-deduction from an operation ----------
# Azerbaijani dotted/dotless i: fold every variant to plain 'i' BEFORE casefold(), otherwise
# 'İ'.casefold() becomes 'i' + combining dot and 'NİTRAT' would never match 'nitrat'.
_I_FOLD = str.maketrans({"İ": "i", "I": "i", "ı": "i"})


def _norm(s: Any) -> str:
    """Lowercase + collapse whitespace, Azerbaijani-safe. Used for fuzzy product matching."""
    return " ".join(str(s or "").translate(_I_FOLD).casefold().split())


def _amount_of(raw: Any) -> Optional[float]:
    """Free-text amount → float. Accepts 2, '2', '2,5', '2.5 kq'."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip().replace(",", ".")
    num = ""
    for ch in s:
        if ch.isdigit() or (ch == "." and "." not in num) or (ch == "-" and not num):
            num += ch
        elif num:
            break
    try:
        return float(num) if num not in ("", "-", ".", "-.") else None
    except ValueError:
        return None


def _match_item(product: str, items: list[dict]) -> Optional[dict]:
    """Exact (normalized) name first, then containment either way — longest item name wins so
    'NPK 15-15-15' beats 'NPK' when both exist."""
    p = _norm(product)
    if not p:
        return None
    for it in items:
        if it["_norm"] == p:
            return it
    # Containment only for names of 3+ chars, so a 2-letter item never swallows every product.
    cands = [it for it in items
             if len(it["_norm"]) >= 3 and (it["_norm"] in p or (len(p) >= 3 and p in it["_norm"]))]
    if not cands:
        return None
    return max(cands, key=lambda it: len(it["_norm"]))


@router.post("/orgs/{org_id}/inventory/deduct-operation")
async def deduct_operation(org_id: str, body: DeductIn,
                           user_id: str = Depends(get_current_user_id)):
    """Deduct an operation's free-text inputs from stock (idempotent per operation_id).

    Unmatched products are NOT an error — there is no product FK, so the farmer may well log a
    product that is not tracked in the warehouse."""
    async with connection(user_id) as conn:
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        try:
            op = await conn.fetchrow(
                """select id, field_id, org_id, inputs, performed_on
                   from public.field_operations where id=$1::uuid""", body.operation_id)
        except (asyncpg.exceptions.DataError, ValueError):
            raise HTTPException(status_code=404, detail="operation_not_found")
        if not op or str(op["org_id"]) != str(org_id):
            raise HTTPException(status_code=404, detail="operation_not_found")

        # Idempotency: an operation is deducted exactly once.
        existing = await conn.fetchval(
            "select count(*) from public.inventory_moves where operation_id=$1::uuid",
            str(op["id"]))
        if existing:
            return {"ok": True, "already_deducted": True, "moves": int(existing),
                    "matched": [], "unmatched": []}

        raw = op["inputs"]
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except ValueError:
                raw = []
        inputs = [i for i in (raw or []) if isinstance(i, dict)]
        if not inputs:
            return {"ok": True, "already_deducted": False, "moves": 0,
                    "matched": [], "unmatched": []}

        rows = await conn.fetch(
            f"select {_ITEM_COLS} from public.inventory_items where org_id=$1::uuid", org_id)
        items = []
        for r in rows:
            d = _item_out(r)
            d["_norm"] = _norm(d["name"])
            items.append(d)

        matched: list[dict] = []
        unmatched: list[dict] = []
        # Accumulate per item first — one operation may list the same product twice.
        per_item: dict[str, Decimal] = {}
        labels: dict[str, dict] = {}
        for inp in inputs:
            product = str(inp.get("product") or "").strip()
            if not product:
                continue
            amount = _amount_of(inp.get("amount"))
            hit = _match_item(product, items)
            if hit is None:
                unmatched.append({"product": product, "amount": amount, "reason": "no_match"})
                continue
            if amount is None or amount <= 0:
                unmatched.append({"product": product, "amount": amount,
                                  "item_id": hit["id"], "item_name": hit["name"],
                                  "reason": "no_amount"})
                continue
            per_item[hit["id"]] = per_item.get(hit["id"], Decimal(0)) + Decimal(str(amount))
            labels[hit["id"]] = {"item": hit, "product": product}

        field_id = str(op["field_id"]) if op["field_id"] else None
        note = f"Əməliyyat {op['performed_on'].isoformat()}" if op["performed_on"] else "Əməliyyat"
        for item_id, amount in per_item.items():
            info = labels[item_id]
            after = await _apply_move(
                conn, org_id, item_id, -abs(amount), "operation", user_id,
                note=note, operation_id=str(op["id"]), field_id=field_id)
            matched.append({
                "product": info["product"], "item_id": item_id, "item_name": info["item"]["name"],
                "amount": float(amount), "delta": float(-abs(amount)), "unit": after["unit"],
                "remaining": after["quantity"], "low": after["low"],
                "alerted": bool(after.get("alerted")),
            })
    return {"ok": True, "already_deducted": False, "moves": len(matched),
            "matched": matched, "unmatched": unmatched}
