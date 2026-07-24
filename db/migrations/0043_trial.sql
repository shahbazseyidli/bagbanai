-- 0043_trial.sql — C2: one-month Pro trial for NEWLY created organisations.
-- The marketing copy promises "1 ay pulsuz sınaq" in ~17 places; from now on a freshly created
-- org is inserted as tier='pro', valid_until = now()+1 month, trial_ends_at = the same instant and
-- source='trial' (see services/app/routers/orgs.py). When trial_ends_at passes the org falls back
-- to 'free' automatically — the row is kept (never deleted, never rewritten) so the UI can still
-- say "sınaq bitdi".
--
-- BACKFILL: NOTHING. Deliberately no UPDATE on existing rows. Every organisation that exists in
-- production today keeps EXACTLY the tier, valid_until, seats and hectare_cap it has right now;
-- they get source='manual' (the column default) and trial_ends_at = NULL, which means
-- tiers.org_tier() treats them exactly as it did before this migration. Retro-granting a trial to
-- live orgs is out of scope and would silently change what people are paying for.
alter table public.org_subscriptions
  add column if not exists trial_ends_at timestamptz;   -- null = this org never had a trial row

alter table public.org_subscriptions
  add column if not exists source text not null default 'manual';   -- manual|trial|billing

-- Guard the small vocabulary without an enum (additive, tolerant of the existing rows which all
-- default to 'manual'). Added separately + idempotently so a re-run cannot fail the migration.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'org_subscriptions_source_chk'
  ) then
    alter table public.org_subscriptions
      add constraint org_subscriptions_source_chk
      check (source in ('manual', 'trial', 'billing'));
  end if;
end $$;

-- Cheap lookup for "which trials expire soon" (future reminder job / admin view).
create index if not exists idx_org_subscriptions_trial_ends
  on public.org_subscriptions (trial_ends_at)
  where trial_ends_at is not null;

comment on column public.org_subscriptions.trial_ends_at is
  'End of the free 1-month Pro trial. Kept after expiry so the UI can show "sınaq bitdi".';
comment on column public.org_subscriptions.source is
  'How this subscription row came to be: manual (admin) | trial (auto on org creation) | billing (PSP).';
