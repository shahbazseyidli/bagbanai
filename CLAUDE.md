# Bağban AI — Claude Code iş konteksti (CLAUDE.md)

> Gələcək sessiyalar üçün işlək kontekst. Detal `docs/` altındadır (aşağıda "Sənəd xəritəsi").

> Bu fayl gələcək sessiyalar üçün **iş konteksti** və qərarları saxlayır (tam spesifikasiya deyil — bax `docs/`). Hər fazadan/qərardan/sprintdən sonra yenilə.

## Nədir
Peyk (NASA HLS) + hava (Open-Meteo) + AI əsaslı əkin monitorinqi və təsərrüfat idarəetmə platforması. Hədəf: Azərbaycan/Qafqaz fermerləri, kooperativləri, aqronomları. **CANLI:** https://agradex.com.

## Tək həqiqət mənbəyi (SSoT)
- `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` — əsas platforma spesifikasiyası (§1–§29).
- `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` — §30 subsidiya kalkulyatoru + 2026 seed.
Spesifikasiyadan kənara çıxma. Tələb dəyişsə, əvvəl soruş, razılaşdıqdan sonra bu faylı və sənədi yenilə.

## Sənəd xəritəsi (docs/ — burada işlə konteksti, orada detal)
Bu CLAUDE.md **qısa iş konteksti**; dərin detal ayrı sənədlərdədir:
- `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` + `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` — SSoT (yuxarıda).
- `docs/Infrastruktur_Layer_Tekmillesdirme.md` — Azercosmos FarmerApp benchmark + pulsuz/self-hosted təkmilləşdirmə planı (Sprint 1/2 mənbəyi; §6 qalan işlər). **Üzərinə yazma.**
- `docs/ARCHITECTURE.md` — sistem memarlığı (frontend/backend/geo/DB/TiTiler/AI axını).
- `docs/API_REFERENCE.md` — endpoint-lərin siyahısı və müqavilələri.
- `docs/OPERATIONS.md` — deploy, cron, redeploy, secrets, monitorinq əməliyyatları.
- `docs/ROADMAP.md` — **tək funksional task-izləyici** (§A bitmiş · §B istifadəçi-bloklu U1-U12 · §C vahid backlog T0-T26 statusla). Görülənlər + açıq işlər.
- `docs/DESIGN_IMPLEMENTATION_PLAN.md` — **redizayn tracker (D0-D5)**: dizayn araşdırması (`wf_68ea40bc`) → İА/dizayn-sistem/onboarding icra planı. §A feature-parity matrisi, §K status. **D0 ✅ D1 ✅ D2 ✅ · D3/D4/D5 🚀 əsas hissə canlı** (landing xəritəsi+public segment, qiymət redizayn, TTS səsləndir, offline chip, İŞLƏR click-first chips, chart p10-p90 band; SKIP: Telegram iki-tərəf/STT/telefon-OTP/çöl-testi — asılılıq).
- `docs/DECISIONS.md` — memarlıq qərarları (nə üçün Supabase yox, TiTiler seçimi, native-draw və s.).

## Dil qaydası
- Bütün UI mətnləri **Azərbaycan dilində** (i18n; default `az`, sonra `ru`, `tr`).
- Bütün kod, identifikator, SQL, sxem, commit mesajları **İngilis dilində**.

