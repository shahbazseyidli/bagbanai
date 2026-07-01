"""Local photo/file upload (scouting, later reports). Stores under OBJECT_STORAGE_ROOT/uploads.

Local-volume driver now; swap for S3-compatible object storage later (see CLAUDE.md)."""
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..deps import get_current_user_id

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 12 * 1024 * 1024  # 12 MB


@router.post("")
async def upload(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    ext = ALLOWED.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=415, detail="unsupported_type")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="file_too_large")
    dest_dir = Path(settings.object_storage_root) / "uploads"
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_urlsafe(16)}{ext}"
    (dest_dir / name).write_bytes(data)
    return {"path": f"uploads/{name}"}
