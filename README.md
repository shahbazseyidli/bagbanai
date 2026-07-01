# Bağban AI

Peyk (NASA HLS) + hava (Open-Meteo) + AI əsaslı əkin monitorinqi və təsərrüfat idarəetmə platforması. UI Azərbaycan dilində; kod İngilis dilində.

> Tək həqiqət mənbəyi: [`docs/`](docs/) — platforma spesifikasiyası + subsidiya kalkulyatoru modulu. İş konteksti və qərarlar: [`CLAUDE.md`](CLAUDE.md).

## Stack
Next.js (App Router, TS) · FastAPI (Python 3.11+) · Postgres 16 + PostGIS · MapLibre GL · TiTiler · n8n · self-hosted on Hetzner (agradex.com).

## Layout
```
app/       Next.js frontend + BFF          services/   FastAPI (geo/weather/rules/advice/reports/tiles)
db/        SQL migrations + seeds          n8n/        workflows
i18n/      az (default), ru, tr            knowledge_base/  RAG + crop calendars (AZ)
deploy/    nginx / systemd / scripts       docs/       specs (SSoT)
```

## Local development

```bash
cp .env.example .env          # fill real values
docker compose up -d db       # Postgres 16 + PostGIS
# migrations + seeds: see db/README.md   (added in Step 1/2)
# backend:  cd services && ...           (Step 3)
# frontend: cd app && npm run dev        (Step 4)
```

## Status
Phase 1 (foundation) in progress — see the checklist in [`CLAUDE.md`](CLAUDE.md).
