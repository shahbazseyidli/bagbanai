-- 0035_documents.sql — HYBRID_PLAN W6/W7 (B15 file dossier + B17 receipt→expense).
-- One row per file attached to a field: lab PDF, cadastre scan, receipt photo, contract.
-- Bytes live on the local object-storage volume; file_path holds the same relative
-- "uploads/<name>" string already used by field_photos.photo_path (0031).
-- B17 links a parsed receipt to the field_operations row it created. Additive; no RLS.

create table if not exists public.field_documents (
  id            uuid primary key default gen_random_uuid(),
  field_id      uuid not null references public.fields(id) on delete cascade,
  org_id        uuid not null,
  kind          text not null default 'other',   -- lab | cadastre | receipt | contract | photo | other
  title         text,
  file_path     text not null,                   -- "uploads/<token>.<ext>" relative to OBJECT_STORAGE_ROOT
  original_name text,                            -- display only; never used to build a disk path
  mime_type     text,
  size_bytes    bigint,
  parsed        jsonb,                           -- B17 vision extract {vendor,date,total,currency,items[]}
  model_name    text,                            -- vision model that produced `parsed` (null = no AI)
  operation_id  uuid references public.field_operations(id) on delete set null,  -- B17 receipt → expense
  uploaded_by   uuid references public.users(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz                      -- soft-delete + undo, like fields.deleted_at (0025)
);
create index if not exists field_documents_field_idx     on public.field_documents (field_id, created_at desc);
create index if not exists field_documents_kind_idx      on public.field_documents (field_id, kind);
create index if not exists field_documents_operation_idx on public.field_documents (operation_id);
