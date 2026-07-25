#!/usr/bin/env bash
# E2.3 — daily behavioral/lifecycle email drain. Calls the API (holds the templates + Resend), which
# evaluates the onboarding/re-engagement rules and sends the matching emails (idempotent per user).
# Cron (once a day, mid-morning local so nudges land at a friendly hour; AZ is UTC+4 → 06:15 UTC ≈ 10:15):
#   15 6 * * *  cd /opt/bagbanai && bash deploy/lifecycle-emails.sh >> /var/log/bagban-lifecycle.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

resp=$(curl -sS --max-time 300 -X POST \
  "http://127.0.0.1:8000/api/internal/emails/lifecycle/drain" \
  -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || { echo "[$(date -u +%FT%TZ)] lifecycle drain failed"; exit 0; }
echo "[$(date -u +%FT%TZ)] $resp"
