#!/usr/bin/env bash
# Silent Sentinel-2 (10m) refresh for every field — the S2 companion to run-hls.sh.
# Doubles as the one-time backfill of existing fields: `bash deploy/run-s2.sh 60`.
# track=0 → writes new S2 scenes/rasters but keeps data_status='ready' and does not re-notify;
# never touches HLS rows (sensor='s2'). Add to cron offset from the HLS run:
#   30 3 * * *  cd /opt/bagbanai && bash deploy/run-s2.sh 30 >> /var/log/bagban-s2.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
DAYS="${1:-120}"

ids=$($COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select id from public.fields")
if [ -z "$ids" ]; then echo "no fields yet — nothing to process"; exit 0; fi

for id in $ids; do
  echo "==> S2 pipeline for field $id (days_back=$DAYS)"
  # 4th arg 's2' → run_field_s2; track=0 → silent refresh (idempotent upserts, skip-if-exists COGs).
  $COMPOSE --profile geo run --rm geo python -m geo_pipeline.pipeline "$id" "$DAYS" 0 s2 \
    || echo "  ! field $id S2 failed, continuing"
done
echo "S2 run complete."
