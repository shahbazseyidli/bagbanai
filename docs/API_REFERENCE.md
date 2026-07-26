# Agradex — REST API Reference

This document is the endpoint-by-endpoint reference for the Agradex backend (FastAPI,
`services/app/`). It is grounded in the actual router modules under
`services/app/routers/`, the auth/gating dependencies in `services/app/deps.py`, the tier
gating in `services/app/tiers.py`, and the request/response models in
`services/app/schemas.py`. When those files change, update this file.

> **Naming:** the product was renamed **Bağban AI → Agradex**; the FastAPI app title is
> `Agradex API` (`main.py`). Infrastructure identifiers were deliberately left alone, so a few
> `bagban` strings are still correct and must not be "fixed": `GET /api/health` returns
> `service: "bagban-api"`, the session cookie defaults to `bagban_session`
> (`settings.cookie_name`), and the locale cookie is `bagban_locale`.

---

## Base URL, transport, and same-origin design

- **Hosts:** `agradex.com` is the **marketing** apex; `app.agradex.com` is the **app** host
  (panel split, `settings.next_public_panel_host` / `COOKIE_DOMAIN=.agradex.com`). The browser
  client always calls the API **same-origin** as `/api/...`; nginx proxies `/api/` →
  `127.0.0.1:8000` (the FastAPI container). The API container binds to loopback only and is
  never exposed directly to the internet.
- All application routes are mounted under the `/api` prefix inside FastAPI
  (`services/app/main.py` includes 37 routers).
- **Content type:** JSON in / JSON out, with these exceptions:
  - `multipart/form-data` **in** — `POST /api/uploads`, `POST /api/fields/{id}/photos`,
    `POST /api/fields/{id}/documents`, `POST /api/fields/{id}/receipt`,
    `POST /api/fields/{id}/diagnose`, `POST /api/fields/{id}/soil-lab`.
  - non-JSON **out** — the report routes (`?format=`, default `html`),
    `GET /api/fields/{id}/tasks.ics` (`text/calendar`),
    `GET /api/documents/{id}/download` and `GET /api/photos/{id}/download` (the stored bytes),
    `GET /api/admin/export` (CSV or JSON stream) and `GET /api/emails/unsubscribe` (HTML).
- ⚠️ **Unverified from this repo:** the checked-in vhost `deploy/nginx-agradex.conf` declares
  only `server_name agradex.com www.agradex.com` — the `app.agradex.com` server block is not in
  the repo copy. `docs/OPERATIONS.md §13` asserts the live nginx/SSL already covers that host;
  this file cannot confirm it.

## Global request conventions — the `X-Locale` header

The web client sends **`X-Locale: <current UI locale>`** on **every** request — GET, POST, PUT,
PATCH, DELETE and the multipart upload — from the shared `headers()` helper in
`app/src/lib/api.ts`. The value is whatever `t()` is about to render with.

**Precedence for the language the backend writes prose in** (`_resolve_locale` in
`services/app/routers/advice.py`):

```
request body `locale`  →  X-Locale header  →  bagban_locale cookie  →  "az"
```

The first candidate that is a member of the supported set wins. Supported locales (8):
`az, en, ru, tr, de, hu, it, pl` (`_LOCALES` in `routers/advice.py`,
`SUPPORTED_LOCALES` in `routers/auth.py`).

**Why the header outranks the cookie:** the app host and the marketing apex are different
hosts, so a browser can hold **two** `bagban_locale` cookies at once — a host-only one minted
before the panel split, plus the `.agradex.com` one. Next's `cookies.get()` returns the *first*,
Starlette's cookie dict keeps the *last*, so the interface could render in one language while the
AI wrote in another. `X-Locale` removes the guess.

**Who actually reads it.** Only three handlers call `_resolve_locale`:
`GET /api/fields/{id}/advice`, `POST /api/fields/{id}/advice/generate` and
`POST /api/fields/{id}/chat`. There is **no locale middleware** — any other endpoint that needs
the reader's language must read the header itself. (`GET /api/fields/{id}/chat` deliberately does
not.) The header is passed through unmodified by nginx (`deploy/nginx-agradex.conf` sets only
`Host`/`X-Real-IP`/`X-Forwarded-*`), and CORS allows it (`allow_headers=["*"]`, `main.py`).

**Persisting the language.** A cookie/header is invisible to work that runs *without* a request —
the weekly digest email and the advice the geo pipeline generates after each new scene both read
`public.users.locale`. `POST /api/auth/locale` is what writes that column.

### Backend-composed prose: `*_code` + `*_params`

Endpoints that used to return a finished **Azerbaijani sentence** now return a stable code plus
raw params **alongside** the sentence. The client renders the code through its own dictionary
and falls back to the stored AZ string for rows written before the change. Affected responses:
`rain-nowcast` (`verdict_code`/`verdict_params`), `season-compare`
(`verdict.sentence_code`/`sentence_params`), `frost-dates` (`sentence_code`/`sentence_params`),
`knowledge` → `water_requirements` (`recommendation_code`/`recommendation_params`,
`fao56.ndmi_mismatch_code`), `clarifications` (`evidence.question_code`,
`options[].label_code`), and `wellness` (`headline_code`/`headline_params`,
`components[].label_code`). Params are raw values (numbers, `"MM-DD"` strings) — never month
names — so a language can reorder the clauses.

## Authentication — own JWT in an httpOnly cookie

The platform does **not** use Supabase. It runs its own auth (`services/app/security.py`):
`public.users` + bcrypt password hashes + a PyJWT token.

- **Login/signup** (`/api/auth/signup`, `/api/auth/login`, `/api/auth/verify-otp`) set an
  **httpOnly** cookie named by `settings.cookie_name`. Attributes: `httponly=True`,
  `samesite=lax`, `secure` when the app URL is `https`, `max_age` 7 days, `path=/`, and
  `domain=settings.cookie_domain` (`.agradex.com` in production, so the session is shared
  between the apex and the app host). Because it is httpOnly, browser JS cannot read the token.
- **Email verification (U3):** when an email transport is configured
  (`notify.email_configured()` — Resend or SMTP), signup issues a 6-digit OTP and returns
  `{needs_verification:true}`; login then refuses an unverified account with **403
  `email_not_verified`**. With **no** transport configured, signups auto-verify so production
  signup is never blocked by missing email config.
- **Every authenticated request** is resolved by `get_current_user_id` in `deps.py`, which reads
  the token from the session cookie **or** an `Authorization: Bearer <jwt>` header (cookie
  wins). A missing/invalid token → **401 `unauthorized`**.
- On the DB side, `db.connection(user_id)` opens a pooled asyncpg connection and does
  `SET LOCAL app.user_id = <uuid>`, which feeds the RLS helper `public.current_user_id()`
  (defense-in-depth). Endpoints that pass no user id (`connection()` / `connection(None)`) run
  without that GUC — used by internal triggers, public share links and the public unsubscribe.

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
- `require_platform_admin(conn, user_id)` — `public.users.is_admin`; gates the whole
  `/api/admin` router. Failure → **403 `admin_only`**.
- `require_internal(x_internal_token)` — the `X-Internal-Token` header must equal
  `settings.internal_api_token`; used for machine-to-machine triggers (n8n, geo pipeline).
  Failure → **401 `internal_only`**.
- `require_paid(conn, org_id)` — generic PAID gate (`public.org_is_paid`); failure →
  **402 `paid_feature`**. Still defined but **not attached to any route** — per-feature tier
  gating below replaced it.

**Tier gating (`services/app/tiers.py`)** is what actually gates paid features. Three packages —
`free` (Paket 1, 0 AZN), `pro` (Paket 2, 10 AZN), `business` (Paket 3, 25 AZN) — stored in
`public.org_subscriptions.tier`. A newly created org opens on a **1-month Pro trial** (C2). Two
gate shapes:

- **Feature flag** (`tiers.allows`) — a gated read returns a normal **200** carrying
  `{"gated": true}` and empty content rather than an error (knowledge passport, regional
  benchmark). Business-only reads that are their own screen raise **402** instead
  (`soil_lab_not_in_plan`, `photo_not_in_plan`).
- **Monthly quota** (`tiers.limit` + `tiers.month_count`) — `advice_per_month` free 1 / pro 8 /
  business 30; `chat_per_month` 0 / 50 / 300; `photo_per_month` 0 / 0 / 30; `max_fields` 1 / 5 /
  100000. Over quota → **429 `advice_quota_exceeded`**, **402 `photo_quota_exceeded`**,
  **402 `field_limit_reached`**. The per-field **chatbot** is the exception: it does not raise,
  it answers with a localized upgrade sentence (`_GATE_PAID` / `_GATE_LIMIT` in `ai/chat.py`).

The access chain for resources is **field → farm → organization → membership**; most tables
carry a denormalized `org_id`. Field/farm routers resolve the owning org first
(`_org_of_farm`, `_org_of_field`) and then gate on it.

**AI availability:** all AI generation is gated by `llm.is_configured()`. `LLM_API_KEY` **is set
in production — AI is active**. If the key is ever removed or rotated out, GET advice/chat
degrade to `configured: false` and the POST generators return **503 `ai_not_configured`**.

---

## Auth

