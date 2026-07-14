-- 0010 · Regional/peer index benchmark (P1-4)
-- A SECURITY DEFINER aggregate function so a normal (RLS-scoped) API connection can read a
-- cross-tenant benchmark WITHOUT exposing any individual field's rows — only weekly averages
-- across peer fields are returned. Owned by the migrating superuser, so it bypasses RLS.
-- Params: p_index (index name), p_crop (crop_type filter or NULL = all crops),
--         p_exclude (a field_id to exclude, so a field is compared against OTHERS, not itself).

create or replace function public.index_benchmark(
  p_index text,
  p_crop text,
  p_exclude uuid
)
returns table(week date, mean_avg double precision, n int)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('week', s.acquired_at)::date as week,
         avg(s.mean)::double precision            as mean_avg,
         count(distinct s.field_id)::int          as n
  from public.index_stats s
  left join public.field_metadata m on m.field_id = s.field_id
  where s.index_name = p_index
    and s.mean is not null
    and s.acquired_at >= current_date - 180
    and (p_crop is null or m.crop_type = p_crop)
    and (p_exclude is null or s.field_id <> p_exclude)
  group by 1
  order by 1;
$$;

comment on function public.index_benchmark(text, text, uuid) is
  'Weekly average of an index across peer fields (P1-4 benchmark). SECURITY DEFINER: returns aggregates only.';
