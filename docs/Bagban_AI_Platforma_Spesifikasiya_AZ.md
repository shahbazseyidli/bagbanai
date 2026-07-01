# Bağban AI — Müstəqil Platforma Texniki Spesifikasiyası
### Peyk + Hava + AI əsaslı Əkin Monitorinqi və Təsərrüfat İdarəetmə Platforması

> **Versiya:** 2.0 (müstəqil platforma) · **Status:** Build-ready · **Hədəf icraçı:** Claude Code
> **Dəyişiklik:** v1.0 modul kimi idi; v2.0 **müstəqil platformadır** — öz auth, billing, onboarding, təşkilat→təsərrüfat→sahə iyerarxiyası, rollar/icazələr və orta-genişlənmə təsərrüfat idarəetməsi (skautinq, tapşırıqlar, məhsuldarlıq, hesabatlar, komanda) ilə.
> **Qeyd:** İzahlı mətn Azərbaycan dilindədir; bütün kod, SQL, sxem və identifikatorlar İngilis dilindədir. **UI tam Azərbaycan dilində** render olunmalıdır.

---

## 0. Sənədin məqsədi və Claude Code ilə iş qaydası

Bu sənəd platformanın bütün funksional/qeyri-funksional tələblərini, verilənlər modelini, API müqaviləsini, sxemləri, bazar araşdırmasını və prioritetləşdirilmiş funksionallıq siyahısını təsbit edir. Tək həqiqət mənbəyidir (single source of truth).

İş qaydası (hər faza/dəyişiklik üçün):
1. Müvafiq bölmə + FR-ləri (§9) və qəbul meyarlarını oxu.
2. Verilənlər modelinə (§7) və API müqaviləsinə (§22) tam uyğun kod yaz.
3. Hər tamamlanmış dəyişikliyi **təsviri commit ilə Git-ə yeni versiya kimi push et**.
4. Tələb dəyişərsə bu sənədi yenilə.

Fazalar üzrə gedir (§28): Faza 1 (təməl/müstəqil məhsul) → Faza 4 (ekosistem).

---

## 1. Məhsul icmalı və dəyər təklifi

Bağban AI — Azərbaycan (və regionda Qafqaz/Mərkəzi Asiya) fermerləri, kooperativləri və aqronomları üçün **müstəqil** peyk-əsaslı əkin monitorinqi + praktik təsərrüfat idarəetmə platformasıdır.

**Nüvə:** NASA HLS (30 m, 9 vegetasiya indeksi) + Open-Meteo (pulsuz hava) + modeldən asılı olmayan AI məsləhət + risk bildirişləri.
**Orta genişlənmə:** təşkilat/təsərrüfat/sahə iyerarxiyası, çoxlu-istifadəçi/komanda, skautinq (foto ilə), tapşırıq/əməliyyat jurnalı, məhsuldarlıq qeydləri, hesabatlar/eksport.

**Monetizasiya bölgüsü:** görüntü + xam indeks dəyərləri + əsas hava **PULSUZ**; AI məsləhət, risk bildirişləri, qabaqcıl analitika, komanda yerləri, hesabatlar, API **ÖDƏNİŞLİ** (freemium, hektar-bantlı tarif, AZN ilə).

**Fərqləndirici:** Azərbaycan dilli UI, bağ/üzümlük/fındıq təsərrüfatlarına fokus (row-crop rəqiblərinin zəif olduğu yer), kooperativ/qrup funksiyaları, Telegram/WhatsApp bildiriş kanalları, ucuz freemium.

---

## 2. Bazar araşdırması və rəqib analizi

> Bu bölmə funksional qərarların əsasını verir. Rəqiblər həm table-stakes funksiyaları, həm də monetizasiya modelini müəyyən edir.

### 2.1 Əsas tapıntılar

- **İki fərqli "JustFarm" var, heç biri birbaşa peyk rəqibi deyil:** `justfarm.app` — Böyük Britaniyada subsidiya/uyğunluq (SFI) ərizələri və agent idarəetməsi platformasıdır; `justfarm.ai` — Qana/Kot-d'İvuar fermer tətbiqidir (AI məsləhətçi "Darli"). Hər ikisi ayrı-ayrı şablonları (GPS+foto sübut, AI məsləhətçi, əməkdaşlıq) təsdiqləyir, lakin əsl rəqib dəsti EOSDA, OneSoil, xarvio, Cropwise/Cropio, MapMyCrop, Farmonaut-dur.
- **Table-stakes artıq dəqiqdir:** çoxlu-sahə/təsərrüfat idarəetməsi + avtomatik sərhəd; NDVI + kiçik indeks dəsti (NDMI/NDRE); sahə üzrə hava+proqnoz; **foto-ilə skautinq**; **əməliyyat/tapşırıq jurnalı**; **rollarla komanda girişi**; **hesabatlar/eksport**; **oflayn mobil**.
- **Premium:** VRA/prescription xəritələri, idarəetmə/məhsuldarlıq zonaları, məhsuldarlıq proqnozu, xəstəlik/zərərverici modelləri, torpaq-nəmliyi, API, white-label.
- **Qiymət iki cürdür:** consumer/smallholder = **freemium** (OneSoil, xarvio pulsuz tier, MapMyCrop pulsuz nüvə, Climate FieldView Basic $0); professional = **hektar-üzrə** (EOSDA; Farmonaut $0.38–$1.00/ha) və ya **illik sabit** (Climate FieldView Plus $649/il). EOSDA/OneSoil dəqiq dollar rəqəmləri login/app arxasındadır; Farmonaut ən şəffaf tarifə malikdir və Bağban AI-nın mövqeyinə ən yaxın analoqdur.

### 2.2 Rəqib müqayisə cədvəli

| Platforma | Data / indekslər | Sahə/təsərrüfat | Skautinq | Tapşırıq/jurnal | Komanda/rollar | VRA/zonalar | Məhsuldarlıq | Xəstəlik/zərər | Torpaq | Hesabat/eksport | Mobil/oflayn | API | Qiymət |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **EOSDA** | Sentinel/Landsat/EOS SAT-1; ~10–12 VI | ✅ | ✅ web+mobil | ✅ | ✅ rollar | ✅ | ✅ add-on | ✅ | ✅ nəmlik add-on | ✅ avto | ✅/✅ | ✅ | Hektar-tier (pulsuz ≤300 ha) |
| **OneSoil** | Sentinel; NDVI+8 VI | ✅ avto-sərhəd | ✅ foto/marşrut | ⚠️ zəif | ⚠️ paylaşım | ✅ Pro | ✅ qeyd | ❌ | ⚠️ sampling (Pro) | ⚠️ | ✅/✅ | ❌ | Freemium (2026 tier) |
| **xarvio** | Peyk + aqro-modellər | ✅ +AgBusiness | ✅ SCOUTING | ✅ | ✅ AgBusiness | ✅ | ⚠️ | ✅ Spray Timer | ✅ upload | ✅ | ✅/✅ | ⚠️ | Pulsuz tier + ödənişli |
| **Cropwise/Cropio** | Peyk; NDVI | ✅ enterprise | ✅ | ✅ | ✅ | ✅ | ✅ proqnoz | ⚠️ | ✅ nəmlik | ✅ | ✅/✅ | ✅ | Enterprise quote |
| **MapMyCrop** | NASA/ESA/ISRO; 30+ VI | ✅ | ✅ | ⚠️ | ⚠️ | ✅ 3–7 zona | ✅ proqnoz | ✅ foto ID | ✅ nəmlik | ✅ | ✅/✅ | ✅ +SDK | B2B freemium/quote |
| **Climate FieldView** | Peyk + maşın datası | ✅ | ✅ | ✅ | ✅ paylaşım | ✅ script | ✅ analiz | ⚠️ | ⚠️ | ✅ | ✅/⚠️ | ✅ | Basic $0 / Plus $649/il |
| **Cropin** | Peyk/IoT/dron; 22 AI model | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ predict | ✅ | ✅ | ✅/✅ | ✅ | Enterprise quote |
| **Farmonaut** | Multispektral; NDVI/NDWI/EVI/SAVI/NDRE | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ nəmlik | ✅ | ✅/⚠️ | ✅ | Hektar $0.38–$1.00 |
| **Plantix** | Foto AI (VI yox) | ❌ | ✅ diaqnoz | ❌ | ⚠️ icma | ❌ | ❌ | ✅ foto ID | ❌ | ❌ | ✅/⚠️ | ✅ (B2B) | Pulsuz (partnyor) |

