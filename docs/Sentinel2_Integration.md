# Sentinel-2 10m inteqrasiyası — status və davam sənədi

> **Branch:** `feat/sentinel2-sensor` (GitHub-a push olunub, **DEPLOY OLUNMAYIB**). Davam etmək üçün:
> `git checkout feat/sentinel2-sensor`. `main` = canlı produksiya (S2-siz). Bu sənəd + `docs/` oxu.

## Niyə
NASA HLS **30m**-dir; 1 ha sahədə ~11 piksel (maskadan sonra <8) → daxili detal itir, ortalama etibarsız.
Azercosmos FarmerApp **Sentinel-2 10m** ilə iti nəticə verir (1 ha = ~100 piksel). Həll: **S2 10m-i
yeni sensor kimi HLS-in yanına əlavə et** (HLS qalır — sıx zaman seriyası; S2 — iti xəritə/analiz).
PoC (`docs/`-də deyil, Artifact ilə göstərildi) təsdiqlədi: S2 10m = 171 piksel vs HLS 27; daxili
diapazon 0.60–0.87 vs HLS 0.76–0.87.

## Memarlıq (dəyişməyən): MapLibre + TiTiler + öz Python pipeline. ArcGIS YOX.
- **Mənbə:** Element84 Earth Search STAC (`sentinel-2-l2a`, açarsız AWS COG).
- **DB sensor kodları:** HLS = `S30`/`L30` (dəyişmir), Sentinel-2 = `S2`.
- **Reflektans:** `DN * 0.0001`, **offset = 0** — canlı validasiya: Element84 metadata `-0.1` elan edir,
  amma tətbiq etmək NDVI-ni sındırır (>1); data artıq harmonizasiyalıdır. `read_s2_band` elan olunan
  offset-i loglayır amma tətbiq etmir; NDVI plausibility guard var.
- **Bulud maskası:** SCL bandı (Fmask əvəzinə), sinif `{0,1,3,8,9,10,11}` atılır. SCL **məcburidir**
  (S2-nin yeganə maskası) — oxunmasa səhnə skip olunur.
- **TVI S2-də XARİC** — hesablanmış TVI ~0–30 magnitude, rescale (-0.1..0.9)-a sığmır. S2 = 8 indeks.
- **MGRS tile non-null HARD invariant** (`grid:code`-dan) — yoxsa gündəlik run dublikat scene yaradır.

## Fayllar (feat branch-da, 3 commit)
- `db/migrations/0013_sensor_denormalize.sql` — `index_stats`/`index_rasters`-ə `sensor` sütunu +
  backfill + `index_benchmark()` HLS-only.
- `services/geo_pipeline/search_s2.py` (YENİ) — Element84 axtarışı.
- `services/geo_pipeline/{search,indices,read,persist,pipeline}.py` — S2 read/compute/persist +
  `run_field_all` (HLS sonra S2, tək lifecycle; **S2 heç vaxt field-i sındırmır** — HLS status-authoritative).
- `services/app/routers/indices.py` — 4 endpoint `?sensor=` (default s2) + empty fallback; series
  hər iki sensoru tagged qaytarır (merged chart); naməlum sensor → 422.
- `services/app/ai/context.py` — AI trendləri sahənin **ən təzə** sensoruna scope (HLS bitəndə S2-yə keçir).
- `deploy/process-queue.sh` (sensor=all + SENSOR kill-switch), `deploy/run-s2.sh` (YENİ, backfill+gündəlik).
- `app/src/lib/sensors.ts` (YENİ), `app/src/lib/types.ts`, `app/src/components/field/OverviewTab.tsx`
  (sensor toggle S2-default, iki-sensor merged chart, kiçik-sahə banner, fallback note).
- Gate: `tsc --noEmit` + `py_compile` **təmiz**.

## ⚠️ DEPLOY-dan ƏVVƏL düzəldiləcək — adversarial review 7 təsdiqli tapıntı
**MEDIUM:**
1. **`pipeline.py` process_granule_s2 oxumaları guard olunmayıb** — bir granule oxuma xətası bütün S2
   pass-ını dayandırır (HLS hər oxumanı guard edir). Fix: `read_s2_band` çağırışlarını (nir + canon
   döngüsü) və/və ya `run_field_s2` döngüsündə `process_granule_s2(...)` çağırışını try/except-ə al.
2. **Deploy-sırası yarışı** (`process-queue.sh`) — yeni `persist.py` `sensor` sütununu INSERT edir,
   miqrasiya 0013-dən ƏVVƏL git-pull olunanda "column sensor yoxdur" → field `failed`-də ilişir. Fix:
   **0013-ü update.sh-dan əvvəl (backward-compatible) tətbiq et**, ya da git-pull+migrate-i queue
   lock (flock) altında saxla. Deploy ardıcıllığında məcburi.

**LOW:**
3+7. `run_field_all` progress/ETA yeniləmir → yeni-sahə "hazırlanır" banneri donur. Fix: birləşmiş total
   (HLS+S2 granule) + shared progress callback.
4. **OverviewTab kiçik-sahə HLS xəbərdarlığı 0.15–0.5 ha aralığında əlçatmazdır** (smallField gate 0.15
   olduğu üçün). Fix: `showBanner = smallField || (sensor==="HLS" && smallForHls)`.
5. **Compare rejimi <2 səhnədə çıxılmaz olur** (sensor/indeks dəyişəndə). Fix: `visibleScenes.length<2`
   olanda `setCompare(false)`.
6. **"Sahədaxili min–maks" legend swatch band olmayanda da göstərilir** (S2-only sahələr). Fix: `hasHls`
   ilə gate et.

## Deploy ardıcıllığı (təsdiq + dəqiq sıra — main push = deploy)
1. 7 tapıntını düzəlt → review workflow təkrar (və ya spot-check) → `tsc`+`py_compile`.
2. Merge `feat/sentinel2-sensor` → `main`, push.
3. Serverdə: **miqrasiya 0013-ü ƏVVƏL tətbiq et** (queue lock altında), sonra `bash deploy/update.sh`
   (api/web/titiler rebuild — geo image dəyişmir, kod read-only mount olunur).
4. **pystac-client canlı geo image-də təsdiqlə:** `docker compose ... --profile geo run --rm geo
   python -c "import pystac_client"`. Xəta olsa `docker compose build geo`.
5. **S2 backfill:** `bash deploy/run-s2.sh 60` (mövcud sahələr üçün — default-S2 xəritə boş qalmasın).
6. **S2 cron əlavə et:** `30 3 * * * cd /opt/bagbanai && bash deploy/run-s2.sh 30 >> /var/log/bagban-s2.log 2>&1`.
7. Brauzerdə yoxla: reference sahədə (fındıq bağım) S2 10m rasteri + sensor toggle + merged chart.

## Canlı test (əvvəlki) — server geo konteynerində
PoC skriptləri: `/opt/bagbanai/deploy/data/rasters/poc/{s2_ndvi_poc,s2_validate9}.py` (produksiyaya
toxunmayan validation; DB-yə yazmır). Reference sahə fındıq bağım `4a5012b3-2baa-4714-b1d2-1ddc2454dd82`.