Router: `services/app/routers/auth.py` — prefix `/api/auth`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/auth/signup` | Create a user; issue an OTP (email configured) or log in immediately | Public | Body `SignupIn` (below). Returns `{needs_verification:true, email}` when email is configured, else `{needs_verification:false, user:UserOut}` + cookie. 409 `email_taken`. |
| `POST /api/auth/verify-otp` | Confirm the emailed code → mark verified + log in | Public | Body `VerifyOtpIn`: `email`, `code`. Returns `{ok:true, user}` + cookie. 404 `user_not_found`; 400 `no_otp`/`otp_expired`/`invalid_otp`; 429 `too_many_attempts` (6 tries). |
| `POST /api/auth/resend-otp` | Re-issue the verification code | Public | Body `ResendOtpIn`: `email`. `{ok:true}` or `{ok:true, already_verified:true}`. 404 `user_not_found`. |
| `POST /api/auth/login` | Verify credentials, set session cookie | Public | Body `LoginIn`: `email`, `password`. 401 `invalid_credentials`; 403 `account_disabled`; 403 `email_not_verified`. Returns `UserOut`. |
| `POST /api/auth/logout` | Clear the session cookie | Public | No body. `{ok:true}`. |
| `GET /api/auth/me` | Return the current user | Authenticated | Returns `UserOut`. Also stamps `users.last_seen_at` (throttled to ~1/hour). 401 if not logged in. |
| `GET /api/auth/onboarding` | The landing-quiz answers stored on this account (E13) | Authenticated | `{onboarding: {...}|null}`. Used to prefill the field wizard. |
| `POST /api/auth/onboarding` | Store (or re-take) the quiz, then seed crop/region onto fields that still have none | Authenticated | Body: `{onboarding:{...}}` **or** the bare quiz object. Returns `{onboarding, fields_updated}`. 400 `empty_onboarding`. |
| `GET /api/auth/area-unit` | The display unit for areas (P1.2) | Authenticated | `{unit: "ha"\|"donum"\|"sotka"\|null, effective: "ha"\|"donum"\|"sotka"}`. `unit` = the explicit choice (null = auto), `effective` = what to render. |
| `POST /api/auth/area-unit` | Set / clear the display unit | Authenticated | Body `{unit}`; `null`, `""` or `"auto"` clear it (follow country). Same response shape. 400 `invalid_area_unit`. |
| `POST /api/auth/locale` | Persist the interface language onto `users.locale` | Authenticated | Body `{locale}` ∈ the 8 supported locales. Returns `{locale}`. 400 `invalid_locale`. |
| `GET /api/auth/name-public` | Farmer name visibility + the caller's role | Authenticated | `{enabled, role}` (the UI hides the control for non-farmers). |
| `POST /api/auth/name-public` | Toggle name visibility (New-B) | Authenticated | Body `{enabled}` → `{enabled}`. |
| `GET /api/auth/email-lifecycle` | Non-transactional email opt-out state | Authenticated | `{enabled}`. |
| `POST /api/auth/email-lifecycle` | Toggle the weekly digest / lifecycle email | Authenticated | Body `{enabled}` → `{enabled}`. Transactional email (OTP, welcome, data-ready) ignores this. |
| `GET /api/auth/notify-prefs` | The per-category notification matrix (5 categories × 3 channels) | Authenticated | `{prefs, categories, channels, digest_enabled, telegram:{configured, linked}}` — see below. |
| `PUT /api/auth/notify-prefs` | Store the matrix | Authenticated | Body `{prefs}`, full or sparse. Returns the same shape as GET. 400 `invalid_notify_prefs`. |

**Notification matrix** (`users.notify_prefs`, migration `0051`). Categories are the fixed list
`vegetation | weather | pest | advice | system`; channels are `inapp | digest | telegram`. `prefs`
is returned **expanded** (every category × every channel, as booleans) so the client never has to
know the storage convention — which is opt-out: only the `false` cells are persisted, `{}` means
everything is on, and therefore `PUT {"prefs": {}}` **is** "reset to recommended". A body naming an
unknown category/channel or a non-boolean value is rejected rather than partially stored.

`digest_enabled` mirrors `users.email_lifecycle`: when it is `false` the weekly email is off
entirely and the `digest` column currently decides nothing (the stored choice is kept). The
`digest` channel only decides whether a category appears **inside** the Wednesday digest — no
channel here ever produces a per-alert email.

A notification's category is derived from its `(source, type)` by `services/app/notify_prefs.py`,
which is the single mapping shared by the writers and the readers; **type outranks source** because
`ai_advice`, `data_ready` and `data_partial` are all written with `source='vegetation'`. Enforcement
lives at the delivery points: `GET /api/notifications` filters on read (rows in
`public.notifications` are org-scoped, so one member's opt-out must not mute their colleagues), the
rule engine skips the insert only when the whole org has muted the category on both `inapp` and
`digest`, the weekly digest drops muted categories from its alert bullets and advice quotes, and
the Telegram push is filtered per recipient in `messaging/telegram.send_alert`.

`SignupIn` = `{email, password (min 8), full_name?, locale (=az), role (=farmer; farmer|lab|consultant|supplier),
country?, region?, name_public (=true), onboarding?}`.
`onboarding` is anonymous visitor input, so it is whitelisted before it touches the database
(`_clean_onboarding`): only `crop, country, region, challenge, completed_at` as strings ≤80 chars,
plus `needs` as ≤12 strings of ≤40 chars.

`UserOut` = `{id, email, full_name?, locale, is_admin, role, country?, region?}`.

**Area unit resolution** (`_effective_area_unit`): an explicit stored value wins; else country in
`{TR, TUR, TURKEY, TÜRKIYE, TÜRKİYE}` → `donum`; else any other explicit country → `ha`; else
locale `tr` → `donum`; else `ha`. `sotka` is opt-in only — never derived as a default. Areas are
stored in **hectares** everywhere (`fields.area_ha`, the geo pipeline, every model); this
preference only changes rendering, and it deliberately mirrors `defaultAreaUnit()` in
`app/src/lib/units.ts` — keep both sides in step.

> **Removed:** `GET /api/auth/email-alerts` and `POST /api/auth/email-alerts` no longer exist
> (they now 404). Migration `0047_drop_email_alerts.sql` dropped `users.email_alerts`, so the
> endpoints would have 500'd against the dropped column. `users.email_lifecycle`
> (`/api/auth/email-lifecycle`) is now the single opt-out for **all** non-transactional email.

> **Note:** `POST /api/auth/onboarding` currently has **no caller in the frontend** — quiz answers
> reach the database exclusively through `SignupIn.onboarding` at signup. The re-take path (and
> with it `_apply_onboarding_to_fields`) is reachable only by calling the endpoint directly.

---

## Organizations, members, invites, roles, subscription

Router: `services/app/routers/orgs.py` — prefix `/api/orgs`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/orgs` | Create an org; caller becomes `owner`; seeds a **1-month Pro trial** (C2) | Authenticated | Body `OrgIn`: `name`, `country`(=`AZ`). Returns `OrgOut`. |
| `GET /api/orgs` | List the orgs the caller is an active member of (with their role) | Authenticated | Returns `[OrgOut]`. |
| `GET /api/orgs/{org_id}/subscription` | The org's package + this-month usage vs limits + trial state | Member | Returns tier config, usage counters and `trial` (so the banner needs no extra endpoint). |
| `GET /api/orgs/{org_id}/members` | List members (email, name, role, status) | Member | `require_member`. |
| `POST /api/orgs/{org_id}/invite` | Create an invite token (returns the accept link) | Admin (owner/admin) | Body `InviteIn`: `email`, `role`(=`viewer`). Returns `{token, expires_at, accept_path}` (7-day expiry). |
| `POST /api/orgs/invites/{token}/accept` | Accept an invite → become an active member | Authenticated | Path `token`. 404 `invite_not_found`, 409 `invite_used`, 410 `invite_expired`. Returns `OrgOut`. |
| `POST /api/orgs/{org_id}/members/{member_id}/role` | Change a member's role | Admin (owner/admin) | Body `RoleChangeIn`: `role`. 404 `member_not_found`; 409 `cannot_change_owner`. |

`OrgOut` = `{id, name, country, role?}`. Org roles: `owner`, `admin`, `agronomist`, `worker`,
`viewer` (`OrgRole`). Distinct from the global marketplace persona `UserRole` =
`farmer | lab | consultant | supplier` (`users.role`, migration 0031).

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

