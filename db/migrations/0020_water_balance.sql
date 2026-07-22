-- 0020: FAO-56 daily soil-water balance (T8). Running depletion per day from the forecast so we can
-- recommend an irrigation amount (mm) + date when the root zone reaches RAW. Powers the "Hesablamanı
-- gör" transparency panel. Plain table (reads gated by require_member).
create table if not exists public.field_water_balance (
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  date date not null,
  et0_mm numeric,
  kc numeric,
  etc_mm numeric,
  precip_mm numeric,
  depletion_mm numeric,
  raw_mm numeric,
  taw_mm numeric,
  reco_mm numeric,
  updated_at timestamptz not null default now(),
  primary key (field_id, date)
);
