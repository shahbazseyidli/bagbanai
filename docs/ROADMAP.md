# Bağban AI — Roadmap & Task Tracker

> **Bu sənəd tək iş-izləyicisidir (single task tracker).** Bütün gələcək tasklar burada, statusla.
> LIVE: https://agradex.com. SSoT: `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29) +
> `docs/Bagban_AI_Subsidiya_Kalkulyatoru_Modul.md` (§30). İş konteksti: `CLAUDE.md`. Nə deploy olub:
> `CHANGELOG.md`. Qayda: UI Azərbaycanca; kod/SQL/commit İngiliscə; Supabase yox (self-hosted PG16 +
> öz JWT); main-ə push = **prod deploy** (hər push-dan əvvəl istifadəçidən təsdiq).
>
> **Son yenilənmə:** 2026-07-21 (gap-scan `wf_c498734d`, kod ilə yoxlanmış).

## Status kodu (hər task bitəndə bu sətri yenilə)

| İşarə | Status | Mənası |
|---|---|---|
| ⬜ | **Planlaşdırılıb** | başlanmayıb |
| 🔨 | **Develop olunub** | kod hazır, deploy OLUNMAYIB |
| 🚀 | **Proda vurulub** | canlıda, test gözləyir |
| ✅ | **Proda vurulub + test edilib** | canlı + doğrulanıb |
| ⏳ | **Bloklanıb (istifadəçi)** | istifadəçinin addımını gözləyir (açar/DNS/hesab) |
| ❌ | **Çıxarılıb** | roadmapdan silinib (+ səbəb) |

> **Necə yenilənir:** task bitəndə `Status` xanasını dəyiş (məs. ⬜→🚀→✅), commit hash + tarixi
> `Qeyd`-ə yaz. Tam çıxarılan taskı ❌ ilə saxla (silmə — səbəbi görünsün). Yeni task əlavə edəndə
> uyğun bölməyə sətir at.

---

## A. Bitmiş — CANLI (✅)

Faza 1 tam canlı + üstünə düşən sprintlər. Detal `CHANGELOG.md` [1.0.0]…[1.3.0].

| Sahə | Nə | Status |
|---|---|---|
| Platform | Multi-tenant PG16+PostGIS, öz-JWT auth, RLS + server gating, org→farm→field, invites | ✅ |
| Peyk | HLS 9-indeks pipeline + **Sentinel-2 10m** + **NDRE/CIre** (E0), TiTiler raster overlay, async "hazırlanır" UX | ✅ |
| Xəritə | Basemap qalereyası, hillshade, Nominatim axtarış, compare/swipe, bulud filtri, ölç, GeoJSON/KML I/O, **fırça/lasso çək** (v1.3.0) | ✅ |
| Sahə UX | **Ayrı Sentinel-2 / NASA tabları** + **İcmal insight səhifəsi** (məhsul-bilən narrativ) + edit/sil paneli (v1.3.0) | ✅ |
| AI | Provayder-agnostik LLM adapter, **məsləhət (yalnız S2)** + grounded chat (Claude aktiv), **Bilik Qatı M1–M8** (SoilGrids/EPPO/FAOSTAT + web_research + clarifications + hava/su) | ✅ |
| Aqro-model | **E1** Saxton-Rawls pedotransfer TAW/RAW · **E2** çiləmə pəncərəsi + frost/heat/külək alert | ✅ |
| Sərhəd | **C3** toxun-tap (geoapi mikroservis, region-growing) | ✅ |
| Billing | 3-paket (Pulsuz/Pro/Business) gating + admin Abunələr + `/pricing` + **upgrade CTA** (v1.3.0) | ✅ |
| Subsidiya | Kalkulyator (117 tarif 2026), match+modifier engine, wizard | ✅ |
| Infra | Deploy (Docker Compose + nginx + CF), 5 cron, DB backup (lokal+off-site), UFW+fail2ban, CF SSL Full(Strict) | ✅ |

---

## B. Bloklanıb — istifadəçi addımı lazımdır (⏳)

Mənim kod işim hazır ola bilər, amma açar/hesab/DNS olmadan aktivləşmir.

