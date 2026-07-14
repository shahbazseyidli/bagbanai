# Bağban AI — Operations Runbook

Operational reference for running, deploying, and troubleshooting the **Bağban AI** platform
(https://agradex.com) — a satellite (NASA HLS) + weather + AI crop-monitoring platform for
Azerbaijani farmers. This document is the "how do I operate the live system" companion to the two
spec files (`docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md`, `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md`)
and to `CLAUDE.md` (working context/decisions). The repo is the source of truth; everything here was
grounded against the actual scripts in `deploy/`, `db/`, and the compose file.

> UI text is Azerbaijani; code, SQL, identifiers, and commit messages are English. This runbook is in
> English because it is operator/developer documentation.

---

## 1. Server & access facts

| Fact | Value |
|------|-------|
| Hetzner server name | `bagban-ai` |
| Type / location | CPX22, Helsinki |
| Hetzner project | AGRADEX-TEST |
| Public IPv4 | `95.216.208.82` (Primary IP — kept across server recreate) |
| App root on server | `/opt/bagbanai` (a **git checkout** tracking `origin/main`) |
| Domain | `agradex.com` (apex/root — no subdomain) |
| DNS | Cloudflare, A `@` and A `www` → `95.216.208.82`, **proxied** |

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
   restarts the three app containers (db keeps running; geo/tools/n8n are profile-gated and untouched).
5. `nginx -t && systemctl reload nginx` (best-effort) — validates and reloads the host nginx vhost.
6. Prints `redeploy complete @ <short-sha>`.

### Why it MUST source `.env`

The compose file substitutes `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}` into the
`DATABASE_URL` for the `api` (and `geo`/`tools`) services:

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

If `.env` is **not** sourced first, those variables are empty and the api container starts with a
**blank `DATABASE_URL`** → it cannot connect to Postgres → **crash-loop**. `update.sh`, `run-hls.sh`,
`process-queue.sh`, and `bootstrap.sh` all source `.env` for exactly this reason. Never run the raw
`docker compose ... up` by hand without first doing `set -a; . ./.env; set +a`.

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
next steps for nginx + certbot. After bootstrap you still edit `.env` to add `EARTHDATA_TOKEN` and the
`LLM_*` keys.

---

## 3. Secrets & `.env` reference

Secrets live in **`/opt/bagbanai/.env`** (never committed). A backup copy is kept at
**`/root/agradex.env.bak`** — update the backup whenever you change `.env`.

| Key | Purpose | State |
|-----|---------|-------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials; substituted into `DATABASE_URL` in compose | set |
| `DATABASE_URL` | Local/dev connection string (containers override to host `db`) | set |
| `JWT_SECRET` | Signs the httpOnly auth-cookie JWT (own auth, `security.py`) | set |
| `INTERNAL_API_TOKEN` | `X-Internal-Token` for internal endpoints (e.g. geo pipeline → `/api/internal/advice/run`) | set |
| `EARTHDATA_TOKEN` | NASA Earthdata Login **bearer** token; set on GDAL as `Authorization: Bearer` for `/vsicurl` COG reads | set — **EXPIRES 2026-08-30** |
| `LLM_PROVIDER` | AI provider (e.g. `anthropic`) | **empty** |
| `LLM_MODEL` | Model id (e.g. `claude-opus-4-8` or `claude-sonnet-5`) | **empty** |
| `LLM_API_KEY` | Claude API key (`sk-ant-...`) | **empty — AI inactive** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Outbound email for notifications | **empty — email off** |
| `OBJECT_STORAGE_ROOT` / `OBJECT_STORAGE_*` | Local-volume storage root for uploaded photos | set (`/srv/storage`) |

**Passwords are never stored in files.** User account passwords (e.g. owner `seyidlimirshahbaz@gmail.com`,
demo `demo@agradex.com`) are bcrypt hashes in `public.users`. To reset a password, generate a fresh
bcrypt hash inside the api container and `UPDATE public.users SET password_hash=... WHERE email=...`.

### How to activate the AI (Claude) — exact steps

The AI advice + chatbot are fully built and deployed but degrade gracefully with no key (advice returns
`configured:false`/null; `generate`/`chat` return `503`). To turn them on:

```bash
ssh root@95.216.208.82
cd /opt/bagbanai
# edit .env — add these three lines (use sonnet for lower cost):
#   LLM_PROVIDER=anthropic
#   LLM_MODEL=claude-opus-4-8
#   LLM_API_KEY=sk-ant-...
nano .env

# restart only the api (it holds the LLM key and does all generation)
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml up -d api

# update the secrets backup
cp .env /root/agradex.env.bak
```

Verify: `GET /api/fields/{id}/advice` should now return `configured:true`, and `POST .../advice/generate`
should produce structured advice instead of `503`.

### How to enable email notifications (optional)

In-app/web notifications work **without** SMTP. To also send email (best-effort, e.g. "data ready" and
changed-advice alerts to the org owner), add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
`SMTP_FROM` to `.env`, then restart the api the same way as above.

### Regenerating the Earthdata token (before 2026-08-30)

The `EARTHDATA_TOKEN` is an EDL bearer token that expires **2026-08-30**. When it expires, HLS COG reads
start returning 401 and the pipeline fails. Regenerate at https://urs.earthdata.nasa.gov (user profile →
Generate Token), then update `EARTHDATA_TOKEN=` in `.env`, refresh `/root/agradex.env.bak`, and re-run a
pipeline job to confirm. Username/password auth does **not** work here (returns 401) — the bearer token
is required.

