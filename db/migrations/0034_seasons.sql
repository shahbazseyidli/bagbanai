-- 0034_seasons.sql — HYBRID_PLAN W6 (B3: season/planting entity + lifecycle status).
-- Today public.field_metadata is 1:1 with the field and is fully overwritten on every save
-- (routers/fields.py upsert), so replanting ERASES last year's crop + planting date and no
-- rotation history survives. This adds a first-class per-season row so a field can carry many
-- seasons, each with its own lifecycle status, without changing field_metadata or breaking any
-- of its consumers (AI context, GDD, research dependency map, benchmark SQL all keep working).
-- Additive; org_id denormalized (no FK, matching 0028/0031); RLS skipped — gating is server-side.

create table if not exists public.field_seasons (
  id                  uuid primary key default gen_random_uuid(),
  field_id            uuid not null references public.fields(id) on delete cascade,
  org_id              uuid not null,
  season_year         int  not null,                       -- aligns with yields.season_year / field_season_features.season_year
  crop_type           text not null default '',            -- '' = unknown; NOT NULL keeps the unique key coalesce-free
  variety             text,
  crop_cycle          text,                                -- perennial | annual | biennial
  status              text not null default 'preparation', -- preparation|planted|vegetation|harvest|fallow|closed
  planting_date       date,
  emergence_date      date,
  expected_harvest    date,
  actual_harvest_date date,
  growth_stage        text,                                -- same vocabulary as field_metadata.growth_stage
  stage_source        text not null default 'manual',      -- manual | gdd | ai
  stage_updated_at    timestamptz,
  seeding_density     numeric,
  target_yield        numeric,
  area_ha             numeric,                             -- snapshot of fields.area_ha at season start
  is_current          boolean not null default true,
  source              text not null default 'manual',      -- manual | migrated | auto
  notes               text,
  created_by          uuid references public.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists field_seasons_year_uq    on public.field_seasons (field_id, season_year, crop_type);
create unique index if not exists field_seasons_current_uq on public.field_seasons (field_id) where is_current;
create index        if not exists field_seasons_field_idx  on public.field_seasons (field_id, season_year desc);
create index        if not exists field_seasons_org_idx    on public.field_seasons (org_id, status);

drop trigger if exists field_seasons_touch on public.field_seasons;
create trigger field_seasons_touch before update on public.field_seasons
  for each row execute function public.touch_updated_at();

-- Status transition audit — powers "when did it change", idempotent automation and the season report.
create table if not exists public.field_season_events (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.field_seasons(id) on delete cascade,
  field_id    uuid not null,
  org_id      uuid not null,
  from_status text,
  to_status   text not null,
  occurred_on date not null default current_date,
  source      text not null default 'manual',   -- manual | auto_operation | auto_gdd | auto_date
  note        text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists field_season_events_season_idx on public.field_season_events (season_id, created_at desc);

-- Nullable backlinks so per-season records can be attributed exactly instead of guessing by
-- extract(year from date). Every existing query keeps working untouched.
alter table public.tasks            add column if not exists season_id uuid references public.field_seasons(id) on delete set null;
alter table public.field_operations add column if not exists season_id uuid references public.field_seasons(id) on delete set null;
alter table public.yields           add column if not exists season_id uuid references public.field_seasons(id) on delete set null;

create index if not exists tasks_season_idx      on public.tasks (season_id);
create index if not exists field_ops_season_idx  on public.field_operations (season_id);
create index if not exists yields_season_idx     on public.yields (season_id);

-- Seed one season per field from the existing field_metadata so nothing starts empty.
insert into public.field_seasons (field_id, org_id, season_year, crop_type, variety, crop_cycle,
                                  status, planting_date, expected_harvest, growth_stage,
                                  seeding_density, target_yield, area_ha, is_current, source)
select f.id, fa.org_id,
       coalesce(extract(year from m.planting_date)::int, extract(year from current_date)::int),
       coalesce(m.crop_type, ''), m.variety, m.crop_cycle,
       case when m.planting_date is null then 'preparation' else 'vegetation' end,
       m.planting_date, m.expected_harvest, m.growth_stage,
       m.seeding_density, m.target_yield, f.area_ha, true, 'migrated'
from public.fields f
join public.farms fa on fa.id = f.farm_id
join public.field_metadata m on m.field_id = f.id
where f.deleted_at is null
on conflict do nothing;
