# Texniki İmplementasiya Planı — GAP funksiyaları (17)

> Mənbələr: `docs/GAP_Analizi_Catismayan_Funksionalliqlar.md` (nə çatışmır), rəqib araşdırması, texniki API/kitabxana araşdırması (iyul 2026, sitatlar hər bölmədə) və kod bazasının cari inteqrasiya nöqtələri (v1.0.7, miqrasiyalar 0001–0011).
> Konvensiyalar: kod/SQL İngiliscə, UI mətnləri Azərbaycanca (`lib/i18n.ts`). Yeni miqrasiyalar 0012-dən başlayır. Effort: S (<1 həftə), M (1–2 həftə), L (2–4 həftə).

## Kod bazasının hazır giriş nöqtələri (xülasə)

- `POST /api/internal/weather/run` və `/api/internal/rules/run` **artıq stub kimi mövcuddur** (501 qaytarır) — weather/rules üçün green-field.
- `weather_cache` cədvəli (0004) hazırdır: `field_id, forecast_date, t_min, t_max, precip_mm, precip_prob, et0_mm, soil_moisture jsonb, soil_temp jsonb, wind_max, rh_mean, raw jsonb` — yazıcısı yoxdur.
- `reports` cədvəli (0005) hazırdır (type, format, storage_path) — router/generator/UI yoxdur.
- `crop_thresholds` (0006) qayda mühərriki üçün nəzərdə tutulub — mühərrik kodu yoxdur.
- `org_subscriptions` + `require_paid` (402) hazırdır — PSP kodu yoxdur.
- Bildiriş backend-i tam (`/api/notifications`), **frontend UI yoxdur** (zəng ikonu yox).
- `ai/llm.py`: `complete_structured`, `complete_text`, `is_configured` — vision funksiyası yoxdur.
- Geo pipeline COG-ları `/data/rasters/<field_id>/<scene_id>_<INDEX>.tif`-də saxlayır — VRA üçün xammal artıq diskdədir.

---

# 0. Kəsişən infrastruktur: Qayda mühərriki + çox-kanallı bildiriş dispetçeri

Bir çox funksiya (hava xəbərdarlıqları, anomaliya, fenologiya) eyni axına tökülür: **hadisə → qayda yoxlaması → notification → kanallara çatdırılma**. Əvvəlcə bu özül qurulmalıdır.

**Memarlıq:**
```
services/app/rules/
├─ engine.py      # evaluate_field(conn, field_id) -> list[Alert]
├─ registry.py    # qayda tərifləri: frost, spray_window, ndvi_drop, gdd_stage, ...
└─ dispatch.py    # Alert -> notifications INSERT + kanal fan-out (inapp, email, telegram, webpush)
```

- Hər qayda: `Rule(code, source, severity_fn, condition_fn, message_builder, dedup_window)`. Dedup: eyni `field_id+type` üçün `dedup_window` (məs. 24h) ərzində təkrar bildiriş yazılmır (`notifications`-da mövcudluq yoxlaması).
- `dispatch.py` mövcud `notifications` INSERT nümunəsini (`ai/advice.py::_notify`) ümumiləşdirir: `delivered_channels` massivinə real çatdırılan kanallar yazılır.
- `POST /api/internal/rules/run?field_id=` stub-u implementasiya olunur: weather refresh-dən sonra cron çağırır.
- `notification_preferences` (0006-da var) UI-a çıxarılır: kanal/tip üzrə on-off.

**Miqrasiya 0012:** `notifications`-a `rule_code text`, `dedup_key text` + index; `user_channels(user_id, channel, address, meta jsonb, verified_at)` cədvəli (telegram chat_id, webpush subscription burada).

**Effort:** M. **Asılılıq:** heç nə — ilk sprint bundan başlasın.

---

# P0-1. Hava proqnozu + aqro-modellər (GDD, frost, çiləmə pəncərəsi)

## Data mənbəyi — Open-Meteo (pulsuz, açarsız)

