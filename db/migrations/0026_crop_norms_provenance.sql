-- 0026_crop_norms_provenance.sql — T17: track where crop_thresholds.index_norms came from so the
-- research pipeline can write back LLM-calibrated vegetation-index bands WITHOUT clobbering curated
-- seed values. norms_source: 'seed'|'research'|NULL. Curated seed rows (index_norms present,
-- norms_source NULL or 'seed') are protected; only NULL-or-'research' rows are (re)written by the
-- research write-back. Forward-only, additive (CLAUDE.md convention).
alter table public.crop_thresholds
  add column if not exists norms_source     text,
  add column if not exists norms_updated_at timestamptz;

comment on column public.crop_thresholds.norms_source is
  'Provenance of index_norms: seed (curated, protected) | research (LLM-derived, refreshable). '
  'Research write-back only overwrites rows whose index_norms IS NULL or norms_source = research.';
