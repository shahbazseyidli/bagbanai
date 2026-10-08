-- 0064_auth_events.sql — who got in, how, from where, and who tried and failed.
--
-- WHAT DID NOT EXIST. The platform could answer "when was this person last seen" (users.last_seen_at,
-- throttled to once an hour) and "what did they do in the product" (user_events — but that table holds
-- exactly four CLIENT-reported funnel names: advice_viewed, field_created, crop_set,
-- checklist_complete). Nothing recorded a SIGN-IN. So the questions an admin actually asks when a
-- farmer writes "someone is in my account" or "I cannot get in" — which method did they use, from
-- what address, did anyone fail against this email — had no answer anywhere in the system.
--
-- NULLABLE user_id ON PURPOSE. The most useful row in a login audit is the FAILURE, and a failed
-- attempt against an address that has no account has no user to point at. `email` carries what was
-- typed so those rows are still readable; it is NOT a foreign key for the same reason.
--
-- ON DELETE CASCADE, unlike the fifteen authored-record tables that force 0052's anonymise-don't-
-- delete dance. An auth log is not a record the person authored and nobody else's history depends on
-- it, so when an account is closed these rows should simply go.
--
-- ⚠️ PERSONAL DATA. ip and user_agent are new collection — the privacy policy in all nine languages
-- has to name them before this is presented as a feature. Same obligation the Google sign-in work
-- carried (see the processors table in app/src/app/privacy/legal/privacy.*.ts).
--
-- ⚠️ NO RETENTION POLICY YET. This table only grows. At today's volume (31 users) that is years away
-- from mattering, but a prune job belongs here before it is not.
create table if not exists public.auth_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  email      text,
  -- login | login_failed | logout
  event      text not null,
  -- password | magic_link | otp | google | signup | account_closed
  method     text,
  ip         text,
  user_agent text,
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists auth_events_user_idx  on public.auth_events (user_id, created_at desc);
create index if not exists auth_events_email_idx on public.auth_events (lower(email), created_at desc);
create index if not exists auth_events_at_idx    on public.auth_events (created_at desc);

comment on table public.auth_events is
  'Sign-in audit: every session issued or ended, and every failed attempt. user_id is NULL for failures against an address with no account.';

alter table public.auth_events enable row level security;

-- No policy at all, deliberately: nothing but the API (which connects as the table owner) may read
-- this. It is an admin-only surface guarded by require_platform_admin in the router, and a
-- least-privileged role arriving later should find the table closed rather than readable.