- Forecast: `https://api.open-meteo.com/v1/forecast` — `&forecast_days=16`-a qədər. Arxiv: `https://archive-api.open-meteo.com/v1/archive` (ERA5, ~5 gün gecikmə).
- **ET0 hazır gəlir:** `et0_fao_evapotranspiration` həm saatlıq, həm günlük — FAO-56 Penman-Monteith Open-Meteo tərəfindən hesablanır. Özümüz hesablamırıq.
- Saatlıq dəyişənlər: `temperature_2m, relative_humidity_2m, dew_point_2m, precipitation, wind_speed_10m, wind_gusts_10m, shortwave_radiation, et0_fao_evapotranspiration, vapour_pressure_deficit, cloud_cover, soil_temperature_0cm.., soil_moisture_0_to_1cm..`
- Günlük: `temperature_2m_max/min, precipitation_sum, et0_fao_evapotranspiration, shortwave_radiation_sum` (+ hazır `growing_degree_days_base_0_limit_50`). `daily` üçün `&timezone=auto` vacibdir.
- Limitlər (pulsuz): 10k/gün, 300k/ay (soft). Çox-sahə batch: `latitude=40.4,41.1&longitude=49.0,48.5` vergüllə. Qeyri-kommersiya + CC-BY attribution; kommersiya keçidində `customer-api.open-meteo.com` + apikey (Standard 1M/ay).
- Mənbələr: open-meteo.com/en/docs, /en/pricing, openmeteo.substack.com (ET0).

## Backend

```
services/app/weather/
├─ fetch.py    # fetch_forecast(lat, lon) -> daily+hourly; batch variantı
├─ store.py    # upsert weather_cache (mövcud sxem kifayətdir; hourly -> raw jsonb)
└─ models.py   # gdd_accumulate, frost_risk, spray_windows, wet_bulb (Stull 2011)
```

- `/api/internal/weather/run` implementasiyası: bütün aktiv sahələr üçün centroid (`ST_Centroid(geom)`) → batch fetch → `weather_cache` upsert → `rules/run` trigger.
- Public endpoint: `GET /api/fields/{id}/weather` → 16 günlük daily + bugünkü hourly + hesablanmış göstəricilər (GDD toplamı, frost riski, növbəti çiləmə pəncərələri).

## Aqro-modellər (formullar)

- **GDD:** `max(0, (Tmax_capped + Tmin_clamped)/2 − Tbase)`; Tmax cap 30°C. Tbase cədvəli `crop_parameters`-də: buğda 0°C, pambıq 15.6°C, meyvə bağı/fındıq 10°C (fındıq üçün dəqiq dərəcə ədəbiyyatda razılaşdırılmayıb — 10°C default, konfiq edilə bilən). Akkumulyasiya başlanğıcı: istifadəçi təyin edir və ya crop üzrə default DOY.
- **Frost:** iki qayda — (a) advektiv: forecast `t_min ≤ 0°C`; (b) radiativ: `t_min ≤ 3°C AND dew_point ≤ 0°C` (+aydın səma, sakit külək şiddəti artırır). Severity: 3°C→info, 1°C→warning, ≤0→critical. Mənbə: FAO y7223e, 2024 frost-probability tədqiqatı.
- **Çiləmə pəncərəsi:** saatlıq skan — külək 3–15 km/s (sakit də olmaz — inversiya), yağış sonrakı 6 saatda yox, temp 10–25°C, **Delta-T 2–8** (dry-bulb − wet-bulb; wet-bulb Stull-2011 approksimasiyası ilə `temperature_2m`+`relative_humidity_2m`-dən). Nəticə: növbəti 48 saatda yaşıl/sarı/qırmızı pəncərə siyahısı.
- **Xəstəlik riski (fındıq):** kəmiyyət EFB modeli yoxdur — fenoloji qayda: GDD-proqnozlu tumurcuq açılışı → sürgün uzanması dövründə yaş hava saatları (leaf-wetness proxy: yağış + RH>90%) → "fungisid pəncərəsi" xəbərdarlığı. Mənbə: OSU EC-1499.

## Frontend

- Overview-da hava kartı (16 gün mini-proqnoz + frost/spray nişanları) + `WeatherTab` (saatlıq qrafik Recharts, GDD akkumulyasiya xətti, çiləmə pəncərə cədvəli).
- i18n açarları `lib/i18n.ts`-ə.

## Deploy / Miqrasiya

- Cron: `0 */6 * * *` weather refresh (`deploy/run-weather.sh` → internal endpoint curl). Frost üçün axşam runu kritikdir.
- **Miqrasiya 0013:** `crop_parameters(crop text pk, gdd_base numeric, gdd_cap numeric, kc_ini, kc_mid, kc_end, stage_gdd jsonb)` + seed (fındıq, buğda, pambıq, üzüm...); `field_gdd(field_id, season_start date, accumulated numeric, updated_at)`.

