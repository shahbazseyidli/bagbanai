-- 0036_weather_history.sql — HYBRID_PLAN W7 (B19: farmer rain log + year-over-year weather chart).
-- weather_cache (0004) is FORECAST-only and field_water_balance (0020) is wiped on every recompute,
-- so neither can back a multi-year chart. This stores OBSERVED daily weather (Open-Meteo archive,
-- keyless) per field plus the farmer's own rain-gauge readings.
-- B18 (regional frost dates) needs NO table — it caches into the existing zone_knowledge (0014)
-- as block_type='frost_dates' with crop_type='*'. Additive; no RLS (server-side gating).

create table if not exists public.field_weather_daily (
  field_id   uuid not null references public.fields(id) on delete cascade,
  org_id     uuid not null,
  date       date not null,
  t_min      numeric,
  t_max      numeric,
  precip_mm  numeric,
  et0_mm     numeric,
  source     text not null default 'openmeteo_archive',  -- openmeteo_archive | openmeteo_forecast
  updated_at timestamptz not null default now(),
  primary key (field_id, date)
);
create index if not exists field_weather_daily_year_idx
  on public.field_weather_daily (field_id, (extract(year from date)), date);

create table if not exists public.field_rain_log (
  id          uuid primary key default gen_random_uuid(),
  field_id    uuid not null references public.fields(id) on delete cascade,
  org_id      uuid not null,
  observed_on date not null,
  amount_mm   numeric not null,           -- farmer's gauge reading
  note        text,
  created_by  uuid references public.users(id),
  created_at  timestamptz not null default now(),
  unique (field_id, observed_on)
);
create index if not exists field_rain_log_field_idx on public.field_rain_log (field_id, observed_on desc);