| # | Task | İstifadəçi nə edir | Mən nə edirəm | Prioritet | Status |
|---|---|---|---|---|---|
| U1 | **EARTHDATA_TOKEN yenilə** (2026-08-30 bitir ⚠️) | urs.earthdata.nasa.gov → yeni bearer → `.env` + `.bak` → restart | Swap sonrası HLS COG oxumaları 200 yoxla | **Yüksək** | ⏳ |
| U2 | **LLM_API_KEY rotate** (bir dəfə açıq görünüb) | Yeni Anthropic açarı → `.env` → köhnəni ləğv et → api restart | — | **Yüksək** | ⏳ |
| U3 | **Email/OTP (Resend)** — Sprint B#1 | Resend hesabı + `RESEND_API_KEY` + CF-də SPF/DKIM (no-reply@agradex.com) | Migration (email_verified/otp) + signup OTP + notify.py→Resend | **Yüksək** | ⏳ |
| U4 | **E3 Telegram bot token** | @BotFather → `TELEGRAM_BOT_TOKEN` + webhook secret → `.env` | messaging_channels/message_log + deep-link opt-in + /webhook + sakit-saat 22-07 + alert göndərmə | **Yüksək** | ⏳ |
| U5 | **panel.agradex.com** — Sprint B#2 | CF: `panel` A → 95.216.208.82 | nginx bloku + cookie domain `.agradex.com` + login redirect + middleware | Orta | ⏳ |
| U6 | **EPPO_TOKEN** (pest bloku) | data.eppo.int Data Portal hesabı → `EPPO_TOKEN` → `.env` | ⚠️ köhnə EPPO API 2026-09-01 bağlanır → yeni Data Portal adapteri lazım ola bilər | Orta | ⏳ |
| U7 | **Billing PSP** (Payriff/Stripe) | Payriff merchant hesabı → `PAYRIFF_SECRET_KEY`, PSP seç | payments cədvəli + checkout/callback + autoPay cron + hectare_cap enforcement | Orta | ⏳ |
| U8 | **2FA + Tier-2 firewall** | Hetzner+CF 2FA; origin-IP CF aralığına məhdudlaşdırma qərarı | — (UFW+fail2ban artıq var) | Orta | ⏳ |
| U9 | **WhatsApp Business API** (E3 2-ci kanal) | Provayder seç + per-mesaj ödəniş | Telegram-dan sonra 2-ci kanal | Aşağı | ⏳ |
| U10 | **Xudat crop_type=fındıq** (demo data) | UI-dən Xudat sahəsinin məhsulunu fındıq et (yoxsa M5/E0 generic-ə düşür, saxta "Zəif") | İstəsən DB update edərəm | Aşağı | ⏳ |
| U11 | **v1.3.0 canlı smoke-test** | Brauzerdə: İcmal + S2/NASA tab + fırça + KnowledgePassport | Kod deploy+build-təsdiqli; yalnız vizual yoxlama qalır | Aşağı | ⏳ |
| U12 | **Kadastr + EKTIS/eagro.az + D3 L3 data satışı** | Dövlət WMS/WFS/AKTA parsel razılaşması + L3 kommersiya təsdiqi | Yalnız texniki infra (giriş sonrası) | Aşağı | ⏳ |

---

## C. v2.1 funksiyaları — E0–E12 (status)

Spec: `~/Desktop/agradex-feature-expansion-spec-v2.1.md`. Kilidli qərarlar: memory `[[v21-feature-expansion-plan]]`.