### 2.3 Funksiya təbəqələri (5 tier)

- **Tier 1 — Nüvə monitorinq (TABLE-STAKES):** çoxlu-sahə + sərhəd; NDVI + bir neçə indeks; sahə üzrə cari+proqnoz hava; tarixi VI arxiv/zaman seriyası; anomaliya/düşmə xəbərdarlığı. *Bağban AI artıq örtür.*
- **Tier 2 — Təsərrüfat idarəetməsi (müstəqil məhsul üçün TABLE-STAKES):** təşkilat/təsərrüfat/sahə iyerarxiyası; foto-ilə skautinq; əməliyyat jurnalı (əkin/çiləmə/gübrələmə/suvarma/yığım); tapşırıq təyini; növbə tarixi; məhsuldarlıq qeydləri; hesabatlar/eksport. ***Bağban AI-nın əsas boşluğu.***
- **Tier 3 — Qabaqcıl analitika/AI:** fenologiya/mərhələ; GDD; xəstəlik/zərər risk modelləri; ET/suvarma; məhsuldarlıq proqnozu; zonalar; VRA; AI məsləhət/chat. *Hava-əsaslı modellər ucuz qazancdır; VRA/proqnoz premiumdur.*
- **Tier 4 — Əməkdaşlıq/enterprise (PREMIUM):** rollar/icazələr; təşkilat üzvlüyü/sahə paylaşımı; çox-müştəri/aqronom panelləri; white-label; benchmarking.
- **Tier 5 — İnteqrasiyalar/ekosistem (PREMIUM/GƏLƏCƏK):** API; maşın/telematika; IoT/dron; torpaq-lab; izlənəbilirlik/uyğunluq (EUDR/GAP); karbon; marketplace; dövlət inteqrasiyası (EKTIS).

### 2.4 Azərbaycan / regional kontekst

- **Bağlantı yaxşı, amma qeyri-bərabər:** ~89% internet, ~118% mobil bağlantı — kənddə də smartfon mümkündür, lakin **oflayn/aşağı-bant PWA** yenə vacibdir.
- **Təsərrüfat strukturu:** əsasən **smallholder** (orta torpaq sahəsi 3–5 ha) + kooperativlər → sadə UX, aşağı qiymət, qrup/kooperativ funksiyaları.
- **Əkinlər:** fındıq (Azərbaycan 2023-də dünyanın ən böyük fındıq ixracatçıları arasında 4-cü; ~99% fərdi/ailə istehsalçılardan), üzüm/üzümlük, buğda/arpa, pambıq, nar/xurma, tərəvəz/bostan — çoxu **çoxillik/bağ/üzümlük**, harada ki row-crop rəqiblər (Climate FieldView, xarvio) zəifdir → **mövqe imkanı**. Bağ/üzümlük əkin təqvimləri təmin et.
- **Dil:** Azərbaycan-əvvəl UI baza fərqləndiricidir; rus və mümkünsə türk regional genişlənmə üçün.
- **Dövlət:** EKTIS/eagro.az subsidiyaları idarə edir → Bağban AI **tamamlayıcı** olmalı (monitorinq/məsləhət/idarəetmə), dublikat yox; inteqrasiya = distribusiya.
- **Bildiriş kanalları:** Telegram/WhatsApp geniş yayılıb; SMS ehtiyat.

> **Xəbərdarlıq:** rəqib "dəqiqlik/fayda" iddiaları (məs. MapMyCrop 97% sərhəd, 90% məhsuldarlıq; EOSDA/Farmonaut 85–95%) təsdiqlənməmiş marketinq iddialarıdır. Subsidiya rəqəmləri mənbələr arasında dəyişir — qurmadan əvvəl AKİA/Nazirlikdən yoxla.

---

## 3. Funksionallıqların prioritetləşdirilmiş siyahısı

### MUST-HAVE (müstəqil platforma üçün zəruri)
1. **Təşkilat → təsərrüfat → sahə iyerarxiyası** + müstəqil auth, üzvlük, sahə paylaşımı.
2. **Rollar/icazələr** (owner/admin/agronomist/worker/viewer).
3. **Skautinq:** geo-yerləşdirilmiş müşahidələr + foto + problem etiketi + xəritə pinləri/marşrut.
4. **Əməliyyat jurnalı + tapşırıq idarəetməsi** (təyin et, təqvim, iş sifarişi, fəaliyyət növləri).
5. **Məhsuldarlıq qeydləri + il-üzrə müqayisə.**
6. **Hesabatlar/eksport** (PDF/Excel, çap xəritələri, mövsüm xülasəsi).
7. **Billing/abunəlik + onboarding.**
8. **Hava-əsaslı modellər** (GDD, çiləmə pəncərəsi, şaxta/isti/quraqlıq erkən xəbərdarlıq) — Open-Meteo üzərində ucuz.
9. **Çox-kanallı bildiriş** (inapp/push/email + Telegram/WhatsApp).
10. **Lokalizasiya** (Azərbaycan-əvvəl), vahidlər, regional əkin təqvimləri.

### NICE-TO-HAVE
11. **Sahə-datasına əsaslanan AI chat assistant** ("sahələrinlə söhbət"). 12. **İdarəetmə/məhsuldarlıq zonaları + VRA** (SHP/ISO-XML eksport). 13. **ET-əsaslı suvarma planlaması** (FAO-56). 14. **Xəstəlik/zərər risk modelləri** (hava-əsaslı). 15. **Foto-əsaslı xəstəlik diaqnozu** (öz-yerinə Plantix-tipli partnyor düşün). 16. **Resurs/xərc izləmə + sahə-üzrə iqtisadiyyat.** 17. **Torpaq datası** (xəritə, sampling, nəmlik proksisi). 18. **Fenologiya/mərhələ + baza/anomaliya** (HLS arxivindən). 19. **Kooperativ/qrup funksiyaları** (qrup paneli, paylaşılan aqronom). 20. **PWA/oflayn sahə rejimi.**

### FUTURE / VISION
21. API/developer girişi. 22. Benchmarking/regional müqayisə. 23. Marketplace/advisory-as-a-service. 24. Maşın/IoT/dron inteqrasiyası. 25. İzlənəbilirlik/uyğunluq (GAP/organik/EUDR — fındıq ixracı). 26. Karbon/dayanıqlıq. 27. **EKTIS/eagro.az inteqrasiyası.** 28. White-label (kooperativ/agrobiznes/bank). 29. Referral proqramı.

