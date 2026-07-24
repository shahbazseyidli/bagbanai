#!/usr/bin/env bash
# Drain public.field_backfill_jobs (HYBRID_PLAN W7, A8) — retrospective ingest of past seasons.
# Modelled on deploy/process-queue.sh, but the unit of work is ONE CALENDAR YEAR of one job:
# the scene search caps at ~200 granules, so a decade asked for in one call is silently
# truncated. One year per `docker compose run` also keeps memory bounded and makes progress
# resumable (years_done is written after every year).
#
# The backfill is silent: it fires NO advice/rules, sends NO notifications and never touches
# fields.data_status — the "Peyk məlumatı hazırlanır" banner belongs to process-queue.sh and must
# not lie. It is stats-only UNLESS the job carries zone_index (e.g. 'NDVI'), in which case it also
# writes peak-season per-pixel COGs for that one index — productivity zones (A6) read only
# public.index_rasters, so without that opt-in a backfill could never unblock them.
#
# Cron (offset from the other workers), every ~5 min:
#   */5 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-backfill.lock bash deploy/process-backfill.sh >> /var/log/bagban-backfill.log 2>&1
#
# Env knobs:
#   MAX_YEARS=0     years per run (0 = finish the claimed job; >0 = pause and resume next tick)
#   STALE_HOURS=3   a 'running' job untouched for this long is assumed dead → re-queued
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

MAX_YEARS="${MAX_YEARS:-0}"
STALE_HOURS="${STALE_HOURS:-3}"

# Second guard on top of the cron flock (a manual run must not race the cron one): one
# backfill at a time, full stop. A year can take minutes, a job can take an hour.
# NOTE the different lock FILE from the cron line above — flock locks the open file
# description, so re-locking the cron's own file from inside would always fail.
exec 200>/tmp/bagban-backfill.run.lock
flock -n 200 || { echo "[$(date -u +%FT%TZ)] another backfill run holds the lock, skipping"; exit 0; }

# All SQL here is built from values that came out of this same table (uuids/ints) plus literal
# Azerbaijani status text — no user input is interpolated.
psqlq() {
  $COMPOSE exec -T -e PGCLIENTENCODING=UTF8 db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q -tAc "$1"
}

# 1) Recover jobs whose worker died mid-flight (container OOM, host reboot). years_done is
#    preserved, so the retry resumes instead of restarting from scratch.
psqlq "update public.field_backfill_jobs
         set status='queued', message='Yarımçıq qaldı - yenidən növbəyə alındı'
       where status='running' and updated_at < now() - interval '${STALE_HOURS} hours'" >/dev/null

# 2) Claim exactly one queued job. FOR UPDATE SKIP LOCKED + the single-writer lock above mean
#    two workers can never take the same job.
claim=$(psqlq "update public.field_backfill_jobs j
                 set status='running', message='Emal başladı'
               where j.id = (select id from public.field_backfill_jobs
                             where status='queued' order by created_at limit 1
                             for update skip locked)
               returning j.id||'|'||j.field_id||'|'||j.year_from||'|'||j.year_to||'|'||
                         coalesce(j.sensor,'hls')||'|'||j.years_done||'|'||j.scenes_written||'|'||coalesce(j.zone_index,'')")
claim=$(printf '%s' "$claim" | tr -d '[:space:]')
# An empty result may surface as psql's command tag (e.g. "UPDATE0") rather than an empty string;
# a real claim is always pipe-delimited. Treat anything else as "nothing to do", not as an error —
# this runs every 5 minutes and must stay silent when the queue is empty.
case "$claim" in *"|"*) ;; *) claim="";; esac
if [ -z "$claim" ]; then echo "[$(date -u +%FT%TZ)] no queued backfill jobs"; exit 0; fi

IFS='|' read -r job_id field_id y_from y_to sensor years_done scenes_written zone_index <<< "$claim"
# Only NDVI is currently zonable; anything else is treated as stats-only.
case "$zone_index" in NDVI) ;; *) zone_index="";; esac
case "$years_done"     in ''|*[!0-9]*) years_done=0;;     esac
case "$scenes_written" in ''|*[!0-9]*) scenes_written=0;; esac
# Defensive: a malformed claim string must not turn into broken arithmetic below.
case "${y_from}${y_to}" in ''|*[!0-9]*)
  echo "  ! unparsable claim '$claim' — leaving the job alone"; exit 1;; esac
