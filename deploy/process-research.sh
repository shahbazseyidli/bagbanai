#!/usr/bin/env bash
# Drain the research_jobs queue (knowledge layer M4). Each due job runs Phase-1 research
# (soil + zone + LLM synthesis) inside the API container (which holds the LLM key), then
# re-detects clarifications. Processes one job per HTTP call to stay within the proxy
# timeout; loops until the queue is empty or MAX is hit.
#
# Cron (offset from the HLS/S2 runs), every ~3 min:
#   */3 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-research.lock bash deploy/process-research.sh >> /var/log/bagban-research.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

API="http://127.0.0.1:8000/api/internal/research/drain?limit=1"
MAX="${1:-6}"   # cap jobs per cron tick (bounds cost + runtime)

for i in $(seq 1 "$MAX"); do
  resp=$(curl -sS --max-time 180 -X POST "$API" -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || {
    echo "[$(date -u +%FT%TZ)] drain call failed"; exit 0; }
  echo "[$(date -u +%FT%TZ)] $resp"
  # Stop as soon as a tick claimed nothing (queue empty / none due).
  echo "$resp" | grep -q '"claimed": *0' && { echo "queue empty"; break; }
done
