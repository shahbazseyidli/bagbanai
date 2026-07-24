-- 0038_ledger_ops.sql — HYBRID_PLAN W7 (B7 sales/buyer CRM, B12 inventory-lite, B13 equipment).
-- public.yields stays the season AGGREGATE (unique field/season/crop, upserted); harvest_lots +
-- sales are the append-only log that can carry a buyer, a date, a quantity and a trace code.
-- Inventory deducts against the free-text field_operations.inputs by fuzzy name match.
-- Low-stock / service-due alerts are ORG-scoped, but alert_state (0016) is keyed on a NOT NULL
-- field_id, so org-level dedup needs its own tiny table. Additive; no RLS (server-side gating).

-- ===== B7: buyers + harvest lots + sales =====
create table if not exists public.buyers (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  kind         text,                              -- trader | processor | market | export | other
  contact_name text,
  phone        text,
  email        text,
  address      text,
  region       text,
  notes        text,
  created_by   uuid references public.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, name)
);
create index if not exists buyers_org_idx on public.buyers (org_id, name);

create table if not exists public.harvest_lots (
  id            uuid primary key default gen_random_uuid(),
  field_id      uuid not null references public.fields(id) on delete cascade,
  org_id        uuid not null,
  season_id     uuid references public.field_seasons(id) on delete set null,
  season_year   int not null,
  crop_type     text,
  trace_code    text not null unique,             -- 'AGX-2026-3F9A2C71', generated server-side
  harvested_on  date not null,
  quantity      numeric,
  unit          text not null default 'kq',       -- kq | ton
  quality_grade text,
  moisture_pct  numeric,
  storage       text,
  notes         text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists harvest_lots_field_idx on public.harvest_lots (field_id, harvested_on desc);
create index if not exists harvest_lots_org_idx   on public.harvest_lots (org_id, season_year);

create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  lot_id         uuid references public.harvest_lots(id) on delete set null,
  field_id       uuid references public.fields(id) on delete set null,
  buyer_id       uuid references public.buyers(id) on delete set null,
  season_year    int,
  sold_on        date not null,
  quantity       numeric,
  unit           text not null default 'kq',
  price_per_unit numeric,
  revenue        numeric,                          -- total; the ledger sums THIS alongside yields.revenue
  currency       text not null default 'AZN',
  payment_status text not null default 'paid',     -- paid | pending | partial
  invoice_no     text,
  notes          text,
  created_by     uuid references public.users(id),
  created_at     timestamptz not null default now()
);
create index if not exists sales_org_idx   on public.sales (org_id, sold_on desc);
create index if not exists sales_field_idx on public.sales (field_id, sold_on desc);
create index if not exists sales_buyer_idx on public.sales (buyer_id, sold_on desc);

-- ===== B12: inventory-lite =====
create table if not exists public.inventory_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  category     text not null default 'other',     -- seed | fertilizer | pesticide | fuel | equipment | other
  unit         text not null default 'kq',
  quantity     numeric not null default 0,
  min_quantity numeric,                            -- low-stock threshold (null = no alert)
  unit_cost    numeric,
  currency     text not null default 'AZN',
  supplier     text,
  notes        text,
  created_by   uuid references public.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, name)
);
create index if not exists inventory_items_org_idx on public.inventory_items (org_id, category, name);

create table if not exists public.inventory_moves (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  item_id      uuid not null references public.inventory_items(id) on delete cascade,
  delta        numeric not null,                   -- + intake, − consumption
  reason       text not null default 'adjust',     -- purchase | operation | adjust | waste
  operation_id uuid references public.field_operations(id) on delete set null,
  field_id     uuid references public.fields(id) on delete set null,
  note         text,
  created_by   uuid references public.users(id),
  created_at   timestamptz not null default now()
);
create index if not exists inventory_moves_item_idx on public.inventory_moves (item_id, created_at desc);
create index if not exists inventory_moves_op_idx   on public.inventory_moves (operation_id);

-- ===== B13: equipment + service reminders =====
create table if not exists public.equipment (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  kind          text,                              -- tractor | sprayer | harvester | pump | other
  make_model    text,
  serial_no     text,
  purchase_date date,
  hours         numeric,                           -- current usage hours
  status        text not null default 'active',    -- active | service | retired
  notes         text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists equipment_org_idx on public.equipment (org_id, status, name);

create table if not exists public.equipment_service (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  equipment_id   uuid not null references public.equipment(id) on delete cascade,
  service_type   text not null,                    -- oil | filter | tyres | inspection | other
  interval_days  int,
  interval_hours numeric,
  last_done_on   date,
  last_done_hours numeric,
  next_due_on    date,
  task_id        uuid references public.tasks(id) on delete set null,  -- materialized reminder
  cost           numeric,
  notes          text,
  created_by     uuid references public.users(id),
  created_at     timestamptz not null default now()
);
create index if not exists equipment_service_eq_idx  on public.equipment_service (equipment_id, next_due_on);
create index if not exists equipment_service_due_idx on public.equipment_service (org_id, next_due_on);

-- ===== Org-scoped alert dedup (alert_state 0016 requires a field_id) =====
create table if not exists public.org_alert_state (
  org_id        uuid not null references public.organizations(id) on delete cascade,
  alert_key     text not null,                     -- e.g. 'low_stock:<item_id>' | 'service_due:<service_id>'
  last_fired_at timestamptz not null default now(),
  primary key (org_id, alert_key)
);
