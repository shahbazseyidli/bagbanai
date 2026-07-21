# Bağban AI — Roadmap & Task Tracker

> **Bu sənəd tək iş-izləyicisidir (single task tracker).** Bütün gələcək tasklar burada, statusla.
> LIVE: https://agradex.com. SSoT: `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29) +
> `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30). İş konteksti: `CLAUDE.md`. Nə deploy olub:
> `CHANGELOG.md`. Qayda: UI Azərbaycanca; kod/SQL/commit İngiliscə; Supabase yox (self-hosted PG16 +
> öz JWT); main-ə push = **prod deploy** (hər push-dan əvvəl istifadəçidən təsdiq).
>
> **Son yenilənmə:** 2026-07-21 — E+T siyahıları **tək backlog-a** birləşdirildi (§C). Gap-scan
> `wf_c498734d`, kod ilə yoxlanmış.

## Status kodu (hər task bitəndə bu sətri yenilə)

| İşarə | Status | Mənası |
|---|---|---|
| ⬜ | **Planlaşdırılıb** | başlanmayıb |
| 🔨 | **Develop olunub** | kod hazır, deploy OLUNMAYIB |
| 🚀 | **Proda vurulub** | canlıda, test gözləyir |
| ✅ | **Proda vurulub + test edilib** | canlı + doğrulanıb |
| ⏳ | **Bloklanıb (istifadəçi)** | istifadəçinin addımını gözləyir (açar/DNS/hesab) |
| ❌ | **Çıxarılıb** | roadmapdan silinib (+ səbəb) |

> **Necə yenilənir:** task bitəndə `Status` xanasını dəyiş (⬜→🔨→🚀→✅), commit hash + tarixi
> `Qeyd`/`Status`-a yaz. Tam çıxarılan taskı ❌ ilə saxla (silmə — səbəbi görünsün). Yeni task əlavə
> edəndə növbəti **T#** nömrəsini ver (T3 çıxarılıb — təkrar istifadə etmə).

---

## A. Bitmiş — CANLI (✅)

Faza 1 tam canlı + üstünə düşən sprintlər. Detal `CHANGELOG.md` [1.0.0]…[1.3.0].

| Sahə | Nə | Ref | Status |
|---|---|---|---|
| Platform | Multi-tenant PG16+PostGIS, öz-JWT auth, RLS + server gating, org→farm→field, invites | Faza1 | ✅ |
| Peyk | HLS 9-indeks pipeline + Sentinel-2 10m + **NDRE/CIre**, TiTiler raster overlay, async "hazırlanır" UX | **E0** | ✅ |
| Xəritə | Basemap qalereyası, hillshade, Nominatim axtarış, compare/swipe, bulud filtri, ölç, GeoJSON/KML, **fırça/lasso** | v1.3.0 | ✅ |
| Sahə UX | **Ayrı Sentinel-2 / NASA tabları** + **İcmal insight səhifəsi** + edit/sil paneli | v1.3.0 | ✅ |
| AI | LLM adapter, **məsləhət (yalnız S2)** + chat (Claude aktiv), **Bilik Qatı M1–M8** | M1–M8 | ✅ |
| Aqro-model | Saxton-Rawls pedotransfer TAW/RAW · çiləmə pəncərəsi + frost/heat/külək alert | **E1, E2** | ✅ |
| Sərhəd | Toxun-tap avtomatik sahə (geoapi region-growing) | **E8a (C3)** | ✅ |
| Billing | 3-paket gating + admin Abunələr + `/pricing` + **upgrade CTA** | v1.3.0 | ✅ |
| Subsidiya | Kalkulyator (117 tarif 2026), match+modifier engine, wizard | §30 | ✅ |
| Infra | Deploy (Compose+nginx+CF), 5 cron, DB backup, UFW+fail2ban, CF SSL Full(Strict) | — | ✅ |

---

## B. Bloklanıb — istifadəçi addımı lazımdır (⏳)

| # | Task | İstifadəçi nə edir | Mən nə edirəm | Prioritet | Status |
|---|---|---|---|---|---|
| U1 | **EARTHDATA_TOKEN yenilə** (2026-08-30 bitir ⚠️) | urs.earthdata.nasa.gov → yeni bearer → `.env`+`.bak` → restart | Swap sonrası HLS COG 200 yoxla | **Yüksək** | ⏳ |
| U2 | **LLM_API_KEY rotate** (bir dəfə açıq görünüb) | Yeni Anthropic açarı → `.env` → köhnəni ləğv → api restart | — | **Yüksək** | ⏳ |
| U3 | **Email/OTP (Resend)** — Sprint B#1 | Resend hesabı + `RESEND_API_KEY` + CF SPF/DKIM | Migration (email_verified/otp) + signup OTP + notify.py→Resend | **Yüksək** | ⏳ |
| U4 | **Telegram bot token** (→ T22) | @BotFather → `TELEGRAM_BOT_TOKEN` + webhook secret | messaging_channels + deep-link opt-in + /webhook + alert | **Yüksək** | ⏳ |
| U5 | **panel.agradex.com** — Sprint B#2 | CF: `panel` A → 95.216.208.82 | nginx bloku + cookie `.agradex.com` + redirect + middleware | Orta | ⏳ |
| U6 | **EPPO_TOKEN** (→ T9 pest datası) | data.eppo.int Data Portal hesabı → `EPPO_TOKEN` | ⚠️ köhnə API 2026-09-01 bağlanır → yeni Data Portal adapter | Orta | ⏳ |
| U7 | **Billing PSP** (Payriff/Stripe) | Payriff merchant → `PAYRIFF_SECRET_KEY`, PSP seç | payments + checkout/callback + autoPay cron + hectare_cap | Orta | ⏳ |
| U8 | **2FA + Tier-2 firewall** | Hetzner+CF 2FA; origin-IP CF aralığı qərarı | — (UFW+fail2ban var) | Orta | ⏳ |
| U9 | **WhatsApp Business API** (T22 2-ci kanal) | Provayder + per-mesaj ödəniş | Telegram-dan sonra 2-ci kanal | Aşağı | ⏳ |
| U10 | **Xudat crop_type=fındıq** (demo data) | UI-dən dəyiş (yoxsa M5/E0 generic, saxta "Zəif") | İstəsən DB update | Aşağı | ⏳ |
| U11 | **v1.3.0 canlı smoke-test** | Brauzer: İcmal + S2/NASA tab + fırça + passport | Kod deploy+build-təsdiqli; vizual yoxlama qalır | Aşağı | ⏳ |
| U12 | **Kadastr + EKTIS/eagro.az + D3 L3** (→ T25) | Dövlət WMS/WFS/AKTA razılaşma + L3 kommersiya təsdiq | Yalnız texniki infra (giriş sonrası) | Aşağı | ⏳ |

---

## C. Vahid backlog — E + T birləşmiş (⬜)

> **Tək sxem: `T#`.** `Ref` sütunu spec/E-kodunu saxlayır (E-funksiyaları buraya folddu — E0/E1/E2/E8a
> BİTİB, §A-dadır). `Səy`: S/M/L/XL. Kod ilə yoxlanmış (gap-scan). Detal (fayl yolu + "niyə") aşağıda §C.1.

