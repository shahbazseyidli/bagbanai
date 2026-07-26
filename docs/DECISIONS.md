# Bağban AI — Architecture Decision Log

> An ADR-style record of the significant, non-obvious choices made while building
> Bağban AI (satellite + weather + AI crop-monitoring for Azerbaijani farmers, live at
> https://agradex.com). Each entry states the **Context** (the problem), the **Decision**
> (what we chose), the **Rationale** (why, and the trade-offs), and the **Consequences**
> (what it implies plus any follow-ups). Written for the developer/operator (and a future
> AI assistant) picking this up cold. The UI now ships in **8 languages** (`az` is the default
> and the complete source of truth — see ADR-0016 … ADR-0019); all code, SQL, identifiers, and
> commits are English.
>
> Source of truth for requirements: `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29)
> and `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30 — note the subsidy calculator was
> removed from the product in v1.12.0; the `0008` `subsidy_*` tables are dormant, not dropped).
> Working context that these decisions extend: `CLAUDE.md`.

---

## ADR-0001 — No Supabase: self-hosted Postgres + own auth + RLS via session GUC

**Context.** The original specification assumes Supabase (its managed Postgres, `auth.users`,
`auth.uid()`-based RLS, and object storage). The user wants **everything to run on their own
Hetzner host** — no third-party managed backend, no vendor lock-in, and full control of data
residency.

**Decision.** Drop Supabase entirely and self-host the equivalents:
- **Database:** Postgres 16 + PostGIS in Docker (`db` service in
  `deploy/docker-compose.prod.yml`, image `postgis/postgis:16-3.4`, data in `./pgdata`).
- **Auth:** our own — a `public.users` table, bcrypt password hashes, PyJWT tokens in an
  httpOnly cookie (see ADR-0002).
- **RLS:** kept as defense-in-depth, but rewritten to use a **session GUC** instead of
  `auth.uid()`. The backend calls `SET LOCAL app.user_id = <uuid>` on every request
  (`services/app/db.py` `connection()`), and policies read it through the helper
  `public.current_user_id()` = `current_setting('app.user_id')::uuid`. Every spec
  `references auth.users(id)` became `references public.users(id)`.
- **Storage:** local Hetzner volume for uploads (the `api` service mounts
  `./storage:/srv/storage`); an S3-compatible driver can come later.

**Rationale.** Self-hosting removes the managed-service dependency and keeps operating cost
predictable on a single CPX22 VPS. The GUC approach reproduces Supabase's per-row isolation
without its auth layer. **Primary enforcement is deliberately server-side** — the FastAPI
gating in `services/app/deps.py` (`require_member` / `require_role` / `require_internal`,
`is_org_member` / `org_is_paid`) is the real gate; RLS is a second net so a missed check
still cannot leak another tenant's rows.

**Consequences.** We own auth, migrations, backups, and storage. The whole request path must
faithfully `SET LOCAL app.user_id` or RLS silently over- or under-blocks — so the connection
helper, not individual queries, sets it. Migrations are hand-ordered SQL in `db/migrations/`
(tracked in `public.schema_migrations` by `db/migrate.sh`), not Supabase migrations.

---

## ADR-0002 — Own JWT / bcrypt / httpOnly-cookie authentication

**Context.** Having dropped Supabase Auth (ADR-0001), we still need registration, login,
sessions, and role/membership checks.

**Decision.** Implement authentication in `services/app/security.py`: passwords hashed with
**bcrypt**, sessions carried by a **PyJWT** token stored in an **httpOnly cookie**. The token
identifies the user; `deps.py` resolves membership and role from `public.users`,
`organization_members`, etc., and sets `app.user_id` for RLS.

**Rationale.** An httpOnly cookie keeps the token out of JavaScript's reach (mitigates XSS
token theft) and works cleanly with the same-origin `/api` proxy — no bearer-token plumbing
in the frontend. bcrypt is a well-understood, dependency-light password hash. PyJWT is small
and standard. The trade-off is that we now own the security-sensitive code (rotation, expiry,
reset flows) rather than delegating it.

**Consequences.** Secrets live in `.env` as `JWT_SECRET`; never commit them. Passwords are
**never** stored in files — a password reset is done by generating a fresh bcrypt hash (in the
`api` container) and updating `public.users` directly (this is how the owner account
`seyidlimirshahbaz@gmail.com` was recovered this session). Demo login:
`demo@agradex.com` / `AgradexDemo2026`.

---

## ADR-0003 — MapLibre-native click-to-draw instead of @mapbox/mapbox-gl-draw

**Context.** Field boundaries are drawn on an interactive map. The obvious library for polygon
drawing is `@mapbox/mapbox-gl-draw`, and the spec lists "MapLibre GL + Draw".

**Decision.** Use **MapLibre GL v4** with **native click-to-draw** implemented directly in
`app/src/components/FieldMap.tsx` — click to add vertices, close to finish, edit/clear — and
**remove `@mapbox/mapbox-gl-draw`**.

**Rationale.** `mapbox-gl-draw` was incompatible with MapLibre v4 and **broke the whole map**
(it depends on mapbox-gl internals MapLibre no longer exposes). Rather than pin an old MapLibre
or fork the draw plugin, we implemented the small amount of drawing we actually need on
MapLibre's own event/geometry API. We keep MapLibre (open-source, no access token) rather than
switch to mapbox-gl (which requires a paid token).

**Consequences.** Drawing behavior is our code and must be preserved across map refactors — it
survived the Sprint-1 basemap-gallery rework of `FieldMap.tsx` (ADR-0007). We are not tied to
the draw plugin's release cycle, but any richer editing (snapping, mid-segment vertex insert)
is ours to build.

---

## ADR-0004 — NASA Earthdata **bearer token** on GDAL, not username/password

**Context.** The geo pipeline reads protected HLS Cloud-Optimized GeoTIFFs from LP DAAC over
`/vsicurl`. GDAL must authenticate to NASA Earthdata (EDL) for each COG read. Scene *search*
(CMR/STAC) is public, but the actual raster reads are gated.

**Decision.** Authenticate with an **EDL bearer token**. `services/geo_pipeline/search.py`
`login()` resolves a token from `EARTHDATA_TOKEN` (preferred) and exports it to GDAL as an
HTTP header: `os.environ["GDAL_HTTP_HEADERS"] = "Authorization: Bearer <token>"`. It falls
back to `EARTHDATA_USERNAME`/`PASSWORD` or `~/.netrc` only if no token is present.

**Rationale.** Username/password against the COG endpoints returned **401** — GDAL received
login HTML instead of GeoTIFF bytes and failed with "not recognized as a supported file
format". Handing EDL a bearer token via the `Authorization` header is exactly the token-access
path NASA expects and it works reliably. Only the `/vsicurl` reads need it; search stays
credential-free.

**Consequences.** The token lives in `/opt/bagbanai/.env` as `EARTHDATA_TOKEN` and **expires
2026-08-30** — regenerate at urs.earthdata.nasa.gov and update `.env`, then restart/rerun the
geo worker. GDAL COG env vars (`GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR`,
`CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif`) are set on the containers so windowed reads stay
efficient. Reads are windowed to the field geometry (`read.read_window`) because Hetzner is
outside us-west-2 and egress matters.

---

## ADR-0005 — TiTiler + a **stored clipped-COG-per-scene** hybrid, not live NASA tiling