On create, PostGIS validates the polygon and computes `area_ha` and `bbox`; the field is set to
`data_status='queued'` (a cron worker picks it up within ~2 min to run the satellite pipeline).
`mgrs_tiles` is populated later by the pipeline. Deletion is a **soft delete** (`deleted_at`,
D2.7) with an undo window.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/fields` | Create a field from a GeoJSON polygon; queues satellite processing | Write | Body `FieldIn`: `farm_id`, `name`, `geometry`. 400 `not_a_polygon` / `invalid_polygon_self_intersection` / `need_at_least_3_vertices` / `field_too_small`; 402 `field_limit_reached` (tier `max_fields`). Returns `FieldOut`. |
| `GET /api/fields?farm_id=` | List fields in a farm | Member | Query `farm_id` (required). Returns `[FieldOut]`. |
| `GET /api/fields/geo?org_id=` | All fields of an org **with geometry** — desktop multi-field map (D4.3) | Member | Declared before `/{field_id}` so the literal path wins. |
| `GET /api/fields/{field_id}` | Field detail: geometry, centroid, area, data-processing status | Member | Returns geometry + `data_status`, `data_progress_done/total`, `data_eta_seconds`. |
| `PUT /api/fields/{field_id}` | Rename a field | Write | Body `{name}`. |
| `DELETE /api/fields/{field_id}` | Soft-delete (stamps `deleted_at`; data survives) | Write | — |
| `POST /api/fields/{field_id}/restore` | Undo a soft-delete | Write | — |
| `GET /api/fields/{field_id}/data-status` | Lightweight poll for the "preparing…" banner | Member | `{status, done, total, eta_seconds, ready_at}`; `status` ∈ `none/queued/processing/ready/failed`. |
| `GET /api/fields/{field_id}/metadata` | Agronomic metadata (crop/soil/irrigation/…) | Member | Returns the `field_metadata` row (JSONB arrays parsed) or `null`. |
| `PUT /api/fields/{field_id}/metadata` | Upsert agronomic metadata | Worker+ | Body `FieldMetadataIn` (below). Upserts, so a patch alone creates the passport row. |
| `POST /api/fields/{field_id}/diagnose` | Photo disease/pest diagnosis via Claude vision (T5) | Member + Business tier + monthly quota | `multipart/form-data` field `file`. 503 `ai_not_configured`; 400 `empty_file`; 413 `file_too_large`; 415 `unsupported_media_type`; 402 `photo_not_in_plan` / `photo_quota_exceeded`. |
| `GET /api/fields/{field_id}/diagnoses` | Recent photo diagnoses (newest first) | Member | — |
| `POST /api/fields/{field_id}/soil-lab` | Lab soil-analysis OCR (T24) → `soil_profiles`, promoted to the soil passport (lab > SoilGrids) | Member + Business tier (shares the vision gate) | `multipart/form-data` field `file`. 503 `ai_not_configured`; 400 `empty_file`; 413 `file_too_large`; 415 `unsupported_media_type`; 402 `soil_lab_not_in_plan`. |
| `GET /api/fields/{field_id}/soil-lab` | Recent lab analyses (newest first) | Member | — |
| `GET /api/fields/{field_id}/fertilizer-plan` | Removal-based N-P-K plan + stage splits (T11) | Member + Business tier | — |
| `POST /api/fields/{field_id}/pest-mute` | Farmer confirms a pest is absent → mute its risk alerts for N days (T9, Rule 12) | Write | Body `{pest_name, days}` (`days` defaults to 90). 400 `pest_name_required`. |

`FieldOut` = `{id, farm_id, org_id, name, area_ha?, mgrs_tiles?}`.

`FieldMetadataIn` fields: `crop_type` (required), `crop_cycle?`, `region?`, `economic_region?`,
`variety?`, `planting_date?`, `expected_harvest?`, `difficulties[]`, `soil_type?`, `soil_ph?`,
`irrigation_method?`, `irrigation_available`(bool), `previous_crop?`, `rotation_history[]`,
`fertilizer_history[]`, `seeding_density?`, `growth_stage?`, `elevation_m?`, `slope_deg?`,
`aspect_deg?`, `tillage_practice?`, `target_yield?`, `prior_yields[]`, `pest_history[]`,
`notes?`. The array fields are stored as JSONB. The frontend renders these as dropdowns with
canonical English values (`app/src/lib/metadataOptions.ts`).

---

## Geo helpers

Router: `services/app/routers/geo.py` — prefix `/api/geo`. All sub-steps are best-effort: an
outbound failure yields `ok:false` + a `reason`, never a 500.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/geo/segment` | Tap-to-detect field boundary (C3) — proxies the `geoapi` microservice | Authenticated | Body `{lon, lat}` → `{ok, polygon, …}` or `{ok:false, reason}`. The result **always** needs farmer confirmation before saving. |
| `POST /api/geo/segment-public` | The same read-only segmentation for the **public landing** (D3.1) | **Public** | Body `{lon, lat}`. No auth and nothing is written; area-capped inside `geoapi`. |
| `POST /api/geo/ndvi-public` | Anonymous NDVI reading for a polygon drawn on the landing page (A11) | **Public** | Body `{polygon}` (GeoJSON) → `{ok, …}` / `{ok:false, reason}`. Nothing is written. |
| `GET /api/geo/site?lat=&lon=` | Terrain + reverse-geocoded region for the field wizard | Authenticated | `{elevation_m, slope_deg, aspect_deg, aspect_label, region, economic_region}`. |

---

## Satellite indices, scenes, rasters

Router: `services/app/routers/indices.py` — prefix `/api/fields` (indices tag).
These read `public.index_stats` / `public.index_rasters`, populated by the geo pipeline. They
return **empty results (not 404)** when the pipeline hasn't run yet.

**Indices (11):** `NDVI, EVI, SAVI, MSAVI, NDMI, NDWI, NBR, NBR2, TVI` for both sensors, plus the
S2-only red-edge pair `NDRE, CIre` (E0 — HLS lacks the 705 nm band, so they simply come back
empty for `hls`).

**Sensor families:** `?sensor=hls` → HLS 30m (DB codes `S30`/`L30`), `?sensor=s2` → Sentinel-2
10m (code `S2`). The map/latest/summary/scenes endpoints default to **`s2`** and fall back to the
other family when the requested one has no rows. An unknown value → **422 `unknown_sensor`**.
Note this is a *data-layer* parameter: the product UI currently exposes Sentinel-2 only
(`HLS_ENABLED = false` in `app/src/lib/sensors.ts`), while HLS keeps feeding the benchmark,
retrospective backfill and productivity zones.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/indices/latest?sensor=` | Latest value per index (mean/min/max/std/p10/p50/p90 + `acquired_at`) | Member | `sensor`(=`s2`). |
| `GET /api/fields/{field_id}/indices?index=&from=&to=&sensor=` | Time series for one index | Member | With **no** `?sensor=` it returns **both** sensors, each point tagged with its family. Returns `{index, series:[{date, sensor, mean, p10, p50, p90}]}`. |
| `GET /api/fields/{field_id}/indices/summary?sensor=` | Latest value per index for the status explanation block | Member | `sensor`(=`s2`), with fallback to the other family when empty. |
| `GET /api/fields/{field_id}/scenes?index=&sensor=` | Per-scene TiTiler tile-URL templates for the raster overlay (one scene/date, least-cloudy, newest first) | Member | Returns `{index, sensor, colormap, rescale, scenes:[{scene_id, date, cloud_pct, sensor, tile_url, value, rescale_auto, tile_url_auto}]}`. |
| `GET /api/fields/{field_id}/indices/benchmark?index=` | Weekly regional/peer average — averages **other** fields of the same crop (or all fields if none) | Member + Business tier | Returns `{index, scope:"crop"\|"all", crop_type, series:[{date(week Monday), mean, p10, p90, n}]}`. Non-business → `{index, gated:true, series:[]}`. Backed by `SECURITY DEFINER public.index_benchmark(index,crop,exclude)` (0010, hardened 0013 — HLS-only, k-anon) so an RLS-scoped connection reads only cross-tenant **aggregates**. |
| `GET /api/fields/{field_id}/norms` | Crop-specific index band edges for the UI status labels (M5) | Member | Resolves `crop_type` → `crop_thresholds.index_norms`, falling back to `generic`. `calibrated` is true only for a crop-specific hit. |
| `GET /api/fields/{field_id}/insights` | Per-index trend snapshot (latest, ~3-weeks-ago prior, delta, % change, direction) for **both** sensors | Member | — |
| `GET /api/fields/{field_id}/water-balance` | FAO-56 daily soil-water balance (T8) — the "show the calculation" table | Member | — |
| `GET /api/fields/{field_id}/gdd` | Growing-Degree-Days for the current season (T4): latest cumulative + daily series | Member | — |
| `GET /api/fields/{field_id}/season-features` | Per-season NDVI peak/mean/integral + GDD total + precipitation total (T16) | Member | — |

**Scene tile URLs** point at nginx `/titiler/` (`settings.titiler_public_base`) and already
include the WebMercatorQuad TileMatrixSet and the colormap/rescale for the index family: water
(`NDMI/NDWI`) `rdbu` `-0.5,0.5`; burn (`NBR/NBR2`) `rdylgn` `-0.5,0.8`; `CIre` `rdylgn` `0,3`;
vegetation (`NDVI/EVI/SAVI/MSAVI/TVI/NDRE`) `rdylgn` `-0.1,0.9`. Template:
`/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=<cog>&colormap_name=<cmap>&rescale=<lo,hi>`.
`tile_url_auto` is the same template rendered with `rescale_auto`, a per-scene contrast stretch
derived from that scene's own p10..p90 (A1).

---

## Field analytics — wellness & season comparison

Router: `services/app/routers/analytics.py` — prefix `/api` (analytics tag).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/wellness?refresh=` | Today's Field Wellness Score (B8) | Member | Stored per (field, day); recomputed when absent or `refresh=1`. |
| `GET /api/orgs/{org_id}/wellness` | Latest **stored** score per field of one org — the read model behind the list chips and map colouring (A3) | Member | `{org_id, as_of, fields:[{field_id, score, tone, headline, headline_code, headline_params, sensor, computed_on, age_days, stale}]}`. **Read-only by design:** it never computes; a field with no stored row simply has no entry. |
| `GET /api/fields/{field_id}/season-compare?years=` | DOY-keyed NDVI curve + cumulative integral per season, newest first, plus a same-DOY verdict | Member | `years`(=3, 1..10). Returns `{field_id, years, current_year, seasons:[…], verdict}`. |

