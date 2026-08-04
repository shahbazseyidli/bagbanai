"""Field photos (HYBRID_PLAN E10, 0031). A farmer uploads a photo of the field/crop/tree; on a tier
that includes vision it is auto-labeled (subject + condition) and stored so the label feeds the
advice context. Without vision the photo is still stored (label null). Field-scoped, org-gated.

THE GATE ON THE AUTO-LABEL WAS MISSING, verified live. This route called the vision model on EVERY
upload whenever an LLM key existed — no tier check, no quota check — and recorded kind='photo', the
same counter GET/POST /api/fields/{id}/diagnose meters against photo_per_month. Two consequences:
on Business a farmer filling the gallery spent the 30 diagnoses the pricing page sells them, and on
free/pro, where the limit is 0, the call ran anyway and cost real money for a feature those tiers do
not include. The fix is on both axes — its own tier limit (photo_label_per_month) and its own
ledger kind — because one counter cannot both meter a paid feature and absorb an automatic one.

And the failure was invisible: `except Exception: pass`. A whole vision outage looked exactly like a
farmer who never uploaded anything. It is still non-fatal (the photo must be stored regardless), but
it is logged now."""
import logging
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..db import connection
from ..deps import ROLES_WORKER, get_current_user_id, require_member, require_role
from ..schemas import FieldPhotoOut
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["photos"])
log = logging.getLogger(__name__)

_ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
_MAX = 8 * 1024 * 1024


def _photo_out(r) -> FieldPhotoOut:
    return FieldPhotoOut(
        id=str(r["id"]), field_id=str(r["field_id"]), photo_path=r["photo_path"],
        ai_label=r["ai_label"], ai_condition=r["ai_condition"], ai_notes=r["ai_notes"],
        created_at=r["created_at"].isoformat())


@router.get("/fields/{field_id}/photos", response_model=list[FieldPhotoOut])
async def list_photos(field_id: str, user_id: str = Depends(get_current_user_id)):
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            "select id, field_id, photo_path, ai_label, ai_condition, ai_notes, created_at "
            "from public.field_photos where field_id=$1::uuid order by created_at desc limit 100",
            field_id)
    return [_photo_out(r) for r in rows]


@router.post("/fields/{field_id}/photos", response_model=FieldPhotoOut)
async def add_photo(field_id: str, file: UploadFile = File(...),
                    user_id: str = Depends(get_current_user_id)):
    ext = _ALLOWED.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=415, detail="unsupported_media_type")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty_file")
    if len(data) > _MAX:
        raise HTTPException(status_code=413, detail="file_too_large")
    dest_dir = Path(settings.object_storage_root) / "uploads"
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_urlsafe(16)}{ext}"
    (dest_dir / name).write_bytes(data)
    path = f"uploads/{name}"
    media = file.content_type or "image/jpeg"

    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        # Best-effort AI auto-label; falls back to a plain (unlabeled) row. _label_allowed() holds
        # every condition, including the tier and quota checks this route never had.
        from ..ai import llm
        if await _label_allowed(conn, org_id):
            try:
                from ..ai import photo_label
                return _dict_out(await photo_label.label_and_store(
                    conn, field_id, org_id, path, [(media, data)]))
            except llm.LLMUnavailable as exc:
                # Provider down, no key, or the model never produced a valid label. Non-fatal by
                # design — the photo is the thing the farmer asked to keep — but it is recorded, so
                # an outage is a line in the log instead of a gallery that quietly stops labelling.
                log.warning("photo auto-label unavailable (field=%s): %s", field_id, exc)
            except Exception:  # noqa: BLE001 — never lose the upload over the label
                log.exception("photo auto-label failed (field=%s)", field_id)
        r = await conn.fetchrow(
            """insert into public.field_photos (field_id, org_id, photo_path)
               values ($1::uuid,$2::uuid,$3)
               returning id, field_id, photo_path, ai_label, ai_condition, ai_notes, created_at""",
            field_id, org_id, path)
    return _photo_out(r)


async def _label_allowed(conn, org_id: str) -> bool:
    """Whether this org may spend an automatic vision call right now.

    Three conditions, all silent when false — this is a side effect nobody asked for, so it declines
    rather than raising 402 the way the farmer-initiated /diagnose does:
      1. vision is actually available. vision_available(), NOT is_configured(): after the DeepSeek
         migration those two answers genuinely differ — the text provider can be perfectly healthy
         while nothing in the configuration can read an image — and is_configured() would send every
         upload down a path that cannot see it.
      2. the tier includes automatic labelling (photo_label_per_month > 0 → Business),
      3. this month's label budget is not spent."""
    from .. import tiers
    from ..ai import llm
    if not llm.vision_available():
        return False
    tier = await tiers.org_tier(conn, org_id)
    cap = tiers.limit(tier, "photo_label_per_month")
    if cap <= 0:
        return False
    return await tiers.month_count(conn, org_id, "photo_label") < cap


def _dict_out(d: dict) -> FieldPhotoOut:
    return FieldPhotoOut(
        id=d["id"], field_id=d["field_id"], photo_path=d["photo_path"], ai_label=d.get("ai_label"),
        ai_condition=d.get("ai_condition"), ai_notes=d.get("ai_notes"), created_at=d["created_at"])
