"""Public tokenized field share links (HYBRID_PLAN W8, A10).

A farmer creates a link for ONE field; anyone holding the token sees a minimal, read-only
"field card" (name, area, crop, boundary, latest NDVI + date, optionally the NDVI raster tiles).

SECURITY MODEL — the public endpoint is the only unauthenticated route in the app besides
/api/geo/segment-public, and it is deliberately narrow:
  * It accepts a TOKEN ONLY. There is no code path where a caller supplies a field_id, an
    org_id or a user_id: the token row is the capability.
  * A revoked / expired / soft-deleted target resolves to 404 — never 403 — so a probe can
    never distinguish "this token existed" from "this token never existed".
  * The payload is an EXPLICIT whitelist built field-by-field. `dict(row)` is never returned,
    so a future column added to fields/field_metadata cannot silently leak.
  * Nothing about the org, the owner, notes, costs, yields, advice, tasks or any OTHER field
    is exposed — not even indirectly (no ids that address other resources).
  * Per view it runs 3 cheap indexed queries + 1 single-row counter update. No AI, no raster
    maths, no outbound calls — safe to hammer.

Owner-side endpoints (create / list / revoke) are gated normally through deps.py.
"""
import json
import secrets
import uuid as _uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field as PField

from ..config import settings
from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_member, require_role
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["shares"])

# What a share may expose. 'card' = the farmer-facing summary card (all A10 needs today);
# 'full' is reserved for a future richer public view and currently renders the same payload.
SCOPES = ("card", "full")
MAX_EXPIRY_DAYS = 365
# Vegetation index the public card reports. Fixed on purpose: the token must not let the
# viewer pivot to arbitrary per-field data by twiddling a query param.
PUBLIC_INDEX = "NDVI"
# Universal NDVI band edges — must agree with app/src/lib/indexStatus.ts VEG_TIERS fallback.
_NDVI_EDGES = (0.2, 0.4, 0.6, 0.8)
_NDVI_TIERS = (
    ("Çox zəif", "bad", "Sahədə demək olar ki, yaşıllıq yoxdur — çılpaq və ya çox seyrək örtük."),
    ("Zəif", "warn", "Bitki örtüyü seyrəkdir — sahə zəif inkişaf edir."),
    ("Orta", "warn", "Bitki örtüyü inkişaf edir — orta vəziyyət."),
    ("Sağlam", "good", "Bitki örtüyü sıx və sağlamdır."),
    ("Çox sağlam", "good", "Çox sıx, güclü bitki örtüyü."),
)


class ShareIn(BaseModel):
    scope: Optional[str] = "card"
    include_ndvi: bool = True
    label: Optional[str] = PField(default=None, max_length=120)
    # Either is accepted; expires_at wins when both are given. Both null = a link with no expiry.
    expires_days: Optional[int] = None
    expires_at: Optional[datetime] = None


def _uid(value: Optional[str], detail: str) -> str:
    """Canonicalise a path uuid. A malformed id is a 404, not a Postgres 22P02 → 500."""
    try:
        return str(_uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail=detail)


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _iso(v) -> Optional[str]:
    return v.isoformat() if v is not None else None


def _resolve_expiry(body: ShareIn) -> Optional[datetime]:
    if body.expires_at is not None:
        dt = body.expires_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    if body.expires_days is None:
        return None
    try:
        days = int(body.expires_days)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="bad_expires_days")
    if days < 1 or days > MAX_EXPIRY_DAYS:
        raise HTTPException(status_code=400, detail="bad_expires_days")
    return datetime.now(timezone.utc) + timedelta(days=days)


def _ndvi_verdict(value: Optional[float]) -> dict:
    """Plain-Azerbaijani reading of an NDVI mean. Deterministic, no crop calibration here:
    the public card must stay understandable without the farmer's private context."""
    if value is None:
        return {"status": None, "tone": None, "text": None}
    tier = 0
    while tier < len(_NDVI_EDGES) and value >= _NDVI_EDGES[tier]:
        tier += 1
    status, tone, text = _NDVI_TIERS[min(tier, len(_NDVI_TIERS) - 1)]
    return {"status": status, "tone": tone, "text": text}


def _share_out(r) -> dict:
    """Owner-side share row → JSON (whitelisted; safe to return to org members)."""
    return {
        "id": str(r["id"]),
        "token": r["token"],
        "path": f"/s/{r['token']}",
        "scope": r["scope"],
        "include_ndvi": bool(r["include_ndvi"]),
        "label": r["label"],
        "expires_at": _iso(r["expires_at"]),
        "revoked_at": _iso(r["revoked_at"]),
        "view_count": int(r["view_count"] or 0),
        "last_viewed_at": _iso(r["last_viewed_at"]),
        "created_at": _iso(r["created_at"]),
    }


# ---------------------------------------------------------------- owner side (authenticated)

@router.post("/fields/{field_id}/shares")
async def create_share(field_id: str, body: ShareIn,
                       user_id: str = Depends(get_current_user_id)):
    """Mint a public link for this field. ROLES_WRITE — a worker cannot publish a field."""
    fid = _uid(field_id, "field_not_found")
    scope = (body.scope or "card").strip().lower()
    if scope not in SCOPES:
        raise HTTPException(status_code=400, detail="bad_scope")
    label = (body.label or "").strip() or None
    expires = _resolve_expiry(body)
    token = secrets.token_urlsafe(24)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, fid)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        row = await conn.fetchrow(
            """insert into public.field_shares
                 (field_id, org_id, token, scope, include_ndvi, label, created_by, expires_at)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7::uuid,$8)
               returning id, token, scope, include_ndvi, label, expires_at, revoked_at,
                         view_count, last_viewed_at, created_at""",
            fid, org_id, token, scope, bool(body.include_ndvi), label, user_id, expires)
    out = _share_out(row)
    out["url"] = f"{settings.next_public_app_url.rstrip('/')}{out['path']}"
    return out