**Effort:** M–L (modellər daxil). **Asılılıq:** §0 dispetçer.

---

# P0-2. Telegram bildiriş kanalı

## Niyə Telegram (WhatsApp yox)

- Telegram Bot API **tam pulsuzdur**, template təsdiqi yoxdur; Azərbaycanda penetrasiya yüksəkdir. WhatsApp Cloud API 2025-07-dən per-message ödənişlidir, template təsdiqi tələb edir, 2026-10-dan utility mesajlar da ödənişli olur — Faza 3-ə saxla. Mənbələr: core.telegram.org/bots/faq, developers.facebook.com WhatsApp pricing.

## Axın

1. **Bot:** @BotFather-də yaradılır → `TELEGRAM_BOT_TOKEN` `.env`-ə.
2. **Hesab bağlama (deep link):** `GET /api/integrations/telegram/link` → bir-dəfəlik token yaradır (`user_channels.meta`-da pending) → istifadəçiyə `https://t.me/<bot>?start=<TOKEN>` URL/QR. İstifadəçi bota keçir, bot `/start TOKEN` update-i alır → webhook `chat_id`-ni tokenlə eşləşdirir → `user_channels(user_id,'telegram',chat_id)`.
3. **Webhook:** `POST /api/integrations/telegram/webhook` — `setWebhook` ilə qurulur, `X-Telegram-Bot-Api-Secret-Token` header yoxlanır (nginx arxasında mövcud `/api` axını ilə işləyir, əlavə proses yoxdur).
4. **Göndərmə:** `notify.py`-a `async send_telegram(chat_id, html) -> bool` — raw httpx `POST api.telegram.org/bot<t>/sendMessage`, `parse_mode: "HTML"` (MarkdownV2 escape cəhənnəmindən qaç). Kitabxana lazım deyil; bot böyüsə aiogram 3.x.
5. **Limitlər:** ~30 msg/san bulk; 429 `retry_after`-a hörmət et (sadə sleep-retry).

## İnteqrasiya

- §0 `dispatch.py` kanal siyahısına `telegram` əlavə olunur; `ai/advice.py::_notify` və `insert_ready_notification` dispetçerə köçürülür.
- Frontend: Settings-də "Telegram-a qoşul" düyməsi + qoşulma statusu; Nav-da bildiriş zəngi (mövcud `/api/notifications` endpoint-lərini istifadə edən dropdown) — **bu, ayrıca kiçik işdir və Telegram-dan asılı deyil, dərhal edilə bilər.**

**Miqrasiya:** 0012-dəki `user_channels` kifayətdir. **Effort:** S–M.

---

# P0-3. Avtomatik sahə sərhədi aşkarlama

## Yanaşma: iki mərhələ

**v1 — klik-lə seqmentasiya (SAM2-tiny, CPU):**
- `segment-geospatial (samgeo)` + `sam2.1_hiera_tiny` (39M param, ~156MB checkpoint) — `predict_by_points()` tək klik nöqtəsindən maska qaytarır. CPU-da işlək resept: **görüntü embedding-i bir dəfə encode olunur (~1s), hər klik yalnız yüngül mask decoder işlədir (millisaniyələr)** — Geo-SAM pattern-i. 4 vCPU üçün realistikdir. Mənbələr: samgeo.gishub.org/examples/sam2_point_prompts, github.com/coolzhao/Geo-SAM.
- Axın: istifadəçi xəritədə sahəsinə klik edir → `POST /api/fields/detect-boundary {lon, lat, zoom}` → backend Esri World Imagery tile-larını server-side mozaikləyir (bbox ~1–2 km) → SAM2 encode (nəticə keşlənir bbox üzrə) → klik nöqtəsi ilə decode → maska → `rasterio.features.shapes` + `shapely.simplify` → GeoJSON polygon qaytarılır → DrawMap-də redaktə edilə bilən şəkildə göstərilir ("Qəbul et / Düzəlt").
- Yerləşdirmə: `geo` konteynerinə (torch CPU + samgeo əlavəsi) və ya ayrıca `segment` servisi (compose profile). API `/api/internal/segment` üzərindən proxy — LLM açarı pattern-inin eynisi.
- Qeyd: SAM vizual obyekt seqmentləyir, aqronomik parsel yox — qonşu eyni-bitki sahələri bəzən birləşdirir; redaktə addımı buna görə məcburidir.

