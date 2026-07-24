-- 0042_backfill_zone_index.sql — HYBRID_PLAN A8×A6 link.
-- A backfill is stats-only by design (writing every index of every historical scene would explode
-- disk). But productivity zones (A6) read ONLY public.index_rasters, so a stats-only backfill can
-- never unblock them — and the UI was telling farmers to run one. This column lets a job opt into
-- also writing per-pixel COGs for ONE index, and only for peak-season scenes.
alter table public.field_backfill_jobs
  add column if not exists zone_index text;   -- e.g. 'NDVI'; null = stats only