**Context.** Farmers need a pixel-level colored raster overlay of each vegetation index on their
field (like Azercosmos FarmerApp's Sentinel-2 analysis suite). We could tile the source HLS COGs
live on demand, or precompute per-field products.

**Decision.** (Chosen explicitly with the user.) Run a **background pipeline** that, for each
scene × index, writes a **clipped, field-masked index COG** to `/data/rasters` and records it in
`public.index_rasters` (`storage_path` per scene+index). **TiTiler**
(`ghcr.io/developmentseed/titiler:latest`) then serves and colorizes those small local COGs.
The COG is written by `services/geo_pipeline/read.py` `write_cog()` (COG driver, GTiff fallback
if the GDAL COG driver is absent).

**Rationale.** Live-reading and re-clipping full HLS tiles from NASA on every map pan/zoom would
be slow (cross-region egress, per-request auth) and fragile. Precomputing a tiny per-field COG
once makes tiles fast, cache-friendly, and decoupled from NASA availability — and lets us also
compute zonal `index_stats` in the same pass. The cost is storage on the VPS and a processing
step before data is viewable (handled by the async UX in ADR-0009).

**Consequences.** The `geo` service mounts `./data/rasters:rw`; `titiler` mounts the same path
`:ro`. `public.index_rasters` is the index from a scene+index to a file path. Nine indices are
produced: NDVI, EVI, SAVI, MSAVI, NDMI, NDWI, NBR, NBR2, TVI. Frontend colormap/rescale is
chosen per index family (vegetation vs. water). Reference field "test lecet"
(`860891bd-912c-4ec3-9235-b7d4d0193190`) is fully processed (~962 `index_stats` rows + COGs) for
live testing.

---

## ADR-0006 — TiTiler operational facts: it listens on :80, and the tile route needs the TMS id

**Context.** Wiring TiTiler behind nginx produced two non-obvious failures during testing.

**Decision.** Encode both facts in config and URLs:
1. **The TiTiler image serves on port 80**, not 8000. Compose maps it
   `127.0.0.1:8001:80` (`titiler` service), and nginx proxies `/titiler/ → 127.0.0.1:8001/`.
2. **The tile route must include the TileMatrixSet id** `WebMercatorQuad` in the path. Use
   `/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=<cog>&colormap_name=rdylgn&rescale=-0.1,0.9`.
   The bare `/cog/tiles/{z}/{x}/{y}` route **404s** on this image version.

**Rationale.** These are properties of the pinned TiTiler image, discovered empirically while
tiles wouldn't load. Documenting them prevents rediscovering the same two dead-ends.

**Consequences.** If tiles 404 or connection-refuse after a TiTiler upgrade, re-check the
listen port (compose port map) and the TMS segment first. The scenes endpoint
`GET /api/fields/{id}/scenes?index=` builds these tile-URL templates server-side (with the
correct colormap + rescale per index), and dedups to the least-cloudy scene per date.

---

## ADR-0007 — Free / keyless basemaps instead of paid or ArcGIS tiles

**Context.** Azercosmos FarmerApp (the benchmark) is built on the Esri ArcGIS Maps SDK +
ArcGIS Enterprise + Esri/Google basemaps — all of which need Esri licensing or API keys. We
want a comparable satellite/hybrid map experience with **no paid keys**.

**Decision.** Ship a switchable basemap gallery (`app/src/lib/basemaps.ts`, consumed by
`FieldMap.tsx`) of **free/keyless** sources, each with correct attribution:
- **Hibrid** — Esri World Imagery + Esri reference (labels) overlay
- **Peyk** — Esri World Imagery
- **Sentinel-2 buludsuz** — EOX s2cloudless
- **Küçə** — OpenStreetMap
- **Topo** — OpenTopoMap

The user's choice is persisted in `localStorage`; the map also shows a live lon/lat readout and
has geolocate + navigation controls. Native click-to-draw (ADR-0003) is preserved.

**Rationale.** These tile services are usable without an API key, which keeps the platform free
to run and avoids Esri/Mapbox licensing. It gets us a hybrid/satellite/cloudless/street/topo set
that visually matches the benchmark. Trade-off: we depend on public tile endpoints' availability
and must honor their attribution/usage terms rather than a paid SLA.

**Consequences.** Attribution strings must stay in place. If a provider throttles or changes
URLs, swap the entry in `basemaps.ts`. Gap analysis and the improvement plan for reaching
FarmerApp parity live in `docs/Infrastruktur_Layer_Tekmillesdirme.md` (do not overwrite it).

---

## ADR-0008 — Claude as the default AI provider behind a provider-agnostic adapter

**Context.** The platform generates structured agronomic advice and runs a per-field chatbot.
The spec wants a provider-agnostic AI layer; we need a concrete default that produces reliable
**structured** output.

**Decision.** A provider-agnostic adapter in `services/app/ai/llm.py` with two entry points —
`complete_structured(system, user, schema)` returning a validated Pydantic model (advice) and
`complete_text(system, messages)` for chat. **Claude (Anthropic) is the wired default:** the
structured path uses `AsyncAnthropic().messages.parse(..., output_format=schema)`; the model
comes from `settings.llm_model` defaulting to `claude-opus-4-8`. Provider, model, and key all
come from env (`LLM_PROVIDER` / `LLM_MODEL` / `LLM_API_KEY`, or `ANTHROPIC_API_KEY`). Any other
provider value raises `LLMUnavailable` until wired.

**Rationale.** Claude's `messages.parse` structured-output gives schema-validated advice
(`{ summary, risks[], recommendations, next_steps }`) without brittle JSON-string parsing.
Keeping provider/model/key in env means switching models (e.g. `claude-sonnet-5` for lower cost)
or providers needs no code change. The **API key is only ever read from the environment, never
hard-coded** — a security and portability requirement.

**Consequences.** `is_configured()` gates everything: **with no key, calls raise `LLMUnavailable`
and every AI endpoint degrades gracefully** (advice returns null / `configured:false`; generate
and chat return 503). Requires `anthropic>=0.69`.

> **Update — AI is LIVE.** `LLM_PROVIDER=anthropic` / `LLM_MODEL=claude-opus-4-8` / `LLM_API_KEY`
> have been set in `/opt/bagbanai/.env` since **2026-07-16**; the paragraph above described the
> no-key state and is kept only as the description of that fallback. A *spent quota* is now a
> different failure from a *missing key*: 503 `ai_not_configured` vs **429 `advice_quota_exceeded`**
> (ADR-0017).

---

## ADR-0009 — Async field processing: queue-worker cron + progress/ETA UX + advice-on-change notifications

**Context.** Preparing a field's satellite data (search → windowed COG read → Fmask mask →
zonal stats → write clipped COGs → optional advice) takes minutes, far too long for a request.
Users still need a trustworthy "your data is being prepared" experience, and they should be told
when something actually changes.

**Decision.** Make processing asynchronous and observable:
- Creating a field sets `fields.data_status = 'queued'`. A **cron worker**
  (`deploy/process-queue.sh`, every 2 min under `flock -n /tmp/bagban-queue.lock`) picks up
  queued fields and runs the geo pipeline **newest-scene-first** (`days_back=60`, `track=1`),
  writing clipped COGs to `/data/rasters` and updating progress columns on `fields`
  (`data_status` [none|queued|processing|ready|failed], `data_progress_done/total`,
  `data_started_at`, `data_ready_at`, `data_eta_seconds`, `data_message` — added in migration
  `0009`).
