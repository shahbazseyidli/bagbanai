-- 0046 — E13 landing onboarding quiz.
-- The four answers a visitor gives on the home page before signing up (crop, country/region,
-- current difficulty, needs) are kept on the user so they can prefill new fields and be applied to
-- fields that still have no crop set. One jsonb column: the shape is presentation data, not
-- something the app queries relationally.
alter table public.users add column if not exists onboarding jsonb;

comment on column public.users.onboarding is
  'Landing onboarding quiz answers: {crop, country, region, challenge, needs[], completed_at}';
