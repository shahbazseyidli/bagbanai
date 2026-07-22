-- 0018: per-field index baseline (T6). Historical p10/p50/p90 per ISO week-of-year, computed from
-- index_stats history, so a current reading can be flagged as anomalously low/high vs the field's
-- own seasonal norm (feeds the VG-3 anomaly rule in T2). Percentiles are computed in SQL
-- (percentile_cont) — no scipy needed in the API image.
create table if not exists public.field_index_baseline (
  field_id uuid not null references public.fields(id) on delete cascade,
  index_name text not null,
  week int not null,              -- ISO week-of-year 1..53
  p10 numeric,
  p50 numeric,
  p90 numeric,
  n int not null,
  updated_at timestamptz not null default now(),
  primary key (field_id, index_name, week)
);