## Texnoloji stack (sabit)
- **Frontend:** Next.js 15 (App Router, TypeScript) `app/`-də. **MapLibre GL v4** (native kliklə-çək; `@mapbox/mapbox-gl-draw` DEYİL — uyğunsuz idi, xəritəni tam pozurdu). Recharts, Tailwind, i18n (`app/src/lib/i18n.ts`, default `az`). Same-origin `/api` (nginx → FastAPI proxy).
- **Backend:** FastAPI (Python 3.11) `services/app/`-də. asyncpg pool (`db.py` `connection()` → `SET LOCAL app.user_id`). Öz JWT auth (`public.users` + bcrypt + PyJWT httpOnly cookie, `security.py`). RLS defense-in-depth: session GUC `current_setting('app.user_id')` üzərindən `public.current_user_id()` (Supabase `auth.uid()` əvəzinə); **ƏSAS icra server-tərəfli gating** `deps.py` (`require_member`/`require_role`/`require_internal`, `is_org_member`/`org_is_paid`).
- **Geo pipeline:** `services/geo_pipeline/` (earthaccess, pystac, rioxarray, rasterio, shapely). NASA Earthdata auth **EARTHDATA_TOKEN** bearer ilə — GDAL-a `Authorization: Bearer` header kimi verilir (/vsicurl COG oxumaları; user/pass 401 verirdi). Axın (§10): `HLSS30_VI`/`HLSL30_VI` axtarışı → pəncərəli COG oxuma → Fmask bulud/kölgə maskası → zonal stats → PostGIS; 9 indeks NDVI/EVI/SAVI/MSAVI/NDMI/NDWI/NBR/NBR2/TVI. **Bu sessiyada əlavə:** hər səhnə+indeks üçün clipped, sahə-maskalanmış **index COG** `/data/rasters`-ə yazılır (`read.write_cog`: COG driver, GTiff fallback), `public.index_rasters`-də qeyd olunur — TiTiler üçün.
- **DB:** Postgres 16 + PostGIS (Docker). Sıralı miqrasiyalar `db/migrations/0001..0028` (`public.schema_migrations`, `db/migrate.sh`). **0014** = knowledge layer. **0015→0023** = v2.1 tasks (partial-status/alert_state/field_gdd/index_baseline/photo_diagnoses/water_balance/benchmark-hardening/pest_risk/fertilizer). **0024** = email_verified+otp (U3) + messaging_channels/message_log (U4). **0025** = `fields.deleted_at` (soft-delete, D2.7). **0026** = crop_thresholds `norms_source`/`norms_updated_at` (T17 research write-back provenance). **0027** = `soil_profiles` (T24 lab-analiz OCR). **0028** = `field_season_features` (T16 mövsüm feature-store). Seed `db/seeds` (subsidiya 117 + crop_thresholds index_norms + inline seeds pest_risk_models/crop_nutrient_norms — deploy-da `load_seeds.py` MÜTLƏQ işə düşməlidir).
- **TiTiler:** `ghcr.io/developmentseed/titiler:latest` — clipped index COG-ları rəngləyib servis edir. Image **PORT 80-də dinləyir** (compose `127.0.0.1:8001:80`). nginx `/titiler/` → `127.0.0.1:8001`. Tile URL **TileMatrixSet id daxil olmalıdır**: `/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=<cog-path>&colormap_name=rdylgn&rescale=-0.1,0.9` (çılpaq `/cog/tiles/{z}/{x}/{y}` route 404 verir).
- **AI:** provayder-agnostik adapter `services/app/ai/` (`llm.py` Claude via AsyncAnthropic + `messages.parse` strukturlu çıxış + `web_research` (web_search tool) + per-call `model=` override; `context.py` sahə konteksti + knowledge passport; `advice.py`/`chat.py` (tier kvota + tier-model); `notify.py`; knowledge layer: `knowledge/research/jobs/clarify/weather/soil/tiers/sources/*`). `LLM_API_KEY` **TƏYİN — AI AKTİV**; açar yoxdursa səliqəli deqradasiya (advice null, chat 503), struktur-API blokları (soil/weather) LLM-siz də işləyir. `anthropic>=0.69`.
- **Orkestr:** n8n (agent.agradex.com, ayrı box); server crons Hetzner root crontab-da.

## Yerləşdirmə hədəfi
- Domain: **agradex.com** (apex/root — subdomain yox).
- Host: **Hetzner** serveri, nginx + Let's Encrypt.
- Git remote **origin = SSH** `git@github.com:shahbazseyidli/bagbanai.git` (HTTPS push bu sessiyada asılıb qalırdı; SSH işləyir).