---

## 4. Crons (root crontab)

Two jobs run from the **root crontab** on `bagban-ai` (with `PATH` set so `docker`/`bash` resolve):

```cron
# Daily silent HLS refresh (track=0): pulls new scenes/rasters, does NOT reset data_status or re-notify
0 3 * * *   cd /opt/bagbanai && bash deploy/run-hls.sh 30 >> /var/log/bagban-hls.log 2>&1

# Every 2 minutes: process newly-created fields (data_status='queued'), newest scene first
*/2 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-queue.lock bash deploy/process-queue.sh >> /var/log/bagban-queue.log 2>&1
```

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

### Reference fields (for testing)

| Field | id | Note |
|-------|----|------|
| test lecet | `860891bd-912c-4ec3-9235-b7d4d0193190` | fully processed (~962 `index_stats` rows + COGs) — main live test field |
| Findiq sahesi 1 (demo) | `4a08ee8a-4123-4fe5-a07f-ed24c69c5604` | demo hazelnut field |
| Xudat fındıq sahəsi | `8e046b22-cbbf-4e54-b201-7e973d9106b9` | |

Demo login: `demo@agradex.com` / `AgradexDemo2026`.

---

## 6. Database migrations

Migrations are ordered SQL files in `db/migrations/` (`0001..0009`), applied idempotently by
**`db/migrate.sh`** and tracked in **`public.schema_migrations`** (columns `filename`, `applied_at`).

### How `db/migrate.sh` works

1. Requires `DATABASE_URL` in the environment (`: "${DATABASE_URL:?set DATABASE_URL}"`).
2. Creates `public.schema_migrations` if absent.
3. Iterates `db/migrations/*.sql` in filename order; for each, checks whether its `filename` is already
   in `schema_migrations`. If applied → `skip`. Otherwise applies it in a single transaction
   (`-1 -v ON_ERROR_STOP=1`) and inserts the filename to mark it done.

### Applying a new migration

1. Add a file named `db/migrations/NNNN_description.sql` (next number after `0009`, e.g. `0010_...`).
   Migrations must be safe to run once; the tracking table prevents re-application.
2. Run it on the server via the `tools` profile container (has the repo mounted and `DATABASE_URL` set
   to the `db` host):

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a
docker compose -f deploy/docker-compose.prod.yml --profile tools run --rm tools \
  "apt-get update -qq && apt-get install -y -qq postgresql-client >/dev/null && chmod +x db/migrate.sh && ./db/migrate.sh"