---

## 4. Sistem memarlığı (müstəqil, multi-tenant)

```
┌─────────────────────────── Next.js (Frontend, AZ UI) ─────────────────────────┐
│ Auth/Onboarding · Org/Farm/Field · Map(Draw) · Index viewer · Charts ·         │
│ Scouting · Tasks/Ops · Yields · Reports · Alerts · Team · Billing · AI chat     │
└───────────────┬────────────────────────────────────────────┬──────────────────┘
                │ REST/JSON (BFF, gating: role + FREE/PAID)    │ XYZ raster tiles
                ▼                                              ▼
┌──────────────────────────── Backend (Hetzner VPS, FastAPI) ───────────────────┐
│ Multi-tenant API (RLS + role checks + subscription gating)                     │
│ ├ Geo pipeline (Python): earthaccess/CMR-STAC → COG window → Fmask → HLS-VI    │
│ ├ Weather service: Open-Meteo fetch + derive (GDD/ET/flags) + cache            │
│ ├ Rule engine: veg + weather risk triggers → notifications                     │
│ ├ AI engine: inputs → RAG → LLM (provider-agnostic) → structured advice/chat   │
│ ├ Reports: PDF/Excel generation                                                │
│ └ Tile server: TiTiler                                                          │
└───────────────┬──────────────────────────────────┬───────────────────────────┘
                ▼                                    ▼
     Supabase (Postgres + PostGIS)          n8n (cron + dispatch)
     Auth · Storage (photos/COG/tiles)       ├ HLS scene check ├ weather refresh
                                             ├ rules run       └ notify (inc. Telegram/WhatsApp)
External (free): NASA HLS (Earthdata) · Open-Meteo · NASA POWER (baselines)
```

---

## 5. Texnoloji stack

| Qat | Texnologiya |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, i18n (AZ/RU/TR); PWA (oflayn) |
| Xəritə | MapLibre GL JS + Draw; turf.js |
| Qrafiklər | Recharts / Chart.js |
| DB | Supabase Postgres + **PostGIS** |
| Auth | Supabase Auth (öz auth-umuz) |
| Backend | Python 3.11+ (FastAPI), Hetzner VPS |
| Geo | earthaccess, pystac-client, rioxarray, rasterio, xarray, numpy, shapely, geopandas |
| Tile | TiTiler / rio-tiler |
| AI | Provider-agnostic adapter (LiteLLM üslubu) + pydantic + Instructor üslubu strukturlaşdırılmış çıxış |
| Hesabat | Python (WeasyPrint/ReportLab PDF; openpyxl XLSX) |
| Orkestr | n8n (cron + Telegram/WhatsApp/email nodes) |
| Billing | Stripe və ya yerli PSP + Supabase entitlements |
| Storage | Supabase Storage / Hetzner obyekt anbarı |

---

## 6. Layihə strukturu

```
bagban-ai/
├─ app/                          # Next.js (frontend + BFF)
│  ├─ (auth)/                    # login, signup, onboarding
│  ├─ org/ farm/ field/          # hierarchy CRUD
│  ├─ components/Map/ IndexViewer/ Charts/
│  ├─ components/Scouting/ Tasks/ Yields/ Reports/ Alerts/ Team/ Billing/ AIChat/
│  └─ api/                       # route handlers (gating)
├─ services/
│  ├─ geo_pipeline/  weather/  rule_engine/  advice_engine/  reports/  tiles/
├─ db/migrations/                # SQL DDL (§7, §8)
├─ n8n/workflows/
├─ knowledge_base/               # RAG source + crop_thresholds + crop_calendars (AZ)
├─ i18n/                         # az, ru, tr
├─ .env.example
└─ docs/                         # bu sənəd
```

---

## 7. Verilənlər modeli (PostGIS DDL)

> Tam, multi-tenant. Giriş zənciri: `field → farm → organization → membership`. `org_id` sürət üçün denormallaşdırılıb.

