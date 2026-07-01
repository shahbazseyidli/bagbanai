#!/usr/bin/env bash
# Redeploy from GitHub (used once the repo is public and /opt/bagbanai is a git checkout).
# Pull latest main, rebuild + restart api/web, reload nginx. Run on the server:
#   cd /opt/bagbanai && bash deploy/update.sh
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

git pull --ff-only origin main
# source .env so ${POSTGRES_*} substitute in the compose file (else api gets a blank
# DATABASE_URL and crash-loops). bootstrap.sh / run-hls.sh do the same.
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml up -d --build api web
# keep the origin nginx vhost + reload (cert config is managed by certbot on the host)
if command -v nginx >/dev/null; then nginx -t && systemctl reload nginx || true; fi
echo "redeploy complete @ $(git rev-parse --short HEAD)"