if [ -z "$job_id" ] || [ -z "$field_id" ]; then
  echo "  ! empty job/field id in claim '$claim'"; exit 1
fi
case "$sensor" in hls|s2|all) ;; *) sensor="hls";; esac
total=$(( y_to - y_from + 1 ))
if [ "$total" -lt 1 ]; then
  psqlq "update public.field_backfill_jobs
           set status='failed', message='Yanlış il aralığı'
         where id='${job_id}'" >/dev/null
  echo "  ! job $job_id has an invalid year range (${y_from}..${y_to})"; exit 1
fi

echo "==> [$(date -u +%FT%TZ)] backfill job $job_id field=$field_id ${y_from}..${y_to} " \
     "sensor=$sensor resume_at=$years_done/$total"

processed=0
ok_years=0
failed=0
i="$years_done"

while [ "$i" -lt "$total" ]; do
  if [ "$MAX_YEARS" -gt 0 ] && [ "$processed" -ge "$MAX_YEARS" ]; then
    echo "  · MAX_YEARS=$MAX_YEARS reached — pausing, next tick resumes"
    break
  fi
  # Newest year first (matches run_field_backfill): the recent seasons are the ones the
  # season-compare UI needs, so an interrupted job still leaves the useful end in place.
  year=$(( y_to - i ))
  psqlq "update public.field_backfill_jobs
           set message='${year} ili emal olunur...'
         where id='${job_id}'" >/dev/null

  rc=0
  out=$($COMPOSE --profile geo run --rm geo \
          python -m geo_pipeline.pipeline backfill "$field_id" "$year" "$year" "$sensor" "$zone_index" 2>&1) || rc=$?
  printf '%s\n' "$out"

  # `set -e` + a grep that matches nothing would abort the whole worker here, leaving the job
  # stuck in status='running' and making the "year failed — continuing" branch below unreachable.
  # `|| true` keeps a missing marker a normal (n=0) outcome.
  n=$(printf '%s\n' "$out" | grep -o 'BACKFILL_RESULT .*' | tail -1 \
        | sed -E 's/.*"scenes_written": *([0-9]+).*/\1/' || true)
  case "$n" in ''|*[!0-9]*) n=0;; esac

  if [ "$rc" -ne 0 ]; then
    failed=$(( failed + 1 ))
    echo "  ! year $year failed (rc=$rc) — continuing with the remaining years"
  else
    ok_years=$(( ok_years + 1 ))
  fi

  scenes_written=$(( scenes_written + n ))
  i=$(( i + 1 ))
  processed=$(( processed + 1 ))
  # Progress is committed after every year → a crash costs at most one year of work.
  psqlq "update public.field_backfill_jobs
           set years_done=${i}, years_total=${total}, scenes_written=${scenes_written},
               message='${total} ildən ${i} tamamlandı - ${scenes_written} səhnə'
         where id='${job_id}'" >/dev/null
done

if [ "$i" -ge "$total" ]; then
  if [ "$failed" -gt 0 ] && [ "$ok_years" -eq 0 ]; then
    psqlq "update public.field_backfill_jobs
             set status='failed', message='Bütün illər uğursuz oldu (${failed})'
           where id='${job_id}'" >/dev/null
    echo "<== job $job_id FAILED (${failed} year(s))"
  elif [ "$failed" -gt 0 ]; then
    psqlq "update public.field_backfill_jobs
             set status='done',
                 message='Tamamlandı - ${scenes_written} səhnə (${failed} il uğursuz)'
           where id='${job_id}'" >/dev/null
    echo "<== job $job_id done with ${failed} failed year(s), ${scenes_written} scene(s)"
  else
    psqlq "update public.field_backfill_jobs
             set status='done', message='Tamamlandı - ${total} il, ${scenes_written} səhnə'
           where id='${job_id}'" >/dev/null
    echo "<== job $job_id done: ${total} year(s), ${scenes_written} scene(s)"
  fi
else
  # Paused by MAX_YEARS → back to 'queued' so the next tick resumes at years_done.
  psqlq "update public.field_backfill_jobs
           set status='queued', message='Davam edir - ${i}/${total} il'
         where id='${job_id}'" >/dev/null
  echo "<== job $job_id paused at ${i}/${total}"
fi
