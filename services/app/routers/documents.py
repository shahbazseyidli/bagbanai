"""Field document dossier (HYBRID_PLAN W6 / B15) + receipt photo → expense (W7 / B17).

Also carries the file-SERVING path the platform was missing. Uploaded bytes live on the local
object-storage volume (settings.object_storage_root, mounted ./storage:/srv/storage) and nginx only
proxies /api/, so the single way to read a stored file back is:

    GET /api/documents/{id}/download

which resolves the row → field → org, gates on membership, guards against path traversal and only
then streams the bytes. A stored file_path is NEVER returned to the client, and a path coming out of
the database is never opened before os.path.realpath proves it sits inside the storage root."""
from __future__ import annotations

import json
import os
import secrets
import uuid as _uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from ..config import settings
from ..db import connection
from ..deps import (ROLES_WORKER, ROLES_WRITE, get_current_user_id, require_member,
                    require_role)
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["documents"])

# ---- upload policy -----------------------------------------------------------------------------
_MAX_BYTES = 15 * 1024 * 1024  # 15 MB — a phone photo of a lab report / contract scan fits easily

# mime → extension whitelist. Anything not listed is rejected with 415: the bytes are served back
# from our own origin, so only inert types (images + PDF) may ever be stored.
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
# Claude vision can only read raster images (a PDF receipt must be photographed / exported first).
_VISION_MIME: dict[str, str] = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
    "image/webp": ".webp", "image/gif": ".gif",
}

_KINDS = {"lab", "cadastre", "receipt", "contract", "photo", "other"}

# Parsed receipt category → the free-text public.field_operations.type used across the ledger
# (see OperationsTab chips / B2 expense breakdown). Unknown → 'digər'.
_CATEGORY_OP: dict[str, str] = {
    "gübrə": "Gübrələmə", "gubre": "Gübrələmə", "gübrələmə": "Gübrələmə", "fertilizer": "Gübrələmə",
    "pestisid": "Çiləmə", "dərman": "Çiləmə", "derman": "Çiləmə", "çiləmə": "Çiləmə",
    "pesticide": "Çiləmə", "herbisid": "Çiləmə", "fungisid": "Çiləmə",
    "toxum": "Əkin", "seed": "Əkin", "əkin": "Əkin", "ting": "Əkin",
    "yanacaq": "Yanacaq", "fuel": "Yanacaq", "dizel": "Yanacaq",
    "texnika": "Texnika", "equipment": "Texnika", "avadanlıq": "Texnika",
    "işçi": "İşçi haqqı", "isci": "İşçi haqqı", "labour": "İşçi haqqı", "labor": "İşçi haqqı",
    "suvarma": "Suvarma", "irrigation": "Suvarma", "su": "Suvarma",
}
_DEFAULT_OP = "digər"

_DOC_COLS = ("id, kind, title, original_name, mime_type, size_bytes, parsed, operation_id, "
             "created_at")


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
    """Absolute, symlink-resolved storage root. Used both when writing and when serving so the
    traversal guard compares like with like."""
    return Path(os.path.realpath(settings.object_storage_root))


def _save_bytes(data: bytes, ext: str) -> str:
    """Write the bytes under <root>/uploads with a random name; return the relative path stored in
    the DB (same "uploads/<token>.<ext>" convention as field_photos.photo_path)."""
    dest_dir = _storage_root() / "uploads"
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_urlsafe(16)}{ext}"
    (dest_dir / name).write_bytes(data)
    return f"uploads/{name}"


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


def _clean_name(name: Optional[str]) -> Optional[str]:
    """Display-only file name: basename, no path separators, bounded length."""
    if not name:
        return None
    base = os.path.basename(str(name).replace("\\", "/")).strip()
    base = base.replace("\r", "").replace("\n", "")
    return base[:200] or None


async def _read_upload(file: UploadFile, allowed: dict[str, str]) -> tuple[bytes, str, str]:
    mime = (file.content_type or "").split(";")[0].strip().lower()
    ext = allowed.get(mime)
    if not ext:
        raise HTTPException(status_code=415, detail="unsupported_media_type")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty_file")
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="file_too_large")
    return data, mime, ext