| # | Task | Ref | Sahə | Səy | Prioritet | Asılılıq | Status |
|---|---|---|---|---|---|---|---|
| **T0** | İlk-NDVI "partial" göstərmə (data_status='partial' + 14g→60g queue) | pipeline | pipeline | S | 🔴 | yox | ⬜ |
| **T1** | Qayda mühərriki + çox-kanal dispatcher | spec §0 | backend/notify | M | 🔴 | yox | ⬜ |
| **T2** | Vegetasiya qaydaları VG-1..4 (NDVI/NDMI/anomaliya/NBR → bildiriş) | Faza2 | backend/notify | M | 🔴 | T1, T6 | ⬜ |
| **T4** | GDD toplama modeli (crop_parameters/field_gdd) | Faza2 | backend/model | M | 🔴 | yox | ⬜ |
| **T5** | Foto diaqnoz (Claude vision → scouting) | **E7** / C1 | ai/vision | M | 🔴 | yox (LLM aktiv) | ⬜ |
| **T6** | Baseline/anomaliya/fenologiya aşkarı | Faza2 | geo/analytics | M | 🟡 | T4 | ⬜ |
| **T7** | PDF/Excel hesabatlar | §17 | backend/reports | L | 🟡 | yox | ⬜ |
| **T8** | Tam FAO-56 suvarma cədvəli | **E5** / B2 | ai/weather | L | 🟡 | T4, E1 | ⬜ |
| **T9** | Pest-risk engine (GDD + leaf-wetness) | **E4** / B1 | ai/model | L | 🟡 | T4, T1 (data U6) | ⬜ |
| **T10** | D2 benchmark hardening (p10/50/90 + k-anon n≥5 + consent) | **E10** / D2 | analytics | M | 🟡 | yox | ⬜ |
| **T11** | Gübrə plan engine (N-P-K balans + splits) | **E9** / C7 | ai/agro | L | 🟡 | AZ katalog | ⬜ |
| **T12** | PWA/offline sahə rejimi | **E8b** / C4 | frontend/pwa | L | 🟡 | yox | ⬜ |
| **T13** | MetadataTab region → ölkə/rayon dropdown | UX | frontend/ux | S | 🟡 | yox | ⬜ |
| **T14** | Subsidiya: tarixçə UI + region/suvarma prefill | §30.7 | subsidy | S | 🟡 | yox | ⬜ |
| **T15** | Səsli skautinq (STT + LLM struktur + audio fallback) | **E12** / C5 | ai/voice | M | ⚪ | STT hosting qərarı | ⬜ |
| **T16** | NDVI-inteqral ↔ məhsuldarlıq korrelyasiya | analytics | analytics/yield | S | ⚪ | T4 | ⬜ |
| **T17** | Research → crop_thresholds.index_norms write-back + mövsümi auto-enqueue | knowledge | ai/knowledge | M | ⚪ | yox | ⬜ |
| **T18** | RU/TR lokalizasiya | §25 | i18n | M | ⚪ | yox | ⬜ |
| **T19** | Shapefile import/export + rəngli annotasiya + ScaleControl | map | frontend/map | S | ⚪ | yox | ⬜ |
| **T20** | VRA/idarəetmə zonaları + prescription export | Faza3 | geo | L | ⚪ | yox | ⬜ |
| **T21** | Qruplu Faza-3/4 (cost rollup · IoT · partner API · SAR · EUDR sənəd-gen) | platform | platform | XL | ⚪ | müxtəlif | ⬜ |
| **T22** | Bot kanalı (Telegram, bir-tərəfli alert) | **E3** / C2 | backend/bot | M | 🔴 | ⏳ U4 token | ⬜ |
| **T23** | İki-tərəfli bot (sorğu/cavab) | **E6** / C2 | backend/bot | M | ⚪ | T22 | ⬜ |
| **T24** | Lab-analiz OCR yükləmə (soil_profiles, lab>manual>soilgrids) | **E1b** / D1 | ai/soil | M | 🟡 | T5 (vision) | ⬜ |
| **T25** | D3 data qatı L1+L2 (consent/audit/k-anon infra) | **E11** / D3 | analytics | L | ⚪ | T10, U12 | ⬜ |
| **T26** | İcma forumu / Q&A (Telegram-qrup MVP) | **E12** / C6 | community | M | ⚪ | T22 (infra) | ⬜ |

