#!/usr/bin/env bash
# Traffic report from nginx access logs — the analytics answer chosen in SEO_PLAN.md Q5:
# no on-site JS, no cookies, privacy policy stays true. Run on demand:
#   bash deploy/goaccess-report.sh            -> /root/agradex-traffic.html
#   bash deploy/goaccess-report.sh /path.html -> custom output
set -euo pipefail
OUT="${1:-/root/agradex-traffic.html}"
{ cat /var/log/nginx/access.log /var/log/nginx/access.log.1 2>/dev/null
  zcat /var/log/nginx/access.log.*.gz 2>/dev/null; } |
  goaccess - --log-format=COMBINED -o "$OUT" >/dev/null 2>&1
echo "report: $OUT ($(du -h "$OUT" | cut -f1))"