| Kod | Funksiya | Status | Qeyd |
|---|---|---|---|
| **E0** | NDRE + CIre red-edge (S2-only) | ✅ | main 0eaf9f7, canlı+test |
| **E1** | Torpaq: pedotransfer TAW/RAW | ✅ | core canlı (5978014) |
| **E1b** | Torpaq: **lab-analiz OCR yükləmə** (soil_profiles, lab>manual>soilgrids) | ⬜ | LLM vision-a bağlı (aşağı, T7) |
| **E2** | Saatlıq hava → çiləmə pəncərəsi + frost/heat/külək | ✅ | canlı (5978014) |
| **E3** | Bot kanalı (bir-tərəfli alert) — **Telegram** əvvəl | ⬜ | engine mənlik; aktivləşmə U4 token; sonra WhatsApp U9 |
| **E4** | Zərərverici riski (B1: GDD + leaf-wetness → risk hadisələri) | ⬜ | T4 GDD + T1 rules; model datası U6 EPPO. Qayda 7 |
| **E5** | Tam FAO-56 suvarma cədvəli | ⬜ | qismən: kobud 7-gün net-need var. T4 GDD-yə bağlı |
| **E6** | İki-tərəfli bot | ⬜ | E3-ə bağlı |
| **E7** | **Foto diaqnoz** (Claude vision → scouting) | ⬜ | LLM açarı aktiv, istifadəçi asılılığı yox. **Yüksək dəyər** (T5). Qayda 7 |
| **E8a** | C3 sərhəd (region-growing) | ✅ | canlı |
| **E8b** | Offline/PWA sahə rejimi | ⬜ | manifest+SW+IndexedDB outbox+web-push (T12) |
| **E9** | Gübrə planı (C7: N-P-K balans + splits) | ⬜ | core mənlik; AZ məhsul kataloqu sonra (T11) |
| **E10** | D2 regional benchmark | ⬜ | qismən: yalnız orta var; p10/p50/p90 + k-anon n≥5 + consent lazım (T10) |
| **E11** | D3 data qatı L1+L2 | ⬜ | benchmark hardening (E10) təməli; consent/audit |
| **E12** | Səs (C5) + forum (C6) + D3 L3 | ⬜ | səs T15; forum+L3 sonra |

---

## D. Platform/mühəndislik növbəsi — mən indi edə bilərəm (⬜)

Gap-scan (kod ilə yoxlanmış) prioritetlə. `Səy`: S/M/L/XL.

