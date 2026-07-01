-- 0005_farm_mgmt.sql — scouting / tasks / field_operations / yields / reports (spec §7)

-- ===== SCOUTING =====
create table public.scouting_observations (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  created_by uuid references public.users(id),
  geom geometry(Point,4326),
  category text not null,     -- pest|disease|weed|nutrient|water|damage|other
  severity text,              -- low|medium|high
  note text, photos text[],   -- storage paths
  observed_at timestamptz not null default now(),
  status text default 'open'  -- open|resolved
);
create index scouting_field_idx on public.scouting_observations (field_id, observed_at desc);
create index scouting_geom_gix on public.scouting_observations using gist (geom);

-- ===== TASKS =====
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  farm_id uuid references public.farms(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  title text not null,
  type text,                 -- planting|spraying|fertilizing|irrigation|harvest|scouting|other
  assigned_to uuid references public.users(id),
  due_date date, status text default 'todo',  -- todo|in_progress|done|cancelled
  priority text, created_by uuid, notes text,
  created_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks (assigned_to, status);
create index tasks_org_idx on public.tasks (org_id, due_date);

-- ===== FIELD OPERATIONS (activity log) =====
create table public.field_operations (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  type text not null,        -- planting|spraying|fertilizing|irrigation|harvest|tillage|other
  performed_on date not null,
  inputs jsonb,              -- [{product,rate,unit}]
  cost numeric, currency text default 'AZN',
  performed_by uuid, notes text,
  created_at timestamptz not null default now()
);
create index fieldops_field_idx on public.field_operations (field_id, performed_on desc);

-- ===== YIELDS =====
create table public.yields (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  season_year int not null, crop_type text,
  yield_value numeric, yield_unit text,  -- t_ha|kg|t
  area_ha numeric, notes text,
  unique (field_id, season_year, crop_type)
);

-- ===== REPORTS =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  field_id uuid references public.fields(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  type text not null,        -- field_season|scouting|farm_summary
  format text,               -- pdf|xlsx
  params jsonb, storage_path text, generated_by uuid,
  generated_at timestamptz not null default now()
);