def _doc_out(r) -> dict:
    parsed = r["parsed"]
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except ValueError:
            parsed = None
    return {
        "id": str(r["id"]),
        "kind": r["kind"],
        "title": r["title"],
        "original_name": r["original_name"],
        "mime_type": r["mime_type"],
        "size_bytes": int(r["size_bytes"]) if r["size_bytes"] is not None else None,
        "parsed": parsed,
        "operation_id": str(r["operation_id"]) if r["operation_id"] else None,
        "created_at": r["created_at"].isoformat(),
        # Never the disk path — the authenticated serve route.
        "download_url": f"/api/documents/{r['id']}/download",
    }


def _op_type(category: Optional[str]) -> str:
    c = (category or "").strip().lower()
    if not c:
        return _DEFAULT_OP
    if c in _CATEGORY_OP:
        return _CATEGORY_OP[c]
    for key, op in _CATEGORY_OP.items():
        if key in c:
            return op
    return _DEFAULT_OP


def _as_date(v) -> Optional[date]:
    """Best-effort date from whatever the vision model wrote (ISO first, then dd.mm.yyyy)."""
    if isinstance(v, date):
        return v
    s = str(v or "").strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s[:10]).date()
    except ValueError:
        pass
    for sep in (".", "/", "-"):
        parts = s.split(sep)
        if len(parts) == 3:
            try:
                d, m, y = (int(p) for p in parts)
            except ValueError:
                continue
            if y < 100:
                y += 2000
            try:
                return date(y, m, d)
            except ValueError:
                continue
    return None


def _num(v) -> Optional[float]:
    try:
        return float(v) if v is not None and v != "" else None
    except (TypeError, ValueError):
        return None


def _draft_expense(parsed: Optional[dict]) -> Optional[dict]:
    """Turn a vision extract into a DRAFT public.field_operations row (never written here)."""
    if not parsed:
        return None
    vendor = (str(parsed.get("vendor") or "")).strip() or None
    performed = _as_date(parsed.get("purchase_date")) or date.today()
    currency = (str(parsed.get("currency") or "AZN")).strip().upper()[:8] or "AZN"
    items = [i for i in (parsed.get("items") or []) if isinstance(i, dict)]
    inputs = []
    for i in items:
        name = (str(i.get("name") or "")).strip()
        if not name:
            continue
        inputs.append({"product": name[:200], "amount": _num(i.get("qty")),
                       "unit": (str(i.get("unit") or "")).strip()[:20] or None,
                       "price": _num(i.get("price"))})
    return {
        "type": _op_type(parsed.get("category")),
        "performed_on": performed.isoformat(),
        "cost": _num(parsed.get("total")),
        "currency": currency,
        "vendor": vendor,
        "notes": f"Qəbz: {vendor}" if vendor else "Qəbz üzrə xərc",
        "inputs": inputs,
    }


# ---- B15: dossier ------------------------------------------------------------------------------
@router.post("/fields/{field_id}/documents")
async def upload_document(field_id: str,
                          file: UploadFile = File(...),
                          kind: str = Form(default="other"),
                          title: Optional[str] = Form(default=None),
                          user_id: str = Depends(get_current_user_id)):
    """Attach a file (lab PDF, cadastre scan, receipt photo, contract) to the field."""
    _require_uuid(field_id, "field_not_found")
    data, mime, ext = await _read_upload(file, _MIME_EXT)
    k = (kind or "other").strip().lower()
    if k not in _KINDS:
        k = "other"
    original = _clean_name(file.filename)
    clean_title = (title or "").strip()[:200] or None

    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)
        path = _save_bytes(data, ext)  # written only after the org gate passes
        row = await conn.fetchrow(
            f"""insert into public.field_documents
                  (field_id, org_id, kind, title, file_path, original_name, mime_type,
                   size_bytes, uploaded_by)
                values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9::uuid)
                returning {_DOC_COLS}""",
            field_id, org_id, k, clean_title, path, original, mime, len(data), user_id)
    return _doc_out(row)


