# Changelog

Bütün əhəmiyyətli dəyişikliklər burada qeyd olunur. Format [Keep a Changelog](https://keepachangelog.com/),
versiyalar [SemVer](https://semver.org/).

## [1.9.0] — 2026-07-23 — T16/T17/T19/T24 + D2 qalıqları (CANLI)

### Added / Changed (CANLI, main — hər biri build gate + canlı doğrulama)
- **D2 qalıqları (`?ui=v2`):** `FieldMapSheet` bir responsiv element — mobil sürüşən sheet / **desktop sabit sağ sidebar** (drag yox; uşaqlar bir dəfə mount olur); sheet mövqeyi **`?panel=`** URL-də (raise→push, lower→replace → **Android geri-jesti sheet-i endirir** + paylaşıla bilir). Canlı test: desktop sidebar + panel URL + geri-jesti.
- **T19 — Shapefile import + ScaleControl:** `geoio.parseShapefile` (shpjs, lazy dynamic-import — əsas bundle-a girmir); FieldOnboarding idxalı `.zip/.shp` qəbul edir (kadastr/aqronom sərhədləri) → poliqon → draw buffer; xəritələrdə `maplibregl.ScaleControl`. Canlı: 4-təpəli shapefile → 13.869 ha düzgün. (Shapefile export & rəngli annotasiya təxirə.)
- **T17 — Research → index_norms write-back + mövsümi auto-enqueue:** migration 0026 `crop_thresholds.norms_source/norms_updated_at`; research per-məhsul veg-indeks bantlarını (NDVI/EVI/SAVI/NDRE/CIre, ciddi-artan validasiya) sintez edib **guarded upsert** ilə yazır — **curated seed heç vaxt üstünə yazılmır** (yalnız NULL/`research`); zone_knowledge `index_norms` audit bloku; `POST /internal/research/enqueue-seasonal` + `deploy/enqueue-research-seasonal.sh` (aylıq). Canlı: upsert insert+seed-qorunma; hazelnut sintez etibarlı bantlar; seed toxunulmadı.
- **T24 — Lab-analiz OCR:** migration 0027 `soil_profiles`; `ai/soil_lab.py` (T5 vision-u təkrar → pH/humus/N/P/K/tərkib/EC/CaCO3) → `soil_profiles` + `soil_profile` passport bloku `source=lab`; research **lab varsa SoilGrids yazmır** (lab>manual>soilgrids); `POST/GET /fields/{id}/soil-lab` (business, AI-gated); `SoilLabUpload` kartı AI tabında. Canlı: precedence (`soil_profile:lab`) + schema doğrulandı.
- **T16 — Mövsüm feature-store:** migration 0028 `field_season_features`; `ai/season.py` mövsümü aqreqasiya edir (NDVI peak/mean/**trapesoid inteqral**, S2 üstün → HLS; GDD total T4; yağış total T8) → `POST /internal/season/compute` + `deploy/compute-season-features.sh` (aylıq); `GET /fields/{id}/season-features`. **NDVI-inteqral↔məhsuldarlıq modeli ≥3 mövsümə təxirə** — bu yalnız featurелəri yığır. Canlı: 3 sahə hesablandı (fındıq bağım integral 40.8/31 səhnə; GDD 1158).
- **⏳ İstifadəçi addımı:** 2 yeni cron crontab-a əlavə edilməli (endpoint-lər canlı işləyir; skriptlərin başlığında dəqiq sətirlər).

## [1.8.0] — 2026-07-22 — UX/UI redizayn D0-D2 (dizayn araşdırması → İА) (CANLI)

Mənbə: dizayn araşdırması `wf_68ea40bc` (OneSoil/Plantix/FarmerApp/GSMA + kod auditi) → `docs/DESIGN_IMPLEMENTATION_PLAN.md` (D0-D5, feature-parity matrisi).

### Added / Changed (CANLI, main)
- **D0 — cərrahi quick-win:** onboarding **köhnə FieldCreator → FieldOnboarding + səssiz tenancy** (yeni user artıq kalibrli ilk sahə yaradır — kritik bug); NotificationBell **mobil header-də**; sahə tab vəziyyəti **URL-də (`?tab=`)** + skroller; tək-org üçün org selector/Rol gizli; **`azError()`** AZ xəta lüğəti; `.btn`/`.input` min-h-44 + 16px; PhotoDiagnose+FertilizerCard→AI tabı, MGRS header-dən, ⚙️→lucide.
- **D1 — dizayn tokenləri + kit:** Tailwind token qatı (**emerald-600→#15803D** global lift, ink/warn/bad/good/info 700-çəki, card border-1.5, 16px döşəmə); **Inter Variable** (next/font, latin-ext — AZ ə); **StatusChip** (ikon+söz+rəng+aria); **Skeleton** kiti; qlobal focus-visible ring.
- **D2 — İА (1+2-ci dilim):** sahə tabları **9→3 niyyət qrupu** (VƏZİYYƏT/İŞLƏR/MƏLUMAT); **soft-delete/undo** (migration 0025 `fields.deleted_at` + `/restore` + 6s undo bar — accidental-delete data-itki bağlandı); mobil **bottom nav** (5 slot + kamera FAB, hamburger-i əvəz etdi); yeni marşrutlar **/fields** (siyahı), **/more** (menyu), **/notifications** (event kartlar + severity çip + deep-link).
- **D2 — İА (3-cü dilim, `?ui=v2` arxasında):** **"Bu gün" kart-home** (`TodayHome` — tarixli salam + "N sahə · M diqqət" + alert zolağı + per-sahə verdict kartı + FAO-56 suvarma ipucu, deterministik); **map-first sahə görünüşü** (`FieldMapSheet` — tam-ekran peyk xəritəsi + sürüşən 3-snap sheet, düz pointer-drag, klassik tab-state paylaşılır); **kamera FAB** → AI foto-diaqnoz; yapışqan bayraq `lib/uiFlag.ts` (`?ui=v1` geri çıxarır). Canlı test edildi (desktop+mobil); **düzəliş:** full-bleed map `h-full`→`h-screen` (DisplayMap-ın height:auto wrapper-i `h-full`-u 2px-ə yığırdı). D2.4 (S2/NASA birləşmə) qəsdən edilmədi — user ayrı tablar istəyir.

## [1.7.0] — 2026-07-22 — Email/OTP (Resend, U3) + Telegram alert bot (U4/T22) — kod hazır (CANLI)

### Added (CANLI, main — açarsız səliqəli dormant)
- **U3 — Email təsdiqi (OTP) + Resend:** migration 0024 `users.email_verified/otp_code/otp_expires_at/otp_attempts`; `notify.py` Resend HTTP transport (Resend→SMTP→log) + `email_configured()`; `auth` signup — email konfiqurasiya olunubsa OTP göndərir + `{needs_verification}`, **yoxdursa avtomatik verify (signup pozulmur)**; `/verify-otp` + `/resend-otp`; login `email_not_verified` 403; `OtpVerify.tsx` signup+login-də. Canlı: açarsız auto-verify + OTP verify (yanlış→400 attempt++ persistent, doğru→200).
- **U4 — Telegram bir-tərəfli alert bot:** migration 0024 `messaging_channels` + `message_log`; `messaging/telegram.py`; `routers/messaging.py` (status + deep-link opt-in + `/telegram/webhook` `/start`-bind + `/stop`); qayda dispatcher-i (T1) alertləri bağlı+opt-in chatlara göndərir; `/internal/telegram/setup`; dashboard-da `TelegramConnect` kartı. Tokensiz dormant. Canlı: `configured:false` doğrulandı.
- **İstifadəçi addımları (aktivləşdirmə):** U3 → Resend hesabı + `RESEND_API_KEY` + CF SPF/DKIM. U4 → @BotFather bot → `.env`-ə token/username/secret → `POST /api/internal/telegram/setup`.

## [1.6.0] — 2026-07-22 — Sprint 3-4: pest-risk (T9) + benchmark (T10) + fertilizer (T11) + PWA (T12) (CANLI)

### Added (CANLI, main)
- **T9 — Pest/xəstəlik risk engine:** migration 0022 `pest_risk_models` (seed: fındıq/alma/üzüm/buğda) + `field_pest_mutes`; `ai/pest.py` GDD-pəncərə + yarpaq-nəmliyi → risk qaydalar mühərriki (T1) üzərindən; Qayda 7 (problem tipi + qeydiyyatlı-siyahı + aqronom, doza yox), fermer mute-u. `POST /pest-mute`. Canlı: pəncərədə→fired=1, mute→0.
- **T10 — D2 benchmark hardening:** migration 0021 `index_benchmark()` → p10/p50/p90 + **k-anonimlik n≥5 (HARD-CODED)** + consent (`organizations.benchmark_opt_in`); endpoint business-tier gate. Canlı: free→gated, k-anon<5→suppress.
- **T11 — Gübrə plan engine:** migration 0023 `crop_nutrient_norms` (seed) + `fertilizer_plans` + splits; `ai/fertilizer.py` N-P-K = norm×hədəf məhsuldarlıq, mərhələ üzrə bölgü; Qayda 7 (element kq, məhsul/doza yox); `GET /fertilizer` (business) + `FertilizerCard`. Canlı: fındıq ty=3→N90/P18/K75.
- **T12 — PWA/offline sahə rejimi:** web manifest + icon.svg + service worker (cache-first tile/asset, network-first API/nav) + `PwaRegister` + theme-color → **quraşdırıla bilən PWA**; offline skautinq outbox (`lib/offlineQueue.ts`, localStorage → reconnect-də avtomatik sync). Canlı: manifest/sw/icon 200 (CF-dən də). Web-push (VAPID) təxirə.

## [1.5.0] — 2026-07-22 — Sprint 1-3: rule engine (T1) + veg rules (T2) + baseline (T6) + photo AI (T5) (CANLI)

### Added (CANLI, main)
- **T1 — Qayda mühərriki + dispatcher:** yeni `services/app/rules/` (migration 0016 `alert_state`) — bütün alertlər tək deduped/sakit-saat(22-07)/cooldown(18s)/eskalasiya yolundan keçir. Hava frost/heat/külək alertləri `weather.py`-nin birbaşa insert-indən bura köçdü. `POST /rules/run` (əvvəl 501). Canlı test: inject→fired=1, təkrar→fired=0 (dedup).
- **T2 — Vegetasiya qaydaları VG-1..4:** NDVI enmə / NDMI aşağı / baseline anomaliyası / NDVI+NBR birgə dəyişim → bildiriş (S2 trendləri). Geo pipeline yeni səhnədən sonra baseline+rules çağırır. Canlı: sağlam sahədə düzgün false-alert vermədi.
- **T6 — Baseline/anomaliya:** migration 0018 `field_index_baseline` (həftəlik p10/p50/p90, SQL percentile), `ai/analytics.py` refresh_baseline + anomaly_for. Canlı: 35 baseline sətri. (Fenologiya-avto təxirə.)
- **T5 — Foto diaqnoz (Claude vision):** `llm.complete_vision_structured` + `ai/diagnose.py` (Qayda 7 təhlükəsiz: problem tipi + qeydiyyatlı-siyahı + aqronom, pestisid dozası yox; əminlik kalibrli), migration 0019 `photo_diagnoses`, `POST /api/fields/{id}/diagnose` (Paket 3 + 30/ay kvota), ScoutingTab-da `PhotoDiagnose` paneli. Canlı: free→402, business→struktur diaqnoz + kvota izləmə.

## [1.4.0] — 2026-07-22 — Sprint 0-1: partial reveal (T0) + GDD (T4) + rayon dropdown (T13) (CANLI)

### Added (CANLI, main)
- **T0 — İlk-NDVI "partial" göstərmə:** sahə yaradılanda HLS səhnələri gələn kimi `data_status='partial'` + `first_scene_at` (migration 0015) + "İlk peyk məlumatı hazırdır" bildiriş; Sentinel-2 pass davam edərkən status 'partial' qalır (tam-ekran banner yox — data dərhal görünür), sonra avtomatik 'ready'. Canlı doğrulandı (demo sahə partial → ready).
- **T4 — GDD toplama modeli:** Open-Meteo archive tmin/tmax → günlük + kumulyativ Growing-Degree-Days mövsüm başından; baza temp `crop_thresholds.gdd_base_c`-dən (migration 0017 `field_gdd_daily`, `ai/gdd.py`, `GET /api/fields/{id}/gdd`, günlük weather cron-a qoşuldu). Fenologiya (T6) / FAO-56 (T8) / pest (T9) üçün təməl. Canlı: demo sahə GDD=1157.9 (198 gün, base 7°C).
- **T13 — MetadataTab rayon dropdown:** sahə redaktə tabında `region` sərbəst mətn → ölkə/rayon `<select>` (regions.ts təkrar istifadə).

## [1.3.0] — 2026-07-21 — Ayrı peyk tabları + İcmal insight + fırça + upgrade CTA (CANLI, main `ac1695a`)

### Added (CANLI, main)
- **Ayrı peyk tabları:** NASA HLS (30m) və Sentinel-2 (10m) artıq ayrı top-level tablarda (`SatelliteTab`, sabit sensor, yanlış-sensor fallback bloklanıb). İcmal ilk gələn sensoru göstərir + "digəri hazırlanır" qeydi.
- **AI yalnız Sentinel-2:** `context.index_trends` `sensor='S2'`-yə bağlandı (əvvəl ən-təzə-ailə); S2 yoxdursa `satellite_status` qeydi ilə səliqəli deqradasiya.
- **İcmal "wow" insight səhifəsi:** başlıq sağlamlıq hökmü + məhsul-bilən "nə dəyişdi → sənin məhsulun üçün nə deməkdir → nə etməli" izah kartları + NDVI sparkline + son peyk şəkli. Deterministik (`lib/insights.ts`, LLM-siz). Yeni endpoint `GET /api/fields/{id}/insights` (s2+hls trend). Paylaşılan `lib/indexStatus.ts`.
- **Fırça ilə sahə seçimi:** `DrawMap`-də sərbəst (lasso) rejim — basıb-sürüşdürərək sərhəd çəkilir, turf simplify → redaktə oluna bilən təpələr; onboarding-də "✏️ Fırça" düyməsi.
- **Marketinq upgrade CTA:** `field_limit_reached` (402) artıq qırmızı error yerinə `UpgradeCta` (fayda bulletləri + "Paketlərə bax" → /pricing) göstərir.

## [1.2.0] — 2026-07-21 — Bilik qatı + v2.1 (E0/C3/E1/E2) + billing + UX (CANLI)

### Added (CANLI, main)
- **AI Bilik Qatı (M1–M8):** zone/field knowledge blokları, struktur mənbələr (SoilGrids/EPPO/FAOSTAT), web_search+LLM araşdırma, dəqiqləşdirmə blokları, hava+su balansı. Migration 0014.
- **E0 NDRE + CIre** red-edge indeksləri (Sentinel-2 yalnız) — sıx çətirdə NDVI doyanda real vəziyyəti göstərir; İcmal-summary-də.
- **C3 "toxun və tap"** avtomatik sahə sərhədi — `geoapi` mikroservis (kənar-həssas region-growing, windowed COG oxuma, mem-cap); çılpaq torpaqda "əl ilə çək" fallback.
- **E1** Saxton-Rawls pedotransfer → FC/WP/TAW/RAW (soil_profile blokunda; B2-ni açır).
- **E2** saatlıq hava → çiləmə pəncərəsi + frost/heat/külək alertləri (spray_window bloku; kritik frost→bildiriş).
- **3-paket billing** (Pulsuz / Pro 10 AZN / Business 25 AZN): `tiers.py` flag+limit, per-tier model (sonnet/opus), gating (advice kvota, chat, sahə limiti, passport), admin **Abunələr** tab.
- **/pricing** public səhifə + home bölmə + nav linki.
- **UX Sprint A:** sahə edit/sil paneli (silmə redirect 404 fix), xəritə axtarış zolağı, Sentinel-2 "hazırlanır — gözləyin" state, istifadəçi abunə badge+istifadə, ölkə/rayon **dropdown**, "İdarə paneli"→"Sahələrim".
- **M5** bitki-spesifik indeks etiketləri (crop_thresholds.index_norms); `weather_cache` date bug fix.

### Fixed
- Silmə bug-u: backend silirdi, UI 404 redirect "error" göstərirdi → indi dashboard-a yönləndirir.

## [1.1.0] — 2026-07-17 — Canlı QA fixləri + Sentinel-2 10m feature (branch)

### Fixed (CANLI, main `04d7a55`)
- **Subsidiya kalkulyatoru** bitki/qrup adları tam **Azərbaycanca** (əvvəl xam `cereals_legumes`, `fruit_other` və s. istifadəçiyə göstərilirdi) — `i18n.ts` cropGroupLabels/cropLabels 2026 seed-lə tam uyğunlaşdırıldı.
- **Subsidiya wizard** təklif olunan ölçüləri (region/intensivlik/dövr) məcbur edir → çaşdırıcı "tarif tapılmadı" dead-end aradan qalxdı (məs. alma region-asılıdır).
- **Bildiriş zəngi** (`NotificationBell`) nav-a əlavə edildi — istifadəçilər peyk-hazır / AI-məsləhət bildirişlərini artıq görür (oxunmamış badge + dropdown + mark-read).
- Sahə yaradılışı **`<0.05 ha`** sahələri rədd edir (`field_too_small`) — peyk piksel analizi mümkün olmayan sahələr (əvvəl 0.01 ha yaradıla bilirdi).

### In progress (`feat/sentinel2-sensor` branch — deploy OLUNMAYIB)
- **Sentinel-2 L2A 10m** yeni sensor kimi (NASA HLS 30m yanında): 1 ha analiz keyfiyyətini FarmerApp səviyyəsinə qaldırır. Migration 0013, `search_s2.py` (Element84), `run_field_all`, 4 endpoint sensor-scope, frontend sensor toggle + iki-sensor chart. Tam deploy ardıcıllığı: **`docs/Sentinel2_Integration.md`**.

## [1.0.9] — 2026-07-14 — Sahə əlavəetmə sihirbazı (click-first, adaptiv) + "Sahə haqqında məlumat"

### Added
- **4-addımlı sahə onboarding sihirbazı** (`FieldOnboarding`, köhnə tək-ekran `FieldCreator` əvəzinə):
  (1) xəritədə sahəni seç, (2) **Sahə haqqında məlumat** (əsas, kliklə, **adaptiv** — çoxillik/birillik
  seçiminə görə suallar dəyişir), (3) ətraflı (istəyə bağlı, "Bilmirəm" ilə keçilir), (4) təsdiq → sahə
  yaradılır və peyk datası **məlumatdan sonra** yüklənməyə başlayır.
- **Klaviatura demək olar ki, lazım deyil:** klik-kartlar (növ), bitki/sort çipləri, klik-təqvim (əkilmə
  ili / səpin tarixi), **torpaq pH** (kateqoriya düymələri + slider + Bilmirəm), rəqəmlər üçün slider-lər.
- **Avtomatik relyef + rayon:** yeni `GET /api/geo/site` — xəritədə seçilən yerə görə **yüksəklik/meyllik/
  istiqamət** (Open-Meteo elevation DEM) və **rayon/iqtisadi bölgə** (Nominatim reverse → `subsidy_regions`)
  avtomatik doldurulur (redaktə oluna bilər). Açar tələb etmir.
- **`crop_cycle` (çoxillik/birillik/ikiillik)** + `region`/`economic_region` bazada saxlanılır
  (migration `0012`); subsidiya/AI konteksti üçün.
- Yeni click-first komponentlər (`components/field/info/`) + `useFieldInfo` hook; **`MetadataTab` yenidən
  yazıldı** eyni komponentlərlə (adaptiv, click-first), uzun-quyruq massiv alt-formaları qorunub.

### Changed
- "Metadata" istifadəçi-üzü etiketi → **"Sahə haqqında məlumat"** (tab + başlıq + toast).

## [1.0.8] — 2026-07-14 — Admin panel + AI token/xərc izləmə + billing

### Added
- **AI token/xərc izləmə:** hər AI çağırışı (məsləhət + chatbot) üçün giriş/çıxış token-ləri və
  model qiymətinə əsasən **xərc (USD)** `public.ai_usage` ledger-ində saxlanır. `ai/llm.py` indi
  `usage` qaytarır; `ai/pricing.py` (model → \$/1M qiymət) + `ai/usage.py` (`record_usage`). Məsləhət
  istifadəsi org sahibinə, chat istifadəsi sual verən user-ə aid edilir (best-effort, AI-ı bloklamır).
- **Platform admin paneli (`/admin`, yalnız `users.is_admin`):**
  - **Ümumi** — user/org/farm/sahə sayı, AI çağırışları, token-lər, ümumi + bu ayın xərci, AI status.
  - **İstifadəçilər** — hər user: org, rol, qoşulma, AI çağırışı, token (giriş/çıxış), xərc, son aktivlik.
  - **Aktivlik** — bütün platforma üzrə son hadisələr (qeydiyyat, sahə, AI məsləhət, chat, skautinq, tapşırıq).
  - **Xərc / Billing** — org üzrə AI xərci + **təklif olunan hesab (xərc × 3 markup)**, günlük xərc
    qrafiki (Recharts), model üzrə bölgü, cəmi.
- **API:** `GET /api/admin/{overview,users,activity,usage,billing}` (platform-admin qapısı
  `require_platform_admin`). `GET /api/auth/me` və `login` indi `is_admin` qaytarır; Nav-da admin linki
  yalnız admin-ə görünür.
- **Migration `0011`:** `users.is_admin` (owner admin təyin olunur) + `ai_usage` ledger + indекслər.

### Notes
- Token/xərc rəqəmləri yalnız AI aktivləşəndən sonra (`LLM_API_KEY` .env-də) dolur.

## [1.0.7] — 2026-07-14 — İnfrastruktur Sprint 3 (xəritə alətləri) + bölgə benchmark

### Added
- **Relyef kölgəsi (hillshade):** pulsuz/açarsız AWS Terrain Tiles DEM (Terrarium) əsasında
  relyef kölgələmə; basemap panelində keçid, `localStorage`-da yadda qalır (`lib/basemaps.ts`).
- **Yer axtarışı (geocoding):** xəritədə axtarış qutusu — OSM **Nominatim** (Azərbaycanla məhdud,
  ≤1 sorğu/san siyasətinə uyğun submit-də axtarır), nəticəyə `flyTo`.
- **İki tarix müqayisə (swipe):** eyni indeksin iki səhnə tarixinin rasterlərini sürüşən
  bölücü ilə tutuşdurma — sinxronlaşdırılmış iki MapLibre xəritəsi, sağ xəritə clip olunur
  (`CompareMap`). Tarix seçiciləri İcmal-da. FarmerApp §3.1.7 paritesi.
- **Bulud filtri:** səhnə timeline-ında **maks. bulud %** slider-i — buludlu tarixləri gizlədir
  (data artıq `/scenes`-də var, UI-only). FarmerApp §3.1.8.
- **Ölçmə aləti:** İcmal xəritəsində məsafə (km) + sahə (ha) ölçmə (turf), kliklə nöqtə əlavə.
- **Sahə idxal/ixrac:** sahə yaradarkən **GeoJSON/KML** fayldan poliqon yükləmə + cari poliqonun
  GeoJSON/KML ixracı (asılılıqsız — `lib/geoio.ts`).
- **Bölgə/peer NDVI benchmark:** qrafikə üçüncü xətt — eyni bitkili (yoxdursa bütün) **digər**
  sahələrin həftəlik ortası ("sənin NDVI 0.7 vs bölgə 0.6"). `SECURITY DEFINER`
  `public.index_benchmark(index, crop, exclude)` funksiyası RLS-i keçir, yalnız aqreqat qaytarır
  (fərdi sahə sətri sızmır). API `GET /fields/{id}/indices/benchmark?index=`. FarmerApp §3.1.6.

### Ops
- **nginx:** `sites-enabled/`-dəki köhnə `agradex.com.bak.*` dublikatı `/root/nginx-backups/`-ə
  köçürüldü — "conflicting server_name" xəbərdarlıqları həll olundu.
- **Migration `0010`** (`index_benchmark` funksiyası).

## [1.0.6] — 2026-07-14 — AI aqronom məsləhəti + chatbot

### Added
- **AI məsləhət (Claude):** NASA peyk indeks trendləri + məhsul metadatası + görülmüş işlər →
  **xülasə + risklər + məsləhətlər + növbəti addımlar** (Azərbaycanca, strukturlu çıxış).
  Hər yeni peyk səhnəsindən sonra **avtomatik** yenilənir (pipeline → `/api/internal/advice/run`),
  `public.advice`-də saxlanır. Məsləhət **dəyişəndə** fermerə **bildiriş** (in-app + email).
- **Sahə üzrə chatbot:** kontekst = həmin sahənin datası + son məsləhət + söhbət tarixçəsi;
  hər mesaj `public.ai_chat_messages`-də saxlanır, növbəti cavablar tarixçəyə baxır.
- Frontend **“AI Məsləhət” tab**-ı: məsləhət kartı (risk şiddət nişanları) + canlı söhbət.
- **Provider-agnostik adapter** (`app/ai/llm.py`) — default Claude (`claude-opus-4-8`), env-dən
  dəyişilir (`LLM_PROVIDER/LLM_MODEL/LLM_API_KEY`). Açar yoxdursa endpoint-lər səliqəli
  “qoşulmayıb” rejiminə düşür. Email: SMTP (opsional).
- API: `GET/POST /fields/{id}/advice(/generate)`, `GET/POST /fields/{id}/chat`,
  `GET /notifications`, `POST /notifications/read`.

## [1.0.5] — 2026-07-14 — İnfrastruktur Sprint 2 (peyk raster analizi)

### Added
- **Xəritədə peyk indeks raster overlay** (FarmerApp "Bitki sağlamlığı" paritesi): sahə İcmal
  xəritəsində seçilən indeksin piksel-səviyyəli rəngli rasteri (TiTiler + clipped HLS COG-ları),
  legend (Zəif/Orta/Yüksək), **səhnə timeline-ı** (tarix + bulud %) ilə tarix keçidi.
- **Asinxron sahə emalı + UX:** yeni sahə əlavə olunanda arxa planda NASA-dan data çəkilir;
  "Peyk məlumatı hazırlanır…" banneri **proqres + ETA** ilə (poll), hazır olanda **bildiriş**.
  `data_status` (queued→processing→ready), queue worker cron (~2 dəq), ən-yeni-əvvəl emal.
- **Saxlanan raster (hibrid):** pipeline hər səhnə/indeks üçün clipped COG-u `/data/rasters`-də
  saxlayır; günlük cron yeni səhnələri sakitcə əlavə edir (status/bildiriş sıfırlanmır).
- İndeks seçici Azərbaycanca adlarla (Bitki sağlamlığı/nəmliyi/su/yanğın…).
- API: `GET /fields/{id}/data-status`, `GET /fields/{id}/scenes?index=`; nginx `/titiler/`.



### Added
- **Basemap qalereyası + keçid** (FarmerApp "Xəritə növləri" paritesi): **Hibrid (peyk+adlar)**,
  **Peyk** (Esri World Imagery), **Sentinel-2 buludsuz** (EOX), **Küçə** (OSM), **Topo** (OpenTopoMap).
  Seçim `localStorage`-da yadda qalır; default Hibrid. Həm çəkmə, həm göstərmə xəritəsində.
  Yeni `lib/basemaps.ts`; `FieldMap.tsx` refaktoru (native-draw qorunub).
- **Koordinat oxunuşu** (canlı lon/lat) + basemap attribution paneli (aşağı-sağ).
- **Geolokasiya** düyməsi (çəkmə xəritəsi) + naviqasiya kontrolları.
- Sahə sərhədi indi **sarı** (peyk üzərində daha aydın görünür).

## [1.0.3] — 2026-07-14

### Fixed
- **NDVI/indeks qrafiki heç vaxt görünmürdü (əsl səbəb):** İcmal paneli `/api/fields/{id}/indices`
  cavabından `data.points` + hər nöqtədə `value` sahəsi gözləyirdi, backend isə `data.series` +
  `{date, mean, p10, p50, p90}` qaytarır. Uyğunsuzluq üzündən data (DB-də 1000+ sətir) olsa belə
  qrafik həmişə boş idi. Frontend backend formatına uyğunlaşdırıldı: `series` oxunur, `mean` çəkilir,
  p10–p90 sahə-daxili dəyişkənlik zolağı əlavə edildi (OverviewTab.tsx, types.ts `IndexPoint`).
- **Yeni sahədə "data yoxdur" mesajı:** daha aydın — ilkin peyk analizinin avtomatik işə düşdüyü və
  1 gün ərzində görünəcəyi bildirilir.

### Added
- **Metadata formu tam dropdown:** Bitki növü, Sort (bitkidən asılı), Torpaq növü, Suvarma üsulu,
  Əvvəlki bitki, İnkişaf mərhələsi, Şum üsulu artıq 1-kliklə seçim (`<select>`) — hər biri "Digər"
  ilə sərbəst mətn ehtiyatı saxlayır (mövcud dəyərlər qorunur). Massiv alt-formlarında da dropdown:
  çətinlik növü, növbəli əkin bitkisi, gübrə məhsulu, zərərverici növü, şiddət (1–3). Bütün
  siyahılar Azərbaycanca, canonical dəyərlər subsidiya/seed lüğəti ilə uyğun (`lib/metadataOptions.ts`).

### Ops
- HLS boru xətti istifadəçinin yeni "test lecet" sahəsi üçün əl ilə işə salındı (0 → indeks sətirləri).

## [1.0.2] — 2026-07-01

### Fixed
- **Xəritə + sahə çəkmə işləmirdi (boş xəritə):** `@mapbox/mapbox-gl-draw` bu MapLibre versiyası ilə
  uyğun deyildi — `addLayer` init zamanı xəta atıb bütün xəritənin render olmasını pozurdu (təkcə
  çəkməni yox). Onu **çıxardıq** və MapLibre-native kliklə-çək yazdıq (FieldMap.tsx): xəritəyə
  klikləyib təpələr əlavə edilir, ≥3 təpədə poliqon qapanır, canlı sahə (ha), "Geri"/"Təmizlə".
  Nəticədə həm xəritə render olur (OSM plitkaları), həm çəkmə işləyir. Chrome-da canlı təsdiqləndi.

## [1.0.1] — 2026-07-01

### Added
- **HLS peyk boru xətti CANLI (real data):** Earthdata **bearer token** (EARTHDATA_TOKEN) ilə
  GDAL `/vsicurl` COG oxumaları autentifikasiya olunur; geo worker Docker image (Dockerfile.geo,
  libexpat1/libgomp1). Demo Zaqatala fındıq sahəsi üçün 17 səhnə / 153 index_stats, NDVI ~0.73.
  `deploy/run-hls.sh` (cron üçün) + compose `geo` profili.
- **SSL:** origin-də Let's Encrypt sertifikatı (avto-yenilənmə); nginx :80 (loop-safe) + :443.

### Fixed
- Deploy repo private olduğundan cloud-init `git clone` alınmırdı → rsync + bootstrap ilə deploy.
- Cloudflare Flexible + certbot redirect loop → nginx :80 no-redirect + :443.

### Pending
- Cloudflare SSL mode Flexible → Full (Strict) (CF paneli yüklənmirdi); repo public (istifadəçi).

## [1.0.0] — 2026-07-01 — Faza 1 (canlı: https://agradex.com)

İlk istehsalat buraxılışı. Peyk + hava + AI əsaslı əkin monitorinqi platformasının təməli.

### Added
- **DB (Postgres 16 + PostGIS):** tam multi-tenant sxem (§7/§8) — organizations/members/invites,
  farms, fields (+metadata), scenes/index_stats/index_rasters, weather_cache, scouting, tasks,
  field_operations, yields, reports, advice, ai_chat, notifications, org_subscriptions, crop_thresholds.
  Öz `public.users` auth cədvəli (Supabase əvəzinə) + RLS (`current_user_id()` session GUC).
- **Subsidiya kalkulyatoru (§30, FR-21):** 2026 cədvəli — 117 dərəcə + modifikatorlar + rayonlar seed;
  match + modifier mühərriki (14 test keçir); `/api/subsidy/{options,calculate,save,history,rates}`.
- **Backend (FastAPI):** JWT auth + server-tərəfli gating; orgs/farms/fields/metadata/scouting/
  tasks/operations/yields/uploads API; sağlamlıq + daxili tetikləyicilər.
- **HLS boru xətti (§10):** search→windowed COG→Fmask→zonal stats→PostGIS (9 indeks) + FREE indeks
  endpoint-ləri (runtime Earthdata `.netrc` tələb edir).
- **Frontend (Next.js 15, AZ):** auth, onboarding, MapLibre sahə çəkmə, metadata formu,
  skautinq/tapşırıq/əməliyyat/məhsuldarlıq, subsidiya kalkulyatoru, komanda/dəvətlər.
- **Deploy:** Hetzner (Docker Compose: db+api+web) + nginx + Cloudflare (proxied, Flexible TLS).

### Deferred (Faza 2+)
- Hava (Open-Meteo) + modellər, qayda mühərriki → bildirişlər, AI məsləhət/chat, hesabatlar (PDF/Excel),
  TiTiler plitkaları, baza/anomaliya/fenologiya, billing (Stripe/PSP).

[1.0.0]: https://github.com/shahbazseyidli/bagbanai/releases/tag/v1.0.0
