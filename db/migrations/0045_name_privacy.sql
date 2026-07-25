-- 0045_name_privacy.sql — farmer name visibility (New-B).
--
-- Farmers can choose whether their real name is shown to OTHER users. When they opt out
-- (name_public=false) cross-user surfaces (chat participant name, peer suggestions, community) show a
-- stable alias "user_<6hex>" instead. The farmer always sees their own real name. Default true.
-- Non-farmers (lab / consultant / supplier) are businesses meant to be discoverable, so they ignore
-- this flag (always shown by real name).
alter table public.users
  add column if not exists name_public boolean not null default true;

comment on column public.users.name_public is
  'Farmer only: show real name to other users? false → other users see a stable user_<hash> alias.';
