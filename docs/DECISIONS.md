# Bağban AI — Architecture Decision Log

> An ADR-style record of the significant, non-obvious choices made while building
> Bağban AI (satellite + weather + AI crop-monitoring for Azerbaijani farmers, live at
> https://agradex.com). Each entry states the **Context** (the problem), the **Decision**
> (what we chose), the **Rationale** (why, and the trade-offs), and the **Consequences**
> (what it implies plus any follow-ups). Written for the developer/operator (and a future
> AI assistant) picking this up cold. UI is Azerbaijani; all code, SQL, identifiers, and
> commits are English.
>
> Source of truth for requirements: `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29)
> and `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30). Working context that these
> decisions extend: `CLAUDE.md`.

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
and chat return 503). This is the current live state — `LLM_API_KEY` in `/opt/bagbanai/.env` is
**empty**. To activate: add `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-opus-4-8`,
`LLM_API_KEY=sk-ant-...` to `.env` and restart the `api` container. Requires `anthropic>=0.69`.

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
Email is best-effort — in-app notifications work even with SMTP unconfigured (`SMTP_*` in `.env`
are currently empty). Relevant tables: `advice`, `ai_chat_messages`, `notifications`.

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
the origin with certbot auto-renew; Cloudflare SSL mode is currently **Flexible** — TODO flip to
**Full (Strict)** (origin `:443` is ready). A leftover duplicate server block emits harmless
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

- Add `LLM_API_KEY` (+ `LLM_PROVIDER`, `LLM_MODEL`) to `.env` to activate AI (ADR-0008).
- Flip Cloudflare SSL to Full (Strict); origin `:443` is ready (ADR-0011).
- Clean up the duplicate nginx `server_name` block (ADR-0011).
- Regenerate `EARTHDATA_TOKEN` before **2026-08-30** (ADR-0004).
- Remaining Sprint-2 parity items in `docs/Infrastruktur_Layer_Tekmillesdirme.md` §6
  (cloud-cover filter UI, two-date compare/swipe, country/rayon NDVI benchmark, PDF/DOCX
  reports, official cadastre layer, geocoding search, hillshade/terrain).
- Phase 2 per spec §28 (Open-Meteo weather + GDD/spray/frost/drought models, rule engine →
  multi-channel notifications, reports, baseline/anomaly/phenology, billing PSP).
