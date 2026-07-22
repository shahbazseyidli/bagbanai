-- 0016: rule-engine dispatch state (T1). One row per (field, rule_type, dedup_key) tracks the last
-- time an alert fired + its severity, so the dispatcher can dedup / apply a cooldown / honour
-- hysteresis instead of re-notifying every cron run. Notifications themselves stay in
-- public.notifications; this is only the anti-spam bookkeeping (spec Rule 8/11).
create table if not exists public.alert_state (
  field_id uuid not null references public.fields(id) on delete cascade,
  rule_type text not null,
  dedup_key text not null default '',
  last_severity text,
  last_fired_at timestamptz not null default now(),
  active boolean not null default true,
  muted_until timestamptz,
  primary key (field_id, rule_type, dedup_key)
);