```sql
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ===== ORGANIZATIONS / MEMBERSHIP / ROLES =====
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  country text default 'AZ',
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner','admin','agronomist','worker','viewer');

create table public.organization_members (
  org_id       uuid references public.organizations(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  role         org_role not null default 'viewer',
  status       text not null default 'active',    -- invited|active|removed
  invited_email text,
  created_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.organization_members (user_id);

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'viewer',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz
);

-- ===== FARMS / FIELDS =====
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  region text,
  centroid geometry(Point,4326),
  created_at timestamptz not null default now()
);
create index farms_org_idx on public.farms (org_id);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  org_id  uuid not null references public.organizations(id) on delete cascade,  -- denormalized
  name text not null,
  geom geometry(Polygon,4326) not null,
  centroid geometry(Point,4326) generated always as (st_centroid(geom)) stored,
  area_ha numeric(12,4),
  bbox geometry(Polygon,4326),
  mgrs_tiles text[],
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fields_geom_gix on public.fields using gist (geom);
create index fields_org_idx  on public.fields (org_id);
create index fields_farm_idx on public.fields (farm_id);

-- ===== FIELD METADATA (1:1) =====
create table public.field_metadata (
  field_id uuid primary key references public.fields(id) on delete cascade,
  crop_type text not null, variety text,
  planting_date date, expected_harvest date,
  difficulties jsonb default '[]',
  soil_type text, soil_ph numeric(4,2),
  irrigation_method text, irrigation_available boolean default false,
  previous_crop text, rotation_history jsonb default '[]',
  fertilizer_history jsonb default '[]',
  seeding_density numeric, growth_stage text,
  elevation_m numeric, slope_deg numeric, aspect_deg numeric,
  tillage_practice text, target_yield numeric,
  prior_yields jsonb default '[]', pest_history jsonb default '[]',
  notes text, updated_at timestamptz not null default now()
);

-- ===== SATELLITE: SCENES / INDEX STATS / RASTERS =====
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  sensor text not null, acquired_at date not null, mgrs_tile text,
  cloud_pct numeric, valid_pixel_pct numeric, granule_id text,
  created_at timestamptz not null default now(),
  unique (field_id, sensor, acquired_at, mgrs_tile)
);
create index scenes_field_date_idx on public.scenes (field_id, acquired_at desc);

create table public.index_stats (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  index_name text not null,   -- NDVI|EVI|SAVI|MSAVI|NDMI|NDWI|NBR|NBR2|TVI
  mean numeric,min numeric,max numeric,std numeric,p10 numeric,p50 numeric,p90 numeric,
  valid_pixels int, acquired_at date not null,
  created_at timestamptz not null default now(),
  unique (scene_id, index_name)
);
create index index_stats_ts_idx on public.index_stats (field_id, index_name, acquired_at);

create table public.index_rasters (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references public.scenes(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  index_name text not null, storage_path text not null, acquired_at date not null
);

-- ===== WEATHER CACHE =====
create table public.weather_cache (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  fetched_at timestamptz not null default now(), forecast_date date not null,
  t_min numeric,t_max numeric,precip_mm numeric,precip_prob numeric,et0_mm numeric,
  soil_moisture jsonb, soil_temp jsonb, wind_max numeric, rh_mean numeric, raw jsonb,
  unique (field_id, forecast_date, fetched_at)
);
create index weather_field_idx on public.weather_cache (field_id, forecast_date);

-- ===== SCOUTING =====
create table public.scouting_observations (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  created_by uuid references auth.users(id),
  geom geometry(Point,4326),
  category text not null,     -- pest|disease|weed|nutrient|water|damage|other
  severity text,             -- low|medium|high
  note text, photos text[],  -- storage paths
  observed_at timestamptz not null default now(),
  status text default 'open' -- open|resolved
);
create index scouting_field_idx on public.scouting_observations (field_id, observed_at desc);
create index scouting_geom_gix on public.scouting_observations using gist (geom);

-- ===== TASKS =====
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  farm_id uuid references public.farms(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  title text not null,
  type text,                 -- planting|spraying|fertilizing|irrigation|harvest|scouting|other
  assigned_to uuid references auth.users(id),
  due_date date, status text default 'todo',  -- todo|in_progress|done|cancelled
  priority text, created_by uuid, notes text,
  created_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks (assigned_to, status);
create index tasks_org_idx on public.tasks (org_id, due_date);

-- ===== FIELD OPERATIONS (activity log) =====
create table public.field_operations (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  type text not null,        -- planting|spraying|fertilizing|irrigation|harvest|tillage|other
  performed_on date not null,
  inputs jsonb,              -- [{product,rate,unit}]
  cost numeric, currency text default 'AZN',
  performed_by uuid, notes text,
  created_at timestamptz not null default now()
);
create index fieldops_field_idx on public.field_operations (field_id, performed_on desc);

-- ===== YIELDS =====
create table public.yields (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  season_year int not null, crop_type text,
  yield_value numeric, yield_unit text,  -- t_ha|kg|t
  area_ha numeric, notes text,
  unique (field_id, season_year, crop_type)
);

-- ===== REPORTS =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  field_id uuid references public.fields(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  type text not null,        -- field_season|scouting|farm_summary
  format text,               -- pdf|xlsx
  params jsonb, storage_path text, generated_by uuid,
  generated_at timestamptz not null default now()
);

-- ===== ADVICE (AI) — PAID =====
create table public.advice (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  generated_at timestamptz not null default now(),
  model_provider text, model_name text, input_snapshot jsonb,
  summary text, findings jsonb, weather_outlook text, disclaimer text
);
create index advice_field_idx on public.advice (field_id, generated_at desc);

-- ===== AI CHAT (grounded) — PAID =====
create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null, field_id uuid references public.fields(id) on delete cascade,
  user_id uuid, role text not null,   -- user|assistant
  content text not null, context_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- ===== NOTIFICATIONS — PAID =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references public.fields(id) on delete cascade,
  org_id uuid not null, user_id uuid,
  created_at timestamptz not null default now(),
  source text not null,      -- vegetation|weather
  type text not null, severity text not null,   -- info|warning|critical
  title text not null, body text not null, payload jsonb,
  read_at timestamptz, delivered_channels text[]  -- inapp|push|email|telegram|whatsapp|sms
);
create index notif_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  inapp boolean default true, push boolean default true, email boolean default true,
  telegram_chat_id text, whatsapp_number text, sms_number text
);

-- ===== SUBSCRIPTIONS (org-level) =====
create table public.org_subscriptions (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  tier text not null default 'free',  -- free|pro|business
  seats int default 1, hectare_cap numeric,
  valid_until timestamptz not null default 'infinity',
  updated_at timestamptz not null default now()
);

-- ===== CROP THRESHOLDS (rule-engine KB) =====
create table public.crop_thresholds (
  id uuid primary key default gen_random_uuid(),
  crop_type text not null unique,
  gdd_base_c numeric, ndvi_healthy_min numeric, ndvi_stress_max numeric,
  ndmi_stress_max numeric, frost_threshold_c numeric, heat_threshold_c numeric,
  kc_stages jsonb
);

-- updated_at triggers
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger fields_touch before update on public.fields for each row execute function public.touch_updated_at();
create trigger field_metadata_touch before update on public.field_metadata for each row execute function public.touch_updated_at();
```

---

## 8. Multi-tenancy + RLS + rollar/icazələr + pulsuz/ödənişli gating

**İcazə matrisi:**

| Əməliyyat | owner | admin | agronomist | worker | viewer |
|---|---|---|---|---|---|
| Təşkilat/billing idarəetməsi | ✅ | ✅ | ❌ | ❌ | ❌ |
| Üzv dəvət/rol dəyişmə | ✅ | ✅ | ❌ | ❌ | ❌ |
| Təsərrüfat/sahə yaratma/redaktə | ✅ | ✅ | ✅ | ❌ | ❌ |
| Metadata redaktə | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Skautinq/əməliyyat əlavə | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tapşırıq tamamlama | ✅ | ✅ | ✅ | ✅ | ❌ |
| İndeks/hava/xəritə oxuma | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI məsləhət/bildiriş (PAID) | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |

**RLS köməkçi funksiyaları:**
```sql
create or replace function public.is_org_member(uid uuid, oid uuid) returns boolean as $$
  select exists (select 1 from public.organization_members m
    where m.org_id=oid and m.user_id=uid and m.status='active'); $$ language sql stable;

create or replace function public.has_org_role(uid uuid, oid uuid, roles org_role[]) returns boolean as $$
  select exists (select 1 from public.organization_members m
    where m.org_id=oid and m.user_id=uid and m.status='active' and m.role = any(roles)); $$ language sql stable;

create or replace function public.org_is_paid(oid uuid) returns boolean as $$
  select exists (select 1 from public.org_subscriptions s
    where s.org_id=oid and s.tier in ('pro','business') and s.valid_until > now()); $$ language sql stable;
```

**RLS nümunələri** (bütün cədvəllərdə `org_id` var):
```sql
alter table public.fields enable row level security;
create policy fields_read on public.fields for select
  using (public.is_org_member(auth.uid(), org_id));
create policy fields_write on public.fields for all
  using (public.has_org_role(auth.uid(), org_id, array['owner','admin','agronomist']::org_role[]))
  with check (public.has_org_role(auth.uid(), org_id, array['owner','admin','agronomist']::org_role[]));

-- FREE oxuma (üzv): scenes/index_stats/index_rasters/weather_cache
alter table public.index_stats enable row level security;
create policy index_stats_read on public.index_stats for select
  using (public.is_org_member(auth.uid(), org_id));

-- worker əlavə edə bilər: scouting/field_operations/tasks(complete)
alter table public.scouting_observations enable row level security;
create policy scouting_read on public.scouting_observations for select
  using (public.is_org_member(auth.uid(), org_id));
create policy scouting_insert on public.scouting_observations for insert
  with check (public.has_org_role(auth.uid(), org_id,
    array['owner','admin','agronomist','worker']::org_role[]));

-- PAID gating: advice / notifications / ai_chat
alter table public.advice enable row level security;
create policy advice_read on public.advice for select
  using (public.is_org_member(auth.uid(), org_id) and public.org_is_paid(org_id));
```

> Gating API qatında da server-tərəfli icra olunur (RLS = defense-in-depth). Backend `advice/notifications/ai_chat`-i yalnız ödənişli təşkilatlar üçün **yaradır**.

---

## 9. Funksional tələblər + qəbul meyarları (traceability)

