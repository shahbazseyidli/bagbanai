# Bağban AI — REST API Reference

This document is the endpoint-by-endpoint reference for the Bağban AI backend (FastAPI,
`services/app/`). It is grounded in the actual router modules under
`services/app/routers/`, the auth/gating dependencies in `services/app/deps.py`, and the
request/response models in `services/app/schemas.py`. When those files change, update this
file.

---

## Base URL, transport, and same-origin design

- **Base URL (production):** `https://agradex.com/api`
  All application routes are mounted under the `/api` prefix inside FastAPI. In production
  the Next.js frontend calls the API **same-origin** (`/api/...`); the host nginx vhost
  proxies `/api/` → `127.0.0.1:8000` (the FastAPI container). The API container is bound to
  loopback only and is never exposed directly to the internet.
- **Content type:** JSON in / JSON out, except `POST /api/uploads` which takes
  `multipart/form-data`.

## Authentication — own JWT in an httpOnly cookie

The platform does **not** use Supabase. It runs its own auth (`services/app/security.py`):
`public.users` + bcrypt password hashes + a PyJWT token.

- **Login/signup** (`/api/auth/signup`, `/api/auth/login`) set an **httpOnly** cookie named
  by `settings.cookie_name` (the `session` cookie). Attributes: `httponly=True`,
  `samesite=lax`, `secure` when the app URL is `https`, `max_age` 7 days, `path=/`. Because
  it is httpOnly, browser JS cannot read the token — the browser simply sends it back
  automatically on same-origin requests.
- **Every authenticated request** is resolved by `get_current_user_id` in `deps.py`, which
  reads the token from the `session` cookie **or** an `Authorization: Bearer <jwt>` header
  (cookie wins). A missing/invalid token → **401 `unauthorized`**.
- On the DB side, `db.connection(user_id)` opens a pooled asyncpg connection and does
  `SET LOCAL app.user_id = <uuid>`, which feeds the RLS helper
  `public.current_user_id()` (defense-in-depth). Endpoints that pass no user id
  (`connection()` / `connection(None)`) run without that GUC set — used by public subsidy
  reads and internal triggers.

## How authorization/gating works

RLS is defense-in-depth; the **primary** enforcement is server-side gating done inside each
endpoint with an open connection (helpers in `deps.py`):

- `require_member(conn, user_id, org_id)` — caller must be an **active member** of the org
  (`public.is_org_member`). Failure → **403 `forbidden`**.
- `require_role(conn, user_id, org_id, roles)` — caller's role must be in the allowed set
  (`public.has_org_role`). Failure → **403 `forbidden`**. Convenience role groups:
  - `ROLES_ADMIN` = owner, admin
  - `ROLES_WRITE` = owner, admin, agronomist
  - `ROLES_WORKER` = owner, admin, agronomist, worker
  - (viewer is read-only — a member but in none of the write groups)
- `require_internal(x_internal_token)` — the `X-Internal-Token` header must equal
  `settings.internal_api_token`; used for machine-to-machine triggers (n8n, geo pipeline).
  Failure → **401 `internal_only`**.
- `require_paid(conn, org_id)` — gate for PAID features (`public.org_is_paid`); failure →
  **402 `paid_feature`**. Billing is deferred, so new orgs default to the `free` tier and
  paid features stay closed. (Defined and ready; not yet attached to a Phase-1 route.)

The access chain for resources is **field → farm → organization → membership**; most tables
carry a denormalized `org_id`. Field/farm routers resolve the owning org first
(`_org_of_farm`, `_org_of_field`) and then gate on it.

**Auth-mode note for AI endpoints:** the AI features degrade gracefully when the LLM key is
absent. `LLM_API_KEY` is currently **empty** in production, so GET advice/chat return
`configured: false` and the POST (generate/chat) endpoints return **503 `ai_not_configured`**
until a key is added to `/opt/bagbanai/.env` and the API is restarted.

---

## Auth