- The frontend shows a "Peyk məlumatı hazırlanır…" banner with a progress bar and honest ETA,
  polling `GET /api/fields/{id}/data-status` until `ready`.
- After each new scene the pipeline calls the internal endpoint
  `POST /api/internal/advice/run` (with `X-Internal-Token`) so the **API** — which holds the LLM
  key — generates advice. When the new advice's risks/recommendations **signature differs** from
  the previous one, an in-app **notification** is created and a best-effort **SMTP email** is
  sent to the org owner.
- A **daily cron** refreshes silently: `run-hls.sh 30` passes `track=0` — it writes new
  scenes/rasters but does **not** reset `data_status` or re-notify.

**Rationale.** A queue + progress columns decouples the slow pipeline from the request cycle and
gives an honest UX instead of a spinner of unknown length. Newest-scene-first means the freshest
imagery renders first. Putting advice generation behind an internal API call keeps the LLM key
solely in the `api` container (the geo worker never sees it). Notifying **only on change** avoids
alert fatigue — a silent daily refresh shouldn't ping anyone.

**Consequences.** Two root crontab entries drive this (queue every 2 min; HLS refresh at 03:00).
`data_status` semantics matter: `track=1` runs update status and can notify; `track=0` must not.
Relevant tables: `advice`, `ai_chat_messages`, `notifications`.

> **Update — the advice-change email is gone (E15, commit `6bf36a6`).** The "best-effort SMTP email
> to the org owner" described above was deleted from `services/app/ai/advice.py` `_notify()`, which
> now carries an explicit *do not re-add* comment: it fired after almost every new scene (every 2–3
> days, per field) and bypassed the template system entirely. The **in-app notification on change is
> unchanged** — and its title now follows the language the advice was written in (ADR-0017).
> Non-transactional email is the weekly digest only (ADR-0020).

---

## ADR-0010 — Billing deferred: keep the gating, skip the payment provider

**Context.** The spec has paid tiers. The user has no payment provider yet but still wants PAID
features to close correctly so they aren't accidentally free.

**Decision.** Keep the billing **data model and gating** — `org_subscriptions` plus the
`org_is_paid()` check used by server-side gating — but **do not integrate Stripe/any PSP**. New
organizations default to `free`; a dev can flip an org to a paid plan manually.

**Rationale.** Gating and billing are separable. Building the enforcement now means paid features
are correctly restricted from day one; adding a real PSP later is then a self-contained task that
doesn't require re-auditing every gated endpoint. The trade-off is that "upgrade" has no
self-serve checkout yet.

**Consequences.** `org_is_paid()` (in `deps.py`) is the single switch paid features gate on. When
a PSP is added, it only needs to write `org_subscriptions`; the gates already read it. Follow-up:
integrate Stripe/PSP (Phase 2, spec §28).

---

## ADR-0011 — Deploy on the agradex.com **root** domain (no subdomain)

> **Superseded in part by ADR-0024.** The app has served from **app.agradex.com** since 2026-07-25;
> the apex is the marketing site. Everything below about nginx, the container port bindings,
> same-origin `/api` and Cloudflare still holds.

**Context.** The platform needs a public URL. The spec is agnostic; the user owns agradex.com.