@router.get("/fields/{field_id}/shares")
async def list_shares(field_id: str, user_id: str = Depends(get_current_user_id)):
    """All links ever minted for this field (active + revoked), newest first, with view counts."""
    fid = _uid(field_id, "field_not_found")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, fid)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select id, token, scope, include_ndvi, label, expires_at, revoked_at,
                      view_count, last_viewed_at, created_at
               from public.field_shares
               where field_id=$1::uuid order by created_at desc limit 100""", fid)
    base = settings.next_public_app_url.rstrip("/")
    items = []
    for r in rows:
        o = _share_out(r)
        o["url"] = f"{base}{o['path']}"
        items.append(o)
    return {"items": items}


@router.delete("/shares/{share_id}")
async def revoke_share(share_id: str, user_id: str = Depends(get_current_user_id)):
    """Revoke a link (stamped, not deleted — the view counter stays auditable)."""
    sid = _uid(share_id, "share_not_found")
    async with connection(user_id) as conn:
        org_id = await conn.fetchval(
            "select org_id from public.field_shares where id=$1::uuid", sid)
        if not org_id:
            raise HTTPException(status_code=404, detail="share_not_found")
        await require_role(conn, user_id, str(org_id), ROLES_WRITE)
        await conn.execute(
            "update public.field_shares set revoked_at=now() where id=$1::uuid and revoked_at is null",
            sid)
    return {"ok": True, "id": sid}


# ---------------------------------------------------------------- public side (NO auth)

@router.get("/public/share/{token}")
async def public_share(token: str):
    """Resolve a share token → a minimal read-only field card. NO authentication dependency:
    the token IS the capability. Any failure (unknown / revoked / expired / field deleted)
    returns the same 404 so the endpoint can't be used to enumerate or confirm tokens."""
    tok = (token or "").strip()
    # Cheap shape guard so garbage never reaches the DB (tokens are token_urlsafe(24) = 32 chars).
    if not tok or len(tok) > 128:
        raise HTTPException(status_code=404, detail="not_found")

    async with connection(None) as conn:
        row = await conn.fetchrow(
            """select s.id, s.field_id, s.scope, s.include_ndvi, s.expires_at, s.revoked_at,
                      f.name as field_name, f.area_ha, f.deleted_at,
                      st_asgeojson(f.geom) as geom, st_asgeojson(f.centroid) as centroid,
                      m.crop_type
               from public.field_shares s
               join public.fields f on f.id = s.field_id
               left join public.field_metadata m on m.field_id = f.id
               where s.token = $1""", tok)
        if row is None or row["revoked_at"] is not None or row["deleted_at"] is not None:
            raise HTTPException(status_code=404, detail="not_found")
        exp = row["expires_at"]
        if exp is not None:
            # timestamptz comes back tz-aware from asyncpg; normalise defensively so a naive
            # value can never raise a TypeError (which would 500 instead of 404).
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp <= datetime.now(timezone.utc):
                raise HTTPException(status_code=404, detail="not_found")

        field_id = str(row["field_id"])
        stat = await conn.fetchrow(
            """select mean, acquired_at from public.index_stats
               where field_id=$1::uuid and index_name=$2
               order by acquired_at desc limit 1""", field_id, PUBLIC_INDEX)

        raster = None
        if row["include_ndvi"]:
            raster = await conn.fetchrow(
                """select storage_path, acquired_at from public.index_rasters
                   where field_id=$1::uuid and index_name=$2
                   order by acquired_at desc limit 1""", field_id, PUBLIC_INDEX)

        # Counter update stays inside the same transaction; single indexed row, no contention risk.
        await conn.execute(
            "update public.field_shares set view_count = view_count + 1, last_viewed_at = now() "
            "where id=$1::uuid", str(row["id"]))

    value = _f(stat["mean"]) if stat else None
    tile_url = None
    if raster is not None and raster["storage_path"]:
        # Clipped, field-masked COG (the pipeline writes one per scene+index) — it contains
        # nothing outside this field's boundary, so serving it publicly leaks no other field.
        url_param = quote(raster["storage_path"], safe="")
        tile_url = (f"{settings.titiler_public_base}/cog/tiles/WebMercatorQuad/{{z}}/{{x}}/{{y}}.png"
                    f"?url={url_param}&colormap_name=rdylgn&rescale=-0.1,0.9")

    # EXPLICIT whitelist — do not replace with dict(row).
    return {
        "scope": row["scope"],
        "field": {
            "name": row["field_name"],
            "area_ha": _f(row["area_ha"]),
            "crop_type": row["crop_type"],
            "geometry": json.loads(row["geom"]) if row["geom"] else None,
            "centroid": json.loads(row["centroid"]) if row["centroid"] else None,
        },
        "index": {
            "name": PUBLIC_INDEX,
            "value": round(value, 3) if value is not None else None,
            "date": _iso(stat["acquired_at"]) if stat else None,
            **_ndvi_verdict(value),
        },
        "raster": {
            "tile_url": tile_url,
            "date": _iso(raster["acquired_at"]) if raster is not None else None,
            "colormap": "rdylgn",
            "rescale": "-0.1,0.9",
        },
        "brand": "Agradex",
    }
