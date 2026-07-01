-- 0002_users.sql — own auth (replaces Supabase auth.users; see CLAUDE.md deviations)
-- Every spec reference to auth.users(id) maps to public.users(id).

create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  full_name     text,
  phone         text,
  locale        text not null default 'az',   -- az|ru|tr
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index users_email_idx on public.users (lower(email));

-- Session helper: backend runs `SET LOCAL app.user_id = '<uuid>'` per request.
-- current_user_id() replaces Supabase auth.uid() everywhere in RLS (§8).
create or replace function public.current_user_id() returns uuid as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$ language sql stable;

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();
