-- 0011 · Platform admin flag + AI token usage / cost ledger.
-- The API connects as a superuser role, so admin/internal reads bypass RLS — this
-- ledger has no RLS policies of its own (it is only ever queried by admin endpoints).

-- platform admin flag + set the owner as admin
alter table public.users add column if not exists is_admin boolean not null default false;
update public.users set is_admin = true where lower(email) = 'seyidlimirshahbaz@gmail.com';

-- AI token usage + cost ledger (no RLS: admin/internal only; API is superuser)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  kind text not null,                 -- 'advice' | 'chat'
  provider text not null default 'anthropic',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, created_at desc);
create index if not exists ai_usage_org_idx on public.ai_usage(org_id, created_at desc);
create index if not exists ai_usage_created_idx on public.ai_usage(created_at desc);
