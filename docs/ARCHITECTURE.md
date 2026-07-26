# Bağban AI — Architecture & Technical Specification

> Operator/developer reference for the live platform. **agradex.com** is the marketing apex and
> **app.agradex.com** is the application — the host split is resolved server-side (§15.5). The
> product is branded **Agradex** in every user-facing surface (`app/src/lib/i18n.ts`, key `brand`);
> only infrastructure identifiers keep the original name (`/opt/bagbanai`, the repo, the
> `bagban-api` health name).
> This document explains **what** each part is, **why** it was built that way, **how** it works,
> and **what still needs doing**. The repo is the source of truth; the product spec lives in
> `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29) and
> `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30 — the subsidy module was later removed from
> the product, see §1). Working context/decisions for future sessions live in `CLAUDE.md`.

---

## 1. Overview & Goals

**Agradex** is a satellite + weather + AI crop-monitoring and farm-management platform for
Azerbaijani (and wider Caucasus) farmers, cooperatives, and agronomists. It combines:

- **Free satellite vegetation monitoring** — the ingest layer reads **both** NASA HLS (Harmonized
  Landsat–Sentinel, 30 m) and **Sentinel-2** (10 m), processed into per-field vegetation/water
  indices, both as time-series statistics and as colorized pixel-level map overlays. The **user
  interface exposes only Sentinel-2**: HLS is hidden behind a single flag
  (`HLS_ENABLED = false`, `app/src/lib/sensors.ts`) while every data-layer consumer keeps reading it
  (§15.7).
- **AI agronomic advice + chatbot** — provider-agnostic LLM (default Claude) that reasons over a
  field's satellite trends, crop metadata, and recorded field work. Advice prose is **generated in
  the reader's / owner's language** and the row records which one (§16.5).
- **Farm management** — organizations, farms, fields, field metadata, scouting, tasks, operations,
  yields, plus the ledger / sales / inventory / equipment modules gathered under the `/farm`
  container route (§15.3).
- **Subsidy calculator — removed from the product.** The page and `services/app/routers/subsidy.py`
  were deleted; the `0008` `subsidy_*` tables are deliberately left in the schema, **dormant and
  un-dropped** (§6).

### Language rule (important)
- **The UI ships in 8 locales**: `az` (default, and the complete source dictionary the other seven
  fall back to) plus `en, ru, tr, de, hu, it, pl`. `az` is unprefixed; the other seven are
  path-prefixed (`/en/…`). See `app/src/lib/i18n.ts` and §16.
- **All code, identifiers, SQL, schema, and commit messages are English.**
- **The backend does not compose finished farmer-facing sentences.** Computed prose is returned as a
  stable code plus raw params and rendered by the frontend (§16.3); the older Azerbaijani strings
  survive only as the fallback for rows written before that convention.

### Ground rules baked into the architecture
- **Multi-tenancy** via the access chain `field → farm → organization → membership`; `org_id` is
  denormalized onto almost every table for cheap gating.
- **Security is enforced twice**: primary server-side gating in FastAPI (`deps.py`), plus RLS in
  Postgres as defense-in-depth.
- **No secrets in git** — everything sensitive lives in `/opt/bagbanai/.env` on the server.
- **Idempotent pipelines** — the HLS pipeline upserts on natural keys so re-runs are safe.

---

## 2. Technology Stack (what & why)

| Layer | Technology | Why this choice |
|---|---|---|
| **Frontend** | Next.js 15 (App Router, TypeScript) in `app/` | SSR + BFF route handlers; `/api` is same-origin on whichever host served the page. Middleware resolves locale **and** host per request (§15.5, §16.1). |
| Map | **MapLibre GL v4** (`app/src/components/FieldMap.tsx`) | `mapbox-gl-draw` was incompatible with MapLibre v4 and broke the whole map, so drawing is done with a **native click-to-draw** implementation instead. Keyless, open-source. Every map construction is gated on `useMapReady()` (§15.6). |
| Charts | Recharts | NDVI time-series + p10–p90 variability band. |
| Styling / i18n | Tailwind CSS; `lib/i18n.ts` — 8 locales, `az` default (§16) | `t()` / `tf()` / `tp()`; the seven translated dictionaries live in `lib/locales/*.ts`. |
| **API** | FastAPI (Python 3.11) in `services/app/` | Async, typed, pairs naturally with the Python geo stack. |
| DB driver | `asyncpg` pool (`services/app/db.py`) | Fast async Postgres access; each request sets the RLS session GUC. |
| Auth | Own JWT: `public.users` + bcrypt + PyJWT httpOnly cookie (`security.py`) | No Supabase (see §12); self-hosted control. |
| **Geo pipeline** | `services/geo_pipeline/` — `earthaccess`, `pystac-client`, `rioxarray`, `rasterio`, `xarray`, `shapely`, `pyproj` | Reads NASA HLS COGs directly over `/vsicurl`, windowed to the field. |
| **Database** | Postgres 16 + PostGIS (`postgis/postgis:16-3.4`, Docker) | Geospatial types + RLS; self-hosted (no Supabase). |
| **Tiles** | TiTiler (`ghcr.io/developmentseed/titiler:latest`) | Colorizes/serves the clipped index COGs as XYZ map tiles. **The image listens on port 80** (compose maps `127.0.0.1:8001:80`). |
| AI | Provider-agnostic adapter `services/app/ai/` (default Claude via `AsyncAnthropic`, `anthropic>=0.69`) | Provider/model/key come from env — never hard-coded — so the provider can be swapped. |
| **Orchestration** | n8n at `agent.agradex.com` (separate box) + host `cron` on the Hetzner root crontab | Scheduled HLS refresh + queue processing. |
| Free data | NASA HLS (Earthdata bearer token), Sentinel-2, Open-Meteo | Zero data cost. |
| Email | Resend HTTP API (`ai/notify.py`, SMTP fallback) | Transactional mail + **one** weekly digest (§17). |

---

## 3. Component & Container Map

All application ports are bound to `127.0.0.1` and fronted by the **host nginx** which terminates
TLS. Containers are defined in `deploy/docker-compose.prod.yml`. Both hosts (`agradex.com` and
`app.agradex.com`) are served by the same `web`/`api` containers — the split is a routing decision
made in Next.js middleware, not a second deployment (§15.5).

> **Unverified from this repo:** the checked-in vhosts `deploy/nginx-agradex.conf` and
> `deploy/nginx-agradex-http.conf` declare `server_name agradex.com www.agradex.com` only —
> `app.agradex.com` does not appear in either file, although the host is live. Whether the live
> `/etc/nginx/sites-enabled/agradex.com` was edited by hand (and therefore whether e.g.
> `https://app.agradex.com/titiler/…` resolves anonymously, which the weekly digest's embedded
> image depends on — §17) cannot be established from the repo. Curl-test before relying on it.

```
                          Internet (Cloudflare proxied: A @ + www)
                                        │  HTTPS
                                        ▼
                        ┌───────────────────────────────┐
                        │  host nginx (agradex.com)      │
                        │  :80 (loop-safe) + :443 (LE)   │
                        │  /            → 127.0.0.1:3000  │  web
                        │  /api/        → 127.0.0.1:8000  │  api
                        │  /titiler/    → 127.0.0.1:8001  │  titiler (:80 in container)
                        └───────────────────────────────┘
                            │            │            │
             ┌──────────────┘     ┌──────┘      ┌─────┘
             ▼                    ▼             ▼
        ┌─────────┐         ┌──────────┐   ┌───────────┐
        │  web    │         │   api    │   │  titiler  │
        │ Next.js │──/api──▶│ FastAPI  │   │  serves   │
        │  :3000  │         │  :8000   │   │  COGs :80 │
        └─────────┘         └────┬─────┘   └─────┬─────┘
                                 │ asyncpg        │ reads (ro)
                                 ▼                ▼
                            ┌──────────┐   ./data/rasters/<field>/<scene>_<index>.tif
                            │   db     │          ▲
                            │ Postgres │          │ writes (rw)
                            │ +PostGIS │   ┌──────┴──────┐
                            │  :5432   │◀──│  geo (worker)│  profile: geo, run on demand / cron
                            └──────────┘   │ HLS pipeline │
                                           └─────────────┘
        one-off / on-demand containers:
          tools  (profile "tools")        — migrations + seeds runner
          n8n    (profile "orchestration")— cron + dispatch (also runs on a separate box)
```

### Containers (compose services)
- **db** — PostGIS 16, healthchecked (`pg_isready`), data in `./pgdata`.
- **api** — FastAPI, `127.0.0.1:8000`, `env_file: ../.env`, `DATABASE_URL` overridden to reach
  Postgres at host `db`; mounts `./storage` for uploaded scouting photos.
- **web** — Next.js, `127.0.0.1:3000`, `NEXT_PUBLIC_API_BASE=""` (same-origin; nginx routes `/api`).
- **titiler** — `127.0.0.1:8001:80`, mounts `./data/rasters` **read-only**.
- **geo** — profile `geo`; satellite worker built from `services/Dockerfile.geo`; mounts
  `./data/rasters` **read-write** and the live `geo_pipeline` code (no rebuild per change);
  `RASTER_DIR=/data/rasters`. Run on demand / via cron.
- **geoapi** — always-on microservice from the same geo image (tap-to-detect segmentation).
  **Not published** to the host: `api` reaches it at `http://geoapi:8010` over the compose network.
  The `geo_pipeline` code is bind-mounted, so a code change needs only a container restart.
- **tools** — profile `tools`; `python:3.11-slim` with the repo mounted, for migrations/seeds.
- **n8n** — profile `orchestration`; `Asia/Baku` timezone.

`deploy/update.sh` rebuilds **only `api`, `web`, `titiler`** — `geo` and `geoapi` are deliberately
outside the deploy path (see `docs/OPERATIONS.md`).

---

## 4. Request & Data Flow

### Browser → nginx → middleware → web/api
1. Browser loads `https://agradex.com` (or `https://app.agradex.com`) → nginx `/` → **web**
   (Next.js). The Next app renders the UI and makes same-origin calls to `/api/...`
   (`NEXT_PUBLIC_API_BASE=""`).
2. **`app/src/middleware.ts` runs first** and decides two things from the request alone, then hands
   the answers to the server render as request headers — `x-locale`, `x-app-host` (`"1"`/`"0"`) and
   `x-pathname` (the locale-stripped path). Everything the server needs to render the correct
   language and the correct host variant is therefore known during SSR (§15.5, §16.1).
3. nginx routes `/api/` → **api** (FastAPI). Auth is a `bagban_session` httpOnly cookie (JWT); the
   API also accepts `Authorization: Bearer <jwt>`. Every browser request additionally carries
   **`X-Locale`** (`app/src/lib/api.ts`), which is the language the UI is rendering in (§16.2).
4. Map raster tiles are requested by MapLibre directly at `/titiler/cog/tiles/WebMercatorQuad/...`,
   which nginx routes to **titiler**.

### api → Postgres with the RLS session GUC
Every request goes through `db.connection(user_id)` (`services/app/db.py`), which:
1. acquires an `asyncpg` connection from the pool,
2. opens a transaction,
3. runs `select set_config('app.user_id', $1, true)` — i.e. **`SET LOCAL app.user_id`**, scoped to
   that transaction, so `public.current_user_id()` returns the caller's UUID for any policy or
   owner-scoped check,