## Spesifikasiyadan KƏNARLAŞMALAR (istifadəçi qərarları — SSoT bunlarla oxunur)
1. **Supabase yoxdur.** DB self-hosted **Postgres 16 + PostGIS**; auth **öz JWT-miz** (`public.users` + bcrypt + PyJWT httpOnly cookie); RLS `auth.uid()` əvəzinə `current_user_id()` session GUC (backend hər sorğuda `SET LOCAL app.user_id`), əsas icra server-tərəfli gating; storage **lokal Hetzner volume**.
2. **Ödəniş hələ yoxdur.** `org_subscriptions` + `org_is_paid()` gating **saxlanır** (PAID funksiyalar düzgün qapansın), amma Stripe/PSP təxirə salınıb; yeni org default `free`.
3. **Domain agradex.com root.**

## İş prinsipləri (MÜTLƏQ)
- Fazalı gedişat (§28). Növbəti fazaya keçməzdən əvvəl DoD yoxla/göstər.
- Hər atomik dəyişiklikdən sonra təsviri commit (`feat(scope): ...`) + push (SSH origin).
- Multi-tenancy: hər cədvəldə `org_id`; giriş zənciri `field → farm → organization → membership`.
- Təhlükəsizlik: gating həm RLS, həm server-tərəfli. Heç bir sirr commit olunmur (`.env`). Miqrasiyalar `db/migrations/`.
- Keyfiyyət: tipli/təmiz kod, xəta idarəetməsi, idempotent pipeline/bildiriş, pəncərəli COG oxuma + keş.

## Layihə strukturu
```
bagbanai/
├─ app/              # Next.js 15 (frontend + BFF route handlers)
├─ services/app/     # FastAPI (auth, gating, orgs/farms/fields, ai/, internal triggers)
├─ services/geo_pipeline/  # HLS: search→COG→Fmask→zonal stats→PostGIS + clipped COG yazımı
├─ db/migrations/    # sıralı SQL DDL 0001..0009 (§7/§8/§30)
├─ db/seeds/         # crop_thresholds, subsidy seed loader
├─ deploy/           # docker-compose.prod.yml, nginx, update.sh, run-hls.sh, process-queue.sh
└─ docs/             # SSoT spesifikasiyaları + memarlıq/əməliyyat sənədləri
```

