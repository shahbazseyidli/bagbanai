-- 0057 — notifications carry a CODE, not a finished Azerbaijani sentence.
--
-- WHY. public.notifications stores `title` and `body` as prose, written by rules/engine.py in
-- Azerbaijani. That row is then reused verbatim by the in-app bell, Telegram, web push and the
-- weekly digest — so a Turkish farmer's frost, heat, wind, water-stress and NDVI alerts all
-- arrive in Azerbaijani, while the timestamp beside them ("4 saat önce") is correctly Turkish.
-- Observed live in the owner's own Turkish session on 2026-07-31. It is the most urgent
-- information the product sends, in a language the reader did not choose.
--
-- The project's standing contract for this is CODE + PARAMS: the backend emits a stable code and
-- raw parameters, the reader's own surface resolves them (see CLAUDE.md, ai/wellness.py and
-- lib/wellnessText.ts). Notifications were the one producer that had no column to put a code in,
-- which is why the contract was never applied here.
--
-- ADDITIVE AND NULLABLE, so this is safe to apply BEFORE the image that writes it, and old rows
-- keep working untouched: readers fall back to `title`/`body` whenever the code is null. The prose
-- columns are deliberately NOT dropped — outbound channels (Telegram, push, digest) render
-- server-side and still need a string today.
alter table public.notifications
  add column if not exists title_code   text,
  add column if not exists title_params jsonb,
  add column if not exists body_code    text,
  add column if not exists body_params  jsonb;

comment on column public.notifications.title_code is
  'Stable message id (e.g. alert.frost.title). NULL for rows written before 0057 — readers fall back to title.';
comment on column public.notifications.body_code is
  'Stable message id for the body. NULL on pre-0057 rows and on producers that have no code yet.';
