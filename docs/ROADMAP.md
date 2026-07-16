# Bağban AI — Roadmap

> **Purpose.** This is the forward-looking plan for Bağban AI (satellite + weather + AI crop
> monitoring for Azerbaijani farmers, LIVE at https://agradex.com). It records **where we are now**,
> **how that maps to the original spec phases**, and **what to do next** — each backlog item states
> WHAT it is, WHY it matters, and HOW to do it, with concrete file paths, endpoints, env vars, and
> commands. Written to be picked up by a future developer or AI assistant with no memory of the
> session that built this.
>
> **Sources of truth.** The specification `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29)
> plus `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30) define the product. `CLAUDE.md` holds
> working context/decisions. The infra gap analysis vs Azercosmos FarmerApp lives in
> `docs/Infrastruktur_Layer_Tekmillesdirme.md` (esp. §6 plan and §8 sprints). This roadmap does not
> replace those — it sequences the remaining work.
>
> **Rules that constrain the plan.** UI text is Azerbaijani (`app/src/lib/i18n.ts`, default `az`);
> code/SQL/identifiers/commits are English. No Supabase (self-hosted Postgres 16 + PostGIS, own JWT
> auth, `current_user_id()` session GUC). Billing is deferred but gating (`org_is_paid()`) is kept so
> paid features close correctly. Domain is the `agradex.com` root.

---

## 1. Where we are now (shipped, CHANGELOG 1.0.0 → 1.0.6)

Phase 1 of the spec is **built, deployed, and live**. Layered on top, three infra/AI sprints landed
this cycle. Mapped to the changelog:

### `[1.0.0]` — Phase 1 foundation (live at agradex.com)
- **DB (Postgres 16 + PostGIS):** full multi-tenant schema (spec §7/§8) — `organizations`,
  `organization_members`, `organization_invites`, `farms`, `fields` (+`field_metadata`), `scenes`,
  `index_stats`, `index_rasters`, `weather_cache`, `scouting_observations`, `tasks`,
  `field_operations`, `yields`, `reports`, `advice`, `ai_chat_messages`, `notifications`,
  `org_subscriptions`, `crop_thresholds`, plus subsidy tables. Migrations `db/migrations/0001…0009`
  tracked in `public.schema_migrations` by `db/migrate.sh`. Own `public.users` auth table; RLS as
  defense-in-depth via `current_user_id()` (session GUC `app.user_id`), primary enforcement is
  server-side gating in `services/app/deps.py` (`require_member`/`require_role`/`require_internal`).
- **Subsidy calculator (§30, FR-21):** 2026 table seeded — 117 rates + modifiers + regions
  (`db/seeds`, amount = coef × 200); match + modifier engine (14 tests pass);
  `/api/subsidy/{options,calculate,save,history,rates}`.
- **Backend (FastAPI):** JWT auth + server-side gating; orgs/farms/fields/metadata/scouting/tasks/
  operations/yields/uploads API; health + internal triggers.
- **HLS pipeline (§10):** search → windowed COG read → Fmask mask → zonal stats → PostGIS, 9 indices
  (NDVI/EVI/SAVI/MSAVI/NDMI/NDWI/NBR/NBR2/TVI) in `services/geo_pipeline/`.
- **Frontend (Next.js 15, Azerbaijani):** auth, onboarding, MapLibre field draw, metadata form,
  scouting/tasks/operations/yields, subsidy calculator, team/invites.
- **Deploy:** Hetzner (Docker Compose db+api+web) + nginx + Cloudflare.

### `[1.0.1]` — HLS pipeline live with real data + SSL
- Earthdata **bearer token** (`EARTHDATA_TOKEN`) set on GDAL as `Authorization: Bearer` for
  `/vsicurl` COG reads (username/password gave 401). Geo worker image `services/Dockerfile.geo`.
  Verified on a demo Zaqatala field: 17 scenes / 153 `index_stats`, NDVI ~0.73.
- Let's Encrypt cert on origin; nginx `:80` (loop-safe) + `:443`.