### C.1 Task detalları (niyə / harada — kod ilə yoxlanmış)

- **T0** — 0009 `data_status` enum-da 'partial' yox, `first_scene_at` yox; tam-ekran banner 60-günlük tarix bitənə qədər xəritəni bloklayır. Ən böyük aktivasiya quick-win.
- **T1** — `internal.py` POST /rules/run → 501 'rules_phase_2'; `services/app/rules/` yoxdur; hava alertləri `ai/weather.py`-də hardcoded. Engine + dedup(field_id+type) + dispatch. **Digər alertlər üçün təməl.**
- **T2** — yalnız hava (frost/heat/wind) bildiriş göndərir; vegetasiya tərəf tam yoxdur. Rules engine-in ilk istehlakçısı.
- **T4** — `gdd_base_c` crop_thresholds-də seed + load olunur, amma heç yerdə Σ yox. Fenologiya/yield/pest/FAO-56 üçün paylaşılan asılılıq. Open-Meteo ARCHIVE (pulsuz, açarsız).
- **T5** — `ai/`-də vision kodu yoxdur (grep təmiz); `uploads.py` yalnız fayl saxlayır. `llm.complete_vision` + `ai/diagnose.py` + endpoint → `scouting_observations.diagnosis`. **Qayda 7** (problem tipi + qeydiyyatlı-siyahı göstərici + aqronom referral, pestisid dozası YOX). Ən güclü kiçik-fermer cəlbetmə qarmağı.
- **T6** — `geo_pipeline/README.md` açıq "Phase 2" deyir; fenologiya yalnız LLM mətnidir, growth_stage əl ilə. Temporal baseline (p10/median/p90) + z-score + Savitzky-Golay → avto growth_stage.
- **T7** — `public.reports` (0005) + business-tier flag var, generator dep yox (weasyprint/reportlab/openpyxl requirements-də yox). WeasyPrint+Jinja2 + /api/reports.
- **T8** — `weather.py` yalnız kobud 7-günlük net-need (ΣET0·Kc−yağış). Günlük depletion balans + mm+tarix + NDMI cross-check clarification + "Hesablamanı gör" panel.
- **T9** — yalnız tiers.py flag; pest_risk_models/field_gdd_daily/pest_risk_events/field_pest_mutes yox. Engine (scoring/cooldown/hysteresis/"yoxdur" mute) indi qurulur, model datası U6 EPPO gözləyir. **Qayda 7.**
- **T10** — `index_benchmark` (0010) yalnız orta qaytarır; p10/p50/p90 yox, HAVING n≥5 yox, consent yox, fenologiya kohortu yox. k-anon **HARD-CODED** olmalı. Endpoint-i tier-ə gate et.
- **T11** — yalnız `fertilizer_history` sərbəst mətn + flag; crop_nutrient_norms/fertilizer_plans/splits yox. N-P-K core indi; AZ məhsul kataloqu sonra.
- **T12** — manifest/service-worker/next-pwa/IndexedDB yoxdur (grep təmiz). Serwist SW + IndexedDB outbox (skautinq/foto/əməliyyat) + tile keş + web-push (VAPID).
- **T13** — MetadataTab hələ sərbəst `AutoField`; `regions.ts` (66 rayon) onboarding-də işləyir — sadəcə təkrar istifadə.
- **T14** — GET /api/subsidy/history + save işləyir, keçmiş hesablamalar render olunmur (§30.7); prefill yalnız area+crop; `geo.py _region()` + `irrigation_method` hazır — birləşdir.
- **T15** — səs/STT kodu yoxdur; AZ STT keyfiyyəti risk (audio-save fallback saxla).
- **T16** — YieldsTab yalnız YoY bar; mövsümi NDVI-inteqral korrelyasiya yox. field_season_features (ndvi_peak/integral/gdd_total/precip_total) mövsüm sonu; model ≥3 mövsümə qədər təxirə.
- **T17** — index_norms seed-provisional qalır; research zone_knowledge yaradır amma crop_thresholds-a write-back yox (grep təmiz). + mövsümi cron auto-enqueue (process-research.sh yalnız drain edir).
- **T18** — i18n.ts (428 sətir) AZ-only ("Default and only locale"); spec §25 ru/tr istəyir.
- **T19** — geoio.ts yalnız GeoJSON+KML; shpjs/shp-write. Rəngli annotasiya alətı yox. ScaleControl (bir sətir).
- **T20** — zones/kmeans/management_zones yox. k-means NDVI COG-larda → zona rate → SHP/ISO-XML. PAID, Faza-3.
- **T21** — Faza-3/4 qrup: cost rollup dashboard yox; sensor_readings/api_keys/v1 router yox; SAR fusion təxirə; EUDR sənəd ən müstəqil parça (poliqonlar var).
- **T22** — Telegram kodu sıfır. messaging_channels/message_log + deep-link opt-in + /webhook + sakit-saat 22-07 + outbound alert. Ən güclü retention lever; aktivləşmə U4 token.
- **T23** — E6, iki-tərəfli (istifadəçi sorğu → cavab); T22-yə bağlı.
- **T24** — pedotransfer core bitib; yalnız lab-report OCR/vision yolu + soil_profiles cədvəl (lab>manual>soilgrids). uploads.py + T5 vision-u təkrar istifadə.
- **T25** — D3 field_inputs/consent/audit + k-anon (n≥10 sahə ≥5 təsərrüfat, HARD-CODED). U12 (hüquq/giriş) + T10 təməl. **Qeyd:** bu L1+L2 infra; **D3 L3 (data satışı)** U12 (hüquq/dövlət razılaşma) + T21 (MRV/EUDR) altındadır.
- **T26** — C6 icma forumu: spec-də **Telegram-qrup MVP** kimi başlayır (fermerlər bir-birinə + aqronoma sual). Öz forum kodu yoxdur. Telegram infra (T22) üzərində qurulur. E12 bundle-ının 2-ci hissəsi.

