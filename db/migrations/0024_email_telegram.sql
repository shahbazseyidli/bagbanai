-- 0024: email/OTP verification (U3) + Telegram alert channel (U4/T22).

-- OTP signup verification. Existing users stay verified (default true); only new signups made while
-- Resend is configured are set to false until they enter their code.
alter table public.users
  add column if not exists email_verified boolean not null default true,
  add column if not exists otp_code text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists otp_attempts int not null default 0;

-- Telegram (and future WhatsApp) delivery channels, one per user per channel.
create table if not exists public.messaging_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  channel text not null default 'telegram',
  chat_id text,
  link_token text unique,
  opt_in boolean not null default true,
  quiet_hours boolean not null default true,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, channel)
);

create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.messaging_channels(id) on delete set null,
  notification_id uuid,
  field_id uuid,
  text text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);
