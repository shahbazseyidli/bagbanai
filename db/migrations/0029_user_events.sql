-- 0029_user_events.sql — D3.6: lightweight named funnel/activation events, fire-and-forget from the
-- client. One row per event (field_created → crop_set → first_scene_seen → advice_viewed →
-- telegram_connected → checklist_complete) so activation can be measured. meta is optional JSON.
-- Server-side gating only; org_id denormalized (mirrors photo_diagnoses 0019).
create table if not exists public.user_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete set null,
  org_id     uuid,
  name       text not null,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_events_name_idx on public.user_events (name, created_at desc);
create index if not exists user_events_user_idx on public.user_events (user_id, created_at desc);
