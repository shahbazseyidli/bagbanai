-- 0051_notify_prefs.sql — which CATEGORY of alert reaches which CHANNEL, per user.
--
-- Opt-out, not opt-in: NULL, {}, a missing category and a missing channel all mean ON. An account
-- that never opens the settings screen therefore behaves exactly as it does today, and the column
-- only ever records what a farmer switched OFF — so the recommended state has no storage cost and
-- "reset to recommended" is literally writing {}.
--
-- Shape: {"<category>": {"inapp": bool, "digest": bool, "telegram": bool}}. Categories and channels
-- are validated in services/app/notify_prefs.py, not here: the set will grow with new alert
-- producers, and a CHECK constraint on the contents would turn adding a rule into a migration.
alter table public.users add column if not exists notify_prefs jsonb;

alter table public.users drop constraint if exists users_notify_prefs_chk;
alter table public.users add constraint users_notify_prefs_chk
  check (notify_prefs is null or jsonb_typeof(notify_prefs) = 'object');

comment on column public.users.notify_prefs is
  'Per-category notification opt-outs: {"vegetation|weather|pest|advice|system": {"inapp|digest|telegram": bool}}. NULL/{} = everything on. "digest" only decides whether the category appears in the weekly Wednesday email — it never triggers a per-alert email.';