### `[1.0.2]` — Map fixed
- Removed `@mapbox/mapbox-gl-draw` (incompatible with this MapLibre v4 — its `addLayer` threw at init
  and broke the **entire** map render). Replaced with MapLibre-native click-to-draw in
  `app/src/components/FieldMap.tsx` (click to add vertices, ≥3 closes polygon, live hectares).

### `[1.0.3]` — NDVI chart fix + metadata dropdowns
- **Root-cause fix of the index chart that never rendered:** `OverviewTab` expected `data.points`
  with a `value` field, but `/api/fields/{id}/indices` returns `{ series: [{date,mean,p10,p50,p90}] }`.
  Aligned the frontend (read `series`, plot `mean`, add a faint p10–p90 within-field band);
  updated `IndexPoint`/`IndexSeries` in `types.ts`.
- **Metadata form → all dropdowns:** crop_type, variety (crop-dependent), soil_type,
  irrigation_method, previous_crop, growth_stage, tillage_practice now `<select>` with Azerbaijani
  labels + canonical English values + a "Digər" free-text fallback. New `app/src/lib/metadataOptions.ts`.

### `[1.0.4]` — Basemap gallery + map controls (infra Sprint 1)
- Switchable basemaps in `app/src/lib/basemaps.ts` + `FieldMap.tsx` refactor: **Hibrid** (Esri World
  Imagery + reference labels), **Peyk** (Esri World Imagery), **Sentinel-2 buludsuz** (EOX
  s2cloudless), **Küçə** (OSM), **Topo** (OpenTopoMap) — all free/keyless with attribution; choice
  persisted in `localStorage`.
- Live lon/lat coordinate readout, geolocate + navigation controls. Field boundary now yellow
  (clearer over imagery).

### `[1.0.5]` — TiTiler raster analysis suite + async processing (infra Sprint 2)
- **Async field processing:** creating a field sets `fields.data_status='queued'`; a cron worker
  (`deploy/process-queue.sh`, every 2 min, `flock`-guarded) runs the geo pipeline **newest-scene-
  first**, writes clipped, field-masked index COGs to `/data/rasters` (recorded in
  `public.index_rasters.storage_path`), updates `data_progress_done/total` + `data_eta_seconds`,
  and posts a "data ready" notification. Migration `0009` added the `data_status`/progress columns.
- **Raster overlay UI:** `OverviewTab` overlays the selected index as a pixel-level colored **TiTiler**
  raster clipped to the field, with an index-adaptive legend (Zəif/Orta/Sağlam for vegetation,
  Quru/Orta/Nəm for water indices) + a scene timeline (date + cloud %, deduped to least-cloudy per
  date). Azerbaijani index labels + one-line descriptions.
- **API:** `GET /api/fields/{id}/data-status` (poll), `GET /api/fields/{id}/scenes?index=`
  (per-scene TiTiler tile-URL templates). nginx `/titiler/` → `127.0.0.1:8001`. **Tile URL must
  include the TileMatrixSet:** `/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=…&colormap_name=
  rdylgn&rescale=-0.1,0.9` (the bare `/cog/tiles/{z}/{x}/{y}` route 404s; TiTiler listens on port 80).

### `[1.0.6]` — AI agronomic advice + chatbot (Claude)
- **Provider-agnostic LLM adapter** `services/app/ai/llm.py` — default Claude (`claude-opus-4-8`),
  `complete_structured` via `AsyncAnthropic` `messages.parse` with a Pydantic schema, `complete_text`
  for chat, `is_configured()` gates everything. Provider/model/key from env
  (`LLM_PROVIDER`/`LLM_MODEL`/`LLM_API_KEY`).
- **Advice** (`services/app/ai/advice.py` + `context.py`): builds field context (NASA index trends
  latest / 4-weeks-ago / 90-day min-max + crop metadata + recent scouting/operations/open tasks/
  yields + previous advice summary) → Claude → structured `{ summary, risks[{title,severity,detail}],
  recommendations, next_steps }` (Azerbaijani) stored in `public.advice`. Generated **automatically**
  after each new scene: the pipeline calls `POST /api/internal/advice/run` (`X-Internal-Token`) so the
  API (which holds the LLM key) does generation. When the risks/recommendations signature changes vs
  the previous advice, an in-app notification + best-effort SMTP email go to the org owner.