Router: `services/app/routers/auth.py` — prefix `/api/auth`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/auth/signup` | Create a user, set session cookie, return the user | Public | Body `SignupIn`: `email`, `password` (min 8), `full_name?`, `locale`(=`az`). 409 `email_taken` if the email exists. |
| `POST /api/auth/login` | Verify credentials, set session cookie | Public | Body `LoginIn`: `email`, `password`. 401 `invalid_credentials` on bad login. |
| `POST /api/auth/logout` | Clear the session cookie | Public | No body. Returns `{ok:true}`. |
| `GET /api/auth/me` | Return the current user | Authenticated | Cookie/Bearer token. Returns `UserOut`. 401 if not logged in. |

`UserOut` = `{id, email, full_name?, locale}`.

---

## Organizations, members, invites, roles

Router: `services/app/routers/orgs.py` — prefix `/api/orgs`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/orgs` | Create an org; caller becomes `owner`; seeds a `free` subscription | Authenticated | Body `OrgIn`: `name`, `country`(=`AZ`). Returns `OrgOut`. |
| `GET /api/orgs` | List the orgs the caller is an active member of (with their role) | Authenticated | Returns `[OrgOut]`. |
| `GET /api/orgs/{org_id}/members` | List members (email, name, role, status) | Member | `require_member`. |
| `POST /api/orgs/{org_id}/invite` | Create an invite token (email dispatch deferred; returns the accept link) | Admin (owner/admin) | Body `InviteIn`: `email`, `role`(=`viewer`). Returns `{token, expires_at, accept_path}` (7-day expiry). |
| `POST /api/orgs/invites/{token}/accept` | Accept an invite → become an active member | Authenticated | Path `token`. 404 `invite_not_found`, 409 `invite_used`, 410 `invite_expired`. Returns `OrgOut`. |
| `POST /api/orgs/{org_id}/members/{member_id}/role` | Change a member's role | Admin (owner/admin) | Body `RoleChangeIn`: `role`. 404 `member_not_found`; 409 `cannot_change_owner` (owner can't be demoted here). |

`OrgOut` = `{id, name, country, role?}`. Roles: `owner`, `admin`, `agronomist`, `worker`,
`viewer` (`OrgRole` enum in `schemas.py`).

---

## Farms

Router: `services/app/routers/farms.py` — prefix `/api/farms`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/farms` | Create a farm under an org | Write (owner/admin/agronomist) | Body `FarmIn`: `org_id`, `name`, `region?`. Returns `FarmOut`. |
| `GET /api/farms?org_id=` | List farms in an org | Member | Query `org_id` (required). Returns `[FarmOut]`. |

`FarmOut` = `{id, org_id, name, region?}`.

---

## Fields & metadata

Router: `services/app/routers/fields.py` — prefix `/api/fields`.

On create, PostGIS validates the polygon and computes `area_ha` and `bbox`; the field is set
to `data_status='queued'` (a cron worker picks it up within ~2 min to run the satellite
pipeline). `mgrs_tiles` is populated later by the HLS pipeline.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/fields` | Create a field from a GeoJSON polygon; queues satellite processing | Write (owner/admin/agronomist) | Body `FieldIn`: `farm_id`, `name`, `geometry` (GeoJSON polygon). Validation: 400 `not_a_polygon` / `invalid_polygon_self_intersection` / `need_at_least_3_vertices`. Returns `FieldOut`. |
| `GET /api/fields?farm_id=` | List fields in a farm | Member | Query `farm_id` (required). Returns `[FieldOut]`. |
| `GET /api/fields/{field_id}` | Field detail: geometry, centroid, area, and data-processing status | Member | Returns geometry + `data_status`, `data_progress_done/total`, `data_eta_seconds`. |
| `GET /api/fields/{field_id}/data-status` | Lightweight poll for the "preparing…" banner | Member | Returns `{status, done, total, eta_seconds, ready_at}`. `status` ∈ `none/queued/processing/ready/failed`. |
| `GET /api/fields/{field_id}/metadata` | Get agronomic metadata (crop/soil/irrigation/etc.) | Member | Returns the `field_metadata` row (JSONB arrays parsed) or `null`. |
| `PUT /api/fields/{field_id}/metadata` | Upsert agronomic metadata | Worker+ (owner/admin/agronomist/worker) | Body `FieldMetadataIn` (see below). Returns `{ok:true}`. |

