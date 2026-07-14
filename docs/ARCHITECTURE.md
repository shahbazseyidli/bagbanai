# Bağban AI — Architecture & Technical Specification

> Operator/developer reference for the live platform at **https://agradex.com**.
> This document explains **what** each part is, **why** it was built that way, **how** it works,
> and **what still needs doing**. The repo is the source of truth; the product spec lives in
> `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29) and
> `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30). Working context/decisions for future
> sessions live in `CLAUDE.md`.

---

## 1. Overview & Goals

**Bağban AI** is a satellite + weather + AI crop-monitoring and farm-management platform for
Azerbaijani (and wider Caucasus) farmers, cooperatives, and agronomists. It combines:

- **Free satellite vegetation monitoring** — NASA HLS (Harmonized Landsat Sentinel-2) imagery
  processed into 9 vegetation/water indices per field, both as time-series statistics and as
  colorized pixel-level map overlays.
- **AI agronomic advice + chatbot** — provider-agnostic LLM (default Claude) that reasons over a
  field's satellite trends, crop metadata, and recorded field work to produce Azerbaijani-language
  advice and answer per-field questions.
- **Farm management** — organizations, farms, fields, field metadata, scouting, tasks, operations,
  yields.
- **Subsidy calculator** — the 2026 Azerbaijani agricultural subsidy rate table (§30).

### Language rule (important)
- **All UI text is Azerbaijani** (i18n default `az`; `ru`/`tr` planned). See `app/src/lib/i18n.ts`.
- **All code, identifiers, SQL, schema, and commit messages are English.**

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
| **Frontend** | Next.js 15 (App Router, TypeScript) in `app/` | SSR + BFF route handlers; served same-origin so the browser only ever talks to `agradex.com`. |
| Map | **MapLibre GL v4** (`app/src/components/FieldMap.tsx`) | `mapbox-gl-draw` was incompatible with MapLibre v4 and broke the whole map, so drawing is done with a **native click-to-draw** implementation instead. Keyless, open-source. |
| Charts | Recharts | NDVI time-series + p10–p90 variability band. |
| Styling / i18n | Tailwind CSS; `lib/i18n.ts` (default `az`) | |
| **API** | FastAPI (Python 3.11) in `services/app/` | Async, typed, pairs naturally with the Python geo stack. |
| DB driver | `asyncpg` pool (`services/app/db.py`) | Fast async Postgres access; each request sets the RLS session GUC. |
| Auth | Own JWT: `public.users` + bcrypt + PyJWT httpOnly cookie (`security.py`) | No Supabase (see §12); self-hosted control. |
| **Geo pipeline** | `services/geo_pipeline/` — `earthaccess`, `pystac-client`, `rioxarray`, `rasterio`, `xarray`, `shapely`, `pyproj` | Reads NASA HLS COGs directly over `/vsicurl`, windowed to the field. |
| **Database** | Postgres 16 + PostGIS (`postgis/postgis:16-3.4`, Docker) | Geospatial types + RLS; self-hosted (no Supabase). |
| **Tiles** | TiTiler (`ghcr.io/developmentseed/titiler:latest`) | Colorizes/serves the clipped index COGs as XYZ map tiles. **The image listens on port 80** (compose maps `127.0.0.1:8001:80`). |
| AI | Provider-agnostic adapter `services/app/ai/` (default Claude via `AsyncAnthropic`, `anthropic>=0.69`) | Provider/model/key come from env — never hard-coded — so the provider can be swapped. |
| **Orchestration** | n8n at `agent.agradex.com` (separate box) + host `cron` on the Hetzner root crontab | Scheduled HLS refresh + queue processing. |
| Free data | NASA HLS (Earthdata bearer token), Open-Meteo (Phase 2) | Zero data cost. |

---

## 3. Component & Container Map

All application ports are bound to `127.0.0.1` and fronted by the **host nginx** which terminates
TLS for `agradex.com`. Containers are defined in `deploy/docker-compose.prod.yml`.

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
- **geo** — profile `geo`; HLS worker built from `services/Dockerfile.geo`; mounts
  `./data/rasters` **read-write** and the live `geo_pipeline` code (no rebuild per change);
  `RASTER_DIR=/data/rasters`. Run on demand / via cron.
- **tools** — profile `tools`; `python:3.11-slim` with the repo mounted, for migrations/seeds.
- **n8n** — profile `orchestration`; `Asia/Baku` timezone.

---

## 4. Request & Data Flow

