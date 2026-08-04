"""Authenticated file serving for stored photo bytes.

WHY THIS FILE STILL EXISTS. It was the field document dossier (HYBRID_PLAN W6 / B15) plus the
receipt-photo → expense flow (W7 / B17). Both were removed on 2026-08-04 with the "Sənədlər"
section. What survives is the ONE route in here that was never about documents:

    GET /api/photos/{id}/download   → public.field_photos (0031)

PhotosTab renders every thumbnail through it, so deleting this module wholesale would have left the
photo section with broken images. The name is kept rather than the file renamed: main.py, and any
running container, import `routers.documents`.

Uploaded bytes live on the local object-storage volume (settings.object_storage_root, mounted
./storage:/srv/storage) and nginx only proxies /api/, so an authenticated route is the single way to
read a stored file back. A stored file_path is NEVER returned to the client, and a path coming out
of the database is never opened before os.path.realpath proves it sits inside the storage root.

WHAT WAS **NOT** REMOVED: public.field_documents (migration 0035) is intact — not dropped, same
precedent as the subsidy calculator and the ERP strip. Every uploaded lab report, cadastre extract,
contract and receipt is still on disk and still in the table; there is simply no UI and no route
that reads them. Re-exposing them means restoring the endpoints below their old names, not a
migration.
"""
from __future__ import annotations

import os
import uuid as _uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from ..config import settings
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["documents"])

# mime → extension whitelist. The bytes are served back from our own origin, so only inert types
# (images + PDF) are ever recognised; anything else falls through to application/octet-stream.
_MIME_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
}


# ---- helpers -----------------------------------------------------------------------------------
def _is_uuid(v: str) -> bool:
    try:
        _uuid.UUID(str(v))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _require_uuid(v: str, detail: str) -> str:
    if not _is_uuid(v):
        raise HTTPException(status_code=404, detail=detail)
    return v


def _storage_root() -> Path:
    """Absolute, symlink-resolved storage root, so the traversal guard compares like with like."""
    return Path(os.path.realpath(settings.object_storage_root))


def _resolve_stored(rel_path: str) -> Optional[Path]:
    """Map a stored relative path to a real file INSIDE the storage root, or None.

    The DB value is treated as untrusted input: leading slashes are stripped so it can never be
    absolute, and realpath() + relative_to() reject any '..' or symlink escape before the file is
    opened."""
    rel = (rel_path or "").strip().replace("\\", "/").lstrip("/")
    if not rel:
        return None
    root = _storage_root()
    real = Path(os.path.realpath(root / rel))
    try:
        real.relative_to(root)
    except ValueError:
        return None
    return real if real.is_file() else None


@router.get("/photos/{photo_id}/download")
async def download_photo(photo_id: str, user_id: str = Depends(get_current_user_id)):
    """Authenticated serve path for public.field_photos (0031) bytes — those rows store the
    "uploads/<token>.<ext>" convention and had no read route at all, so thumbnails were dead links.
    Mime is inferred from the stored extension (the table has no mime column)."""
    _require_uuid(photo_id, "photo_not_found")
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select field_id, photo_path from public.field_photos where id=$1::uuid", photo_id)
        if not row:
            raise HTTPException(status_code=404, detail="photo_not_found")
        org_id = await _org_of_field(conn, str(row["field_id"]))
        await require_member(conn, user_id, org_id)

    real = _resolve_stored(row["photo_path"])
    if real is None:
        raise HTTPException(status_code=404, detail="file_not_found")
    ext = real.suffix.lower()
    mime = next((m for m, e in _MIME_EXT.items() if e == ext), "application/octet-stream")
    return FileResponse(
        path=str(real), media_type=mime, filename=real.name, content_disposition_type="inline",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300"})
