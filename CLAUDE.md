# Bağban AI — Claude Code iş konteksti (CLAUDE.md)

> Bu fayl gələcək sessiyalar üçün konteksti saxlayır. Hər fazadan/qərardan sonra yenilə.

## Nədir
Peyk (NASA HLS) + hava (Open-Meteo) + AI əsaslı əkin monitorinqi və təsərrüfat idarəetmə platforması. Hədəf: Azərbaycan/Qafqaz fermerləri, kooperativləri, aqronomları.

## Tək həqiqət mənbəyi (SSoT)
- `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` — əsas platforma spesifikasiyası (§1–§29).
- `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` — §30 subsidiya kalkulyatoru + 2026 seed.
Spesifikasiyadan kənara çıxma. Tələb dəyişsə, əvvəl soruş, razılaşdıqdan sonra bu faylı və sənədi yenilə.

## Dil qaydası
- Bütün UI mətnləri **Azərbaycan dilində** (i18n; default `az`, sonra `ru`, `tr`).
- Bütün kod, identifikator, SQL, sxem, commit mesajları **İngilis dilində**.

## Texnoloji stack (sabit)
- **Frontend:** Next.js (App Router, TypeScript) + BFF route handlers, MapLibre GL + Draw, turf.js, Recharts, i18n, PWA.
- **Backend:** Python 3.11+ (FastAPI), Hetzner VPS. Geo: earthaccess, pystac-client, rioxarray, rasterio, xarray, numpy, shapely, geopandas. Tile: TiTiler/rio-tiler.
- **DB:** Postgres 16 + PostGIS (self-hosted, Docker).
- **AI:** provayder-agnostik adapter (LiteLLM üslubu) + pydantic strukturlaşdırılmış çıxış. Provayder env-dən (`LLM_PROVIDER`/`LLM_MODEL`/`LLM_API_KEY`).
- **Orkestr:** n8n (cron + Telegram/WhatsApp/email).
- **Pulsuz data:** NASA HLS (Earthdata `~/.netrc`), Open-Meteo.

## Yerləşdirmə hədəfi
- Domain: **agradex.com** (apex/root — subdomain yox).
- Host: istifadəçinin **Hetzner** serveri, nginx + Let's Encrypt (findix.az deploy nümunəsinə bənzər).

## Spesifikasiyadan KƏNARLAŞMALAR (istifadəçi qərarları — SSoT bunlarla oxunur)
Spesifikasiya Supabase-i fərz edir; istifadəçi **hər şeyin öz Hetzner hostinqində** olmasını istəyir:
1. **Supabase yoxdur.**
   - DB: self-hosted **Postgres 16 + PostGIS** (Supabase Postgres əvəzinə).
   - Auth: **öz JWT auth-umuz** (`public.users` cədvəli + bcrypt + `jose`/httpOnly cookie). Sxemdəki hər `references auth.users(id)` → `references public.users(id)`.
   - RLS: **defense-in-depth** kimi saxlanır; `auth.uid()` əvəzinə session GUC `current_setting('app.user_id')::uuid` istifadə olunur (backend hər sorğuda `SET LOCAL app.user_id`). **Əsas icra server-tərəfli** FastAPI gating-dədir (§8/§22).
   - Storage (skautinq foto, COG, hesabat): indi **lokal Hetzner volume** (`OBJECT_STORAGE_*`); sonra S3-uyğun.
2. **Ödəniş hələ yoxdur.** `org_subscriptions` cədvəli + `org_is_paid()` gating **saxlanır** (PAID funksiyalar düzgün qapansın), amma Stripe/PSP inteqrasiyası **təxirə salınıb**. Yeni təşkilat default `free`; dev üçün əl ilə `pro`-ya keçirmə yolu var.
3. **Domain agradex.com root.**

## İş prinsipləri (MÜTLƏQ)
- Fazalı gedişat (§28): Faza 1 → Faza 4. Növbəti fazaya keçməzdən əvvəl DoD yoxla/göstər.
- Hər tamamlanmış atomik dəyişikliydən sonra təsviri commit (`feat(scope): ...`) + push.
- Multi-tenancy: hər cədvəldə `org_id`; giriş zənciri `field → farm → organization → membership`.
- Təhlükəsizlik: gating həm RLS, həm server-tərəfli. Heç bir sirr commit olunmur (`.env`). Miqrasiyalar `db/migrations/`-də.
- Keyfiyyət: tipli/təmiz kod, xəta idarəetməsi, idempotent pipeline/bildiriş, pəncərəli COG oxuma + keş.

## Layihə strukturu
```
bagbanai/
├─ app/              # Next.js (frontend + BFF route handlers)
├─ services/         # FastAPI: geo_pipeline, weather, rule_engine, advice_engine, reports, tiles
├─ db/migrations/    # ordered SQL DDL (§7, §8, §30)
├─ db/seeds/         # crop_thresholds, subsidy seed loader
├─ n8n/workflows/    # cron + dispatch
├─ knowledge_base/   # RAG source + crop calendars (AZ)
├─ i18n/             # az (default), ru, tr
├─ deploy/           # nginx, systemd, deploy scripts
└─ docs/             # the two spec documents (SSoT)
```