## Faza 1 vəziyyəti — CANLI + bu sessiyanın yenilikləri
**Faza 1 istehsalatda** (https://agradex.com): DB/backend/geo pipeline/subsidiya/frontend/deploy hamısı hazır və commit olunub. Bu sessiyada üstünə əlavə edilənlər:

### İnfrastruktur Sprint 1 — Basemap qalereyası (v1.0.4)
- Keçidli basemap-lar (`app/src/lib/basemaps.ts`, `FieldMap.tsx` refaktoru): **Hibrid** (Esri World Imagery + Esri reference labels), **Peyk** (Esri World Imagery), **Sentinel-2 buludsuz** (EOX s2cloudless), **Küçə** (OSM), **Topo** (OpenTopoMap) — hamısı pulsuz/açarsız + attribution; seçim `localStorage`-da; canlı lon/lat oxunuşu + geolokasiya/naviqasiya kontrolları. Native-draw qorunub; sahə sərhədi sarı.

### İnfrastruktur Sprint 2 — TiTiler peyk raster analizi + asinxron emal (v1.0.5)
- **Asinxron pipeline:** sahə yaradılanda `data_status='queued'`; cron worker `deploy/process-queue.sh` (hər 2 dəq) geo pipeline-ı **ən-yeni-səhnə-əvvəl** işlədir, clipped index COG-ları `/data/rasters`-ə yazır, proqres/ETA yeniləyir, "data hazır" bildirişi göndərir. Günlük cron sakitcə yeniləyir (`track=0`).
- **Frontend:** "Peyk məlumatı hazırlanır…" banneri (proqres bar + dürüst ETA) `GET /api/fields/{id}/data-status`-ı poll edir; OverviewTab seçilən indeksi sahə üzərində **piksel-səviyyəli TiTiler rasteri** kimi overlay edir, indeks-adaptiv legend (Zəif/Orta/Sağlam bitki üçün; Quru/Orta/Nəm su indeksləri üçün), səhnə timeline-ı (tarix + bulud %, gün üzrə ən-az-buludlu səhnəyə dedup), Azərbaycanca indeks adları + təsvirlər.

### AI aqronom məsləhəti + chatbot (Claude) (v1.0.6)
- **Provayder-agnostik LLM adapter** (`services/app/ai/llm.py`) — default Claude; `complete_structured` = AsyncAnthropic `messages.parse` + Pydantic sxem; `complete_text` = chat; `is_configured()` hər şeyi gate edir (açar yoxdursa səliqəli "qoşulmayıb"). Model/provayder/açar env-dən, heç vaxt hard-code deyil.
- **Advice** (`advice.py`): sahə konteksti (`context.py` = NASA indeks trendləri son/4-həftə-əvvəl/90g min-max + məhsul metadatası + son skautinq/əməliyyat/açıq tapşırıq/məhsuldarlıq + əvvəlki məsləhət xülasəsi) → Claude → strukturlu `{summary, risks[{title, severity aşağı|orta|yüksək, detail}], recommendations, next_steps}` (Azərbaycanca) → `public.advice`. Hər yeni peyk səhnəsindən sonra **avtomatik**: geo pipeline `POST /api/internal/advice/run` (X-Internal-Token) çağırır ki, LLM açarını saxlayan **API** generasiya etsin. Yeni məsləhətin risk/tövsiyə imzası əvvəlkindən fərqlənəndə → in-app bildiriş + org sahibinə email (best-effort SMTP).
- **Chatbot** (`chat.py`): kontekst = sahə datası + son məsləhət + son 12 söhbət növbəsi; hər növbə `public.ai_chat_messages`-də saxlanır.
- **Frontend "AI Məsləhət" tab** (`app/src/components/field/AiTab.tsx`): məsləhət kartı (risk şiddət nişanları, tövsiyələr, növbəti addımlar, disclaimer, "Yenidən analiz et") + canlı söhbət.
- **STATUS:** tam qurulub, deploy olunub, açarsız rejimdə doğrulanıb. **Aktivləşdirmək üçün** `/opt/bagbanai/.env`-ə `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-opus-4-8` (və ya ucuz üçün `claude-sonnet-5`), `LLM_API_KEY=sk-ant-...` əlavə et, sonra `api`-ni yenidən başlat.

## Data modeli (bax `db/migrations`)
`users, organizations, organization_members, organization_invites, farms, fields` (0009: `data_status` [none|queued|processing|ready|failed], `data_progress_done/total`, `data_started_at`, `data_ready_at`, `data_eta_seconds`, `data_message` — asinxron "hazırlanır" UX üçün), `field_metadata, scenes, index_stats, index_rasters` (`storage_path` per scene+index), `weather_cache, scouting_observations, tasks, field_operations, yields, reports, advice` (`summary`, `findings` jsonb = `{risks,recommendations,next_steps}`, `input_snapshot`, `model_provider/name`, `disclaimer`), `ai_chat_messages` (role, content, context_snapshot), `notifications` (source, type, severity, title, body, delivered_channels, read_at), `org_subscriptions` (tier free|pro|business + valid_until + hectare_cap — billing gating, bax `[[billing-tiers]]`), `ai_usage` (kind advice|chat, tokens, cost — 0011), `crop_thresholds` (0014: +index_norms jsonb per-index bantlar + growth_stage/age_class), **`zone_knowledge`** (paylaşılan, crop+zone, RLS yox), **`field_knowledge`** (soil_profile/field_context/water_requirements/spray_window bloklar, org_id+RLS), **`clarifications`**, **`research_jobs`** (0014 — knowledge layer), `subsidy_rates/modifiers/regions`. Giriş zənciri `field → farm → organization → membership`; `org_id` çox cədvəldə denormalizasiya. RLS helper `current_user_id()`. Backend ai/ modulları: `knowledge.py, research.py, jobs.py, clarify.py, weather.py, soil.py, tiers.py, sources/{base,soilgrids,eppo,faostat,openmeteo}.py`.

## Deployment (LIVE — https://agradex.com ✅)
- Hetzner server **bagban-ai** (CPX22, Helsinki), public IPv4 **95.216.208.82** (Primary IP recreate boyu qorunur), project AGRADEX-TEST. Operator Mac SSH açarı (`~/.ssh/id_ed25519`, comment `macbookpro`) `root@95.216.208.82`-də authorized (deploy/cloud-init.sh-də erkən əlavə edilib).
- DNS: agradex.com A @ + A www → 95.216.208.82 (Cloudflare, **proxied**).
- **SSL:** origin-də Let's Encrypt (`/etc/letsencrypt/live/agradex.com/`, certbot auto-renew). nginx `/etc/nginx/sites-enabled/agradex.com`: iki server bloku — **:80** (məcburi redirect yox, CF Flexible altında loop-safe) + **:443** (LE cert). Hər blokda location-lar: `/titiler/` → `127.0.0.1:8001/`, `/api/` → `127.0.0.1:8000`, `/` → `127.0.0.1:3000`. Cloudflare SSL mode **Full (Strict)** ✅ (2026-07-16 CF panelində doğrulanıb — origin :443 LE cert ilə şifrələnir; nginx :80 bloku hələ məcburi redirect etmir — Flexible dövründən qalma, Full (Strict) altında zərərsiz). Repo nüsxələri `deploy/nginx-agradex.conf`, `deploy/nginx-agradex-http.conf`. (Leftover dublikat blokdan "conflicting server_name" xəbərdarlığı — təmizlik gözləyir.)

### Konteynerlər (`deploy/docker-compose.prod.yml`)
- `db` (PostGIS, healthcheck), `api` (FastAPI, 127.0.0.1:8000), `web` (Next.js, 127.0.0.1:3000), **`titiler`** (127.0.0.1:8001→80, `./data/rasters` ro mount), **`geoapi`** (always-on C3 tap-to-detect mikroservis, geo image + uvicorn `geo_pipeline.segment_api:app`, **publish OLUNMUR** — api ona `http://geoapi:8010` ilə compose network üzərindən çatır, `mem_limit: 700m`, canlı geo_pipeline mount), `geo` (profile `geo`, tələbə görə, `./data/rasters` rw + canlı geo_pipeline kodu mount), `tools` (profile `tools`, miqrasiyalar), `n8n` (profile `orchestration`). Bütün app portları `127.0.0.1`-ə bağlı, host nginx qabaqda. **geoapi/geo `update.sh`-də rebuild OLUNMUR** — dep dəyişəndə `docker compose build geoapi` + `up -d geoapi` ayrıca; kod dəyişəndə (mount) yalnız `docker restart deploy-geoapi-1`.

### Redeploy (git əsaslı, SSH remote)
- `/opt/bagbanai` `origin/main`-i izləyən git checkout-dur (public repo; `git config safe.directory` set). Push et, sonra serverdə:
  `cd /opt/bagbanai && bash deploy/update.sh` (git pull --ff-only → **source .env** → `docker compose -f deploy/docker-compose.prod.yml up -d --build api web titiler` → `nginx -t && reload`).
- **update.sh MUTLƏQ `.env` source etməlidir**, yoxsa api/web boş `DATABASE_URL` alıb crash-loop-a düşür.

### Cron-lar (root crontab, PATH set)
- `0 3 * * * ... bash deploy/run-hls.sh 30 >> /var/log/bagban-hls.log` — **günlük HLS sakit refresh** (`track=0`).
- `30 3 * * * ... bash deploy/run-s2.sh 30 >> /var/log/bagban-s2.log` — **günlük Sentinel-2 refresh** (track=0, NDRE/CIre daxil).
- `45 3 * * * ... bash deploy/run-weather.sh >> /var/log/bagban-weather.log` — **günlük hava** (Open-Meteo → weather_cache + water_requirements + spray_window blokları; internal `/weather/drain`).
- `*/2 * * * * ... flock -n /tmp/bagban-queue.lock bash deploy/process-queue.sh >> /var/log/bagban-queue.log` — **hər 2 dəq** yeni sahə queue worker (`data_status='queued'` → geo pipeline `days_back=60 track=1 SENSOR=all`).
- `*/3 * * * * ... flock -n /tmp/bagban-research.lock bash deploy/process-research.sh >> /var/log/bagban-research.log` — **hər 3 dəq** knowledge research worker (`research_jobs` növbəsi → internal `/research/drain`, LLM açarı api-də olduğu üçün oradan işləyir).
- ⏳ **YENİ — crontab-a hələ ƏLAVƏ EDİLMƏLİ** (skriptlər hazır + endpoint-lər canlı doğrulandı; hər ikisi idempotent, on-demand işləyir):
  - `17 4 1 * * ... flock -n /tmp/bagban-seasonal.lock bash deploy/enqueue-research-seasonal.sh` — **aylıq** T17 mövsümi research auto-enqueue (norms-suz/köhnə məhsulları `research_jobs`-a atır → sonra process-research.sh işlədir; seed norms-a toxunmur).
  - `40 4 2 * * ... flock -n /tmp/bagban-season.lock bash deploy/compute-season-features.sh` — **aylıq** T16 `field_season_features` hesablanması (cari il; internal `/season/compute`).

### Secrets (`/opt/bagbanai/.env`, backup `/root/agradex.env.bak`)
`POSTGRES_USER/PASSWORD/DB`, `JWT_SECRET`, `INTERNAL_API_TOKEN`, **`EARTHDATA_TOKEN`** (EDL bearer, **EXPIRES 2026-08-30** → regenerate), **`LLM_PROVIDER=anthropic/LLM_MODEL=claude-opus-4-8/LLM_API_KEY`** (TƏYİN — AI AKTİV; ⚠️ **rotate et**; tier-lər özü sonnet/opus seçir `tiers.py`-də, LLM_MODEL default fallback-dır), **`EPPO_TOKEN`** (BOŞ — `data.eppo.int` hesabı; pest bloku onsuz `eppo_no_token` deqradasiya edir), `SEARCH_PROVIDER=anthropic` (web_search), `NOMINATIM_BASE` (default OSM), **`RESEND_API_KEY`+`EMAIL_FROM`** (BOŞ — U3 email/OTP KODU HAZIR; açar düşəndə signup OTP aktivləşir, yoxdursa auto-verify), **`TELEGRAM_BOT_TOKEN`+`TELEGRAM_BOT_USERNAME`+`TELEGRAM_WEBHOOK_SECRET`** (BOŞ — U4 Telegram alert botu KODU HAZIR; token düşəndə `POST /api/internal/telegram/setup` webhook qurur, `messaging/telegram.py`), `SMTP_*` (boş — notify.py köhnə fallback). Yeni sirlər əlavə edəndə `update.sh` mütləq `.env` source edir.

### Doğrulanmış canlı
/api/health ok; /api/ready db:true; home "Bağban AI"; /api/subsidy/rates = 117; hazelnut 3ha = 9000 AZN; HLS demo sahələr işləyir (ən son səhnə 2026-07-11). **AI AKTİV** (anthropic claude-opus-4-8; məsləhət+chat yüksək keyfiyyətlə işləyir — admin panel: 2 user / 2 org / 5 sahə, 15 AI çağırışı, ~$0.70 ümumi xərc; 2026-07-16 canlı doğrulandı). TiTiler raster overlay + basemap qalereyası canlı.

## Phase 2+ (təxirə salınıb — spec §28 + `docs/ROADMAP.md`)
- Hava (Open-Meteo) + modellər (GDD/spray/frost/drought), qayda mühərriki → çox-kanallı bildirişlər, hesabatlar (PDF/DOCX), baza/anomaliya/fenologiya, billing (Stripe/PSP; cədvəllər + gating hazır, inteqrasiya yox).
- `docs/Infrastruktur_Layer_Tekmillesdirme.md` §6 qalan işlər: bulud-örtük filtri UI, iki-tarix compare/swipe, ölkə/rayon NDVI benchmark, PDF/DOCX hesabatlar, rəsmi kadastr layı, geokodlama axtarışı, hillshade/terrain.

## Açıq işlər / TODO → **tək izləyici: `docs/ROADMAP.md`**
Bütün gələcək tasklar (E0–E12 + platform mühəndislik + istifadəçidə bloklanan) statusla **`docs/ROADMAP.md`**-dədir (status kodu ⬜🔨🚀✅⏳❌). Task bitəndə statusu orada yenilə — burada təkrarlama. Gap-scan (kod-yoxlamalı) `wf_c498734d`, 2026-07-21.

**2026-07-22 CANLI vəziyyət (detal: `docs/ROADMAP.md` + `docs/DESIGN_IMPLEMENTATION_PLAN.md` + memory [[v21-feature-expansion-plan]] / [[design-redesign]]):**
- **T0-T13 12 task ✅** (partial-reveal, rule engine, veg rules, GDD, foto vision, baseline, FAO-56, pest-risk, benchmark k-anon, gübrə, PWA, rayon dropdown).
- **T16 ✅ T17 ✅ T19 🚀 T24 ✅** (2026-07-23): T16 mövsüm feature-store (NDVI peak/mean/integral + GDD + yağış → `field_season_features`; korrelyasiya modeli ≥3 mövsümə təxirə) · T17 research→`crop_thresholds.index_norms` guarded write-back (seed qorunur) + mövsümi auto-enqueue endpoint · T19 shapefile (.zip) import (shpjs, lazy) + ScaleControl (export & rəngli annotasiya təxirə) · T24 lab-analiz OCR (vision → `soil_profiles` + passport precedence lab>soilgrids). Hamısı canlı doğrulandı. **D2 qalıqları ✅** (desktop sidebar + `?panel=` URL + Android geri-jesti).
- **U3 email/OTP (Resend) + U4/T22 Telegram bot — KODU HAZIR, deploy olunub**, açar/token düşəndə aktivləşir (səliqəli dormant).
- **Redizayn D0 ✅ D1 ✅ D2 ✅:** D0 (səssiz tenancy+FieldOnboarding svopu, mobil zəng, tab URL, azError lüğəti, 48px, moves) · D1 (token qatı emerald-600→#15803D, Inter font, StatusChip, Skeleton, focus ring) · D2 3 dilim: (1) sahə tabları 9→3 qrup + soft-delete/undo, (2) **bottom nav** + /fields /more /notifications, (3) **`?ui=v2` arxasında** "Bu gün" kart-home (`TodayHome`) + **map-first sahə görünüşü** (`FieldMapSheet` — tam-ekran xəritə + sürüşən 3-snap sheet) + kamera FAB (`lib/uiFlag.ts` yapışqan bayraq; `?ui=v1` geri çıxarır). Canlı test edilib (map bug h-full→h-screen düzəldilib). D2.4 (S2/NASA birləşmə) QƏSDƏN edilmədi — user ayrı tablar istəyir.
- **D3/D4/D5 əsas hissə ✅ CANLI (2026-07-23):** D3.1 public landing xəritəsi + anonim toxun-tap (`/api/geo/segment-public`) + draft→onboarding prefill · D3.2 landing canlı hava · D4.4 qiymət redizayn (3 kart, free-core) · D4.1 chart p10-p90 zolağı · D5.2 TTS səsləndir (Web Speech, asılılıqsız) · D5.3 offline chip · D5.4 İŞLƏR click-first chips. Hamısı canlı test edildi (landing vizualı signed-out — istifadəçi yoxlamalı, logout etmədim). Detal: `docs/DESIGN_IMPLEMENTATION_PLAN.md §K`.
- **Növbəti:** qalan funksional **T18** (RU/TR — böyük i18n sweep) · **T14** (subsidiya tarixçə UI); dizayn **D3.5/D3.6** (hazırlanır-ekran/checklist minor). **Bloklanan (asılılıq — SKIP):** D5.1/T23 Telegram iki-tərəf + T22/T26 (Telegram token) · D5.2-STT/T15 (STT provayder) · D3.3 telefon-OTP (SMS) · D5.5 çöl testi (real fermer) · T20/T21 (Faza-3/4 XL) · T25 (U12 hüquqi). **⏳ 2 yeni cron crontab-a əlavə olunmalı** (enqueue-research-seasonal + compute-season-features — yuxarı Cron-lar bölməsi).
- **Sərt deadline-lar:** ⚠️ **EARTHDATA_TOKEN 2026-08-30 bitir** (yenilə, yoxsa HLS 401) · ⚠️ **EPPO API 2026-09-01 bağlanır** · **LLM açar rotate** (bir dəfə açıq görünüb).

**İstifadəçi addımı gözləyən (ROADMAP §B):** Email/OTP (Resend açarı+DNS) · panel.agradex.com (CF A-record) · E3 Telegram bot token · EPPO_TOKEN · billing PSP · 2FA/firewall · Xudat crop_type=fındıq (M5/E0 kalibrasiya görünsün).

**Data qeydi:** köhnə silmə bug-u (indi düzəlib) səbəbindən istifadəçi bəzi sahələrini silmişdi (02:30 backup-da qaldı, bərpa etmədi).

## İnfrastruktur xəritəsi (2 Hetzner serveri — bax `[[agradex-infrastructure]]` memory)
- **Server 1** `bagban-ai` **95.216.208.82** (Helsinki): agradex.com (Bağban AI, CF-proxied) + signal-cv.agradex.com (DNS-only, Telegram bot).
- **Server 2** `ubuntu-4gb-fsn1-2` **91.99.157.161** (Falkenstein): findix.az + n8n (agent) + mcp + snaptoplate (stp-api) + mrz-api. DB backup buraya gəlir.
- Bu Mac-ın SSH açarı hər iki serverdə authorized (köhnə MacBook Pro i5 vasitəsilə əlavə edildi). GitHub SSH işləyir.

## İstinad sahələr (canlı test üçün)
- **"test lecet"** id `860891bd-912c-4ec3-9235-b7d4d0193190` (tam emal olunub: ~962 index_stats sətri + clipped COG-lar).
- Demo **"Findiq sahesi 1"** `4a08ee8a-4123-4fe5-a07f-ed24c69c5604`, **"Xudat fındıq sahəsi"** `8e046b22-cbbf-4e54-b201-7e973d9106b9`.
- Login: demo@agradex.com / AgradexDemo2026 (sahib hesabı seyidlimirshahbaz@gmail.com — parol bcrypt hash DB-də sıfırlanıb, fayllarda parol saxlanmır).

## Versiyalar
`CHANGELOG.md` [1.0.0]..[1.0.6]; git tag-lar v1.0.0..v1.0.4 (tag vs changelog nömrələnməsi tarixən ayrılıb — tag nömrələrinə çox güvənmə). Ən son commit 69d0d91.
