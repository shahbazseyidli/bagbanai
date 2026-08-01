-- 0062_google_sso.sql — sign in with Google.
--
-- ONE COLUMN. Everything else the flow needs already exists: users.password_hash is NOT NULL (0002)
-- and the magic-link work established the '!' sentinel for accounts that have no password at all
-- (routers/auth.py::NO_PASSWORD — bcrypt can never produce it, so verify_password returns False for
-- every input and the account simply cannot be entered with a password). A Google account is the
-- same shape, so it reuses that sentinel rather than making the column nullable, which would have
-- meant auditing every read of it.
--
-- WHY THE SUBJECT AND NOT JUST THE EMAIL. Matching on email alone works right up until someone
-- changes the address on their Google account, at which point they silently become a second user
-- and lose their fields. `sub` is Google's stable, never-reused identifier for the account, so it
-- stays the join key and the email is free to change underneath it.
--
-- NULLABLE, and that is the point: the overwhelming majority of rows are email/magic-link accounts
-- that will never have one. UNIQUE so a subject cannot be attached to two users — Postgres treats
-- NULLs as distinct in a unique index, so this constrains only the rows that actually carry a value.
alter table public.users add column if not exists google_sub text;

create unique index if not exists users_google_sub_key on public.users (google_sub)
  where google_sub is not null;

comment on column public.users.google_sub is
  'Google account subject (stable id) when the user has linked Google sign-in. NULL for everyone else. Never the email — that can change.';
