"""Field photos (HYBRID_PLAN E10, 0031). A farmer uploads a photo of the field/crop/tree; if AI is
configured it is auto-labeled (subject + condition) via Claude vision and stored so the label feeds
the advice context. Without AI the photo is still stored (label null). Field-scoped, org-gated."""
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..db import connection
from ..deps import ROLES_WORKER, get_current_user_id, require_member, require_role
from ..schemas import FieldPhotoOut
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["photos"])

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
        # Best-effort AI auto-label; falls back to a plain (unlabeled) row.
        from ..ai import llm
        if llm.is_configured():
            try:
                from .. import tiers
                from ..ai import photo_label
                tier = await tiers.org_tier(conn, org_id)
                return _dict_out(await photo_label.label_and_store(
                    conn, field_id, org_id, path, [(media, data)], model=tiers.model_for(tier)))
            except Exception:  # noqa: BLE001 — labeling is best-effort; still store the photo
                pass
        r = await conn.fetchrow(
            """insert into public.field_photos (field_id, org_id, photo_path)
               values ($1::uuid,$2::uuid,$3)
               returning id, field_id, photo_path, ai_label, ai_condition, ai_notes, created_at""",
            field_id, org_id, path)
    return _photo_out(r)


def _dict_out(d: dict) -> FieldPhotoOut:
    return FieldPhotoOut(
        id=d["id"], field_id=d["field_id"], photo_path=d["photo_path"], ai_label=d.get("ai_label"),
        ai_condition=d.get("ai_condition"), ai_notes=d.get("ai_notes"), created_at=d["created_at"])