`FieldOut` = `{id, farm_id, org_id, name, area_ha?, mgrs_tiles?}`.

`FieldMetadataIn` fields: `crop_type` (required), `variety?`, `planting_date?`,
`expected_harvest?`, `difficulties[]`, `soil_type?`, `soil_ph?`, `irrigation_method?`,
`irrigation_available`(bool), `previous_crop?`, `rotation_history[]`, `fertilizer_history[]`,
`seeding_density?`, `growth_stage?`, `elevation_m?`, `slope_deg?`, `aspect_deg?`,
`tillage_practice?`, `target_yield?`, `prior_yields[]`, `pest_history[]`, `notes?`. The array
fields are stored as JSONB. The frontend renders these as dropdowns with canonical English
values (`app/src/lib/metadataOptions.ts`).

---

## Satellite indices, scenes, data-status

Router: `services/app/routers/indices.py` — prefix `/api/fields` (indices tag).
These read `public.index_stats` / `public.index_rasters`, populated by the HLS geo pipeline.
They return **empty results (not 404)** when the pipeline hasn't run yet. Nine indices:
`NDVI, EVI, SAVI, MSAVI, NDMI, NDWI, NBR, NBR2, TVI`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/indices/latest` | Latest value per index (mean/min/max/std/p10/p50/p90 + `acquired_at`) | Member | Returns `{indices:{...}, available_indices:[9]}`. |
| `GET /api/fields/{field_id}/indices?index=&from=&to=` | Time series for one index (mean + p10/p50/p90 band) | Member | Query `index`(=`NDVI`), `from?`, `to?` (ISO dates). Returns `{index, series:[{date,mean,p10,p50,p90}]}`. |
| `GET /api/fields/{field_id}/scenes?index=` | Per-scene TiTiler tile-URL templates for the raster overlay (one scene/date, least-cloudy, newest first) | Member | Query `index`(=`NDVI`). Returns `{index, colormap, rescale, scenes:[{scene_id, date, cloud_pct, tile_url}]}`. |

**Scene tile URLs** point at nginx `/titiler/` and already include the WebMercatorQuad
TileMatrixSet and colormap/rescale per index family: water indices (`NDMI/NDWI`) use `rdbu`
`-0.5,0.5`; burn (`NBR/NBR2`) `rdylgn` `-0.5,0.8`; vegetation (`NDVI/EVI/SAVI/MSAVI/TVI`)
`rdylgn` `-0.1,0.9`. The template is
`/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=<cog>&colormap_name=<cmap>&rescale=<lo,hi>`.

---

## Subsidy calculator

Router: `services/app/routers/subsidy.py` — prefix `/api/subsidy`.
`options`, `calculate`, and `rates` are **public** (no auth); `save` and `history` require a
signed-in member. 2026 rate/modifier data is seeded (117 rates; `amount = coefficient × 200`).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/subsidy/options?type=&group=&crop=&year=` | Cascading dropdown options; returns the next unmet level (`subsidy_type` → `crop_group` → `crop` → `dimensions`) | Public | Query `type?`, `group?`, `crop?`, `year`(=2026). |
| `POST /api/subsidy/calculate` | Compute a subsidy amount + matched rate + warnings | Public | Body `SubsidyCalcIn` (see below). Returns the calc result incl. `matched_rate_id`. |
| `POST /api/subsidy/save` | Persist a calculation (optionally tied to a field/org) | Authenticated (member if org/field given) | Body `SubsidySaveIn` (= `SubsidyCalcIn` + `org_id?`). 403 `forbidden` if not an org member. Returns `{id, created_at, result}`. |
| `GET /api/subsidy/history` | The caller's last 100 saved calculations | Authenticated | Returns `[{id, year, inputs, total_amount, unit, amount_per_unit, field_id?, created_at}]`. |
| `GET /api/subsidy/rates?year=` | All rates for a year | Public | Query `year`(=2026). |

