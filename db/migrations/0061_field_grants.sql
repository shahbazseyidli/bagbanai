-- 0061_field_grants.sql — let a farmer show ONE field to ONE named person, without giving away the farm.
--
-- WHAT EXISTS TODAY, AND WHY IT IS NOT ENOUGH. There are two ways to let someone else see a field
-- and neither fits the commonest request in the research corpus — "my agronomist should look at
-- this field":
--   * public.field_shares (0040) is a TOKEN. Anyone holding the link sees a read-only card. It is
--     anonymous by design, so it cannot be revoked from one person, cannot be audited, and shows a
--     summary rather than the working screens.
--   * organization_members is ORG-WIDE. Adding the agronomist as a member hands them every field,
--     every farm, the notes, the costs and the team — to show them one hazelnut orchard.
-- So the honest answer is a grant on the field itself.
--
-- READ-ONLY, AND ONLY THAT. `role` exists so the column does not have to be added later, but
-- 'viewer' is the only value the CHECK admits. A grant must never become a way to write into
-- someone else's org: every write path in the API keeps going through require_role() on the
-- organization, untouched by this table. Widening it later is a deliberate act, not an oversight.
create table if not exists public.field_grants (
  id              uuid primary key default gen_random_uuid(),
  field_id        uuid not null references public.fields(id) on delete cascade,
  -- Denormalized like every other table here, so a policy can answer "which org is this?" without
  -- a join through farms.
  org_id          uuid not null,
  grantee_user_id uuid not null references public.users(id) on delete cascade,
  role            text not null default 'viewer',
  created_by      uuid references public.users(id) on delete set null,
  note            text,
  expires_at      timestamptz,                    -- null = until revoked
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  -- One row per (field, person). Re-granting an existing pair UPDATEs — which is also how a
  -- revoked grant is restored, rather than accumulating a history of identical rows.
  unique (field_id, grantee_user_id)
);

alter table public.field_grants drop constraint if exists field_grants_role_chk;
alter table public.field_grants add constraint field_grants_role_chk check (role in ('viewer'));

create index if not exists field_grants_grantee_idx
  on public.field_grants (grantee_user_id) where revoked_at is null;

comment on table public.field_grants is
  'Per-field read access for a named signed-in user. Read-only by CHECK; writes always go through organization membership.';

-- The one place the rule is written down. Everything else — the API gate and the RLS policies
-- below — calls this, so "who may read this field" cannot drift into two different answers.
--
-- SECURITY DEFINER because a grantee is NOT an org member: resolving the field's org through
-- public.fields/farms under the caller's own RLS would be blocked by the very policies this
-- function is meant to inform. Owned by the schema owner, no writes, and it takes ids only.
create or replace function public.has_field_access(uid uuid, fid uuid) returns boolean as $$
  select exists (
    -- Org membership: the normal path, and still the only path for writes. Reads fields.org_id
    -- directly rather than joining through farms — it is the denormalized column every other
    -- policy on this table already trusts, and it agrees with farms.org_id on every row in
    -- production (checked before writing this).
    select 1 from public.fields f
     where f.id = fid and public.is_org_member(uid, f.org_id)
  ) or exists (
    -- A live grant. Expiry and revocation are checked HERE rather than at the call sites, so
    -- forgetting the predicate in one endpoint cannot quietly keep a revoked grant working.
    select 1 from public.field_grants g
     where g.field_id = fid
       and g.grantee_user_id = uid
       and g.revoked_at is null
       and (g.expires_at is null or g.expires_at > now())
  );
$$ language sql stable security definer set search_path = public, pg_temp;

comment on function public.has_field_access(uuid, uuid) is
  'True if the user may READ this field: org member, or holder of a live field_grant. The single source of that rule.';

alter table public.field_grants enable row level security;

-- A grantee may see the row that grants them access — it is how the UI tells them why they can
-- see a field they do not own — and org members see the grants on their own fields.
drop policy if exists field_grants_read on public.field_grants;
create policy field_grants_read on public.field_grants for select
  using (grantee_user_id = public.current_user_id()
      or public.is_org_member(public.current_user_id(), org_id));

-- Granting access to a field is an owner/admin/agronomist act, like every other write on it.
drop policy if exists field_grants_write on public.field_grants;
create policy field_grants_write on public.field_grants for all
  using (public.has_org_role(public.current_user_id(), org_id,
                             array['owner','admin','agronomist']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id,
                                  array['owner','admin','agronomist']::org_role[]));

-- The read policies that must now recognise a grant. DELIBERATELY A SHORT LIST: it is exactly the
-- data the field screens render, and nothing else. A grantee must not gain the farm, the team, the
-- org, other fields, costs, or anything addressable beyond this field.
--
-- Note these are the DEFENCE layer, not the gate — the API connects as the table owner, so the
-- server-side check in deps.py is what actually runs today. They are kept in step anyway, because
-- the day a least-privileged role arrives the two must already agree.
drop policy if exists fields_read on public.fields;
create policy fields_read on public.fields for select
  using (public.is_org_member(public.current_user_id(), org_id)
      or public.has_field_access(public.current_user_id(), id));

drop policy if exists index_stats_read on public.index_stats;
create policy index_stats_read on public.index_stats for select
  using (public.is_org_member(public.current_user_id(), org_id)
      or public.has_field_access(public.current_user_id(), field_id));

drop policy if exists scenes_read on public.scenes;
create policy scenes_read on public.scenes for select
  using (public.is_org_member(public.current_user_id(), org_id)
      or public.has_field_access(public.current_user_id(), field_id));

drop policy if exists field_metadata_read on public.field_metadata;
create policy field_metadata_read on public.field_metadata for select
  using (public.has_field_access(public.current_user_id(), field_id));

drop policy if exists scene_attempts_read on public.scene_attempts;
create policy scene_attempts_read on public.scene_attempts for select
  using (public.is_org_member(public.current_user_id(), org_id)
      or public.has_field_access(public.current_user_id(), field_id));
