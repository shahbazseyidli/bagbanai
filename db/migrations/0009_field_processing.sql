-- Async satellite-data processing status per field (for the "data preparing…" UX with
-- progress + ETA + ready notification) and raster COG bookkeeping (§10.5 tiles).

alter table public.fields
  add column if not exists data_status text not null default 'none',   -- none|queued|processing|ready|failed
  add column if not exists data_progress_done int not null default 0,
  add column if not exists data_progress_total int not null default 0,
  add column if not exists data_started_at timestamptz,
  add column if not exists data_ready_at timestamptz,
  add column if not exists data_eta_seconds int,
  add column if not exists data_message text;

-- Queue worker scans this frequently — partial index keeps it cheap.
create index if not exists fields_data_status_idx on public.fields (data_status)
  where data_status in ('queued', 'processing');

-- One clipped/colorizable COG per (scene, index); queryable by field + index + date.
create unique index if not exists index_rasters_scene_index_uq
  on public.index_rasters (scene_id, index_name);
create index if not exists index_rasters_field_idx
  on public.index_rasters (field_id, index_name, acquired_at);
