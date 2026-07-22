-- 0017: Growing-Degree-Days accumulation (T4). Daily GDD = max(0,(tmin+tmax)/2 − base_c) cumulated
-- from the season start, sourced from Open-Meteo archive (keyless). Base temp from
-- crop_thresholds.gdd_base_c (fallback 10°C). Foundation for phenology (T6), FAO-56 stage-Kc (T8),
-- and pest GDD windows (T9). Plain table mirroring weather_cache — reads gated by require_member.
create table if not exists public.field_gdd_daily (
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  date date not null,
  season_year int not null,
  t_min numeric,
  t_max numeric,
  base_c numeric not null,
  gdd_day numeric not null default 0,
  gdd_cumulative numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (field_id, date)
);
create index if not exists field_gdd_field_season_idx
  on public.field_gdd_daily (field_id, season_year, date);