4. yields the connection to the endpoint.

The app connects as the table-owning role (which bypasses RLS), so the **primary** enforcement is
the server-side gating helpers in `deps.py` invoked inside each endpoint (`require_member`,
`require_role`, `require_paid`, `require_internal`). RLS is the second line of defense.

---

## 5. Auth & Authorization Model

### Own JWT (why not Supabase `auth.uid()`)
The product spec assumes Supabase, but the user chose to self-host everything on Hetzner. So:
- **Users** live in `public.users` (bcrypt `password_hash`). Login issues a **PyJWT** token stored in
  an **httpOnly cookie** named `bagban_session` (config in `services/app/config.py`:
  `jwt_secret`, `jwt_expires_hours=168`, `cookie_name`). Token decoding is in `security.py`.
- Every `references auth.users(id)` in the spec became `references public.users(id)`.
- Instead of Supabase `auth.uid()`, the DB uses **`public.current_user_id()`** (migration
  `0002_users.sql`), which reads the session GUC:
  ```sql
  select nullif(current_setting('app.user_id', true), '')::uuid;
  ```
  The backend sets this GUC per request (see §4).

### Two-layer authorization
**Primary — server-side gating** (`services/app/deps.py`), called inside endpoints with an open
connection:
- `is_org_member` / `require_member` → `public.is_org_member(uid, oid)`
- `require_role(conn, user, org, roles)` → `public.has_org_role(uid, oid, roles)`
- `require_paid(org)` → `public.org_is_paid(oid)` → HTTP **402** if not on a paid tier
- `require_internal` → checks the `X-Internal-Token` header against `settings.internal_api_token`
  (used by the geo worker → API internal endpoints)

Convenience role groups (spec §8 matrix):
- `ROLES_WRITE = [owner, admin, agronomist]`
- `ROLES_WORKER = [owner, admin, agronomist, worker]`
- `ROLES_ADMIN = [owner, admin]`

Roles are the `org_role` enum: `owner | admin | agronomist | worker | viewer`.

**Defense-in-depth — RLS** (`0007_rls.sql`): RLS is enabled on every tenant table with policies
built on `is_org_member` / `has_org_role` / `org_is_paid` and `current_user_id()`. Because the app
role owns the tables and bypasses RLS, these policies exist for any future restricted/analytics role
and as a safety net. PAID tables (`advice`, `ai_chat_messages`, `notifications`) additionally gate
reads on `org_is_paid(org_id)`.

---

## 6. Data Model Catalog

Migrations are ordered SQL in **`db/migrations/0001..0049`**, tracked in `public.schema_migrations`
(next free number: **0050**). Seeds in `db/seeds`.
The **access chain** is `field → farm → organization → membership`; `org_id` is denormalized onto
most tables so gating never needs a join.

The catalog below documents `0001..0009` in full. Later migrations are documented where the feature
they serve is described; the ones added by the most recent cycle are listed in §6.1.

### Auth & tenancy (`0002`, `0003`)
- **`users`** — `id`, `email` (unique), `password_hash` (bcrypt), `full_name`, `phone`,
  `locale`, `is_active`. Auth root. Later migrations added `role`, `country`, `region`,
  `email_verified`, `name_public` (§18), `email_lifecycle` (§17), and — this cycle — `onboarding`,
  `area_unit` (§6.1). **`locale` is the only language signal available to work that runs without an
  HTTP request** (the weekly digest, post-scene advice generation), which is why the language
  switcher persists it (§16.5).
- **`organizations`** — `id`, `name`, `owner_id → users`, `country` (default `AZ`). Tenant root.
- **`org_role`** enum — `owner|admin|agronomist|worker|viewer`.
- **`organization_members`** — PK `(org_id, user_id)`, `role`, `status` (`invited|active|removed`).
  Membership drives all access.
- **`org_invites`** — pending email invites with a unique `token`, `role`, `expires_at`.
- **`farms`** — `id`, `org_id`, `name`, `region`, `centroid` (Point 4326).
- **`fields`** — `id`, `farm_id`, `org_id` (denormalized), `name`, `geom` (Polygon 4326),
  `centroid` (generated `st_centroid`), `area_ha`, `bbox`, `mgrs_tiles text[]`, `created_by`.
  GiST index on `geom`. **Migration `0009`** added the async-processing columns:
  `data_status` (`none|queued|processing|ready|failed`), `data_progress_done/total`,
  `data_started_at`, `data_ready_at`, `data_eta_seconds`, `data_message`. A **partial index**
  `fields_data_status_idx` on rows where `data_status in ('queued','processing')` keeps the queue
  worker's scan cheap.
- **`field_metadata`** (1:1 with `fields`) — crop/agronomy attributes: `crop_type`, `variety`,
  `planting_date`, `expected_harvest`, `soil_type`, `soil_ph`, `irrigation_method`,
  `irrigation_available`, `previous_crop`, `growth_stage`, `tillage_practice`, `target_yield`,
  plus jsonb sub-lists `difficulties`, `rotation_history`, `fertilizer_history`, `prior_yields`,
  `pest_history`, and `notes`.

### Satellite & weather (`0004`)
- **`scenes`** — one HLS granule per field: `sensor`, `acquired_at`, `mgrs_tile`, `cloud_pct`,
  `valid_pixel_pct`, `granule_id`. **Unique `(field_id, sensor, acquired_at, mgrs_tile)`** →
  idempotent upserts.
- **`index_stats`** — per-scene, per-index field statistics: `index_name`
  (`NDVI|EVI|SAVI|MSAVI|NDMI|NDWI|NBR|NBR2|TVI`), `mean/min/max/std/p10/p50/p90`, `valid_pixels`,
  `acquired_at`. **Unique `(scene_id, index_name)`**. Time-series index on
  `(field_id, index_name, acquired_at)`.
- **`index_rasters`** — bookkeeping for the clipped/colorizable COGs: `scene_id`, `field_id`,
  `index_name`, **`storage_path`**, `acquired_at`. Migration `0009` adds a unique
  `(scene_id, index_name)` index and a `(field_id, index_name, acquired_at)` lookup index.
- **`weather_cache`** — Open-Meteo forecast cache (Phase 2): `forecast_date`, `t_min/t_max`,
  `precip_mm`, `et0_mm`, soil moisture/temp jsonb, etc.

### Farm management (`0005`)
- **`scouting_observations`** — `geom` (Point), `category` (`pest|disease|weed|nutrient|water|damage|other`),
  `severity`, `note`, `photos text[]` (local storage paths), `status` (`open|resolved`).
- **`tasks`** — `title`, `type`, `assigned_to`, `due_date`, `status` (`todo|in_progress|done|cancelled`),
  `priority`. Nullable `field_id` (set null on field delete).
- **`field_operations`** — activity log: `type`, `performed_on`, `inputs jsonb`, `cost`, `currency`.
- **`yields`** — `season_year`, `crop_type`, `yield_value`, `yield_unit`. Unique
  `(field_id, season_year, crop_type)`.
- **`reports`** — generated PDF/xlsx bookkeeping (Phase 2).

### AI, notifications, subscriptions (`0006`)
- **`advice`** (PAID) — `model_provider`, `model_name`, `input_snapshot jsonb`, `summary`,
  **`findings jsonb`** = `{risks, recommendations, next_steps}`, `disclaimer`, `generated_at`, and
  (migration `0049`) **`lang`** — the language the prose was written in (§16.5).
- **`ai_chat_messages`** (PAID) — `role` (`user|assistant`), `content`, `context_snapshot jsonb`.
- **`notifications`** (PAID) — `source` (`vegetation|weather`), `type`, `severity`
  (`info|warning|critical`), `title`, `body`, `payload`, `read_at`, `delivered_channels text[]`
  (`inapp|push|email|telegram|whatsapp|sms`).
- **`notification_preferences`** — per-user channel toggles + telegram/whatsapp/sms handles.
- **`org_subscriptions`** — `tier` (`free|pro|business`), `seats`, `hectare_cap`, `valid_until`.
  Billing integration is **deferred** (see §12) but `org_is_paid()` gating is live.
- **`crop_thresholds`** — rule-engine KB (Phase 2): per-crop GDD base, NDVI healthy/stress bounds,
  frost/heat thresholds, `kc_stages`.

### Subsidy calculator (`0008`) — DORMANT
The feature was removed from the product (page + `routers/subsidy.py` deleted, all `/api/subsidy/*`
endpoints gone). The tables were **deliberately not dropped**, so the removal stays reversible:

- **`subsidy_years`** — `base_unit_rate` (default **200** AZN).
- **`subsidy_regions`** — rayon/region reference (liberated / Nakhchivan / economic region).
- **`subsidy_rates`** — the full rate table: `subsidy_type`, `crop_group`, `crop`, `intensity`,
  `region_category`, `irrigation`, `planting_period`, `coefficient`, **`amount_per_unit`**
  (`= coefficient × base_unit_rate`), `unit` (`ha|ton`), eligibility conditions, `label_az`.
- **`subsidy_modifiers`** — rule modifiers.
- **`subsidy_calculations`** — saved user calculations (history). Reference tables are
  public-read; calculations are owner/member scoped.

### 6.1 Newest migrations (`0046`–`0049`)

| # | Change | Why | Read by |
|---|---|---|---|
| `0046_user_onboarding.sql` | `users.onboarding jsonb` — `{crop, country, region, challenge, needs[], completed_at}` | The landing onboarding quiz is answered **before** signup (localStorage) and must survive the anonymous→account hop. One jsonb column on purpose: the shape is presentation data, not something the app queries relationally. | `signup()`, `GET/POST /api/auth/onboarding`, `_apply_onboarding_to_fields()` |
| `0047_drop_email_alerts.sql` | **drops** `users.email_alerts`; re-comments `users.email_lifecycle` as the single opt-out for **all** non-transactional email | Two independent opt-out flags existed and the rule engine bypassed the template system, so a farmer who switched lifecycle email off still got one message per fired alert per field per day. With per-event email deleted (§17) `email_alerts` had no reader left. | — (removed) |
| `0048_area_unit.sql` | `users.area_unit text` + `users_area_unit_chk` (`NULL \| ha \| donum \| sotka`) | Rendering only. `NULL` means "derive from `users.country`" (TR → `donum`, else `ha`). Hectares stay the unit of the database, the API and every model (§16.6). | `GET/POST /api/auth/area-unit` |
| `0049_advice_lang.sql` | `advice.lang text not null default 'az'` + index `advice_field_lang_idx (field_id, lang, generated_at desc)` | Nothing recorded which language a stored advice row was written in, so the read path could not tell a Russian reader the analysis in front of them was Azerbaijani. The `'az'` default backfills correctly — the auto-trigger really did pass no language (§16.5). | `advice.generate_and_store()` (write), `GET /api/fields/{id}/advice` (read) |

**Ordering constraint.** `0046`, `0048` and `0049` must be applied **before** the new `api` image
starts (the new code selects/inserts those columns). `0047` is the one migration with the **opposite**
constraint — it drops a column the *previous* image still reads, so it must be applied **with or
after** the image swap. Nothing in `deploy/update.sh` applies migrations; that is always a separate
manual step (see `docs/OPERATIONS.md`).

