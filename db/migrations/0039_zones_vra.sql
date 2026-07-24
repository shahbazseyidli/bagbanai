-- 0039_zones_vra.sql — HYBRID_PLAN W8 (A6 productivity zones + A7 VRA-lite).
-- Zones are computed in the geo image (rasterio is NOT installed in the API image) from the
-- per-pixel index COGs recorded in public.index_rasters, stacked across seasons and reduced to a
-- per-pixel percentile, then vectorized into n zones. A7 turns those zones into a nutrient dose
-- plan and an expected AZN saving vs a uniform rate. Additive; no RLS (server-side gating).

create table if not exists public.field_zone_runs (
  id                uuid primary key default gen_random_uuid(),
  field_id          uuid not null references public.fields(id) on delete cascade,
  org_id            uuid not null,
  index_name        text not null default 'NDVI',
  sensor            text not null default 'S2',        -- S2 | S30 | L30 (matches index_rasters.sensor)
  n_zones           int  not null default 5,
  season_from       int,
  season_to         int,
  month_from        int  not null default 5,           -- peak-season window used
  month_to          int  not null default 8,
  max_cloud_pct     numeric,
  n_scenes          int  not null default 0,
  pixel_size_m      numeric,
  valid_pixels      int,
  field_mean        numeric,
  homogeneity_cv    numeric,                            -- std/mean of the per-pixel multi-season value
  homogeneity_class text,                               -- uniform | moderate | variable
  status            text not null default 'queued',     -- queued | running | ready | failed
  message           text,
  computed_at       timestamptz not null default now(),
  unique (field_id, index_name, sensor, n_zones)
);
create index if not exists field_zone_runs_field_idx on public.field_zone_runs (field_id, computed_at desc);
create index if not exists field_zone_runs_queue_idx on public.field_zone_runs (status, computed_at);

create table if not exists public.field_zones (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.field_zone_runs(id) on delete cascade,
  field_id     uuid not null references public.fields(id) on delete cascade,
  org_id       uuid not null,
  zone_no      int  not null,                           -- 1 = lowest productivity … n = highest
  geom         geometry(MultiPolygon,4326) not null,
  area_ha      numeric(12,4),
  pixel_count  int,
  mean_value   numeric,
  min_value    numeric,
  max_value    numeric,
  std_value    numeric,
  p10          numeric,
  p50          numeric,
  p90          numeric,
  rel_to_field numeric,                                 -- mean_value / field_mean (drives the A7 dose modifier)
  created_at   timestamptz not null default now(),
  unique (run_id, zone_no)
);
create index if not exists field_zones_field_idx on public.field_zones (field_id, run_id);
create index if not exists field_zones_gix       on public.field_zones using gist (geom);

-- ===== A7 VRA-lite =====
create table if not exists public.vra_plans (
  id               uuid primary key default gen_random_uuid(),
  field_id         uuid not null references public.fields(id) on delete cascade,
  org_id           uuid not null,
  run_id           uuid references public.field_zone_runs(id) on delete set null,
  season_year      int  not null,
  crop_type        text,
  nutrient         text not null default 'N',           -- N | P | K
  base_dose_kg_ha  numeric,                             -- uniform reference rate
  uniform_total_kg numeric,
  vra_total_kg     numeric,
  saved_kg         numeric,
  price_azn_per_kg numeric,
  saved_azn        numeric,
  strategy         text not null default 'compensate',  -- compensate (feed weak) | maximize (feed strong)
  notes            text,
  created_by       uuid references public.users(id),
  created_at       timestamptz not null default now()
);
create index if not exists vra_plans_field_idx on public.vra_plans (field_id, season_year desc);

create table if not exists public.vra_zone_doses (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.vra_plans(id) on delete cascade,
  zone_id    uuid references public.field_zones(id) on delete set null,
  zone_no    int  not null,
  area_ha    numeric,
  dose_kg_ha numeric,
  total_kg   numeric,
  created_at timestamptz not null default now(),
  unique (plan_id, zone_no)
);
