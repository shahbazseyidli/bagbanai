-- 0060_scene_attempts.sql — why a satellite pass did NOT become a picture.
--
-- THE GAP THIS FILLS. `public.scenes` records every granule that survived: search found it, the
-- COG read succeeded, and some pixels over the field were valid. Everything else is thrown away
-- inside the loop in geo_pipeline/pipeline.py, printed to a log nobody reads and forgotten. So the
-- farmer's most common question about the satellite — "why hasn't my field updated in three
-- weeks?" — is unanswerable from the database, and the honest answer ("Sentinel-2 flew over on the
-- 8th, 13th and 18th and all three were cloud") is exactly the answer we already have and discard.
--
-- Measured, not assumed: across all seven live fields and 120 days, EVERY within-orbit gap in
-- public.scenes is an exact multiple of 5 days (56 gaps of 5, 12 of 10, 13 of 20, 2 of 15, 2 of 30,
-- 1 of 25 — and nothing else). That is the Sentinel-2 constellation's 5-day repeat, and it means a
-- gap of 20 is not a satellite that stopped flying; it is three passes we could not use. Without
-- this table the platform cannot tell those two apart, and neither can the farmer.
--
-- WHAT IT IS NOT. Not a copy of scenes — it holds the REJECTIONS and one row per accepted granule
-- so a coverage rate can be computed without joining. Not a log table in the syslog sense: it is
-- bounded by (field × sensor × pass), roughly 70 rows per field per year, and is read on the field
-- page. Not an error table — "cloudy" is the normal outcome, not a fault.
create table if not exists public.scene_attempts (
  id           uuid primary key default gen_random_uuid(),
  field_id     uuid not null references public.fields(id) on delete cascade,
  org_id       uuid not null,
  sensor       text not null,                 -- S2 | S30 | L30, same vocabulary as scenes.sensor
  acquired_at  date not null,
  -- NOT NULL with an empty default so the unique key below can be a plain constraint. Postgres
  -- does not accept an expression inside UNIQUE (...), and coalescing in a unique INDEX would then
  -- force every ON CONFLICT in the pipeline to repeat the same expression. Both search paths
  -- always have a granule id; '' is the degenerate case, not the normal one.
  granule_id   text not null default '',
  mgrs_tile    text,
  cloud_pct    numeric,
  -- written        — became a row in public.scenes
  -- no_valid_pixels— granule read fine, but every pixel over the field was cloud/shadow/nodata
  -- read_error     — the COG could not be read (transient network, a tile whose extent misses us)
  -- too_cloudy     — rejected by the max_cloud filter before any read was attempted
  outcome      text not null,
  detail       text,                          -- exception text, truncated; null on success
  attempted_at timestamptz not null default now(),
  -- One row per granule per field. A re-run of the same window must UPDATE the verdict rather than
  -- stack duplicates — the daily cron re-searches the last 30 days every night, so without this
  -- key the table would grow by a full month of granules per day.
  unique (field_id, sensor, acquired_at, granule_id)
);

create index if not exists scene_attempts_field_idx
  on public.scene_attempts (field_id, acquired_at desc);

comment on table public.scene_attempts is
  'Every granule the search returned and what became of it. The rejections are the point: they turn "no new image since the 6th" into "three passes, all cloud".';

alter table public.scene_attempts enable row level security;

-- Read-only to members, like scenes. Nothing but the pipeline writes here, and the pipeline
-- connects as the table owner — so there is deliberately no insert/update policy: a future
-- least-privileged app role must not be able to forge coverage history.
drop policy if exists scene_attempts_read on public.scene_attempts;
create policy scene_attempts_read on public.scene_attempts for select
  using (public.is_org_member(public.current_user_id(), org_id));