| # | Task | Sahə | Səy | Prioritet | Asılılıq | Status · Qeyd |
|---|---|---|---|---|---|---|
| **T0** | **İlk-NDVI "partial" göstərmə** — `data_status='partial'` + first_scene_at + iki-mərhələli queue (14g→60g) | pipeline | S | **Yüksək** | yox | ⬜ Ən böyük aktivasiya quick-win; hazırda tam-ekran banner xəritəni bloklayır |
| **T1** | **Qayda mühərriki + çox-kanal dispatcher** (§0) | backend/notify | M | **Yüksək** | yox | ⬜ `internal.py` /rules/run 501 stub; hava alertləri weather.py-də hardcoded — hamısını bura yönəlt |
| **T2** | **Vegetasiya qaydaları** VG-1..VG-4 (NDVI stress / NDMI aşağı / anomaliya / NDVI-NBR dəyişim → bildiriş) | backend/notify | M | **Yüksək** | T1, T6 | ⬜ Rules engine-in ilk istehlakçısı; veg tərəf tam yoxdur |
| **T4** | **GDD toplama modeli** (crop_parameters/field_gdd) | backend/model | M | **Yüksək** | yox (Open-Meteo ARCHIVE, pulsuz) | ⬜ gdd_base_c seed var, heç yerdə Σ yox. Fenologiya/yield/pest/FAO-56-nı açır |
| **T5** | **Foto diaqnoz (Claude vision)** — E7/C1 | ai/vision | M | **Yüksək** | yox (LLM aktiv) | ⬜ ai/-də vision yoxdur; llm.complete_vision + ai/diagnose.py + endpoint. Qayda 7 |
| **T6** | **Baseline/anomaliya/fenologiya** aşkarı | geo/analytics | M | Orta | T4 | ⬜ geo README "Phase 2"; z-score + Savitzky-Golay → avto growth_stage |
| **T7** | **PDF/Excel hesabatlar** (§17) | backend/reports | L | Orta | yox | ⬜ `reports` cədvəl+flag var, generator dep yox. WeasyPrint+Jinja2 + /api/reports |
| **T8** | **Tam FAO-56 suvarma** (E5) | ai/weather | L | Orta | T4, E1 | ⬜ günlük depletion balans + mm/tarix + NDMI cross-check + "hesablamanı gör" panel |
| **T9** | **E4 pest-risk engine** (GDD pəncərə + leaf-wetness) | ai/model | L | Orta | T4, T1 (data U6) | ⬜ pest_risk_models/field_gdd_daily/... cədvəllər yox. cooldown/hysteresis/mute. Qayda 7 |
| **T10** | **D2 benchmark hardening** (p10/p50/p90 + k-anon n≥5 + consent + fenologiya kohortu) | analytics | M | Orta | yox | ⬜ index_benchmark yalnız orta; k-anon HARD-CODED lazım; endpoint gate |
| **T11** | **Gübrə plan engine** (C7/E9) | ai/agro | L | Orta | AZ katalog (sonra) | ⬜ crop_nutrient_norms/fertilizer_plans/splits yox |
| **T12** | **PWA/offline** (E8/C4) | frontend/pwa | L | Orta | yox | ⬜ manifest/SW/IndexedDB yox; Serwist + outbox + web-push(VAPID) |
| **T13** | **MetadataTab region → ölkə/rayon dropdown** | frontend/ux | S | Orta | yox | ⬜ regions.ts (66 rayon) hazır — sadəcə edit tabında istifadə et |
| **T14** | **Subsidiya: tarixçə UI + region/suvarma prefill** (§30.7) | subsidy | S | Orta | yox | ⬜ history endpoint var, render yox; geo.py _region() + irrigation_method hazır — birləşdir |
| **T15** | **Səsli skautinq qeydi** (C5/E12: STT + LLM struktur + audio fallback) | ai/voice | M | Aşağı | STT hosting qərarı | ⬜ AZ STT keyfiyyəti risk; audio-save fallback saxla |
| **T16** | **NDVI-inteqral ↔ məhsuldarlıq korrelyasiyası** (field_season_features) | analytics/yield | S | Aşağı | T4 | ⬜ YieldsTab yalnız YoY bar; model ≥3 mövsümə qədər təxirə |
| **T17** | **Research → crop_thresholds.index_norms write-back** + mövsümi auto-enqueue | ai/knowledge | M | Aşağı | yox | ⬜ index_norms seed-provisional qalır; write-back yox |
| **T18** | **RU/TR lokalizasiya** (§25) | i18n | M | Aşağı | yox | ⬜ i18n.ts AZ-only; tərcümə keçidi |
| **T19** | **Shapefile import/export + rəngli annotasiya + ScaleControl** | frontend/map | S | Aşağı | yox | ⬜ geoio.ts yalnız GeoJSON+KML; shpjs/shp-write |
| **T20** | **VRA/idarəetmə zonaları + prescription export** | geo | L | Aşağı | yox | ⬜ k-means NDVI COG-larda → zona rate → SHP/ISO-XML. PAID, Faza-3 |
| **T21** | **Qruplu Faza-3/4** (cost rollup · IoT ingest · partner API · SAR bulud-doldurma · E6 iki-tərəf bot · D3 MRV/EUDR) | platform | XL | Aşağı | müxtəlif | ⬜ EUDR sənəd-generatoru ən müstəqil alt-parça (poliqonlar var) |

---

## E. Tövsiyə olunan növbə (sıra)

1. **T0** partial-NDVI göstərmə (S, aktivasiya quick-win)
2. **T14** subsidiya tarixçə/prefill + **T13** MetadataTab dropdown (S quick-win)
3. **T1** qayda mühərriki + dispatcher (weather.py inline alerti bura köçür, 501 stub-ı öldür)
4. **T2** vegetasiya qaydaları (rules engine-in ilk istehlakçısı → bildiriş)
5. **T4** GDD modeli (fenologiya/yield/pest/FAO-56 açan paylaşılan asılılıq)
6. **T6** baseline/anomaliya/fenologiya (T4-ə bağlı → avto growth_stage)
7. **T5** foto diaqnoz (yüksək dəyər, istifadəçi asılılığı yox)
8. *Paralel — istifadəçi açanda:* **U3** Email/OTP + **U4/E3** Telegram (hər ikisi retention)
9. **T7** PDF/Excel hesabatlar (təmiz mühəndislik, gate hazır)
10. **T8** tam FAO-56 → **T9** pest-risk (hər ikisi T4-ə bağlı)
11. **T10** D2 benchmark hardening + **E1b** lab-OCR
12. **T11** gübrə + **T12** PWA (növbəti təbəqə)
13. Təxirə: **T20** VRA · **T15** səs · **T18** RU/TR · **T21** Faza-3/4

