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

total=0; failed=0
for id in $ids; do
  total=$((total + 1))
  echo "==> HLS pipeline for field $id (days_back=$DAYS)"
  # track=0 → silent daily refresh: writes new scenes/rasters but keeps status='ready'
  # and does not re-send the "data ready" notification.
  if ! $COMPOSE --profile geo run --rm geo python -m geo_pipeline.pipeline "$id" "$DAYS" 0; then
    failed=$((failed + 1))
    echo "  ! field $id failed, continuing"
  fi
done

# Same loud-failure contract as run-s2.sh — see the comment there for why a green log was worse
# than no log at all. HLS happened to survive the OOM (30 m bands are ~9x smaller than S2's
# 10 m), so this half was never caught; it was the same swallowed-exit bug.
if [ "$failed" -gt 0 ]; then
  echo "HLS run FAILED for $failed/$total field(s)."
  exit 1
fi
echo "HLS run complete — $total/$total field(s) OK."