### C.2 Tam əhatə xəritəsi — heçnə itməyib (hər spec alt-kodu → hara getdi)

> v2.1 alt-kodları (B/C/D) və E0–E12 birləşmədə itməsin deyə: hər biri ya ✅ (§A bitmiş), ya bir T#.

| Alt-kod | Funksiya | → Hara | Status |
|---|---|---|---|
| B1 | Zərərverici riski | T9 | ⬜ |
| B2 | Suvarma (FAO-56) | T8 | ⬜ |
| B3 | Hava / çiləmə pəncərəsi | §A (E2) | ✅ |
| C1 | Foto diaqnoz | T5 | ⬜ |
| C2 | Bot (1-tərəf / 2-tərəf) | T22 / T23 | ⬜ |
| C3 | Toxun-tap sərhəd | §A (E8a) | ✅ |
| C4 | Offline / PWA | T12 | ⬜ |
| C5 | Səsli qeyd | T15 | ⬜ |
| C6 | İcma forumu | **T26** | ⬜ |
| C7 | Gübrə kalkulyatoru | T11 | ⬜ |
| D1 | Torpaq (SoilGrids + lab) | §A (E1) + T24 | ✅ / ⬜ |
| D2 | Regional benchmark | T10 | ⬜ |
| D3 | Data qatı L1/L2 / L3 | T25 / (U12+T21) | ⬜ |
| E0 | NDRE/CIre | §A | ✅ |
| E1 | Pedotransfer TAW/RAW | §A | ✅ |
| E1b | Lab-analiz OCR | T24 | ⬜ |
| E2 | Çiləmə pəncərəsi | §A | ✅ |
| E3 | Bot kanalı (Telegram) | T22 | ⬜ |
| E4 | Pest-risk | T9 | ⬜ |
| E5 | FAO-56 suvarma | T8 | ⬜ |
| E6 | İki-tərəfli bot | T23 | ⬜ |
| E7 | Foto diaqnoz | T5 | ⬜ |
| E8a | C3 sərhəd | §A | ✅ |
| E8b | C4 offline/PWA | T12 | ⬜ |
| E9 | Gübrə (C7) | T11 | ⬜ |
| E10 | D2 benchmark | T10 | ⬜ |
| E11 | D3 L1+L2 | T25 | ⬜ |
| E12 | C5 səs **+ C6 forum + D3 L3** | T15 **+ T26 + (U12/T21)** | ⬜ |