**v2 — "bütün sahələri tap" (batch, Fields of The World):**
- FTW açıq U-Net modelləri (CC-BY checkpoints), CLI: `ftw inference download → inference → polygonize` — Sentinel-2-dən parsel poliqonları. CPU-da işləyir, amma tile başına ağırdır — istəyə görə rayon-səviyyəli batch. Mənbə: fieldsofthe.world, github.com/fieldsoftheworld/ftw-baselines.
- Kommersiya alternativi: DigiFarm API (~€0.03/ha/il, 1m dəqiqlik) — lazım olsa premium tier üçün.

**Tamamlayıcı:** EKTIS/kadastr layı mövcuddursa import (Faza 3/4 EKTIS bəndi ilə birgə) — GeoJSON/KML import (1.0.7) artıq var, kadastr formatı əlavə olunar.

**Effort:** M (v1), L (v2). **Asılılıq:** yox.

---

# P0-4. Time-to-first-NDVI < 5 dəqiqə

Ən ucuz P0 — pipeline artıq ən-yeni-səhnə-əvvəl işləyir, dəyişiklik UX-dədir:

1. **Backend:** `run_field()`-də ilk uğurlu səhnə+raster yazılan kimi `data_status='partial'` (yeni enum dəyəri) + `first_scene_at` set olunsun; qalan tarixçə arxada davam etsin. Bitəndə mövcud `ready` axını.
2. **Frontend:** `OverviewTab` `data_status in ('partial','ready')` olduqda xəritə+raster+timeline göstərsin; `partial`-da yuxarıda incə "Tarixçə yüklənir… (12/40)" chip-i (mövcud proqres polling-i qalır, tam-ekran banner yalnız `queued/processing` üçün).
3. **Bildiriş:** "İlk peyk görüntünüz hazırdır" bildirişi `partial`-a keçəndə göndərilsin (indiki "data hazır" bildirişi `ready`-də qalır, dedup ilə).
4. **Queue prioriteti:** `process-queue.sh`-də yeni sahələr `days_back=14, track=1` ilk pass (1–2 səhnə → partial çox sürətli), ardınca `days_back=60` ikinci pass — iki-mərhələli emal.

**Miqrasiya 0014:** `fields.data_status` check constraint-ə `'partial'` əlavə; `fields.first_scene_at timestamptz`. **Effort:** S.

---

# P1-5. Foto ilə xəstəlik/zərərverici diaqnozu (Claude vision)

- **llm.py genişlənməsi:** `complete_vision(system, user, images: list[bytes|url], schema)` — Anthropic messages API image content block (base64) + mövcud `messages.parse` strukturlu çıxış. Provayder-agnostik interfeys saxlanır.
- **Yeni modul `ai/diagnose.py`:** giriş = foto(lar) + sahə konteksti (`build_field_context` subset: crop, growth_stage, son hava, region) → çıxış sxemi: `{identification: {name_az, name_latin, type: xəstəlik|zərərverici|çatışmazlıq|sağlam, confidence: aşağı|orta|yüksək}, severity, symptoms_matched[], treatment[], prevention[], disclaimer}`.
- **Endpoint:** `POST /api/fields/{id}/diagnose` (multipart, mövcud `uploads` router pattern-i; şəkil `/data/uploads`-a). Nəticə `scouting_observations`-a bağlanır (`observation_type='diagnosis'`, foto path + nəticə jsonb) — ayrıca cədvəl lazım deyil, 0005 sxemi jsonb daşıyır (yoxdursa **miqrasiya 0015:** `scouting_observations.diagnosis jsonb`).
- **Frontend:** ScoutingTab-da "Foto ilə diaqnoz" düyməsi → kamera/qalereya → nəticə kartı (Plantix-style). AiTab chat-ında da şəkil göndərmə.
- **Gating:** `is_configured()` + mövcud `ai_usage` cədvəli (0011) ilə istifadə limiti (pulsuz tier: N diaqnoz/ay).
- **Effort:** M. **Asılılıq:** LLM_API_KEY aktivləşməsi.

---

# P1-6. PDF hesabatlar