- **Per-field chatbot** (`services/app/ai/chat.py`): context = field data + latest advice + last 12
  turns; each turn stored in `public.ai_chat_messages`.
- **Frontend** `app/src/components/field/AiTab.tsx`: advice card (severity chips, recommendations,
  next steps, disclaimer, "Yenidən analiz et") + live chat. Endpoints
  `GET/POST /api/fields/{id}/advice(/generate)`, `GET/POST /api/fields/{id}/chat`,
  `GET /api/notifications`, `POST /api/notifications/read`, internal `POST /api/internal/advice/run`.
- **Status:** fully built + deployed, verified in graceful **no-key** mode (`advice` null /
  `configured:false`; `generate` → 503). **Activation requires adding `LLM_API_KEY` to `.env`** — see
  backlog P0-1.

> **Reference fields for testing.** "test lecet" `860891bd-912c-4ec3-9235-b7d4d0193190` (fully
> processed: ~962 `index_stats` rows + clipped COGs). Demo "Findiq sahesi 1"
> `4a08ee8a-4123-4fe5-a07f-ed24c69c5604`; "Xudat fındıq sahəsi"
> `8e046b22-cbbf-4e54-b201-7e973d9106b9`. Demo login `demo@agradex.com` / `AgradexDemo2026`.

---

## 2. Status vs the original spec phases (§28)

The spec (§28, line 842–845) defines four phases. Current standing:

| Phase | Scope (spec §28) | Status |
|---|---|---|
| **Phase 1 — Foundation** | auth/onboarding, org→farm→field, roles, billing shell, AZ i18n; field/metadata; HLS pipeline + FREE index visualization + time series; scouting (photo), tasks/operations log, yields | ✅ **DONE & live** (billing gating present, PSP deferred by design) |
| **Phase 2 — Cheap differentiation** | Open-Meteo + weather models (GDD/spray/frost/drought); multi-channel notifications (Telegram/WhatsApp); **AI advice + AI chat**; phenology/anomaly | 🟡 **Partially done.** AI advice + chat **built** (1.0.6, needs key). Weather, weather models, multi-channel notify, phenology/anomaly **pending** |
| **Phase 3 — Premium/regional depth** | management zones + VRA export; ET irrigation; cost/economics; cooperative/group; soil data; offline PWA; disease/pest models; reports (§17) | ⬜ **Pending** |
| **Phase 4 — Ecosystem/vision** | API, white-label, benchmarking, traceability (hazelnut export), carbon, **EKTIS/eagro.az integration** | ⬜ **Not started** |

**Ahead of the original plan:** the infra map suite (basemap gallery, TiTiler raster overlay, async
processing UX) was not an explicit §28 line item — it came from the FarmerApp gap analysis
(`docs/Infrastruktur_Layer_Tekmillesdirme.md`) and pulls raster visualization to parity with the
benchmark. The remaining infra sprint-3 items (§8 of that doc) are folded into the backlog below.

---

## 3. Near-term backlog (prioritized)

Priorities: **P0** = do first (unblocks live value or is a hard deadline), **P1** = high value,
next in line, **P2** = valuable but can wait.

### P0 — do now

#### P0-1 · Activate AI (add `LLM_API_KEY`)
- **WHAT:** the AI advice + chatbot pipeline (1.0.6) is fully deployed but dormant because
  `LLM_API_KEY` in `/opt/bagbanai/.env` is empty, so `is_configured()` returns false and every AI
  endpoint degrades gracefully (`advice` null, `generate`/`chat` → 503).
- **WHY:** this is the single flip that turns a built feature into a live one — the highest
  value-per-effort item on the board. It also lights up the auto-advice-after-each-scene loop and the
  change-notification/email path.
