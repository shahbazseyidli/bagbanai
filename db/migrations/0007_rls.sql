-- 0007_rls.sql — RLS helpers + policies (spec §8), adapted: auth.uid() -> public.current_user_id()
--
-- NOTE (see CLAUDE.md): primary access enforcement is server-side in FastAPI
-- (requireRole/requirePaid). RLS here is defense-in-depth. The application connects
-- as the table-owning role `bagban`, which bypasses RLS by default; these policies
-- take effect for any future restricted/analytics role. Backend still calls
-- `SET LOCAL app.user_id = '<uuid>'` per request so current_user_id() is populated.

-- ===== Helper functions (§8) =====
create or replace function public.is_org_member(uid uuid, oid uuid) returns boolean as $$
  select exists (select 1 from public.organization_members m
    where m.org_id=oid and m.user_id=uid and m.status='active');
$$ language sql stable;

create or replace function public.has_org_role(uid uuid, oid uuid, roles org_role[]) returns boolean as $$
  select exists (select 1 from public.organization_members m
    where m.org_id=oid and m.user_id=uid and m.status='active' and m.role = any(roles));
$$ language sql stable;

create or replace function public.org_is_paid(oid uuid) returns boolean as $$
  select exists (select 1 from public.org_subscriptions s
    where s.org_id=oid and s.tier in ('pro','business') and s.valid_until > now());
$$ language sql stable;

-- ===== Enable RLS =====
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.farms                enable row level security;
alter table public.fields               enable row level security;
alter table public.field_metadata       enable row level security;
alter table public.scenes               enable row level security;
alter table public.index_stats          enable row level security;
alter table public.index_rasters        enable row level security;
alter table public.weather_cache        enable row level security;
alter table public.scouting_observations enable row level security;
alter table public.tasks                enable row level security;
alter table public.field_operations     enable row level security;
alter table public.yields               enable row level security;
alter table public.reports              enable row level security;
alter table public.advice               enable row level security;
alter table public.ai_chat_messages     enable row level security;
alter table public.notifications        enable row level security;

-- ===== Organizations / membership =====
create policy orgs_read on public.organizations for select
  using (public.is_org_member(public.current_user_id(), id));
create policy orgs_manage on public.organizations for all
  using (public.has_org_role(public.current_user_id(), id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), id, array['owner','admin']::org_role[]));

create policy members_read on public.organization_members for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy members_manage on public.organization_members for all
  using (public.has_org_role(public.current_user_id(), org_id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin']::org_role[]));

-- ===== Farms / fields / metadata (agronomist+ writes) =====
create policy farms_read on public.farms for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy farms_write on public.farms for all
  using (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist']::org_role[]));

create policy fields_read on public.fields for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy fields_write on public.fields for all
  using (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist']::org_role[]));

create policy field_metadata_read on public.field_metadata for select
  using (exists (select 1 from public.fields f
    where f.id = field_id and public.is_org_member(public.current_user_id(), f.org_id)));
create policy field_metadata_write on public.field_metadata for all
  using (exists (select 1 from public.fields f
    where f.id = field_id and public.has_org_role(public.current_user_id(), f.org_id, array['owner','admin','agronomist','worker']::org_role[])))
  with check (exists (select 1 from public.fields f
    where f.id = field_id and public.has_org_role(public.current_user_id(), f.org_id, array['owner','admin','agronomist','worker']::org_role[])));

-- ===== Satellite + weather: FREE read for members =====
create policy scenes_read       on public.scenes        for select using (public.is_org_member(public.current_user_id(), org_id));
create policy index_stats_read  on public.index_stats   for select using (public.is_org_member(public.current_user_id(), org_id));
create policy index_rasters_read on public.index_rasters for select
  using (exists (select 1 from public.fields f where f.id = field_id and public.is_org_member(public.current_user_id(), f.org_id)));
create policy weather_read      on public.weather_cache for select using (public.is_org_member(public.current_user_id(), org_id));

-- ===== Scouting / tasks / operations / yields (worker+ can add) =====
create policy scouting_read on public.scouting_observations for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy scouting_insert on public.scouting_observations for insert
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist','worker']::org_role[]));

create policy tasks_read on public.tasks for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy tasks_manage on public.tasks for all
  using (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist','worker']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist','worker']::org_role[]));

create policy fieldops_read on public.field_operations for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy fieldops_insert on public.field_operations for insert
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist','worker']::org_role[]));

create policy yields_read on public.yields for select
  using (public.is_org_member(public.current_user_id(), org_id));
create policy yields_write on public.yields for all
  using (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id, array['owner','admin','agronomist']::org_role[]));

create policy reports_read on public.reports for select
  using (public.is_org_member(public.current_user_id(), org_id));

-- ===== PAID gating: advice / ai_chat / notifications =====
create policy advice_read on public.advice for select
  using (public.is_org_member(public.current_user_id(), org_id) and public.org_is_paid(org_id));
create policy ai_chat_read on public.ai_chat_messages for select
  using (public.is_org_member(public.current_user_id(), org_id) and public.org_is_paid(org_id));
create policy notifications_read on public.notifications for select
  using (public.is_org_member(public.current_user_id(), org_id) and public.org_is_paid(org_id));
