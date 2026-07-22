-- 0021: D2 benchmark hardening (T10). Upgrades the peer benchmark to percentiles (p10/p50/p90),
-- enforces k-anonymity (a week is returned only when ≥5 distinct fields contribute — HARD-CODED per
-- spec, non-configurable), and gates contribution on org consent (benchmark_opt_in). The API layer
-- additionally restricts VIEWING to the business tier.
alter table public.organizations
  add column if not exists benchmark_opt_in boolean not null default true;

-- Return type changes (mean_avg → p10/p50/p90) so the function must be dropped + recreated.
drop function if exists public.index_benchmark(text, text, uuid);

create function public.index_benchmark(p_index text, p_crop text, p_exclude uuid)
returns table(week date, p10 double precision, p50 double precision, p90 double precision, n int)
language sql stable security definer set search_path = public as $$
  select date_trunc('week', s.acquired_at)::date as week,
         percentile_cont(0.1) within group (order by s.mean)::double precision as p10,
         percentile_cont(0.5) within group (order by s.mean)::double precision as p50,
         percentile_cont(0.9) within group (order by s.mean)::double precision as p90,
         count(distinct s.field_id)::int as n
  from public.index_stats s
  join public.fields f on f.id = s.field_id
  join public.organizations o on o.id = f.org_id
  left join public.field_metadata m on m.field_id = s.field_id
  where s.index_name = p_index and s.mean is not null
    and s.acquired_at >= current_date - 180
    and s.sensor in ('S30','L30')                 -- HLS-only baseline (single resolution)
    and o.benchmark_opt_in = true                 -- consent gate
    and (p_crop is null or m.crop_type = p_crop)
    and (p_exclude is null or s.field_id <> p_exclude)
  group by 1
  having count(distinct s.field_id) >= 5          -- k-anonymity: suppress cohorts < 5 fields
  order by 1;
$$;

comment on function public.index_benchmark(text, text, uuid) is
  'Weekly peer percentiles (p10/p50/p90) for an index. k-anonymity n>=5 + consent (benchmark_opt_in). SECURITY DEFINER: aggregates only.';
