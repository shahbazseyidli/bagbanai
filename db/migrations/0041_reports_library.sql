-- 0041_reports_library.sql — HYBRID_PLAN W7 (B9: prepared report library).
-- Reports are GENERATED ON THE FLY (the API image has no PDF/DOCX library and there is no
-- authenticated static-file serving), so storage_path stays NULL. These columns only let a
-- generated report be remembered in a library list and re-rendered from its frozen payload.
-- public.reports already exists from 0005_farm_mgmt.sql — additive only, no drops, no type changes.

alter table public.reports
  add column if not exists title       text,     -- "2026 mövsüm hesabatı — Xudat fındıq sahəsi"
  add column if not exists season_year int,      -- null for date-range reports
  add column if not exists period_from date,
  add column if not exists period_to   date,
  add column if not exists payload     jsonb;    -- frozen report data; HTML/CSV re-rendered from this

create index if not exists reports_org_idx   on public.reports (org_id, generated_at desc);
create index if not exists reports_field_idx on public.reports (field_id, generated_at desc);