---

## D. Tövsiyə olunan növbə (sıra)

1. **T0** partial-NDVI (aktivasiya quick-win)
2. **T14** subsidiya tarixçə/prefill + **T13** MetadataTab dropdown (S quick-win)
3. **T1** qayda mühərriki + dispatcher (weather.py inline alerti bura köçür, 501 stub-ı öldür)
4. **T2** vegetasiya qaydaları (rules engine-in ilk istehlakçısı → bildiriş)
5. **T4** GDD modeli (fenologiya/yield/pest/FAO-56 açan paylaşılan asılılıq)
6. **T6** baseline/anomaliya/fenologiya (T4 → avto growth_stage)
7. **T5** foto diaqnoz (yüksək dəyər, istifadəçi asılılığı yox)
8. *Paralel — istifadəçi açanda:* **U3** Email/OTP + **T22** Telegram (hər ikisi retention)
9. **T7** PDF/Excel hesabatlar (təmiz mühəndislik, gate hazır)
10. **T8** tam FAO-56 → **T9** pest-risk (hər ikisi T4-ə bağlı)
11. **T10** benchmark hardening + **T24** lab-OCR
12. **T11** gübrə + **T12** PWA
13. Təxirə: **T15** səs · **T16** yield · **T17** write-back · **T19** shapefile · **T18** RU/TR · **T20** VRA · **T23** iki-tərəf bot · **T26** icma forumu · **T25** D3 · **T21** Faza-3/4

