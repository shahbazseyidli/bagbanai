-- 0066_locale_explicit.sql — remember WHETHER the language was chosen, not just which one.
--
-- THE BUG THIS CLOSES, measured on production 2026-10-26.
-- The owner's account (users.locale = 'az') received its weekly digest in: en (10-21), az (10-14),
-- az (10-07), en (09-30), en (09-16), en (09-09), en (09-02), en (08-26), tr (08-19), en (08-12),
-- az (08-05). Eleven weeks, three languages, one account that never asked for any of it. The same
-- column drives the automatic advice the geo pipeline writes after each satellite scene, so the
-- same account also holds 13 analyses in English (newest 2026-10-25) under a profile set to az.
--
-- WHY. `users.locale` is the only language signal the two surfaces that run WITHOUT a request can
-- read — the Wednesday digest (ai/emails/send.py reads it directly) and the post-scene advice
-- (routers/internal.py::run_advice). To keep it current, lib/auth.tsx::reconcileLocale rewrote it
-- on page load from "an explicit signal", and counted TWO things as explicit: a locale prefix in
-- the URL, OR the mere presence of a bagban_locale cookie. The second is not a signal at all —
-- every signed-in browser has that cookie — so an unprefixed page load (which is what `az` looks
-- like, since the default locale carries no prefix) rewrote the account to az, and the next click
-- on an /en/ link rewrote it back. The account tracked the last URL opened, and the farmer's
-- Wednesday email changed language with it.
--
-- THE SHAPE OF THE FIX. Reconciliation itself is worth keeping: someone who bookmarks /ru/fields
-- and never touches the switcher would otherwise read a Russian interface and receive Azerbaijani
-- mail forever, which is the problem reconcile was written for. What was missing is the memory of
-- a DELIBERATE choice. With this column:
--   · LanguageSwitcher sets locale AND locale_explicit = true — it is the one surface where the
--     person names a language on purpose.
--   · reconcileLocale may still follow a URL prefix, but ONLY while locale_explicit is false, and
--     it never sets the flag — browsing is evidence, not a decision.
--   · SIGNUP DOES NOT SET THE FLAG, on purpose. body.locale there is whichever localized page the
--     visitor happened to land on, which is the same weak evidence as a prefix; marking it
--     deliberate would freeze a browser-language guess for the life of the account.
-- So an account that has never chosen keeps following the person around (the original fix still
-- works), and an account that HAS chosen cannot be moved by a link someone sent them.
--
-- BACKFILL IS DELIBERATELY `false` FOR EVERYONE. We cannot tell, in hindsight, which of the 33
-- current values came from the switcher and which from a stray prefix — and guessing `true` would
-- freeze whatever the last random URL happened to leave behind. `false` keeps today's behaviour
-- (minus the flapping, which the frontend half removes) until each person's next real choice.
alter table public.users
  add column if not exists locale_explicit boolean not null default false;

comment on column public.users.locale_explicit is
  'True once the person chose their language deliberately (LanguageSwitcher or signup). While false, lib/auth.tsx::reconcileLocale may still follow a URL locale prefix; once true, nothing but another deliberate choice may change users.locale.';
