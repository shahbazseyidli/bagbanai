-- 0048_area_unit.sql — local area unit (P1.2).
--
-- Every area in this database is stored in hectares and stays that way: the geo pipeline, the
-- fertilizer/water models and the AI context all assume `fields.area_ha`. This column only decides
-- how that number is RENDERED for one user.
--
-- It matters because the storage unit is not the unit farmers think in. Turkey counts land in
-- dönüm (= dekar = 1000 m² = 0.1 ha) and the tapu land registry is written that way, so "1.36 ha"
-- forces a Turkish farmer to convert in their head. Azerbaijan keeps official records in hectares
-- (EKTİS) but everyday speech uses sotka (= ar = 100 m² = 0.01 ha) for small plots.
--
-- NULL = "use the default for my country" (derived from users.country: TR → donum, everything else
-- → ha) rather than a hard-coded 'ha', so a farmer who never opens settings still gets the right
-- unit, and one who later corrects their country follows it automatically. sotka is opt-in only —
-- it reads well below ~1 ha and badly above it, so it is never chosen as a default.
alter table public.users add column if not exists area_unit text;

alter table public.users drop constraint if exists users_area_unit_chk;
alter table public.users add constraint users_area_unit_chk
  check (area_unit is null or area_unit in ('ha', 'donum', 'sotka'));

comment on column public.users.area_unit is
  'Display unit for field areas: ha (10 000 m²) | donum (1 000 m², Turkish dekar) | sotka (100 m², ar). NULL = derive from users.country (TR → donum, else ha). Storage is always hectares.';
