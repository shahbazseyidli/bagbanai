-- 0006_ai_subs.sql — advice / ai_chat / notifications / subscriptions / crop_thresholds (spec §7)

-- ===== ADVICE (AI) — PAID =====
create table public.advice (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  generated_at timestamptz not null default now(),
  model_provider text, model_name text, input_snapshot jsonb,
  summary text, findings jsonb, weather_outlook text, disclaimer text
);
create index advice_field_idx on public.advice (field_id, generated_at desc);

-- ===== AI CHAT (grounded) — PAID =====
create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null, field_id uuid references public.fields(id) on delete cascade,
  user_id uuid, role text not null,   -- user|assistant
  content text not null, context_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- ===== NOTIFICATIONS — PAID =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references public.fields(id) on delete cascade,
  org_id uuid not null, user_id uuid,
  created_at timestamptz not null default now(),
  source text not null,      -- vegetation|weather
  type text not null, severity text not null,   -- info|warning|critical
  title text not null, body text not null, payload jsonb,
  read_at timestamptz, delivered_channels text[]  -- inapp|push|email|telegram|whatsapp|sms
);
create index notif_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  inapp boolean default true, push boolean default true, email boolean default true,
  telegram_chat_id text, whatsapp_number text, sms_number text
);

-- ===== SUBSCRIPTIONS (org-level) — billing integration DEFERRED, gating kept =====
create table public.org_subscriptions (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  tier text not null default 'free',  -- free|pro|business
  seats int default 1, hectare_cap numeric,
  valid_until timestamptz not null default 'infinity',
  updated_at timestamptz not null default now()
);

-- ===== CROP THRESHOLDS (rule-engine KB) =====
create table public.crop_thresholds (
  id uuid primary key default gen_random_uuid(),
  crop_type text not null unique,
  gdd_base_c numeric, ndvi_healthy_min numeric, ndvi_stress_max numeric,
  ndmi_stress_max numeric, frost_threshold_c numeric, heat_threshold_c numeric,
  kc_stages jsonb
);