---

## F. Risklər (izlə)

- ⚠️ **EARTHDATA_TOKEN 2026-08-30 bitir** — sonra HƏR HLS COG oxuması 401, əsas peyk axını səssizcə dayanır. Sərt deadline, yalnız istifadəçi (U1).
- ⚠️ **EPPO köhnə API 2026-09-01 bağlanır** — token əlavə olsa belə pest bloku yeni Data Portal adapteri istəyir (U6 + mühəndislik).
- **LLM_API_KEY** bir dəfə açıq görünüb — sui-istifadə/xərcdən əvvəl rotate (U2).
- **Rules engine paylaşılan təməldir** — veg/pest/fenologiya/suvarma alertlərini ayrı-ayrı qurmaq (hava kimi inline) divergent yollar + dedup buglar yaradar. Əvvəl §0/T1 qur.
- **hectare_cap saxlanılır amma tətbiq OLUNMUR** — yalnız sahə-SAYı 402 işləyir; pulsuz org hektar limitini keçə bilər.
- **main-ə push = prod deploy** — hər push-dan əvvəl istifadəçidən təsdiq.
- **Log rotation yoxdur** (`/var/log/bagban-*.log`) — serverdə disk-dolma riski.
- **k-anonimlik D2/D3-də HARD-CODED olmalı** (benchmark n≥5 / tələb n≥10 sahə ≥5 təsərrüfat) — səhv = data-satışdan əvvəl privacy/hüquqi risk.

---

## G. Kiçik follow-up (tez təmizliklər)

- nginx dublikat/conflicting `server_name` təmizliyi (CHANGELOG həll deyir, CLAUDE.md hələ flag edir — canlı vhost yoxla).
- FieldMap-ə `maplibregl.ScaleControl` miqyas zolağı (§6.2, bir sətir).
- `/indices/benchmark` endpoint-ini tier flag-ına gate et (hazırda gate-siz).
- Gate olunan səthlərdə (chat/passport/alert) açıq upsell UI — UpgradeCta yalnız field-limit üçün; digərləri səssiz gizlənir.
- `/var/log/bagban-*.log` üçün logrotate config.
- FAOSTAT mənbəyini host 521-dən çıxanda yenidən yoxla (faostat.py onsuz da səliqəli deqradasiya edir).
- Raster trafiki artanda nginx proxy_cache / TiTiler mosaic tile keşi (ops gigiyena, aşağı təcili).

---

## H. Gələcək sessiya üçün — necə davam et

1. **Kontekst:** `CLAUDE.md` (qərarlar) → bu ROADMAP (tasklar+status) → `CHANGELOG.md` (deploy) → spec docs.
2. **Deploy loop:** main-ə push (SSH origin) → serverdə `cd /opt/bagbanai && bash deploy/update.sh`
   (**mütləq `.env` source edir**). Backend dəyişikliyi api rebuild; frontend web rebuild = `next build`
   tip-yoxlaması (gate). Sirlər `/opt/bagbanai/.env` (backup `/root/agradex.env.bak`) — commit etmə.
3. **Test sahələri:** demo `demo@agradex.com` / `AgradexDemo2026`; "Findiq sahesi 1"
   `4a08ee8a-4123-4fe5-a07f-ed24c69c5604`; "test lecet" `860891bd-912c-4ec3-9235-b7d4d0193190`.
4. **Task bitəndə:** bu ROADMAP-da status xanasını yenilə (⬜→🚀→✅ + commit hash/tarix), `CHANGELOG.md`-ə
   sətir, lazım olsa `CLAUDE.md`. Fazaları sıra ilə (§28), DoD yoxla.