`SubsidyCalcIn`: `year`(=2026), `subsidy_type`, `crop_group`, `crop`, `intensity?`,
`region_category?`, `region_rayon?`, `irrigation?`, `planting_period?`, `quantity_ha?`,
`tons?` (used when `subsidy_type == "product"`), `modifiers{}`, `field_id?`, `as_of_date?`
(ISO date, drives the apple/peach planting-period cutoff).

---

## Scouting, tasks, operations, yields

Scouting router: `services/app/routers/scouting.py` — prefix `/api/scouting`.
Management router: `services/app/routers/mgmt.py` — prefix `/api` (tasks/operations/yields).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/scouting` | Add a field observation (pest/disease/…, optional geotag + photos) | Worker+ | Body `ScoutingIn`: `field_id`, `category`, `severity?`, `note?`, `lon?`, `lat?`, `photos[]`. Returns `{id, observed_at}`. |
| `GET /api/scouting?field_id=` | List observations for a field (newest first) | Member | Query `field_id` (required). |
| `POST /api/tasks` | Create a task | Write (owner/admin/agronomist) | Body `TaskIn`: `org_id`, `title`, `type?`, `farm_id?`, `field_id?`, `assigned_to?`, `due_date?`, `priority?`, `notes?`. Returns `{id, created_at}`. |
| `GET /api/tasks?org_id=&field_id=` | List tasks in an org (optionally one field) | Member | Query `org_id` (required), `field_id?`. |
| `POST /api/tasks/{task_id}/status` | Update task status | Worker+ | Body `TaskStatusIn`: `status` (`todo/in_progress/done/cancelled`). 404 `task_not_found`. |
| `POST /api/operations` | Log a field operation (planting/spraying/…) | Worker+ | Body `OperationIn`: `field_id`, `type`, `performed_on`(date), `inputs[]`, `cost?`, `currency`(=`AZN`), `notes?`. Returns `{id, created_at}`. |
| `GET /api/operations?field_id=` | List operations for a field (newest first) | Member | Query `field_id` (required). |
| `POST /api/yields` | Upsert a season yield (unique per field+season+crop) | Write (owner/admin/agronomist) | Body `YieldIn`: `field_id`, `season_year`, `crop_type?`, `yield_value?`, `yield_unit?`(`t_ha/kg/t`), `area_ha?`, `notes?`. Returns `{id}`. |
| `GET /api/yields?field_id=` | List yields for a field (by season) | Member | Query `field_id` (required). |

---

## Uploads

Router: `services/app/routers/uploads.py` — prefix `/api/uploads`.
Local-volume driver (under `OBJECT_STORAGE_ROOT/uploads`); swap for S3-compatible storage
later. Used for scouting photos.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/uploads` | Upload one image; returns its storage path | Authenticated | `multipart/form-data` field `file`. Allowed: JPEG/PNG/WebP, ≤ 12 MB. 415 `unsupported_type`, 413 `file_too_large`. Returns `{path:"uploads/<name>"}`. |

The returned `path` is what you put into `ScoutingIn.photos[]`.

---

## AI advice, chat, notifications

