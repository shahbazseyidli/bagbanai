#!/usr/bin/env bash
# Run the HLS pipeline for every field in the DB (spec §10 / n8n `hls_scene_check`).
# Usage:  bash deploy/run-hls.sh [days_back]   (default 120). Add to cron for daily runs:
#   0 3 * * *  cd /opt/bagbanai && bash deploy/run-hls.sh >> /var/log/bagban-hls.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
DAYS="${1:-120}"

ids=$($COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select id from public.fields")
if [ -z "$ids" ]; then echo "no fields yet — nothing to process"; exit 0; fi

for id in $ids; do
  echo "==> HLS pipeline for field $id (days_back=$DAYS)"
  # track=0 → silent daily refresh: writes new scenes/rasters but keeps status='ready'
  # and does not re-send the "data ready" notification.
  $COMPOSE --profile geo run --rm geo python -m geo_pipeline.pipeline "$id" "$DAYS" 0 || echo "  ! field $id failed, continuing"
done
echo "HLS run complete."