**Decision.** Serve the app at the **apex/root** `agradex.com` (and `www`), not a subdomain like
`app.agradex.com`. Host nginx (`/etc/nginx/sites-enabled/agradex.com`) fronts everything: two
server blocks — `:80` (no forced redirect, loop-safe under Cloudflare Flexible) and `:443`
(Let's Encrypt cert). Locations in each: `/titiler/ → 127.0.0.1:8001/`, `/api/ → 127.0.0.1:8000`,
`/ → 127.0.0.1:3000`. All app container ports bind to `127.0.0.1` only.

**Rationale.** A single root domain is the simplest public surface and matches the user's intent.
Same-origin `/api` (the `web` container ships `NEXT_PUBLIC_API_BASE=""`) means no CORS and lets
the httpOnly auth cookie (ADR-0002) work without cross-site cookie complications.

**Consequences.** Cloudflare proxies `@` and `www` to `95.216.208.82`. SSL is Let's Encrypt on
the origin with certbot auto-renew; Cloudflare SSL mode is **Full (Strict)** ✅ (verified 2026-07-16)
— CF↔origin encrypted end-to-end. A leftover duplicate server block emits harmless
"conflicting server_name" warnings — cleanup pending. Repo copies of the vhost live at
`deploy/nginx-agradex.conf` and `deploy/nginx-agradex-http.conf`.

---

## ADR-0012 — git `origin` uses the SSH remote (HTTPS push was hanging)

**Context.** During this session, `git push` over the HTTPS remote for
`shahbazseyidli/bagbanai` **hung** indefinitely.

**Decision.** Point `origin` at the **SSH** URL `git@github.com:shahbazseyidli/bagbanai.git`.
SSH push works reliably.

**Rationale.** SSH avoids whatever was stalling the HTTPS transport (proxy/credential-helper
interaction) and uses the operator's existing key. The repo is public, so the deploy checkout on
the server still pulls fine.

**Consequences.** Local pushes must go over SSH (ensure the operator's key is loaded). The server
deploy at `/opt/bagbanai` is a public-repo checkout tracking `origin/main`; redeploy is
`cd /opt/bagbanai && bash deploy/update.sh` (`git pull --ff-only` → **source .env** →
`docker compose -f deploy/docker-compose.prod.yml up -d --build api web titiler` → `nginx -t`
&& reload). `update.sh` **must** source `.env` or `api`/`web` get a blank `DATABASE_URL` and
crash-loop. Secrets backup: `/root/agradex.env.bak`.

---

## Open follow-ups referenced above

- ~~Add `LLM_API_KEY` (+ `LLM_PROVIDER`, `LLM_MODEL`) to `.env` to activate AI (ADR-0008).~~ **Done 2026-07-16.**
- ~~Flip Cloudflare SSL to Full (Strict); origin `:443` is ready (ADR-0011).~~ **Done, verified 2026-07-16.**
- Clean up the duplicate nginx `server_name` block (ADR-0011).
- Regenerate `EARTHDATA_TOKEN` before **2026-08-30** (ADR-0004).
- Remaining Sprint-2 parity items in `docs/Infrastruktur_Layer_Tekmillesdirme.md` §6
  (cloud-cover filter UI, two-date compare/swipe, country/rayon NDVI benchmark, PDF/DOCX
  reports, official cadastre layer, geocoding search, hillshade/terrain).
- Phase 2 per spec §28 (Open-Meteo weather + GDD/spray/frost/drought models, rule engine →
  multi-channel notifications, reports, baseline/anomaly/phenology, billing PSP).

## 2026-07-25 decisions

- **Product renamed Bağban AI → Agradex** across all user-facing surfaces. Infra identifiers (`/opt/bagbanai`, git repo, `bagban-api` health string, container/log names) deliberately KEPT — they are not branding and renaming them would break paths/monitoring. CLAUDE.md prose left as "Bağban AI" (internal, not user-facing).
- **Email personas per locale** — one persona per language, ALL on `@agradex.com` so a single verified Resend domain covers every name (no per-name DNS). Chosen over a single generic sender for warmth/localization.
- **Email backend text via structured codes** (not raw prose) — computed wellness/pest/weather text emits `*_code`+`*_params`, translated on the frontend; keeps DB/compute unchanged while enabling 7-language output. Same principle applied to the share card (client-side `interpret()`).
- **Lifecycle email idempotency via `email_sends` ledger** (unique per user+template+dedup_key) rather than per-user timestamps — simplest correct "send once" that also audits; the weekly digest uses the ISO week as dedup_key to allow repeats.
- **Farmer name privacy = display alias, not data removal** — the real name stays stored (owner sees it); only cross-user views substitute `user_<hash>`. Farmers only (labs/consultants/suppliers are businesses meant to be discoverable).
- **English solution slugs** aligned to the `user_role` enum (farmer/lab/consultant/supplier); old Azerbaijani slugs 308-redirect.

---

## ADR-0013 — Renamed field sections with **no `?tab=` alias table**

**Context.** E14 replaced the field page's tab quartet (`TabKey` / `TABS` / `GROUPS` / `GROUP_OF`,
all living inside `app/src/app/fields/[id]/page.tsx`) with `app/src/lib/fieldSections.ts` — 16
sections in 3 groups (`monitoring` / `work` / `records`), with `GROUP_OF` **derived** from
`SECTION_GROUPS` instead of hand-maintained. The section keys **are** the `?tab=` query values, and
the redesign renamed them: `overview → status`, `sentinel2 → satellite`, `ai → analysis`, and
`nasa` was deleted outright (ADR-0014).

**Decision.** Ship the rename with **no backwards-compatibility alias map**. `resolveSection(raw)`
returns `DEFAULT_SECTION` (`"status"`) for anything not in `ALL_SECTIONS`; there is no
`overview → status` lookup, no redirect and no deprecation window. Taken deliberately, at the
product owner's explicit instruction: clean architecture over compatibility with links that only
test users could hold.

**Rationale.** Stated verbatim in the file header (`fieldSections.ts:8-13`): "the product has only
test users, every internal link builder was updated with the rename, and a compatibility shim for a
compatibility problem we do not have would outlive anyone who remembers why it exists." The
fall-through to the first section is **robustness against a truncated or hand-edited URL, not
legacy support** — the header says so explicitly, so nobody later reads it as the alias mechanism.

**Consequences.** An old link carrying `?tab=overview` / `?tab=ai` / `?tab=sentinel2` / `?tab=nasa`
silently opens **"Sahənin vəziyyəti"** — no redirect, no 404, no notice; a stale link therefore
*looks* like it works. Verified at the time of the change: no such string remains anywhere under
`app/src`, and nothing in `services/app` builds a `tab=` deep link. Reintroducing an alias map is a
~5-line change at `fieldSections.ts:96-98` — read the header comment first; the absence is a
decision, not an oversight. Four dictionary keys are now **orphaned but still present in all 8
locale files** (`field.tab.overview`, `field.tab.sentinel2`, `field.tab.nasa`, `field.tab.ai`), and
`field.tab.nasa` was even renamed to "Peyk arxivi" in `722b808` although nothing references it — so
a grep for "NASA" looks clean while the dead key survives. Also orphaned:
`app.fieldDetail.groupVaziyyet/Isler/Melumat`, superseded by `app.field.group.monitoring/work/records`.

---

## ADR-0014 — HLS/NASA hidden from the **UI** behind one boolean; ingestion untouched

**Context.** The platform ingests two sensor families — NASA HLS (30 m, the long archive and the
denser time series) and Sentinel-2 (10 m, the sharp raster). The UI exposed that split to the
farmer: a separate "NASA" section, a sensor picker in the zones tab, and "NASA + Sentinel-2" in the
marketing copy.

**Decision.** Remove the split from the **user interface only**, behind a single constant:
`HLS_ENABLED = false` in `app/src/lib/sensors.ts`, with `UI_SENSORS` and `sensorVisible()` derived
from it. The `nasa` section was deleted, the field page renders `<SatelliteTab sensor="S2" />`
unconditionally, `ZonesTab`'s sensor picker is gone, and Sentinel-2 is presented as
**"Peyk görüntüsü · 10m"** rather than by its programme name. `SENSOR_META` (a module-level const)
became `sensorMeta()`, a **function**, because the labels go through `t()` and a const captured
whichever locale loaded first.

**Rationale.** "NASA" as a UI word made the farmer think about the data supplier instead of the
field. The data layer keeps both sensors and is untouched — geo pipeline, the `run-hls` cron, the
stored `S30`/`L30` rows, the regional benchmark SQL, A8 backfill and A6 zones all still read HLS
(`sensors.ts:3-12`). **Attribution is a deliberate carve-out**: `/status` still names NASA HLS and
Sentinel-2 (Copernicus), the marketing footer keeps its data-source line, the EOX basemap keeps its
CC BY-NC-SA credit, and the required "Contains modified Copernicus Sentinel data 2026" notice was
*added* in all 7 translated locales (`722b808`). Licence attribution is a legal obligation, not
branding.

**Consequences.** `sensorFamily()` must keep resolving `hls`/`s30`/`l30` regardless of the flag,
because rows tagged with those codes still reach the app. Do not let a cleanup pass delete the HLS
branches as dead code. **Honest caveat on the advertised rollback:** flipping `HLS_ENABLED` to
`true` alone would *not* restore the old UI — nothing outside `sensors.ts` currently consumes
`HLS_ENABLED`, `UI_SENSORS` or `sensorVisible()`, the page hard-codes `sensor="S2"`, and
`SECTION_GROUPS` has no HLS section; a real rollback also needs a section entry and a second
`SatelliteTab` instance. Related: `SatelliteTab`'s p10–p90 spread lines were **un-gated** from
`sensor === "HLS"` because `persist_scene` writes those values for every sensor — the gate would
have deleted the band from the UI the moment NASA stopped being shown. Operational lesson from the
same commit: the sensor-picker deletion in `ZonesTab` over-cut and took the compute button, all four
state banners, the zones map and the statistics table with it (`03620b1` −109 lines, `30b3698`
+85) — a structural deletion anchored on a JSX block boundary compiles fine and the type system
notices nothing.

---

## ADR-0015 — A **proxy** wellness component may move the score, but never name the verdict

**Context.** The Field Wellness Score (B8) composes 0-100 from vegetation / water / pest / GDD, with
missing components dropped and the remaining weights renormalized. The water component falls back to
NDMI when the FAO-56 soil-water balance has not been computed. The old fallback mapped NDMI linearly
onto the full range (`(v + 0.05) / 0.45 * 100`), so a real field reading NDMI ≈ −0.13 — a legitimate
sparse July canopy — scored −17.8, clamped to **0**. Carrying 0.25/0.65 = 38.5 % of the composite, it
dragged a field whose vegetation scored 45 down to **28/100**, headlined *"Risk: water balance
critical (0/100)"* — printed directly above that component's own reason line admitting the balance
had never been computed.

**Decision.** Codify a three-part **PROXY RULE** in the module docstring of
`services/app/ai/wellness.py`, as the second half of the existing HONESTY RULE. A proxy-sourced
component: (1) is compressed into the band `_PROXY_MIN.._PROXY_MAX` = **25..85** over the NDMI
domain `_NDMI_LO.._NDMI_HI` = −0.20..0.40, so it can neither scream "critical" nor certify
"perfect"; (2) carries its **own** `label_code` (`water.ndmi` → "Peyk nəmlik siqnalı"), never the
label of the measurement it stands in for; (3) is never chosen by `_pick_worst()` as the deciding
worst component while any real measurement exists, and can never on its own push the tone to `bad`
(the tone is floored to `warn` when the real-only composite would not be bad).

**Rationale.** The system was accusing the farmer on the strength of a number it admitted, one line
lower, that it could not compute. The rule is about **honesty of authority**: a stand-in signal may
influence the number but must not be the thing the platform points at and calls the field's problem.
The **score itself is deliberately left unchanged** — the proxy did move it, and hiding that would
be its own lie; what is refused is the worst-component label and the worst tone. Measured effect on
the real field (`b2e973f`): 28/100 *"water balance critical (0/100)"* → **40/100 "Diqqət: bitki
örtüyü zəifdir (45/100)"**.

**Consequences.** A field can now show 40/100 with a `warn` tone even though `_WARN_MIN = 45` — that
looks inconsistent and is intentional; do not "fix" it by clamping the score. Any **new** proxy
component must set `extra.proxy = True`, carry its own `label_code`, be band-limited, and ship
`app.wl.label.<code>` + `app.wl.labelLower.<code>` in all 8 locale files, or the headline renders a
raw key. `headline_from_components()` is public precisely so every headline surface applies the same
rules — `load_wellness()` and the org read model (`routers/analytics.py::org_wellness`) both call it;
a third surface must too. Displayed weights now come from `_apportion()` (largest-remainder, ties
broken by the fixed `WEIGHTS` order) so they sum to exactly 100 — the card had been showing
62 % + 39 % = 101 %. The old float `weight` is still emitted alongside the new int `weight_pct`;
consumers must prefer `weight_pct` (`x.weight_pct ?? Math.round(x.weight * 100)`) or they
reintroduce the rounding bug. Rows stored before `b2e973f` carry no `weight_pct`, no `label_code`
and no `detail.proxy` — every reader keeps a fallback.

---

## ADR-0016 — Backend-computed prose ships as **code + params**; the sentence lives in the frontend

**Context.** Six backend modules were composing finished **Azerbaijani sentences in Python** —
rain nowcast verdicts, season-compare verdicts, FAO-56 irrigation recommendations, frost
climatology summaries, clarification questions and their option labels. A Turkish or Russian farmer
read Azerbaijani prose inside an otherwise translated interface. This extends the 2026-07-25
decision above ("email backend text via structured codes") to every farmer-facing string the server
composes.

**Decision.** Each of those modules now emits a stable `*_code` plus raw `*_params` **alongside** the
existing Azerbaijani sentence; the frontend resolves the pair through `tf()` in
`app/src/lib/wellnessText.ts`. Code families introduced: `seasoncmp.*` (`routers/analytics.py`),
`nowcast.*` (`routers/nowcast.py`), `fao56.*` (`ai/irrigation.py`), `frost.*` (`ai/frost.py`),
`clarify.*` (`ai/clarify.py`). Two shape rules fell out of it: whole hours and loose minutes are
**separate codes** (`nowcast.dryHours` / `nowcast.dryMinutes`) because languages decline the two
units differently and a unit must never be glued onto a translated number by the caller; and
`frost.summary` is a **composite** whose params are raw `MM-DD` strings and numbers — never month
names — so a language can reorder its clauses and supply its own month vocabulary
(`app.date.monthsShort`).

**Rationale.** Never translate in Python. The dictionaries already hold the grammar; the server
holds the numbers. Keeping the Azerbaijani sentence as a sibling field means rows written before the
change — and any client that does not know a code — still render something true.

**Consequences.** **When one code path overrides another's text, the code must be replaced, not
dropped.** A real shipped bug: when the FAO-56 daily balance overrode the coarse 7-day water
recommendation, `ai/weather.py` did `content.pop("recommendation_code")` — correct diagnosis (the
coarse code no longer described the visible text), wrong fix, since it left a localized client with
*no* code and a silent fall back to Azerbaijani. It now assigns the FAO-56 twins instead. The
Azerbaijani fallback has a long tail: frost climatology is cached in `zone_knowledge` with a
**365-day TTL**, so `sentence_az` must keep rendering for up to a year unless an agronomist forces
`?refresh=1`; clarification rows and stored wellness `components` from before `b2e973f` likewise
carry no codes. One category deliberately stays **untranslated at the source**: the severity words
`aşağı` / `orta` / `yüksək` are *codes* (DB values, notification severity derivation) and are mapped
to `app.advice.sev.*` only at the label layer by `severityLabel()`, which returns an unrecognised
value **verbatim** rather than dropping it — a new severity must never make a risk invisible.

---

## ADR-0017 — AI advice is **generated** per language and stored; never translated on read

**Context.** A live test in Russian showed the field analysis rendered in Azerbaijani. Five
independent gaps produced it: `users.locale` was written once at signup and never again (the
language switcher only set a cookie); `POST /api/internal/advice/run` — the geo pipeline's
after-every-scene trigger, and therefore the producer of most advice rows — passed no language at
all; `public.advice` had no record of the language a row was written in; the read endpoint returned
the newest row blind to the reader; and both advice surfaces printed the raw Azerbaijani severity
word as the chip label.

**Decision.** Advice prose is **generated once, in one language, and stored as text**. Concretely:
`public.advice.lang` (migration `0049`, `not null default 'az'`) records the language;
`generate_and_store(..., lang=)` writes it; the internal trigger resolves the **org owner's**
`users.locale` (fields → organizations → users) because there is no HTTP caller to take a language
from, and the owner is the person the notification and the weekly digest go to; `POST
/api/auth/locale` persists the switcher's choice so cron- and pipeline-driven work can read it;
`GET /api/fields/{id}/advice` returns `lang` and `lang_mismatch`; and `AdviceLangNote` offers a
one-tap regeneration when they disagree. Notification titles follow the advice language
(`_NOTIFY_TITLE`, 8 locales) because the notification body **is** the advice summary.

**Rationale, and the alternatives rejected.**
- *Translate the stored text on read.* Not done: the row is free-form model output, not a template.
  The code+params convention of ADR-0016 works precisely because those sentences are a **closed set**
  authored in the dictionaries; advice text is unbounded, so there is nothing to key on.
- *Return the newest row **in the reader's language**, i.e. prefer a stale same-language analysis.*
  Rejected explicitly in the handler docstring: "a fresh analysis the reader can have translated
  beats a stale one they can read." The newest row always wins.
- *Show the foreign prose silently.* Rejected — that is the bug, restated. `lang_mismatch` names the
  situation instead.
- *Regenerate automatically on mismatch.* Not done; it is an **offer**. A regeneration spends a slot
  of the org's monthly advice quota (`services/app/tiers.py`: free 1, pro 8, business 30).
- `default 'az'` on the new column backfills existing rows **correctly**, because the auto-trigger
  genuinely never passed a language — that is why no data migration was needed.

**Consequences.** A spent quota is now a **refusal with a status**: `POST /api/fields/{id}/advice/generate`
raises **429 `advice_quota_exceeded`** (`f3a7cf3`). It used to return 200 carrying
`{"quota_exceeded": true}`, so every caller read it as success — the spinner stopped, the page
re-fetched the same old analysis, and a farmer was told "try again shortly" about a limit that
resets next month. Note the service function still *returns* that dict rather than raising: the
router converts it, so **`POST /api/internal/advice/run` still reports `{"ok": true}` on a quota
refusal** and a cron log will not show it. Two loose ends worth knowing: the index created by
`0049` (`advice_field_lang_idx` on `(field_id, lang, generated_at desc)`) is **not used by any query
today** — every reader filters on `field_id` alone — so do not assume a lang-filtered read path
exists; and the weekly digest quotes `advice.summary` with **no `lang` predicate**, so an
Azerbaijani row can still be quoted inside a Russian or English digest. The field page is covered by
the mismatch affordance; the email is not.

---

## ADR-0018 — The **client states its language** (`X-Locale`); the server stops inferring it

**Context.** Found while verifying ADR-0017 end to end: the developer's own browser held **more than
one `bagban_locale` cookie**. The app host and the marketing apex are different hosts, so a
host-only cookie from before the panel split coexists with the `.agradex.com` one. Next's
`cookies.get()` returns the **first**; Starlette's cookie dict keeps the **last**. The interface
could therefore render in one language while the backend wrote prose in another — exactly the bug
the previous two commits set out to remove.

**Decision.** `app/src/lib/api.ts` sends **`X-Locale`** on every request (GET/POST/PUT/PATCH/DELETE
and the multipart upload) via a shared `headers()` helper, taken from `getLocale()` — the same value
`t()` is about to render with. `services/app/routers/advice.py::_resolve_locale` prefers it over the
cookie: **body `locale` → `X-Locale` → `bagban_locale` cookie → `az`**.

**Rationale.** The cookie is genuinely ambiguous in a two-host deployment, and the fix is to stop
guessing rather than to add another heuristic. The client is the only party that knows what it is
rendering.

**Consequences.** The header reaches FastAPI unmodified (`deploy/nginx-agradex.conf`'s `/api/` block
sets only Host/X-Real-IP/X-Forwarded-\*; CORS is `allow_headers=["*"]`). **There is no locale
middleware** — only three handlers read it (`GET /fields/{id}/advice`, `POST
/fields/{id}/advice/generate`, `POST /fields/{id}/chat`); `GET /fields/{id}/chat` deliberately does
not. A fourth reader must call `_resolve_locale(request, ...)` explicitly. One request is
deliberately outside the wrapper: `LanguageSwitcher` posts `/api/auth/locale` with a raw `fetch` and
`keepalive: true` (the switcher navigates immediately), so it carries no `X-Locale` — harmless, the
locale is in the body — and it also bypasses `ApiError`/`azError`, so a 401 on the signed-out
marketing apex is swallowed by design. The locale cookie is now written with
`domain=.agradex.com` on both hosts, but a pre-split host-only cookie can still coexist; the header
is what makes that harmless.

---

## ADR-0019 — Plural forms via `Intl.PluralRules`, with `Dict` widened for `app.plural.*`

**Context.** The field-list header read **"1 полей"** and **"1 fields"**. It concatenated a count
with one fixed noun — which only ever works in Azerbaijani and Turkish, where the singular follows
any numeral ("5 sahə"). English and German need one/other; Russian and Polish need three forms.

**Decision.** `tp(base, n)` in `app/src/lib/i18n.ts` selects the form with
`new Intl.PluralRules(_locale).select(n)` and resolves `<base>.<category>` through `tf()`, falling
back to `<base>.other` when the selected form is absent. The dictionaries supply only the forms
themselves: az/tr/hu declare `.other` alone, en/de/it declare one+other, ru/pl declare
one/few/many/other. The two single-noun keys it replaces (`today.fieldsWord`,
`app.fieldsList.fieldsCountSep`) were deleted from all eight dictionaries.

**Rationale, and why `Dict` had to change.** `I18nKey` is derived from the `az` dictionary
(`export type I18nKey = keyof typeof az`), and **Azerbaijani has no `few`/`many` form to derive the
key from** — so with `Dict = Partial<Record<I18nKey, string>>` Russian and Polish literally could not
declare the forms their grammar requires. `Dict` is therefore
`Partial<Record<I18nKey, string>> & PluralForms`, where
``type PluralForms = { [K in `app.plural.${string}`]?: string }``. The widening is scoped to the
`app.plural.` prefix on purpose: every other key stays governed by the az source of truth.

**Consequences.** Adding a plural noun needs **both halves**: `az` must declare `<base>.other`
(that key becomes the `I18nKey`), and any locale needing `few`/`many` relies on the widening. Two
call sites exist today (`/fields` header, `TodayHome`); other `<n> <noun>` sites carry the same flaw
and are named as future conversions — sales records, share views, peer farmers, rain days. **Editing
hazard, already burned once (`8c38e8b`):** `i18n.ts`'s **last `};` is the `DICTS` registry, not the
`az` dictionary**, so a script that anchors on it produces `const DICTS = { az   "app.plural.fields.other": "sahə", };`
and breaks the module. The seven per-locale files each hold a single object and are safe. This
machine has **no local Node**, so such a break only surfaces in the server-side `docker build web` —
which is also where the follow-up type error was caught (`84e5f28`).

---

## ADR-0020 — One **weekly digest** instead of per-event email; critical alerts folded in

**Context.** Three independent senders mailed the farmer, two of them bypassing the template system
entirely: `rules/engine.py::_deliver_email()` sent one message **per fired alert per field** (a
farmer with 3 fields in bad weather got a dozen a day); `ai/advice.py::_notify()` mailed the org
owner the full advice body after almost every material change, i.e. every 2–3 days per field; and
`emails/lifecycle.py` ran **nine behavioral rules** daily (`no_field_d1/d3/d7`, `edu_ndvi/edu_ledger/edu_invite`,
`no_crop`, `inactive_10d/30d`, `trial_ending`, `digest_weekly`). Two opt-out flags governed the whole
thing — `email_alerts` (0030) and `email_lifecycle` (0044) — and the two bypassing senders honoured
neither.

**Decision (E15).** Outbound email is now **transactional + one weekly digest**, and nothing else.
- Transactional: OTP/verification, welcome, and the first "your field is ready" report.
- Recurring: **one** template id `weekly` (`services/app/ai/emails/weekly.py`) with four variants —
  `no_fields`, `no_crop`, `alerts`, `calm` — sent **Wednesday 03:00 UTC = 07:00 Asia/Baku**
  (Azerbaijan is UTC+4 with no DST), deduped on the **ISO week**
  (`to_char(now(), 'IYYY-"W"IW')`).
- **Alerts fold in.** The rule engine still writes `public.notifications` and still pushes Telegram
  **immediately**; the digest is their only *email* surface. Both deleted senders leave an explicit
  *"Do not re-add"* comment where they used to be.
- `users.email_alerts` is **dropped** (migration `0047`), leaving `email_lifecycle` as the single
  opt-out for all non-transactional email; the dead `/api/auth/email-alerts` endpoints and
  `EmailAlertsToggle.tsx` went with it.

**Rationale.** One template id with variants rather than four ids, **because the ledger dedups on
(user, template_id, dedup_key)** — separate ids would let a farmer who adds a field on Thursday
receive a second email in the same week. Immediacy is not what email is good at: in-app and Telegram
already deliver it, cost nothing and cannot flood. Two independent guards now sit in `send.py`: the
dedup key, and a `TRANSACTIONAL_CAP_HOURS = 24` rolling cap — because transactional mail bypasses
the opt-out and a farmer who draws five fields in one afternoon has five distinct dedup keys.
Over-cap sends are recorded as `skipped` so a later cron cannot deliver them late.

**Consequences.** The drain path is **unchanged** (`POST /api/internal/emails/lifecycle/drain`) so
the crontab entry's URL did not have to move — but the **cron line changed** from `15 6 * * *`
(daily) to `0 3 * * 3`, and `deploy/lifecycle-emails.sh` can only document that; **root's crontab on
95.216.208.82 must be edited by hand**. Until it is, the drain runs daily — harmless, because the
ISO-week dedup makes it a no-op, but the digest lands on the old weekday. Calling it out of band is
safe by design, not a bug to "fix" in the runbook. The response `sent` map is keyed by **variant**,
not template id, so any monitor keyed on `no_field_d1` / `edu_ndvi` / `trial_ending` silently reports
zero. `catalog_i18n.py` still carries copy for the eleven deleted templates in tr/de/hu/it/pl —
inert (only `data_ready` is merged) but do not read it as a list of live templates. **Translation
debt:** `WEEKLY_EXTRA` contains only `ru`, and `weekly._LABELS` only az/en/ru, so tr/de/hu/it/pl
receive the digest in **English** by fallback. The digest embeds a satellite image over a **public**
TiTiler URL (`/titiler/cog/preview.png`, not the tile route) because Gmail proxies images — the
exposure equals the public share links in `routers/shares.py`. Deploy ordering: `0047` drops a
column, so it must go **with or after** the code that stopped reading it (`6bf36a6`); rolling the
API back past that commit while `0047` is applied resurrects two endpoints and one dispatcher that
500 against a dropped column.

---

## ADR-0021 — Hectares stay the storage unit; area units convert **only at the render edge**

**Context.** Everything the platform stores and computes is in hectares — `fields.area_ha`, the geo
pipeline, the FAO-56 and fertilizer models, the AI context. That is not the unit farmers think in:
Turkey's *tapu* land registry is written in **dönüm** (1 000 m² = dekar), and Azerbaijani everyday
speech uses **sot/sotka** (100 m²) for small plots — "beş sot bağ", not "0.05 hektar".

**Decision.** Add a per-user display preference `users.area_unit` (migration `0048`, nullable with a
CHECK of `ha` | `donum` | `sotka`) behind `GET`/`POST /api/auth/area-unit`, and do **all** conversion
in one client-side formatter, `app/src/lib/units.ts`. `NULL` means *derive from `users.country`*
(TR → dönüm, any other explicit country → ha, else the interface language, else ha). Decimals differ
per unit on purpose (ha 2, dönüm 1, sotka 0) because nobody wants to read "13.60 dönüm".
**`sotka` is never a default** — it reads well below ~1 ha and badly above it (a 40 ha field as
"4000 sot"), so it is explicit opt-in only.

**Rationale.** Showing everyone hectares is a quiet "this app was not built for me" signal. Keeping
hectares as the storage unit means no model, no migration and no API contract changes — the
preference is a rendering concern and stays one.

**Consequences.** Anything that **writes** an area must convert back: `YieldsTab` does
`fromUnit(Number(area), areaUnit)` before POSTing. **Per-hectare rates stay per hectare**
(t/ha yields, kg/ha fertilizer doses, the zone dose columns) — those are agronomic norms published
per hectare, and the code says so at both sites. `units.ts` is `"use client"`: Server Components must
not call `formatArea()`/`useFormatArea()` — pass the number down, the same rule that already applies
to `t()`. `services/app/routers/auth.py::_effective_area_unit()` is a **deliberate duplicate** of
`defaultAreaUnit()` in `units.ts` and says so; if the country→unit mapping grows beyond the `_TURKEY`
set, both sides change or the server's `effective` and the client's optimistic default disagree.
`useAreaUnit()` initialises from an in-memory module variable, so the first component on a page load
can paint hectares for one frame; and `clearAreaUnitCache()` is called from logout
(`app/src/lib/auth.tsx:85`) so the next account on a shared device does not inherit the previous
farmer's unit — keep that call if logout is refactored.

---

## ADR-0022 — The four farm-record modules live behind **one `/farm` tab** (and are parked); empty marketplace surfaces hidden

**Context.** Dəftər (ledger), Satış (sales), Anbar (inventory) and Texnika (equipment) were four
separate top-level rail destinations. They are four views of **the same object — the farm business,
not a field** — and the farmer opens them weekly at most. Separately, `/catalog` (supplier
marketplace) and `/chat` (farmer community) are fully implemented and currently **empty**: no seeded
providers, no messages.

**Decision.** Consolidate the four into one container route `/farm` with `?tab=` sections
(`app/src/lib/farmSections.ts`), and **park them there**: the rail now lists five destinations
(Bu gün · Sahələr · Təsərrüfat · Hesabatlar · Daha çox), `/more` collapses the four rows into one,
and the bottom nav's `/notifications` slot became `/farm`. The four page bodies moved **verbatim**
into `app/src/components/farm/*Section.tsx`, each keeping its own auth/org guards — nothing was
removed. Section keys are deliberately identical to the old route slugs so the mapping is mechanical
and the redirects cannot drift from the list. Catalog and chat are hidden from the rail, bottom nav
and `/more` behind a single constant `SHOW_MARKETPLACE_NAV = false`
(`app/src/lib/navFlags.ts`) — **not** a kill switch: routes, API and components stay live, deep links
still open them, and the landing still links to `/catalog`.

**Rationale.** Four of the rail's entries for records opened weekly at most was a disproportionate
share of the farmer's attention. And "a marketplace with no suppliers and a community with no
conversations advertise emptiness exactly where the farmer is looking for value" (`navFlags.ts`) —
seeding content is the only precondition for flipping the flag back.

**Consequences.** The old routes `/ledger` `/sales` `/inventory` `/equipment` **`redirect()` = 307,
deliberately not `permanentRedirect()` = 308**: "a permanent redirect is cached by the browser
forever, so reverting the consolidation would strand anyone who had visited the old URL." Do not
"harmonise" this with the 308 on `/yenilikler → /whats-new`, where the rename **is** final. In-app
deep links were repointed rather than left to the redirect (`HarvestTab` now links
`/farm?tab=sales&…`). `BottomNav`'s `isActive` had to become a **segment-boundary** match
(`pathname === href || pathname.startsWith(href + "/")`) because `/farms` starts with `/farm` and a
raw prefix match lit up the wrong tab. `SHOW_MARKETPLACE_NAV` is annotated `: boolean` on purpose —
without the annotation TypeScript infers the literal `false`, narrows every ternary to its else
branch and reports the enabled branch as dead code; the annotation keeps flipping it a genuine
one-character change. **Unresolved detail:** the source comments disagree on the rail's previous
size — `AppRail.tsx` says "four of eleven rail slots", `farmSections.ts` says "four of thirteen rail
entries". The post-change count (five) is verified; the before-count is not.

---

## ADR-0023 — Every MapLibre map waits for a **real animation frame** before it is constructed

**Context.** Maps were blank on `app.agradex.com`: a correctly sized canvas, a live WebGL context,
working zoom controls, the legend drawn — and no tiles, no polygons and **not a single console
error**. Two defensive fixes against the wrong diagnosis did not help (see Consequences). Diagnosed
by reaching the MapLibre instance **through the React fiber** on the live page and reading its
private state: `style._loaded === false`, `style.stylesheet === null`, empty `sourceCaches`,
`style._frameRequest` still pending, `document.visibilityState === "hidden"`.

**Decision.** Gate **every** map construction on `useMapReady()`
(`app/src/lib/useMapReady.ts`) — a hook that returns `false` until the first `requestAnimationFrame`
callback actually fires, re-arming on `visibilitychange → visible`. All five constructions are
gated: `FieldMap`'s `DrawMap` / `DisplayMap` / `CompareMap`, `FieldsOverviewMap`, and `ZonesTab`'s
`ZonesMap`.

**Rationale.** MapLibre's `Style.loadJSON` does not parse the style inline — it awaits one animation
frame (`browser.frameAsync`) and **swallows the rejection** if that frame never arrives. A background
tab produces no frames, so a map built there never loads its style, never fires `load`, never
requests a tile, never raises an error — **and MapLibre does not retry when the tab is later shown**.
The bug was never specific to one component: the per-field map and the zones map were equally blank;
the marketing map "worked" only because that page happened to be built while its tab was in front.
Users hit it through a middle-click / open-in-new-tab, a restored session, a PWA warm start, or a
link opened behind the current window. `requestAnimationFrame` was chosen over
`document.visibilityState` because a minimised or fully occluded window can report `"visible"` while
still being throttled.

**Consequences.** Any new MapLibre map **must** gate on this hook or it is permanently blank in a
background tab, silently. Recognise the symptom by its silence: sized canvas, live context, no
tiles, no error. The earlier fix in `FieldsOverviewMap` — listeners attached before any draw, every
draw wrapped in `drawSafe()`, `styledata` added alongside `load`/`idle` (`70e1378`) — is **still in
the code and is a legitimate defensive change, but it is not the root-cause remedy**; it was attempt
#1 against the wrong diagnosis (`073b62f` is the fix). Do not read it as such. The fiber-walk is the
technique to reuse for any "no error, nothing renders" WebGL/canvas symptom.

---

## ADR-0024 — The app lives on **app.agradex.com**, and the host is resolved on the **server** (supersedes part of ADR-0011)

**Context.** The panel split has been active since 2026-07-25: `app.agradex.com` serves the
application, the apex `agradex.com` (and `www`) serves marketing. But the **home page could not
decide which one it was until the browser mounted** — `useIsAppHost()` was a mount effect, and the
landing sat behind `if (loading)`, which on the server always starts `true`. Every crawler therefore
received a spinner: the home page was **12.5 KB with zero `<h1>` and zero `<p>`**, while `/pricing`,
`/how-it-works`, `/solutions` and `/status` already server-rendered 83–152 KB with real headings.
(That last measurement also **corrects** the strategy reports' claim that the whole site rendered
client-side.)

**Decision.** Resolve the host from the request, on the server. `middleware.ts` sets three request
headers — `x-app-host` (`"1"`/`"0"`, from the `Host` header against `PANEL_HOST`), `x-locale`, and
the locale-stripped `x-pathname`. `RootLayout` wraps the tree in `<AppHostProvider value={…}>` and
`useIsAppHost()` reads context, falling back to the old mount detection only outside the provider.
`app/src/lib/host.ts` therefore became **`host.tsx`** — the extension change is load-bearing, the
module now exports a JSX provider — while the import specifier `@/lib/host` is unchanged everywhere.
Two things ride along on the same header plumbing: `generateMetadata()` emits a per-request canonical
plus `alternates.languages` for **every** locale in `LOCALES` plus `x-default` (there were **no**
hreflang alternates at all, so eight language versions were competing for the same queries), and
`publicUrl(path)` mints share and invite links against the **apex** rather than
`window.location.origin` — links minted inside the app pointed at `app.agradex.com/s/…`, where the
host bounces signed-out visitors to `/login`, i.e. exactly the people a share link exists for.

**Rationale.** The apex is always marketing and the host is known from the request, so the branch can
be taken during SSR. Side benefit: the app host no longer flashes marketing before correcting itself.

**Consequences.** ADR-0011's "root domain, no subdomain" no longer describes production; its nginx,
port-binding, same-origin `/api` and Cloudflare content still does. **A missing `x-app-host` header
means APP host** (`layout.tsx` computes `h.get("x-app-host") !== "0"`) — the opposite of the old
client default; the middleware matcher covers every HTML route today, but any future path excluded
from it renders as the app host. The app host's public-path allowlist (`/pricing`, `/solutions`,
`/how-it-works`, `/finduq`, `/guide`, `/whats-new`, `/yenilikler`, `/status`, `/s/*`) **must stay
above the auth gate** — it was moved there specifically so `/s/` share links work for signed-out
recipients, and putting it back below `if (!hasAuth)` silently reinstates the login wall for every
share link and team invite. Cross-host redirects now carry the locale prefix, and the locale cookie
is written with `domain: .agradex.com` when the split is on (see ADR-0018). **Honest gap:** only the
*before* HTML sizes are recorded in `6bf36a6`; no after-measurement exists anywhere in the repo, so
the improvement is asserted structurally (the landing now renders during SSR) and would have to be
measured against the live site if a number is needed.

