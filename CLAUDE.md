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
- **HLS geo worker:** `services/Dockerfile.geo` image built on server; self-check "geo worker ready" passes (rasterio/rioxarray/earthaccess import OK). Needs libexpat1/libgomp1 (in Dockerfile). Earthdata: EARTHDATA_USERNAME set in server .env; PASSWORD to be added by user. Run: `bash deploy/run-hls.sh` (needs a field with a polygon).
- **Versioning:** git tag `v1.0.0` pushed; CHANGELOG.md.
- **Repo visibility:** still PRIVATE → make public (user) so cloud-init `git clone` self-deploy works; until then redeploy = rsync + bootstrap over SSH.
- Containers (deploy/docker-compose.prod.yml): db (PostGIS, healthy) + api (FastAPI :8000) + web (Next.js :3000), fronted by host nginx.
- **SSH:** operator Mac key (`macbookpro`, ~/.ssh/id_ed25519) authorized on root — added early in deploy/cloud-init.sh.

### Deploy method + private-repo caveat (IMPORTANT)
- GitHub repo `shahbazseyidli/bagbanai` is **PRIVATE** → server cannot `git clone` anonymously, so cloud-init's clone step fails. First two cloud-init deploys stalled for this reason.
- **Current live deploy was done by pushing code from the Mac via rsync** then running bootstrap.sh over SSH:
  `rsync -az --exclude .git --exclude node_modules --exclude .next --exclude pgdata --exclude storage --exclude .env ./ root@95.216.208.82:/opt/bagbanai/`
  then `ssh root@95.216.208.82 'cd /opt/bagbanai && bash deploy/bootstrap.sh && <nginx vhost swap>'`.
- **To make cloud-init self-deploy work on future rebuilds:** either make the repo public, OR add a GitHub deploy token/SSH deploy key to the clone step. Until then, redeploy = rsync + bootstrap over SSH (repeatable).
- Verified live: /api/health ok; home title "Bağban AI"; /api/subsidy/rates = 117; calculate hazelnut 3ha = 9000 AZN.
- Follow-ups: Earthdata ~/.netrc for HLS pipeline; SSL hardening to Full(Strict)+Origin cert.
