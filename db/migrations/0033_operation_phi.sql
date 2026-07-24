-- 0033_operation_phi.sql — HYBRID_PLAN W6 (B6: PHI / pre-harvest interval safety).
-- A spray operation can carry a pre-harvest interval (days after which the crop is safe to
-- harvest). Used to compute a countdown + block "safe to harvest" until it elapses. Additive.
alter table public.field_operations
  add column if not exists phi_days integer;   -- pre-harvest interval in days (spray → safe harvest)