| FR | Tələb | Tier | İmplementasiya (§) | Status |
|---|---|---|---|---|
| FR-1 | Poliqon çəkmə/koordinat ilə sahə qurma + adlandırma | FREE | §7 fields, §22, §23 Map | ☐ |
| FR-2 | Canlı 9 HLS-VI indeksi + zaman seriyası | FREE | §10, §22, §23 | ☐ |
| FR-3 | AI məsləhət (indeks+əkin+il+hava) | PAID | §13, §22 | ☐ |
| FR-4 | Bildirişlər (sahə + hava riskləri) | PAID | §12, §19 | ☐ |
| FR-5 | Genişləndirilmiş sahə metadatası | FREE | §7 field_metadata | ☐ |
| FR-6 | Pulsuz/ödənişli + rol gating | — | §8, §22 | ☐ |
| FR-7 | Open-Meteo hava inteqrasiyası + törəmələr | — | §11 | ☐ |
| FR-8 | Tarixi baza + anomaliya/fenologiya | PAID | §10.4, §12 | ☐ |
| FR-9 | Təşkilat→təsərrüfat→sahə iyerarxiyası | — | §7, §22 | ☐ |
| FR-10 | Auth + rollar/icazələr + üzvlük/dəvət | — | §8, §18, §22 | ☐ |
| FR-11 | Skautinq (geo + foto + etiket + marşrut) | FREE* | §14, §22 | ☐ |
| FR-12 | Tapşırıq + əməliyyat jurnalı | FREE* | §15, §22 | ☐ |
| FR-13 | Məhsuldarlıq qeydləri + YoY | FREE* | §16, §22 | ☐ |
| FR-14 | Hesabatlar/eksport (PDF/Excel) | PAID | §17, §22 | ☐ |
| FR-15 | Komanda/təşkilat + sahə paylaşımı | — | §18, §22 | ☐ |
| FR-16 | Çox-kanallı bildiriş (Telegram/WhatsApp) | PAID | §19, §24 | ☐ |
| FR-17 | Billing/abunəlik/onboarding | — | §20, §21 | ☐ |
| FR-18 | Hava-əsaslı modellər (GDD/spray/frost) | qismən PAID | §11.2, §12 | ☐ |
| FR-19 | Sahə-datalı AI chat assistant | PAID | §13.6, §22 | ☐ |
| FR-20 | Lokalizasiya (AZ/RU/TR), əkin təqvimləri | — | §25 | ☐ |

> *Skautinq/tapşırıq/məhsuldarlıq əsas idarəetmə kimi pulsuz tierdə mövcuddur (limitlərlə); komanda yerləri və qabaqcıl hesabat ödənişlidir.

**Qəbul meyarları (nümunələr, Given/When/Then):**
- **FR-9.** *Given* daxil olmuş istifadəçi, *when* təşkilat yaradır, təsərrüfat və sahə əlavə edir, *then* iyerarxiya PostGIS-də qurulur və yalnız təşkilat üzvləri ona çıxa bilir.
- **FR-10.** *Given* təşkilat sahibi, *when* email ilə üzv dəvət edir və rol təyin edir, *then* dəvət qəbul olunanda istifadəçi müvafiq icazələrlə üzv olur; viewer yalnız oxuya bilir.
- **FR-11.** *Given* worker rolu, *when* sahədə foto ilə skautinq müşahidəsi əlavə edir, *then* nöqtə + foto + kateqoriya saxlanır və xəritədə pin kimi görünür.
- **FR-14.** *Given* ödənişli təşkilat, *when* sahə-mövsüm hesabatı sorğu olunur, *then* PDF/Excel yaradılır (indekslər, əməliyyatlar, məhsuldarlıq, xəritə) və storage-da saxlanır.
- **FR-16.** *Given* ödənişli istifadəçi + Telegram bağlı, *when* kritik xəbərdarlıq yaranır, *then* n8n inapp + Telegram (+email) ilə çatdırır.

---

## 10. HLS pipeline modulu (Python)

> §7 `scenes`/`index_stats` ilə eyni. **Axtarış → pəncərəli COG oxuma → Fmask → HLS-VI zonal statistika → PostGIS → plitka.**

### 10.1 Açar funksiyalar
```python
def search_scenes(field_geom, date_from, date_to, max_cloud=70) -> list[Granule]
def read_index_window(granule, field_geom, index_name) -> xarray.DataArray
def apply_fmask(index_da, fmask_da) -> xarray.DataArray
def zonal_stats(index_da, field_geom) -> dict   # mean/min/max/std/p10/p50/p90/valid_pixels
def persist(field_id, org_id, granule, stats_by_index) -> None
```

### 10.2 Texniki qeydlər
- **Üstünlük:** hazır **HLS-VI** COG-ları (`HLSL30_VI.002`, `HLSS30_VI.002`) oxu, reflektansdan yenidən hesablamaqdansa.
- Auth: `~/.netrc`; STAC: `https://cmr.earthdata.nasa.gov/stac/LPCLOUD`.
- GDAL (HTTPS COG): `GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR`, `CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif`, cookie jar.
- Yalnız `field_geom` pəncərəsi oxunur (Hetzner us-west-2-dən kənar → egress/latency minimum).
- Fmask bit decode (xam yolda): bit1=cloud, bit3=shadow, bit0=cirrus → at. HLS-VI fill = −19999; xam reflektans scale 0.0001, fill −9999.
- Latency ~2–3 gün; HLSS30 boşluqları → HLSL30 fallback + geniş kompozit pəncərəsi.

### 10.3 İndeks düsturları (xam yol, lazım olarsa)
| İndeks | S30 zolaqları | L30 zolaqları |
|---|---|---|
| NDVI (NIR−Red)/(NIR+Red) | B08,B04 | B05,B04 |
| EVI | B08,B04,B02 | B05,B04,B02 |
| SAVI (L=0.5) | B08,B04 | B05,B04 |
| MSAVI | B08,B04 | B05,B04 |
| NDMI (NIR−SWIR1)/(NIR+SWIR1) | B08,B11 | B05,B06 |
| NDWI (Green−NIR)/(Green+NIR) | B03,B08 | B03,B05 |
| NBR (NIR−SWIR2)/(NIR+SWIR2) | B08,B12 | B05,B07 |
| NBR2 (SWIR1−SWIR2)/(SWIR1+SWIR2) | B11,B12 | B06,B07 |
| TVI | B08,B04,B03 | B05,B04,B03 |

> **Tələ:** Red hər ikisində B04; NIR S30-da **B08**, L30-da **B05**.

### 10.4 Baza xətti / anomaliya / fenologiya (FR-8)
- Hər sahə+indeks üçün eyni təqvim pəncərəsi (±10 gün) üzrə əvvəlki illərin median+std baza statistikası.
- Anomaliya z = (current_mean − baseline_median)/baseline_std; |z|>1.5 → bayraq.
- Fenologiya: NDVI/EVI zaman seriyasını hamarla (Savitzky–Golay) və hədlərlə mərhələ təyin et → `field_metadata.growth_stage` avtomatik yenilə.

### 10.5 Plitka (FREE)
TiTiler/rio-tiler ilə XYZ raster (indeks-üzrə rəng rampası) → MapLibre `raster` source.

---

## 11. Hava modulu (Open-Meteo) + hava-əsaslı modellər

**Endpoint:** `GET https://api.open-meteo.com/v1/forecast`
```
latitude={lat}&longitude={lon}&timezone=auto&forecast_days=16
&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,
       precipitation_probability_max,et0_fao_evapotranspiration,
       wind_speed_10m_max,relative_humidity_2m_mean
&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,
        soil_temperature_0cm,soil_temperature_6cm
```

