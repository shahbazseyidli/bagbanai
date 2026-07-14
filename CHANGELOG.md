# Changelog

Bütün əhəmiyyətli dəyişikliklər burada qeyd olunur. Format [Keep a Changelog](https://keepachangelog.com/),
versiyalar [SemVer](https://semver.org/).

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