**Note on `advice_field_lang_idx`:** no query in the codebase filters `advice` by `lang` — every
reader selects by `field_id` and orders by `generated_at desc`, which the pre-existing
`advice_field_idx` already serves. The index is harmless but currently unused.

---

## 7. Satellite Pipeline (HLS + Sentinel-2 → indices → stats + COGs → tiles)

Code: `services/geo_pipeline/` (entry point `pipeline.py:run_field`). Spec §10.

> **Two sensors, one pipeline.** The flow below describes the HLS path. A parallel Sentinel-2 path
> exists — `search_s2.py` + `pipeline.py:process_granule_s2` / `run_field_s2` — and
> `pipeline.py` accepts `sensor = hls | s2 | all`. The S2 index list differs
> (`indices.py:S2_INDEX_NAMES` = the 9 minus `TVI`, plus **`NDRE`** and **`CIre`**, which need the
> red-edge band Landsat/HLS do not have).
>
> **HLS remains fully live in the data layer** even though it is no longer shown in the UI: the
> daily HLS cron, the stored `S30`/`L30` rows, the regional benchmark SQL, the retrospective
> backfill and the productivity-zone computation all still read it. See §15.7 — do not delete the
> HLS branches as dead code.

### Flow
1. **Search** (`search.py`) — query NASA CMR STAC for HLS-VI granules
   (`HLSS30_VI` = Sentinel-2, `HLSL30_VI` = Landsat 8/9) intersecting the field bbox over
   `days_back` days with `cloud_pct ≤ max_cloud`. Granules are sorted **newest-first** so the most
   recent image reaches the map as soon as possible.
2. **Windowed COG read** (`read.py:read_window`) — for each index band, open the COG via
   `rioxarray` and **clip to the field geometry only** (reproject the WGS84 polygon to the raster
   CRS first). Reading only the field window minimizes egress since Hetzner (Helsinki) is outside
   AWS us-west-2. HLS-VI fill `-19999` → NaN; scale `0.0001`.
   - **Auth:** NASA Earthdata via **`EARTHDATA_TOKEN`** (EDL bearer) set on GDAL as
     `Authorization: Bearer` for `/vsicurl` reads. Username/password returned 401; the token works.
     **Token expires 2026-08-30** → regenerate at urs.earthdata.nasa.gov.
3. **Cloud/shadow mask** (`read.py:apply_fmask`) — read the granule Fmask band and drop pixels where
   bit0 (cirrus), bit1 (cloud), or bit3 (cloud shadow) are set.
4. **Zonal statistics** (`stats.py:zonal_stats`) — per index, compute
   `mean/min/max/std/p10/p50/p90/valid_pixels` over the masked field pixels.
5. **9 indices** (`indices.py`): `NDVI, EVI, SAVI, MSAVI, NDMI, NDWI, NBR, NBR2, TVI`. Preferred
   path reads the ready-made HLS-VI band per index (no recomputation); raw-reflectance fallback
   formulas exist for missing bands (traps: Red=B04 both sensors; NIR=B08 on S30 but B05 on L30).
6. **Persist** (`persist.py`) — upsert `scenes` (idempotent on the unique key) and `index_stats`
   (idempotent on `(scene_id, index_name)`), via **sync psycopg** (the batch job is separate from
   the async API pool).
7. **Clipped index COG per scene+index** (new this cycle) — `read.py:write_cog` writes a clipped,
   field-masked, float32/NaN-nodata **COG** to `/data/rasters/<field_id>/<scene_id>_<index>.tif`
   (COG driver, GTiff fallback for older GDAL), recorded in `index_rasters.storage_path`. These are
   what TiTiler serves.
8. **Advice trigger** — if any scenes were written, the worker POSTs
   `/api/internal/advice/run?field_id=...` with `X-Internal-Token` so the **API** (which holds the
   LLM key) regenerates AI advice. Best-effort; silently skipped if unreachable.

### TiTiler tile URLs
The API (`services/app/routers/indices.py`) builds XYZ tile-URL templates for the map overlay.
**The TileMatrixSet id `WebMercatorQuad` must be in the path** — the bare `/cog/tiles/{z}/{x}/{y}`
route 404s:
```
/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=<cog-path>&colormap_name=<cmap>&rescale=<lo,hi>
```
Colormap + value range are index-family adaptive (`_raster_style`):
- vegetation (`NDVI/EVI/SAVI/MSAVI/TVI`) → `rdylgn`, rescale `-0.1,0.9`
- water (`NDMI/NDWI`) → `rdbu`, rescale `-0.5,0.5`
- burn (`NBR/NBR2`) → `rdylgn`, rescale `-0.5,0.8`

### Index read endpoints (`services/app/routers/indices.py`, FREE for members)
- `GET /api/fields/{id}/indices/latest` — newest value of all 9 indices.
- `GET /api/fields/{id}/indices?index=&from=&to=` — time series
  `{ series: [{date, mean, p10, p50, p90}] }`. (The frontend plots `mean` with a faint p10–p90 band.)
- `GET /api/fields/{id}/scenes?index=` — one scene per date (least-cloudy), newest first, each with a
  ready TiTiler `tile_url`, plus `cloud_pct`.

---

## 8. Map / Infrastructure Layer

Benchmark: the Azercosmos **FarmerApp** (`farmer.gis.az`, built on the Esri ArcGIS Maps SDK). The
gap analysis + free/self-hosted improvement plan is in `docs/Infrastruktur_Layer_Tekmillesdirme.md`.
Map component: `app/src/components/FieldMap.tsx` (MapLibre GL v4, **native click-to-draw** — no
`mapbox-gl-draw`).

### Basemap gallery (`app/src/lib/basemaps.ts`)
Switchable, all **free/keyless with attribution**, choice persisted in `localStorage`
(`bagban.basemap`), applied imperatively so swapping the basemap doesn't tear down the field/draw
layers on top:
- **Hibrid** — Esri World Imagery + Esri reference labels (default)
- **Peyk** — Esri World Imagery
- **Buludsuz peyk** — EOX s2cloudless 2023 (renamed from "Sentinel-2 (buludsuz)" by the sensor-name
  sweep; the **attribution string keeps the full "Sentinel-2 cloudless 2023 — EOX (CC BY-NC-SA 4.0)"
  credit**, which is a licence requirement, not branding — §15.7)
- **Küçə** — OpenStreetMap
- **Topo** — OpenTopoMap

Plus a live lon/lat coordinate readout, geolocate, and navigation controls.

### Raster overlay + async processing UX
- **Async pipeline**: creating a field sets `data_status='queued'` (see `fields.py:create_field`); a
  cron worker (`deploy/process-queue.sh`, every 2 min) runs the geo pipeline newest-scene-first,
  writes the clipped index COGs, updates `data_progress_done/total` + `data_eta_seconds`
  (`AVG_SEC_PER_SCENE ≈ 6s`), and inserts a "data ready" notification.
- **Frontend**: a "Peyk məlumatı hazırlanır…" banner with a progress bar + honest ETA polls
  `GET /api/fields/{id}/data-status` until `ready`. The **satellite section**
  (`components/field/SatelliteTab.tsx`) then overlays the selected index as a pixel-level TiTiler
  raster, with an index-adaptive legend (Zəif/Orta/Sağlam for vegetation; Quru/Orta/Nəm for water),
  a scene timeline (date + cloud %, deduped to the least-cloudy scene per date), and translated
  index labels + one-line descriptions. The **status section** carries a smaller, deliberately
  reduced version of the same surface (`SatelliteGlance`, three indices) — §15.2.
  *(This paragraph used to name `OverviewTab.tsx`, which no longer exists.)*
- **Every map construction is gated on `useMapReady()`** — see §15.6.

---

## 9. AI Subsystem

Code: `services/app/ai/` — `llm.py` (adapter), `context.py` (context builder), `advice.py`,
`chat.py`, `wellness.py` (the 0–100 field score), `notify.py` (email transport: Resend HTTP with an
SMTP fallback) and the `emails/` package (§17). Provider/model/key from env
(`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`), never hard-coded.

### Provider-agnostic adapter (`llm.py`)
- `is_configured()` — true only if a key is present (`LLM_API_KEY` / `ANTHROPIC_API_KEY`). Gates
  everything so a missing key degrades gracefully.
- `complete_structured(system, user, schema)` — Anthropic path uses
  `client.messages.parse(..., output_format=schema)` (structured outputs) → a validated Pydantic
  model. Used for advice.
- `complete_text(system, messages)` — free-form chat.
- Default model `claude-opus-4-8`; only the Anthropic provider is wired today, but the interface is
  provider-agnostic by design (other providers raise `LLMUnavailable` until added).

### Context builder (`context.py`)
`build_field_context(conn, field_id)` assembles, through the RLS-scoped connection:
- **Satellite index trends** — `index_trends()` is restricted to **one sensor family** and the
  advice context asks for `sensor="S2"` (`_SENSOR_SQL` maps `S2 → i.sensor = 'S2'`,
  `HLS → i.sensor in ('S30','L30')`). For `NDVI, NDMI, NDWI, EVI, SAVI, NBR`: latest value + date,
  ~4-weeks-ago value, a `trend` label (`yüksəlir|düşür|sabit`), and 90-day min/max.
- crop metadata (crop/variety/soil/irrigation/growth stage/…),
- recent scouting (≤8), operations (≤8), open tasks (≤8), yields (≤5),
- the previous advice summary.
All dates are ISO-ified for JSON.

### Advice (`advice.py`)
`generate_and_store(conn, field_id, lang="az")`:
1. builds context → Claude (agronomist system prompt; `_lang_clause(lang)` appends the target-language
   instruction for anything but `az`) → structured
   `AdviceResult { summary, risks[{title, severity ∈ aşağı|orta|yüksək, detail}], recommendations, next_steps }`,
2. stores it in `public.advice` (`findings` jsonb + `input_snapshot` + provider/model + disclaimer +
   **`lang`**),
