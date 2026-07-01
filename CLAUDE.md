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
- [ ] Step 1 — DB migrations (§7/§8/§30)
- [ ] Step 2 — seeds (crop_thresholds, subsidy)
- [ ] Step 3 — FastAPI skeleton + auth + gating
- [ ] Step 4 — auth + onboarding + hierarchy (FR-9/10)
- [ ] Step 5 — field creation (FR-1)
- [ ] Step 6 — field metadata (FR-5)
- [ ] Step 7 — HLS pipeline + FREE indices + time series (FR-2)
- [ ] Step 8 — scouting / tasks / operations / yields (§14–16)
- [ ] Step 9 — subsidy calculator (§30, FR-21)
- [ ] Step 10 — Phase 1 DoD + deploy (agradex.com)
