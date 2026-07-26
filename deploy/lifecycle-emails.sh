#!/usr/bin/env bash
# E15 — WEEKLY digest drain. Calls the API (holds the templates + Resend), which builds and sends the
# one weekly email per user (idempotent per user per week).
#
# This is the ONLY recurring email in the product. Alerts (frost, heat, wind, NDVI drop/anomaly, pest
# risk), AI-advice changes and the onboarding/re-engagement nudges no longer send mail of their own —
# they are content inside this digest. Immediacy is served by in-app notifications and Telegram.
# Transactional mail (OTP, welcome, first "field is ready" report) is sent by the app, not this cron.
#
# Cron — Wednesday 03:00 UTC = 07:00 Azerbaijan (UTC+4, no DST), i.e. Wednesday morning:
#   0 3 * * 3  cd /opt/bagbanai && bash deploy/lifecycle-emails.sh >> /var/log/bagban-lifecycle.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

resp=$(curl -sS --max-time 300 -X POST \
  "http://127.0.0.1:8000/api/internal/emails/lifecycle/drain" \
  -H "X-Internal-Token: ${INTERNAL_API_TOKEN}") || { echo "[$(date -u +%FT%TZ)] lifecycle drain failed"; exit 0; }
echo "[$(date -u +%FT%TZ)] $resp"
