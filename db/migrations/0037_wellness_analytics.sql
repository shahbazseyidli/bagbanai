-- 0037_wellness_analytics.sql — HYBRID_PLAN W7 (B8 wellness score, A5 season compare, A8 backfill).
-- B8 stores a daily 0-100 field score with its component sub-scores so the UI can explain the
-- number. A5 needs DOY-resolved curves (the 0028 feature store holds END-of-season aggregates
-- only, so it cannot answer "as of 24 July I am 12% behind last year"). A8 adds a backfill job
-- queue mirroring research_jobs (0014). Additive; no RLS (server-side gating).

create table if not exists public.field_wellness (
  field_id    uuid not null references public.fields(id) on delete cascade,
  org_id      uuid not null,
  computed_on date not null,
  score       int  not null,                       -- 0..100
  tone        text not null,                       -- good | warn | bad (matches lib/indexStatus Tone)
  ndvi_score  numeric,                             -- 0..100 component
  water_score numeric,
  pest_score  numeric,
  gdd_score   numeric,
  components  jsonb not null default '{}'::jsonb,  -- {ndvi:{value,prior,pct,weight,reason}, ...}
  missing     text[] not null default '{}',        -- inputs unavailable → weights renormalized
  sensor      text,                                -- S2 | HLS used for the vegetation component
  headline    text,                                -- AZ one-liner for the chip tooltip
  updated_at  timestamptz not null default now(),
  primary key (field_id, computed_on)
);
create index if not exists field_wellness_field_idx on public.field_wellness (field_id, computed_on desc);
create index if not exists field_wellness_org_idx   on public.field_wellness (org_id, computed_on desc);

-- A5: DOY-resolved season curve + partial-season integral, additive to the 0028 feature store.
alter table public.field_season_features
  add column if not exists ndvi_peak_doy    int,      -- day-of-year of ndvi_peak
  add column if not exists ndvi_by_doy      jsonb,    -- [[doy,ndvi],...] weekly-binned, cloud-gap tolerant
  add column if not exists integral_by_doy  jsonb,    -- [[doy,cum_integral],...] → same-DOY YoY compare
  add column if not exists precip_total_src text,     -- forecast_only | archive (0028 precip is unreliable)
  add column if not exists source           text not null default 'live';  -- live | backfill

-- A8: retrospective backfill jobs (queue worker pattern, mirrors research_jobs 0014).
-- Deliberately NOT reusing fields.data_status/data_progress_* (0009) — those are owned by the live
-- queue worker and drive the "Peyk məlumatı hazırlanır" banner, which must not lie during a backfill.
create table if not exists public.field_backfill_jobs (
  id             uuid primary key default gen_random_uuid(),
  field_id       uuid not null references public.fields(id) on delete cascade,
  org_id         uuid not null,
  year_from      int  not null,
  year_to        int  not null,
  sensor         text not null default 'hls',       -- hls | s2 | all
  status         text not null default 'queued',    -- queued | running | done | failed
  years_done     int  not null default 0,
  years_total    int  not null default 0,
  scenes_written int  not null default 0,
  message        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (field_id, year_from, year_to)
);
create index if not exists field_backfill_jobs_queue_idx on public.field_backfill_jobs (status, created_at);

drop trigger if exists field_backfill_jobs_touch on public.field_backfill_jobs;
create trigger field_backfill_jobs_touch before update on public.field_backfill_jobs
  for each row execute function public.touch_updated_at();