**Wellness response.** Each entry of `components` carries `score`, `label`, **`label_code`**
(nullable), `weight` (float) and **`weight_pct`** (int), plus a `detail` object that includes
**`proxy`** (bool). Three rules apply when the FAO-56 soil-water balance is unavailable and the
water component falls back to NDMI (`services/app/ai/wellness.py`):

1. A proxy-sourced component is compressed into the band **25..85** over the NDMI domain
   `-0.20..0.40` — still monotonic, but it can reach neither 0 (critical) nor 100 (perfect).
2. It carries **its own** label (`label_code: "water.ndmi"`, "Peyk nəmlik siqnalı"), never the
   label of the measurement it stands in for.
3. `worst` is picked among the **real** components while any exist, and a proxy alone cannot push
   `tone` to `bad` — the tone is floored at `warn`. The numeric **score is deliberately left
   unchanged**, so a field can legitimately show 40/100 with a `warn` tone even though the
   `warn` cut-off is 45.

`weight_pct` uses largest-remainder apportionment so the displayed weights sum to exactly 100 —
rounding `weight` client-side is what produced "62% + 39% = 101%". New consumers must prefer
`weight_pct`; the float `weight` is kept only because rows stored before the change have no
`weight_pct` (and no `label_code`, and no `detail.proxy`).

`verdict` on season-compare carries `sentence` (AZ fallback) plus `sentence_code` ∈
`seasoncmp.noCurrent | noPrior | noOverlap{year} | insufficient{year} | behind{pct} | ahead{pct} | same`
and `sentence_params`.

---

## Weather — nowcast, history, frost

Routers: `services/app/routers/nowcast.py`, `services/app/routers/weather_history.py` —
prefix `/api`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/rain-nowcast?window=` | Next `window` minutes of 15-minute precipitation for the field centroid + a spray verdict | Member | `window`(=120, 30..360). Returns `{available, field_id, verdict, verdict_code, verdict_params, tone, rain_expected, spray_safe, minutes_to_rain, starts_at, total_mm, max_mm, threshold_mm, window_minutes, interval_minutes, steps[], timezone, source}`. An Open-Meteo failure returns `{available:false, reason}` — never a 500. |
| `GET /api/fields/{field_id}/frost-dates?refresh=&threshold_c=&years=` | Frost climatology for the field's rayon (B18) | Member to read the cache; **Write** to recompute | `threshold_c`(=default, −10..5, rounded to 0.1), `years`(=default, snapped to 10/20/30/40) — both quantized so a member cannot mint unlimited cache keys. Cached per zone for 365 days in `zone_knowledge`. A cache **miss** also requires Write, because it costs an external archive call. 503 when the climatology cannot be built (`detail` = the computed reason, else `frost_unavailable`). |
| `POST /api/fields/{field_id}/weather/backfill` | Pull the Open-Meteo archive for the centroid into `field_weather_daily` | Write | Body `BackfillIn?`. 503 `archive_empty`. |
| `GET /api/fields/{field_id}/weather/yearly?years=` | Per-year monthly aggregates (archive) + the farmer's rain-log totals per month | Member | `years`(=5, 1..30). |
| `GET /api/fields/{field_id}/rain?limit=` | The farmer's rain-gauge log (B19) | Member | `limit`(=120, 1..1000). |
| `POST /api/fields/{field_id}/rain` | One rain-gauge reading | Worker+ | Body `RainIn`. Upserts on `(field_id, observed_on)` — one entry per day. |
| `DELETE /api/fields/{field_id}/rain/{rain_id}` | Delete a reading | Worker+ | 404 `rain_entry_not_found`. |

`frost-dates` returns the climatology object plus `zone_id`, `cached`, `refreshed_at`, the AZ
`sentence_az` **and** `sentence_code` ∈ `frost.unavailable | frost.none{years,thr} |
frost.summary{years, thr, spring_mmdd, safe_mmdd?, autumn_mmdd?, window_start_mmdd?,
window_end_mmdd?, window_days?, frost_free_days?}` with `sentence_params`. `frost.summary` is a
**composite** the client assembles, and the params are raw `MM-DD` strings so the client supplies
its own month names. Rows cached before the code was introduced carry no `sentence_code`, so the
`sentence_az` fallback must be kept for up to a year (or an agronomist+ forces `?refresh=1`).

---

## Knowledge passport & clarifications

Router: `services/app/routers/knowledge.py` — prefix `/api/fields` (knowledge tag).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/knowledge` | Merged Knowledge Passport (zone + field blocks) | Member + Pro/Business | Free tier returns `{crop_type:null, zone_id:null, zone:{}, field:{}, gated:true}`. |
| `GET /api/fields/{field_id}/clarifications` | Open clarifications for the field (drives the block + counter) | Member | — |
| `POST /api/fields/{field_id}/clarifications/{clar_id}/answer` | Record a structured answer, resolve it, and fold the fact into `resolved_clarifications` so it is never asked again | Worker+ | Body `ClarifyAnswer`. 404 `clarification_not_found`. |
| `POST /api/fields/{field_id}/research` | Queue a manual full-refresh research job (debounced) | Worker+ | Returns the job id. |

**Localized prose in these payloads.** Clarifications detected after the P0.2 pass carry
`evidence.question_code = "clarify.lowIndex"` with `question_params {index, value, expected}`, and
each option carries `label_code` ∈ `clarify.opt.sparse|pruned|stress|young|unknown`. The persisted
Azerbaijani `question_text` / `options[].label` stay in place — older rows have no codes at all,
so the client must keep rendering them.

The passport's **`water_requirements`** block now carries `recommendation_code` /
`recommendation_params` even when the FAO-56 daily balance overrides the coarse 7-day figure
(`fao56.irrigate{mm,date,raw}` / `fao56.noIrrigation` replacing the coarse
`water.high|water.mid|water.low`). This fixed a real bug: the override used to `pop()` the code
while replacing the sentence, so a localized client silently fell back to Azerbaijani. The nested
`fao56` object also carries `recommendation_code`, `recommendation_params`, `ndmi_mismatch_code`
(`fao56.mismatchWet` | `fao56.mismatchDry`) and `ndmi_mismatch_params`.

---

## Productivity zones & VRA

Router: `services/app/routers/zones.py` — prefix `/api`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/fields/{field_id}/zones` | Queue an A6 zone computation | Write | Body `ZoneRunIn` (index, sensor, n_zones, month/season window …). The geo cron worker (`deploy/process-zones.sh`) picks the row up within ~5 min; the UI polls the GET below. 400 `n_zones_out_of_range` / `unknown_index` / `unknown_sensor` / `invalid_month_window` / `invalid_season_range`. |
| `GET /api/fields/{field_id}/zones` | Latest zone run + its polygons as GeoJSON | Member | **Never 404s** on "no zones yet" — returns `{status, hint, run, zones[], field_area_ha}` with a renderable `status` ∈ `none \| queued \| running \| ready \| insufficient_data \| failed` (`_status_message`). |
| `POST /api/fields/{field_id}/vra` | Build + persist a VRA-lite plan from the latest READY zone run (A7) | Write | Body `VraIn`. 409 `no_ready_zone_run`; 400 `unknown_nutrient` / `no_base_dose`. |
| `GET /api/fields/{field_id}/vra?nutrient=` | Latest VRA plan (optionally for one nutrient) + its per-zone doses | Member | Per-hectare **rates** stay per hectare regardless of the caller's area-unit preference. |

---

## Retrospective backfill

Router: `services/app/routers/backfill.py` — prefix `/api`. Queue for A8 historical ingest;
`deploy/process-backfill.sh` drains it every 5 minutes.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/fields/{field_id}/backfill` | Queue a retrospective ingest of `year_from..year_to` | Write | Body `BackfillIn`. Idempotent by `(field_id, year_from, year_to)`. 400 `year_from_after_year_to` / `year_in_future` / `year_before_hls_coverage` / `range_too_wide`; 409 `backfill_conflict`; 429 `too_many_backfill_jobs`. |
| `GET /api/fields/{field_id}/backfill` | The current (queued/running) job, or the most recent one, plus existing per-year scene coverage | Member | Lets the UI pre-select the years worth requesting. |
| `DELETE /api/backfill/{job_id}` | Cancel a job that has not started yet | Write (org of the job) | A **running** job is left alone — the geo worker owns it. 404 `job_not_found`; 409 `job_not_cancelable`. |

---

## Scouting, tasks, operations, yields

