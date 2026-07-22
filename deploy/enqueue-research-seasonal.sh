#!/usr/bin/env bash
# Seasonal auto-enqueue for the knowledge/research pipeline (T17). Queues Phase-1 research for
# fields whose crop calibration is absent or older than STALE_DAYS, so zone blocks + researched
# index_norms refresh across seasons. The actual research runs later via process-research.sh
# (which holds the LLM key in the API container). Idempotent — safe to run repeatedly.
#
# Cron (monthly, well clear of the daily HLS/S2/weather runs):
#   17 4 1 * * cd /opt/bagbanai && flock -n /tmp/bagban-seasonal.lock bash deploy/enqueue-research-seasonal.sh >> /var/log/bagban-seasonal.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

STALE_DAYS="${1:-120}"
LIMIT="${2:-300}"
API="http://127.0.0.1:8000/api/internal/research/enqueue-seasonal?limit=${LIMIT}&stale_days=${STALE_DAYS}"

resp=$(curl -sS --max-time 60 -X POST "$API" -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || {
  echo "[$(date -u +%FT%TZ)] enqueue-seasonal call failed"; exit 0; }
echo "[$(date -u +%FT%TZ)] $resp"