- **Texnologiya:** WeasyPrint (HTML+CSS → PDF, api konteynerinə pip; sistem deps: pango) + Jinja2 template. Qrafiklər: matplotlib-siz — index seriyalarından inline SVG sparkline-lar Jinja-da render olunur (yüngül, deps yox); xəritə snapshot-ı üçün TiTiler `preview` endpoint-i PNG verir.
- **Hesabat tipləri (mövcud `reports.type` enum-una uyğun):** `field_season` (sahə mövsüm hesabatı: indeks trendləri, əməliyyatlar, skautinq, AI məsləhət xülasəsi), `scouting`, `farm_summary` (+ gələcəkdə `subsidy` — kalkulyator nəticəsi rəsmi sənəd formatında).
- **Axın:** `POST /api/reports {type, field_id|farm_id, period}` → sinxron generasiya (<5s hədəf; uzunlarsa BackgroundTasks) → `/data/reports/<org_id>/<uuid>.pdf` → `reports` sətri → `GET /api/reports/{id}/download` (FileResponse, org gating).
- **Frontend:** sahə səhifəsində "Hesabat yüklə" + Reports siyahısı.
- **Miqrasiya:** lazım deyil (0005 hazır). **Effort:** M.

---

# P1-7. Fenologiya + anomaliya aşkarlama

- **Fenologiya (GDD-əsaslı):** `crop_parameters.stage_gdd` (məs. fındıq: tumurcuq 150, çiçək 300, ...GDD) → cari akkumulyasiya → mərhələ + AZ adı. `field_metadata.growth_stage` avtomatik yenilənir (istifadəçi override edə bilər). AI kontekstinə mərhələ daxil edilir (advice keyfiyyəti artır).
- **Anomaliya v1 (öz tarixçəsinə qarşı):** hər yeni səhnədə `index_stats`-dan NDVI-nin son 4 müşahidə meyli + 90 gün pəncərəsi → kəskin düşmə (məs. mean-in >0.08 düşməsi 2 ardıcıl səhnədə, bulud-təmiz) → `ndvi_drop` qaydası (§0) → bildiriş.
- **Anomaliya v2 (çoxillik baza):** HLS arxivi 2015-dən — sahə yaradılanda bir dəfəlik backfill job (`days_back=~2000`, yalnız stats, raster yazmadan `write_rasters=False`) → `field_baselines(field_id, doy_window, ndvi_median, ndvi_p10, ndvi_p90)` (**miqrasiya 0016**) → cari dəyər p10-dan aşağıdırsa anomaliya. Rayon-səviyyəli müqayisə üçün mövcud `index_benchmark()` (0010) istifadə olunur.
- **Effort:** M (v1 S, v2 ayrıca M). **Asılılıq:** P0-1 (GDD).

---

# P1-8. VRA / idarəetmə zonaları

- **Alqoritm (standart pipeline):** son N buludsuz NDVI COG-u stack et (diskdə hazırdır: `/data/rasters/<field_id>/`) → normalizasiya → **k-means (scikit-learn) 3–5 zona** → majority filter (scipy) ilə hamarlaşdırma → `rasterio.features.shapes` → poliqonlar. Mənbə: MDPI Sensors 2022 (PMC8779988).
- **Modul:** `services/geo_pipeline/zones.py`; endpoint `POST /api/fields/{id}/zones {n_zones, date_from, date_to}` → GeoJSON (zona id, sahə ha, orta NDVI) + `zones` cədvəli (**miqrasiya 0017:** `management_zones(field_id, params jsonb, geojson jsonb, created_at)`).
- **Norma təyini:** frontend-də zona başına istifadəçi rate daxil edir (toxum/gübrə) → export **Shapefile (zip, geopandas)** — texnika universal qəbul edir; ISO-XML (ISOBUS) Python-da zəif dəstəklənir → v2-yə saxla, build-effort kimi işarələ.
- **Frontend:** OverviewTab-da "Zonalar" rejimi (fill-layer + legend), rate cədvəli, "Shapefile yüklə".
- **Gating:** PAID funksiya (`require_paid`) — rəqiblərdə klassik premium.
- **Effort:** M.

---

# P1-9. Məhsuldarlıq proqnozu (data-first yanaşma)

Ədəbiyyat: peak NDVI + mövsüm inteqralı ilə RF modelləri R²≈0.83–0.88 (Agronomy 2025); amma per-field model üçün ≥3–5 mövsüm ground truth lazımdır — **indi model qurmaq yox, feature yığımını başlatmaq düzgün addımdır:**

