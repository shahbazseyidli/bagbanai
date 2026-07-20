-- 0014_knowledge_layer.sql — AI Knowledge Layer (docs/AI_Knowledge_Layer_Adaptation.md)
--
-- M1 foundation + M5 schema:
--   * crop_thresholds  → per-index calibration + stage/age dimension (M5, fixes Xudat false-"Zəif")
--   * zone_knowledge   → shared (crop_type, zone_id) reference knowledge  — NO RLS (like crop_thresholds/subsidy)
--   * field_knowledge  → per-field passport blocks                        — org_id + RLS
--   * clarifications   → interactive norm-deviation questions             — org_id + RLS
--   * research_jobs    → debounced research queue                          — org_id + RLS
--
-- Conventions (CLAUDE.md): forward-only; NOT NULL defaults so unique keys avoid coalesce-in-index;
-- RLS is defense-in-depth (primary gating is server-side). Knowledge layer is NOT paid-gated (D7).

-- ===== M5: crop_thresholds — per-index norms + stage/age dimension =====
alter table public.crop_thresholds
  add column if not exists growth_stage text not null default 'all',   -- 'all' | dormant|budbreak|leaf|fruit|harvest ...
  add column if not exists age_class    text not null default 'all',   -- 'all' | young|mature ...
  -- Per-index band edges [e1,e2,e3,e4] → 5 tiers (Çox zəif/Zəif/Orta/Sağlam/Çox sağlam).
  -- Calibrates the UI status labels per crop; NULL → UI falls back to universal thresholds.
  add column if not exists index_norms  jsonb;

-- Relax the single-column unique so future stage/age-specific rows can coexist with the crop default.
alter table public.crop_thresholds drop constraint if exists crop_thresholds_crop_type_key;
create unique index if not exists crop_thresholds_key_uq
  on public.crop_thresholds (crop_type, growth_stage, age_class);

-- ===== zone_knowledge — shared reference knowledge (no RLS) =====
create table if not exists public.zone_knowledge (
  id             uuid primary key default gen_random_uuid(),
  crop_type      text not null,                     -- 'hazelnut'
  zone_id        text not null,                     -- rayon code (reverse-geocoded from coordinates)
  block_type     text not null,                     -- crop_profile|index_norms|phenology|water_requirements|pest_disease|agro_practice
  content        jsonb not null,
  sources        jsonb not null default '[]'::jsonb,-- [{url,name,type,retrieved_at,confidence}] — traceability P5
  season_context text not null default 'any',       -- any|spring|summer|autumn|winter
  derived_from   text not null default 'external',  -- external | farmer_aggregate  (data moat, k-anonymity)
  confidence     numeric(3,2),
  created_at     timestamptz not null default now(),
  refreshed_at   timestamptz not null default now(),
  expires_at     timestamptz,
  version        int not null default 1,
  unique (crop_type, zone_id, block_type, season_context)
);
create index if not exists zone_knowledge_lookup_idx on public.zone_knowledge (crop_type, zone_id);

-- ===== field_knowledge — per-field passport (org_id + RLS) =====
create table if not exists public.field_knowledge (
  id           uuid primary key default gen_random_uuid(),
  field_id     uuid not null references public.fields(id) on delete cascade,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  block_type   text not null,                       -- soil_profile|field_context|field_history|resolved_clarifications
  content      jsonb not null,
  sources      jsonb not null default '[]'::jsonb,
  input_hash   text not null,                       -- which input produced this block (staleness detection)
  confidence   numeric(3,2),
  created_at   timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  version      int not null default 1,
  unique (field_id, block_type)
);

-- ===== clarifications — interactive norm-deviation questions (org_id + RLS) =====
create table if not exists public.clarifications (
  id            uuid primary key default gen_random_uuid(),
  field_id      uuid not null references public.fields(id) on delete cascade,
  org_id        uuid not null references public.organizations(id) on delete cascade,
  severity      text not null default 'normal',     -- critical|normal
  topic         text not null,                      -- field_age|crop_type|irrigation ...
  question_text text not null,
  evidence      jsonb not null default '{}'::jsonb, -- {observed,expected_min,index,date}
  options       jsonb not null default '[]'::jsonb, -- structured answer choices
  status        text not null default 'open',       -- open|resolved|dismissed
  answer        jsonb,
  answered_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists clarifications_open_idx on public.clarifications (field_id) where status = 'open';

-- ===== research_jobs — debounced research queue (org_id + RLS; field_id nullable for zone-only jobs) =====
create table if not exists public.research_jobs (
  id                uuid primary key default gen_random_uuid(),
  field_id          uuid references public.fields(id) on delete cascade,
  org_id            uuid references public.organizations(id) on delete cascade,
  trigger_type      text not null,                  -- field_created|data_changed|seasonal|manual
  changed_fields    jsonb,
  blocks_to_refresh jsonb not null default '[]'::jsonb,
  status            text not null default 'queued', -- queued|running|done|failed
  scheduled_for     timestamptz not null default now(),  -- debounce target
  cost_estimate     numeric,
  error             text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);
-- Worker scans due queued jobs frequently — partial index keeps it cheap.
create index if not exists research_jobs_due_idx on public.research_jobs (scheduled_for)
  where status = 'queued';
-- Debounce lookup: find an existing open job for a field to merge into.
create index if not exists research_jobs_field_open_idx on public.research_jobs (field_id)
  where status = 'queued';

-- ===== RLS (defense-in-depth; NOT paid-gated) =====
alter table public.field_knowledge enable row level security;
alter table public.clarifications  enable row level security;
alter table public.research_jobs   enable row level security;

create policy field_knowledge_read on public.field_knowledge for select
  using (public.is_org_member(public.current_user_id(), org_id));

create policy clarifications_read on public.clarifications for select
  using (public.is_org_member(public.current_user_id(), org_id));
-- Farmers (worker+) can answer/dismiss their own clarifications.
create policy clarifications_update on public.clarifications for update
  using (public.has_org_role(public.current_user_id(), org_id,
         array['owner','admin','agronomist','worker']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id,
         array['owner','admin','agronomist','worker']::org_role[]));

create policy research_jobs_read on public.research_jobs for select
  using (org_id is not null and public.is_org_member(public.current_user_id(), org_id));
