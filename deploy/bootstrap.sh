#!/usr/bin/env bash
# One-shot deploy for Bağban AI on a fresh Hetzner host (Ubuntu 22.04/24.04 + Docker).
# Run from the repo root:  bash deploy/bootstrap.sh
# Idempotent: safe to re-run (migrations tracked; seeds upsert).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

echo "==> 1/5 .env"
if [ ! -f .env ]; then
  cp .env.example .env
  # generate real secrets
  gen() { openssl rand -hex 32; }
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(gen)|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(gen)|" .env
  sed -i "s|^INTERNAL_API_TOKEN=.*|INTERNAL_API_TOKEN=$(gen)|" .env
  # keep DATABASE_URL password in sync with POSTGRES_PASSWORD for local/dev use
  PW="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)"
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://bagban:${PW}@localhost:5432/bagban|" .env
  sed -i "s|^OBJECT_STORAGE_ROOT=.*|OBJECT_STORAGE_ROOT=/srv/storage|" .env
  echo "    generated .env with fresh secrets (edit EARTHDATA_*/LLM_* later)"
else
  echo "    .env exists — leaving as-is"
fi
set -a; . ./.env; set +a

echo "==> 2/5 database up"
$COMPOSE up -d db
echo -n "    waiting for Postgres"
for _ in $(seq 1 30); do
  if $COMPOSE exec -T db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then break; fi
  echo -n "."; sleep 2
done; echo " ok"

echo "==> 3/5 migrations + seeds (via tools container)"
$COMPOSE --profile tools run --rm tools \
  "apt-get update -qq && apt-get install -y -qq postgresql-client >/dev/null \
   && pip install -q 'psycopg[binary]' \
   && chmod +x db/migrate.sh && ./db/migrate.sh \
   && python db/seeds/load_seeds.py"

echo "==> 4/5 build + start api + web"
$COMPOSE up -d --build api web

echo "==> 5/5 done"
$COMPOSE ps
cat <<'EOF'

Next steps (host nginx + TLS), once DNS points agradex.com at this server:
  sudo cp deploy/nginx-agradex.conf /etc/nginx/sites-available/agradex.com
  sudo ln -sf /etc/nginx/sites-available/agradex.com /etc/nginx/sites-enabled/agradex.com
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d agradex.com -d www.agradex.com

Local checks:
  curl -s http://127.0.0.1:8000/api/health   # {"status":"ok",...}
  curl -sI http://127.0.0.1:3000             # 200 (Next.js)

Satellite pipeline (optional, needs Earthdata ~/.netrc):
  add EARTHDATA_USERNAME/PASSWORD to .env, then run the geo worker per services/geo_pipeline/README.md
EOF
