# Agradex (Bağban AI) — Operations Runbook

Operational reference for running, deploying, and troubleshooting the **Agradex** platform — a
satellite (NASA HLS + Sentinel-2) + weather (Open-Meteo) + AI crop-monitoring platform. Two public
hosts: **agradex.com** (marketing apex) and **app.agradex.com** (the app; panel split is ACTIVE —
see §16). Infra identifiers keep the old name on purpose (`/opt/bagbanai`, the repo, the
`bagban-*` log/lock names).

This document is the "how do I operate the live system" companion to the spec files
(`docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md`; `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md`
documents the subsidy calculator, which was **removed from the product** in v1.12.0 — the 0008
`subsidy_*` tables stay dormant, not dropped) and to `CLAUDE.md` (working context/decisions). The
repo is the source of truth; everything here was grounded against the actual scripts in `deploy/`,
`db/`, and the compose file. Last grounded against the tree at commit `84e5f28` (2026-07-26).

> UI text ships in 8 locales (`az` default, then `en/ru/tr/de/hu/it/pl`); code, SQL, identifiers, and
> commit messages are English. This runbook is in English because it is operator/developer
> documentation; the dated appendices (§14-§17) are in Azerbaijani, as written.

---

## 1. Server & access facts

| Fact | Value |
|------|-------|
| Hetzner server name | `bagban-ai` |
| Type / location | CPX22, Helsinki |
| Hetzner project | AGRADEX-TEST |
| Public IPv4 | `95.216.208.82` (Primary IP — kept across server recreate) |
| App root on server | `/opt/bagbanai` (a **git checkout** tracking `origin/main`) |
| Domains | `agradex.com` + `www` (marketing) and **`app.agradex.com`** (the app — panel split active, §16) |
| DNS | Cloudflare, A `@` and A `www` → `95.216.208.82`, **proxied**. `app.agradex.com` also resolves to this host (§16 records that DNS/nginx/SSL already covered it) — verify the exact record type in the CF dashboard before changing it |

**SSH access.** The operator's Mac key (`~/.ssh/id_ed25519`, comment `macbookpro`) is authorized on
`root@95.216.208.82` (added early via `deploy/cloud-init.sh`). Connect with:

```bash
ssh root@95.216.208.82
cd /opt/bagbanai
```

**Why `/opt/bagbanai` is a git checkout.** The GitHub repo `shahbazseyidli/bagbanai` is public, so the
server can `git pull` directly instead of the old rsync-then-bootstrap flow used while the repo was
private. `git config --global --add safe.directory /opt/bagbanai` is set so root can operate the checkout.

**Git remote note (important).** The local dev remote `origin` is the **SSH** URL
`git@github.com:shahbazseyidli/bagbanai.git`. HTTPS push was hanging; SSH works. If you ever see a push
hang, confirm the remote is SSH (`git remote -v`) rather than switching networks.

**Do not confuse the two projects.** Bağban AI lives in `~/Desktop/bagbanai` (repo `shahbazseyidli/bagbanai`).
This is **separate** from findix.az, which lives in `~/Desktop/agradex` (repo `shahbazseyidli/findix`,
the hazelnut-mill site). Different folders, different repos, different servers.

---

## 2. Deploy / redeploy procedure

Redeploy is one command on the server, driven by `deploy/update.sh`:

```bash
cd /opt/bagbanai && bash deploy/update.sh
```

### What `deploy/update.sh` does, step by step

1. `cd` to repo root (resolved from the script location).
2. `git pull --ff-only origin main` — fast-forward only, so a diverged/dirty checkout fails loudly
   instead of producing a surprise merge.
3. **`set -a; . ./.env; set +a`** — sources `.env` into the environment. **This is mandatory.**
4. `docker compose -f deploy/docker-compose.prod.yml up -d --build api web titiler` — rebuilds and
   restarts exactly those three containers. `db` and `geoapi` keep running untouched (they are not
   named); `geo`/`tools`/`n8n` are profile-gated and never start here.
5. `nginx -t && systemctl reload nginx` (best-effort) — validates and reloads the host nginx vhost.
6. Prints `redeploy complete @ <short-sha>`.

### What `update.sh` does NOT do

It does **not** run `db/migrate.sh` or any SQL, does **not** run `db/seeds/load_seeds.py`, and does
**not** rebuild `geo`, `geoapi`, `db`, `n8n` or `tools`. Migrations are always a **separate, manual,
human-ordered step** (§6) — nothing in the deploy path applies them, so a release that needs a new
column must have that column applied first. `geo`/`geoapi` mount `services/geo_pipeline` live: a code
change needs only `docker restart deploy-geoapi-1`; a new Python dependency needs
`docker compose -f deploy/docker-compose.prod.yml build geoapi && ... up -d geoapi`.

### Why it MUST source `.env`

The compose file substitutes `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}` into the
`DATABASE_URL` for the `api` (and `geo`/`tools`) services:

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

If `.env` is **not** sourced first, those variables are empty and the api container starts with a
**blank `DATABASE_URL`** → asyncpg falls back to connecting as OS user `root` → **crash-loop** → the
whole site 502s. `update.sh`, `run-hls.sh`, `process-queue.sh`, `lifecycle-emails.sh` and
`bootstrap.sh` all source `.env` for exactly this reason. Never run the raw `docker compose ... up`
by hand without first doing `set -a; . ./.env; set +a` — and note that even `up -d --build web`
recreates the `api` container (config-hash change), so it breaks the api too.

### A failed build does NOT touch production — read the exit status, not the site

`update.sh` is `set -euo pipefail` (line 5) and does a **single** `up -d --build api web titiler`
(line 12). So if the `web` (or `api`) image fails to build, the script exits non-zero **before any
container is replaced** and production keeps serving the **previous** image. That is the safe
behaviour, and it is exactly why a redeploy must never be judged by loading the site:

> A green-looking site is **not** evidence the deploy landed. The proof is the last line,
> `redeploy complete @ <short-sha>`, and `$?` = 0. If that line is missing, nothing shipped.

**Getting the real error out of the build log.** The `update.sh` tail typically only shows
`exit code 1`. Re-run the build alone and grep for the compiler message:

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml build web 2>&1 | grep -A 12 "Type error"
# nothing matched? widen it:
docker compose -f deploy/docker-compose.prod.yml build web 2>&1 | tail -60
```

**Why this matters more than it should: the operator's Mac has no Node.** There is no `node`, `npx`,
`nvm`, `volta` or `fnm` on the dev machine (only `app/node_modules/.bin/tsc`, which cannot run
without node), so `npx tsc --noEmit` does not exist locally. The **`docker compose build web` on this
server is the only TypeScript check in the entire workflow**, and every type error therefore costs a
full push + rebuild cycle (~2-4 min). Two commits in the 2026-07-26 range (`2a0b00d`, `8c38e8b`)
were caught here and nowhere else. Frontend work is pushed knowing this — e.g. `03620b1` says
plainly "Build gate not yet run — pushing so the server can compile it."

### Typical full redeploy from a laptop

```bash
# on your Mac, in ~/Desktop/bagbanai
git push origin main            # SSH remote