### Browser → nginx → web/api
1. Browser loads `https://agradex.com` → nginx `/` → **web** (Next.js). The Next app renders the UI
   and makes same-origin calls to `/api/...` (`NEXT_PUBLIC_API_BASE=""`).
2. nginx routes `/api/` → **api** (FastAPI). Auth is a `bagban_session` httpOnly cookie (JWT); the
   API also accepts `Authorization: Bearer <jwt>`.
3. Map raster tiles are requested by MapLibre directly at `/titiler/cog/tiles/WebMercatorQuad/...`,
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

Migrations are ordered SQL in `db/migrations/0001..0009`, tracked in `public.schema_migrations` by
`db/migrate.sh`. Seeds in `db/seeds` (2026 subsidy: 117 rates, `amount = coefficient × 200`).
The **access chain** is `field → farm → organization → membership`; `org_id` is denormalized onto
most tables so gating never needs a join.

### Auth & tenancy (`0002`, `0003`)
- **`users`** — `id`, `email` (unique), `password_hash` (bcrypt), `full_name`, `phone`,
  `locale` (`az|ru|tr`), `is_active`. Auth root.
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
  **`findings jsonb`** = `{risks, recommendations, next_steps}`, `disclaimer`, `generated_at`.
- **`ai_chat_messages`** (PAID) — `role` (`user|assistant`), `content`, `context_snapshot jsonb`.
- **`notifications`** (PAID) — `source` (`vegetation|weather`), `type`, `severity`
  (`info|warning|critical`), `title`, `body`, `payload`, `read_at`, `delivered_channels text[]`
  (`inapp|push|email|telegram|whatsapp|sms`).
- **`notification_preferences`** — per-user channel toggles + telegram/whatsapp/sms handles.
- **`org_subscriptions`** — `tier` (`free|pro|business`), `seats`, `hectare_cap`, `valid_until`.
  Billing integration is **deferred** (see §12) but `org_is_paid()` gating is live.
- **`crop_thresholds`** — rule-engine KB (Phase 2): per-crop GDD base, NDVI healthy/stress bounds,
  frost/heat thresholds, `kc_stages`.

### Subsidy calculator (`0008`)
- **`subsidy_years`** — `base_unit_rate` (default **200** AZN).
- **`subsidy_regions`** — rayon/region reference (liberated / Nakhchivan / economic region).
- **`subsidy_rates`** — the full rate table: `subsidy_type`, `crop_group`, `crop`, `intensity`,
  `region_category`, `irrigation`, `planting_period`, `coefficient`, **`amount_per_unit`**
  (`= coefficient × base_unit_rate`), `unit` (`ha|ton`), eligibility conditions, `label_az`.
- **`subsidy_modifiers`** — rule modifiers.
- **`subsidy_calculations`** — saved user calculations (history). Reference tables are
  public-read; calculations are owner/member scoped.

---

## 7. Satellite Pipeline (HLS → 9 indices → stats + COGs → tiles)

Code: `services/geo_pipeline/` (entry point `pipeline.py:run_field`). Spec §10.

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
- **Sentinel-2 (buludsuz)** — EOX s2cloudless 2023
- **Küçə** — OpenStreetMap
- **Topo** — OpenTopoMap

Plus a live lon/lat coordinate readout, geolocate, and navigation controls.

### Raster overlay + async processing UX
- **Async pipeline**: creating a field sets `data_status='queued'` (see `fields.py:create_field`); a
  cron worker (`deploy/process-queue.sh`, every 2 min) runs the geo pipeline newest-scene-first,
  writes the clipped index COGs, updates `data_progress_done/total` + `data_eta_seconds`
  (`AVG_SEC_PER_SCENE ≈ 6s`), and inserts a "data ready" notification.
- **Frontend**: a "Peyk məlumatı hazırlanır…" banner with a progress bar + honest ETA polls
  `GET /api/fields/{id}/data-status` until `ready`. The Overview tab then overlays the selected index
  as a pixel-level TiTiler raster, with an index-adaptive legend (Zəif/Orta/Sağlam for vegetation;
  Quru/Orta/Nəm for water), a scene timeline (date + cloud %, deduped to the least-cloudy scene per
  date), and Azerbaijani index labels + one-line descriptions.

---

## 9. AI Subsystem

