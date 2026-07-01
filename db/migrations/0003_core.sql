-- 0003_core.sql — organizations / membership / roles / farms / fields / field_metadata (spec §7)

-- ===== ORGANIZATIONS / MEMBERSHIP / ROLES =====
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id),
  country text default 'AZ',
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner','admin','agronomist','worker','viewer');

create table public.organization_members (
  org_id        uuid references public.organizations(id) on delete cascade,
  user_id       uuid references public.users(id) on delete cascade,
  role          org_role not null default 'viewer',
  status        text not null default 'active',    -- invited|active|removed
  invited_email text,
  created_at    timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.organization_members (user_id);

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'viewer',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz
);

-- ===== FARMS / FIELDS =====
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  region text,
  centroid geometry(Point,4326),
  created_at timestamptz not null default now()
);
create index farms_org_idx on public.farms (org_id);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  org_id  uuid not null references public.organizations(id) on delete cascade,  -- denormalized
  name text not null,
  geom geometry(Polygon,4326) not null,
  centroid geometry(Point,4326) generated always as (st_centroid(geom)) stored,
  area_ha numeric(12,4),
  bbox geometry(Polygon,4326),
  mgrs_tiles text[],
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fields_geom_gix on public.fields using gist (geom);
create index fields_org_idx  on public.fields (org_id);
create index fields_farm_idx on public.fields (farm_id);

-- ===== FIELD METADATA (1:1) =====
create table public.field_metadata (
  field_id uuid primary key references public.fields(id) on delete cascade,
  crop_type text not null, variety text,
  planting_date date, expected_harvest date,
  difficulties jsonb default '[]',
  soil_type text, soil_ph numeric(4,2),
  irrigation_method text, irrigation_available boolean default false,
  previous_crop text, rotation_history jsonb default '[]',
  fertilizer_history jsonb default '[]',
  seeding_density numeric, growth_stage text,
  elevation_m numeric, slope_deg numeric, aspect_deg numeric,
  tillage_practice text, target_yield numeric,
  prior_yields jsonb default '[]', pest_history jsonb default '[]',
  notes text, updated_at timestamptz not null default now()
);

create trigger fields_touch before update on public.fields
  for each row execute function public.touch_updated_at();
create trigger field_metadata_touch before update on public.field_metadata
  for each row execute function public.touch_updated_at();
