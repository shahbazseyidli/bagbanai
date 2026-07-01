-- 0004_satellite_weather.sql — scenes / index_stats / index_rasters / weather_cache (spec §7)

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  sensor text not null, acquired_at date not null, mgrs_tile text,
  cloud_pct numeric, valid_pixel_pct numeric, granule_id text,
  created_at timestamptz not null default now(),
  unique (field_id, sensor, acquired_at, mgrs_tile)
);
create index scenes_field_date_idx on public.scenes (field_id, acquired_at desc);

create table public.index_stats (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  index_name text not null,   -- NDVI|EVI|SAVI|MSAVI|NDMI|NDWI|NBR|NBR2|TVI
  mean numeric,min numeric,max numeric,std numeric,p10 numeric,p50 numeric,p90 numeric,
  valid_pixels int, acquired_at date not null,
  created_at timestamptz not null default now(),
  unique (scene_id, index_name)
);
create index index_stats_ts_idx on public.index_stats (field_id, index_name, acquired_at);

create table public.index_rasters (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references public.scenes(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  index_name text not null, storage_path text not null, acquired_at date not null
);

create table public.weather_cache (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  fetched_at timestamptz not null default now(), forecast_date date not null,
  t_min numeric,t_max numeric,precip_mm numeric,precip_prob numeric,et0_mm numeric,
  soil_moisture jsonb, soil_temp jsonb, wind_max numeric, rh_mean numeric, raw jsonb,
  unique (field_id, forecast_date, fetched_at)
);
create index weather_field_idx on public.weather_cache (field_id, forecast_date);