# on the server
ssh root@95.216.208.82
cd /opt/bagbanai && bash deploy/update.sh
```

### First-time / fresh-host bootstrap

For a brand-new Hetzner host use `deploy/bootstrap.sh` (idempotent — safe to re-run):

```bash
cd /opt/bagbanai && bash deploy/bootstrap.sh
```

It: (1) creates `.env` from `.env.example` with freshly generated `POSTGRES_PASSWORD`, `JWT_SECRET`,
`INTERNAL_API_TOKEN` if `.env` is absent; (2) starts `db` and waits for `pg_isready`; (3) runs
migrations + seeds via the `tools` profile container; (4) builds and starts `api` + `web`; (5) prints
next steps for nginx + certbot. After bootstrap you still edit `.env` to add `EARTHDATA_TOKEN`, the
`LLM_*` keys, `RESEND_API_KEY` + `EMAIL_FROM`, and `NEXT_PUBLIC_PANEL_HOST` + `COOKIE_DOMAIN` if the
new host is also serving the app subdomain.

---

## 3. Secrets & `.env` reference

Secrets live in **`/opt/bagbanai/.env`** (never committed). A backup copy is kept at
**`/root/agradex.env.bak`** — update the backup whenever you change `.env`.

| Key | Purpose | State |
|-----|---------|-------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials; substituted into `DATABASE_URL` in compose | set |
| `DATABASE_URL` | Local/dev connection string inherited from `.env.example` (`…@localhost:5432/…`). **Every container overrides it** with the compose-synthesized `…@db:5432/…`, and the `db` service publishes no host port — so this value is unusable from the host (why `db/migrate.sh` fails there, §6) | set |
| `JWT_SECRET` | Signs the httpOnly auth-cookie JWT (own auth, `security.py`) | set |
| `INTERNAL_API_TOKEN` | `X-Internal-Token` for internal endpoints (e.g. geo pipeline → `/api/internal/advice/run`) | set |
| `EARTHDATA_TOKEN` | NASA Earthdata Login **bearer** token; set on GDAL as `Authorization: Bearer` for `/vsicurl` COG reads | set — **EXPIRES 2026-08-30** |
| `LLM_PROVIDER` | AI provider (`anthropic`) | set |
| `LLM_MODEL` | Default/fallback model id (`claude-opus-4-8`); per-tier selection happens in `services/app/tiers.py` | set |
| `LLM_API_KEY` | Claude API key (`sk-ant-...`) | set — **AI ACTIVE since 2026-07-16**; ⚠️ **rotate** (the value was exposed once) |
| `RESEND_API_KEY` | Resend API key — the only outbound email transport | set — **EMAIL ACTIVE since 2026-07-25** |
| `EMAIL_FROM` | Default sender, e.g. `"Agradex <no-reply@agradex.com>"` — **must be quoted** (§17) | set |
| `NEXT_PUBLIC_PANEL_HOST` | `app.agradex.com` — activates the marketing/app host split (build arg for `web`, read by middleware) | set (§16) |
| `COOKIE_DOMAIN` | `.agradex.com` — shares the auth + locale cookies across apex and app host | set (§16) |
| `SEARCH_PROVIDER` | `anthropic` (web_search tool, knowledge research) | set |
| `NOMINATIM_BASE` | Geocoding base (default public OSM) | set |
| `EPPO_TOKEN` | `data.eppo.int` pest API | **empty** — pest block degrades to `eppo_no_token`. ⚠️ the EPPO API closes **2026-09-01** |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` / `TELEGRAM_WEBHOOK_SECRET` | Alert bot (code ready, dormant) | **empty** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | **Legacy** direct-SMTP fallback in `ai/notify.py`; superseded by Resend | **empty — leave empty** |
| `OBJECT_STORAGE_ROOT` / `OBJECT_STORAGE_*` | Local-volume storage root for uploaded photos | set (`/srv/storage`) |

> **The 2026-07-26 release introduced no new environment variables.** Everything in that range
> (migrations 0046-0049, Russian as the 8th locale, area units, the weekly digest) runs on the keys
> already listed — the deploy was migrations + image rebuild, no `.env` edit. The Russian locale adds
> one hard-coded sender persona (`ai/notify.py` `SENDERS["ru"]`), not a secret; it uses the same
> verified `agradex.com` Resend domain as the other seven.

**Passwords are never stored in files.** User account passwords (e.g. owner `seyidlimirshahbaz@gmail.com`,
demo `demo@agradex.com`) are bcrypt hashes in `public.users`. To reset a password, generate a fresh
bcrypt hash inside the api container and `UPDATE public.users SET password_hash=... WHERE email=...`.

### Rotating / replacing the LLM key (the AI is already live)

AI advice + chat have been **active since 2026-07-16** (`anthropic` / `claude-opus-4-8`). The
no-key degradation still exists in code (advice returns `configured:false`/null; `generate`/`chat`
return `503`), so seeing `503` today means the key was removed, revoked or mistyped — not that the
feature is unfinished. To rotate:

```bash
ssh root@95.216.208.82
cd /opt/bagbanai
nano .env                     # replace LLM_API_KEY=sk-ant-...

# restart only the api (it holds the LLM key and does all generation,
# including the advice the geo pipeline triggers after each new scene)
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml up -d api

# update the secrets backup
cp .env /root/agradex.env.bak
```

Verify: `GET /api/fields/{id}/advice` returns `configured:true`, and `POST .../advice/generate`
produces structured advice. Note a spent monthly quota is now a **429 `advice_quota_exceeded`**, not
a 503 and not a silent 200 (§11).

### Email (Resend) — already live

Email is **live since 2026-07-25** via **Resend**, not SMTP. The `SMTP_*` variables are a legacy
fallback in `ai/notify.py` and must stay empty. Full detail — provider, per-locale sender personas,
the single weekly digest, unsubscribe, manual drain — is in **§15**.

### Regenerating the Earthdata token (before 2026-08-30)

The `EARTHDATA_TOKEN` is an EDL bearer token that expires **2026-08-30**. When it expires, HLS COG reads
start returning 401 and the pipeline fails. Regenerate at https://urs.earthdata.nasa.gov (user profile →
Generate Token), then update `EARTHDATA_TOKEN=` in `.env`, refresh `/root/agradex.env.bak`, and re-run a
pipeline job to confirm. Username/password auth does **not** work here (returns 401) — the bearer token
is required.

---

## 4. Crons (root crontab)

**Ten jobs** run from the **root crontab** on `bagban-ai` (with `PATH` set so `docker`/`bash`
resolve). This is the full inventory — the "two jobs" this section used to claim was three sprints
out of date:

```cron
# ── satellite / weather ingestion ──────────────────────────────────────────────
# Daily silent HLS refresh (track=0): pulls new scenes/rasters, does NOT reset data_status or re-notify
0 3 * * *   cd /opt/bagbanai && bash deploy/run-hls.sh 30 >> /var/log/bagban-hls.log 2>&1
# Daily Sentinel-2 refresh (track=0, includes NDRE/CIre)
30 3 * * *  cd /opt/bagbanai && bash deploy/run-s2.sh 30 >> /var/log/bagban-s2.log 2>&1
# Daily weather: Open-Meteo → weather_cache + water_requirements + spray_window (internal /weather/drain)
45 3 * * *  cd /opt/bagbanai && bash deploy/run-weather.sh >> /var/log/bagban-weather.log 2>&1

# ── queues (flock: runs never overlap) ────────────────────────────────────────
# Every 2 minutes: process newly-created fields (data_status='queued'), newest scene first
*/2 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-queue.lock bash deploy/process-queue.sh >> /var/log/bagban-queue.log 2>&1
# Every 3 minutes: knowledge research queue (research_jobs → internal /research/drain)
*/3 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-research.lock bash deploy/process-research.sh >> /var/log/bagban-research.log 2>&1
# Every 5 minutes: A8 retrospective backfill queue (field_backfill_jobs)
*/5 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-backfill.lock bash deploy/process-backfill.sh >> /var/log/bagban-backfill.log 2>&1
# Every 5 minutes: A6 productivity-zone queue (field_zone_runs)
*/5 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-zones.lock bash deploy/process-zones.sh >> /var/log/bagban-zones.log 2>&1

# ── monthly ──────────────────────────────────────────────────────────────────
# 1st of the month: T17 seasonal research auto-enqueue (crops with missing/stale index_norms)
17 4 1 * *  cd /opt/bagbanai && flock -n /tmp/bagban-seasonal.lock bash deploy/enqueue-research-seasonal.sh >> /var/log/bagban-seasonal.log 2>&1
# 2nd of the month: T16 field_season_features computation (internal /season/compute)
40 4 2 * *  cd /opt/bagbanai && flock -n /tmp/bagban-season.lock bash deploy/compute-season-features.sh >> /var/log/bagban-season.log 2>&1

# ── email: the ONE recurring message (E15) ───────────────────────────────────
# Wednesday 03:00 UTC = 07:00 Asia/Baku — the weekly digest, one per user per ISO week
0 3 * * 3   cd /opt/bagbanai && bash deploy/lifecycle-emails.sh >> /var/log/bagban-lifecycle.log 2>&1
```

### The weekly digest cron — changed 2026-07-26 (E15)

`deploy/lifecycle-emails.sh` previously ran **daily** at `15 6 * * *` and drained nine behavioural
email rules. It now runs **weekly, Wednesday 03:00 UTC = 07:00 Asia/Baku** (Azerbaijan is UTC+4 with
no DST) and sends **one** adaptive digest per user. The script body is unchanged — it still POSTs
`/api/internal/emails/lifecycle/drain` with `X-Internal-Token` — only the schedule and the endpoint's
behaviour changed. See §15 for what the digest contains.

> ⚠️ **A shell script cannot change root's crontab.** `deploy/lifecycle-emails.sh:11` only
> *documents* the new line. Whether the live crontab on `95.216.208.82` was actually edited from
> `15 6 * * *` to `0 3 * * 3` is **not verifiable from this repo** — check it by hand:
>
> ```bash
> crontab -l | grep lifecycle-emails
> ```
>
> If it still reads `15 6 * * *`, no duplicate mail goes out (the send ledger dedups on the ISO week,
> `to_char(now(), 'IYYY-"W"IW')`, so runs 2-7 of the week are no-ops), but the digest lands on
> whatever weekday the old schedule fires instead of Wednesday morning. Fix with `crontab -e`.

**Daily HLS refresh — `deploy/run-hls.sh 30`.** Loops over **every** field id in `public.fields` and runs
the geo pipeline with `days_back=30`, **`track=0`**. `track=0` means a *silent refresh*: it writes any new
scenes and clipped rasters but keeps `data_status='ready'` and does **not** re-send the "data ready"
notification. Default `days_back` is 120 if you omit the argument. Failures per-field are logged and the
loop continues.

**Queue worker — `deploy/process-queue.sh`.** Runs every 2 minutes under `flock` (so runs never overlap).
It selects up to 5 fields with `data_status='queued'` ordered by `created_at`, and runs the geo pipeline
with `days_back=60`, **`track=1`**. `track=1` is the *tracked/interactive* run: it processes newest scene
first, updates `data_progress_done/total`, `data_eta_seconds`, `data_message`, flips `data_status` to
`processing` → `ready` (or `failed`), and posts the "Peyk məlumatı hazırdır" notification. The 60-day
initial window keeps first render fast; the daily cron later extends history.

**No other cron sends email.** The rule engine (frost/heat/wind/NDVI-drop/pest alerts) keeps its
existing schedule but no longer mails anything — since 2026-07-26 it delivers **in-app
(`public.notifications`) + Telegram only**, and alert content reaches the inbox once a week inside
the digest. If a farmer reports "I stopped getting alert emails", that is the design, not a fault
(§15).

To edit the crontab: `crontab -e`. To confirm they exist: `crontab -l`.

---

## 5. Running the HLS pipeline manually

The pipeline runs in the `geo` profile container (built from `services/Dockerfile.geo`, mounts
`services/geo_pipeline` read-only for live code and `./data/rasters` read-write for the clipped COGs).

**Direct invocation** (positional args: `<field_id> <days_back> <track>`):

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml --profile geo run --rm geo \
  python -m geo_pipeline.pipeline <field_id> <days_back> <track>
```

- `track=0` → silent refresh (no status reset, no notification) — what the daily cron uses.
- `track=1` → tracked run (updates progress/ETA/status, posts notification) — what the queue worker uses.

Example (reprocess the reference field for 90 days, tracked):

```bash
docker compose -f deploy/docker-compose.prod.yml --profile geo run --rm geo \
  python -m geo_pipeline.pipeline 860891bd-912c-4ec3-9235-b7d4d0193190 90 1
