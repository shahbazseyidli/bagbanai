# Bağban AI — Documentation Index

Bağban AI is a NASA-HLS satellite + weather + AI crop-monitoring & farm-management platform for
Azerbaijani farmers. **Live at https://agradex.com.** UI is Azerbaijani; code/SQL/commits are English.

This folder is the project's written memory. Read it in this order depending on what you need.

## Start here

| Document | What it is | Read when you want to… |
|---|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | **Working context** — the compact, current-state briefing for a developer or AI assistant picking up the project. | Get oriented fast; know what shipped, what's live, and what's pending. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | **Architecture & technical spec** — stack, component/container map, data flow, auth+RLS model, DB table catalog, HLS→indices→COG→TiTiler pipeline, AI subsystem, deployment topology, security. | Understand *how the system is built and why*. |
| [`ROADMAP.md`](ROADMAP.md) | **Roadmap** — what's done (mapped to CHANGELOG 1.0.0–1.0.6), status vs the spec phases, prioritized backlog (P0/P1/P2) and Phase 2+ features, each with what/why/how. | Decide *what to build next*. |
| [`OPERATIONS.md`](OPERATIONS.md) | **Ops runbook** — deploy/redeploy, secrets & `.env` (incl. how to activate the Claude AI key and email), crons, running the HLS pipeline, migrations, TiTiler, nginx/SSL, backups, logs, and a troubleshooting playbook. | Deploy, operate, or debug the running system. |
| [`API_REFERENCE.md`](API_REFERENCE.md) | **REST API reference** — every endpoint grouped by area, with method/path, purpose, auth, and key params. | Call or extend the API. |
| [`DECISIONS.md`](DECISIONS.md) | **Architecture decision log (ADR)** — the key choices (no Supabase, own JWT+RLS, MapLibre native draw, Earthdata bearer token, TiTiler hybrid rasters, Claude AI, async processing, deferred billing, SSH remote…) with context/rationale/consequences. | Understand *why* a non-obvious choice was made. |
| [`Infrastruktur_Layer_Tekmillesdirme.md`](Infrastruktur_Layer_Tekmillesdirme.md) | **Infra-layer improvement plan** — live study of Azercosmos FarmerApp (Esri ArcGIS) + a free/self-hosted parity plan. Source of infra Sprints 1–2; §6/§8 list the remaining work. | Continue the map/satellite-analysis work. |

## Source of truth (specifications)

- [`Bagban_AI_Platforma_Spesifikasiya_AZ.md`](Bagban_AI_Platforma_Spesifikasiya_AZ.md) — main platform spec (§1–§29).
- [`Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md`](Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md) — subsidy calculator (§30) + 2026 seed.

The specs assume Supabase; the project deliberately deviates (self-hosted Postgres, own JWT, deferred
billing, root domain) — those deviations are recorded in `CLAUDE.md` and `DECISIONS.md`.

## Current state (2026-07-14, one line)

Phase 1 live; **infra Sprint 1** (basemap gallery) + **Sprint 2** (TiTiler satellite raster-analysis +
async processing/ETA/notifications) shipped; **AI agronomic advice + per-field chatbot** built and deployed
but **dormant until `LLM_API_KEY` (Claude) is added to the server `.env`** — see `OPERATIONS.md`.
Version history is in [`../CHANGELOG.md`](../CHANGELOG.md).
