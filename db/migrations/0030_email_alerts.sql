-- 0030_email_alerts.sql — #4: per-user email-notification preference. Default on; the rule engine
-- emails critical/warning alerts to opted-in org members (dormant until Resend is configured).
alter table public.users add column if not exists email_alerts boolean not null default true;
