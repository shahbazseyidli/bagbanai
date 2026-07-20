-- 0013: denormalize `sensor` onto index_stats/index_rasters so the un-joined read
-- paths (indices series/latest/summary, benchmark, AI trends) can filter by sensor
-- cheaply once Sentinel-2 (10m, code 'S2') lands beside HLS ('S30'/'L30').
-- scenes needs NO change: scenes.sensor + unique(field_id,sensor,acquired_at,mgrs_tile)
-- already exist, and (scene_id,index_name) keys already separate sensors (distinct scene_id).

alter table public.index_stats  add column if not exists sensor text;
alter table public.index_rasters add column if not exists sensor text;

-- Backfill existing rows (all currently HLS) from their scene.
update public.index_stats  st set sensor = s.sensor
  from public.scenes s where st.scene_id = s.id and st.sensor is null;
update public.index_rasters r  set sensor = s.sensor
  from public.scenes s where r.scene_id  = s.id and r.sensor  is null;

create index if not exists index_stats_sensor_idx
  on public.index_stats  (field_id, index_name, sensor, acquired_at);
create index if not exists index_rasters_sensor_idx
  on public.index_rasters (field_id, index_name, sensor, acquired_at);

-- Keep the peer benchmark single-resolution (HLS-only) so numbers stay byte-identical
-- to today and never mix 10m S2 with 30m HLS. (create-or-replace of the 0010 function.)
create or replace function public.index_benchmark(p_index text, p_crop text, p_exclude uuid)
returns table(week date, mean_avg double precision, n int)
language sql stable security definer set search_path = public as $$
  select date_trunc('week', s.acquired_at)::date as week,
         avg(s.mean)::double precision            as mean_avg,
         count(distinct s.field_id)::int          as n
  from public.index_stats s
  left join public.field_metadata m on m.field_id = s.field_id
  where s.index_name = p_index and s.mean is not null
    and s.acquired_at >= current_date - 180
    and s.sensor in ('S30','L30')            -- HLS-only; exclude S2 10m
    and (p_crop is null or m.crop_type = p_crop)
    and (p_exclude is null or s.field_id <> p_exclude)
  group by 1 order by 1;
$$;