Code: `services/app/ai/` — `llm.py` (adapter), `context.py` (context builder), `advice.py`,
`chat.py`, `notify.py` (SMTP email). Provider/model/key from env
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
- **Satellite index trends** (`NDVI, NDMI, NDWI, EVI, SAVI, NBR`): latest value + date,
  ~4-weeks-ago value, a `trend` label (`yüksəlir|düşür|sabit`), and 90-day min/max.
- crop metadata (crop/variety/soil/irrigation/growth stage/…),
- recent scouting (≤8), operations (≤8), open tasks (≤8), yields (≤5),
- the previous advice summary.
All dates are ISO-ified for JSON.

### Advice (`advice.py`)
`generate_and_store(conn, field_id)`:
1. builds context → Claude (Azerbaijani agronomist system prompt) → structured
   `AdviceResult { summary, risks[{title, severity ∈ aşağı|orta|yüksək, detail}], recommendations, next_steps }`,
2. stores it in `public.advice` (`findings` jsonb + `input_snapshot` + provider/model + disclaimer),
3. computes a **stable signature** of `(risk titles+severities, recommendation titles)`; if it
   differs from the previous advice (or it's the first advice), it creates an in-app
   `notifications` row and emails the org owner (best-effort SMTP via `notify.py`).

**Trigger:** generated **automatically after each new satellite scene** — the geo worker calls
`POST /api/internal/advice/run` (`X-Internal-Token`) so the **API** (which holds the LLM key) does
the generation. Also exposed as `POST /api/fields/{id}/advice/generate` for a manual re-run.

### Chatbot (`chat.py`)
`answer(conn, field_id, user_id, message)` — context = field data + latest advice + last 12 chat
turns (`HISTORY_LIMIT`). Every turn is stored in `public.ai_chat_messages` (the user turn also keeps
a `context_snapshot`) so later turns stay history-aware.

### Frontend + endpoints
"AI Məsləhət" tab (`app/src/components/field/AiTab.tsx`): advice card (severity chips,
recommendations, next steps, disclaimer, "Yenidən analiz et") + live chat.
- `GET/POST /api/fields/{id}/advice` and `/advice/generate`
- `GET/POST /api/fields/{id}/chat`
- `GET /api/notifications`, `POST /api/notifications/read`
- internal `POST /api/internal/advice/run`

### Graceful no-key degradation (current state)
`LLM_API_KEY` is **empty** in production, so all AI is inert but safe: advice returns
`null`/`configured:false`; `generate`/`chat` return **503**. **To activate**, add to
`/opt/bagbanai/.env`:
```
LLM_PROVIDER=anthropic
LLM_MODEL=claude-opus-4-8        # or a lower-cost model
LLM_API_KEY=sk-ant-...
```
then restart the `api` container.

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
  Cloudflare A `@`/`www` proxied; SSL mode currently **Flexible** → **TODO flip to Full (Strict)**
  (origin :443 is ready).

### Secrets — `/opt/bagbanai/.env` (backup `/root/agradex.env.bak`)
`POSTGRES_USER/PASSWORD/DB`, `JWT_SECRET`, `INTERNAL_API_TOKEN`, `EARTHDATA_TOKEN` (EDL bearer,
**expires 2026-08-30**), `LLM_PROVIDER/LLM_MODEL/LLM_API_KEY` (empty — add to activate AI),
`SMTP_HOST/PORT/USER/PASSWORD/FROM` (empty — in-app notifications work without it).

### Cron jobs (root crontab, PATH set)
- **Daily HLS refresh** — `0 3 * * *` → `bash deploy/run-hls.sh 30` (track=0: writes new
  scenes/rasters but does **not** reset `data_status` or re-notify). Log `/var/log/bagban-hls.log`.
- **Queue worker** — `*/2 * * * *` → `flock -n /tmp/bagban-queue.lock bash deploy/process-queue.sh`
  (processes fields with `data_status='queued'` → geo pipeline `days_back=60`, `track=1`).
  Log `/var/log/bagban-queue.log`.

### Migrations & seeds
Run via the `tools` profile container; migrations applied in order by `db/migrate.sh`, tracked in
`public.schema_migrations`. Seeds in `db/seeds` (2026 subsidy).

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
3. **Domain `agradex.com` root** (no subdomain).

---

## 13. Open Follow-ups / TODO

- **Add `LLM_API_KEY`** to `/opt/bagbanai/.env` to activate AI (advice + chat), then restart `api`.
- **Cloudflare SSL** → flip to **Full (Strict)** (origin :443 is ready).
- **nginx** duplicate `server_name` cleanup (harmless warning today).
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
</content>
</invoke>
