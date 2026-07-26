-- 0053_push_subscriptions.sql — Web Push (VAPID) as a fourth delivery channel.
--
-- One row per SUBSCRIBED DEVICE, not per user: a farmer with a phone in the orchard and a laptop in
-- the office grants permission twice and gets two rows. There is no "push on/off" flag here, because
-- the row's existence IS the on state — unsubscribing deletes it.
--
-- WHY `endpoint` IS THE NATURAL KEY, AND UNIQUE GLOBALLY RATHER THAN PER USER:
-- the browser hands back the same endpoint for the same (service-worker registration,
-- applicationServerKey), so a re-subscribe on a device that is already registered must UPDATE the
-- existing row, never add a second one — otherwise every reinstall doubles the pushes that device
-- receives. Making it unique across ALL users (not (user_id, endpoint)) is the deliberate part: on a
-- shared phone, whoever subscribes last takes the row over, and the previous account stops being
-- pushed there. That is the correct outcome — a device must not keep delivering alerts for an
-- account nobody on it is signed into any more.
--
-- WHY `failed_at` IS NOT A RETRY COUNTER: it records a TRANSIENT failure (timeout, 5xx from the push
-- service) so an operator can see a subscription decaying. A 404/410 means the push service has
-- declared the subscription dead, and the row is DELETED on the spot by routers/push.py — keeping a
-- tombstone would only make the "devices switched on" count lie to the person reading it.
--
-- NO RLS, deliberately — the same call this table's neighbours make. public.messaging_channels
-- (0024) and public.email_sends (0044) have none either: every read and write goes through
-- routers/push.py under get_current_user_id with an explicit `user_id = $n` predicate, and the
-- delivery path (rules/engine → routers.push.deliver_org) runs server-side with no user session at
-- all, so a row-level policy keyed on current_user_id() would block the sender, not an attacker.
-- Access control for this table lives in the router, and this note is here so the omission reads as
-- a decision rather than an oversight.
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  -- FCM endpoints run 350–500 chars; text + a btree unique index is comfortable (index tuples are
  -- capped around 2700 bytes) and the router rejects anything over 2000 before it ever gets here.
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  failed_at     timestamptz
);

-- Every read is "this user's devices" (the settings card) or "these members' devices" (delivery).
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Refresh the 0051 comment: the matrix is now five categories × FOUR channels.
comment on column public.users.notify_prefs is
  'Per-category notification opt-outs: {"vegetation|weather|pest|advice|system": {"inapp|push|digest|telegram": bool}}. NULL/{} = everything on. "push" reaches the devices in public.push_subscriptions; "digest" only decides whether the category appears in the weekly Wednesday email — it never triggers a per-alert email.';
