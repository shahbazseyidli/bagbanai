-- 0015: two-stage satellite reveal (T0). Mark a field 'partial' the moment the first (HLS 30m)
-- scenes land, so the map/İcmal shows data within minutes while the slower Sentinel-2 10m pass
-- keeps running — instead of a full-screen "preparing…" banner blocking the whole 60-day history.
alter table public.fields
  add column if not exists first_scene_at timestamptz;

-- data_status is free text (none|queued|processing|partial|ready|failed) — no enum/CHECK to alter.
-- Keep the worker-scan index covering the in-flight states; 'partial' fields are mid-run (not
-- re-queued: the queue worker only picks data_status='queued'), the index just keeps polls fast.
drop index if exists fields_data_status_idx;
create index if not exists fields_data_status_idx on public.fields (data_status)
  where data_status in ('queued', 'processing', 'partial');
