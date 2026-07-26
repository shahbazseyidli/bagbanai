-- 0050_demo_field.sql — the ONE field the public /demo tour is allowed to read.
--
-- The flag IS the whole access rule. GET /api/public/demo takes no path param, no query param and
-- no body: it resolves `where is_demo`, so there is no input an anonymous caller could poison to
-- reach a second field. The partial unique index is what makes that guarantee structural rather
-- than a convention — at most one row in the table can ever carry the flag.
--
-- Only a platform admin sets it (PATCH /api/admin/fields/{id}), and operationally the demo field
-- must live in a dedicated demo org: its uuid becomes public through the TiTiler tile URLs, exactly
-- as it already does for /s/ share links.
alter table public.fields add column if not exists is_demo boolean not null default false;

-- Partial index: only the flagged row is indexed, so it costs nothing on the millions of ordinary
-- fields and still rejects a second demo outright.
create unique index if not exists fields_one_demo_idx on public.fields (is_demo) where is_demo;

comment on column public.fields.is_demo is
  'Platform-admin flag: this field is the single public /demo tour field. At most one row (fields_one_demo_idx).';