```

**All fields at once** (what the daily cron calls):

```bash
bash deploy/run-hls.sh 120     # days_back=120, track=0 for every field
```

**Force-requeue a field** (make the every-2-min worker pick it up):

```bash
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "update public.fields set data_status='queued' where id='<field_id>';"
```

**What the pipeline does (spec §10).** Search `HLSS30_VI`/`HLSL30_VI` via earthaccess/pystac → windowed
COG read → Fmask cloud/shadow mask → zonal stats for 9 indices
(NDVI/EVI/SAVI/MSAVI/NDMI/NDWI/NBR/NBR2/TVI) into `public.index_stats` + `public.scenes`, and writes a
clipped, field-masked index COG per scene+index to `/data/rasters` (recorded in `public.index_rasters`,
column `storage_path`) for TiTiler. After a new scene, a tracked run also calls
`POST /api/internal/advice/run` so the api regenerates AI advice.

> Since 2026-07-26 that internal endpoint resolves the **org owner's `users.locale`** and generates
> the advice in that language (stored in `advice.lang`, migration 0049). It has no HTTP caller to
> take a language from, so the owner — the person the notification and the weekly digest go to — is
> the source. Before this every automatically generated advice was Azerbaijani. Note it still
> reports `{"ok": true}` when the org's monthly AI quota is spent (§11).

**Sentinel-2 is a separate script.** `deploy/run-s2.sh <days_back>` is the S2 equivalent of
`run-hls.sh` (adds NDRE/CIre) and has its own daily cron (§4). Both sensors keep running in the data
layer even though the UI now presents only Sentinel-2 ("Peyk görüntüsü") — HLS still feeds the
regional benchmark, the A8 backfill and the A6 zones, so **do not switch the HLS cron off**.

### Reference fields (for testing)

| Field | id | Note |
|-------|----|------|
| test lecet | `860891bd-912c-4ec3-9235-b7d4d0193190` | fully processed (~962 `index_stats` rows + COGs) — main live test field |
| Findiq sahesi 1 (demo) | `4a08ee8a-4123-4fe5-a07f-ed24c69c5604` | demo hazelnut field |
| Xudat fındıq sahəsi | `8e046b22-cbbf-4e54-b201-7e973d9106b9` | |

Demo login: `demo@agradex.com` / `AgradexDemo2026`.

---

## 6. Database migrations

Migrations are ordered SQL files in `db/migrations/` — the tree currently runs **`0001..0049`**, so
**the next free number is `0050`**. They are tracked in **`public.schema_migrations`** (columns
`filename`, `applied_at`). `db/migrate.sh` is the intended runner, but **it does not work on this
host** — read the next two subsections before touching production.

### `db/migrate.sh` — what it does, and why it fails on `bagban-ai`

What it does: requires `DATABASE_URL` (`: "${DATABASE_URL:?set DATABASE_URL}"`), creates
`public.schema_migrations` if absent, then iterates `db/migrations/*.sql` in filename order — `skip`
if the filename is already recorded, otherwise apply in a single transaction (`-1 -v ON_ERROR_STOP=1`)
and insert the filename.

Why running it **on the host** fails, three independent reasons:

1. **It shells out to `psql`, which is not installed on the host.** That is exactly why the
   `tools`-container recipe below installs `postgresql-client` on every run. Check with
   `command -v psql`.
2. **It hard-requires `DATABASE_URL`**, which production does not usefully provide: compose
   *synthesizes* the DSN per service (`postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`),
   and the value in `.env` is the `localhost` dev string inherited from `.env.example`.
3. **The `db` service publishes no host port.** `deploy/docker-compose.prod.yml` gives `db` no
   `ports:` block at all, so nothing on the host can reach Postgres at `localhost:5432` — a
   `localhost` DSN cannot connect even with `psql` present.

The `tools`-profile route *does* work (it runs inside the compose network with a synthesized
`DATABASE_URL`), and is still the right choice for a fresh database or a long catch-up:

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml --profile tools run --rm tools \
  "apt-get update -qq && apt-get install -y -qq postgresql-client >/dev/null && chmod +x db/migrate.sh && ./db/migrate.sh"
```

You should see `apply 0050_...` then `migrations up to date.`; re-running prints `skip`.

### The procedure that is actually used here (and was used for 0046-0049)

Apply the file straight into the running `db` container, **then record it by hand**:

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a

# 1. apply the SQL (pipe the file in; -T = no TTY, required from cron/ssh)
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f - \
  < db/migrations/0050_description.sql

# 2. record it — NOT optional bookkeeping
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "insert into public.schema_migrations(filename) values ('0050_description.sql');"

# 3. verify
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select filename, applied_at from public.schema_migrations order by filename desc limit 5;"
```

**Why step 2 matters.** The manual insert is the only thing that stops a later `db/migrate.sh` run
(e.g. from the `tools` container, or on a rebuilt host) from re-applying the file. Every migration
should still be written re-runnable — `add column if not exists`, `drop column if exists`,
`drop constraint if exists` before `add constraint`, `create index if not exists`, as 0046-0049 all
are — but do not rely on that instead of recording it.

### ⚠️ Ordering rule: schema first, then the image

**A migration that ADDS a column must be applied BEFORE the api image that reads it.** The api does
not degrade gracefully on an unknown column: an `UndefinedColumn` inside the request transaction is a
**500**, not a fallback. Proof cases from 2026-07-26:

- `0049` adds `advice.lang`; `routers/advice.py` hard-selects `lang` and `ai/advice.py` inserts it →
  without 0049 the field page 500s and every advice generation fails.
- `0046` adds `users.onboarding`; the signup INSERT names it.
- `0048` adds `users.area_unit`; `GET/POST /api/auth/area-unit` reads it.

**One migration has the OPPOSITE constraint: `0047` DROPS `users.email_alerts`.** Its readers (the
rule engine's per-alert emailer and the `/api/auth/email-alerts` endpoints) were deleted in the same
commit that introduced the migration, so the safe order is:

> apply `0046` + `0048` + `0049` → `bash deploy/update.sh` (image swap) → apply `0047`

Applying 0047 while the *previous* image is still serving hard-500s the old
`GET/POST /api/auth/email-alerts` and silently breaks the old `_deliver_email` query. Equally,
rolling the api back past that commit while 0047 is applied resurrects code that reads a dropped
column. There is no value-preserving rollback of the column.

### Migrations applied 2026-07-26 (0046-0049) — all live and recorded

| File | Change | Read by |
|------|--------|---------|
| `0046_user_onboarding.sql` | `users.onboarding jsonb` — landing-quiz answers `{crop, country, region, challenge, needs[], completed_at}` | `signup()`, `GET/POST /api/auth/onboarding` |
| `0047_drop_email_alerts.sql` | **drops** `users.email_alerts`; re-comments `users.email_lifecycle` as the single opt-out for ALL non-transactional email | (nothing — its readers were deleted; see §15) |
| `0048_area_unit.sql` | `users.area_unit text` + `users_area_unit_chk` (allows only NULL / `ha` / `donum` / `sotka`); NULL = derive from `users.country` (TR → donum, else ha). Storage stays hectares — this only changes rendering | `GET/POST /api/auth/area-unit` |
| `0049_advice_lang.sql` | `advice.lang text not null default 'az'` + `advice_field_lang_idx (field_id, lang, generated_at desc)`; the default backfills correctly because existing rows really were Azerbaijani | `GET /api/fields/{id}/advice` (`lang`, `lang_mismatch`), `ai/advice.py` INSERT |

Note `db/migrations/0030_email_alerts.sql` is still in the directory and still adds
`users.email_alerts` — on a fresh database 0030 adds it and 0047 drops it. That is correct; the
sequence is the history. Do not delete 0030.

### Seeds

Seeds live in `db/seeds` (`crop_thresholds.json` + the dormant `subsidy_*_2026.json`) and are loaded
by `python db/seeds/load_seeds.py` (run inside the `tools` container, as `bootstrap.sh` does). Seeds
upsert, so re-running is safe. **After any knowledge-layer migration `load_seeds.py` MUST run** — it
fills `crop_thresholds.index_norms`; without it the M5/E0 calibration falls back to universal
thresholds. The subsidy rows still load but nothing in the product reads them (the calculator was
removed in v1.12.0; the 0008 tables are dormant).

### Notable schema (0009 async-processing columns on `public.fields`)

`data_status` (`none|queued|processing|ready|failed`), `data_progress_done`, `data_progress_total`,
`data_started_at`, `data_ready_at`, `data_eta_seconds`, `data_message` — these drive the "Peyk məlumatı
hazırlanır…" progress UX and are updated by tracked (`track=1`) pipeline runs.

---

## 7. TiTiler & rasters

**What it is.** `ghcr.io/developmentseed/titiler:latest` colorizes and serves the clipped, field-masked
index COGs that the geo pipeline writes to `/data/rasters` (mounted read-only into the titiler container,
read-write into the geo container). It gives the field page a pixel-level colored raster overlay per
field+index — since the E14 restructure that is `components/field/SatelliteTab.tsx` (full section) and
`components/field/overview/SatelliteGlance.tsx` (the small map on the status section); the old
`OverviewTab.tsx` was deleted.

**Port — the classic gotcha.** The TiTiler image **listens on port 80**, not 8000. Compose maps
`127.0.0.1:8001:80`, and nginx proxies `/titiler/` → `http://127.0.0.1:8001/`. If you assume :8000 you get
a 502.

**Tile URL must include the TileMatrixSet id.** The working route is:

```
/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=<cog-path>&colormap_name=rdylgn&rescale=-0.1,0.9
```

The bare `/cog/tiles/{z}/{x}/{y}` route (no `WebMercatorQuad`) **404s**. Colormap and rescale are chosen
per index family (vegetation vs water indices) by `GET /api/fields/{id}/scenes?index=`.

**nginx location** (from `deploy/nginx-agradex.conf`), trailing slash strips the `/titiler/` prefix and
tiles are cached a week (immutable per scene+params):

```nginx
location /titiler/ {
    proxy_pass http://127.0.0.1:8001/;
    proxy_set_header Host $host;
    add_header Cache-Control "public, max-age=604800";
}
```

**New since E15: the weekly digest embeds a TiTiler image, fetched anonymously from the internet.**
`services/app/ai/emails/weekly.py::raster_png_url()` builds
`{app_url()}/titiler/cog/preview.png?url=<storage_path>&colormap_name=rdylgn&rescale=-0.1,0.9&max_size=560`
— the **`/cog/preview.png`** route, *not* the tile route the map uses (an email needs one finished
image, not a tile pyramid). The URL must stay **publicly reachable** because Gmail and friends proxy
images through their own servers; the exposure is the same as a public share link (one field's own
clipped, boundary-masked raster). Operationally this means every Wednesday digest with a lead field
causes anonymous inbox-proxy traffic to `/titiler/` on the **app host**.

> **Unverified from the repo:** `app_url()` resolves to `https://app.agradex.com`, but
> `deploy/nginx-agradex.conf` declares `server_name agradex.com www.agradex.com` only. §16 records
> that the live nginx/SSL already covers `app.agradex.com`; confirm before trusting the first digest:
>
> ```bash
> curl -sI "https://app.agradex.com/titiler/cog/preview.png?url=<storage_path>&max_size=64"
> ```
>
> If it does not resolve, every weekly email ships with a broken `<img>` — the digest is designed to
> survive that (the numbers are repeated as text), but it looks broken.

**Quick health checks:**

```bash
# titiler itself (on the server)
curl -sI http://127.0.0.1:8001/            # image serves on :80 → mapped to 8001
# through nginx / Cloudflare
curl -sI https://agradex.com/titiler/
curl -sI https://app.agradex.com/titiler/  # the host the digest images are fetched from
```

Raster files live under `/opt/bagbanai/data/rasters/` on the host; their DB rows are in
`public.index_rasters` (`storage_path`).

---

## 8. nginx & SSL

**Live vhost:** `/etc/nginx/sites-enabled/agradex.com` (repo copies: `deploy/nginx-agradex.conf` and the
HTTP-only variant `deploy/nginx-agradex-http.conf`). It contains server blocks for `:80` and `:443`. In
each, the three locations are:

- `/titiler/` → `127.0.0.1:8001/`
- `/api/` → `127.0.0.1:8000`
- `/` → `127.0.0.1:3000` (Next.js, with WebSocket upgrade headers)

`client_max_body_size 15m` allows photo uploads (backend caps at 12 MB).

> Live-server note: the running vhost keeps a `:80` block with **no forced redirect** (loop-safe under
> Cloudflare Flexible), unlike the repo copy `deploy/nginx-agradex.conf` which `return 301`s :80 → :443.
> There are harmless `conflicting server_name` warnings from a leftover duplicate block — **cleanup
> pending** (a TODO), not a functional problem.

**Validate + reload after any change:**

```bash
nginx -t && systemctl reload nginx
```

**SSL — Let's Encrypt on the origin.** Cert at `/etc/letsencrypt/live/agradex.com/` (`fullchain.pem`,
`privkey.pem`), auto-renewed by certbot. Manual renew / dry-run:

```bash
certbot renew --dry-run     # test
certbot renew               # force check
```

**Cloudflare.** `@` and `www` are proxied. SSL mode is **Full (Strict)** ✅ (set/verified 2026-07-16) —
CF↔origin is encrypted end-to-end against the origin `:443` Let's Encrypt cert. Caveat: origin LE
HTTP-01 renewal needs `:80` reachable from Let's Encrypt; if you later add a Hetzner firewall
restricting `:80` to Cloudflare IPs, also allow LE ranges or switch the origin to a Cloudflare
Origin CA cert (15-year, no renewal).

---

## 9. Backups

Three things carry state and should be backed up:

1. **Postgres data** — the `pgdata` bind volume at `/opt/bagbanai/pgdata`. Prefer a logical dump over
   copying the directory live:

   ```bash
   cd /opt/bagbanai
   set -a; . ./.env; set +a
   docker compose -f deploy/docker-compose.prod.yml exec -T db \
     pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > /root/bagban-db-$(date -u +%F).sql.gz
   ```

2. **Secrets** — `/opt/bagbanai/.env`, backed up to `/root/agradex.env.bak`. Refresh the backup whenever
   you edit `.env` (`cp /opt/bagbanai/.env /root/agradex.env.bak`).

3. **Rasters** — `/opt/bagbanai/data/rasters/` (clipped index COGs). These are regenerable by re-running
   the pipeline, but re-fetching all HLS scenes is slow, so back them up if you want fast recovery:

   ```bash
   tar czf /root/bagban-rasters-$(date -u +%F).tar.gz -C /opt/bagbanai/data rasters
   ```

Uploaded photos live in the `storage` volume (`/opt/bagbanai/storage`, mounted to `/srv/storage`) — back
that up too if scouting photos matter.

---

## 10. Logs & monitoring

**Container logs** (compose):

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml ps                 # what's up
docker compose -f deploy/docker-compose.prod.yml logs -f api        # follow api
docker compose -f deploy/docker-compose.prod.yml logs --tail=200 web
docker compose -f deploy/docker-compose.prod.yml logs titiler
docker compose -f deploy/docker-compose.prod.yml logs db
```

**Cron logs** (one per job, §4):

- `/var/log/bagban-hls.log` — daily HLS refresh (`run-hls.sh`).
- `/var/log/bagban-s2.log` — daily Sentinel-2 refresh (`run-s2.sh`).
- `/var/log/bagban-weather.log` — daily Open-Meteo drain (`run-weather.sh`).
- `/var/log/bagban-queue.log` — every-2-min queue worker (`process-queue.sh`).
- `/var/log/bagban-research.log` — every-3-min knowledge research queue (`process-research.sh`).
- `/var/log/bagban-backfill.log` — every-5-min A8 backfill queue (`process-backfill.sh`).
- `/var/log/bagban-zones.log` — every-5-min A6 zones queue (`process-zones.sh`).
- `/var/log/bagban-seasonal.log` — monthly T17 research enqueue (`enqueue-research-seasonal.sh`).
- `/var/log/bagban-season.log` — monthly T16 season features (`compute-season-features.sh`).
- `/var/log/bagban-lifecycle.log` — **weekly digest** (`lifecycle-emails.sh`, Wednesdays).

```bash
tail -f /var/log/bagban-queue.log
tail -f /var/log/bagban-hls.log
tail -n 20 /var/log/bagban-lifecycle.log     # one line per run: the drain's JSON result
```

The digest line is the drain's own JSON, e.g.
`{"ok":true,"sent":{"calm":3,"alerts":1},"total":4,"candidates":6,"skipped":2}`. Note `sent` is keyed
by digest **variant** (`calm|alerts|no_crop|no_fields`), not by template id — any monitor still
keyed on the old names (`no_field_d1`, `edu_ndvi`, `trial_ending`, `digest_weekly`) silently reports
zero.

**Health checks:**

```bash
curl -s  http://127.0.0.1:8000/api/health    # {"status":"ok",...}
curl -s  http://127.0.0.1:8000/api/ready     # {"db":true,...}
curl -sI http://127.0.0.1:3000               # 200 (Next.js)
curl -s  https://agradex.com/api/health      # through nginx + Cloudflare
curl -sI https://app.agradex.com/            # the app host (panel split, §16)
```

> The old `curl https://agradex.com/api/subsidy/rates | head # expect 117 rates` check is **gone** —
> `services/app/routers/subsidy.py` was deleted with the calculator (v1.12.0), so that path now 404s
> and would read as a false outage.

**nginx logs:** `/var/log/nginx/access.log`, `/var/log/nginx/error.log`.

---

## 11. Troubleshooting playbook

Concrete failures that have actually occurred, with the fix.

### `deploy/update.sh` exits non-zero — the site still looks fine
**Cause:** the `web` (or `api`) image failed to build. `set -euo pipefail` + the single
`up -d --build api web titiler` mean the script stops **before the container swap**, so production
keeps serving the previous image. Nothing shipped, but nothing broke either.
**Fix:** get the real compiler message (the update.sh tail only shows `exit code 1`):
```bash
cd /opt/bagbanai && set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml build web 2>&1 | grep -A 12 "Type error"
docker compose -f deploy/docker-compose.prod.yml build web 2>&1 | tail -60   # if nothing matched
```
Fix the TypeScript on the Mac, push, re-run `update.sh`. Remember the Mac has **no node**, so this
server build is the only type check that exists (§2) — expect a round-trip per mistake, and check
newly-nullable props at *every* dereference before pushing.

### A schema change deployed, but the field page 500s / signup fails
**Cause:** the migration was not applied before the api image that reads the new column.
`UndefinedColumn` inside a request transaction is a 500, not a graceful fallback.
**Fix:** apply the migration with the `exec -T db psql` procedure in §6, then `docker compose ... up -d api`.
Confirm what is recorded:
```bash
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select filename from public.schema_migrations order by filename desc limit 5;"
```
Reminder: `0047` is the one that goes the other way (drop-column → apply *after/with* the new image).

### api container crash-loops right after deploy → blank `DATABASE_URL`
**Cause:** `.env` was not sourced before `docker compose up`, so `${POSTGRES_*}` substituted to empty and
`DATABASE_URL` is blank.
**Fix:** always deploy via `bash deploy/update.sh` (it sources `.env`). If running compose by hand, first:
```bash
cd /opt/bagbanai && set -a; . ./.env; set +a
```
Confirm with `docker compose ... logs api` (look for a Postgres connection/DSN error).

### TiTiler returns 502 (Bad Gateway)
**Cause:** proxying to the wrong port. The titiler image serves on **:80**, mapped to `127.0.0.1:8001`.
Assuming :8000 gives a 502.
**Fix:** nginx `/titiler/` must point at `127.0.0.1:8001`; verify the compose port map is `127.0.0.1:8001:80`.
Test: `curl -sI http://127.0.0.1:8001/`.

### Raster tiles 404
**Cause:** the tile path is missing the TileMatrixSet id.
**Fix:** use `/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?...`. The bare
`/cog/tiles/{z}/{x}/{y}` route 404s.

### `git push` hangs
**Cause:** HTTPS remote hangs in this environment.
**Fix:** use the SSH remote `git@github.com:shahbazseyidli/bagbanai.git`. Check with `git remote -v`; if
it's HTTPS, `git remote set-url origin git@github.com:shahbazseyidli/bagbanai.git`.

### geo container fails to start / import errors (`libexpat1`, `libgomp1`)
**Cause:** the geo image (`services/Dockerfile.geo`) needs system libs `libexpat1` and `libgomp1` for the
rasterio/GDAL stack.
**Fix:** ensure they're installed in `Dockerfile.geo` and rebuild:
```bash
docker compose -f deploy/docker-compose.prod.yml --profile geo build geo
```

### HLS pipeline fails with 401 / auth errors
**Cause:** expired or wrong `EARTHDATA_TOKEN` (username/password does not work — bearer token required).
The token expires **2026-08-30**.
**Fix:** regenerate at https://urs.earthdata.nasa.gov, update `EARTHDATA_TOKEN` in `.env` (and
`/root/agradex.env.bak`), re-run a pipeline job.

### A new field never leaves "Peyk məlumatı hazırlanır…" (ETA/queue not starting)
**Cause:** the every-2-min queue cron isn't running, or the field never got `data_status='queued'`.
**Fix:** check `crontab -l` for the `process-queue.sh` line and `tail /var/log/bagban-queue.log`. Confirm
`select id,data_status from public.fields where data_status='queued';`. Force it by running the worker once
manually:
```bash
cd /opt/bagbanai && flock -n /tmp/bagban-queue.lock bash deploy/process-queue.sh
```
If the lock file is stale and blocking, remove `/tmp/bagban-queue.lock`.

### AI advice/chat returns 503 or `configured:false`
**Cause:** `LLM_API_KEY` (and `LLM_PROVIDER`/`LLM_MODEL`) are missing from the api container's
environment. The AI has been **live since 2026-07-16**, so this is no longer the expected state — it
means the key was removed, revoked, rotated badly, or `.env` was not sourced.
**Fix:** check `.env`, then restart the api (§3 "Rotating / replacing the LLM key").

### "Regenerate analysis" does nothing → 429 `advice_quota_exceeded`
**Cause:** the org's monthly AI-advice quota is spent. This is a **refusal, not a config problem**:
`services/app/tiers.py` `advice_per_month` = free 1 / pro 8 / business 30, and it used to come back
as a 200 carrying `{"quota_exceeded": true}`, which every caller read as success. It is now a 429
with `detail: "advice_quota_exceeded"` and the UI shows the real reason.
**Fix:** nothing to fix operationally — the quota resets next month, or raise the org's tier in the
admin "Abunələr" tab. Note the internal path (`POST /api/internal/advice/run`, called by the geo
pipeline) still gets the plain dict and logs `{"ok": true}`, so a quota-refused automatic generation
looks like a success in the cron log.

### Alert emails stopped arriving
**Not a fault — this is E15 (2026-07-26).** Per-alert email was deleted from `rules/engine.py` and
per-advice-change email from `ai/advice.py`; both call sites carry an explicit "do not re-add"
comment. Alerts are delivered **in-app + Telegram** immediately, and their content reaches the inbox
once a week in the Wednesday digest. Transactional mail (OTP, welcome, first "field is ready") is
unaffected. Details and the opt-out in §15.

### NDVI / index chart doesn't render
**Historical bug (fixed):** the frontend read `data.points` + a `value` field, but the API returns
`{ series: [{date, mean, p10, p50, p90}] }`. The chart (now `components/field/SatelliteTab.tsx` —
`OverviewTab.tsx` was deleted in the E14 restructure) reads `series` and plots `mean` with a faint
p10–p90 band. If a similar "empty chart" reappears, verify the API response shape against what the
component reads.

---

## 12. Open follow-ups / TODO

*(Closed since this list was written: **Activate AI** — live 2026-07-16; **Cloudflare SSL → Full
(Strict)** — verified 2026-07-16; **Email/OTP** — live 2026-07-25 via Resend; **panel split** —
active 2026-07-25.)*

- ⚠️ **Earthdata token expiry 2026-08-30:** regenerate before then, or HLS COG reads 401 (§3).
- ⚠️ **EPPO API closes 2026-09-01:** `EPPO_TOKEN` is empty anyway (pest block degrades to
  `eppo_no_token`); decide replace-or-drop before the date.
- ⚠️ **Rotate `LLM_API_KEY`:** the value was exposed once (§3).
- **Verify the digest crontab line** on the server is `0 3 * * 3`, not the old `15 6 * * *` (§4) —
  this cannot be confirmed from the repo.
- **Weekly-digest translation debt:** `catalog_i18n.WEEKLY_EXTRA` contains only `ru`, and
  `weekly.py::_LABELS` only az/en/ru, so `tr/de/hu/it/pl` users receive the digest **in English** via
  the locale → en → az fallback. Not broken, but visible to those users (§15).
- **nginx duplicate `server_name` cleanup:** remove the leftover duplicate block causing warnings (§8).
- **`app.agradex.com` in the repo's nginx copy:** `deploy/nginx-agradex.conf` still declares only
  `agradex.com www.agradex.com` while the live vhost serves the app host too — the repo copy has
  drifted from the server (§7, §16).
- **Remaining Sprint-2 items** (see `docs/Infrastruktur_Layer_Tekmillesdirme.md` §6): two-date
  compare/swipe, country/rayon NDVI benchmark, PDF/DOCX reports, official cadastre layer, geocoding
  search, hillshade/terrain. (Cloud-cover data is already present; UI filter partly there.)
- **Phase 2 (spec §28):** weather via Open-Meteo + models (GDD/spray/frost/drought), rule engine →
  multi-channel notifications, reports, baseline/anomaly/phenology, and billing (Stripe/PSP — tables +
  `org_is_paid()` gating already present, integration deferred; new orgs default `free`).

---

## 13. Container / profile cheat sheet

From `deploy/docker-compose.prod.yml`. All app ports bind to `127.0.0.1` and are fronted by host nginx.

| Service | Image / build | Port (host) | Profile | Notes |
|---------|---------------|-------------|---------|-------|
| `db` | `postgis/postgis:16-3.4` | (internal `db:5432`) | default | healthcheck; `./pgdata` volume |
| `api` | build `../services` | `127.0.0.1:8000:8000` | default | FastAPI; `env_file ../.env`; `./storage` volume |
| `web` | build `../app` | `127.0.0.1:3000:3000` | default | Next.js; `NEXT_PUBLIC_API_BASE=""` (same-origin) |
| `titiler` | `ghcr.io/developmentseed/titiler:latest` | `127.0.0.1:8001:80` | default | mounts `./data/rasters:ro`; **serves on :80** |
| `geoapi` | build `../services/Dockerfile.geo` | — (**not published**) | default | always-on C3 tap-to-detect; api reaches it as `http://geoapi:8010`; `mem_limit: 700m`; live `geo_pipeline` mount |
| `geo` | build `../services/Dockerfile.geo` | — | `geo` | run on demand; mounts `geo_pipeline:ro` + `data/rasters:rw` |
| `tools` | `python:3.11-slim` | — | `tools` | migrations/seeds runner; repo mounted at `/repo`; entrypoint `bash -lc` |
| `n8n` | `n8nio/n8n:latest` | `127.0.0.1:5678:5678` | `orchestration` | timezone Asia/Baku |

Run a profile-gated service:
`docker compose -f deploy/docker-compose.prod.yml --profile <geo|tools|orchestration> run --rm <service> ...`

`update.sh` rebuilds **only `api`, `web`, `titiler`** (§2). `geo`/`geoapi` are never rebuilt by a
deploy: their code is bind-mounted, so `docker restart deploy-geoapi-1` is enough for a code change
and `docker compose ... build geoapi && ... up -d geoapi` only when a Python dependency changes.

---

## 14. 2026-07-21 — v1.2.0 əməliyyat əlavələri

> Bölmə nömrələri əvvəllər təkrarlanırdı (iki dəfə "12", iki dəfə "13"). Aşağıdakı tarixli əlavələr
> 14-17 kimi nömrələnib; məzmun dəyişməyib (§15 E15-ə görə yenilənib).

### Yeni servis: geoapi (C3 toxun-tap)
Always-on uvicorn (geo image) `geo_pipeline.segment_api:app`, `mem_limit 700m`, **publish olunmur** — api ona `http://geoapi:8010` ilə çatır. Kod mount olunur → dəyişikliyə `docker restart deploy-geoapi-1` bəs edir; yeni dep (scipy/fastapi) → `docker compose build geoapi && up -d geoapi`.

### Yeni cron-lar (root crontab)
- `30 3 * * *` run-s2.sh (Sentinel-2 günlük refresh, NDRE/CIre daxil)
- `45 3 * * *` run-weather.sh (Open-Meteo → weather_cache + water_requirements + spray_window)
- `*/3 * * * *` process-research.sh (research_jobs → internal /research/drain)

### Knowledge layer / yeni feature deploy ardıcıllığı
1. migration (`tools` container: `apt-get install postgresql-client && ./db/migrate.sh`) — knowledge = 0014.
2. **`load_seeds.py` MÜTLƏQ** (`tools`: `pip install psycopg[binary] && python db/seeds/load_seeds.py`) — crop_thresholds.index_norms doldurur (yoxsa M5/E0 kalibr universal-a düşür).
3. `bash deploy/update.sh` (api/web/titiler rebuild). geoapi/geo ayrıca (yuxarı).
4. tsc gate: server-də node:20-slim konteynerdə `npm ci && npx tsc --noEmit` (git archive origin/main app).
   ⚠️ Bu **könüllü** əlavə gate-dir. Operatorun Mac-ında **node ümumiyyətlə yoxdur**, ona görə
   praktikada yeganə tip yoxlaması `update.sh` içindəki `docker compose build web`-dir (§2). Uğursuz
   build konteyneri dəyişdirmədən dayanır — sayt köhnə image ilə işləməyə davam edir.
5. import gate: `docker run --rm -v ...:/srv -w /srv deploy-api python -c "import app.main"`.

### Sirlər (yeni)
`EPPO_TOKEN` (boş → pest deqradasiya), `SEARCH_PROVIDER=anthropic`, `NOMINATIM_BASE`, `RESEND_API_KEY` (Sprint B).

## 15. Email sistemi (Resend) — 2026-07-25 CANLI · 2026-07-26 E15 ilə sadələşdirilib

**Provayder:** Resend (pulsuz tier), domen `agradex.com` verified. `.env`:
```
RESEND_API_KEY=re_...
EMAIL_FROM="Agradex <no-reply@agradex.com>"   # dırnaq VACİB (source .env boşluğu pozur)
```
Açar yoxdursa bütün email səliqəli no-op edir (signup auto-verify).

### E15 — bütün email axını iki yerə yığıldı (2026-07-26)

Əvvəl **yeddi ayrı göndərmə yolu** vardı; indi yalnız bunlar qalır:

1. **Transaksion** (opt-out-a baxmır, dərhal app tərəfindən göndərilir, cron deyil): `welcome` və ilk
   `data_ready` ("sahə hazırdır") hesabatı — `send.py::TRANSACTIONAL = {"welcome", "data_ready"}`;
   OTP/doğrulama isə öz yolu ilə gedir (`routers/auth.py::_OTP_EMAIL` → `notify`, şablon sistemindən
   kənar).
   ⚠️ Yeni qoruyucu: **`TRANSACTIONAL_CAP_HOURS = 24`** — bir istifadəçi eyni şablondan 24 saatda
   yalnız bir dəfə alır (bir gündə beş sahə çəkən fermer beş "hazırdır" məktubu almasın). Limitə
   düşən göndərmə `email_sends`-də `status='skipped'`, `meta={"reason":"daily_cap"}` kimi yazılır ki,
   sonrakı cron onu gec göndərməsin.
2. **Həftəlik digest** — məhsuldakı **YEGANƏ təkrarlanan email**. `ai/emails/weekly.py`
   (`TEMPLATE_ID = "weekly"`), 4 variant: `no_fields` · `no_crop` · `alerts` · `calm`. Dedup açarı
   ISO həftədir (`to_char(now(), 'IYYY-"W"IW')`), ona görə **variantlar ayrı şablon deyil** — cümə
   axşamı sahə əlavə edən fermer eyni həftədə ikinci məktub almır.

**SİLİNDİ (geri qaytarma):** hər alert üçün email (`rules/engine.py::_deliver_email`) və hər AI
məsləhət dəyişikliyi üçün email (`ai/advice.py::_notify`). Hər iki yerdə açıq **"Do not re-add"**
şərhi var: onlar `send_template`-dən yan keçirdi — nə `email_sends` idempotentlik jurnalı, nə
`email_lifecycle` opt-out, nə də unsubscribe linki. Təcililik indi **in-app bildiriş + Telegram**
ilə verilir; alert məzmunu həftəlik digest-in içindədir.

**Opt-out artıq bir dənədir:** `users.email_lifecycle`. `users.email_alerts` **0047 ilə drop
edildi**, `/api/auth/email-alerts` endpoint-ləri və `EmailAlertsToggle` komponenti silindi (drop
olunmuş sütuna görə 500 verərdilər).

**Per-dil persona:** hər dil öz göndərənindən (hamısı @agradex.com — tək verified domen):
az Ülkər Nəsirova · en Olivia Hayes · **ru Марина Ковалева** · tr İrem Çelik · it Chiara Moretti ·
de Johanna Brandt · hu Réka Tóth · pl Emilia Wójcik. `notify.SENDERS` (8 dil).

**Şablonlar:** `services/app/ai/emails/` (layout + catalog + catalog_i18n + send + weekly).
Kataloq **13 şablondan 3-ə** düşdü: `welcome`, `data_ready`, `weekly` (4 variant). `send_template`
idempotentdir (`email_sends`) + `users.email_lifecycle` opt-out-a hörmət edir (transaksion istisna).

> ⚠️ **Tərcümə borcu:** `catalog_i18n.WEEKLY_EXTRA`-da yalnız `ru` var, `weekly.py::_LABELS`-də
> az/en/ru. `_payload` locale → en → az gedir, ona görə **tr/de/hu/it/pl istifadəçiləri digest-i
> İNGİLİSCƏ alır**. Xəta deyil (fallback qəsdən belədir), amma real borcdur.
> Həmçinin: `catalog_i18n.SIMPLE_EXTRA` silinmiş 11 şablonun mətnini hələ saxlayır — ölü datadır
> (`catalog.py` yalnız `_SIMPLE_AZ` üzrə merge edir, orada isə tək `data_ready` var). O faylı canlı
> şablon siyahısı kimi oxuma.

**Unsubscribe:** `/api/emails/unsubscribe?token=` (login-siz, hər digest footer-ində; `_MSG` 8 dil).

**Bounce-dan qorunma:** demo/@demo.agradex.com hesablarına `email_lifecycle=false` təyin olunub.

**Manual drain testi** — **istənilən gün təhlükəsizdir** (ISO həftə dedup: bu həftənin digest-i
getməyibsə göndərir, gedibsə no-op):
```
cd /opt/bagbanai && set -a && . ./.env && set +a
curl -sS -X POST http://127.0.0.1:8000/api/internal/emails/lifecycle/drain -H "X-Internal-Token: $INTERNAL_API_TOKEN"
```
Cavab: `{"ok":true,"sent":{<variant>:n},"total":n,"candidates":n,"skipped":n}` — `sent` **variant**
üzrədir, köhnə şablon adları üzrə deyil.

### Cron (root crontab) — 2026-07-26-da DƏYİŞDİ
```
0 3 * * 3   cd /opt/bagbanai && bash deploy/lifecycle-emails.sh >> /var/log/bagban-lifecycle.log 2>&1
```
Çərşənbə 03:00 UTC = **07:00 Asia/Baku** (AZ UTC+4, DST yoxdur), həftəlik. Əvvəl `15 6 * * *`
(gündəlik) idi. Skript adı və endpoint yolu (`/api/internal/emails/lifecycle/drain`) qəsdən
saxlanılıb — ad "lifecycle" deyir, məzmun isə E15 digest-idir. **Skript crontab-ı dəyişə bilmir**:
serverdə əl ilə yoxla (§4).

### Miqrasiyalar (email ilə bağlı)
- **0044** `email_lifecycle`: email_sends (idempotentlik) + users.last_seen_at + users.email_lifecycle + email_unsub_tokens.
- **0045** `name_privacy`: users.name_public (fermer ad-görünürlüyü).
- **0047** `drop_email_alerts`: `users.email_alerts` DROP + `users.email_lifecycle` şərhi (tək opt-out).
Tətbiq qaydası və ardıcıllıq: **§6**. Sütun ƏLAVƏ edən miqrasiya api image-dən ƏVVƏL, sütun DROP edən
`0047` isə yeni image ilə birlikdə/sonra.

## 16. Panel split (app.agradex.com) — 2026-07-25 AKTİV
`.env`: `NEXT_PUBLIC_PANEL_HOST=app.agradex.com` + `COOKIE_DOMAIN=.agradex.com` → `bash deploy/update.sh`.
COOKIE_DOMAIN dəyişikliyi bütün istifadəçiləri bir dəfə yenidən login etdirir. DNS/nginx/SSL onsuz da app.agradex.com-u əhatə edirdi.
`NEXT_PUBLIC_PANEL_HOST` compose-da **build arg**-dır (`web` servisi) — dəyişəndə `web` yenidən
build olunmalıdır, sadəcə restart bəs etmir; `bash deploy/update.sh` onsuz da `--build` edir.
Qeyd: repo nüsxəsi `deploy/nginx-agradex.conf` hələ yalnız `agradex.com www.agradex.com` elan edir —
canlı vhost app host-u da verir, yəni repo nüsxəsi serverdən geri qalıb (§7, §12).

## 17. ⚠️ .env quoting (vacib)
`update.sh` `.env`-i `source` edir. Boşluqlu/`<`/`>`-li dəyər (məs. `EMAIL_FROM=Agradex <no-reply@...>`) MÜTLƏQ dırnaqda olmalıdır — yoxsa `source .env` "syntax error near unexpected token newline" verib api-ni crash-loop-a salır.

