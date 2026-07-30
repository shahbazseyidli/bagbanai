-- 0055_login_tokens.sql — magic-link sign-in (passwordless).
--
-- A TABLE, not a column on users. Three reasons the column shape does not work:
--   * a farmer who asks twice (mail was slow, then arrived) must not have the first link silently
--     killed by the second — several links can legitimately be outstanding at once;
--   * each one carries its OWN expiry and its OWN single-use marker, and a column pair can only
--     ever describe the newest;
--   * an auth primitive needs an audit trail — "when was a link asked for, from what, was it ever
--     spent" is answerable here and unanswerable from an overwritten column.
--
-- WHAT IS STORED IS NOT THE TOKEN. `token_hash` is the sha256 hex of a secrets.token_urlsafe(32)
-- value (256 bits of entropy) that exists only in the outgoing email and in one local variable in
-- routers/auth.py. A dump of this table therefore yields nothing usable: sha256 is not reversible,
-- and the search space rules out a lookup table. Lifetime is 15 minutes and one use — `used_at`
-- non-null means spent, and the spend is a single conditional UPDATE ... RETURNING, so two
-- simultaneous clicks on the same link produce exactly one session.
--
-- NO RLS, deliberately — the same call public.push_subscriptions (0053) and public.email_sends /
-- public.email_unsub_tokens (0044) make, stated here so the omission reads as a decision:
--   * every touch of this table happens with NO session. The caller is unauthenticated by
--     definition — that is the point of the endpoint — so db.connection() runs
--     set_config('app.user_id','',true) and public.current_user_id() is NULL. A policy keyed on it
--     would evaluate NULL and block the legitimate signup/login path while stopping no attacker.
--   * the app connects as the table-OWNING role, which bypasses RLS anyway (0007_rls.sql says so in
--     its own header); a policy here would be theatre.
--   * access control IS the token: 256 bits, hashed at rest, single use, 15 minutes.
-- CONSIDERED AND REJECTED: `enable row level security` with zero policies (deny-all, which would at
-- least protect a future read-only analytics role). There is no precedent for that shape anywhere
-- in this schema and inventing one for a single table would be worse than the note that follows —
-- IF A REPORTING ROLE IS EVER ADDED, public.login_tokens MUST BE EXCLUDED FROM ITS GRANTS BY HAND.
--
-- Purely additive and idempotent: nothing reads this table until the new api image lands, so it is
-- safe to apply while the OLD image is still serving. It must be applied BEFORE that image, though —
-- the new endpoints select from it (deploy/update.sh does not run migrations; separate manual step).
create table if not exists public.login_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,                 -- non-null = spent; single use is enforced on this
  created_at  timestamptz not null default now()
);

-- The lookup on redeem is by hash and only by hash. UNIQUE rather than a plain index: two rows
-- sharing a hash would make "spend exactly one" ambiguous, and a collision here can only come from
-- a bug (the generator makes duplicates impossible in practice), so the constraint is a tripwire.
create unique index if not exists login_tokens_hash_idx on public.login_tokens (token_hash);

-- Serves the per-email rate limit: "how many links has this account been sent in the last 15
-- minutes / 24 hours". created_at desc so the recent window is the leading edge of the index.
create index if not exists login_tokens_user_idx on public.login_tokens (user_id, created_at desc);

comment on table public.login_tokens is
  'Magic-link sign-in tokens. Stores sha256(token) hex only, never the token. 15 min TTL, single use (used_at). No RLS by design — every access is unauthenticated, see the migration header. Pruned opportunistically by POST /api/auth/magic-link (rows older than 7 days past expiry).';