Router: `services/app/routers/advice.py` — prefix `/api` (ai tag).
LLM adapter: `services/app/ai/` (default Claude via `AsyncAnthropic`). All AI generation is
gated by `llm.is_configured()` — with `LLM_API_KEY` empty, GET endpoints return
`configured: false` and the POST generators return **503 `ai_not_configured`**.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/advice` | Latest stored agronomic advice for a field | Member | Returns `{advice: {...}|null, configured}`. `advice` = `{summary, risks[], recommendations, next_steps, disclaimer, model, generated_at}`. |
| `POST /api/fields/{field_id}/advice/generate` | Regenerate advice now (Claude) | Member | No body. 503 `ai_not_configured` / `ai_unavailable`. Returns the new advice. |
| `GET /api/fields/{field_id}/chat` | Chat history for the field's assistant | Member | Returns `{messages:[...], configured}`. |
| `POST /api/fields/{field_id}/chat` | Ask the per-field assistant a question | Member | Body `{message}`. 400 `empty_message`; 503 `ai_not_configured`/`ai_unavailable`. Returns `{reply}`. |
| `GET /api/notifications` | Recent in-app notifications across the caller's orgs (last 30) | Authenticated | Returns `{notifications:[{id, field_id?, type, severity, title, body, created_at, read}]}`. |
| `POST /api/notifications/read` | Mark all the caller's unread notifications as read | Authenticated | No body. Returns `{ok:true}`. |

Advice `findings` (stored JSONB) hold `risks[{title, severity aşağı|orta|yüksək, detail}]`,
`recommendations`, `next_steps`, in Azerbaijani. Advice is also generated automatically after
each new satellite scene via the internal trigger below, and a material change creates a
notification (and best-effort SMTP email to the org owner).

---

## Internal triggers (machine-to-machine)

Router: `services/app/routers/internal.py` — prefix `/api/internal`.
The whole router requires `X-Internal-Token` (`require_internal`; 401 `internal_only`
otherwise). Called by the geo pipeline and by n8n. These carry no user session.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/internal/advice/run?field_id=` | Regenerate advice for a field (API holds the LLM key); notify on material change | Internal token | Query `field_id`. No-op `{ok:false, reason:"ai_not_configured"}` when AI is off; else `{ok:bool}`. |
| `POST /api/internal/pipeline/run?field_id=&days_back=` | Run the HLS geo pipeline in-process (only if geo deps are installed in the image) | Internal token | Query `field_id`, `days_back`(=120). 501 `geo_deps_unavailable_run_on_worker` if geo deps missing → run `python -m geo_pipeline.pipeline <field_id>` on the geo worker instead. |
| `POST /api/internal/weather/run?field_id=` | Weather refresh (Open-Meteo) | Internal token | **Phase 2 placeholder** — 501 `weather_phase_2`. |
| `POST /api/internal/rules/run?field_id=` | Rule engine → notifications (PAID) | Internal token | **Phase 2 placeholder** — 501 `rules_phase_2`. |

---

## Health

Router: `services/app/routers/health.py` — prefix `/api`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/health` | Liveness | Public | `{status:"ok", service:"bagban-api"}`. |
| `GET /api/ready` | Readiness — pings the DB (`select 1`) | Public | `{status:"ready", db:true}` or `{status:"degraded", db:false, error}`. |

---

## Common error codes

| Status | `detail` | Meaning |
|---|---|---|
| 400 | `not_a_polygon` / `invalid_polygon_self_intersection` / `need_at_least_3_vertices` / `empty_message` | Bad request payload |
| 401 | `unauthorized` | Missing/invalid session token |
| 401 | `internal_only` | Bad/absent `X-Internal-Token` |
| 401 | `invalid_credentials` | Wrong email/password on login |
| 402 | `paid_feature` | PAID-tier feature on a `free` org (billing deferred) |
| 403 | `forbidden` | Not a member / insufficient role |
| 404 | `farm_not_found` / `field_not_found` / `task_not_found` / `member_not_found` / `invite_not_found` | Resource missing |
| 409 | `email_taken` / `invite_used` / `cannot_change_owner` | Conflict |
| 410 | `invite_expired` | Invite past its 7-day expiry |
| 413 / 415 | `file_too_large` / `unsupported_type` | Upload rejected |
| 501 | `geo_deps_unavailable_run_on_worker` / `weather_phase_2` / `rules_phase_2` | Not implemented in this image / Phase 2 |
| 503 | `ai_not_configured` / `ai_unavailable` | LLM key absent or generation failed |
