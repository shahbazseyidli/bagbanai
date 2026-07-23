"""Marketplace provider directory + profiles + catalog (HYBRID_PLAN §E, 0031).

Providers (lab / consultant / supplier) publish a profile + catalog; farmers browse the directory
and contact them via /api/chat. Profile/catalog are self-scoped (users.id); the directory is
readable by any authenticated user. RLS is not used — access is gated server-side here."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import connection
from ..deps import get_current_user_id
from ..schemas import CatalogItemIn, CatalogItemOut, ProviderIn, ProviderOut

router = APIRouter(prefix="/api/providers", tags=["providers"])


def _provider_out(r) -> ProviderOut:
    return ProviderOut(
        id=str(r["id"]), user_id=str(r["user_id"]), kind=r["kind"], company=r["company"],
        bio=r["bio"], specializations=list(r["specializations"] or []),
        country=r["country"], region=r["region"], address=r["address"], coverage=r["coverage"],
        phone=r["phone"], rating=float(r["rating"]) if r["rating"] is not None else None,
        order_count=r["order_count"], featured=r["featured"])


def _catalog_out(r) -> CatalogItemOut:
    return CatalogItemOut(
        id=str(r["id"]), provider_id=str(r["provider_id"]), name=r["name"], category=r["category"],
        unit=r["unit"], price=float(r["price"]) if r["price"] is not None else None,
        currency=r["currency"], description=r["description"])


_SELECT = ("id, user_id, kind, company, bio, specializations, country, region, address, "
           "coverage, phone, rating, order_count, featured")


@router.get("", response_model=list[ProviderOut])
async def list_providers(
    user_id: str = Depends(get_current_user_id),
    kind: Optional[str] = Query(default=None),
    country: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    spec: Optional[str] = Query(default=None),
):
    """Public directory (any authenticated user). Filters: kind, country, region, spec, free-text q."""
    where = ["1=1"]
    args: list = []
    if kind:
        args.append(kind); where.append(f"kind = ${len(args)}::user_role")
    if country:
        args.append(country); where.append(f"country ilike ${len(args)}")
    if region:
        args.append(f"%{region}%"); where.append(f"region ilike ${len(args)}")
    if spec:
        args.append(spec); where.append(f"${len(args)} = any(specializations)")
    if q:
        args.append(f"%{q}%"); where.append(f"(company ilike ${len(args)} or bio ilike ${len(args)})")
    sql = (f"select {_SELECT} from public.provider_profiles where " + " and ".join(where) +
           " order by featured desc, order_count desc, created_at desc limit 100")
    async with connection(user_id) as conn:
        rows = await conn.fetch(sql, *args)
    return [_provider_out(r) for r in rows]


@router.get("/me")
async def my_profile(user_id: str = Depends(get_current_user_id)):
    """The caller's own provider profile (null if they haven't created one)."""
    async with connection(user_id) as conn:
        r = await conn.fetchrow(
            f"select {_SELECT} from public.provider_profiles where user_id=$1::uuid", user_id)
    return _provider_out(r) if r else None


@router.put("/me", response_model=ProviderOut)
async def upsert_profile(body: ProviderIn, user_id: str = Depends(get_current_user_id)):
    """Create/replace the caller's provider profile. Also promotes users.role to their provider kind."""
    async with connection(user_id) as conn:
        r = await conn.fetchrow(
            f"""insert into public.provider_profiles
                  (user_id, kind, company, bio, specializations, country, region, address, coverage, phone, updated_at)
                values ($1::uuid, $2::user_role, $3, $4, $5::text[], $6, $7, $8, $9, $10, now())
                on conflict (user_id) do update set
                  kind=excluded.kind, company=excluded.company, bio=excluded.bio,
                  specializations=excluded.specializations, country=excluded.country,
                  region=excluded.region, address=excluded.address, coverage=excluded.coverage,
                  phone=excluded.phone, updated_at=now()
                returning {_SELECT}""",
            user_id, body.kind.value, body.company, body.bio, list(body.specializations or []),
            body.country, body.region, body.address, body.coverage, body.phone)
        await conn.execute(
            "update public.users set role=$2::user_role where id=$1::uuid", user_id, body.kind.value)
    return _provider_out(r)


@router.get("/me/catalog", response_model=list[CatalogItemOut])
async def my_catalog(user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        pid = await conn.fetchval(
            "select id from public.provider_profiles where user_id=$1::uuid", user_id)
        if not pid:
            return []
        rows = await conn.fetch(
            "select id, provider_id, name, category, unit, price, currency, description "
            "from public.catalog_items where provider_id=$1::uuid order by created_at desc", pid)
    return [_catalog_out(r) for r in rows]


@router.post("/me/catalog", response_model=CatalogItemOut)
async def add_catalog_item(body: CatalogItemIn, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        pid = await conn.fetchval(
            "select id from public.provider_profiles where user_id=$1::uuid", user_id)
        if not pid:
            raise HTTPException(status_code=400, detail="no_provider_profile")
        r = await conn.fetchrow(
            """insert into public.catalog_items (provider_id, name, category, unit, price, currency, description)
               values ($1::uuid, $2, $3, $4, $5, $6, $7)
               returning id, provider_id, name, category, unit, price, currency, description""",
            pid, body.name, body.category, body.unit, body.price, body.currency, body.description)
    return _catalog_out(r)


@router.delete("/me/catalog/{item_id}")
async def delete_catalog_item(item_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        await conn.execute(
            """delete from public.catalog_items ci using public.provider_profiles pp
               where ci.id=$1::uuid and ci.provider_id=pp.id and pp.user_id=$2::uuid""",
            item_id, user_id)
    return {"ok": True}


@router.get("/{provider_id}")
async def provider_detail(provider_id: str, user_id: str = Depends(get_current_user_id)):
    """Public provider profile + catalog for the directory detail view."""
    async with connection(user_id) as conn:
        r = await conn.fetchrow(
            f"select {_SELECT} from public.provider_profiles where id=$1::uuid", provider_id)
        if not r:
            raise HTTPException(status_code=404, detail="provider_not_found")
        items = await conn.fetch(
            "select id, provider_id, name, category, unit, price, currency, description "
            "from public.catalog_items where provider_id=$1::uuid order by created_at desc", provider_id)
    return {"provider": _provider_out(r).model_dump(), "catalog": [_catalog_out(i).model_dump() for i in items]}
