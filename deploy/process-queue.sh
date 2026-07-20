#!/usr/bin/env bash
# Process newly-added fields (data_status='queued') → HLS pipeline (newest scenes first,
# writes clipped index COGs, updates progress/ETA, notifies when ready).
# Run via cron every ~2 min:
#   */2 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-queue.lock bash deploy/process-queue.sh >> /var/log/bagban-queue.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

# Initial window for a brand-new field: recent enough to be fast, the daily cron extends history.
DAYS="${1:-60}"
# Which sensors to ingest for a new field: all → HLS+S2 in one tracked lifecycle (run_field_all).
# Kill-switch: set SENSOR=hls to instantly revert new-field ingest to HLS-only, no code change.
SENSOR="${SENSOR:-all}"

ids=$($COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select id from public.fields where data_status='queued' order by created_at limit 5")
if [ -z "$ids" ]; then exit 0; fi

for id in $ids; do
  echo "==> [$(date -u +%FT%TZ)] processing queued field $id (days=$DAYS)"
  $COMPOSE --profile geo run --rm geo python -m geo_pipeline.pipeline "$id" "$DAYS" 1 "$SENSOR" \
    || echo "  ! field $id failed (status set to failed), continuing"
done
echo "queue drained."
