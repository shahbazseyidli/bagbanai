#!/usr/bin/env bash
# Silent Sentinel-2 (10m) refresh for every field — the S2 companion to run-hls.sh.
# Doubles as the one-time backfill of existing fields: `bash deploy/run-s2.sh 60`.
# track=0 → writes new S2 scenes/rasters but keeps data_status='ready' and does not re-notify;
# never touches HLS rows (sensor='s2'). Add to cron offset from the HLS run:
#   30 3 * * *  cd /opt/bagbanai && bash deploy/run-s2.sh 30 >> /var/log/bagban-s2.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
DAYS="${1:-120}"

ids=$($COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select id from public.fields")
if [ -z "$ids" ]; then echo "no fields yet — nothing to process"; exit 0; fi

total=0; failed=0; blind=0; with_granules=0; written_total=0
for id in $ids; do
  total=$((total + 1))
  echo "==> S2 pipeline for field $id (days_back=$DAYS)"
  # 4th arg 's2' → run_field_s2; track=0 → silent refresh (idempotent upserts, skip-if-exists COGs).
  out=$($COMPOSE --profile geo run --rm geo python -m geo_pipeline.pipeline "$id" "$DAYS" 0 s2 2>&1) && rc=0 || rc=$?
  printf '%s\n' "$out"
  if [ "$rc" -ne 0 ]; then
    failed=$((failed + 1))
    echo "  ! field $id S2 failed, continuing"
    continue
  fi
  # A zero exit is not proof that anything was written — see the RUN_RESULT comment in
  # geo_pipeline/pipeline.py. Parse the counts the same way process-backfill.sh does.
  line=$(printf '%s\n' "$out" | grep -o 'RUN_RESULT .*' | tail -1 || true)
  g=$(printf '%s' "$line" | sed -E 's/.*"granules_found": *([0-9]+).*/\1/'); case "$g" in ''|*[!0-9]*) g=0;; esac
  w=$(printf '%s' "$line" | sed -E 's/.*"scenes_written": *([0-9]+).*/\1/'); case "$w" in ''|*[!0-9]*) w=0;; esac
  written_total=$((written_total + w))
  if [ "$g" -gt 0 ]; then
    with_granules=$((with_granules + 1))
    if [ "$w" -eq 0 ]; then
      blind=$((blind + 1))
      echo "  ~ field $id: $g granule(s) found, 0 written"
    fi
  fi
done

# FAIL LOUDLY. Every field OOM-died here for days while this script kept printing "S2 run
# complete." and exiting 0 — a green log over a refresh that wrote nothing. A non-zero exit is
# what makes cron mail root, and the FAILED line is what makes `tail` tell the truth.
if [ "$failed" -gt 0 ]; then
  echo "S2 run FAILED for $failed/$total field(s)."
  exit 1
fi

# BLIND RUN = granules were there and not one of them produced a scene, for EVERY field that had
# any. That is not weather: cloud is never uniform across fields in different MGRS tiles on the
# same night. It is the signature of a broken read — an expired EARTHDATA_TOKEN makes GDAL fetch a
# 401 HTML page instead of a GeoTIFF, which it reports as "not recognized as being in a supported
# file format", per granule, swallowed. HLS ran this way from 2026-08-30 to 2026-10-08 and the log
# said "21/21 field(s) OK." every night.
if [ "$with_granules" -gt 0 ] && [ "$written_total" -eq 0 ]; then
  echo "S2 run WROTE NOTHING — $with_granules field(s) found granules, 0 scene(s) written."
  echo "  Check credentials first: an expired token fails every COG read and nothing else."
  exit 1
fi
if [ "$blind" -gt 0 ]; then
  echo "S2 run complete — $total/$total field(s) OK, $written_total scene(s) written" \
       "($blind of $with_granules field(s) found granules but kept none — cloud, most likely)."
else
  echo "S2 run complete — $total/$total field(s) OK, $written_total scene(s) written."
fi