### 11.1 Keşləmə/limit
Pulsuz tier qeyri-kommersiyadır (gündə 10k/saatda 5k/dəqiqədə 600). n8n ilə hər sahə üçün gündə 1–2 dəfə yenilə → `weather_cache`. CC-BY 4.0 atribusiyası UI-da. **Ödənişli tier işə düşəndə** kommersiya planına keç və ya AGPLv3 serverini self-host et. Baza xətti üçün NASA POWER.

### 11.2 Hava-əsaslı modellər (FR-18)
- **GDD** = Σ max(0, ((Tmax+Tmin)/2) − Tbase); Tbase `crop_thresholds.gdd_base_c`-dən. Mərhələ/fenologiya üçün.
- **Çiləmə pəncərəsi (spray window):** külək < hədd + yağıntı ehtimalı aşağı + temp aralığında → "uyğun/uyğun deyil" pəncərələr.
- **ET_crop** = Kc(growth_stage) × ET₀ → suvarma tövsiyəsi (su balansı).
- **Erkən xəbərdarlıq bayraqları:** frost (Tmin≤threshold), heat (Tmax≥threshold), heavy_rain, drought (ardıcıl quru + yüksək ET₀ + aşağı soil_moisture), wind.

---

## 12. Qayda mühərriki (deterministik risk tetikləyiciləri)

> Python, n8n-tetikli; hər yeni HLS səhnəsi + hər hava yenilənməsində. Çıxış → `notifications` (PAID). Həddlər `crop_thresholds`-dan.

**Vegetasiya:** VG-1 NDVI_mean<ndvi_stress_max (ndvi_drop); VG-2 NDVI baza z<−1.5 (anomaly); VG-3 NDMI<ndmi_stress_max (ndmi_low); VG-4 |ΔNDVI|>0.2 və ya ΔNBR böyük (change).
**Hava:** WX-1 frost (critical); WX-2 heat; WX-3 heavy_rain; WX-4 drought; WX-5 wind.

**Default `crop_thresholds` seed:**
| crop_type | gdd_base_c | ndvi_healthy_min | ndvi_stress_max | ndmi_stress_max | frost_c | heat_c |
|---|---|---|---|---|---|---|
| generic | 10 | 0.6 | 0.4 | 0.1 | 0 | 35 |
| hazelnut | 7 | 0.6 | 0.4 | 0.1 | -1 | 36 |
| grape | 10 | 0.5 | 0.35 | 0.1 | -1 | 38 |
| wheat | 0 | 0.6 | 0.4 | 0.1 | -4 | 32 |
| cotton | 15 | 0.6 | 0.4 | 0.1 | 2 | 38 |

> Dedup: eyni sahə+type+gün üçün idempotent (təkrar bildiriş yox). Həddlər lokal kalibrləmə tələb edir.

---

## 13. AI məsləhət mühərriki (modeldən asılı olmayan) + AI chat

**Prinsip:** əvvəl deterministik qaydalar; LLM mülahizə + Azərbaycan dilli mətn sintez edir, **təhlükəsizlik-kritik ədədi həddləri özü yaratmır**.

### 13.1 Provayder abstraksiyası
```python
class LLMProvider(ABC):
    @abstractmethod
    def complete(self, system: str, user: str, schema: dict) -> dict: ...
# OpenAIProvider|AnthropicProvider|GeminiProvider|LocalProvider — env ilə seçilir
```

### 13.2 Giriş sxemi (JSON)
```json
{ "field_metadata": {...}, "current_indices": {"NDVI":0,"NDMI":0,"...":0},
  "index_trends": {"NDVI":{"slope":0,"vs_baseline_z":0,"vs_previous":0}},
  "phenology": {"stage":"...","days_after_planting":0,"gdd":0},
  "weather_forecast": {"daily":[{"date":"","t_min":0,"t_max":0,"precip_mm":0,"et0_mm":0}],
                       "derived_flags":{"frost":false,"heat":false,"drought":false}},
  "detected_risks": [{"type":"ndmi_low","severity":"warning"}],
  "kb_snippets": ["retrieved agronomic guidance (AZ crops)..."] }
```

### 13.3 Çıxış sxemi (validasiyalı)
```json
{ "summary":"AZ", "findings":[{"topic":"","severity":"info|warning|critical",
  "explanation":"AZ","recommended_action":"AZ","confidence":"low|medium|high"}],
  "weather_outlook":"AZ", "disclaimer":"AZ" }
```

### 13.4 Sistem prompt (skelet)
Rol: aqronomik məsləhətçi. Dil: **Azərbaycan**. Qayda: "Yalnız verilən indeks/trend/hava/risk/kb-dən istifadə et; əmin deyilsənsə de; **kimyəvi-doza/pestisid norma rəqəmi uydurma** — yalnız KB-də olanı." Çıxış: yuxarıdakı JSON.

### 13.5 Qoruyucular
RAG (`knowledge_base/` — Azərbaycan əkinləri, əkin-üzrə həddlər); simvolik məhdudiyyət-yoxlayıcı (ədədi çıxışı aralıqlara qarşı yoxla, re-prompt); hədd-əsaslı **bütün** xəbərdarlıqların həqiqət mənbəyi = qayda mühərriki; hər məsləhət `disclaimer` ilə.

### 13.6 AI chat assistant (FR-19)
"Sahələrinlə söhbət" — istifadəçi sualı → sahə/VI/hava/əməliyyat datasından RAG kontekst → provayder-agnostik LLM → Azərbaycan dilli cavab. `ai_chat_messages`-də saxlanır. PAID.

---

## 14. Skautinq modulu (FR-11)

- Xəritədə "Skautinq əlavə et": mövqe (GPS/tıklama) → `geom Point`; kateqoriya (pest/disease/weed/nutrient/water/damage/other); şiddət; qeyd; **foto yükləmə** (Supabase Storage → `photos[]`).
- Xəritədə pin kimi göstər (kateqoriya rəngləri); marşrut/lent; `status` (open/resolved).
- PWA geolokasiya + oflayn növbə (sonradan sync).
- worker+ rolları əlavə edə bilər.

---

## 15. Tapşırıq / əməliyyat jurnalı modulu (FR-12)

- **Tapşırıq:** başlıq, növ, təyin edilən üzv, son tarix, status, prioritet → `tasks`. Təqvim + siyahı; üzvə görə filtr; n8n xatırlatma.
- **Əməliyyat jurnalı:** növ (əkin/çiləmə/gübrələmə/suvarma/yığım/şumlama), tarix, resurslar (jsonb), xərc (AZN) → `field_operations`. Sahə üzrə xronologiya.
- worker+ tamamlaya/əlavə edə bilər.

---

## 16. Məhsuldarlıq qeydləri modulu (FR-13)

- Sahə + mövsüm ili + əkin + məhsuldarlıq dəyəri/vahidi + sahə → `yields`.
- İl-üzrə (YoY) müqayisə qrafiki; NDVI-integral ilə korrelyasiya (gələcək proqnoz üçün əsas).

---

## 17. Hesabatlar və eksport modulu (FR-14, PAID)

- Növlər: **sahə-mövsüm hesabatı** (indekslər + əməliyyatlar + skautinq + məhsuldarlıq + xəritə şəkli), **skautinq hesabatı**, **təsərrüfat xülasəsi**.
- Format: PDF (WeasyPrint/ReportLab) + Excel (openpyxl). Çap xəritəsi (statik render). n8n ilə planlı/tələb üzrə.
- `reports`-da metadata + storage_path.

---

## 18. Komanda / təşkilat modulu (FR-10, FR-15)

