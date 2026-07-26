-- 0054_scouting_pins.sql — scouting notes as pins on the field map (6.5).
--
-- Two columns and two policies. Deliberately NOT in here:
--   * lat/lon — public.scouting_observations already carries `geom geometry(Point,4326)` with a
--     GiST index (0005), and the create endpoint has always written it. What was missing was a
--     READ path: the list endpoint returned st_asgeojson(geom) while the client typed lat/lon, so
--     the coordinates existed in the database and never once reached the screen.
--   * a status column — `status text default 'open'` (open|resolved) also already exists.
--   * a CHECK on status — it is legacy free text; `add check` would fail the migration on any row
--     that ever carried something else, and the router already validates the two literals.
--   * resolved_by — created_by already answers who owns the note, and a second users FK is one
--     more edge for 0052's anonymise-don't-delete path to carry.
--   * an index — scouting_field_idx (field_id, observed_at desc) already serves the only query,
--     and a field holds tens of notes, not millions.

-- The colour NAME, not the hex. The hex belongs to the design layer
-- (app/src/components/field/scouting/pins.ts); storing '#dc2626' would turn a palette tweak into a
-- data migration. The CHECK keeps the seven honest so the client's name→hex table can never be
-- handed a name it has no colour for.
--
-- `default 'red'` colours every pre-existing note red. That is the honest trade against a nullable
-- column plus an eighth "uncoloured" grey that would exist only to describe rows written before
-- the feature; production holds test accounts only.
alter table public.scouting_observations
  add column if not exists color text not null default 'red';

alter table public.scouting_observations drop constraint if exists scouting_color_chk;
alter table public.scouting_observations add constraint scouting_color_chk
  check (color in ('red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink'));

-- WHEN the note was closed. status already said THAT it was closed; the date is what turns a
-- resolved note into a record ("we treated this on the 12th") instead of a disappeared to-do.
-- The router owns the pairing of the two — see routers/scouting.py::update_obs.
alter table public.scouting_observations
  add column if not exists resolved_at timestamptz;

comment on column public.scouting_observations.color is
  'Pin colour NAME (red|orange|yellow|green|blue|violet|pink) — the farmer''s own colour code. The hex lives in the frontend palette.';
comment on column public.scouting_observations.resolved_at is
  'When status moved to ''resolved''. Set/cleared by the API together with status, never independently.';

-- 0007_rls.sql created only scouting_read (select) and scouting_insert (insert). Under RLS an
-- operation with no permissive policy is denied outright, so edit/delete/resolve — the whole point
-- of this change — had no policy at all. It is invisible today because the API connects as the
-- table owner and RLS is bypassed; it would break silently the day FORCE RLS or a least-privileged
-- role arrives. Defense-in-depth has to match the router, so the pair lands with the feature.
drop policy if exists scouting_update on public.scouting_observations;
create policy scouting_update on public.scouting_observations for update
  using (public.has_org_role(public.current_user_id(), org_id,
                             array['owner','admin','agronomist','worker']::org_role[]))
  with check (public.has_org_role(public.current_user_id(), org_id,
                                  array['owner','admin','agronomist','worker']::org_role[]));

-- Deleting someone else's observation destroys a record, so it is narrower than editing one: the
-- author, or an org admin. Mirrors routers/scouting.py::delete_obs.
drop policy if exists scouting_delete on public.scouting_observations;
create policy scouting_delete on public.scouting_observations for delete
  using (created_by = public.current_user_id()
      or public.has_org_role(public.current_user_id(), org_id,
                             array['owner','admin']::org_role[]));
