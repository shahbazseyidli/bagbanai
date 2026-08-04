-- 0063_alert_resolution.sql — a rule that stops matching can finally say so.
--
-- THE GAP THIS FILLS. public.alert_state (0016) has an `active` column that every fire sets to true
-- and NOTHING ever sets back to false, and no reader has ever selected it — the dispatcher only
-- reads last_fired_at, last_severity and muted_until. So the platform could answer "did this rule
-- fire" and could not answer "is this condition still true". The dashboard tile that wanted the
-- second question had to be renamed "New alerts" and pointed at UNREAD NOTIFICATIONS instead, which
-- a farmer clears by glancing at the bell once while heat and low-moisture keep firing underneath.
--
-- THREE OUTCOMES, NOT TWO. An evaluation is fired, still-firing, or no-longer-matching, and the
-- columns below record all three:
--   * last_match_at — the last run in which the condition was observed TRUE. Advances even when the
--     notification is held back (quiet hours, cooldown, mute), because being held back says nothing
--     about the weather. It is deliberately NOT last_fired_at, which drives the cooldown and must
--     only move when something was actually delivered.
--   * last_clear_at + clear_streak — the last run in which the rule was EVALUATED and found not to
--     match, and how many such runs in a row. A threshold oscillating around its boundary must not
--     toggle a badge, so resolution needs a streak, not a single clean look (see rules/engine.py,
--     CLEAR_STREAK_TO_RESOLVE).
--   * resolved_at — when the streak reached the bar. NULL while open; reset to NULL on a re-fire.
--   * source — which producer family the rule belongs to ('weather'|'vegetation'|'pest'|…), so the
--     read model can map a row to a notify_prefs category. alert_state only ever stored rule_type,
--     and notify_prefs.category_for needs the source to file 'frost' under Weather.
--
-- ABSENCE OF EVIDENCE IS NOT RESOLUTION. Nothing here lets "we saw nothing" mean "it went away": a
-- clear is written ONLY for a rule the engine could actually evaluate on that run (fresh forecast
-- block, a recent scene with the index the rule reads), and a rule that could not be evaluated is
-- left untouched — neither open-confirmed nor resolved. The read model therefore has three answers
-- too: open (matched recently), resolved (observed clear enough times), and unconfirmed (fired once
-- and nothing has confirmed it either way). Telling a farmer a problem went away because we stopped
-- looking is the one failure this table must never produce.
--
-- BACKFILL: NONE, ON PURPOSE. Every existing row has active=true and no resolution history, so all
-- five columns start NULL/0 and every legacy row lands in `unconfirmed` — not in the open count.
-- That is the honest reading: those rules fired at some point and have never since been observed
-- clear. The first run after deploy re-confirms the ones that still match (they produce a candidate,
-- which stamps last_match_at) and starts a clear streak on the ones that do not. Sweeping them to
-- active=false here would be exactly the resolution-by-absence the design forbids.
--
-- SAFE TO APPLY BEFORE THE IMAGE SWAP. Purely additive: the running image inserts an explicit column
-- list into alert_state and selects an explicit column list from it, so it neither writes nor reads
-- anything below. Defaults are constant, so no table rewrite blocks the write path.
alter table public.alert_state
  add column if not exists source        text,
  add column if not exists last_match_at timestamptz,
  add column if not exists last_clear_at timestamptz,
  add column if not exists clear_streak  integer not null default 0,
  add column if not exists resolved_at   timestamptz;

comment on column public.alert_state.last_match_at is
  'Last evaluation in which the condition was TRUE, delivered or not. Openness is measured from this, never from last_fired_at (which the cooldown owns).';
comment on column public.alert_state.clear_streak is
  'Consecutive evaluations that found the rule not matching. Resolution needs more than one so a threshold sitting on its boundary cannot flap a badge.';
comment on column public.alert_state.resolved_at is
  'When the clear streak reached the bar. NULL = still open or never confirmed clear; a re-fire sets it back to NULL.';
comment on column public.alert_state.source is
  'Producer family (weather|vegetation|pest|…). Present so a row can be mapped to a notify_prefs category — rule_type alone cannot do it.';

-- The read paths all ask the same question: "the unresolved rows of this field, by rule_type".
-- Partial on resolved_at so the index stays the size of the open set rather than of all history.
create index if not exists alert_state_unresolved_idx
  on public.alert_state (field_id, rule_type) where resolved_at is null;

-- `active` is NOT dropped and is NOT left to rot: rules/engine.py now writes it as a mirror of
-- (resolved_at is null), so the column stops lying for anything still reading it. resolved_at is
-- the truth — it carries a timestamp, survives the distinction between "resolved" and "never
-- confirmed", and is what every reader here joins on.
comment on column public.alert_state.active is
  'Legacy mirror of (resolved_at is null), kept in sync by the dispatcher. Read resolved_at instead — this boolean cannot express "unconfirmed".';
