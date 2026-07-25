-- 0044_email_lifecycle.sql — Agradex lifecycle / behavioral email system.
--
-- Four additive pieces, all idempotent (safe to re-run):
--   (1) users.last_seen_at    — activity signal for re-engagement emails. Updated (throttled) from
--                               GET /api/auth/me, so "inactive N days" = now() - last_seen_at.
--   (2) users.email_lifecycle — per-user opt-out for LIFECYCLE/marketing/digest email only.
--                               Transactional email (OTP, welcome, data-ready, security, alerts)
--                               always sends regardless of this flag. `email_alerts` (0030) stays
--                               the separate toggle for rule-engine alert emails.
--   (3) email_sends           — idempotency ledger + audit trail. A behavioral email fires at most
--                               once per (user, template_id, dedup_key). dedup_key is '' for
--                               one-shot templates and e.g. the ISO week for the repeatable digest.
--   (4) email_unsub_tokens    — opaque token → user, for no-login one-click unsubscribe from the
--                               footer of every lifecycle email.

alter table public.users
  add column if not exists last_seen_at    timestamptz,
  add column if not exists email_lifecycle boolean not null default true;

create index if not exists users_last_seen_idx on public.users (last_seen_at);

comment on column public.users.last_seen_at is
  'Last time the user was seen active (throttled write from /me). Drives inactivity emails.';
comment on column public.users.email_lifecycle is
  'Opt-in for lifecycle/onboarding/digest email. Transactional email ignores this.';

create table if not exists public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  template_id text not null,               -- 'welcome_farmer', 'no_field_d3', 'inactive_10d', ...
  dedup_key   text not null default '',    -- '' one-shot; ISO week / period for repeatable digests
  locale      text,
  status      text not null default 'sent',-- sent | failed | skipped
  meta        jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, template_id, dedup_key)
);
create index if not exists email_sends_user_idx on public.email_sends (user_id, created_at desc);
create index if not exists email_sends_tmpl_idx on public.email_sends (template_id, created_at desc);

create table if not exists public.email_unsub_tokens (
  token      text primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists email_unsub_tokens_user_idx on public.email_unsub_tokens (user_id);
