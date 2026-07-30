#!/usr/bin/env bash
# Daily Field Wellness Score sweep (B8). Calls the API container (holds the code) once; it loops the
# fields internally and upserts today's row per field.
#
# WHY A CRON AND NOT A TRIGGER. GET /api/fields/{id}/wellness computes on demand and stores the row;
# GET /api/orgs/{id}/wellness — the read model behind the field-list chips and the dashboard tiles —
# is read-only by design, because one computation is ~8 queries and doing it per field on a list
# screen is a query stampede. So until this ran, opening a field was the ONLY thing that refreshed
# its stored score: in production one field served 89 to the list and 70 to its own page at the same
# moment, the 89 being two days old.
#
# Daily rather than after each new scene: the water component tracks the FAO-56 depletion and the GDD
# component tracks the temperature series, both of which move every day the weather does. A field can
# go a fortnight between usable scenes and still change score every morning.
#
# 04:20 UTC = 08:20 Asia/Baku — after the daily satellite (03:00/03:30) and weather+GDD (03:45) runs
# have fed it, and early enough that the working day opens on a score computed today. Fields whose
# row already carries today's date are skipped, so re-running this by hand after a failed night is
# cheap; pass `force` as $1 to recompute them anyway.
#
# Cron:
#   20 4 * * * cd /opt/bagbanai && flock -n /tmp/bagban-wellness.lock bash deploy/refresh-wellness.sh >> /var/log/bagban-wellness.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

# $1 = "force" to recompute fields that already have today's row (default: skip them).
FORCE="false"
if [ "${1:-}" = "force" ]; then FORCE="true"; fi
LIMIT="${2:-2000}"

resp=$(curl -sS --max-time 600 -X POST \
  "http://127.0.0.1:8000/api/internal/wellness/drain?limit=${LIMIT}&force=${FORCE}" \
  -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || {
  echo "[$(date -u +%FT%TZ)] wellness drain failed"; exit 0; }
echo "[$(date -u +%FT%TZ)] force=${FORCE} $resp"
