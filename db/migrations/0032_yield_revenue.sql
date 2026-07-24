-- 0032_yield_revenue.sql — HYBRID_PLAN W6 (per-field P&L-lite). yields records gain optional revenue
-- so profit = sum(yields.revenue) − sum(field_operations.cost) per field/season. Additive.
alter table public.yields
  add column if not exists revenue numeric,   -- total revenue for this yield record (AZN)
  add column if not exists price   numeric;   -- optional price per unit (AZN)