```

You should see `apply 0010_...` then `migrations up to date.` Re-running prints `skip` for already-applied
files.

### Seeds

Subsidy seeds live in `db/seeds` (2026: 117 rates, `amount = coef × 200`) and are loaded by
`python db/seeds/load_seeds.py` (also run inside the `tools` container, as `bootstrap.sh` does). Seeds
upsert, so re-running is safe.

### Notable schema (0009 async-processing columns on `public.fields`)

`data_status` (`none|queued|processing|ready|failed`), `data_progress_done`, `data_progress_total`,
`data_started_at`, `data_ready_at`, `data_eta_seconds`, `data_message` — these drive the "Peyk məlumatı
hazırlanır…" progress UX and are updated by tracked (`track=1`) pipeline runs.

---

## 7. TiTiler & rasters

**What it is.** `ghcr.io/developmentseed/titiler:latest` colorizes and serves the clipped, field-masked
index COGs that the geo pipeline writes to `/data/rasters` (mounted read-only into the titiler container,
read-write into the geo container). It gives the OverviewTab a pixel-level colored raster overlay per
field+index.

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

**Quick health checks:**

```bash
# titiler itself (on the server)
curl -sI http://127.0.0.1:8001/            # image serves on :80 → mapped to 8001
# through nginx / Cloudflare
curl -sI https://agradex.com/titiler/
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

**Cloudflare.** `@` and `www` are proxied. SSL mode is currently **Flexible**. The origin `:443` is ready,
so the **TODO** is to flip Cloudflare to **Full (Strict)** (dashboard: Overview → SSL/TLS → Full (Strict))
for end-to-end encryption. The dashboard was unresponsive during setup — retry pending.

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

**Cron logs:**

- `/var/log/bagban-hls.log` — daily HLS refresh (`run-hls.sh`).
- `/var/log/bagban-queue.log` — every-2-min queue worker (`process-queue.sh`).

```bash
tail -f /var/log/bagban-queue.log
tail -f /var/log/bagban-hls.log
```

**Health checks:**

```bash
curl -s  http://127.0.0.1:8000/api/health    # {"status":"ok",...}
curl -sI http://127.0.0.1:3000               # 200 (Next.js)
curl -s  https://agradex.com/api/health       # through nginx + Cloudflare
curl -s  https://agradex.com/api/subsidy/rates | head   # expect 117 rates
```

**nginx logs:** `/var/log/nginx/access.log`, `/var/log/nginx/error.log`.

---

## 11. Troubleshooting playbook

Concrete failures that have actually occurred, with the fix.

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
**Cause:** `LLM_API_KEY` (and `LLM_PROVIDER`/`LLM_MODEL`) are empty — the AI is in graceful no-key mode by
design.
**Fix:** add the three `LLM_*` keys to `.env` and restart the api (see §3 "How to activate the AI").

### NDVI / index chart doesn't render
**Historical bug (fixed):** the frontend read `data.points` + a `value` field, but the API returns
`{ series: [{date, mean, p10, p50, p90}] }`. The OverviewTab now reads `series` and plots `mean` with a
faint p10–p90 band. If a similar "empty chart" reappears, verify the API response shape against what the
component reads.

---

## 12. Open follow-ups / TODO

- **Activate AI:** add `LLM_API_KEY` (+ `LLM_PROVIDER`, `LLM_MODEL`) to `.env`, restart api (§3).
- **Cloudflare SSL → Full (Strict):** origin `:443` is ready; flip the mode in the CF dashboard (§8).
- **nginx duplicate `server_name` cleanup:** remove the leftover duplicate block causing warnings (§8).
- **Earthdata token expiry 2026-08-30:** regenerate before then (§3).
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
| `geo` | build `../services/Dockerfile.geo` | — | `geo` | run on demand; mounts `geo_pipeline:ro` + `data/rasters:rw` |
| `tools` | `python:3.11-slim` | — | `tools` | migrations/seeds runner; repo mounted at `/repo` |
| `n8n` | `n8nio/n8n:latest` | `127.0.0.1:5678:5678` | `orchestration` | timezone Asia/Baku |

Run a profile-gated service:
`docker compose -f deploy/docker-compose.prod.yml --profile <geo|tools|orchestration> run --rm <service> ...`
