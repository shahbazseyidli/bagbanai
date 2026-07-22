-- 0025: soft-delete for fields (D2.7). A DELETE now stamps deleted_at instead of hard-deleting;
-- reads filter it out; a restore endpoint clears it within the undo window. Protects against the
-- accidental-delete data loss the app has already seen once (see CLAUDE.md data note).
alter table public.fields add column if not exists deleted_at timestamptz;
create index if not exists fields_active_idx on public.fields (farm_id) where deleted_at is null;