- Onboarding: qeydiyyat → təşkilat yarat → ilk təsərrüfat/sahə.
- Üzvlük: email dəvəti (`org_invites`, token+expiry) → qəbul → `organization_members`.
- Rollar: owner/admin/agronomist/worker/viewer (§8 matrisi).
- Sahə paylaşımı təşkilat daxilində üzvlük vasitəsilə.

---

## 19. Bildiriş sistemi (çox-kanallı, FR-4/FR-16)

- Yaratma: qayda mühərriki (§12) → `notifications` (PAID).
- Kanallar: inapp (həmişə), push, email, **Telegram**, **WhatsApp**, SMS (`notification_preferences`-ə görə; n8n node-ları).
- Şiddət marşrutu: critical → push+email+Telegram+inapp; warning → push+Telegram+inapp; info → inapp.
- UI: zəng + oxunmamış sayğac; `read_at`; sahə lentində. Idempotent.

---

## 20. Billing / abunəlik / onboarding (FR-17)

- `org_subscriptions` (tier free/pro/business, seats, hectare_cap, valid_until).
- PSP (Stripe və ya yerli) webhook → entitlements yenilə. Gating §8.
- Onboarding sihirbazı; tier yüksəltmə/endirmə; hektar limiti yoxlaması.

---

## 21. Monetizasiya modeli

- **Freemium:** səxavətli pulsuz tier (bir neçə/limitli sahə, son VI şəkil, əsas hava, skautinq qeydləri, əsas tapşırıq/məhsuldarlıq) — OneSoil-tipli cəlbetmə mühərriki.
- **Ödənişli tierlər (hektar-bantlı, AZN):** Small/Medium/Large; Qərb tariflərindən (Farmonaut $0.38–$1.00/ha) xeyli aşağı; çox-aşağı illik smallholder planı.
- **Premium qapı arxasında:** tam VI tarixi, VRA/zonalar, ET suvarma, qabaqcıl hesabatlar, komanda yerləri, API, premium bildiriş kanalları (Telegram/WhatsApp), AI chat.
- **B2B/kooperativ + white-label:** kooperativ/aqronom-yeri qiyməti; agrobiznes/bank üçün white-label.
- **Subsidiya mühiti:** dövlət dəstəyini nəzərə al — mümkün olduqda ödənişli tierləri subsidiya-uyğun aqro-xidmət kimi mövqeləşdir.

---

## 22. REST API spesifikasiyası (əsas)

> Next.js BFF + Python backend proxy. Gating: rol + FREE/PAID (server-tərəfli + RLS).

| Method | Path | Rol/Tier | Təsvir |
|---|---|---|---|
| POST | `/api/auth/*` | public | qeydiyyat/giriş (Supabase Auth) |
| POST | `/api/orgs` | user | təşkilat yarat |
| POST | `/api/orgs/{id}/invite` | owner/admin | üzv dəvət et |
| POST | `/api/orgs/{id}/members/{uid}/role` | owner/admin | rol dəyiş |
| POST | `/api/farms` | agronomist+ | təsərrüfat yarat |
| POST | `/api/fields` | agronomist+ | sahə yarat (geom/coords) |
| GET | `/api/fields?farm_id=` | member | sahələr |
| PUT | `/api/fields/{id}/metadata` | agronomist+ | metadata |
| GET | `/api/fields/{id}/indices?index=&from=&to=` | member (FREE) | zaman seriyası |
| GET | `/api/fields/{id}/indices/latest` | member (FREE) | son 9 indeks |
| GET | `/api/tiles/{field_id}/{index}/{scene}/{z}/{x}/{y}.png` | member (FREE) | XYZ plitka |
| GET | `/api/fields/{id}/weather` | member (FREE) | keşlənmiş proqnoz |
| POST | `/api/fields/{id}/advice` | **PAID** | AI məsləhət |
| POST | `/api/fields/{id}/chat` | **PAID** | AI chat |
| GET | `/api/notifications` | **PAID** | bildiriş lenti |
| POST | `/api/scouting` | worker+ | skautinq müşahidəsi (+foto) |
| GET | `/api/scouting?field_id=` | member | müşahidələr |
| POST | `/api/tasks` | agronomist+ | tapşırıq yarat |
| POST | `/api/tasks/{id}/status` | worker+ | status dəyiş |
| POST | `/api/operations` | worker+ | əməliyyat jurnalı |
| POST | `/api/yields` | agronomist+ | məhsuldarlıq qeydi |
| POST | `/api/reports` | **PAID** | hesabat yarat (PDF/Excel) |
| POST | `/api/billing/*` | owner/admin | abunəlik |
| POST | `/api/internal/{pipeline,rules,weather}/run` | service | n8n tetikləyiciləri |

**Gating utiliti:**
```ts
async function requirePaid(orgId: string){ if(!(await orgIsPaid(orgId))) throw new HttpError(402,"paid_feature"); }
async function requireRole(userId:string, orgId:string, roles:Role[]){ if(!(await hasRole(userId,orgId,roles))) throw new HttpError(403,"forbidden"); }
```

---

## 23. Frontend komponent spesifikasiyası

- **Onboarding/Auth:** qeydiyyat → təşkilat → təsərrüfat/sahə sihirbazı.
- **Map (FR-1/FR-11):** MapLibre + Draw (poliqon/koordinat rejimi, turf validasiya); skautinq pinləri.
- **FieldMetadataForm (FR-5):** §7 sahələri; jsonb üçün təkrarlanan sətir UI.
- **IndexViewer (FR-2, FREE):** 9 indeks seçici + raster + əfsanə + sahə-orta.
- **Charts (FR-2/FR-13):** VI zaman seriyası; baza overlay (paid); YoY məhsuldarlıq.
- **Scouting/Tasks/Ops/Yields:** siyahı + xəritə + formalar; təqvim.
- **AdvicePanel + AIChat (FR-3/FR-19, PAID):** strukturlaşdırılmış məsləhət (severity rəngli) + söhbət; pulsuz istifadəçiyə upsell.
- **AlertsBell (FR-4):** oxunmamış sayğac + lent.
- **Team/Billing:** üzvlər/rollar; abunəlik.
- **Atribusiya:** Open-Meteo CC-BY; NASA HLS mənbə. i18n (AZ default).

---

## 24. Fon işləri / n8n orkestrasiya

| Workflow | Cədvəl | İş |
|---|---|---|
| `hls_scene_check` | gündəlik | sahə üçün yeni HLS → pipeline → PostGIS |
| `weather_refresh` | gündə 1–2 | Open-Meteo → weather_cache |
| `rules_run` | səhnə/hava sonrası | qayda mühərriki → notifications (paid) |
| `advice_refresh` | opsional gündəlik (paid) | məsləhəti yenilə |
| `dispatch` | event | push/email/**Telegram/WhatsApp**/SMS |
| `reports_schedule` | tələb/planlı (paid) | PDF/Excel yarat |

> Credential ID-ləri workflow JSON-da; açarları chat-da ifşa etmə.

---

## 25. Lokalizasiya (FR-20)

- i18n: **az** (default), ru, tr. Bütün UI + AI çıxışı AZ.
- Vahidlər: metrik (ha, °C, mm). Valyuta: AZN.
- **Regional əkin təqvimləri:** fındıq, üzüm, buğda/arpa, pambıq, nar/xurma, tərəvəz — bağ/üzümlük iş axınları (çoxillik).

---

## 26. Mühit dəyişənləri (`.env.example`)