Scouting router: `services/app/routers/scouting.py` — prefix `/api/scouting`.
Management router: `services/app/routers/mgmt.py` — prefix `/api`.
Bulk router: `services/app/routers/bulk.py` — prefix `/api`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/scouting` | Add a field observation (pest/disease/…, optional geotag + photos) | Worker+ | Body `ScoutingIn`: `field_id`, `category`, `severity?`, `note?`, `lon?`, `lat?`, `photos[]`. Returns `{id, observed_at}`. |
| `GET /api/scouting?field_id=` | List observations for a field (newest first) | Member | Query `field_id` (required). |
| `POST /api/tasks` | Create a task | Write | Body `TaskIn`: `org_id`, `title`, `type?`, `farm_id?`, `field_id?`, `assigned_to?`, `due_date?`, `priority?`, `notes?`. Returns `{id, created_at}`. |
| `POST /api/fields/{field_id}/tasks/generate` | Regenerate the field's auto season task chain from crop + planting date | Write | — |
| `GET /api/tasks?org_id=&field_id=` | List tasks in an org (optionally one field) | Member | Query `org_id` (required), `field_id?`. |
| `GET /api/fields/{field_id}/tasks.ics` | The field's tasks as an iCalendar feed | Member | Returns `text/calendar`. |
| `POST /api/tasks/{task_id}/status` | Update task status | Worker+ (org resolved from the task) | Body `TaskStatusIn`: `status` (`todo/in_progress/done/cancelled`). 404 `task_not_found`. |
| `POST /api/operations` | Log a field operation (planting/spraying/…) | Worker+ | Body `OperationIn`: `field_id`, `type`, `performed_on`, `inputs[]`, `cost?`, `currency`(=`AZN`), `phi_days?`, `notes?`. Returns `{id, created_at}`. |
| `GET /api/operations?field_id=` | List operations for a field (newest first) | Member | Query `field_id` (required). |
| `GET /api/fields/{field_id}/spray-safety` | Pre-harvest-interval countdown from the logged sprays (B6) | Member | — |
| `POST /api/yields` | Upsert a season yield (unique per field+season+crop) | Write | Body `YieldIn`: `field_id`, `season_year`, `crop_type?`, `yield_value?`, `yield_unit?`(`t_ha/kg/t`), `area_ha?` (**hectares** — the client converts back from the display unit), `revenue?`, `price?`, `notes?`. |
| `GET /api/yields?field_id=` | List yields for a field (by season) | Member | Query `field_id` (required). |
| `POST /api/bulk/tasks` | One task row per selected field | Write | Body `BulkTaskIn`. 400 `no_fields_selected` / `too_many_fields` / `field_not_in_org`. |
| `POST /api/bulk/operations` | One operation row per selected field | Write | Body `BulkOperationIn`. Same validation family. |

---

## Seasons

Router: `services/app/routers/seasons.py` — prefix `/api` (B3 season entity).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/seasons` | All seasons of a field | Member | — |
| `GET /api/fields/{field_id}/seasons/current` | The field's current season | Member | — |
| `POST /api/fields/{field_id}/seasons` | Create a season | Write | Body `SeasonIn`. 409 `season_exists`; 400 `invalid_season_year`. |
| `PUT /api/seasons/{season_id}` | Edit a season | Write | Body `SeasonUpdateIn`. 404 `season_not_found`. |
| `POST /api/seasons/{season_id}/status` | Lifecycle transition (validated before it reaches the DB) | Write | Body `SeasonStatusIn`. 400 `invalid_status`. |
| `POST /api/seasons/{season_id}/current` | Mark this season as the field's current one | Write | — |
| `DELETE /api/seasons/{season_id}` | Delete a season | Write | — |

---

## Fertilizer plans

Router: `services/app/routers/fertilizer.py` — prefix `/api` (E8).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/fertilizer` | The field's fertilizer plans | Member | Returns `[FertilizerPlanOut]`. |
| `POST /api/fields/{field_id}/fertilizer` | Add a plan | Worker+ | Body `FertilizerPlanIn`: `product`, `category?`, `zone?`, `dose?`, `planned_on?`, `status`(=`planned`), `source`(=`manual`), `notes?`. |
| `PUT /api/fertilizer/{plan_id}/status` | Change a plan's status | Worker+ (org resolved from the plan) | Body `{status}` (defaults to `planned`). 404 `plan_not_found`. |
| `DELETE /api/fertilizer/{plan_id}` | Delete a plan | Worker+ (org resolved from the plan) | Idempotent — an already-missing plan returns `{ok:true}`, not a 404. |
| `GET /api/fields/{field_id}/fertilizer/suggest` | Rule-based suggestion folding in the crop + latest soil analysis | Member | Deterministic and instant; kg/ha doses stay **per hectare**. |

---

## Photos, documents, uploads

Routers: `services/app/routers/photos.py`, `documents.py`, `uploads.py`.
Local-volume storage under `OBJECT_STORAGE_ROOT/uploads`; nginx proxies `/api/` only, so
**authenticated download routes are the only read path for stored bytes**.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/uploads` | Upload one image; returns its storage path | Authenticated | `multipart/form-data` field `file`. JPEG/PNG/WebP, ≤ 12 MB. 415 `unsupported_type`, 413 `file_too_large`. Returns `{path:"uploads/<name>"}` — what you put into `ScoutingIn.photos[]`. |
| `GET /api/fields/{field_id}/photos` | The field's photo log (E10) | Member | Returns `[FieldPhotoOut]`. |
| `POST /api/fields/{field_id}/photos` | Add a field photo; **best-effort** AI auto-label with the org's tier model | Worker+ | `multipart/form-data` field `file`. 415 `unsupported_media_type`; 400 `empty_file`; 413 `file_too_large`. A labelling failure is swallowed — the photo is still stored, just unlabelled. |
| `POST /api/fields/{field_id}/documents` | Attach a file (lab PDF, cadastre scan, receipt photo, contract) | Worker+ | `multipart/form-data`: `file`, `kind`(=`other`), `title?`. 415 `unsupported_media_type`; 413 `file_too_large`. |
| `GET /api/fields/{field_id}/documents?kind=` | The field's dossier, newest first (soft-deleted rows hidden) | Member | — |
| `GET /api/documents/{doc_id}/download` | Authenticated file serving | Member | Org-gated, traversal-guarded, streamed with the stored mime type. 404 `document_not_found` / `file_not_found`. |
| `GET /api/photos/{photo_id}/download` | The same serve path for `field_photos` bytes | Member | 404 `photo_not_found`. |
| `DELETE /api/documents/{doc_id}` | Soft-delete (stamps `deleted_at`; the bytes survive) | Write | — |
| `POST /api/fields/{field_id}/receipt` | Store a receipt photo, vision-parse it, return a **draft** expense | Worker+ | `multipart/form-data` `file?` + `title?`; query `create_operation`(=false), `document_id?`. The operation row is written only on the confirm step (`create_operation=true`). |

---

## Farm business — ledger, sales, inventory, equipment, places, harvest order

Routers: `ledger.py`, `sales.py`, `inventory.py`, `equipment.py`, `places.py`,
`harvest_order.py` — all prefix `/api`. (These are the four `/farm?tab=…` sections in the UI plus
the map places and the harvest ranking.)

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /api/fields/{field_id}/pnl?season=` | Per-field profit & loss | Member |
| `GET /api/orgs/{org_id}/ledger?season=` | Per-field P&L across the org + totals | Member |
| `GET /api/orgs/{org_id}/buyers?q=` · `POST /api/orgs/{org_id}/buyers` | Buyer directory | Member · Write |
| `PUT /api/buyers/{buyer_id}` · `DELETE /api/buyers/{buyer_id}` | Edit / hard-delete a buyer (`sales.buyer_id` is `on delete set null`, so history survives) | Write |
| `GET /api/fields/{field_id}/harvest-lots` · `POST /api/fields/{field_id}/harvest-lots` | Harvest lots of one field (traceability codes) | Member · Write |
| `DELETE /api/harvest-lots/{lot_id}` | Delete a lot | Write |
| `GET /api/orgs/{org_id}/harvest-lots?season=` | Org-wide lot picker (trace code + field name + already-sold quantity) | Member |
| `GET /api/orgs/{org_id}/sales?season=&buyer_id=&field_id=` · `POST /api/orgs/{org_id}/sales` | Sales records | Member · Write |
| `DELETE /api/sales/{sale_id}` | Delete a sale | Write |
| `GET /api/orgs/{org_id}/sales/summary?season=` | Totals by buyer and by crop + the still-unpaid amount | Member |
| `GET /api/orgs/{org_id}/inventory` · `POST /api/orgs/{org_id}/inventory` | Warehouse items | Member · Write |
| `PUT /api/inventory/{item_id}` · `DELETE /api/inventory/{item_id}` | Edit / delete an item | Write |
| `POST /api/inventory/{item_id}/move` · `GET /api/inventory/{item_id}/moves` | Stock movements | Write · Member |
| `GET /api/orgs/{org_id}/inventory/low-stock` | Items at or below their reorder point | Member |
| `POST /api/orgs/{org_id}/inventory/deduct-operation` | Deduct an operation's inputs from stock (idempotent per `operation_id`) | Worker+ |
| `GET /api/orgs/{org_id}/equipment?status=` · `POST /api/orgs/{org_id}/equipment` | Machine register with each service schedule nested | Member · Write |
| `PUT /api/equipment/{equipment_id}` · `DELETE /api/equipment/{equipment_id}` | Edit / delete a machine | Write |
| `GET /api/equipment/{equipment_id}/service` · `POST /api/equipment/{equipment_id}/service` | Service schedule rows | Member · Write |
| `POST /api/service/{service_id}/done` | Mark a service performed: stamp it, roll `next_due_on` forward, record the cost, close the reminder task | Write |
| `GET /api/orgs/{org_id}/equipment/due?days=` | Services due within `days` (overdue first; also raises a deduped in-app notification) | Member |
| `POST /api/orgs/{org_id}/equipment/materialize-tasks?days=` | Create a task per due service that has no live task (idempotent through `equipment_service.task_id`) | Write |
| `GET /api/orgs/{org_id}/places?kind=&farm_id=` | All non-deleted places as a GeoJSON FeatureCollection | Member |
| `POST /api/orgs/{org_id}/places` · `PUT /api/places/{place_id}` · `DELETE /api/places/{place_id}` | Create / edit / soft-delete a place | Write |
| `GET /api/orgs/{org_id}/harvest-order?limit=` | The org's fields ordered by harvest priority, with the signals and the reason behind each rank | Member |

Deduct is deliberately lenient: an unmatched product is **not** an error — there is no product
FK, so a farmer may log a product the warehouse does not track.

---

## Reports

Router: `services/app/routers/reports.py` — prefix `/api` (B9 report library).
Every report takes `?format=` (default `html`); a generated report is also persisted so it can be
re-opened from the library.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/reports/catalog` | The report library: what can be generated and which parameters each needs | Authenticated | — |
| `GET /api/orgs/{org_id}/reports/scope` | Pickers for the reports page: the org's fields + the seasons that hold data | Member | — |
| `GET /api/orgs/{org_id}/reports?limit=` | Previously generated reports; each row carries a ready-to-open html URL | Member | `limit`(=20, 1..100). |
| `GET /api/fields/{field_id}/reports/season?season=&format=` | Per-field season report | Member | `season`(1990..2100). 400 `invalid_format`. |
| `GET /api/fields/{field_id}/reports/journal?from=&to=&format=` | Field journal (operations/scouting/tasks) for a date range | Member | `from`/`to` are ISO dates. 400 `invalid_format`. |
| `GET /api/orgs/{org_id}/reports/cost?season=&format=` | Org cost report | Member | — |