@router.get("/fields/{field_id}/documents")
async def list_documents(field_id: str, kind: Optional[str] = Query(default=None),
                         user_id: str = Depends(get_current_user_id)):
    """The field's dossier, newest first. Soft-deleted rows are hidden."""
    _require_uuid(field_id, "field_not_found")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        q = (f"select {_DOC_COLS} from public.field_documents "
             "where field_id=$1::uuid and deleted_at is null")
        args: list = [field_id]
        if kind:
            args.append(kind.strip().lower())
            q += f" and kind=${len(args)}"
        q += " order by created_at desc limit 200"
        rows = await conn.fetch(q, *args)
    return [_doc_out(r) for r in rows]


@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user_id: str = Depends(get_current_user_id)):
    """Authenticated file serving — the only read path for stored bytes (nginx proxies /api/ only).

    Org-gated, traversal-guarded, streamed with the stored mime type."""
    _require_uuid(doc_id, "document_not_found")
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select field_id, file_path, original_name, mime_type from public.field_documents "
            "where id=$1::uuid and deleted_at is null", doc_id)
        if not row:
            raise HTTPException(status_code=404, detail="document_not_found")
        org_id = await _org_of_field(conn, str(row["field_id"]))
        await require_member(conn, user_id, org_id)

    real = _resolve_stored(row["file_path"])
    if real is None:
        raise HTTPException(status_code=404, detail="file_not_found")
    mime = (row["mime_type"] or "application/octet-stream").split(";")[0].strip()
    if mime not in _MIME_EXT:  # never serve a type we would not have accepted
        mime = "application/octet-stream"
    inline = mime.startswith("image/") or mime == "application/pdf"
    return FileResponse(
        path=str(real),
        media_type=mime,
        filename=_clean_name(row["original_name"]) or real.name,
        content_disposition_type="inline" if inline else "attachment",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300"})


@router.get("/photos/{photo_id}/download")
async def download_photo(photo_id: str, user_id: str = Depends(get_current_user_id)):
    """Same authenticated serve path for public.field_photos (0031) bytes — those rows store the
    identical "uploads/<token>.<ext>" convention and had no read route at all, so thumbnails were
    dead links. Mime is inferred from the stored extension (the table has no mime column)."""
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


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user_id: str = Depends(get_current_user_id)):
    """Soft-delete (stamps deleted_at; the bytes survive on disk like fields.deleted_at / D2.7)."""
    _require_uuid(doc_id, "document_not_found")
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            "select field_id from public.field_documents where id=$1::uuid and deleted_at is null",
            doc_id)
        if not row:
            raise HTTPException(status_code=404, detail="document_not_found")
        org_id = await _org_of_field(conn, str(row["field_id"]))
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        await conn.execute(
            "update public.field_documents set deleted_at=now() where id=$1::uuid", doc_id)
    return {"ok": True, "id": doc_id}


