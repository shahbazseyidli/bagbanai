-- 0058 — a lapsed subscription never takes back what the farmer already received.
--
-- 0007 gated THREE read policies on public.org_is_paid():
--
--     advice_read        on public.advice
--     ai_chat_read       on public.ai_chat_messages
--     notifications_read on public.notifications
--
-- Read literally, that says: when your trial ends, you lose the AI advice you were already given,
-- the chat turns you yourself wrote, and the alerts about your own fields. That is precisely the
-- move the research corpus records as the competitor's most damaging: value handed over free and
-- then taken back (their VRA tool in 2022, their satellite history in 2026) cost them trust both
-- times, and the second one is the last entry before the community went quiet.
--
-- IT HAS NEVER FIRED. services/app/db.py connects as the table-owning role, which bypasses RLS, and
-- no table here has FORCE ROW LEVEL SECURITY. So this is not a bug report — it is a landmine. The
-- day someone hardens the database the normal way (a non-owner app role, or `force row level
-- security`, or points a BI client at it), every lapsed free account silently loses its own
-- history, and the cause will be four-year-old SQL nobody was looking at.
--
-- Gating stays exactly where it is enforceable and visible: services/app/tiers.py, checked
-- server-side per request, where a refusal can explain itself. What is gated is the CREATION of new
-- advice and new chat turns (quotas), not the reading of what has already been created.
drop policy if exists advice_read on public.advice;
create policy advice_read on public.advice for select
  using (public.is_org_member(public.current_user_id(), org_id));

drop policy if exists ai_chat_read on public.ai_chat_messages;
create policy ai_chat_read on public.ai_chat_messages for select
  using (public.is_org_member(public.current_user_id(), org_id));

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select
  using (public.is_org_member(public.current_user_id(), org_id));

-- org_is_paid() itself is deliberately KEPT. It is still the honest answer to "is this org paid",
-- and 0007's WRITE policies and any future gate may legitimately ask. What changes is that no READ
-- of already-delivered content asks it.
comment on function public.org_is_paid(uuid) is
  'True when the org has an active paid subscription. Must NOT gate reads of already-delivered '
  'content — see 0058. Quotas on CREATING advice/chat live in services/app/tiers.py.';
