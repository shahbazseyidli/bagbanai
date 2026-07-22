-- 0027_soil_lab.sql — T24: lab soil-analysis OCR. A farmer/agronomist uploads a photo/scan of a
-- soil laboratory report; Claude vision extracts the structured values (reuses the T5 vision path).
-- Stored here and promoted to the field_knowledge 'soil_profile' block with source='lab', which the
-- knowledge passport / advice prefer over SoilGrids (precedence: lab > manual > soilgrids).
-- Gating is server-side (require_member), mirroring photo_diagnoses (0019); org_id denormalized.
create table if not exists public.soil_profiles (
  id                 uuid primary key default gen_random_uuid(),
  field_id           uuid not null references public.fields(id) on delete cascade,
  org_id             uuid not null,
  source             text not null default 'lab',   -- lab | manual
  ph                 numeric,
  organic_matter_pct numeric,
  nitrogen           text,    -- free text: "12 mg/kg" or "aşağı" (labs report varied units)
  phosphorus         text,
  potassium          text,
  texture            text,
  ec                 numeric,
  caco3_pct          numeric,
  parsed             jsonb,
  notes              text,
  confidence         text,
  photo_path         text,
  model_name         text,
  created_at         timestamptz not null default now()
);
create index if not exists soil_profiles_field_idx
  on public.soil_profiles (field_id, created_at desc);