- **HOW:** on the server, add to `/opt/bagbanai/.env`:
  ```
  LLM_PROVIDER=anthropic
  LLM_MODEL=claude-opus-4-8         # or claude-sonnet-5 for lower cost
  LLM_API_KEY=sk-ant-...
  ```
  Then `cd /opt/bagbanai && bash deploy/update.sh` (or restart just the api container — it holds the
  key). Also mirror the key into the secrets backup `/root/agradex.env.bak`. Verify with
  `GET /api/fields/{id}/advice` returning `configured:true` and a `POST …/generate` on a processed
  reference field ("test lecet"). Never commit the key.

#### P0-2 · Renew `EARTHDATA_TOKEN` before 2026-08-30
- **WHAT:** the NASA Earthdata Login bearer token used for `/vsicurl` HLS COG reads **expires
  2026-08-30**.
- **WHY:** on expiry the geo pipeline gets 401s on every COG read — new fields never leave
  `data_status='queued'`, the daily refresh cron silently fails, and no new scenes/advice are
  produced. Silent breakage of the core data feed.
- **HOW:** generate a fresh bearer token at https://urs.earthdata.nasa.gov (User Tokens), update
  `EARTHDATA_TOKEN` in `/opt/bagbanai/.env` (+ `/root/agradex.env.bak`), then restart/redeploy so the
  geo worker picks it up. Validate: `cd /opt/bagbanai && bash deploy/run-hls.sh 30` on a test field
  and confirm new `scenes`/`index_stats` rows. Consider a calendar reminder ~2 weeks before expiry.