---

## E. Risklər (izlə)

- ⚠️ **EARTHDATA_TOKEN 2026-08-30 bitir** — sonra HƏR HLS COG oxuması 401, əsas peyk axını səssizcə dayanır. Sərt deadline, yalnız istifadəçi (U1).
- ⚠️ **EPPO köhnə API 2026-09-01 bağlanır** — token olsa belə pest bloku yeni Data Portal adapteri istəyir (U6 + T9).
- **LLM_API_KEY** bir dəfə açıq görünüb — rotate (U2).
- **Rules engine (T1) paylaşılan təməldir** — veg/pest/fenologiya/suvarma alertlərini ayrı-ayrı (hava kimi inline) qurmaq divergent yollar + dedup bug yaradar. Əvvəl T1.
- **hectare_cap saxlanılır amma tətbiq OLUNMUR** — yalnız sahə-SAYı 402 işləyir; pulsuz org hektar limitini keçə bilər.
- **main-ə push = prod deploy** — hər push-dan əvvəl istifadəçidən təsdiq.
- **Log rotation yoxdur** (`/var/log/bagban-*.log`) — disk-dolma riski.
- **k-anonimlik D2/D3-də HARD-CODED olmalı** (benchmark n≥5 / tələb n≥10 sahə ≥5 təsərrüfat) — səhv = privacy/hüquqi risk.

---

## F. Kiçik follow-up (tez təmizliklər)

- nginx dublikat/conflicting `server_name` təmizliyi (canlı vhost yoxla).
- FieldMap-ə `maplibregl.ScaleControl` (§6.2, bir sətir — T19 ilə birlikdə).
- `/indices/benchmark` endpoint-ini tier flag-ına gate et (hazırda gate-siz).
- Gate olunan səthlərdə (chat/passport/alert) açıq upsell UI (UpgradeCta yalnız field-limit üçün).
- `/var/log/bagban-*.log` üçün logrotate config.
- FAOSTAT mənbəyini host 521-dən çıxanda yenidən yoxla (səliqəli deqradasiya edir).
- Raster trafiki artanda nginx proxy_cache / TiTiler mosaic tile keşi.

---

## G. Gələcək sessiya üçün — necə davam et

1. **Kontekst:** `CLAUDE.md` (qərarlar) → bu ROADMAP (tasklar+status) → `CHANGELOG.md` (deploy) → spec docs.
2. **Deploy loop:** main-ə push (SSH origin) → serverdə `cd /opt/bagbanai && bash deploy/update.sh`
   (**mütləq `.env` source edir**). Frontend web rebuild = `next build` tip-yoxlaması (gate). Sirlər
   `/opt/bagbanai/.env` (backup `/root/agradex.env.bak`) — commit etmə.
3. **Test sahələri:** demo `demo@agradex.com` / `AgradexDemo2026`; "Findiq sahesi 1"
   `4a08ee8a-4123-4fe5-a07f-ed24c69c5604`; "test lecet" `860891bd-912c-4ec3-9235-b7d4d0193190`.
4. **Task bitəndə:** §C-də status xanasını yenilə (⬜→🚀→✅ + commit/tarix), `CHANGELOG.md`-ə sətir,
   lazım olsa `CLAUDE.md`. Fazaları sıra ilə (§28), DoD yoxla.
