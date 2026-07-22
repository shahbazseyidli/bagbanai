#!/usr/bin/env bash
# Compute per-field season features (T16): NDVI peak/mean/integral + GDD + precipitation aggregates
# → field_season_features, the feature store for a future NDVI-integral ↔ yield correlation. Runs
# for the current calendar year so features accumulate through the season; the upsert keeps one row
# per (field, season_year) up to date. Pass a year as $1 to backfill a past season.
#
# Cron (monthly, clear of the daily runs):
#   40 4 2 * * cd /opt/bagbanai && flock -n /tmp/bagban-season.lock bash deploy/compute-season-features.sh >> /var/log/bagban-season.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

YEAR="${1:-$(date -u +%Y)}"
API="http://127.0.0.1:8000/api/internal/season/compute?season_year=${YEAR}"

resp=$(curl -sS --max-time 120 -X POST "$API" -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || {
  echo "[$(date -u +%FT%TZ)] season/compute call failed"; exit 0; }
echo "[$(date -u +%FT%TZ)] year=${YEAR} $resp"
