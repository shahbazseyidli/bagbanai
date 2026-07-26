-- 0047_drop_email_alerts.sql — one opt-out flag for all non-transactional email.
--
-- Until now two independent flags governed outbound email: `email_alerts` (0030, read only by the
-- rule engine's per-alert emailer) and `email_lifecycle` (0044, read by the template system). The
-- rule engine and the AI-advice notifier bypassed the template system entirely, so a farmer who
-- turned lifecycle email off still received a message per fired alert per field per day.
--
-- Those per-event emails are gone: every non-transactional message is now folded into the single
-- weekly digest, which goes through send_template and therefore honours `email_lifecycle`. That
-- leaves `email_alerts` with no reader and no meaning, so it is dropped rather than left as a
-- second, silently-ignored switch in the settings UI.
--
-- Transactional email (OTP / verification, welcome, the first "your field is ready" report) is
-- unaffected and still sends regardless of any flag.
alter table public.users drop column if exists email_alerts;

comment on column public.users.email_lifecycle is
  'Single opt-out for ALL non-transactional email (the weekly digest and its onboarding/re-engagement content). Transactional email (OTP, welcome, first data-ready report) always sends.';
