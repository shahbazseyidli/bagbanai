-- 0012_field_info.sql — field-onboarding: crop cycle + auto region/economic_region

alter table public.field_metadata add column if not exists crop_cycle text;       -- 'perennial'|'annual'|'biennial'
alter table public.field_metadata add column if not exists region text;           -- rayon (auto from map, editable)
alter table public.field_metadata add column if not exists economic_region text;  -- e.g. 'Şəki-Zaqatala'