---

## Marketplace — providers & direct messaging

Routers: `services/app/routers/providers.py` (prefix `/api/providers`) and
`services/app/routers/chat.py` (prefix `/api/chat`). Both surfaces are fully implemented and
live; the frontend currently **hides their navigation entries** behind
`SHOW_MARKETPLACE_NAV = false` (`app/src/lib/navFlags.ts`) because they have no seeded content —
the routes and this API are unaffected and direct links still work.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/providers?kind=&country=&region=&spec=&q=` | Public directory of labs / consultants / suppliers | Authenticated | Returns `[ProviderOut]`. |
| `GET /api/providers/me` | The caller's own provider profile (`null` if none) | Authenticated | — |
| `PUT /api/providers/me` | Create/replace the caller's profile; also promotes `users.role` to their provider kind | Authenticated | Body `ProviderIn`: `kind`, `company`, `bio?`, `specializations[]`, `country?`, `region?`, `address?`, `coverage?`, `phone?`. |
| `GET /api/providers/me/catalog` · `POST /api/providers/me/catalog` | The caller's catalog items | Authenticated | Body `CatalogItemIn`: `name`, `category?`, `unit?`, `price?`, `currency`(=`AZN`), `description?`. |
| `DELETE /api/providers/me/catalog/{item_id}` | Remove a catalog item | Authenticated | 404 `item_not_found`. |
| `GET /api/providers/{provider_id}` | Public provider profile + catalog | Authenticated | 404 `provider_not_found`. |
| `GET /api/chat` | The caller's conversations | Authenticated | Returns `[ConversationOut]`. |
| `POST /api/chat/start` | Get-or-create a conversation with another user; optional first message | Authenticated | Body `StartConversationIn`: `other_user_id`, `kind`(=`peer`), `body?`. 400 `cannot_message_self`. |
| `GET /api/chat/{conv_id}/messages` | Messages in a conversation | Authenticated (participant) | Returns `[MessageOut]`. |
| `POST /api/chat/{conv_id}/messages` | Post a message | Authenticated (participant) | Body `MessageIn`: `body`. |
| `GET /api/chat/peers?field_id=` | Suggest other farmers with the same crop / region as this field (E7) | Authenticated | Best-effort: any query error returns an empty list. Respects each farmer's `name_public`. |

> ⚠️ Path collision to keep in mind: `/api/chat/*` is the **marketplace** person-to-person chat.
> The per-field **AI assistant** is `/api/fields/{field_id}/chat` in the AI section below.

---

## Share links

Router: `services/app/routers/shares.py` — prefix `/api` (A10).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/fields/{field_id}/shares` | Mint a public link for this field | Write — a worker cannot publish a field | Body `ShareIn`: `scope`, `include_ndvi`, `expires_days`. 400 `bad_scope` / `bad_expires_days`. |
| `GET /api/fields/{field_id}/shares` | Every link ever minted for the field (active + revoked), newest first, with view counts | Member | — |
| `DELETE /api/shares/{share_id}` | Revoke a link (stamped, not deleted — the view counter stays auditable) | Write (org resolved from the share) | 404 `share_not_found`. |
| `GET /api/public/share/{token}` | Resolve a share token → a minimal read-only field card | **Public — the token IS the capability** | Returns `{scope, field:{name, area_ha, crop_type, geometry, centroid}, index:{name, value, date, …}, raster:{tile_url, date, colormap, rescale}, …}` and increments the view counter. |

Every failure mode of the public route — unknown, revoked, expired, or a deleted field — returns
the **same 404 `not_found`**, so the endpoint cannot be used to enumerate or confirm tokens. The
raster it exposes is the clipped, boundary-masked COG, which contains nothing outside that field.
The index/raster query prefers Sentinel-2 (`order by (sensor='S2') desc`) and falls back to HLS
only when no S2 scene exists. Public links are minted against the **marketing apex**, because the
app host bounces signed-out visitors to `/login` — the exact people a share link exists for.

---

## Telegram messaging

Router: `services/app/routers/messaging.py` — **no prefix** (absolute paths). Dormant until
`TELEGRAM_BOT_TOKEN` is set; in-app notifications are unaffected either way.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/messaging/telegram` | Connection status + a one-tap deep-link to bind the user's chat | Authenticated | — |
| `POST /api/messaging/telegram/optin` | Opt in/out of Telegram alerts | Authenticated | Body `{enabled}`. |
| `POST /api/telegram/webhook` | The public webhook Telegram calls; handles `/start <token>` (bind chat) and `/stop` | **Public, secret-gated** | Header `X-Telegram-Bot-Api-Secret-Token` must match `settings.telegram_webhook_secret` → else 403 `bad_secret`. |

---

## Events (funnel instrumentation)

Router: `services/app/routers/events.py` — prefix `/api/events` (D3.6).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `POST /api/events` | Log a named onboarding/activation event | Authenticated | Body `{name, org_id?, meta?}`. Allow-listed names: `onboarding_start`, `field_created`, `crop_set`, `first_scene_seen`, `advice_viewed`, `telegram_connected`, `checklist_complete`. |

Fire-and-forget by design: an unknown name returns `{ok:false, reason:"unknown_event"}` and **any**
write failure is swallowed and still returns `{ok:true}` — instrumentation can never break the UI.

---

## Email preferences (public unsubscribe)

Router: `services/app/routers/email_prefs.py` — prefix `/api/emails`. Every non-transactional
email footer links here with an opaque token that maps to a user.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/emails/unsubscribe?token=` | Turn off the user's lifecycle/marketing email and return a small **localized HTML** confirmation page (so the link works straight from a mail client) | **Public** | Copy exists for all 8 locales; an unknown/expired token renders the same page with an "invalid link" message. |
| `POST /api/emails/unsubscribe?token=` | The programmatic form | **Public** | `{ok}`. |

Both set `users.email_lifecycle = false`. Transactional email (OTP/verification, welcome, the
first "data is ready" report) is unaffected.

---

## AI advice, chat, notifications

Router: `services/app/routers/advice.py` — prefix `/api` (ai tag).
LLM adapter: `services/app/ai/` (default Claude via `AsyncAnthropic`, model chosen per tier).

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/fields/{field_id}/advice` | Latest stored agronomic advice for a field | Member | Returns `{advice: {...}\|null, configured}`. `advice` = `{summary, risks[], recommendations, next_steps, disclaimer, model, generated_at, lang, lang_mismatch}`. |
| `POST /api/fields/{field_id}/advice/generate` | Regenerate advice now, in the caller's language | Member | No body. Returns `{summary, findings, disclaimer, model_provider, model_name, lang}`. **429 `advice_quota_exceeded`**; 503 `ai_not_configured` / `ai_unavailable`. |
| `GET /api/fields/{field_id}/chat` | Chat history for the field's assistant | Member | Returns `{messages:[…], configured}`. Does **not** read `X-Locale`. |
| `POST /api/fields/{field_id}/chat` | Ask the per-field assistant a question | Member | Body `{message, locale?}`. 400 `empty_message`; 503 `ai_not_configured`/`ai_unavailable`. Returns `{reply}`. Over the tier's chat quota the reply is a localized upgrade sentence, **not** an error — and that gated reply is ephemeral: not persisted to `ai_chat_messages`, not charged. |
| `GET /api/notifications` | Recent in-app notifications across the caller's orgs (last 30) | Authenticated | `{notifications:[{id, field_id?, type, severity, title, body, created_at, read}]}`. |
| `POST /api/notifications/read` | Mark all the caller's unread notifications as read | Authenticated | No body. `{ok:true}`. |

### Advice language: `lang` and `lang_mismatch`

Advice prose is generated **once, in one language, and stored as text** — it is never translated
on read. `public.advice.lang` (migration `0049_advice_lang.sql`, `not null default 'az'`) records
which language each row got.

- `lang` — the language the row was written in (`"az"` when the column is null).
- `lang_mismatch` — `lang != <the locale resolved for this request>` (body → `X-Locale` → cookie
  → `az`).

The **newest row still wins even when it is in another language** — a fresh analysis the reader
can have regenerated beats a stale one they can read. `lang_mismatch` is the signal for the UI to
say so and offer a one-tap regeneration instead of silently showing foreign prose.

Who sets the generation language: an interactive `POST …/advice/generate` uses the **caller's**
resolved locale; the automatic `POST /api/internal/advice/run` (fired by the geo pipeline after
every new scene) uses the **org owner's** `users.locale`, because there is no HTTP caller to take
a language from. That is also why `POST /api/auth/locale` exists — the cookie is invisible to
cron- and pipeline-driven work.

### ⚠️ Changed: the quota response is now a refusal

`POST /api/fields/{field_id}/advice/generate` on a spent monthly quota now raises
**429 `advice_quota_exceeded`**.

**It used to return `200 OK` carrying `{"quota_exceeded": true, "tier": …, "limit": …}`.** Every
caller read that as success: the button stopped spinning, nothing changed on screen, and the
farmer was never told the monthly limit was the reason. Any old client that only inspects the
status code will now treat a quota refusal as a generic failure instead of a silent success —
that is the intended correction, but it *is* a breaking change for anything that parsed the
200 body.

Two consequences worth knowing:

- The 429 body carries **only** `detail: "advice_quota_exceeded"`. The `tier` and `limit` values
  that the service layer computes are **not** forwarded to the client.
- The service function `ai/advice.py::generate_and_store` still returns the plain dict
  `{"quota_exceeded": true, "tier", "limit"}` — the **router** is what converts it. So any other
  caller, notably `POST /api/internal/advice/run`, still receives that dict and reports
  `{"ok": true}`, because `result is not None`. An internal-triggered generation that hit the
  quota therefore looks like a success in the cron log.

Free tier is `advice_per_month = 1`, so on a free org this 429 is the common path, not an edge
case.

### Advice content and notification

Advice `findings` (stored JSONB) hold `risks[{title, severity, detail}]`, `recommendations` and
`next_steps`. The `severity` values `aşağı | orta | yüksək` are deliberately kept as
**untranslated codes** at the source (they are DB values and drive notification severity); only
the displayed chip label is localized, client-side. The prose itself is generated in the target
language (8 supported), never machine-translated on read.

A material change to the advice creates an **in-app notification** (`public.notifications`,
`delivered_channels = {inapp}`) whose title follows the advice language. **No email is sent on an
advice change** — that per-advice email was removed in the E15 consolidation, and the code carries
an explicit "do not re-add" comment. Everything non-transactional now arrives in one weekly
digest.

---

## Admin

Router: `services/app/routers/admin.py` — prefix `/api/admin`. Every endpoint is gated by
`require_platform_admin` (`users.is_admin`) → **403 `admin_only`**. The API connects as a
superuser role and bypasses RLS, so these query across **all** orgs/users.

| Method & path | Purpose | Key params / body |
|---|---|---|
| `GET /api/admin/overview` | Platform counters (users/orgs/fields/AI usage/cost) | — |
| `GET /api/admin/tiers` | The tier catalogue (labels, price, limits) | — |
| `GET /api/admin/subscriptions` | Every org with its effective package + owner + field count + this-month AI usage | — |
| `PUT /api/admin/subscriptions/{org_id}` | Set an org's package (billing deferred → manual) | Body `SubUpdate`. 400 `unknown_tier`. |
| `GET /api/admin/users` | All users | — |
| `GET /api/admin/activity?limit=` | Recent platform activity | `limit`(=60, 1..500). |
| `GET /api/admin/usage?group=` | AI usage/cost grouped by `user` (default) \| `model` \| `day` | An unrecognised `group` silently falls back to `user`. |
| `GET /api/admin/billing` | AI cost vs. subscription revenue (`MARKUP_X = 3.0`) | — |
| `GET /api/admin/fields` | **Every** field across all orgs — powers the admin list *and* map | — |
| `GET /api/admin/fields/{field_id}` | Admin-scoped read of one field (bypasses org membership): field row + latest advice + recent index-stats summary | — |
| `PATCH /api/admin/users/{user_id}` | Set `is_active` / `is_admin` / `email_verified` / `full_name` | An admin can **never** remove their own `is_admin` → 400 `cannot_self_demote`. |
| `GET /api/admin/export?kind=&format=` | Stream a dump of `orgs \| users \| fields \| usage` | `kind`(=`orgs`), `format`(=`csv`; `csv \| json`). 400 `unknown_kind` / `unknown_format`. |

---

## Internal triggers (machine-to-machine)

Router: `services/app/routers/internal.py` — prefix `/api/internal`.
The whole router requires `X-Internal-Token` (`require_internal`; 401 `internal_only`
otherwise). Called by the geo pipeline, the server crons and n8n. These carry no user session.

| Method & path | Purpose | Key params / body |
|---|---|---|
| `POST /api/internal/advice/run?field_id=` | Regenerate advice for a field (the API holds the LLM key); notify on material change | Resolves the **org owner's** `users.locale` and generates in that language (falling back to `az`). `{ok:bool}`, or `{ok:false, reason:"ai_not_configured"}` when AI is off. |
| `POST /api/internal/pipeline/run?field_id=&days_back=` | Run the satellite pipeline in-process (only if the geo deps are installed in this image) | `days_back`(=120). 501 `geo_deps_unavailable_run_on_worker` → run `python -m geo_pipeline.pipeline <field_id>` on the geo worker instead. |
| `POST /api/internal/weather/run?field_id=` | Refresh the Open-Meteo forecast + `water_requirements` block (M8), then run the rule engine (T1) | Returns the refresh result with a nested `rules` outcome. |
| `POST /api/internal/weather/drain?limit=` | Refresh weather (+ GDD) for the least-recently-updated fields; daily cron | `limit`(=50) → `{refreshed, considered}`. |
| `POST /api/internal/rules/run?field_id=` | Evaluate all alert rules for a field and dispatch surviving alerts (T1) | Delivery is **in-app + Telegram only**. |
| `POST /api/internal/gdd/run?field_id=` | Recompute Growing-Degree-Days for the field's current season (T4) | — |
| `POST /api/internal/baseline/run?field_id=` | Recompute the per-week index baseline (T6) so anomaly rules have a norm | — |
| `POST /api/internal/research/drain?limit=` | Claim up to `limit` due `research_jobs` and run Phase-1 research (M4) | `limit`(=1) — one job per call so a slow LLM synthesis stays inside the proxy timeout; the cron loops. `{claimed, processed[]}`. |
| `POST /api/internal/research/enqueue-seasonal?limit=&stale_days=` | Seasonal auto-enqueue (T17): queue research for crops whose calibration is absent or stale | `limit`(=200), `stale_days`(=120) → `{enqueued, candidates}`. Curated **seed** norms are never a refresh trigger. |
| `POST /api/internal/season/compute?season_year=&limit=` | Compute per-field season features (T16) → `field_season_features` | `limit`(=2000) → `{computed, season_year}`. |
| `POST /api/internal/emails/data-ready?field_id=` | Transactional "your satellite data is ready" email to the field's org owner (E2.2) | Idempotent per field (`dedup_key=field_id`). `{ok:bool}`. |
| `POST /api/internal/emails/lifecycle/drain` | Send **this ISO week's digest** to every eligible user (E15) | `{ok:true, sent:{variant:count}, total, candidates, skipped}`, or `{ok:false, reason:"email_not_configured"}`. |
| `POST /api/internal/telegram/setup?base_url=` | Register the Telegram webhook (U4). Call once after `TELEGRAM_BOT_TOKEN` is set | `base_url`(=`https://agradex.com`). |

> **Corrected:** `weather/run` and `rules/run` were previously documented here as "Phase 2
> placeholders returning 501 `weather_phase_2` / `rules_phase_2`". Both are fully implemented and
> return real payloads; those two 501 codes no longer exist anywhere in the codebase.

### ⚠️ `emails/lifecycle/drain` — same path, different operation

The path and the cron script name were **deliberately kept**, but the behaviour was replaced by
the E15 consolidation:

- **Was:** nine behavioural rules evaluated daily (`no_field_d1/d3/d7`, `edu_ndvi`, `edu_ledger`,
  `edu_invite`, `no_crop`, `inactive_10d/30d`, `trial_ending`, `digest_weekly`), response
  `{"ok":true, "sent":{template_id: count}, "total"}`.
- **Is:** one weekly digest pass, one template id (`weekly`) with four **variants** —
  `no_fields | no_crop | alerts | calm` — response `{"ok":true, "sent":{variant: count}, "total",
  "candidates", "skipped"}`.

So the `sent` map is now keyed by **variant, not template id**: any log parser or monitor keyed on
the old template names silently reports zero. The dedup key is the ISO week
(`to_char(now(),'IYYY-"W"IW')`), which makes the endpoint **safe to call on any day** — it sends
this week's digest only if it has not gone out yet. Scheduled Wednesday 03:00 UTC = 07:00
Asia/Baku (`deploy/lifecycle-emails.sh`).

---

## Health

Router: `services/app/routers/health.py` — prefix `/api`.

| Method & path | Purpose | Auth | Key params / body |
|---|---|---|---|
| `GET /api/health` | Liveness | Public | `{status:"ok", service:"bagban-api"}` (the service id is intentionally un-rebranded). |
| `GET /api/ready` | Readiness — pings the DB (`select 1`) | Public | `{status:"ready", db:true}` or `{status:"degraded", db:false, error}`. |

---

## Common error codes

`detail` is always a stable machine-readable snake_case string; the frontend maps it to a
localized message (`ERR_KEYS` / `azError()` in `app/src/lib/api.ts`).

| Status | `detail` (selection) | Meaning |
|---|---|---|
| 400 | `not_a_polygon` · `invalid_polygon_self_intersection` · `need_at_least_3_vertices` · `field_too_small` · `invalid_geometry` · `empty_geometry` | Bad field geometry |
| 400 | `invalid_locale` · `invalid_area_unit` · `empty_onboarding` · `empty_message` | Bad preference / AI payload |
| 400 | `no_otp` · `otp_expired` · `invalid_otp` | Email verification |
| 400 | `year_from_after_year_to` · `year_in_future` · `year_before_hls_coverage` · `range_too_wide` | Backfill range |
| 400 | `unknown_index` · `unknown_sensor` · `unknown_nutrient` · `n_zones_out_of_range` · `no_base_dose` · `unknown_strategy` | Zones / VRA / index params |
| 400 | `no_fields_selected` · `too_many_fields` · `field_not_in_org` · `farm_not_in_org` | Bulk / cross-org payload |
| 401 | `unauthorized` | Missing/invalid session token |
| 401 | `internal_only` | Bad/absent `X-Internal-Token` |
| 401 | `invalid_credentials` | Wrong email/password on login |
| 402 | `field_limit_reached` · `photo_quota_exceeded` · `photo_not_in_plan` · `soil_lab_not_in_plan` | Tier limit / feature not in the package |
| 402 | `paid_feature` | Generic PAID gate (`require_paid`; defined, currently unattached) |
| 403 | `forbidden` | Not a member / insufficient role |
| 403 | `admin_only` | Not a platform admin |
| 403 | `account_disabled` · `email_not_verified` | Login refused |
| 403 | `bad_secret` | Telegram webhook secret mismatch |
| 404 | `field_not_found` · `farm_not_found` · `org_not_found` · `task_not_found` · `member_not_found` · `invite_not_found` · `season_not_found` · `document_not_found` · `share_not_found` · `not_found` (public share, deliberately indistinguishable) … | Resource missing |
| 409 | `email_taken` · `invite_used` · `cannot_change_owner` · `season_exists` · `backfill_conflict` · `job_not_cancelable` · `no_ready_zone_run` · `buyer_name_taken` · `inventory_name_taken` | Conflict |
| 410 | `invite_expired` | Invite past its 7-day expiry |
| 413 / 415 | `file_too_large` · `unsupported_type` · `unsupported_media_type` | Upload rejected |
| 422 | `unknown_sensor` | Unknown `?sensor=` family on an index route |
| 429 | **`advice_quota_exceeded`** | Monthly AI-advice quota spent (**was a 200 with `quota_exceeded:true`**) |
| 429 | `too_many_attempts` · `too_many_backfill_jobs` | Rate/attempt limits |
| 501 | `geo_deps_unavailable_run_on_worker` | Geo deps not installed in this image — run on the geo worker |
| 503 | `ai_not_configured` · `ai_unavailable` | LLM key absent or generation failed |
| 503 | `archive_empty` · `trace_code_unavailable` · `frost_unavailable` (or the computed reason) | External archive / code allocation unavailable |

A body that is not a JSON **object** on the endpoints declared as `body: dict`
(`/api/auth/locale`, `/api/auth/area-unit`, `/api/auth/onboarding`, `/api/auth/name-public`,
`/api/auth/email-lifecycle`, `/api/events`, …) is a FastAPI **422** whose `detail` is a validation
**array**, not the string the frontend's `ERR_KEYS` map expects.

---

## Removed endpoints

| Endpoint(s) | Status |
|---|---|
| `GET /api/subsidy/options` · `POST /api/subsidy/calculate` · `POST /api/subsidy/save` · `GET /api/subsidy/history` · `GET /api/subsidy/rates` | **Gone — all 404.** The subsidy calculator was removed from the product (frontend + `services/app/routers/subsidy.py` deleted, commit `f640910`); nothing includes it in `main.py`. The `0008` `subsidy_*` tables are deliberately left **dormant, not dropped**. Any health check curling `/api/subsidy/rates` (expecting 117 rates) now reports a false outage. |
| `GET /api/auth/email-alerts` · `POST /api/auth/email-alerts` | **Gone — 404.** Removed with the E15 email consolidation; migration `0047` dropped the backing `users.email_alerts` column, so leaving them would have produced 500s. Use `/api/auth/email-lifecycle`. |

---

## Dəyişiklik jurnalı (tarixli qeydlər)

### 2026-07-21 — v1.2.0

**Knowledge / passport:** `GET /api/fields/{id}/knowledge` (passport; free tier → `gated`),
`GET /api/fields/{id}/clarifications`, `POST /api/fields/{id}/clarifications/{cid}/answer`,
`POST /api/fields/{id}/research` (manual araşdırma), `GET /api/fields/{id}/norms` (M5).
**İndekslər:** `?sensor=` + NDRE/CIre S2-only (E0). **Sahə:** `PUT /api/fields/{id}` (ad dəyiş),
`DELETE /api/fields/{id}` (soft-delete). **C3:** `POST /api/geo/segment` (→ geoapi proxy).
**Abunəlik:** `GET /api/orgs/{id}/subscription`. **Admin:** `GET /api/admin/subscriptions`,
`PUT /api/admin/subscriptions/{org_id}`, `GET /api/admin/tiers`.
**Internal:** `POST /api/internal/research/drain`, `POST /api/internal/weather/run?field_id=`,
`POST /api/internal/weather/drain`.

### 2026-07-25 — v1.13.0 (email sistemi + məxfilik)

Auth: `GET|POST /api/auth/name-public` (fermer ad-görünürlüyü, New-B),
`GET|POST /api/auth/email-lifecycle` (opt-out; transaksion email bunu görməzdən gəlir).
Public: `GET|POST /api/emails/unsubscribe?token=`; `GET /api/public/share/{token}` — raster+index
Sentinel-2-yə üstünlük verir (`order by (sensor='S2') desc`), HLS yalnız S2 yoxdursa.
Internal: `POST /api/internal/emails/data-ready?field_id=`,
`POST /api/internal/emails/lifecycle/drain`.
Admin: `GET /api/admin/fields`, `GET /api/admin/fields/{id}`, `PATCH /api/admin/users/{id}`,
`GET /api/admin/export?format=csv|json`.

> ⚠️ Bu bölmədəki iki iddia artıq köhnədir: `/api/auth/email-alerts` **silindi** (0047 sütunu
> düşürdü) və `/api/internal/emails/lifecycle/drain` artıq **gündəlik davranış drain-i deyil** —
> həftəlik tək digest-dir və cavabı `sent:{variant:count}` şəklindədir (aşağıya bax).

### 2026-07-26 — dəyişən müqavilələr (E13 · E14 · E15 · P0 · P1)

**Qlobal:** hər sorğuda `X-Locale` başlığı (`app/src/lib/api.ts`); prioritet
`body.locale → X-Locale → bagban_locale cookie → az`; yalnız 3 handler oxuyur
(`GET /advice`, `POST /advice/generate`, `POST /fields/{id}/chat`). 8 dil (`ru` əlavə olundu).

**Yeni:** `POST /api/auth/locale` · `GET|POST /api/auth/area-unit` (0048) ·
`GET|POST /api/auth/onboarding` (0046, E13 kviz) · `SignupIn.onboarding` ·
`GET|PUT /api/auth/notify-prefs` (0051 — 5 kateqoriya × 3 kanal bildiriş matrisi; `PUT {"prefs":{}}`
= tövsiyə olunana qaytarır). `GET /api/notifications` artıq istifadəçinin matrisinə görə süzülür
(sətirlər org-səviyyəlidir, ona görə süzgəc **oxuma** anındadır).

**Dəyişdi:** `GET /api/fields/{id}/advice` → `lang` + `lang_mismatch` (0049) ·
`POST /api/fields/{id}/advice/generate` → kvota indi **429 `advice_quota_exceeded`**
(əvvəl `200` + `quota_exceeded:true` — köhnə klientlər bunu **uğur** kimi oxuyurdu) ·
`POST /api/internal/advice/run` → org sahibinin `users.locale`-i ilə yazır ·
`POST /api/internal/emails/lifecycle/drain` → həftəlik digest, `sent` açarı variant-dır ·
`GET /fields/{id}/rain-nowcast` → `verdict_code`/`verdict_params` ·
`GET /fields/{id}/season-compare` → `verdict.sentence_code`/`sentence_params` ·
`GET /fields/{id}/frost-dates` → `sentence_code`/`sentence_params` ·
`GET /fields/{id}/knowledge` → FAO-56 override artıq `recommendation_code`-u **silmir**, əvəz edir ·
`GET /fields/{id}/clarifications` → `question_code` + `options[].label_code` ·
`GET /fields/{id}/wellness` + `GET /orgs/{id}/wellness` → `label_code`, `weight_pct`,
`detail.proxy` + proxy qaydası (25..85 bandı, `warn` döşəməsi, proxy heç vaxt "ən pis" adlanmır).

**Silindi:** `GET|POST /api/auth/email-alerts` (0047) · bütün `/api/subsidy/*` (f640910) ·
qayda mühərriki və məsləhət dəyişikliyi üzrə **hər-hadisə email** (E15 — yalnız in-app + Telegram
dərhal, qalan hər şey həftəlik digest).