```
SUPABASE_URL= SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY=
EARTHDATA_USERNAME= EARTHDATA_PASSWORD=            # və ya ~/.netrc
OPEN_METEO_BASE=https://api.open-meteo.com/v1
OPEN_METEO_API_KEY=                                 # yalnız kommersiya/self-host
LLM_PROVIDER= LLM_MODEL= LLM_API_KEY=
TILE_SERVER_BASE= OBJECT_STORAGE_BUCKET=
BILLING_PROVIDER= BILLING_WEBHOOK_SECRET=
TELEGRAM_BOT_TOKEN= WHATSAPP_API_TOKEN= SMS_PROVIDER_KEY=
GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR
CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif
```

---

## 27. Qeyri-funksional tələblər

- **Performans:** sahə-pəncərəli COG oxuma; zonal statistika + tile keş; AOI < ~10 km² üçün VPS-də ucuz.
- **Multi-tenancy:** hər cədvəldə `org_id`; RLS + rol; təhlükəsiz izolyasiya.
- **Etibarlılıq:** bulud/HLSS30 boşluqları üçün graceful degrade; HLSL30 fallback.
- **Təhlükəsizlik:** gating server-tərəfli + RLS; service-role yalnız backend; açarlar ifşa olunmur; foto/PII qorunur.
- **Oflayn:** PWA (skautinq/əməliyyat oflayn növbə + sync).
- **Lokalizasiya:** AZ-əvvəl; idempotent bildiriş/pipeline.

---

## 28. Faza üzrə yol xəritəsi + DoD

**Faza 1 — Təməl (müstəqil məhsul):** auth/onboarding, təşkilat→təsərrüfat→sahə, rollar/icazələr, billing, AZ lokalizasiya; sahə/metadata; **HLS pipeline + FREE indeks vizualizasiya + zaman seriyası**; skautinq (foto), tapşırıq/əməliyyat jurnalı, məhsuldarlıq. *DoD:* çoxlu-istifadəçili təsərrüfat/kooperativ aktiv skautinq/tapşırıq yaradır, təkcə VI-yə baxmır. (FR-1,2,5,6,9,10,11,12,13,15,20)
**Faza 2 — Ucuz fərqləndirmə:** Open-Meteo + hava-əsaslı modellər (GDD/spray/frost/quraqlıq); çox-kanallı bildiriş (Telegram/WhatsApp); **AI məsləhət + AI chat**; fenologiya/anomaliya. *DoD:* ödənişli konversiya bildiriş/məsləhətlə; retention bildirişlə. (FR-3,4,7,8,16,18,19)
**Faza 3 — Premium/regional dərinlik:** zonalar + VRA eksport; ET suvarma; xərc/iqtisadiyyat; kooperativ/qrup; torpaq datası; oflayn PWA; xəstəlik/zərər modelləri (+Plantix-tipli partnyorluq qiymətləndir); hesabatlar (§17). *DoD:* orta təsərrüfat/kooperativ və suvarma-subsidiya istifadəçiləri arasında qəbul. (FR-14 + NICE-TO-HAVE)
**Faza 4 — Ekosistem/vizyon:** API, white-label, benchmarking, izlənəbilirlik (fındıq ixracı), karbon, **EKTIS/eagro.az inteqrasiyası**. *DoD:* B2B/white-label sazişləri; dövlət/bank partnyorluğu.

---

## 29. Məhdudiyyətlər (caveats)

- **30 m ayırdetmə:** sahə-miqyaslı; < ~0.5–1 ha az təmiz piksel → minimum sahə ölçüsü izah et. (Bağ/üzümlük üçün sahə-orta yenə faydalıdır.)
- **Buludluluq + gecikmə:** "canlı" dəyər ~1.7–4 gün köhnə; harmonizasiya + kompozit yumşaldır.
- **HLSS30 boşluqları:** sənədləşdirilib → HLSL30 fallback + geniş pəncərə.
- **Hetzner us-west-2-dən kənar:** COG HTTPS → pəncərəli oxuma + aqressiv keş.
- **Open-Meteo kommersiya:** pulsuz tier qeyri-kommersiyadır → ödənişli tierdə kommersiya planı/self-host + atribusiya.
- **AI təhlükəsizliyi:** məsləhət əsaslandırılmış/məhdud; təhlükəsizlik-kritik rəqəmlər yalnız qayda validasiyası ilə; qərar-dəstəyi.
- **Rəqib iddiaları təsdiqlənməyib:** dəqiqlik/fayda faizləri marketinqdir. Qiymətlər (EOSDA/OneSoil) login-arxası; Farmonaut/Climate FieldView public anchorlardır.
- **Subsidiya/əkin rəqəmləri** mənbələr arasında dəyişir və köhnələ bilər → AKİA/Nazirlik/DSK-dən yoxla.
- **İndeks həddləri** (§12) başlanğıcdır; Azərbaycan əkinləri üçün lokal kalibrləmə tələb edir.

---

## 30. Subsidiya Kalkulyatoru (FR-21, FREE)

> Tam spesifikasiya + 2026 seed datası ayrıca modul sənədindədir: **`Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md`**. Aşağıda xülasə.

İstifadəçi addım-addım seçimlər edərək (subsidiya növü → bitki qrupu → konkret bitki → intensivlik/əkin növü → ərazi → suvarma → əkin dövrü → sahə/ton) dövlət subsidiyasının məbləğini görür. Mənbə: Aqrar Subsidiya Şurası 2026 əmsalları (`agro.gov.az/az/news/010920254`) — **tam cədvəl DB-yə yüklənir** (`subsidy_rates`, 117 dərəcə).

**Əsas düstur:** bütün məbləğlər `əmsal × 200 AZN` (əkin/dincə: AZN/ha; məhsul: AZN/ton). Baza dərəcəsi (200) `subsidy_years`-də konfiqdir (illik dəyişə bilər). Hesablama: `total = amount_per_unit × quantity × modifiers`, harada modifikatorlar: Böyük Qayıdış ×1.5, sertifikatlı toxum → 0 (buğda >10 ha / arpa >100 ha), rayon uyğunsuzluğu → 0 (fındıq/sitrus/pambıq/tütün), məhsul analiz azaltması, alma/şaftalı 2026-06-01 dayanması. Min sahə/min ting/hündürlük/EC şərtləri xəbərdarlıq kimi göstərilir.

**Yeni DB cədvəlləri:** `subsidy_years`, `subsidy_regions`, `subsidy_rates`, `subsidy_modifiers`, `subsidy_calculations` (istinad datası public-read; hesablamalar üzvlüyə bağlı). **Yeni API:** `/api/subsidy/{options,calculate,save,history,rates}`. **UI:** SubsidyCalculator sihirbazı + "Sahədən doldur" (sahə `area_ha`/ərazi/əkin növünü avtomatik doldurur) + tam cədvəl şəffaflığı.

**FR-21 qəbul meyarı:** *Given* istifadəçi seçimlər edir, *when* miqdar daxil edir, *then* uyğun dərəcə + cəmi məbləğ + modifikatorlar + uyğunluq xəbərdarlıqları qaytarılır; nəticə saxlanıla bilir; mənbə datası DB-də və şəffaf göstərilir. **Qeyd:** kalkulyator qeyri-rəsmidir; rəsmi hesablama EKTİS üzərindən aparılır.

---

*Sənəd sonu. Claude Code §28 fazaları (+ §30 modulu) üzrə tətbiq etməli, hər addımdan sonra Git-ə təsviri commit ilə push etməlidir.*
