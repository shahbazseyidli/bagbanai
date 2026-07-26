# Agradex — Documentation Index

Agradex is a satellite + weather + AI crop-monitoring and farm-management platform for farmers in
Azerbaijan and the wider Caucasus. **Live at https://agradex.com** (marketing) and
**https://app.agradex.com** (the app). The interface ships in 8 languages; code, SQL, identifiers and
commit messages are English.

> **Naming.** The product was renamed **Bağban AI → Agradex** on 2026-07-25. Infrastructure
> identifiers were deliberately left alone (`/opt/bagbanai`, the `bagbanai` repo, the `bagban-api`
> health check), so older documents and paths still say "Bağban AI" — that is expected, not stale.
> Separately: **NASA/HLS is no longer named anywhere in the user interface** (the farmer sees
> "Peyk görüntüsü"), but it is still the correct name in every pipeline and infrastructure
> description below.

This folder is the project's written memory. Read it in the order that matches what you need.

## Start here

| Document | What it is | Read when you want to… |
|---|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | **Working context** — the compact current-state briefing for whoever picks the project up next. | Get oriented fast: what shipped, what is live, what is pending. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | **Architecture** — stack, component map, data flow, auth + RLS model, DB catalog, the HLS/S2 → indices → COG → TiTiler pipeline, the AI subsystem, deployment topology. | Understand how the system is built, and why. |
| [`ROADMAP.md`](ROADMAP.md) | **The single functional task tracker** — §A done · §B user-blocked · §C unified backlog, every item with a status code. | Decide what to build next. |
| [`OPERATIONS.md`](OPERATIONS.md) | **Ops runbook** — deploy/redeploy, `.env` and secrets, crons, migrations, the HLS pipeline, TiTiler, nginx/SSL, backups, troubleshooting. | Deploy, operate or debug the running system. |
| [`API_REFERENCE.md`](API_REFERENCE.md) | **REST API reference** — every endpoint with method, path, auth, params and response shape. | Call or extend the API. |
| [`DECISIONS.md`](DECISIONS.md) | **Decision log** — the non-obvious choices (no Supabase, own JWT + RLS, MapLibre native draw, Earthdata bearer token, TiTiler, deferred billing, and the 2026-07-26 localisation decisions) with context and consequences. | Understand why something was built the way it was. |

## Session journals

The most detailed record of what happened, in the order it happened, including what was tried and
rejected. Read the newest one when you need context a summary cannot carry.

- [`SESSION_2026-07-26.md`](SESSION_2026-07-26.md) — the field-page restructure (E14), NASA removal
  and the "Peyk görüntüsü" rename, the landing onboarding quiz, SSR/hreflang, the email
  consolidation to one weekly digest (E15), Russian as the 8th locale, local area units, the
  Opus-5 audit fixes, and the language/quota/passport defects found by live testing in Russian.
- [`SESSION_2026-07-25.md`](SESSION_2026-07-25.md) — the Agradex rebrand, the email system going
  live (Resend), the app.agradex.com panel split, admin expansion and the i18n gaps.

## Planning & research

| Document | What it is |
|---|---|
| [`DESIGN_IMPLEMENTATION_PLAN.md`](DESIGN_IMPLEMENTATION_PLAN.md) | Redesign tracker (D0–D5) — information architecture, design system, onboarding; §A feature-parity matrix, §K status. |
| [`HYBRID_PLAN.md`](HYBRID_PLAN.md) | The hybrid marketplace plan (waves W0–W8) that produced roles, conversations, ledger, zones, shares and reports. |
| [`ONESOIL_BENCHMARK.md`](ONESOIL_BENCHMARK.md) · [`FARMBRITE_BENCHMARK.md`](FARMBRITE_BENCHMARK.md) · [`ONESOIL_UX_SPEC.md`](ONESOIL_UX_SPEC.md) | Competitor studies and the UX form alignment derived from them. |
| [`Infrastruktur_Layer_Tekmillesdirme.md`](Infrastruktur_Layer_Tekmillesdirme.md) | Azercosmos FarmerApp study + the free/self-hosted parity plan. Source of infra Sprints 1–2; §6 lists what remains. Do not overwrite. |
| [`Sentinel2_Integration.md`](Sentinel2_Integration.md) | How Sentinel-2 was added alongside HLS (NDRE/CIre, 10 m rasters). |
| [`AI_Knowledge_Layer_Adaptation.md`](AI_Knowledge_Layer_Adaptation.md) | The knowledge layer (M1–M8): zone/field knowledge, research jobs, structured API adapters. |
| [`I18N_STATUS_2026-07-25.md`](I18N_STATUS_2026-07-25.md) | Snapshot of the translation sweep. **Superseded in part:** there are now 8 locales (ru added 2026-07-26) — see the newest session journal. |
| [`REMAINING.md`](REMAINING.md) · [`GAP_Analizi_Catismayan_Funksionalliqlar.md`](GAP_Analizi_Catismayan_Funksionalliqlar.md) · [`Texniki_Implementasiya_Plani_GAP.md`](Texniki_Implementasiya_Plani_GAP.md) | Gap analyses. Cross-check against `ROADMAP.md`, which is the authoritative tracker. |
| [`Bazar_Arasdirmasi_Platformalar_2026.md`](Bazar_Arasdirmasi_Platformalar_2026.md) | Market research on comparable platforms. |

## Source of truth (specifications)

- [`Bagban_AI_Platforma_Spesifikasiya_AZ.md`](Bagban_AI_Platforma_Spesifikasiya_AZ.md) — the main
  platform specification (§1–§29).
- [`Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md`](Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md) — the
  subsidy calculator (§30). **The calculator was removed from the product**; the frontend and router
  are gone and the `subsidy_*` tables lie dormant (deliberately not dropped). Kept for history.

The specs assume Supabase; the project deliberately deviates — self-hosted Postgres + PostGIS, our
own JWT, deferred billing, root domain. Those deviations are recorded in `../CLAUDE.md` and
`DECISIONS.md`.

## Current state (2026-07-26)

Phase 1 is live and well past its original scope. The AI advice and per-field chat are **active**
(Claude, `LLM_API_KEY` set on the server), email is **active** (Resend) and consolidated into a
single weekly digest, the marketing/app host split is live, and the interface runs in 8 languages.
Version history is in [`../CHANGELOG.md`](../CHANGELOG.md); the authoritative task list is
[`ROADMAP.md`](ROADMAP.md).

**Standing deadlines:** `EARTHDATA_TOKEN` expires **2026-08-30** (HLS reads 401 after that), the
EPPO API closes **2026-09-01**, and the LLM key should be rotated.
