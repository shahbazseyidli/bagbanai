-- 0028_season_features.sql — T16: per-field, per-season feature store (groundwork for the future
-- NDVI-integral ↔ yield correlation). One row per (field, season_year) with the season's vegetation
-- + weather aggregates. The correlation MODEL is deferred until ≥3 seasons of paired yield data
-- exist; this table just accumulates the features each season so the model has history to learn from.
-- Server-side gating (mirrors other field-scoped tables); org_id denormalized.
create table if not exists public.field_season_features (
  id               uuid primary key default gen_random_uuid(),
  field_id         uuid not null references public.fields(id) on delete cascade,
  org_id           uuid not null,
  season_year      int  not null,
  crop_type        text,
  ndvi_peak        numeric,   -- max NDVI mean over the season
  ndvi_mean        numeric,   -- average NDVI mean over the season
  ndvi_integral    numeric,   -- trapezoidal ∫ NDVI·dt (NDVI-days) — canopy vigor proxy
  gdd_total        numeric,   -- season cumulative growing-degree-days (T4)
  precip_total_mm  numeric,   -- season total precipitation (from the FAO-56 balance, T8)
  n_scenes         int,       -- vegetation scenes contributing
  sensor           text,      -- S2 (preferred) | HLS
  computed_at      timestamptz not null default now(),
  unique (field_id, season_year)
);
create index if not exists field_season_features_field_idx
  on public.field_season_features (field_id, season_year desc);