1. **Miqrasiya 0018:** `field_season_features(field_id, season int, crop, ndvi_peak, ndvi_integral, gdd_total, precip_total, scene_count, computed_at)` — mövsüm sonunda cron materializasiyası (`index_stats` + `weather_cache`-dən).
2. `yields` qeydləri ilə join hazır saxlanır; ≥3 mövsüm və ya ≥30 sahə-mövsüm yığılanda pooled RF (scikit-learn) — ayrıca sprint.
3. **Frontend (indi):** "Proqnoz üçün data yığılır (1/3 mövsüm)" dürüst kartı + mövcud mövsümün peak/inteqral müqayisəsi (keçən mövsümlə) — proqnozsuz da dəyərlidir.

**Effort:** S (yığım) + gələcək M (model). **Asılılıq:** P0-1 (GDD/precip features).

---

# P1-10. Billing — Payriff inteqrasiyası + tier tərifi

## PSP seçimi (araşdırma nəticəsi)

- **Stripe Azərbaycanda YOXDUR** (stripe.com/global — 46 ölkə siyahısında yox). Atlas (ABŞ şirkəti) — hazırkı mərhələ üçün ağırdır.
- **Payriff — tövsiyə:** REST JSON, `Authorization: <SECRET_KEY>`, base `https://api.payriff.com/api/v3/`. Yoxlanmış endpoint-lər: `POST /v3/orders` (hosted ödəniş səhifəsi, `cardSave: true`, `callbackUrl`), **`POST /v3/autoPay` (saxlanmış kartdan `cardUuid` ilə çəkim — abunə yenilənməsi üçün tam uyğun)**, `GET /v3/orders/:id`, `POST /v3/refund`. AZN dəstəyi, test mode. Mənbə: docs.payriff.com. Alternativ: Epoint.az (docs qeydiyyat arxasında), birbaşa bank (ağır onboarding).

## Tier tərifi (rəqib normaları əsasında)

| | Pulsuz | Fermer (~5–8 AZN/ay) | Kooperativ (quote) |
|---|---|---|---|
| Sahə limiti | 3 sahə / 20 ha | 50 ha (üstü ha-başına) | limitsiz |
| İndeks tarixçəsi | son 30 gün | tam | tam |
| AI diaqnoz/məsləhət | 3/ay | limitsiz | limitsiz |
| VRA, hesabatlar | — | ✓ | ✓ + API |

(qiymətlər PM qərarı — regional norma $0.2–2/ha/il; cədvəl başlanğıc təklifdir)

## İmplementasiya

- **Miqrasiya 0019:** `payments(id, org_id, order_id, amount, currency, status, payriff_payload jsonb, created_at)`; `org_subscriptions`-a `plan text, current_period_end timestamptz, card_uuid text, auto_renew bool`.
- **Router `billing.py`:** `POST /api/billing/checkout {plan}` → Payriff order (cardSave) → paymentUrl redirect; `POST /api/billing/callback` (Payriff webhook: imza/status yoxla → subscription aktivləşdir, `card_uuid` saxla); `GET /api/billing/status`.
- **Yenilənmə cron-u:** gündəlik — `current_period_end` yaxınlaşan + `auto_renew` org-lar üçün `autoPay`; uğursuzsa 3 cəhd → grace 7 gün → `free`-yə düş (mövcud `org_is_paid()` avtomatik bağlayır).
- **Free tier enforcement:** sahə yaratmada ha/say yoxlaması (`deps.py`-a `check_plan_limits`).
- **Effort:** M–L. **Qeyd:** Payriff onboarding (şirtəşkilat hesabı) paralel başlasın — kod yox, inzibati kritik yol.

---

# P2-11. PWA + offline + web push