# ---- B17: receipt photo → expense --------------------------------------------------------------
@router.post("/fields/{field_id}/receipt")
async def upload_receipt(field_id: str,
                         file: Optional[UploadFile] = File(default=None),
                         title: Optional[str] = Form(default=None),
                         create_operation: bool = Query(default=False),
                         document_id: Optional[str] = Query(default=None),
                         user_id: str = Depends(get_current_user_id)):
    """Store a receipt photo as a kind='receipt' document, vision-parse it and return a DRAFT
    expense. The operation row is written only when create_operation=true (the confirm step), which
    may re-post the same file OR pass ?document_id=<id> to reuse the already-parsed document
    (no second upload, no second AI call).

    Degrades gracefully: no LLM key / unreadable photo → the document is still saved and
    parsed=null comes back with an Azerbaijani message. Never 500."""
    _require_uuid(field_id, "field_not_found")
    if document_id:
        _require_uuid(document_id, "document_not_found")

    data: Optional[bytes] = None
    mime = ext = ""
    if file is not None and getattr(file, "filename", None):
        data, mime, ext = await _read_upload(file, _VISION_MIME)
    elif not document_id:
        raise HTTPException(status_code=400, detail="file_required")

    message: Optional[str] = None

    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WORKER)

        if data is not None:
            path = _save_bytes(data, ext)
            row = await conn.fetchrow(
                f"""insert into public.field_documents
                      (field_id, org_id, kind, title, file_path, original_name, mime_type,
                       size_bytes, uploaded_by)
                    values ($1::uuid,$2::uuid,'receipt',$3,$4,$5,$6,$7,$8::uuid)
                    returning {_DOC_COLS}""",
                field_id, org_id, (title or "").strip()[:200] or None, path,
                _clean_name(file.filename if file else None), mime, len(data), user_id)
        else:
            row = await conn.fetchrow(
                f"select {_DOC_COLS} from public.field_documents "
                "where id=$1::uuid and field_id=$2::uuid and deleted_at is null",
                document_id, field_id)
            if not row:
                raise HTTPException(status_code=404, detail="document_not_found")

        doc = _doc_out(row)
        parsed = doc.get("parsed")

        if data is not None and not parsed:
            from ..ai import llm
            if not llm.is_configured():
                message = "AI qoşulmayıb — qəbz saxlanıldı, məbləği əl ilə daxil edin."
            else:
                try:
                    from .. import tiers
                    from ..ai import receipt as receipt_ai
                    tier = await tiers.org_tier(conn, org_id)
                    out = await receipt_ai.parse_receipt(
                        conn, field_id, org_id, [(mime, data)], model=tiers.model_for(tier))
                    if out and out.get("parsed"):
                        parsed = out["parsed"]
                        await conn.execute(
                            "update public.field_documents set parsed=$2::jsonb, model_name=$3 "
                            "where id=$1::uuid",
                            doc["id"], json.dumps(parsed, ensure_ascii=False), out.get("model_name"))
                        doc["parsed"] = parsed
                    else:
                        message = "AI qoşulmayıb — qəbz saxlanıldı, məbləği əl ilə daxil edin."
                except Exception:  # noqa: BLE001 — the upload must survive any AI failure
                    message = "Qəbz oxunmadı — şəkil aydın deyil. Xərci əl ilə daxil edin."
        elif not parsed:
            message = "Bu sənəd üçün oxunmuş məlumat yoxdur."

        draft = _draft_expense(parsed)
        operation = None
        if create_operation:
            if doc.get("operation_id"):
                # Idempotent confirm: this receipt already produced an expense.
                message = message or "Bu qəbz üçün xərc artıq yazılıb."
            elif draft and draft.get("cost") is not None:
                performed = _as_date(draft["performed_on"]) or date.today()
                op = await conn.fetchrow(
                    """insert into public.field_operations
                         (field_id, org_id, type, performed_on, inputs, cost, currency,
                          performed_by, notes)
                       values ($1::uuid,$2::uuid,$3,$4::date,$5::jsonb,$6,$7,$8::uuid,$9)
                       returning id, created_at""",
                    field_id, org_id, draft["type"], performed,
                    json.dumps(draft["inputs"], ensure_ascii=False), draft["cost"],
                    draft["currency"], user_id, draft["notes"])
                await conn.execute(
                    "update public.field_documents set operation_id=$2::uuid where id=$1::uuid",
                    doc["id"], str(op["id"]))
                doc["operation_id"] = str(op["id"])
                operation = {"id": str(op["id"]), "created_at": op["created_at"].isoformat(),
                             **{k: draft[k] for k in ("type", "performed_on", "cost", "currency",
                                                      "notes")}}
            else:
                message = message or "Xərc yazılmadı — qəbzdən məbləğ oxunmadı."

    return {"document": doc, "parsed": parsed, "draft": draft, "operation": operation,
            "message": message}
