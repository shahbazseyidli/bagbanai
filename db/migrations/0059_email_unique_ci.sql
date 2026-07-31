-- 0059 — one account per address, enforced by the database rather than by hope.
--
-- WHAT WAS THERE. 0002 declared `email text not null unique` — a CASE-SENSITIVE unique — and
-- created `users_email_idx on (lower(email))` as a PLAIN index. So Postgres was perfectly willing
-- to store `Ali@example.com` and `ali@example.com` as two different farmers, and the only thing
-- stopping it was application-level check-then-insert, which is not atomic under READ COMMITTED.
--
-- The concrete race: POST /api/auth/signup checked, then inserted `body.email` VERBATIM, while
-- POST /api/auth/magic-link checked, then inserted the LOWERCASED string. Two concurrent requests
-- see neither other's uncommitted row, write two different strings, and `on conflict (email)`
-- never fires because the strings genuinely differ. Two accounts, one mailbox, and the farmer's
-- fields are in whichever one they are not currently looking at.
--
-- Narrow window, real consequence, and the fix is one index — the kind of guard rail that should
-- never have been left to the application.
--
-- SAFE TO APPLY: verified 13 users, zero case-insensitive duplicates, before writing this.
-- CONCURRENTLY is deliberately NOT used: it cannot run inside the transaction db/migrate.sh wraps
-- each file in, and at this table size the exclusive lock is measured in milliseconds.
create unique index if not exists users_email_lower_uidx on public.users (lower(email));

-- The old plain index is now redundant — the unique index above serves every lookup it served.
drop index if exists users_email_idx;

comment on index public.users_email_lower_uidx is
  'One account per address, case-insensitively. See 0059: the app used to be the only thing '
  'preventing Ali@x.com and ali@x.com from being two farmers.';
