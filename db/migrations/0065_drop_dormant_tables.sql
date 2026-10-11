-- 0065_drop_dormant_tables.sql — retire three generations of dormant tables.
--
-- THE DECISION (owner, 2026-10-11): archive, then drop. Every previous wave deliberately left its
-- tables in place — the subsidy calculator (v1.12.0), the ERP strip (81660df) and the 2026-08-04
-- cut each removed the UI and the routes and kept the schema, so the data stayed recoverable. That
-- was the right call three times; it also meant anyone reading the schema met eighteen tables that
-- looked like live features. This closes it.
--
-- ARCHIVE FIRST, and it exists before this file runs:
--   /root/archive-dormant-tables-20261011.sql.gz                      (Contabo)
--   root@91.99.157.161:/root/bagban-backups/archive-dormant-tables-20261011.sql.gz
-- pg_dump --no-owner --no-privileges of exactly these 18 tables, schema AND data; verified to
-- contain 18 CREATE TABLE statements, 18 COPY blocks, and the 117 subsidy_rates + 6
-- subsidy_modifiers rows. Restoring is `zcat … | psql`.
-- ⚠️ The filename deliberately does NOT start with `bagban-`: /root/bin/backup-db.sh rotates
-- `bagban-*.sql.gz` down to the newest 14, which would have deleted this archive in a fortnight.
--
-- WHAT IS *NOT* DROPPED, and why — measured against the code on 2026-10-11, not against the
-- removal notes, because the notes were wrong about three of them:
--   public.tasks             — routers/admin.py still SELECTs it (the admin panel lists tasks).
--   public.field_zones       — geo_pipeline/zones.py still writes and deletes it.
--   public.field_operations  — TWO live readers: routers/reports.py (the print report) and
--                              ai/context.py (the AI advice prompt). Its 5 rows still reach the
--                              model. The 2026-08-04 note calls it dormant; only its WRITER went.
--   public.field_weather_daily — ai/season.py reads it for season precipitation. Currently 0 rows
--                              (its writer, POST /weather/backfill, went in the same cut), but it
--                              degrades honestly to the forecast fallback and can be refilled.
--
-- ALSO CORRECTED HERE: the removal notes warned that dropping field_documents would require
-- cleaning uploaded files off disk — "every uploaded lab report, cadastre extract, contract and
-- receipt is still on disk". Measured: field_documents has 0 rows, photo_diagnoses has 0 rows, and
-- the upload volume (deploy/storage, mounted at /srv/storage) is empty. There was nothing to clean.
--
-- NO CASCADE, ON PURPOSE. The order below is derived from the live foreign-key graph, children
-- first. If some dependency exists that this order does not know about, the drop must FAIL and say
-- so — a CASCADE would silently take the unknown dependant with it, which is the one outcome an
-- archive cannot undo for someone who did not know to look.

begin;

-- VRA (dose plans over productivity zones; the zone runs themselves stay)
drop table if exists public.vra_zone_doses;
drop table if exists public.vra_plans;

-- Trade and stock
drop table if exists public.sales;              -- → buyers, harvest_lots
drop table if exists public.inventory_moves;    -- → inventory_items, field_operations
drop table if exists public.inventory_items;
drop table if exists public.buyers;
drop table if exists public.harvest_lots;

-- Machinery
drop table if exists public.equipment_service;  -- → equipment, tasks
drop table if exists public.equipment;

-- Map annotations, documents, the manual rain log
drop table if exists public.map_places;
drop table if exists public.field_documents;    -- → field_operations (kept)
drop table if exists public.field_rain_log;

-- Reporting and yields (the print report was rebuilt in b5bc9ec WITHOUT this table)
drop table if exists public.reports;
drop table if exists public.yields;

-- Subsidy calculator (0008). subsidy_modifiers was NOT on the removal note's list and would have
-- blocked the drop of subsidy_years — the FK graph found it, the note did not.
drop table if exists public.subsidy_calculations;  -- → subsidy_rates
drop table if exists public.subsidy_modifiers;     -- → subsidy_years
drop table if exists public.subsidy_rates;         -- → subsidy_years
drop table if exists public.subsidy_years;

commit;
