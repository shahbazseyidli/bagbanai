#!/usr/bin/env bash
# Daily Open-Meteo weather refresh + water_requirements recompute for all fields (M8).
# Calls the API container (holds the code) once, which loops the fields internally.
# Cron (once a day, offset from HLS/S2/research):
#   45 3 * * *  cd /opt/bagbanai && bash deploy/run-weather.sh >> /var/log/bagban-weather.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

LIMIT="${1:-200}"
resp=$(curl -sS --max-time 300 -X POST \
  "http://127.0.0.1:8000/api/internal/weather/drain?limit=${LIMIT}" \
  -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || { echo "[$(date -u +%FT%TZ)] weather drain failed"; exit 0; }
echo "[$(date -u +%FT%TZ)] $resp"
