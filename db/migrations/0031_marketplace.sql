-- 0031_marketplace.sql — Multi-sided platform (HYBRID_PLAN §E). Adds a GLOBAL marketplace role on
-- users (farmer/lab/consultant/supplier — distinct from the org_role membership enum), provider
-- profiles + catalog, cross-role & farmer↔farmer messaging, fertilizer plans (E8) and field photos
-- (E10). Additive / backwards-compatible. Server-side gated (deps: require_member for org-scoped,
-- self user_id for user-scoped) like 0019/0027 — RLS is optional and skipped here.

-- 1) Global marketplace role + global location on the user (idempotent enum create).
do $$ begin
  create type user_role as enum ('farmer', 'lab', 'consultant', 'supplier');
exception when duplicate_object then null; end $$;

alter table public.users
  add column if not exists role    user_role not null default 'farmer',
  add column if not exists country text,
  add column if not exists region  text;

-- 2) Provider profile — one per user (lab / consultant / supplier). Self-scoped.
create table if not exists public.provider_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  kind            user_role not null,               -- lab | consultant | supplier
  company         text not null,
  bio             text,
  specializations text[] not null default '{}',     -- supplier: seed/fertilizer/... ; lab: services ; consultant: crops
  country         text,
  region          text,
  address         text,
  coverage        text,                             -- free-text coverage area
  phone           text,
  rating          numeric,                          -- denormalized avg rating (future)
  order_count     int not null default 0,
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)
);
create index if not exists provider_profiles_kind_idx on public.provider_profiles (kind, country, region);

-- 3) Catalog items — supplier products / lab services rendered in the directory.
create table if not exists public.catalog_items (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  name        text not null,
  category    text,                                  -- seed | fertilizer | pesticide | equipment | service
  unit        text,
  price       numeric,
  currency    text not null default 'AZN',
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists catalog_items_provider_idx on public.catalog_items (provider_id);

-- 4) Conversations — farmer↔provider and farmer↔farmer (two user participants, deduped a<b).
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  a_user_id  uuid not null references public.users(id) on delete cascade,
  b_user_id  uuid not null references public.users(id) on delete cascade,
  kind       text not null default 'peer',           -- peer | provider
  last_text  text,
  last_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (a_user_id, b_user_id)
);
create index if not exists conversations_a_idx on public.conversations (a_user_id, last_at desc);
create index if not exists conversations_b_idx on public.conversations (b_user_id, last_at desc);

-- 5) Messages.
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

-- 6) Fertilizer plans (E8) — user schedule + AI suggestion. Field-scoped, org denormalized.
create table if not exists public.fertilizer_plans (
  id         uuid primary key default gen_random_uuid(),
  field_id   uuid not null references public.fields(id) on delete cascade,
  org_id     uuid not null,
  product    text not null,                          -- e.g. "Azot (46%)"
  category   text,                                   -- nitrogen | phosphorus | potassium | complex
  zone       text,                                   -- "şimal zona" | "bütün sahə"
  dose       text,                                   -- "32 kg/ha"
  planned_on date,
  status     text not null default 'planned',        -- planned | done
  source     text not null default 'manual',         -- manual | ai
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists fertilizer_plans_field_idx on public.fertilizer_plans (field_id, planned_on);

-- 7) Field photos (E10) — farmer photo + AI auto-label + condition; feeds AI advice context.
create table if not exists public.field_photos (
  id           uuid primary key default gen_random_uuid(),
  field_id     uuid not null references public.fields(id) on delete cascade,
  org_id       uuid not null,
  photo_path   text not null,
  ai_label     text,                                 -- "Fındıq yarpağı — zərərverici izi"
  ai_condition text,                                 -- healthy | stress | pest | disease | nutrient
  ai_notes     text,
  parsed       jsonb,
  model_name   text,
  created_at   timestamptz not null default now()
);
create index if not exists field_photos_field_idx on public.field_photos (field_id, created_at desc);