- **Manifest:** Next.js 15 native — `app/manifest.ts` (`MetadataRoute.Manifest`).
- **Service worker:** **Serwist** (`@serwist/next`, next-pwa-nın davamçısı) — `app/sw.ts`, `installSerwist({precacheEntries: self.__SW_MANIFEST})`.
- **Tile keşi:** `runtimeCaching`-də `defaultCache`-dən ƏVVƏL: basemap hostları (Esri/EOX/OSM regex) → `CacheFirst` + `ExpirationPlugin({maxEntries: 800, maxAgeSeconds: 7*86400})`; TiTiler PNG üçün qısa TTL (data dəyişir). OSM tile policy-yə diqqət.
- **Offline v1 hədəfi:** app shell + son baxılan sahələrin tile-ları + son data-nın localStorage/IndexedDB snapshot-ı (skautinq offline yazma → sync — ayrıca L iş, v2).
- **Web push:** `pywebpush` + VAPID (`notify.py`-a kanal); iOS 16.4+ yalnız home-screen-ə əlavədən sonra + user-gesture permission + VAPID `sub` mailto tələbi; 404/410-da subscription silinsin. Telegram əsas kanal olaraq qalır, push əlavədir.
- **Miqrasiya:** `user_channels` (0012) webpush subscription-ı daşıyır. **Effort:** M.

---

# P2-12. Torpaq xəritələri (SoilGrids)

- `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=&lat=&property=soc,phh2o,clay,sand,silt,nitrogen,cec` — 250m, 6 dərinlik, CC-BY. **Qeyd: REST API arabir dayandırılır** — retry + nəticəni `field_metadata`-ya birdəfəlik yaz (canlı sorğu yox); fallback WCS/GeoTIFF.
- Sahə yaradılanda centroid sorğusu → `field_metadata.soil_properties jsonb` (**miqrasiya:** column əlavəsi) → Metadata tab-da göstər + AI kontekstinə əlavə et (advice keyfiyyəti).
- **Effort:** S.

---

# P2-13. Suvarma planlaması (FAO-56 su balansı)

- `ETc = ET0 × Kc` — ET0 `weather_cache`-dən hazır, Kc `crop_parameters`-dən (0013), mərhələ fenologiyadan (P1-7).
- Su balansı: `depletion_today = depletion_yesterday + ETc − (effective_rain + irrigation)`; suvarma triggeri `depletion ≥ MAD (p × TAW)`. TAW üçün torpaq teksturası SoilGrids-dən (P2-12). Suvarma qeydi mövcud `field_operations`-dan (type=irrigation) götürülür.
- **Miqrasiya 0020:** `field_water_balance(field_id, date, etc_mm, rain_eff_mm, irrigation_mm, depletion_mm)`. Endpoint `GET /api/fields/{id}/irrigation` + qayda `irrigation_needed` (§0). NDMI/NDWI (mövcud) çarpaz yoxlama siqnalı kimi göstərilir.
- **Effort:** M. **Asılılıq:** P0-1, P1-7, P2-12.

---

# P2-14. IoT / sensor inteqrasiyası (minimal özül)

Hardware biznesi qurmuruq — yalnız qəbul özülü: **miqrasiya:** `sensor_readings(field_id, sensor_id, metric, value, unit, ts)` hypertable-vari index ilə; `POST /api/ingest/sensor` (API key auth — P2-17 özülü) və/və ya compose-a `mosquitto` (MQTT, profile `iot`) + kiçik consumer. Tərəfdaş sensor təchizatçıları (məs. yerli Filiz-analoqu) üçün açıq qapı. **Effort:** S (özül). Prioritet aşağı — tələb yaranana qədər UI qurulmur.

---

# P2-15. Ekosistem: EKTIS körpüsü + icma

- **EKTIS:** açıq/sənədləşmiş public API aşkarlanmayıb — inteqrasiya **biznes-development asılıdır** (AKİA/KTN ilə razılaşma). Texniki hazırlıq: subsidiya kalkulyatoru nəticəsinin PDF-i (P1-6) EKTIS ərizə formatına uyğunlaşdırıla bilər; kadastr layı əldə olunarsa P0-3 import-u genişlənir. Kod işi razılaşmadan sonra.
- **İcma v1 (ucuz):** org-daxili mövcuddur (üzvlük); cross-org icma əvəzinə **Telegram kanal/qrupu** (P0-2 botu ilə eyni infrastruktur) — platforma daxilində forum qurmaq (L effort) tələb sübutu olmadan tövsiyə edilmir.
- **Effort:** S (hazırlıq) / bloklanmış (EKTIS).

---

# P2-16. Yüksək rezolyusiya: Sentinel-2 10m (+ SAR mövqeyi)