## Faza 1 vəziyyəti (yenilə)
- [x] Step 0 — skeleton + conventions
- [x] Step 1 — DB migrations (§7/§8/§30)
- [x] Step 2 — seeds (crop_thresholds, subsidy — 117 rates, coef×200 verified)
- [x] Step 3 — FastAPI skeleton + auth + gating
- [x] Step 4 — org/farm hierarchy + invites (backend); onboarding UI (frontend)
- [x] Step 5 — field creation backend (PostGIS validation); MapLibre+Draw UI (frontend)
- [x] Step 6 — field metadata backend; metadata form UI (frontend)
- [x] Step 7 — HLS pipeline + FREE index endpoints (runtime needs Earthdata .netrc on server)
- [x] Step 8 — scouting / tasks / operations / yields backend + uploads
- [x] Step 9 — subsidy engine + API (14 tests pass); calculator UI (frontend)
- [x] Step 10 — deploy config (Hetzner compose + nginx agradex.com)

Backend/DB/pipeline/deploy: DONE & committed. Frontend (`app/`): built by a background agent
(auth, onboarding, field map, metadata, scouting/tasks/ops/yields, subsidy calculator).

## Phase 2+ (deferred, per roadmap §28 + user notes)
- Weather (Open-Meteo) + weather models (GDD/spray/frost/drought) — `/api/internal/weather/run` stub exists.
- Rule engine → notifications (PAID, multi-channel Telegram/WhatsApp) — `/api/internal/rules/run` stub.
- AI advice + AI chat (provider-agnostic). Reports (PDF/Excel). TiTiler tiles + baseline/anomaly/phenology.
- Billing (Stripe/PSP) — tables + gating present, integration skipped (no payment yet).

## Deployment (LIVE — https://agradex.com ✅)
- Hetzner server **bagban-ai** (CPX22, Helsinki), public IPv4 **95.216.208.82** (Primary IP kept across recreate), project AGRADEX-TEST.
- DNS: agradex.com A @ + A www → 95.216.208.82 (Cloudflare, **proxied**).
- **SSL:** **Let's Encrypt** cert installed on origin (`/etc/letsencrypt/live/agradex.com/`, auto-renew via certbot). Live nginx vhost serves **:80 (no forced redirect — loop-safe under CF Flexible) + :443 (LE cert)**; works under any CF SSL mode. Cloudflare SSL mode currently **Flexible**; TODO flip to **Full (Strict)** for end-to-end encryption (origin :443 ready) — CF dashboard was unresponsive during setup, pending retry (Overview → Configure → Full (Strict)).
- **HLS geo worker — LIVE with real data ✅:** `services/Dockerfile.geo` (needs libexpat1/libgomp1). Earthdata auth via **EARTHDATA_TOKEN** (EDL bearer token in .env) → set on GDAL as `Authorization: Bearer` header for /vsicurl COG reads (username/password was rejected 401; token works). Token expires 2026-08-30 → regenerate at urs.earthdata.nasa.gov. Verified: demo Zaqatala hazelnut field (id 4a08ee8a…) → 17 scenes, 153 index_stats; NDVI ~0.73 (May). Run: `bash deploy/run-hls.sh 120` (cron for daily). Demo login: demo@agradex.com / AgradexDemo2026.
- **Versioning:** git tag `v1.0.0` pushed; CHANGELOG.md.
- **Repo visibility:** still PRIVATE → make public (user) so cloud-init `git clone` self-deploy works; until then redeploy = rsync + bootstrap over SSH.
- Containers (deploy/docker-compose.prod.yml): db (PostGIS, healthy) + api (FastAPI :8000) + web (Next.js :3000), fronted by host nginx.
- **SSH:** operator Mac key (`macbookpro`, ~/.ssh/id_ed25519) authorized on root — added early in deploy/cloud-init.sh.

### Deploy method (git-based)
- Repo `shahbazseyidli/bagbanai` is now **PUBLIC**. `/opt/bagbanai` on the server is a **git checkout** tracking `origin/main` (`git config safe.directory /opt/bagbanai` set for root).
- **Redeploy:** push to GitHub, then on server `cd /opt/bagbanai && bash deploy/update.sh` (git pull → **source .env** → `docker compose up -d --build api web` → nginx reload). update.sh MUST source .env or the api gets a blank DATABASE_URL and crash-loops (same trap as run-hls.sh; both source .env). Backup of secrets: `/root/agradex.env.bak`.
- History: first deploys used rsync + bootstrap.sh (repo was private then).
- **Daily HLS cron** (root crontab, PATH set): `0 3 * * * cd /opt/bagbanai && bash deploy/run-hls.sh 30 >> /var/log/bagban-hls.log 2>&1` — auto-pulls new HLS scenes; validated under cron env.
- Verified live: /api/health ok; home "Bağban AI"; /api/subsidy/rates = 117; hazelnut 3ha = 9000 AZN; HLS demo field 17 scenes/153 indices.
- Follow-ups: Cloudflare Full(Strict) (dashboard was unresponsive); Earthdata token expires 2026-08-30.
