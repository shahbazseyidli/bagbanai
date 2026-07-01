-- 0008_subsidy.sql — Subsidy calculator module (spec §30.3), auth.uid() -> current_user_id()

-- İl + baza dərəcəsi (illik yenilənə bilər)
create table public.subsidy_years (
  year int primary key,
  base_unit_rate numeric not null default 200,   -- AZN
  source_url text, published_at date, notes_az text
);

-- Ərazi/rayon istinadı (wizard dropdown + uyğunluq)
create table public.subsidy_regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- liberated | nakhchivan | other | <rayon-slug>
  name_az text not null,
  economic_region text,               -- Quba-Xaçmaz, Şəki-Zaqatala, ...
  is_liberated boolean default false,
  is_nakhchivan boolean default false
);

-- Əsas dərəcə cədvəli (linkdəki bütün sətirlər buraya yüklənir)
create table public.subsidy_rates (
  id uuid primary key default gen_random_uuid(),
  year int not null references public.subsidy_years(year),
  subsidy_type text not null,         -- planting | product | fallow | seed
  crop_group text not null,
  crop text not null,
  intensity text,                     -- intensive|super_intensive|other|main|repeat|NULL
  region_category text,               -- liberated|nakhchivan|other|all|specific
  irrigation text,                    -- modern|non_modern|drip|rainfed|NULL
  planting_period text,               -- new_2025_2026|from_2021|before_2021|NULL
  coefficient numeric not null,
  amount_per_unit numeric not null,   -- = coefficient × base_unit_rate
  unit text not null,                 -- ha|ton
  min_area_ha numeric,
  min_density_per_ha int,
  eligible_regions text[],            -- konkret uyğun rayonlar; boşdursa = məhdudiyyət yoxdur
  conditions jsonb,
  label_az text not null,
  notes_az text
);
create index subsidy_rates_lookup on public.subsidy_rates
  (year, subsidy_type, crop_group, crop, intensity, region_category, irrigation, planting_period);

-- Modifikatorlar/qaydalar
create table public.subsidy_modifiers (
  id uuid primary key default gen_random_uuid(),
  year int not null references public.subsidy_years(year),
  code text not null,
  description_az text,
  applies_to jsonb,
  effect jsonb
);

-- İstifadəçi hesablamaları (saxlama/tarixçə)
create table public.subsidy_calculations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid, user_id uuid references public.users(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  year int not null,
  inputs jsonb not null,
  matched_rate_id uuid references public.subsidy_rates(id),
  amount_per_unit numeric, quantity numeric, unit text,
  modifiers_applied jsonb, total_amount numeric,
  warnings jsonb,
  created_at timestamptz not null default now()
);
create index subsidy_calc_user_idx on public.subsidy_calculations (user_id, created_at desc);

-- ===== RLS: reference data public-read; calculations owner/member =====
alter table public.subsidy_years   enable row level security;
alter table public.subsidy_regions enable row level security;
alter table public.subsidy_rates   enable row level security;
alter table public.subsidy_modifiers enable row level security;
alter table public.subsidy_calculations enable row level security;

create policy subsidy_years_public_read     on public.subsidy_years     for select using (true);
create policy subsidy_regions_public_read   on public.subsidy_regions   for select using (true);
create policy subsidy_rates_public_read     on public.subsidy_rates     for select using (true);
create policy subsidy_modifiers_public_read on public.subsidy_modifiers for select using (true);

create policy subsidy_calc_owner on public.subsidy_calculations for all
  using (user_id = public.current_user_id()
         or (org_id is not null and public.is_org_member(public.current_user_id(), org_id)))
  with check (user_id = public.current_user_id());