- **Sentinel-2 L2A 10m — Element84 earth-search:** `https://earth-search.aws.element84.com/v1`, kolleksiya `sentinel-2-l2a`, band-per-COG, **auth YOXDUR** (nə STAC search, nə `/vsicurl` oxuma) — mövcud pystac+rasterio axınına minimal dəyişikliklə oturur (HLS-in Earthdata bearer mürəkkəbliyi olmadan). CDSE STAC alternativdir amma S3 credential + 30 günlük kvota tələb edir — fallback kimi saxla.
- **İmplementasiya:** `geo_pipeline`-a ikinci mənbə: `search.py`-a earth-search provider, band mapping (B04/B08/B11/B02...) → eyni 9 indeks, SCL bulud maskası (Fmask əvəzi) → `scenes.collection='S2_L2A'` → 10m COG-lar. Kiçik sahələr üçün (bizim 1.36 ha demo = HLS-də ~15 piksel, S2-də ~136) böyük keyfiyyət sıçrayışı.
- **SAR (bulud-doldurma): TƏXİRƏ SAL.** GRD preprocessing zənciri (calibration/speckle/terrain) SNAP tələb edir — kiçik komanda üçün ağır. Lazım olarsa **CDSE openEO RVI** (server-side hesablanmış COG qaytarır) yeganə realistik yol. Qərar: S2 10m-dən sonra yenidən bax.
- **Effort:** M (S2), SAR bloklanmış/defer.

---

# P2-17. Açıq API

- **Miqrasiya:** `api_keys(org_id, key_hash, name, scopes text[], rate_limit, created_at, revoked_at)`.
- `deps.py`-a `get_api_org` (Bearer `agx_...` açar → hash lookup); mövcud endpoint-lərin oxu subset-i `/api/v1/` altında (fields, index series, scenes, weather) — FastAPI router-lərin təkrar include-u ilə, ayrıca OpenAPI qrupu.
- Rate limiting: nginx `limit_req` zone (api key header üzrə) — app-səviyyəli kitabxana lazım deyil.
- PAID/Kooperativ tier funksiyası. **Effort:** M.

---

# İcra ardıcıllığı (tövsiyə olunan sprint xəritəsi)

| Sprint | Məzmun | Nəticə |
|---|---|---|
| **S0 (dərhal)** | `LLM_API_KEY` aktivləşdir; bildiriş zəngi UI; P0-4 partial-status | AI canlı + ilk NDVI <5 dəq |
| **S1** | §0 qayda mühərriki + dispetçer; P0-2 Telegram | Kanal infrastrukturu |
| **S2** | P0-1 hava + GDD/frost/spray (0013) | İlk "pul dəyərli" alertlər |
| **S3** | P0-3 SAM2 klik-sərhəd (v1) | Aktivasiya sürtünməsi ↓ |
| **S4** | P1-5 foto diaqnoz; P1-7 fenologiya/anomaliya v1 | AI dəyər genişlənməsi |
| **S5** | P1-6 PDF hesabat; P1-9 feature yığımı (0018) | B2B hazırlıq |
| **S6** | P1-10 Payriff + tier enforcement (Payriff onboarding S1-dən paralel) | Monetizasiya |
| **S7** | P1-8 VRA (PAID); P2-11 PWA | Premium dəyər |
| **S8+** | P2-12 soil, P2-13 suvarma, P2-16 S2 10m, P2-17 API | Genişlənmə |

**Miqrasiya nömrələnməsi:** 0012 user_channels+notifications; 0013 crop_parameters+field_gdd; 0014 partial status; 0015 diagnosis; 0016 field_baselines; 0017 management_zones; 0018 field_season_features; 0019 payments/subscriptions; 0020 water_balance. (İcra sırasına görə tənzimlə — ardıcıllıq `db/migrate.sh` tələbidir.)

**Yeni secrets (`/opt/bagbanai/.env`):** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PAYRIFF_SECRET_KEY`, `VAPID_PRIVATE_KEY/PUBLIC_KEY` (P2-11).

**Yoxlanmamış/risk işarələri:** fındıq GDD bazası (10°C default, konfiq), SAM2 4-vCPU latency (Geo-SAM pattern-dən ekstrapolyasiya — S3-də əvvəl benchmark et), Payriff komissiyası (public deyil, ~2–3% ehtimal), SoilGrids REST stabilliyi, ISO-XML Python dəstəyi, WhatsApp Azərbaycan tarifi.
