#!/usr/bin/env bash
# Apply ordered SQL migrations idempotently. Tracks applied files in schema_migrations.
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/db ./db/migrate.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${DATABASE_URL:?set DATABASE_URL}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
  "create table if not exists public.schema_migrations (filename text primary key, applied_at timestamptz not null default now());"

for f in "$DIR"/migrations/*.sql; do
  name="$(basename "$f")"
  applied="$(psql "$DATABASE_URL" -tAc "select 1 from public.schema_migrations where filename='$name'")"
  if [ "$applied" = "1" ]; then
    echo "skip   $name"
    continue
  fi
  echo "apply  $name"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 -f "$f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "insert into public.schema_migrations(filename) values ('$name');"
done
echo "migrations up to date."