3. computes a **stable signature** of `(risk titles+severities, recommendation titles)`; if it
   differs from the previous advice (or it's the first advice), it creates an in-app
   `notifications` row — with the title taken from `_NOTIFY_TITLE[lang]`, because the notification
   body *is* the advice summary and a title in a different language would read as a bug.

**`severity` stays an untranslated code.** `aşağı | orta | yüksək` are DB values and drive the
notification severity; only the *label* is translated, on the frontend
(`wellnessText.ts:severityLabel()`), and an unrecognised value is shown verbatim so a new severity
can never make a risk invisible.

**No email is sent here.** The block that mailed the org owner the full advice body was deleted and
the call site carries a "do not re-add" comment: it fired after almost every new satellite scene
(every 2–3 days, per field) and bypassed the template system entirely — no idempotency ledger, no
opt-out gate, no unsubscribe link. Advice changes now reach the farmer's inbox only through the
weekly digest (§17).

**Trigger:** generated **automatically after each new satellite scene** — the geo worker calls
`POST /api/internal/advice/run` (`X-Internal-Token`) so the **API** (which holds the LLM key) does
the generation. That endpoint has no HTTP caller to take a language from, so it resolves the **org
owner's `users.locale`** (`fields → organizations → users`) and passes it as `lang`; before that it
passed nothing, which is why every automatically generated advice was Azerbaijani regardless of who
owned the field. Also exposed as `POST /api/fields/{id}/advice/generate` for a manual re-run.

### Chatbot (`chat.py`)
`answer(conn, field_id, user_id, message)` — context = field data + latest advice + last 12 chat
turns (`HISTORY_LIMIT`). Every turn is stored in `public.ai_chat_messages` (the user turn also keeps
a `context_snapshot`) so later turns stay history-aware.

### Field wellness score (`wellness.py`) — deterministic, no LLM call
One 0–100 number per field per day, assembled from four weighted components — `ndvi` (0.40),
`water` (0.25), `pest`, `gdd` — each computed from inputs that already exist in the platform.
Cheap enough to compute inside a GET (`GET /api/fields/{id}/wellness`, plus the org-wide read model
`GET /api/orgs/{id}/wellness`). Two rules are load-bearing and written into the module docstring:

- **Honesty rule** — a component whose input is unavailable is **dropped**, its name recorded in
  `missing`, and the remaining weights renormalized. A missing input is never scored as zero. With
  every component missing there is no score at all (`available: false`), not a fabricated one.
- **Proxy rule** — when a component is scored from a *stand-in* signal rather than its real
  measurement (today: NDMI standing in for the FAO-56 soil-water balance), it must not speak with the
  authority of the real one. Concretely, a proxy-sourced component (1) is compressed into
  `_PROXY_MIN.._PROXY_MAX` = **25..85** over the NDMI domain `-0.20..0.40`, so it can neither reach
  "critical" nor certify "perfect"; (2) carries its **own** `label_code` (`water.ndmi` →
  "Peyk nəmlik siqnalı"), never the label of the measurement it stands in for; (3) can never be named
  as the deciding "worst" component while a real measurement is present, and cannot on its own push
  the tone to `bad` (the tone is floored to `warn`). The **score itself is left unchanged** — the
  proxy did move it, and hiding that would be its own lie; what is refused is the *label*.

Displayed weights are apportioned with **largest remainder** (`_apportion`) into integers summing to
exactly 100 and emitted as `weight_pct`; rounding each share independently used to render "62% + 39%
= 101%". The float `weight` is still emitted alongside it, so any new consumer must prefer
`weight_pct` (`FieldPulse` does: `weight_pct ?? Math.round(weight * 100)`) — stored rows from before
the change have no `weight_pct`, which is why the fallback exists.

`headline_from_components(score, tone, comps)` rebuilds the headline from a **stored** `components`
jsonb and is shared by the field read path and the org read model, so both surfaces apply the same
proxy rules. A third headline surface must use it too.

### Frontend + endpoints
The **"Sahə analizi"** section (`app/src/components/field/AiTab.tsx`, `?tab=analysis`) shows the
advice card (severity chips, recommendations, next steps, disclaimer, "Yenidən analiz et") + live
chat. Its actionable half is *also* summarised on the status section by `SignalsActions`, which
reads the same endpoint rather than a new one (§15.2).
- `GET/POST /api/fields/{id}/advice` and `/advice/generate` — the GET response carries `lang` and
  `lang_mismatch` (§16.5); `/advice/generate` answers a spent monthly quota with **429
  `advice_quota_exceeded`** (it used to return a `200` carrying `{"quota_exceeded": true}`, which
  every caller read as success)
- `GET/POST /api/fields/{id}/chat`
- `GET /api/notifications`, `POST /api/notifications/read`
- internal `POST /api/internal/advice/run`

> **Caution:** `advice.generate_and_store()` still *returns* `{"quota_exceeded": True, …}` as a plain
> dict rather than raising. Only `routers/advice.py` converts it to the 429; other callers — notably
> `POST /api/internal/advice/run` — treat the dict as a successful result and report `ok: true`, so a
> quota refusal looks like a success in the cron log.

### Provider state
`LLM_API_KEY` is **set in production and AI is active** (`LLM_PROVIDER=anthropic`). The graceful
no-key path still exists and is still the behaviour if the key is ever removed or rotated out:
advice returns `null` / `configured:false` and `generate`/`chat` return **503 `ai_not_configured`**.
Model selection is per tier (`ai/tiers.py`); `LLM_MODEL` is the fallback default.

---

## 10. Deployment Topology & Networking

### Server
- Hetzner server **bagban-ai**, type **CPX22**, Helsinki, public IPv4 **95.216.208.82**
  (Primary IP kept across recreate), Hetzner project **AGRADEX-TEST**.
- Operator Mac SSH key (`~/.ssh/id_ed25519`, comment `macbookpro`) authorized on
  `root@95.216.208.82` (added in `deploy/cloud-init.sh`).
- `/opt/bagbanai` is a **git checkout tracking `origin/main`** (public repo;
  `git config safe.directory /opt/bagbanai` set). Git remote `origin` is the **SSH** URL
  `git@github.com:shahbazseyidli/bagbanai.git` (HTTPS push was hanging; SSH works).

### Redeploy
```
cd /opt/bagbanai && bash deploy/update.sh
```
`update.sh`: `git pull --ff-only` → **source .env** → `docker compose -f deploy/docker-compose.prod.yml
up -d --build api web titiler` → `nginx -t && reload`. **`update.sh` MUST source `.env`** or `api`/`web`
get a blank `DATABASE_URL` and crash-loop.

### Networking
- All app ports bound to `127.0.0.1` (`8000` api, `3000` web, `8001→80` titiler, `5432` db,
  `5678` n8n), fronted by the **host nginx**.
- Live vhost `/etc/nginx/sites-enabled/agradex.com` has two server blocks:
  **:80** (no forced redirect — loop-safe under Cloudflare Flexible) and **:443** (Let's Encrypt
  cert). Locations in each: `/titiler/ → 127.0.0.1:8001/`, `/api/ → 127.0.0.1:8000`,
  `/ → 127.0.0.1:3000`. Repo copies: `deploy/nginx-agradex.conf`, `deploy/nginx-agradex-http.conf`.
  (Harmless "conflicting server_name" warnings from a leftover duplicate block — cleanup pending.)
- **SSL**: Let's Encrypt on origin (`/etc/letsencrypt/live/agradex.com/`, certbot auto-renew).
  Cloudflare A `@`/`www` proxied; SSL mode **Full (Strict)** ✅ (verified 2026-07-16) — CF↔origin
  encrypted end-to-end.

### Secrets — `/opt/bagbanai/.env` (backup `/root/agradex.env.bak`)
`POSTGRES_USER/PASSWORD/DB`, `JWT_SECRET`, `INTERNAL_API_TOKEN`, `EARTHDATA_TOKEN` (EDL bearer,
**expires 2026-08-30**), `LLM_PROVIDER/LLM_MODEL/LLM_API_KEY` (**set — AI is active**),
`RESEND_API_KEY` + `EMAIL_FROM` (**set — email is active**; values containing spaces must be quoted
because `update.sh` sources the file), `NEXT_PUBLIC_PANEL_HOST` + `COOKIE_DOMAIN` (the host split,
§15.5), `SEARCH_PROVIDER`, `NOMINATIM_BASE`, `EPPO_TOKEN` (empty), `TELEGRAM_*` (empty),
`SMTP_*` (empty — the legacy fallback transport).
**No new environment variable was introduced by the most recent cycle** — the deploy needed only
migrations plus an image rebuild. `docs/OPERATIONS.md` owns the authoritative secrets table.

### Cron jobs (root crontab, PATH set)
The **authoritative cron inventory is `docs/OPERATIONS.md`** — it is not repeated here, because two
copies of the same table is exactly how these two documents drifted apart. The structurally
significant ones for this document:
- **Satellite refresh + queue worker** — the daily HLS/S2 refreshes (`track=0`: write new
  scenes/rasters, do **not** reset `data_status` or re-notify) and the every-2-minute new-field queue
  worker (`data_status='queued'` → geo pipeline, `track=1`).
- **The weekly digest** — `0 3 * * 3` → `deploy/lifecycle-emails.sh` → `POST
  /api/internal/emails/lifecycle/drain`. Wednesday 03:00 UTC = 07:00 Asia/Baku (AZ is UTC+4, no DST).
  This **replaced a daily `15 6 * * *` behavioural drain** (§17). A shell script cannot edit root's
  crontab: if the live crontab line was never changed, the drain runs daily — harmless, because the
  ISO-week dedup key makes every run after the first a no-op, but the digest then lands on the old
  weekday.

### Migrations & seeds
Migrations are applied in order and tracked in `public.schema_migrations`. **`deploy/update.sh` does
not apply them** — it only pulls, sources `.env`, rebuilds `api`/`web`/`titiler` and reloads nginx,
so migrations are always a separate, manually ordered step. `db/migrate.sh` does not run on this host
as written (it needs `psql` and a `DATABASE_URL`, neither of which exists there, and the `db` service
publishes no host port); the working procedure is in `docs/OPERATIONS.md`. See §6.1 for the ordering
constraint the newest four migrations impose.

---

## 11. Security Model (summary)

- **Transport**: Cloudflare → nginx TLS (:443 LE cert). All app ports bound to loopback only.
- **AuthN**: own JWT in an httpOnly `bagban_session` cookie (bcrypt password hashes; passwords never
  stored in files).
- **AuthZ**: primary server-side gating in `deps.py` (`require_member/require_role/require_paid`);
  RLS defense-in-depth via `current_user_id()` + `is_org_member/has_org_role/org_is_paid`.
- **Internal endpoints**: `X-Internal-Token` (`require_internal`) — used by the geo worker to reach
  the API for advice generation; the LLM key never leaves the API container.
- **Tenancy**: `org_id` denormalized everywhere; access chain `field → farm → organization →
  membership`. PAID tables additionally gated by `org_is_paid()`.
- **Secrets**: only in `/opt/bagbanai/.env` (+ backup), never committed.
- **Pipeline egress**: windowed COG reads only; Earthdata bearer token, not credentials.

---

## 12. Deviations from the Original Spec (and why)

The spec assumes Supabase and a fully paid product. The user deliberately deviated; the spec is read
**with** these deviations:

1. **No Supabase — everything self-hosted on Hetzner.**
   - DB: self-hosted Postgres 16 + PostGIS instead of Supabase Postgres.
   - Auth: own JWT (`public.users` + bcrypt + PyJWT httpOnly cookie) instead of Supabase Auth. Every
     `auth.users(id)` → `public.users(id)`.
   - RLS: uses `current_setting('app.user_id')` via `public.current_user_id()` instead of
     `auth.uid()`; primary enforcement is server-side FastAPI gating.
   - Storage: local Hetzner volume (`./storage`, `object_storage_driver=local`) instead of Supabase
     Storage; S3-compatible later.
2. **Billing deferred.** `org_subscriptions` + `org_is_paid()` gating are kept so PAID features close
   correctly (HTTP 402), but there is **no Stripe/PSP** integration; new orgs default to `free`.
3. ~~**Domain `agradex.com` root** (no subdomain).~~ **Superseded.** The product runs on **two**
   hosts: `agradex.com` is the marketing apex and `app.agradex.com` is the application. The apex
   keeps the brand and everything a crawler or a signed-out visitor should see (including `/s/`
   share links); the app host carries the app chrome. See §15.5.

---

## 13. Open Follow-ups / TODO

- ~~Add `LLM_API_KEY` … to activate AI~~ — **done**, AI is live (§9).
- ~~Cloudflare SSL → Full (Strict)~~ — **done**, verified 2026-07-16.
- **nginx** duplicate `server_name` cleanup (harmless warning today), and the checked-in vhost copies
  do not declare `app.agradex.com` — reconcile `deploy/nginx-agradex*.conf` with the live file (§3).
- **`EARTHDATA_TOKEN` expires 2026-08-30** → regenerate at urs.earthdata.nasa.gov and update `.env`.
- Remaining Sprint-2 map items (`docs/Infrastruktur_Layer_Tekmillesdirme.md §6`): cloud-cover filter
  UI, two-date compare/swipe, country/rayon NDVI benchmark, PDF/DOCX reports, official cadastre
  layer, geocoding search, hillshade/terrain.
- **Phase 2** (spec §28): weather (Open-Meteo) + models (GDD/spray/frost/drought), rule engine →
  multi-channel notifications, reports, baseline/anomaly/phenology, billing (Stripe/PSP).

---

## 14. Reference Fields (for live testing)

- **"test lecet"** — `860891bd-912c-4ec3-9235-b7d4d0193190` (fully processed: ~962 `index_stats`
  rows + clipped COGs).
- **"Findiq sahesi 1"** (demo) — `4a08ee8a-4123-4fe5-a07f-ed24c69c5604`.
- **"Xudat fındıq sahəsi"** — `8e046b22-cbbf-4e54-b201-7e973d9106b9`.
- **Demo login**: `demo@agradex.com` / `AgradexDemo2026`.

---

## 15. Frontend Structure & Routing

### 15.1 The field page: sections are the routing model (`lib/fieldSections.ts`)

`app/src/lib/fieldSections.ts` is the **single source** of the field page's taxonomy. It exports:

- `SectionKey` — 16 literals: `status · satellite · analysis · weather · zones · tasks · fertilizer ·
  photos · scouting · operations · yields · harvest · season · soil · metadata · documents`
- `GroupKey` — `monitoring | work | records`
- `SECTION_GROUPS` — the reading order, **5 monitoring / 7 work / 4 records**, each section carrying
  an `I18nKey` label and a string `IconName`
- `DEFAULT_SECTION = "status"`, `ALL_SECTIONS`, `sectionOf()`, `groupSections()`, `resolveSection()`,
  `sectionHref()`
- `GROUP_OF` — **derived** via `Object.fromEntries(SECTION_GROUPS.flatMap(…))`, never hand-written

**The section keys ARE the `?tab=` values.** Routing is therefore a pure data lookup: the URL carries
a key, `resolveSection()` validates it, and the page renders the matching block.

Two things forced this out of `app/src/app/fields/[id]/page.tsx`, where the old
`TabKey`/`TABS`/`GROUPS`/`GROUP_OF` quartet lived: the desktop shell (`FieldListPanel`) now renders
the section menu and **the shell must not import a page**; and `GROUP_OF` used to be a hand-maintained
inverse of `GROUPS`, so one forgotten line made `GROUPS.find(...)!` throw *on render*. The page now
calls `groupSections()`, which returns `[]` instead of throwing.

**Renamed keys, and deliberately no alias table.** `overview → status`, `sentinel2 → satellite`,
`ai → analysis`, and `nasa` was deleted outright. The reasoning is written into the file header: the
product has only test users, every internal link builder was updated with the rename, and *a
compatibility shim for a compatibility problem we do not have would outlive anyone who remembers why
it exists*. `resolveSection(raw)` returning `DEFAULT_SECTION` for an unknown value is ordinary
robustness against a truncated or hand-edited URL — **not** legacy support.

> **Consequence to know:** an old bookmark, email or notification link carrying `?tab=overview`,
> `?tab=ai`, `?tab=sentinel2` or `?tab=nasa` silently opens "Sahənin vəziyyəti". No redirect, no 404,
> no notice. Reintroducing an alias map is a ~5-line change in `resolveSection()` — read the header
> comment first; the absence is a decision, not an oversight.

**Two navigations, never both on screen.** `app/src/components/shell/FieldSectionMenu.tsx` renders the
second-level menu inside the desktop left panel (the string `IconName` is resolved to a lucide
component through a local 16-entry `ICONS` record); the field page's horizontal chip row gained
`xl:hidden` and the panel is `hidden … xl:flex`. Above `xl` an `<h2>` in the content column names the
open section, because the chips that used to say so are hidden. `FieldSectionMenu` builds hrefs
against `/fields/${fieldId}` and **never** against `usePathname()` — the panel can be mounted on a
non-field route while a field is still "active", so a pathname-derived href would link to the wrong
page; the active state additionally requires `pathname === base`.

`FieldListPanel` collapses when a field is open: a `browsing` state (reset by
`useEffect(() => setBrowsing(false), [activeId])`) hides the search/sort row and the scrolling list,
leaving one collapsed card (score chip + name + area), an "all fields (N)" button, and
`<FieldSectionMenu fieldId={focused.id} />` below it — with a field open the panel belongs to that
field.

**Labels.** The renames landed as **new** i18n keys rather than edits of the old ones:
`app.field.section.status` = "Sahənin vəziyyəti", `app.field.section.satellite` = "Peyk görüntüsü",
`app.field.section.analysis` = "Sahə analizi", plus `app.field.group.monitoring | work | records`.
The superseded keys (`field.tab.overview`, `field.tab.sentinel2`, `field.tab.nasa`, `field.tab.ai`,
`app.fieldDetail.groupVaziyyet | groupIsler | groupMelumat`) are **still present in all 8 locale files
and referenced by nothing** — do not read their presence as evidence of a live surface.

### 15.2 The merged status section

`OverviewTab.tsx` (328 lines) and `WellnessCard.tsx` (196 lines) were **deleted**. Stacked, they ran
to roughly a thousand pixels and said the same thing twice — the score, then the sentence explaining
the score. They are replaced by `app/src/components/field/overview/`:

| File | Role |
|---|---|
| `FieldPulse.tsx` | The verdict. SVG score ring, headline via `wellnessHeadline(headline_code, headline_params, headline)`, area via `useFormatArea()`, per-component bars in the fixed order `["ndvi","water","pest","gdd"]` using `weight_pct ?? Math.round(weight*100)`, a reason line per component, a "what the platform could not see" line built from `missing`/`missing_labels`, a `SpeakButton`, and a refresh hitting `/api/fields/{id}/wellness?refresh=1`. The rule it enforces: **the score is never shown alone** — every component that fed it is listed with its own sub-score and weight, and anything the platform could NOT see is named (§9). |
| `SatelliteGlance.tsx` | The right-sized map. Exactly three index chips (`GLANCE_INDICES = ["NDVI","NDMI","NDRE"]` — cover, moisture, nitrogen), `DisplayMap` at normal size, a fixed colour ramp + legend, a scrollable strip of the 8 newest dates with value and cloud %, a 4-scenes-back delta, an "open full section" button, and a data-saver gate that fetches no raster until tapped. Sensor is hard-coded (`…/scenes?index=…&sensor=s2`). All nine indices, the cloud slider, contrast, two-date compare and the trend chart stay in the satellite section, one button away — offering nine here "would rebuild the workbench we just simplified away". |
| `SignalsActions.tsx` | "Siqnallar və görülməli tədbirlər". Summary, at most `MAX_RISKS = 3` risks with severity chips, at most `MAX_ACTIONS = 4` actions (from `next_steps`, falling back to recommendation titles), disclaimer, hand-off to the analysis section. Reads the **same** `GET /api/fields/{id}/advice` as `AiTab` — no new endpoint — and is explicitly a summary, not a second copy of `AiTab` (no chat). A fetch failure is swallowed so the status page cannot break. |
| `MetadataNudge.tsx` | The dismissible completeness strip under `FieldPulse`: at most two ranked gaps, each expanding into an inline editor, a 14-day `localStorage` snooze, `PUT /metadata` as a full-object replace, and a one-tap region accept fed by `GET /api/geo/site` on the stored centroid. Honesty rule in its header: it never claims the score or the diagnosis is wrong, only that the **advice** gets sharper. |
| `completeness.ts` | One place decides *which* missing metadata is worth asking for, in which order, and what it unlocks: `GapKey = crop_type \| planting_date \| irrigation_method \| soil_type \| region`, `META_GAPS` (each with an i18n `actionKey`/`unlockKey` and an honest `seconds` estimate), `MAX_GAPS = 2`, `missingMetaGaps()`, `topMetaGaps()`. Shared by `MetadataNudge`, `FieldOnboarding`'s step-4 note and `OnboardingChecklist` so the wording and ranking cannot drift. A `null` meta means every gap is open. |

`crop_type` is the **first** ranked gap and the strip renders even when the passport row does not
exist: `save()` bails only when neither the stored meta nor the patch carries a crop, and
`toPayload()` treats a null meta as `{}` because `PUT` upserts. Before that, a field with an empty
passport (imported, or created before the wizard asked) showed the farmer an AI complaining that crop
type / planting date / soil / irrigation were not recorded and offered no way to record any of them
from that screen — the checklist that owned the case lives on the home screen.

**Content order of the status section:** `RainNowcast → FieldPulse → SatelliteGlance →
SignalsActions → ShareButton`. `SeasonCompareChart` moved **out** of it into the `season` section (a
multi-season chart is a records artefact). `FieldMapSheet`'s full-bleed hero map was deleted so the
page opens on the verdict instead of on scenery; the wrapper survives only to own the camera FAB and
the page layout.

> **Known leftover:** `FieldMapSheet.tsx` still issues a `GET /api/fields/{id}/scenes?index=NDVI&sensor=s2`
> on every field open whose result is now unused, and `dataSaver` / `forceRaster` / the `DisplayMap`
> and `Layers` imports are dead after the hero-map removal. It survived the production build, so
> unused vars are not error-level here.

### 15.3 The `/farm` module container

Dəftər / Satış / Anbar / Texnika used to be four top-level rail destinations — a disproportionate
share of a rail the farmer reads on every visit, for records opened weekly at most, and four views of
**the same object** (the farm business, not a field). They are now `?tab=` sections of one container
route:

- `app/src/app/farm/page.tsx` — the container, rendering four sections.
- `app/src/lib/farmSections.ts` — same shape as `fieldSections.ts`: `FarmSectionKey =
  ledger | sales | inventory | equipment`, `FARM_SECTIONS`, `DEFAULT_FARM_SECTION = "ledger"`,
  `resolveFarmSection()`, `farmSectionHref()`. **The section keys deliberately equal the old route
  slugs**, so `/sales → /farm?tab=sales` is a mechanical mapping and the redirects cannot drift from
  the list.
- `app/src/components/farm/{Ledger,Sales,Inventory,Equipment}Section.tsx` — the four page bodies moved
  **verbatim**, one level down. Nothing was removed; each section keeps its own auth/org guards.
- `app/src/lib/farmRedirect.ts` — `farmQuery()` copies every incoming query param except `tab` and
  appends the container's tab.
- `app/src/app/{ledger,sales,inventory,equipment}/page.tsx` are now ~10-line server components calling
  ``redirect(`/farm?${await farmQuery(searchParams, "<tab>")}`)``.

> **`redirect()` (307), not `permanentRedirect()` (308) — on purpose.** A permanent redirect is cached
> by the browser forever, so reverting the consolidation would strand anyone who had visited the old
> URL. (`/yenilikler → /whats-new` *does* use 308, because that rename is final. Do not "harmonise"
> the two.)

`middleware.ts` keeps `/farm` **and** the four legacy slugs in `APP_PREFIXES`, so the redirect happens
on the app host instead of bouncing to marketing. In-app deep links were repointed rather than left to
the redirect (e.g. `HarvestTab`'s sale links now go straight to `/farm?tab=sales&field=…&lot=…&org=…`);
the redirect exists for bookmarks and anything already sent out.

### 15.4 Navigation surfaces

- **`AppRail`** (desktop): "five destinations, down from eleven" — Bu gün · Sahələr · Təsərrüfat ·
  Hesabatlar · Daha çox — with notifications/account in a secondary footer group pinned to the bottom
  and the two marketplace entries conditionally inserted (below). Yerlər moved to `/more`, which
  already listed it. *(The `farmSections.ts` header says "thirteen" where `AppRail.tsx` says "eleven";
  the two comments disagree on the old total.)*
- **`BottomNav`** (mobile): the `/notifications` slot became `/farm`, and `isActive` now matches on a
  **path-segment boundary** (`pathname === href || pathname.startsWith(href + "/")`). That change is
  load-bearing: `/farms` (the farms screen) starts with `/farm`, and a raw prefix match lit the wrong
  tab. Notifications stay reachable because the top `Nav` renders `NotificationBell` on mobile.
- **`/more`**: the four module rows collapsed into one "Təsərrüfat" row and a "Bildirişlər" row was
  added.
- **`app/src/lib/navFlags.ts`** — `export const SHOW_MARKETPLACE_NAV: boolean = false;` hides
  `/catalog` (supplier marketplace) and `/chat` (farmer community) from the rail, the bottom nav and
  `/more`. Both surfaces are fully implemented and currently **empty**; a marketplace with no
  suppliers and a community with no conversations advertise emptiness exactly where the farmer is
  looking for value. This is **not** a kill switch: routes, API and components stay live, deep links
  work, and the landing still links to `/catalog`. The explicit `: boolean` annotation is deliberate —
  without it TypeScript infers the literal `false`, narrows every ternary to its else branch and
  reports the enabled branch as dead code.
- **`/fields`**: the multi-field map and the org-wide `GET /api/fields/geo` fetch were removed from the
  list screen (every row already carries name, area and wellness score, and the field's own page has a
  map), the layout became a single `max-w-3xl` column, and a per-row `<ShareButton>` was added as a
  **sibling** of the row `<Link>` — an `<a>` may not contain a button. `FieldsOverviewMap` itself was
  **not** deleted; it still renders on the app dashboard (`TodayHome`) and the admin page.

### 15.5 App/marketing host split — resolved server-side

`agradex.com` is marketing, `app.agradex.com` is the app, and **the decision is made from the request,
not in the browser.**

**What it used to be, and why that broke.** `lib/host.ts` exported a client `useIsAppHost()` that
detected the host in a mount effect. The server therefore had to render something host-agnostic — and
the home page's landing branch sat *behind* the auth loading gate (`if (loading) return <Spinner/>`),
which on the server always starts `true`. Every crawler got a spinner where the marketing page should
be. The measurement recorded at the time: the home page was **12.5 KB with zero `<h1>` and zero `<p>`**,
while `/pricing`, `/how-it-works`, `/solutions` and `/status` already server-rendered 83–152 KB with
real headings. (That also corrected a strategy review's claim that the whole site rendered
client-side — only the home page did.) *No after-measurement exists anywhere in the repo: the fix is
asserted structurally, not measured.*

**How it works now.**

1. `app/src/middleware.ts` computes `onAppHost` from the `Host` header against `PANEL_HOST`
   (`reqHost === PANEL_HOST || startsWith("app.") || startsWith("panel.")`; when `PANEL_HOST` is empty
   the split is off and every host is the app host — the pre-split behaviour) and sets three **request
   headers**: `x-app-host` (`"1"`/`"0"`), `x-locale`, and `x-pathname` (the **locale-stripped** path).
2. `app/src/app/layout.tsx` reads `x-app-host` and wraps the tree in
   `<AppHostProvider value={h.get("x-app-host") !== "0"}>`.
3. `useIsAppHost()` reads that context; the old mount-effect detection survives only as a fallback for
   a tree rendered outside the provider.
4. `app/src/app/page.tsx` moved `if (!appHost) return <Landing />;` **above** `if (loading)`. The apex
   is always marketing and the host is known from the request, so the branch is taken during SSR.

Side benefit: the app host no longer flashes marketing before correcting itself.

**`lib/host.ts` → `lib/host.tsx`.** The extension had to change because the module now exports a JSX
provider. The import specifier `@/lib/host` is unchanged at every call site — so searching for the old
filename finds nothing while every import still resolves. Exports: `PANEL_HOST`, `APEX_HOST`
(`PANEL_HOST` with a leading `app.`/`panel.` label stripped), `SHARED_COOKIE_DOMAIN` (`.${APEX_HOST}`),
`AppHostProvider`, `useIsAppHost()`, `publicUrl()`. `APEX_HOST`/`PANEL_HOST` used to be duplicated
inside `Nav.tsx` and are now imported from here.

**`publicUrl(path)`** builds share and invite URLs against `APEX_HOST` instead of
`window.location.origin`. Links minted inside the app pointed at `app.agradex.com/s/…`, and the app
host bounces signed-out visitors to `/login` — the exact people a share link exists for. Used by
`ShareButton`'s `absUrl()` and by the team invite link.

**Middleware ordering that must not change.** On the app host, the public-path allowlist
(`/pricing`, `/solutions`, `/how-it-works`, `/finduq`, `/guide`, `/whats-new`, `/yenilikler`,
`/status`, `/s/*`) runs **before** the auth gate and redirects to the apex *with the locale prefix*.
It was moved there specifically because `/s/` share links are public by design; putting it back below
`if (!hasAuth)` silently reinstates the login wall for every share link and team invite.

**SEO consequences of knowing the host on the server.** `layout.tsx`'s static `export const metadata`
became `export async function generateMetadata()`, which reads `x-locale` and `x-pathname` and emits a
per-request **canonical** plus `alternates.languages` for every entry of `LOCALES` **plus
`x-default`**, all pointing at the marketing apex derived from `NEXT_PUBLIC_PANEL_HOST`. There were no
hreflang alternates at all before, so the language versions of a page competed with each other. The
hard-coded Azerbaijani description became the i18n key `landing.metaDescription`.

> **Gotcha:** `layout.tsx` computes `appHost = h.get("x-app-host") !== "0"`, i.e. a **missing header
> means APP host** — the opposite of the old client default. The middleware matcher
> (`/((?!api|_next|sw.js|manifest.webmanifest|icon.svg|favicon.ico|.*\..*).*)`) covers every HTML
> route today, but any future path excluded from it would render as the app host.

`Nav.tsx` follows the same principle: the marketing links are gated on `appHost`
(`const links = appHost ? [] : marketingLinks`) rather than on being signed out, and the mobile
hamburger renders whenever `resolved && (!appHost || !user)`. Previously a signed-in visitor on the
marketing apex lost the whole menu and, on mobile, the hamburger with it — leaving a phone visitor no
way to change language at all.

### 15.6 Every map waits for a real animation frame (`lib/useMapReady.ts`)

`useMapReady()` returns `false` until the first `requestAnimationFrame` callback actually **fires**,
re-arming on `visibilitychange → visible`. All **five** MapLibre constructions are gated on it —
`FieldMap`'s `DrawMap`, `DisplayMap` and `CompareMap`, `FieldsOverviewMap`, and `ZonesTab`'s
`ZonesMap` — each with `if (!ready || …) return;` and `ready` in the effect's dependency array.
**Any new map must do the same.**

Root cause, diagnosed on the live page by reaching the MapLibre instance through the React fiber and
reading its private state (`style._loaded === false`, `style.stylesheet === null`, `sourceCaches`
empty, `style._frameRequest` still pending): MapLibre's `Style.loadJSON` does not parse the style
inline — it awaits one animation frame (`browser.frameAsync`) and **swallows the rejection** if that
frame never arrives. A background tab produces no frames, so a map constructed there never loads its
style: `load` never fires, no tiles are requested, nothing is drawn, **no error is raised**, and
MapLibre never retries when the tab is later shown. Users reach this via middle-click /
open-in-new-tab, a restored session, or a PWA warm start. `requestAnimationFrame` is used rather than
`document.visibilityState` because a minimised or occluded window can report `"visible"` while
throttled.

Symptom to recognise: correctly sized canvas, live WebGL context, working zoom controls, legend
drawn — and no tiles, no console error.

> An earlier, separate fix in `FieldsOverviewMap` (attach `load`/`styledata`/`idle` listeners **before**
> any draw; route every draw through a try/catch `drawSafe`) is still in the code and looks like the
> remedy for this bug. It is not — it addressed a real ordering defect (`isStyleLoaded()` can report
> true while `addSource` still rejects with "style is not done loading", and that throw escaped the
> effect before the listeners were registered), but it was attempt #1 against a wrong diagnosis.

### 15.7 HLS is hidden from the UI by one boolean (`lib/sensors.ts`)

`HLS_ENABLED = false` is a **UI-only** switch. The data layer is untouched: the geo pipeline, the
daily HLS cron, stored `S30`/`L30` rows, the regional benchmark SQL, the retrospective backfill and
the productivity-zone computation all still read HLS, and `sensorFamily()` keeps resolving
`hls`/`s30`/`l30` regardless, because rows tagged with those codes still flow into the app.

Alongside it: `UI_SENSORS`, `sensorVisible()`, and — importantly — `SENSOR_META` (a frozen const
record) became **`sensorMeta(sensor)`, a function**, because the labels go through `t()` and must
resolve at render time in the active locale; a module-level const captured whichever locale loaded
first. The non-textual half (`res_m`, `color`) stayed a const in `SENSOR_STYLE`. Sentinel-2's
user-facing name lives in `app.sensor.s2.label` ("Peyk görüntüsü · 10m"), `.short` and `.note`.

The `nasa` field section was deleted, the page renders `<SatelliteTab field={field} sensor="S2" />`
unconditionally, and `ZonesTab`'s sensor picker was removed. `SatelliteTab`'s in-field p10–p90 spread
lines were un-gated from `sensor === "HLS"`, because `persist_scene` writes p10/p90 for every sensor
and the gate would have deleted the band from the UI the moment NASA stopped being shown.

**Attribution deliberately survives the sweep** — it is a licence obligation, not branding:
`/status` still lists "NASA HLS (Harmonized Landsat–Sentinel)" as a source, the marketing meta
description still names NASA HLS / Sentinel-2 / Open-Meteo, the EOX basemap keeps its
"Sentinel-2 cloudless 2023 — EOX (CC BY-NC-SA 4.0)" string, and the required "Contains modified
Copernicus Sentinel data 2026" notice was added to the sources block in every translated locale.

> **The "one-boolean rollback" is not literally true today.** Nothing outside `sensors.ts` currently
> consumes `HLS_ENABLED`, `UI_SENSORS` or `sensorVisible()`: the field page hard-codes
> `sensor="S2"` and `SECTION_GROUPS` has no HLS section. A real rollback also needs a section entry in
> `fieldSections.ts` and a second `SatelliteTab` instance. Do not delete the HLS branches as dead code
> — but do not expect flipping the constant alone to restore anything either.

### 15.8 The landing quiz: anonymous answers that survive signup

The marketing hero is a four-question quiz (`components/landing/OnboardingQuiz.tsx`) — which crop,
country + region, current difficulty, what you need — ending in a result step and the signup CTA. It
took the hero slot from the live map, which moved below the role cards and kept its `#live-demo`
anchor. Single-choice steps auto-advance, only the multi-select needs Continue, every step is a real
`<button>`/`<select>`, focus moves to the new question heading, and the whole thing is skippable.

`lib/onboardingQuiz.ts` holds the shape (`QUIZ_KEY = "agradex.onboarding.v1"`, `QuizAnswers`, the crop
/ challenge / need / country lists, `countryName()` via `Intl.DisplayNames`, load/save/clear over
`localStorage`). **Answers are kept in canonical form** — the crop uses the same `snake_case` value as
the field wizard and `crop_thresholds`, so it can be written straight into `field_metadata.crop_type`
and already has an `app.meta.crop.*` translation in every language.

The path from browser to account:

1. `/signup` prefills country + region from `loadAnswers()`, posts `onboarding: loadAnswers()` in the
   signup body (`SignupIn.onboarding`), and calls `clearAnswers()` on finish — a visitor never types
   the same answer twice.
2. The server whitelists it before it touches the database (`_clean_onboarding()`: five string keys
   trimmed to 80 chars plus `needs` ≤ 12 × 40 chars) — the quiz is anonymous input — and stores it in
   `users.onboarding` (migration `0046`).
3. `FieldOnboarding` fetches `GET /api/auth/onboarding` on mount and seeds crop (+ derived crop cycle)
   and region into the wizard, **only where the farmer has not already typed something**.
4. `_apply_onboarding_to_fields()` backfills existing fields: an `insert … on conflict` that fills
   `crop_type` only when the stored one is blank and `region` only via
   `coalesce(nullif(trim(region),''), excluded.region)`. It never overwrites a farmer-set value, and
   `crop === "other"` counts as no crop. (`crop_type` is `NOT NULL`, so a field with no metadata row
   can only be seeded when a crop is known.)

> **Status: partial.** `POST /api/auth/onboarding` — the endpoint that runs step 4 — has **no caller
> anywhere in `app/src`**. Quiz answers reach the database exclusively through the signup body, so
> `_apply_onboarding_to_fields()` does not run in production today; it is reachable only by calling the
> endpoint directly.

---

## 16. Localisation Architecture

The governing idea: **the backend never hands the frontend a finished sentence it could have
composed**, and prose that genuinely *must* be generated (LLM advice) is generated **once per
language and stored**, not translated on read.

### 16.1 Locales and routing

Eight locales — `az` (default and the complete source dictionary), `en, ru, tr, de, hu, it, pl`.
`az` is unprefixed; the other seven are path-prefixed. Wiring points, all of which a new locale must
touch: `Locale` / `LOCALES` / `LOCALE_NAMES` in `lib/i18n.ts`, `PREFIXED` in `middleware.ts`, `DICTS`
in `lib/i18n-server.ts`, `registerDict()` in `LocaleProvider.tsx`, and the overlay in
`lib/contentI18n.ts` for long-form content. hreflang needs no edit — `layout.tsx` builds the
alternates from `LOCALES` (§15.5).

Middleware resolves the locale as **prefix → cookie → `accept-language`** (a first-time visitor whose
browser language is one of the seven is redirected once to the prefixed URL), then passes it on as the
`x-locale` request header. The `bagban_locale` cookie is written with `domain: .agradex.com` when the
split is on, so a language chosen on marketing survives the hop to the app; a host-only cookie made
the app host fall back to browser detection every time.

Translation lookup: `t(key)` (typed against the `az` dictionary), `tf(key, params)` (interpolates
`{placeholder}` tokens and accepts any key string, which is what makes backend codes renderable), and
`tp(base, n)` (§16.4). Server Components cannot use `t()` — it reads module-level client state — and
must use `getT()` from `lib/i18n-server.ts` instead.

### 16.2 `X-Locale`: the client states its language

`app/src/lib/api.ts` sends **`X-Locale: getLocale()`** on every GET/POST/PUT/PATCH/DELETE and on the
multipart upload, via a shared `headers()` helper.

Why a header and not the cookie: **a browser can hold more than one `bagban_locale` cookie.** The app
host and the marketing apex are separate hosts, so a host-only cookie from before the split coexists
with the `.agradex.com` one. Next's `cookies.get()` returns the *first*, Starlette's cookie dict keeps
the *last* — so the interface could render in one language while the backend wrote prose in another.
The header is whatever `t()` is about to render with, so nothing is left to infer.

Server side, precedence is **request body → `X-Locale` → cookie → `az`**, implemented in
`routers/advice.py::_resolve_locale`.

> **There is no locale middleware in FastAPI.** Only three handlers read the header —
> `GET /api/fields/{id}/advice`, `POST /api/fields/{id}/advice/generate` and
> `POST /api/fields/{id}/chat`. A fourth reader must call `_resolve_locale(request, …)` itself.

### 16.3 Backend-computed prose: **code + params**, never a sentence

Six backend modules used to compose finished Azerbaijani sentences in Python, so a Turkish or Russian
farmer read Azerbaijani inside an otherwise translated interface. The convention now: **each returns a
stable `*_code` plus raw `*_params` alongside the existing Azerbaijani string**, and the frontend
renders the sentence with `tf()`. The Azerbaijani string is kept as the fallback for rows written
before the change and for clients that do not know the code.

| Module | Codes |
|---|---|
| `routers/analytics.py` (season compare) | `seasoncmp.insufficient {year}` · `behind {pct}` · `ahead {pct}` · `same` · `noCurrent` · `noPrior` · `noOverlap {year}` |
| `routers/nowcast.py` (rain nowcast) | `nowcast.rainNow` · `rainSoon {minutes}` · `dryHours {hours}` · `dryMinutes {minutes}` |
| `ai/irrigation.py` (FAO-56) | `fao56.irrigate {mm,date,raw}` · `noIrrigation` · `mismatchWet` · `mismatchDry` |
| `ai/frost.py` | `frost.unavailable` · `none {years,thr}` · `summary {…}` |
| `ai/clarify.py` | `clarify.lowIndex {index,value,expected}` + per-option `clarify.opt.sparse\|pruned\|stress\|young\|unknown` |
| `ai/wellness.py` | `label_code` / `headline_code` + params (§9) |

Three rules the codes encode:

- **Whole hours and loose minutes are separate keys** (`dryHours` vs `dryMinutes`) because languages
  decline the two units differently — a unit is never glued onto a translated number by the caller.
- **`frost.summary` is a composite** whose params are raw `MM-DD` strings and numbers, never month
  names, so a language can reorder the clauses and supply its own month vocabulary
  (`app.date.monthsShort`).
- **When one path overrides another's text, the code must be replaced with it.** A real shipped bug:
  when the FAO-56 daily balance overrode the coarse 7-day water recommendation, `ai/weather.py` did
  `content.pop("recommendation_code")` — it replaced the sentence but **deleted** the code, so a
  localized client silently fell back to Azerbaijani. It now assigns the FAO-56 code instead.

Frontend resolvers live in `app/src/lib/wellnessText.ts` (`seasonCompareSentence`, `nowcastVerdict`,
`weatherRecommendation`, `frostSentence`, `wellnessLabel`, `wellnessHeadline`, `severityLabel`,
`pestRiskTitle/Body`, `sprayReason`, `weatherAlert`) and every one of them falls back to the server's
stored Azerbaijani sentence when the code is unknown.

> **Staleness is expected and must stay tolerated.** Rows written before the change carry no code:
> clarifications keep rendering from `question_text`/`label`; stored wellness `components` have no
> `label_code`/`weight_pct`/`detail.proxy`; and `frost-dates` serves from a `zone_knowledge` cache with
> a **365-day TTL shared across every field in the rayon**, so its `sentence_az` fallback may be needed
> for up to a year.

### 16.4 Plurals: `tp()` + `Intl.PluralRules`

A count concatenated with one fixed noun only works in Azerbaijani and Turkish, where the singular
follows any numeral; the field-list header read "1 полей" and "1 fields". `tp(base, n)` selects
`<base>.one|few|many|other` via `new Intl.PluralRules(_locale).select(n)`, resolves it through `tf()`,
and falls back to `.other` when the selected form is missing. The dictionaries supply only the forms:
`az`/`tr`/`hu` declare `.other`; `en`/`de` declare one+other; `ru`/`pl` declare one/few/many/other.
The two single-noun keys it replaced were deleted from all eight dictionaries.

`Dict` was widened from `Partial<Record<I18nKey, string>>` to
`Partial<Record<I18nKey, string>> & PluralForms`, where
``type PluralForms = { [K in `app.plural.${string}`]?: string }`` — because `I18nKey` is derived from
the `az` dictionary and Azerbaijani has no few/many form to derive the key from, so Russian and Polish
literally could not declare the forms their grammar requires.

> **Adding a plural noun needs both halves:** declare `<base>.other` inside the `az` object (that key
> becomes the `I18nKey`), and rely on the `PluralForms` widening for any locale that needs few/many.
> **Insertion hazard:** the last `};` in `lib/i18n.ts` is the `DICTS` registry, **not** the `az`
> dictionary — a script anchored on it corrupts the module, and with no local Node this only surfaces
> in the server-side `docker build web`.

### 16.5 Generated prose: `advice.lang` — written once per language, not translated on read

AI advice is **text**, produced by a model and stored. It is never re-translated when read. That single
property dictates the whole design: **every producer must know the reader's language at generation
time, and the row must remember which one it got.** Five pieces implement it:

1. **`users.locale` is persisted, not just cookied.** New `POST /api/auth/locale`
   (whitelist `az,en,ru,tr,de,hu,it,pl` → 400 `invalid_locale`) is called by `LanguageSwitcher` with
   `keepalive: true` (the switcher navigates immediately). The cookie is enough for anything rendered
   in a request but invisible to work that runs **without** one — the weekly digest and post-scene
   advice generation both read `users.locale`, which previously only ever held the signup default.
2. **The automatic producer resolves a language.** `POST /api/internal/advice/run` — called by the geo
   pipeline after every new scene, and therefore the origin of most advice rows — now joins
   `fields → organizations → users` for the **org owner's** locale (§9).
3. **The row records it.** Migration `0049` adds `advice.lang` (`not null default 'az'`, which
   backfills existing rows correctly because the trigger really did pass no language).
4. **The read path reports the mismatch.** `GET /api/fields/{id}/advice` resolves the reader's locale
   and returns `lang` and `lang_mismatch = (lang != locale)`. The newest row still wins even in
   another language — a fresh analysis the reader can have translated beats a stale one they can read.
5. **The UI offers the rewrite.** `components/field/AdviceLangNote.tsx` renders above a mismatched
   analysis (in both `SignalsActions` and `AiTab`) and offers one-tap
   `POST /api/fields/{id}/advice/generate`, surfacing the real failure through `azError(err)` — which
   is why the spent-quota path had to become a **429** rather than a `200` (§9).

`severity` is the counter-example that proves the rule: `aşağı|orta|yüksək` stay **codes** at the
source (DB values, notification severity derivation) and are translated only at the label layer.

> **Not covered by this mechanism:** the weekly digest quotes `advice.summary` with **no `lang`
> predicate**, so a row generated before this change (all backfilled to `az`) can be quoted in
> Azerbaijani inside a Russian or English digest.

### 16.6 Area units: converted only at the render edge (`lib/units.ts`)

Hectares are the unit of the database (`fields.area_ha`), the API, the geo pipeline and every model.
They are not the unit farmers think in: Turkey's *tapu* land registry is written in **dönüm**
(1 000 m² = dekar = 0.1 ha) and Azerbaijani speech uses **sot** (100 m² = ar) for small plots. Showing
everyone hectares is a quiet "this app was not built for me" signal.

`app/src/lib/units.ts` (`"use client"`) is the single formatter: `AreaUnit = "ha" | "donum" | "sotka"`,
`M2_PER_UNIT`, `UNITS_PER_HA`, per-unit `AREA_DECIMALS` (`ha` 2, `donum` 1, `sotka` 0 — nobody wants to
read "13.60 dönüm"), `toUnit`/`fromUnit`, locale-aware `formatAreaNumber`/`formatArea`, `t()`-backed
`areaUnitLabel/Name/Hint`, `defaultAreaUnit(country, locale)`, an in-memory + `localStorage` cache with
an event, and the hooks `useAreaUnit()` / `useFormatArea()`. The preference is stored server-side in
`users.area_unit` (migration `0048`) behind `GET/POST /api/auth/area-unit`, whose
`_effective_area_unit()` is a **deliberate mirror** of `defaultAreaUnit()` — if the country→unit
mapping grows, both sides must change or the server's `effective` and the client's optimistic default
will disagree. `sotka` is never derived as a default (a 40 ha field as "4000 sot" is worse than
useless); it is explicit opt-in.

> **Rules that keep the conversion honest:** (1) anything that **writes** an area must convert back —
> `YieldsTab` does `fromUnit(Number(area), areaUnit)` before POST; (2) **per-hectare rates** (t/ha,
> kg/ha fertilizer doses, zone dose columns) stay per hectare, because the published agronomic norms
> are per hectare; (3) Server Components must not call `formatArea()`/`useFormatArea()` — pass the
> number down and format in a client component (the same trap as `t()`); (4) `clearAreaUnitCache()` is
> called on logout so the next account on the device does not inherit the previous farmer's choice.

---

## 17. Email System — one weekly digest (E15)

**Layers.** `services/app/ai/notify.py` (transport: Resend HTTP with an SMTP fallback, per-locale
sender persona, html+text) → `services/app/ai/emails/` (`layout.py` email-safe HTML;
`catalog.py` + `catalog_i18n.py` copy; `send.py` = idempotent `send_template` honouring
`users.email_lifecycle`; `weekly.py` = the digest builder; `lifecycle.py` = the weekly pass) →
`routers/email_prefs.py` (public unsubscribe) + `routers/internal.py` (data-ready + drain).
Idempotency and audit via `public.email_sends`.

### What the product sends

- **Transactional** — OTP / verification, `welcome`, and the first "your field is ready"
  (`data_ready`) report. These bypass the opt-out.
- **One recurring email** — the **weekly digest**, Wednesday 03:00 UTC = 07:00 Asia/Baku.
- **Nothing else.** The catalog holds exactly three template ids: `welcome`, `data_ready`, `weekly`.

Immediacy is served by **in-app notifications (`public.notifications`) + Telegram**, not by email.

### What was deleted, and why it must not come back

| Deleted | It used to |
|---|---|
| `rules/engine.py::_deliver_email()` | send one message **per fired alert per field** — a farmer with 3 fields in bad weather got a dozen emails a day |
| the advice-change email in `ai/advice.py::_notify()` | mail the org owner the full advice body after almost every new satellite scene (every 2–3 days, per field) |
| nine behavioural lifecycle templates (`no_field_d1/d3/d7`, `edu_ndvi/edu_ledger/edu_invite`, `no_crop`, `inactive_10d/30d`, `trial_ending`, `digest_weekly`) | each fire its own template on its own day offset, evaluated daily |
| `users.email_alerts` (migration `0047`) + `GET/POST /api/auth/email-alerts` + `EmailAlertsToggle.tsx` | be a **second** opt-out flag that the rule engine's emailer read and the template system did not |

Both deleted send sites carry an explicit **"do not re-add"** comment, and they are load-bearing: a
send placed there would bypass `send_template` entirely — no `email_sends` idempotency ledger, no
`email_lifecycle` opt-out, no unsubscribe link — and would also be invisible to the transactional cap.
`users.email_lifecycle` is now the **single** opt-out for all non-transactional email
(`EmailLifecycleToggle`).

### The digest (`ai/emails/weekly.py`)

`build_weekly(conn, user)` is **read-only assembly** returning `{"variant", "ctx", "blocks"}` or
`None`; `lifecycle.run_lifecycle()` feeds that to `send_template("weekly", …)`, which owns opt-out,
the ledger and the footer. Nothing in `weekly.py` sends.

- **Four variants under ONE template id** — `no_fields`, `no_crop`, `alerts`, `calm`. One id
  deliberately: the ledger dedups per `(user, template_id, dedup_key = ISO week)`, so separate ids
  would let a farmer who adds a field on Thursday receive a second email in the same week.
- **Six queries.** Fields (access chain via `exists`, not a join, so a multi-org user cannot multiply a
  field), wellness (14 d), NDVI trend (30 d window, 7-day delta computed **within the same sensor**
  because `index_stats` mixes S2 with the HLS `S30`/`L30` pair), alerts (7 d,
  `distinct on (field_id, type)` because the rule-engine cooldown is 18 h so a week of bad weather
  writes the same alert up to nine times), advice (45 d), rasters (newest NDVI COG, S2 preferred),
  plus trial days for orgs the user owns.
- **Length guards** — `MAX_FIELDS 8`, `MAX_ALERTS 8`, `MAX_ADVICE 3`, `MAX_STEPS 2`,
  `SUMMARY_CHARS 260`, `BODY_CHARS 130` (Gmail clips past ~102 KB).
- **Field order** — worst wellness score first, nulls last, oldest field breaking ties. The embedded
  satellite image is that same lead field's.
- **`FIELD_ROLES = ("farmer", "consultant")`** — a lab or supplier with no fields returns `None` and
  gets no recurring email at all.
- **The image is a public URL.** `raster_png_url()` builds
  `{app_url()}/titiler/cog/preview.png?url=…&colormap_name=rdylgn&rescale=-0.1,0.9&max_size=560` —
  the `preview.png` route, not the tile route the map uses — because Gmail proxies images. Exposure is
  the same as a public share link: one field's own clipped, boundary-masked raster. If TiTiler's public
  exposure is ever locked down, every digest image breaks silently (the numbers are repeated as text so
  the mail survives blocked images). See the nginx caveat in §3.

`run_lifecycle()` is now one `_ELIGIBLE` query (email non-empty, `is_active`, `email_verified`,
`email_lifecycle`, plus `to_char(now(), 'IYYY-"W"IW')` as the week) and a per-user build+send; it
returns `{"sent": {variant: n}, "total", "candidates", "skipped"}` and prints per-user exceptions to
stderr instead of swallowing them. The eligibility query is a narrowing filter, **not** the security
boundary — `send_template` re-checks the opt-out and the ledger.

### Sending (`send.py`) and rendering (`layout.py`)

- `TRANSACTIONAL = {"welcome", "data_ready"}` (`first_advice` was removed — no template, no caller).
- **`TRANSACTIONAL_CAP_HOURS = 24`** — a rolling cap, because transactional mail bypasses the opt-out
  and the dedup key alone was not enough: a farmer who draws five fields in one afternoon has five
  distinct dedup keys. Capped sends are recorded as status `skipped` with
  `meta {"reason": "daily_cap"}` so a later cron cannot deliver them late.
- `send_template()` gained keyword-only `variant` and `blocks`; `_site_url`/`_app_url` became public
  `site_url()`/`app_url()` (imported by `weekly.py`).
- `layout.py` gained a **block system** — `image`, `score`, `bullets`, `divider` (alias `hr`), `text`
  (alias `paragraph`), `heading`, `steps`, `stats`, `cta` (alias `button`) — rendered in order
  heading → intro → blocks → steps → stats → cta → outro → signoff. **Every renderer must return both
  the HTML and its plain-text mirror lines**; a block type added without text lines vanishes from the
  text/alt part with no warning.
- **Escaping is two-tiered.** `esc()` fully escapes every untrusted slot (headings, stats, cta labels,
  and every value inside image/score/bullets blocks). `_rich()` escapes and then re-enables a
  whitelist of **attribute-less** inline tags (`b/strong/i/em/u`, plus `<br>`) for the trusted slots
  `intro`, `outro`, `steps[].text` and block `text` — so a user-typed field name or an LLM-written
  summary interpolated into catalog copy cannot inject markup, links or handlers. `_safe_url()` drops
  anything not `http://`, `https://` or `mailto:`.
- Dark mode and the mobile breakpoint are **progressive enhancement only**: every element also carries
  the equivalent inline style and `bgcolor`, because Outlook desktop ignores media queries entirely
  and the inline styles alone already render a correct light-mode email.
- `catalog.build()` gained a `variant` parameter, and `_payload()` walks **locale → en → az returning
  the first payload that actually resolves** — a machine-translated locale written before a template
  gained roles/variants is a flat dict with no such key, and picking it would render half a template.

> **Known gaps.** `catalog_i18n.WEEKLY_EXTRA` contains **only `ru`**, and `weekly._LABELS` is authored
> for `az`/`en`/`ru` only — so `tr`, `de`, `hu`, `it`, `pl` users receive the digest in **English**.
> The fallback is by design; the translation debt is real. Separately, `catalog_i18n.SIMPLE_EXTRA`
> still carries copy for the eleven deleted templates in five locales: it is inert (`catalog.py` merges
> only over `_SIMPLE_AZ`, which now holds `data_ready` alone) — do **not** read that file as a list of
> live templates.
>
> **Naming mismatch, kept on purpose:** the script `deploy/lifecycle-emails.sh` and the endpoint
> `POST /api/internal/emails/lifecycle/drain` still say "lifecycle" although the behaviour is now the
> single weekly digest. The path was kept so the crontab entry did not have to change.

---

## 18. Name privacy

`users.name_public` + `display.public_display_name()` — a farmer who opts out is shown to **other**
users as `user_<hash>` (chat, peer suggestions). Applied only at cross-user exposure points.