---

## Open follow-ups from ADR-0013 – ADR-0024

- **Edit root's crontab on 95.216.208.82**: the digest line must become `0 3 * * 3`; the repo can
  only document it in `deploy/lifecycle-emails.sh` (ADR-0020).
- **Weekly-digest translation debt**: `catalog_i18n.WEEKLY_EXTRA` holds only `ru` and
  `weekly._LABELS` only az/en/ru, so tr/de/hu/it/pl receive the digest in English by fallback
  (ADR-0020).
- **Digest image URL is unverified end to end**: `https://app.agradex.com/titiler/cog/preview.png`
  must resolve anonymously or every weekly email ships a broken `<img>`; the repo's
  `deploy/nginx-agradex.conf` names only the apex, so this needs a curl test on the host (ADR-0020).
- **`HLS_ENABLED` is not yet a sufficient rollback** — a section entry in `fieldSections.ts` and a
  second `SatelliteTab` instance are also required (ADR-0014).
- **The weekly digest quotes advice prose with no `lang` predicate**, so an Azerbaijani row can
  appear inside a Russian digest; the field page is covered by `lang_mismatch`, the email is not
  (ADR-0017).
- **Dead keys to sweep when convenient**: `field.tab.overview/sentinel2/nasa/ai` and
  `app.fieldDetail.groupVaziyyet/Isler/Melumat` in all 8 locale files (ADR-0013); the eleven deleted
  email templates' copy in `catalog_i18n.py` for tr/de/hu/it/pl (ADR-0020); the unused
  `advice_field_lang_idx` (ADR-0017).
- **`FieldMapSheet` leftovers**: it still runs a `scenes?index=NDVI&sensor=s2` request per field open
  whose result is unused, and `dataSaver` / `forceRaster` / the `DisplayMap` and `Layers` imports are
  dead after the hero-map removal — an oversight, not a decision (ADR-0014).
- **Convert the remaining `<n> <noun>` sites to `tp()`**: sales records, share views, peer farmers,
  rain days (ADR-0019).