#### P0-3 · Cloudflare SSL → Full (Strict) — ✅ DONE (verified 2026-07-16)
- **WHAT:** Cloudflare SSL mode is now **Full (Strict)** — CF↔origin is encrypted end-to-end
  (origin `:443` with a Let's Encrypt cert). Confirmed in the CF dashboard on 2026-07-16.
- **WHY:** Flexible means the CF↔origin hop is plaintext HTTP — a real confidentiality gap for an app
  with logins and farm data. The reason it wasn't done earlier: the CF dashboard was unresponsive
  during setup.
- **HOW:** Cloudflare dashboard → the `agradex.com` zone → SSL/TLS → Overview → set encryption mode to
  **Full (Strict)**. Because the live nginx vhost already serves `:443` with a valid LE cert
  (`/etc/letsencrypt/live/agradex.com/`, certbot auto-renew) and `:80` is loop-safe (no forced
  redirect), the flip should be non-disruptive. Verify the site still loads over HTTPS and check for
  redirect loops.

### P1 — next

#### P1-1 · nginx duplicate `server_name` cleanup
- **WHAT:** the live vhost `/etc/nginx/sites-enabled/agradex.com` emits harmless "conflicting
  server_name" warnings from a leftover duplicate server block.
- **WHY:** noise that hides real config errors and risks a future edit landing in the wrong block.
  Low risk, low effort — good hygiene before other nginx changes (e.g. tile caching).
- **HOW:** inspect the vhost, remove the stale duplicate `server` block (keep the `:80` loop-safe
  block and the `:443` LE block, each with `/titiler/`, `/api/`, `/` locations), `nginx -t`, then
  `systemctl reload nginx`. Update the repo copies `deploy/nginx-agradex.conf` and
  `deploy/nginx-agradex-http.conf` to match.

#### P1-2 · Cloud-cover filter UI on the scene timeline
- **WHAT:** a max-cloud-% slider that filters the scene timeline to clean scenes (FarmerApp
  §3.1.8 / gap doc §6.6). Cloud % is already surfaced per scene by `GET /api/fields/{id}/scenes`.
- **WHY:** completes the raster-analysis suite; lets farmers hide cloudy dates so the overlay/timeline
  shows only trustworthy imagery. Data is already present — this is UI only.
- **HOW:** in `OverviewTab`, add a slider (15–100%) that filters the already-fetched scene list by
  `cloud_pct` before rendering the timeline. No backend change needed.

#### P1-3 · Two-date compare / swipe
- **WHAT:** overlay two dates' index rasters with a swipe/split control (before/after change) —
  FarmerApp §3.1.7 / gap doc §6.6.
- **WHY:** shows change over time spatially (e.g. a zone that declined between two scenes) — a
  headline FarmerApp capability we still lack.
- **HOW:** in the map component, add two TiTiler raster layers (two scene dates for the selected
  index) and a MapLibre swipe (`maplibre-gl-compare`-style clip on `mousemove`). Both tile URLs come
  from the existing `GET /api/fields/{id}/scenes?index=` response — no backend change.

#### P1-4 · Country / rayon NDVI benchmark
- **WHAT:** add a national/regional average line to the NDVI stats chart so a field is compared
  against a benchmark (FarmerApp §3.1.6 / gap doc §6.6). The field mean + p10–p90 band already render.
- **WHY:** turns "your NDVI is 0.7" into "your NDVI is 0.7 vs the country average 0.6" — much more
  actionable, and a visible FarmerApp differentiator.
- **HOW:** compute and store a rolling national/rayon NDVI average (a scheduled aggregate over
  `index_stats` grouped by date/region), expose it via the indices endpoint, and plot it as a third
  Recharts series in `OverviewTab`. Needs a small new aggregate table/query + a cron.

### P2 — later

#### P2-1 · Geocoding / place search
- **WHAT:** a search box to jump the map to a place (FarmerApp "Axtar" / gap doc §6.7).
- **WHY:** faster field location, especially on first onboarding. Not blocking; a convenience.
- **HOW:** simplest is the OSM **Nominatim** API directly (respect attribution + rate limits); for
  volume/self-hosting, run **Photon** (Komoot). Wire results to `map.flyTo`.

#### P2-2 · Hillshade / terrain
- **WHAT:** an elevation/hillshade layer (FarmerApp Terrain3D / gap doc §6.8).
- **WHY:** context for slope/drainage; nice-to-have visual depth. Low urgency.
- **HOW:** MapLibre terrain via free **AWS Terrain Tiles** (Terrarium encoding) or MapTiler DEM
  (freemium) as a hillshade source in the basemap registry (`app/src/lib/basemaps.ts`).

#### P2-3 · Field import / export (GeoJSON / KML / Shapefile)
- **WHAT:** export a field boundary and import one when creating a field (gap doc §6.5).
- **WHY:** interoperability with FarmerApp and GIS tools; eases migration of existing fields.
- **HOW:** export current polygon → GeoJSON (native), KML (`@placemarkio/tokml`), Shapefile
  (`shp-write`); import → GeoJSON/KML (`@tmcw/togeojson`), zipped Shapefile (`shpjs`).

#### P2-4 · Measurement + annotation tools
- **WHAT:** distance/area measurement (ha/km) and point/line/polygon annotation with color (gap doc
  §6.3–6.4).
- **WHY:** parity with FarmerApp's toolbelt; practical for field planning.
- **HOW:** `@turf/area` + `@turf/length` are already dependencies; reuse the native-draw logic in
  `FieldMap.tsx` for a `MeasureControl` and an annotation layer.

---

## 4. Phase 2 features (spec §28, FR-3,4,7,8,16,18,19)

The remaining Phase 2 work beyond AI advice/chat (which is done pending the key). Stubs already exist:
`/api/internal/weather/run` and `/api/internal/rules/run`.

- **Weather ingestion (Open-Meteo).** WHAT: pull forecast/history per field into `weather_cache`.
  WHY: it is the input for every agronomic model below and is free/keyless. HOW: implement the
  `/api/internal/weather/run` internal endpoint + a cron (mirror the HLS cron pattern in the root
  crontab), keyed by field centroid, cached in `public.weather_cache`.
- **Weather-based agronomic models (GDD / spray window / frost / drought).** WHAT: derive
  growing-degree-days, spray suitability, frost risk, drought stress from cached weather + crop
  thresholds (`crop_thresholds`). WHY: turns raw weather into decisions — the "cheap differentiation"
  thesis of Phase 2. HOW: a models module in `services/app/` computing per-field indicators on the
  weather refresh.
- **Rule engine → multi-channel notifications.** WHAT: threshold/rule evaluation that raises
  `notifications` and dispatches Telegram/WhatsApp/email (PAID, gated by `org_is_paid()`). WHY:
  retention + paid conversion (spec DoD). HOW: implement `/api/internal/rules/run`; use **n8n** at
  `agent.agradex.com` for channel dispatch (Telegram/WhatsApp/email); in-app already works,
  email needs `SMTP_*` in `.env` (currently empty).
- **Reports (PDF / Excel).** WHAT: per-field + date-range report (NDVI chart + mean/min/max + map
  image + notes) → PDF/DOCX/Excel (FarmerApp "Report"; gap doc §6.9; spec §17). WHY: farmers/coops
  want a shareable artifact; the `reports` table already exists. HOW: server-side render (map image +
  Recharts snapshot) → PDF.
- **Phenology / anomaly / baseline.** WHAT: growth-stage tracking + baseline/anomaly detection on the
  index series. WHY: earlier problem detection than raw values. HOW: compute per-field baselines from
  `index_stats` history; flag deviations into `notifications`.
- **Billing (Stripe / PSP).** WHAT: wire an actual payment provider to `org_subscriptions`. WHY:
  monetization — deliberately deferred, but the gating shell (`org_is_paid()`, default `free`) is
  already in place so paid features close correctly. HOW: integrate Stripe or a local PSP; flip
  `org_subscriptions.plan` on successful payment. No gating rewrite needed.

---

## 5. Phase 3+ and ideas

**Phase 3 (spec §28, FR-14 + nice-to-haves):** management zones + VRA (variable-rate application)
export; ET-based irrigation scheduling; cost/economics tracking; cooperative/group features; soil
data integration; offline PWA; disease/pest models (evaluate a Plantix-style partnership); the full
report suite (§17). **Phase 4 (ecosystem/vision):** public API, white-label, benchmarking,
traceability for hazelnut export, carbon accounting, and **EKTIS / eagro.az** government-system
integration.

**Standalone infra idea (gap doc §6.10, P3, data-dependent):** an official cadastre/parcel reference
layer if the state exposes an open WMS/WFS or AKTA parcel dataset — lets farmers align their drawn
field to the official parcel. Requires data-access agreement.

**Ops hygiene worth tracking:** raster tile caching (nginx `proxy_cache` or a TiTiler mosaic) once
overlay traffic grows (gap doc §7); log rotation for `/var/log/bagban-hls.log` and
`/var/log/bagban-queue.log`.

---

## 6. How to pick up next (for a future session)

1. **Read the context first.** `CLAUDE.md` (working decisions), `CHANGELOG.md` (what shipped), the
   two spec docs in `docs/`, and `docs/Infrastruktur_Layer_Tekmillesdirme.md` §6/§8 (infra plan). The
   repo is the source of truth — verify details in the actual files before acting.
2. **Highest-leverage move: P0-1 (activate AI).** Add `LLM_PROVIDER`/`LLM_MODEL`/`LLM_API_KEY` to
   `/opt/bagbanai/.env`, redeploy, and a fully-built feature goes live. Then handle the two deadlines:
   P0-2 (`EARTHDATA_TOKEN` before **2026-08-30**) and P0-3 (Cloudflare Full (Strict)).
3. **Deploy loop.** Push to `origin/main` (SSH remote `git@github.com:shahbazseyidli/bagbanai.git` —
   HTTPS push was hanging), then on the server `cd /opt/bagbanai && bash deploy/update.sh`.
   `update.sh` **must** source `.env` or api/web crash-loop on a blank `DATABASE_URL`. Secrets live in
   `/opt/bagbanai/.env` (backup `/root/agradex.env.bak`) — never commit them.
4. **Verify against a processed reference field.** Use "test lecet"
   `860891bd-912c-4ec3-9235-b7d4d0193190` (has ~962 `index_stats` rows + clipped COGs) or demo login
   `demo@agradex.com` / `AgradexDemo2026`.
5. **After each atomic change:** descriptive commit (`feat(scope): …`), update `CHANGELOG.md`, and
   update `CLAUDE.md`/this roadmap so the next session inherits the context. Follow phases in order
   (§28) and check the Definition of Done before moving on.
