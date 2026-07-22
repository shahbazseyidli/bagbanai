-- 0023: fertilizer plan engine (T11 / C7). Removal-based N-P-K requirement = crop nutrient norm ×
-- target yield, split across growth stages. Rule 7: amounts are elemental kg (N-P-K), NOT a
-- commercial product/dose — the plan points to a soil test + agronomist for product conversion.
-- Seeded norms are provisional agronomic values; the AZ product catalog is a later addition.
create table if not exists public.crop_nutrient_norms (
  crop_type text primary key,
  n_per_ton numeric not null,
  p_per_ton numeric not null,
  k_per_ton numeric not null,
  note text
);

create table if not exists public.fertilizer_plans (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  season_year int not null,
  target_yield numeric,
  area_ha numeric,
  n_total_kg numeric,
  p_total_kg numeric,
  k_total_kg numeric,
  created_at timestamptz not null default now(),
  unique (field_id, season_year)
);

create table if not exists public.fertilizer_plan_splits (
  plan_id uuid not null references public.fertilizer_plans(id) on delete cascade,
  seq int not null,
  stage text not null,
  share_pct numeric not null,
  n_kg numeric,
  p_kg numeric,
  k_kg numeric,
  primary key (plan_id, seq)
);

insert into public.crop_nutrient_norms (crop_type, n_per_ton, p_per_ton, k_per_ton, note) values
  ('wheat',25,5,15,'Dən, kq/ton'), ('barley',22,4,14,'Dən'), ('corn',22,4,18,'Dən'),
  ('hazelnut',30,6,25,'Ləpə (çoxillik)'), ('grape',6,2,8,'Meyvə'), ('apple',2.5,0.5,4,'Meyvə'),
  ('pomegranate',4,1,6,'Meyvə'), ('potato',5,1,8,'Yumru'), ('cotton',30,6,25,'Xam'),
  ('generic',20,5,15,'Ümumi')
on conflict (crop_type) do nothing;
