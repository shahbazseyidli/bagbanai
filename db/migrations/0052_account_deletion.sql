-- 0052 — the account can now be closed by the person it belongs to.
--
-- WHY THIS IS ERASURE-BY-ANONYMISATION AND NOT `delete from public.users`:
-- fifteen tables reference users with ON DELETE NO ACTION — fields.created_by,
-- organizations.owner_id, scouting_observations.created_by, sales.created_by, tasks.assigned_to and
-- the rest of the authored-record set. A hard delete therefore FAILS with a foreign-key violation
-- for any account that ever created anything, which is every real account. Cascading those instead
-- would destroy a whole farm's agronomic history because one worker closed their account.
--
-- So closing an account erases the PERSON and keeps the RECORDS: the email is released, the name,
-- country, region, quiz answers and preferences are nulled, the password hash is replaced with a
-- value no password can ever produce, every membership is dropped (so access ends immediately), and
-- deleted_at is stamped. What the user authored survives, no longer attached to an identifiable
-- human — the standard, defensible reading of a right-to-erasure request against relational data.
alter table public.users add column if not exists deleted_at timestamptz;

-- Partial index: the login path asks "is there a live account for this email", and after closure the
-- address is rewritten anyway, so only live rows are worth indexing.
create index if not exists users_deleted_at_idx on public.users (deleted_at) where deleted_at is null;

comment on column public.users.deleted_at is
  'Set when the account was closed by its owner (POST /api/auth/account/delete). The row survives '
  'because fifteen tables reference it with NO ACTION; every personal field is nulled and the email '
  'is rewritten to a non-routable placeholder, so the address becomes available again.';
