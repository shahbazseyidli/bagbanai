-- 0022: pest/disease risk models (T9). A risk fires when the field's GDD (T4) is inside a pest's
-- development window AND (for wetness-driven diseases) recent leaf-wetness is present. Alerts route
-- through the rule engine (T1) — Rule 7 safe (problem type + registered-list pointer + agronomist,
-- never a pesticide dose). Farmers can mute a pest they've confirmed absent (Rule 12). Seeded models
-- are provisional; EPPO enrichment (U6) refines them later.
create table if not exists public.pest_risk_models (
  id uuid primary key default gen_random_uuid(),
  crop_type text not null,
  pest_name text not null,
  pest_type text not null default 'pest',      -- pest | disease
  gdd_lo numeric not null,
  gdd_hi numeric not null,
  temp_lo numeric default 10,
  temp_hi numeric default 35,
  needs_wetness boolean not null default false,
  note text,
  unique (crop_type, pest_name)
);

create table if not exists public.field_pest_mutes (
  field_id uuid not null references public.fields(id) on delete cascade,
  pest_name text not null,
  muted_until timestamptz not null,
  primary key (field_id, pest_name)
);

insert into public.pest_risk_models
  (crop_type, pest_name, pest_type, gdd_lo, gdd_hi, temp_lo, temp_hi, needs_wetness, note) values
  ('hazelnut','Fındıq meyvəyeyəni (Curculio nucum)','pest',300,700,12,32,false,'Yetkin böcək çıxışı və yumurtaqoyma pəncərəsi.'),
  ('hazelnut','Fındıq bakterial yanığı','disease',200,900,10,28,true,'Nəm şəraitdə bakterial yanıq riski.'),
  ('apple','Alma meyvəyeyəni (Cydia pomonella)','pest',250,650,12,32,false,'Birinci nəsil uçuş/yumurtaqoyma pəncərəsi.'),
  ('grape','Mildiu (Plasmopara viticola)','disease',150,800,11,30,true,'Nəm + istilik → mildiu riski.'),
  ('wheat','Sarı pas (Puccinia striiformis)','disease',200,700,8,22,true,'Sərin-nəm şəraitdə pas riski.')
on conflict (crop_type, pest_name) do nothing;
