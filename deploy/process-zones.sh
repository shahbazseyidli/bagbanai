#!/usr/bin/env bash
# Drain the productivity-zone queue (HYBRID_PLAN W8 / A6). The API only INSERTs a
# public.field_zone_runs row with status='queued' (it cannot import rasterio); the real
# multi-season raster maths runs here, in the geo image.
#
# Cron (offset from the HLS/S2/research runs), every ~5 min:
#   */5 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-zones.lock bash deploy/process-zones.sh >> /var/log/bagban-zones.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

# Cap runs per tick: each run stacks up to ~90 windowed COG reads, so keep the tick bounded.
MAX="${1:-2}"

# Stale recovery FIRST: a container that died mid-run leaves status='running' forever, and the
# UI disables "recompute" while a run is running — a crash would otherwise be a permanent dead end.
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "update public.field_zone_runs set status='queued', message='bərpa edildi (donmuş iş)'
   where status='running' and computed_at < now() - interval '1 hour'" >/dev/null || true

ids=$($COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select id from public.field_zone_runs where status='queued' order by computed_at limit ${MAX}")
if [ -z "$ids" ]; then exit 0; fi

for id in $ids; do
  echo "==> [$(date -u +%FT%TZ)] computing zone run $id"
  # Claim the row before handing it to the worker, so a slow run is never picked up twice by the
  # next cron tick (zones.py also sets running/ready/failed itself and is safe to re-enter).
  $COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "update public.field_zone_runs set status='running' where id='${id}' and status='queued'" >/dev/null
  if ! $COMPOSE --profile geo run --rm geo python -m geo_pipeline.zones "$id"; then
    echo "  ! zone run $id failed, marking failed and continuing"
    # zones.py sets 'failed' itself on a handled error, but a hard crash (OOM) leaves 'running'.
    $COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
      "update public.field_zone_runs set status='failed', message='hesablama dayandı'
       where id='${id}' and status='running'" >/dev/null || true
  fi
done
echo "zone queue drained."
