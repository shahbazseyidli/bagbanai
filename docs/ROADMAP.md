# Bağban AI — Roadmap & Task Tracker

> **Bu sənəd tək iş-izləyicisidir (single task tracker).** Bütün gələcək tasklar burada, statusla.
> LIVE: **agradex.com** (marketinq) + **app.agradex.com** (tətbiq). SSoT:
> `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29); `…_Subsidiya_Kalkulyatoru_Modul.md` (§30)
> **artıq icra olunmur** — modul məhsuldan çıxarılıb (§A). İş konteksti: `CLAUDE.md`. Nə deploy olub:
> `CHANGELOG.md`. Qayda: UI 8 dildə (default `az`); kod/SQL/commit İngiliscə; Supabase yox
> (self-hosted PG16 + öz JWT); main-ə push = **prod deploy** (hər push-dan əvvəl istifadəçidən təsdiq).
>
> **Son yenilənmə:** 2026-07-26 — HEAD **84e5f28**. Bu sessiyanın dalğası (`90829eb..84e5f28`,
> 20 commit, 135 fayl) §A.1-dədir: **E13** onboarding quiz · **E14** sahə bölmə taksonomiyası +
> NASA UI-dan çıxdı · **E15** email konsolidasiyası (tək həftəlik digest) · **P0.1** yalan kritik
> verdikt · **P0.2** backend prozası CODE+PARAMS · **P0.3** AI məsləhət oxucunun dilində ·
> **P1.1** rus dili (8-ci lokal) · **P1.2** yerli sahə vahidləri · **P2** ERP → `/farm`.
> Miqrasiyalar **0046–0049**. Yeni açıq işlər: **T27–T31**. E+T tək backlog (§C).

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
> edəndə növbəti **T#** nömrəsini ver — **növbəti boş nömrə `T32`** (T3 və T14 çıxarılıb, təkrar
> istifadə etmə). Status **iddiadır**: bundle/kod təsdiq etmirsə ✅ yazma — 🚀 (test gözləyir) və ya
> açıq "doğrulanmayıb" qeydi ilə saxla.

---

## A. Bitmiş — CANLI (✅)

Faza 1 tam canlı + üstünə düşən sprintlər. Detal `CHANGELOG.md` [1.0.0]…[1.3.0].

| Sahə | Nə | Ref | Status |
|---|---|---|---|
| Platform | Multi-tenant PG16+PostGIS, öz-JWT auth, RLS + server gating, org→farm→field, invites | Faza1 | ✅ |
| Peyk | HLS 9-indeks pipeline + Sentinel-2 10m + **NDRE/CIre**, TiTiler raster overlay, async "hazırlanır" UX | **E0** | ✅ |
| Xəritə | Basemap qalereyası, hillshade, Nominatim axtarış, compare/swipe, bulud filtri, ölç, GeoJSON/KML, **fırça/lasso** | v1.3.0 | ✅ |
| Sahə UX | Sahə səhifəsi + edit/sil paneli. ⚠️ **Köhnəldi:** "ayrı S2/NASA tabları" və "İcmal insight səhifəsi" artıq yoxdur — E14 (§A.1) NASA tabını sildi, `OverviewTab.tsx`+`WellnessCard.tsx` `FieldPulse`/`SatelliteGlance`/`SignalsActions`-a birləşdi | v1.3.0 → **E14** | ✅ |
| AI | LLM adapter, **məsləhət (yalnız S2)** + chat (Claude aktiv), **Bilik Qatı M1–M8** | M1–M8 | ✅ |
| Aqro-model | Saxton-Rawls pedotransfer TAW/RAW · çiləmə pəncərəsi + frost/heat/külək alert | **E1, E2** | ✅ |
| Sərhəd | Toxun-tap avtomatik sahə (geoapi region-growing) | **E8a (C3)** | ✅ |
| Billing | 3-paket gating + admin Abunələr + `/pricing` + **upgrade CTA** | v1.3.0 | ✅ |
| ~~Subsidiya~~ | ~~Kalkulyator (117 tarif 2026), match+modifier engine, wizard~~ — **məhsuldan çıxarıldı** (v1.12.0: frontend + `routers/subsidy.py` silindi; `/api/subsidy/*` 404). 0008 `subsidy_*` cədvəlləri **dormant qalır** (drop olunmayıb) | §30 | ❌ |
| Infra | Deploy (Compose+nginx+CF), **10 cron** (9 pipeline/knowledge + həftəlik email digest), DB backup, UFW+fail2ban, CF SSL Full(Strict) | — | ✅ |

### A.1 — 2026-07-26 dalğası (`90829eb..84e5f28`, 20 commit)

> Status: ✅ = canlı **və** doğrulanıb · 🚀 = canlıya vurulub, vizual/funksional test gözləyir ·
> 🔨 = kod hazır, deploy/build statusu doğrulanmayıb. Detal `CHANGELOG.md`-dədir — burada yalnız status.

| Kod | Nə | Commit | Status |
|---|---|---|---|
| **E13** | Landing onboarding quiz (məhsul → ölkə/rayon → çətinlik → ehtiyaclar) → `localStorage` → signup body-si ilə `users.onboarding` (**0046**); signup formu + sahə sehrbazı prefill; canlı xəritə `#live-demo` bölməsinə köçdü | fc3f9c7 | ✅ |
| **Canlı-test paketi** | Nav gate `user`→**APP host** + mobil menyuda (drawer) dil seçici · public linklər (paylaşma + dəvət) apex üzərindən `publicUrl()`, `/s/` middleware-də auth-dan ƏVVƏL · cookie `.agradex.com` + prefiks saxlanır · valyuta/tərcümə səhvləri · hazelnut fokusu silindi · `/yenilikler`→`/whats-new` (308) | fc3f9c7 | ✅ |
| **Xəritə kök səbəbi** | `lib/useMapReady.ts` — **5 MapLibre qurulmasının hamısı** (FieldMap ×3, FieldsOverviewMap, ZonesTab) ilk real animasiya kadrını gözləyir. Fon tabı kadr istehsal etmir → `Style.loadJSON` rədd cavabını udur → xəritə həmişəlik boş | 073b62f | ✅ ölçülüb |
| — | *(Səhv diaqnoz #1: `FieldsOverviewMap` listener sırası + `drawSafe`. Kod QALIR və müdafiə düzəlişi kimi doğrudur, amma kök səbəb DEYİL — belə oxuma.)* | 70e1378 | ✅ |
| **E14.1** | `lib/fieldSections.ts` = **16 bölmə / 3 qrup** (monitoring 5 · work 7 · records 4), `GROUP_OF` **DERIVED** (əl ilə saxlanan tərs cədvəl `GROUPS.find(...)!` ilə render-də throw edirdi); açar adları `overview→status`, `sentinel2→satellite`, `ai→analysis`, `nasa` **silindi**; desktop-da `FieldSectionMenu` sol panelin içində, xl-dən aşağı çip naviqasiyası | 03620b1 | 🚀 |
| **E14.2** | "Sahənin vəziyyəti" birləşdirilmiş bölmə: `OverviewTab.tsx` (-328) + `WellnessCard.tsx` (-196) **silindi** → `FieldPulse` (üzük + verdikt + komponent zolaqları + "platformanın görə bilmədiyi") · `SatelliteGlance` (kiçik xəritə + 3 indeks + tarix zolağı) · `SignalsActions` (≤3 risk, ≤4 tədbir) | 03620b1 | 🚀 |
| **E14 fallout** | ZonesTab compute düyməsi + computing/insufficient/failed/empty bannerləri + xəritə/leqenda **bərpa olundu** — sensor-picker silinməsi 109 sətir kəsmişdi, 85-i geri qoyuldu | 30b3698 | ✅ |
| **E14.3** | NASA/HLS **UI-dan** çıxdı (`HLS_ENABLED=false`), 23 yeni açar × 7 dil. Atribusiya **QƏSDƏN saxlanıldı**: `/status` hələ NASA HLS + Sentinel-2 sadalayır, EOX CC BY-NC-SA krediti, və tələb olunan "Contains modified Copernicus Sentinel data 2026" 7 dilə **əlavə edildi**. Data qatı toxunulmayıb (pipeline/cron/benchmark/A8/A6 hələ HLS oxuyur) | 722b808 | 🚀 |
| **/fields sadələşməsi** | Çox-sahə xəritəsi siyahı ekranından silindi (+ hər ziyarətdə org-wide `/api/fields/geo` sorğusu) → tək `max-w-3xl` sütun; sətir başına `ShareButton` link-in **qardaşı** kimi (`<a>` içində `<button>` olmaz). `FieldsOverviewMap` silinmədi — dashboard və admin-də qalır | 800597e | 🚀 |
| **SEO P0** | Landing SSR-ə qaytarıldı: `if (!appHost) return <Landing/>` artıq `if (loading)`-dən ƏVVƏL (serverdə auth `loading` həmişə true ilə başlayır → hər crawler spinner alırdı). `x-app-host` header + `AppHostProvider` (`lib/host.ts` → **`host.tsx`**). Per-request canonical + **hreflang** (8 dil + x-default) — əvvəl heç biri yox idi. Hero fərqləndiriciyə köçdü ("xəritə yox, cavab") | 6bf36a6 | 🚀 |
| **E15** | Email konsolidasiyası: 7 göndərmə yolu → tranzaksion (OTP · welcome · ilk data_ready) + **TƏK həftəlik digest** (`ai/emails/weekly.py`, 4 variant `no_fields/no_crop/alerts/calm`, ISO-həftə dedup, **Çərşənbə 03:00 UTC = 07:00 Bakı**). Rule engine `_deliver_email` və advice-dəyişikliyi email-i **silindi** ("Do not re-add" şərhləri ilə); `users.email_alerts` **drop** (**0047**), tək opt-out `email_lifecycle` | 6bf36a6 | 🚀 |
| **P1.1** | **Rus dili — 8-ci lokal** (`locales/ru.ts` 2710 sətir + `content-locales/ru.ts` 688), middleware PREFIXED / DICTS / LocaleProvider / hreflang; backend də: sender persona, OTP, digest etiketləri, chat gate və **AI məsləhətin generasiya dili** | 76abcb5 | ✅ (RU canlı test) |
| **P1.2** | Yerli sahə vahidləri: `lib/units.ts` (ha 10 000 m² · dönüm 1 000 m² · sot 100 m², vahid-başına dəqiqlik 2/1/0), `users.area_unit` (**0048**, NULL = ölkədən törə: TR→dönüm), `GET/POST /api/auth/area-unit`, `AreaUnitSetting`, ~20 səthdə format. Hektar DB/API vahidi olaraq qalır — çevirmə yalnız render kənarında | 76abcb5 | 🚀 |
| **P0.1** | **Yalan kritik verdikt düzəldildi.** Wellness PROXY QAYDASI (3 hissə): (1) proxy komponent **25..85 bandına** sıxılır (NDMI -0.20..0.40) — nə 0-a, nə 100-ə çata bilir; (2) öz etiketini daşıyır (`water.ndmi` = "Peyk nəmlik siqnalı", "Su balansı" DEYİL); (3) real ölçmə varkən proxy heç vaxt "ən pis" adlanmır və tək başına tonu `bad` edə bilmir (`warn`-da dayanır). + `_apportion()` — çəkilər dəqiq 100% (əvvəl 62+39=101%) | b2e973f | ✅ ölçülüb (28/100 "su balansı kritik" → 40/100 "bitki örtüyü zəifdir") |
| **P0.2** | Backend prozası artıq **CODE+PARAMS** qaytarır (nowcast · season-compare · FAO-56 suvarma · frost · clarify · wellness etiketləri); AZ cümlə köhnə sətirlər üçün fallback kimi qalır. Yol boyu **real bug**: FAO-56 override kobud tövsiyəni əvəz edəndə `recommendation_code`-u **silirdi** → lokallaşdırılmış klient səssizcə AZ mətnə düşürdü | b2e973f | 🚀 |
| **P1 (passport)** | `MetadataNudge` + `overview/completeness.ts` — eyni anda ≤2 boşluq, sıralı, hər biri nəyi açdığını deyir + dürüst saniyə qiyməti; region bir-toxunuşla (`/api/geo/site` → `toRayon()`); 14-günlük snooze. `crop_type` 1-ci sıraya çəkildi və boş passportlu sahədə də işləyir (PUT upsert edir) | b2e973f + 8846aed + 2a0b00d | ✅ canlı |
| **P2** | ERP folding: Dəftər/Satış/Anbar/Texnika → `/farm?tab=` tək konteyner (komponentlər eynidir, bir səviyyə aşağı); köhnə route-lar **307 `redirect()`** — `permanentRedirect()` QƏSDƏN deyil (308 brauzerdə əbədi keşlənir, geri qayıtmaq mümkün olmazdı); rail 11→**5**; `SHOW_MARKETPLACE_NAV=false` (Kataloq/İcma naviqasiyadan gizli, route/API/komponentlər canlı) | b2e973f | 🚀 |
| **P0.3** | **AI məsləhət oxucunun dilində** — 5 boşluq: `users.locale` artıq yazılır (`POST /api/auth/locale`, `keepalive`) · `/internal/advice/run` org sahibinin dilini götürür (əvvəl heç nə ötürmürdü → HƏR avtomatik məsləhət AZ idi) · `advice.lang` (**0049**) · `GET /advice` `lang`+`lang_mismatch` qaytarır → `AdviceLangNote` bir-toxunuşla yenidən yaradır · `severityLabel()` (aşağı/orta/yüksək **kod** olaraq qalır, yalnız etiket tərcümə olunur) + `_NOTIFY_TITLE` 8 dil | f83fbe5 | 🚀 |
| **P0.3a** | Bitmiş AI kvotası artıq **429 `advice_quota_exceeded`** — əvvəl 200 + `{quota_exceeded:true}` idi, hər çağıran onu uğur sayırdı (spinner dayanır, ekranda heç nə dəyişmir). Pulsuz org-da kvota **1/ay**, ona görə bu ümumi yoldur | f3a7cf3 | ✅ canlı tapıldı |
| **P0.3b** | Hər sorğuda **`X-Locale`** başlığı (`api.ts headers()`); backend cookie-dən ÖNCƏ onu oxuyur. Səbəb: brauzerdə **İKİ** `bagban_locale` cookie ola bilər (panel split-dən əvvəlki host-only + `.agradex.com`) — Next birincini, Starlette sonuncunu götürür | 1ebb516 | 🚀 |
| **P1.3** | Cəm uzlaşması: `tp(base, n)` + `Intl.PluralRules` (siyahı başlığı "1 полей"/"1 fields" oxuyurdu); `Dict` genişləndi ki, lokal az-da olmayan `few/many` formalarını elan edə bilsin | 34b0f79 + 8c38e8b + 84e5f28 | 🔨 ⚠️ **84e5f28-dən sonra uğurlu `docker build web` qeydə alınmayıb — deploy statusu doğrulanmayıb** |

**Bu dalğanın miqrasiyaları:** `0046` `users.onboarding` jsonb · `0047` **DROP** `users.email_alerts` ·
`0048` `users.area_unit` (+ check) · `0049` `advice.lang` (default `'az'`, mövcud sətirləri düzgün
backfill edir) + `advice_field_lang_idx`. **Sıra vacibdir:** 0046/0048/0049 yeni api image-dən **ƏVVƏL**
(kod o sütunları select/insert edir), **0047 isə əksinə** — onu oxuyan kod (`_deliver_email`,
`/api/auth/email-alerts`) eyni commit-də silindiyi üçün 0047 image swap-ı ilə **birlikdə və ya sonra**.
⚠️ **ZİDDİYYƏT — serverdə yoxlanmalıdır:** iki müstəqil oxucu 0046–0049-un tətbiq statusunda uyuşmur
(biri "prodda tətbiq olunub və `schema_migrations`-də qeyddədir" deyir, digəri "tətbiq olunmayıb").
Bu sənəd **iddia etmir** — `select filename from public.schema_migrations order by 1 desc limit 6;` ilə təsdiqlə.

---

## B. Bloklanıb — istifadəçi addımı lazımdır (⏳)

| # | Task | İstifadəçi nə edir | Mən nə edirəm | Prioritet | Status |
|---|---|---|---|---|---|
| U1 | **EARTHDATA_TOKEN yenilə** (2026-08-30 bitir ⚠️) | urs.earthdata.nasa.gov → yeni bearer → `.env`+`.bak` → restart | Swap sonrası HLS COG 200 yoxla | **Yüksək** | ⏳ |
| U2 | **LLM_API_KEY rotate** (bir dəfə açıq görünüb) | Yeni Anthropic açarı → `.env` → köhnəni ləğv → api restart | — | **Yüksək** | ⏳ |
| U3 | ~~**Email/OTP (Resend)**~~ — **BİTDİ 2026-07-25** | `RESEND_API_KEY` + `EMAIL_FROM` `.env`-dədir, agradex.com Resend-də verified | Email AKTİV: OTP + welcome + data_ready + həftəlik digest (E15). ⚠️ `.env`-də boşluqlu dəyər **dırnaqda** olmalıdır — `update.sh` faylı source edir | **Yüksək** | ✅ |
| U4 | **Telegram bot token** (→ T22) | @BotFather → `TELEGRAM_BOT_TOKEN`/`_USERNAME`/`_WEBHOOK_SECRET` → sonra `POST /api/internal/telegram/setup` | **✅ KOD HAZIR (f71d1b8):** 0024 messaging_channels/message_log; telegram.py; /messaging/telegram + /telegram/webhook; dispatcher delivery; TelegramConnect kartı. Tokensiz dormant. | **Yüksək** | ⏳ token gözləyir |
| U5 | ~~**app.agradex.com**~~ — **BİTDİ 2026-07-25** | CF A-record qoyuldu | Split AKTİV: `NEXT_PUBLIC_PANEL_HOST=app.agradex.com` + `COOKIE_DOMAIN=.agradex.com`; apex=marketinq, app=tətbiq. Bu dalğada üstünə: `x-app-host` header ilə **server-tərəfli** host həlli (6bf36a6) + public linklər apex üzərindən (fc3f9c7) | Orta | ✅ |
| U6 | **EPPO_TOKEN** (→ T9 pest datası) | data.eppo.int Data Portal hesabı → `EPPO_TOKEN` | ⚠️ köhnə API 2026-09-01 bağlanır → yeni Data Portal adapter | Orta | ⏳ |
| U7 | **Billing PSP** (Payriff/Stripe) | Payriff merchant → `PAYRIFF_SECRET_KEY`, PSP seç | payments + checkout/callback + autoPay cron + hectare_cap | Orta | ⏳ |
| U8 | **2FA + Tier-2 firewall** | Hetzner+CF 2FA; origin-IP CF aralığı qərarı | — (UFW+fail2ban var) | Orta | ⏳ |
| U9 | **WhatsApp Business API** (T22 2-ci kanal) | Provayder + per-mesaj ödəniş | Telegram-dan sonra 2-ci kanal | Aşağı | ⏳ |
| U10 | **Xudat crop_type=fındıq** (demo data) | UI-dən dəyiş (yoxsa M5/E0 generic, saxta "Zəif") | İstəsən DB update | Aşağı | ⏳ |
| U11 | **Canlı smoke-test — E14 sonrası** (v1.3.0 mətni köhnəldi: "İcmal" və "NASA tab" artıq yoxdur) | Brauzer: `?tab=status` (FieldPulse + SatelliteGlance + SignalsActions) · 3 qrup / 16 bölmə menyusu · `/farm?tab=` 4 bölmə · sahə vahidi seçicisi · RU/EN cəm başlığı | Kod canlıdadır; vizual yoxlama qalır. §A.1-də 🚀 olan hər sətir bu testi gözləyir | **Orta** | ⏳ |
| U12 | **Kadastr + EKTIS/eagro.az + D3 L3** (→ T25) | Dövlət WMS/WFS/AKTA razılaşma + L3 kommersiya təsdiq | Yalnız texniki infra (giriş sonrası) | Aşağı | ⏳ |

---

## C. Vahid backlog — E + T birləşmiş (⬜)

> **Tək sxem: `T#`.** `Ref` sütunu spec/E-kodunu saxlayır (E-funksiyaları buraya folddu — E0/E1/E2/E8a
> BİTİB, §A-dadır). `Səy`: S/M/L/XL. Kod ilə yoxlanmış (gap-scan). Detal (fayl yolu + "niyə") aşağıda §C.1.

| # | Task | Ref | Sahə | Səy | Prioritet | Asılılıq | Status |
|---|---|---|---|---|---|---|---|
| **T0** | İlk-NDVI "partial" göstərmə (data_status='partial' + first_scene_at) | pipeline | pipeline | S | 🔴 | yox | ✅ 0eafc89 |
| **T1** | Qayda mühərriki + çox-kanal dispatcher | spec §0 | backend/notify | M | 🔴 | yox | ✅ 4bfd4bb |
| **T2** | Vegetasiya qaydaları VG-1..4 (NDVI/NDMI/anomaliya/NBR → bildiriş) | Faza2 | backend/notify | M | 🔴 | T1, T6 | ✅ 5c10517 |
| **T4** | GDD toplama modeli (field_gdd_daily, Open-Meteo archive) | Faza2 | backend/model | M | 🔴 | yox | ✅ be360ac |
| **T5** | Foto diaqnoz (Claude vision → scouting) | **E7** / C1 | ai/vision | M | 🔴 | yox (LLM aktiv) | ✅ 84c4065 |
| **T6** | Baseline/anomaliya aşkarı (fenologiya-avto təxirə) | Faza2 | geo/analytics | M | 🟡 | T4 | ✅ 5c10517 |
| **T7** | PDF/Excel hesabatlar | §17 | backend/reports | L | 🟡 | yox | ⬜ |
| **T8** | Tam FAO-56 suvarma cədvəli | **E5** / B2 | ai/weather | L | 🟡 | T4, E1 | ✅ a1d4476 |
| **T9** | Pest-risk engine (GDD + leaf-wetness) | **E4** / B1 | ai/model | L | 🟡 | T4, T1 (data U6) | ✅ 0d760c5 |
| **T10** | D2 benchmark hardening (p10/50/90 + k-anon n≥5 + consent) | **E10** / D2 | analytics | M | 🟡 | yox | ✅ eba27c6 |
| **T11** | Gübrə plan engine (N-P-K balans + splits) | **E9** / C7 | ai/agro | L | 🟡 | AZ katalog | ✅ 4594a3e |
| **T12** | PWA/offline sahə rejimi (web-push təxirə) | **E8b** / C4 | frontend/pwa | L | 🟡 | yox | ✅ 8d5d46f |
| **T13** | MetadataTab region → ölkə/rayon dropdown | UX | frontend/ux | S | 🟡 | yox | 🚀 0eafc89 |
| **T14** | ~~Subsidiya: tarixçə UI + region/suvarma prefill~~ | §30.7 | subsidy | S | — | — | ❌ **subsidiya modulu məhsuldan çıxarıldı** (v1.12.0) — task predmetsizdir |
| **T15** | Səsli skautinq (STT + LLM struktur + audio fallback) | **E12** / C5 | ai/voice | M | ⚪ | STT hosting qərarı | ⬜ |
| **T16** | NDVI-inteqral ↔ məhsuldarlıq korrelyasiya (feature-store; model təxirə ≥3 mövsüm) | analytics | analytics/yield | S | ⚪ | T4 | ✅ df54a2a (feature-store; canlı hesablandı) |
| **T17** | Research → crop_thresholds.index_norms write-back + mövsümi auto-enqueue | knowledge | ai/knowledge | M | ⚪ | yox | ✅ 6212fa7 (guarded upsert + seasonal endpoint; canlı) |
| **T18** | Çoxdilli lokalizasiya (§25 RU daxil) | §25 | i18n | M | ⚪ | yox | 🚀 **8 lokal canlı** (az/en/ru/tr/de/hu/it/pl) + path-prefix + switcher + hreflang. Bu dalğada bağlandı: `lib/pricing.ts` (`nameKey`/`periodKey`), `azError()` → `app.err.*` açarları, backend prozası CODE+PARAMS (P0.2), AI məsləhətin dili (P0.3), `X-Locale` başlığı. **Qalıq (kod ilə yenidən ölçülməlidir, köhnə siyahını kopyalama):** prose mühərrikləri `insights.ts`/`indexStatus.ts` + `metadataOptions`. Bax [[i18n-architecture]] Server-Component gotcha |
| **T19** | Shapefile import/export + rəngli annotasiya + ScaleControl | map | frontend/map | S | ⚪ | yox | 🚀 586efb7 (shapefile import + ScaleControl canlı; export & annotasiya təxirə) |
| **T20** | VRA/idarəetmə zonaları + prescription export | Faza3 | geo | L | ⚪ | yox | ⬜ |
| **T21** | Qruplu Faza-3/4 (cost rollup · IoT · partner API · SAR · EUDR sənəd-gen) | platform | platform | XL | ⚪ | müxtəlif | ⬜ |
| **T22** | Bot kanalı (Telegram, bir-tərəfli alert) | **E3** / C2 | backend/bot | M | 🔴 | ⏳ U4 token | ✅ f71d1b8 (kod; token gözləyir) |
| **T23** | İki-tərəfli bot (sorğu/cavab) | **E6** / C2 | backend/bot | M | ⚪ | T22 | ⬜ |
| **T24** | Lab-analiz OCR yükləmə (soil_profiles, lab>manual>soilgrids) | **E1b** / D1 | ai/soil | M | 🟡 | T5 (vision) | ✅ ba497fe (vision OCR + precedence; canlı) |
| **T25** | D3 data qatı L1+L2 (consent/audit/k-anon infra) | **E11** / D3 | analytics | L | ⚪ | T10, U12 | ⬜ |
| **T26** | İcma forumu / Q&A (Telegram-qrup MVP) | **E12** / C6 | community | M | ⚪ | T22 (infra) | ⬜ |
| **T27** | Qalan `<n> <isim>` cəm səthlərini `tp()`-yə keçir: **satış qeydləri · paylaşma baxışları · qonşu fermerlər · yağış günləri** | i18n | frontend/i18n | S | 🟡 | yox (tp() hazır) | ⬜ |
| **T28** | Həftəlik digest tərcümə borcu — `catalog_i18n.WEEKLY_EXTRA`-da yalnız `ru`, `weekly.py _LABELS`-də az/en/ru → **tr/de/hu/it/pl istifadəçilər digest-i İNGİLİSCƏ alır** | E15/i18n | backend/email | S | 🟡 | yox | ⬜ |
| **T29** | `POST /api/auth/onboarding` frontend-də **çağırılmır** → `_apply_onboarding_to_fields()` prodda heç vaxt işləmir (quiz cavabları yalnız signup body-si ilə gəlir). "Mövcud sahələrə tətbiq" + re-take yolu bağlıdır | E13 | frontend/backend | S | 🟡 | yox | ⬜ |
| **T30** | Digest AI məsləhət mətnini **dil yoxlamadan** sitat gətirir (`weekly._advice()`-də `lang` predikatı yox) → RU/EN digest içində AZ proza. `lang_mismatch` düzəlişi yalnız sahə səhifəsini əhatə edir | E15/P0.3 | backend/email | S | 🟡 | 0049 | ⬜ |
| **T31** | `HLS_ENABLED` **"bir-boolean rollback" DEYİL** (dead-end): `sensors.ts`-dən kənarda `HLS_ENABLED`/`UI_SENSORS`/`sensorVisible()` heç yerdə istifadə olunmur; səhifə `sensor="S2"` hard-code edir, `SECTION_GROUPS`-da HLS bölməsi yoxdur. Ya rollback-ı doğrudan bağla, ya da şərhdəki iddianı düzəlt | E14 | frontend | S | ⚪ | yox | ⬜ |

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
- **T14** — ❌ **Çıxarılıb.** Subsidiya kalkulyatoru v1.12.0-da məhsuldan silindi (frontend + `services/app/routers/subsidy.py`); `/api/subsidy/*` artıq 404 qaytarır. 0008 `subsidy_*` cədvəlləri qəsdən **dormant** saxlanılıb (drop olunmayıb) — ona görə "cədvəllər silindi" yazmaq da yanlışdır. Task predmetsiz olduğu üçün bərpa edilmir, ancaq konvensiya üzrə görünür qalır.
- **T15** — səs/STT kodu yoxdur; AZ STT keyfiyyəti risk (audio-save fallback saxla).
- **T16** — YieldsTab yalnız YoY bar; mövsümi NDVI-inteqral korrelyasiya yox. field_season_features (ndvi_peak/integral/gdd_total/precip_total) mövsüm sonu; model ≥3 mövsümə qədər təxirə.
- **T17** — index_norms seed-provisional qalır; research zone_knowledge yaradır amma crop_thresholds-a write-back yox (grep təmiz). + mövsümi cron auto-enqueue (process-research.sh yalnız drain edir).
- **T18** — 8 lokal canlıdır (`i18n.ts` `LOCALES`); `i18n.ts`-in 1-ci sətri hələ "Default and only locale for now" yazır — kod şərhidir, sənəd deyil, amma yanıldıcıdır. **Tələ (kod ilə yoxlanmış):** faylın SONUNCU `};` az lüğəti yox, `DICTS` registrisidir — ora açar əlavə edən skript modulu sındırır (8c38e8b belə sındı, yalnız serverin `docker build web`-i tutdu, çünki bu Mac-da node yoxdur). Yeni cəm açarı əlavə edərkən `<base>.other` **az obyektinin içinə** getməlidir (I18nKey oradan törəyir), `few/many` isə `Dict`-in `PluralForms` genişlənməsindən asılıdır (84e5f28).
- **T27** — `tp(base, n)` + `Intl.PluralRules` artıq `i18n.ts`-dədir və 2 yerdə işlənir (`/fields` başlığı, `TodayHome`). 34b0f79 commit mətni eyni qüsurlu 4 səthi adı ilə sadalayır: **satış qeydləri, paylaşma baxışları, qonşu fermerlər, yağış günləri**. Say + tək sabit isim yalnız az/tr-də doğrudur; en/de `one/other`, ru/pl üç forma istəyir.
- **T28** — `catalog.py::_payload` locale → en → az gəzir, ona görə sınmır, sadəcə **ingiliscə** göndərir. İki yer birlikdə doldurulmalıdır: `catalog_i18n.WEEKLY_EXTRA` (digest çərçivəsi) və `weekly.py::_LABELS` (data-formalı sətirlər). `weekly.py` şərhi hələ "AZ and EN are hand-written" deyir — 76abcb5-dən sonra köhnəlib (ru da yazılıb). Qeyd: `catalog_i18n.SIMPLE_EXTRA`-da silinmiş 11 şablonun tr/de/hu/it/pl mətni (~900 sətir) **ölü data** olaraq qalır — canlı şablon siyahısı kimi oxuma.
- **T29** — `app/src`-də `auth/onboarding` üçün yalnız **GET** çağırışı var (`FieldOnboarding.tsx`). `POST` handler-i və onun içindəki `_apply_onboarding_to_fields()` (crop/region-u boş sahələrə upsert edir, mövcud dəyərin üstünə heç vaxt yazmır) prodda **heç vaxt işləmir** — quiz cavabları DB-yə yalnız `SignupIn.onboarding` ilə düşür. E13-ün "mövcud sahələrə tətbiq" yarısı buna görə **dormant**, canlı deyil.
- **T30** — `weekly._advice()` `distinct on (field_id) … summary, findings` seçir, `lang` predikatı yoxdur, xülasə birbaşa email-ə yerləşdirilir. 0049 mövcud sətirləri `'az'` ilə backfill etdiyi üçün RU/EN oxucu digest içində AZ proza görə bilər. Sahə səhifəsində bu `lang_mismatch` + `AdviceLangNote` ilə həll olunub — email-də olunmayıb.
- **T31** — `sensors.ts:9-12` şərhi `HLS_ENABLED`-i "owner-in istədiyi bir-boolean rollback" adlandırır, amma grep göstərir ki, `HLS_ENABLED`/`UI_SENSORS`/`sensorVisible()` **fayldan kənarda istehlak olunmur**: `fields/[id]/page.tsx` `<SatelliteTab sensor="S2" />` hard-code edir və `SECTION_GROUPS`-da HLS bölməsi yoxdur. Həqiqi rollback üçün `fieldSections.ts`-də bölmə girişi + ikinci `SatelliteTab` nüsxəsi lazımdır. **Data qatına toxunma** — pipeline/cron/benchmark/A8/A6 hələ HLS oxuyur, `sensorFamily()` 's30'/'l30'-u həll etməyə davam etməlidir.
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

> **Qeyd (2026-07-26):** bu cədvəlin statusları §C-dən geri qalmışdı (T5/T8/T9/T10/T11/T12/T22/T24
> orada ✅ olduğu halda burada ⬜ görünürdü). İndi §C ilə sinxronlaşdırılıb. E13/E14/E15 və P0/P1/P2
> spec alt-kodları deyil — onlar §A.1-dədir.

| Alt-kod | Funksiya | → Hara | Status |
|---|---|---|---|
| B1 | Zərərverici riski | T9 | ✅ |
| B2 | Suvarma (FAO-56) | T8 | ✅ |
| B3 | Hava / çiləmə pəncərəsi | §A (E2) | ✅ |
| C1 | Foto diaqnoz | T5 | ✅ |
| C2 | Bot (1-tərəf / 2-tərəf) | T22 / T23 | ✅ kod (⏳ U4 token) / ⬜ |
| C3 | Toxun-tap sərhəd | §A (E8a) | ✅ |
| C4 | Offline / PWA | T12 | ✅ |
| C5 | Səsli qeyd | T15 | ⬜ |
| C6 | İcma forumu | **T26** | ⬜ |
| C7 | Gübrə kalkulyatoru | T11 | ✅ |
| D1 | Torpaq (SoilGrids + lab) | §A (E1) + T24 | ✅ / ✅ |
| D2 | Regional benchmark | T10 | ✅ |
| D3 | Data qatı L1/L2 / L3 | T25 / (U12+T21) | ⬜ |
| E0 | NDRE/CIre | §A | ✅ |
| E1 | Pedotransfer TAW/RAW | §A | ✅ |
| E1b | Lab-analiz OCR | T24 | ✅ |
| E2 | Çiləmə pəncərəsi | §A | ✅ |
| E3 | Bot kanalı (Telegram) | T22 | ✅ kod (⏳ U4) |
| E4 | Pest-risk | T9 | ✅ (model datası ⏳ U6) |
| E5 | FAO-56 suvarma | T8 | ✅ |
| E6 | İki-tərəfli bot | T23 | ⬜ |
| E7 | Foto diaqnoz | T5 | ✅ |
| E8a | C3 sərhəd | §A | ✅ |
| E8b | C4 offline/PWA | T12 | ✅ |
| E9 | Gübrə (C7) | T11 | ✅ |
| E10 | D2 benchmark | T10 | ✅ |
| E11 | D3 L1+L2 | T25 | ⬜ |
| E12 | C5 səs **+ C6 forum + D3 L3** | T15 **+ T26 + (U12/T21)** | ⬜ |
| E13 | Landing onboarding quiz | §A.1 | ✅ (T29 qalıq) |
| E14 | Sahə bölmə taksonomiyası + NASA UI-dan | §A.1 | 🚀 (T31 qalıq) |
| E15 | Email konsolidasiyası (tək həftəlik digest) | §A.1 | 🚀 (T28/T30 qalıq) |

---

## D. Tövsiyə olunan növbə (sıra) — 2026-07-26 yenidən yazıldı

> Köhnə sıra (T0/T1/T2/T4/T5/T6/T8-T12 + T14) tamamilə bitib və ya çıxarılıb — silindi.

1. **Doğrulama borcu, hər şeydən əvvəl:** (a) `84e5f28` üçün uğurlu `docker build web` (bu Mac-da node
   yoxdur — TS xətası YALNIZ serverin build-ində görünür); (b) `schema_migrations`-də 0046–0049;
   (c) root crontab-da `0 3 * * 3` sətri (skript öz-özünə crontab dəyişmir).
2. **U11** canlı smoke-test — §A.1-də 🚀 olan hər sətir (E14 bölmələri, `/farm`, vahidlər, SEO/SSR).
3. **T28** + **T30** — digest həm 5 dildə ingiliscə gedir, həm də AZ məsləhət mətnini sitat gətirir.
   İlk Çərşənbə göndərişindən ƏVVƏL düzəlt, yoxsa səhv ilk təəssürat 8 dildən 5-inə çatır.
4. **T29** — E13-ün "mövcud sahələrə tətbiq" yarısı dormant; kiçik dəyişiklik, aktivasiya dəyəri böyük.
5. **T27** cəm səthləri (S) + **T31** `HLS_ENABLED` dead-end (S) — hər ikisi təmiz, asılılıqsız.
6. **T7** PDF/Excel hesabatlar (təmiz mühəndislik, `public.reports` + business gate hazır).
7. *Paralel — istifadəçi açanda:* **U1** EARTHDATA (sərt deadline) · **U2** LLM rotate · **U4** Telegram
   token (→ T22 aktivləşir) · **U6** EPPO (→ T9 datası).
8. Təxirə: **T15** səs · **T19** export/annotasiya qalığı · **T20** VRA · **T23** iki-tərəf bot ·
   **T26** icma forumu · **T25** D3 L1+L2 · **T21** Faza-3/4.

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

**2026-07-26 dalğasından yeni risklər:**
- ⚠️ **Son commit-in build-i doğrulanmayıb** — `2a0b00d` və `8c38e8b` hər ikisi "production build-də tutuldu" deyir, `84e5f28` isə `8c38e8b`-nin düzəlişinin düzəlişidir. Ondan sonra uğurlu build qeydi yoxdur. Bu Mac-da node yoxdur → yeganə TS gate serverin `docker build web`-idir. **`main` deploy edilə bilən sayılmadan əvvəl yoxla.**
- ⚠️ **Migration 0047 əks istiqamətli sıra tələb edir** — o `users.email_alerts`-i **DROP** edir. Onu oxuyan kod (`rules/engine._deliver_email`, `/api/auth/email-alerts`) eyni commit-də (6bf36a6) silinib, ona görə tətbiq təhlükəsizdir; **amma api-ni 6bf36a6-dan geriyə rollback etsən**, silinmiş sütuna qarşı 2 endpoint + 1 dispatcher 500 verəcək. Dəyər-qoruyan rollback yolu yoxdur.
- ⚠️ **Cron sətri əl ilə dəyişməlidir** — `deploy/lifecycle-emails.sh` yalnız **şərhində** `0 3 * * 3` yazır. Skript root crontab-ı dəyişə bilmir. Dəyişməyibsə drain gündəlik işləyir (ISO-həftə dedup sayəsində **zərərsizdir**, dublikat göndərmir), amma digest Çərşənbə yox, köhnə cədvəllə düşür.
- **Digest 5 dildə ingiliscə gedir** (T28) və **AZ məsləhət mətnini sitat gətirir** (T30) — ilk göndərişdən əvvəl düzəlt.
- **Köhnə `?tab=` linkləri səssizcə "Sahənin vəziyyəti"nə açılır** — alias cədvəli **QƏSDƏN** yoxdur (`fieldSections.ts:8-13`: məhsulun yalnız test istifadəçiləri var, bütün daxili link qurucular yeniləndi). `resolveSection()` naməlum dəyəri default-a çevirir: nə 404, nə redirect, nə xəbərdarlıq. Email/Telegram/skrinşotda köhnə link qalıbsa, işləyirmiş kimi görünür. Bərpa lazım olsa `fieldSections.ts:96-98`-də 5 sətirdir — amma əvvəl fayl başlığındakı qərarı oxu.
- **Wellness balı proxy səbəbindən aşağı düşəndə QƏSDƏN düzəldilmir** — yalnız ton (`warn`-da dayanır) və "ən pis komponent" adı düzəlir. Ona görə sahə `40/100` + `warn` göstərə bilər, halbuki `_WARN_MIN = 45`. Bu **niyyətlidir** ("balı dürüst saxlayırıq") — clamp ilə "düzəltmə".
- **Digest peyk şəkli PUBLIC TiTiler URL-i ilə gəlir** (`weekly.raster_png_url()` → `{app_url()}/titiler/cog/preview.png`), çünki Gmail şəkilləri proxy edir. TiTiler-in public çıxışı bağlanarsa **hər həftəlik email-də şəkil səssizcə sınır** (digest bunu nəzərə alıb: rəqəmlər mətn kimi də təkrarlanır). Repo-dakı `deploy/nginx-agradex.conf` yalnız `agradex.com`/`www` üçün `server_name` elan edir — `https://app.agradex.com/titiler/cog/preview.png`-in anonim həll olunduğu **repo-dan sübut oluna bilmir**, ilk göndərişdən əvvəl curl ilə yoxla.

---

## F. Kiçik follow-up (tez təmizliklər)

- nginx dublikat/conflicting `server_name` təmizliyi (canlı vhost yoxla).
- FieldMap-ə `maplibregl.ScaleControl` (§6.2, bir sətir — T19 ilə birlikdə).

- `/indices/benchmark` endpoint-ini tier flag-ına gate et (hazırda gate-siz).
- Gate olunan səthlərdə (chat/passport/alert) açıq upsell UI (UpgradeCta yalnız field-limit üçün).
- `/var/log/bagban-*.log` üçün logrotate config.
- FAOSTAT mənbəyini host 521-dən çıxanda yenidən yoxla (səliqəli deqradasiya edir).
- Raster trafiki artanda nginx proxy_cache / TiTiler mosaic tile keşi.

**2026-07-26 dalğasının ölü kodu / borcu** (hamısı zərərsiz — sındırmır, sadəcə yanıldıcıdır):

- `FieldMapSheet.tsx` — hero xəritə bloku silindikdən sonra hələ hər sahə açılışında `GET /api/fields/{id}/scenes?index=NDVI&sensor=s2` sorğusu edir və nəticəsi (`rasterUrl`) **istifadə olunmur**; `dataSaver`, `forceRaster`/`setForceRaster`, `DisplayMap` və `Layers` import-ları ölüdür. Qərara yox, nəzərdən qaçmaya bənzəyir (production build-dən keçdi → unused-vars burada error səviyyəsində deyil).
- **Yetim i18n açarları — 8 lüğətdə də qalır:** `field.tab.overview` · `field.tab.sentinel2` · `field.tab.nasa` · `field.tab.ai` (heç nə istinad etmir; `SECTION_GROUPS` `app.field.section.*` işlədir) və `app.fieldDetail.groupVaziyyet/Isler/Melumat` (yerini `app.field.group.monitoring/work/records` tutdu). **Tələ:** `field.tab.nasa` ölü olmasına baxmayaraq 722b808-də **adı dəyişdirildi** ("Peyk arxivi") — ona görə grep-də NASA rename sweep tam görünür.
- `catalog_i18n.SIMPLE_EXTRA` — silinmiş 11 şablonun tr/de/hu/it/pl mətni (~900 sətir) inert qalır (`catalog.py` yalnız `_SIMPLE_AZ` üzərində gəzir, orada isə tək `data_ready` var). **Canlı şablon siyahısı kimi oxuma.**
- `advice_field_lang_idx` (0049) — **heç bir sorğu istifadə etmir**: `public.advice`-in bütün oxucuları yalnız `field_id` süzür və `generated_at desc` sıralayır; 0006-dakı `advice_field_idx` onsuz da kifayət edir. Miqrasiyanın öz şərhi ("read path asks for newest row for this field") yaratdığı indekslə ziddiyyət təşkil edir. Zərərsiz, amma "dil-süzgəcli oxu yolu var" deyə oxuma.
- `first_advice` — `send.py::TRANSACTIONAL`-dan çıxarıldı; şablonu və istinadı yoxdur. Kənar çağıran (n8n/skript) hələ `template_id='first_advice'` göndərirsə `catalog.build` None qaytarır və `send_template` səssizcə `False` verir — nə xəta, nə email, nə ledger sətri.
- **Köhnəlmiş kod şərhləri:** `i18n.ts` 1-ci sətri hələ "Default and only locale for now" yazır (fayl 8 lüğətlidir); `weekly.py` şərhi hələ "AZ and EN are hand-written" deyir (76abcb5-dən sonra ru da var).
- **Kvota dicti istisna deyil:** `ai/advice.py::generate_and_store` kvota bitəndə `{"quota_exceeded": True, …}` **dict** qaytarır; 429-u yalnız `routers/advice.py` düzəldir. Digər çağıran — `routers/internal.py::run_advice` — onu uğur sayır (`{"ok": result is not None}` → `ok: true`), yəni **kvotaya dəyən avtomatik generasiya cron logunda uğur kimi görünür**.
- `X-Locale` hər sorğuda göndərilir, amma **yalnız 3 handler oxuyur** (`GET /advice`, `POST /advice/generate`, `POST /chat`). Qlobal middleware yoxdur — 4-cü oxucu lazımdırsa `_resolve_locale(request, …)` açıq çağırılmalıdır.

---

## G. Gələcək sessiya üçün — necə davam et

1. **Kontekst:** `CLAUDE.md` (qərarlar) → bu ROADMAP (tasklar+status) → `CHANGELOG.md` (deploy) → spec docs.
2. **Deploy loop:** main-ə push (SSH origin) → serverdə `cd /opt/bagbanai && bash deploy/update.sh`
   (**mütləq `.env` source edir**). Frontend web rebuild = `next build` tip-yoxlaması (gate). Sirlər
   `/opt/bagbanai/.env` (backup `/root/agradex.env.bak`) — commit etmə.
   ⚠️ **Uğursuz build `update.sh`-ı heç bir konteyner əvəz olunmadan dayandırır** (`set -euo pipefail`
   + tək `up -d --build api web titiler`) → prod ƏVVƏLKİ image-i verməyə davam edir. Ona görə
   **yaşıl görünən sayt deploy-un düşdüyünə sübut DEYİL** — çıxış statusunu/tail-i oxu.
   ⚠️ `update.sh` **miqrasiya tətbiq etmir** (nə `db/migrate.sh`, nə `load_seeds.py`) və `geo`/`geoapi`-ni
   rebuild etmir. Miqrasiya ayrıca, əl ilə, **düzgün sıra ilə** (bax §A.1 qeydi).
3. **Test sahələri:** demo `demo@agradex.com` / `AgradexDemo2026`; "Findiq sahesi 1"
   `4a08ee8a-4123-4fe5-a07f-ed24c69c5604`; "test lecet" `860891bd-912c-4ec3-9235-b7d4d0193190`.
4. **Task bitəndə:** §C-də status xanasını yenilə (⬜→🚀→✅ + commit/tarix), `CHANGELOG.md`-ə sətir,
   lazım olsa `CLAUDE.md`. Fazaları sıra ilə (§28), DoD yoxla.

## 2026-07-25 — SHIPPED (bu sessiya, hamısı CANLI)

- ✅ **Rebrand Bağban AI → Agradex** (bütün istifadəçi səthləri).
- ✅ **panel split AKTİV** (agradex.com=marketing, app.agradex.com=app).
- ✅ **Email sistemi TAM** (E1+E2): welcome · data_ready · davranış lifecycle cron (no_field/inactive/no_crop/trial/edu/digest) · 7 dil × persona · unsubscribe · frontend pref. Migration 0044.
  > ⚠️ **Bu sətir bir gün sonra ƏVƏZ OLUNDU (E15, §A.1):** 9 davranış şablonu silindi və tək həftəlik digest-in variantlarına çevrildi; gündəlik cron həftəlik oldu; `users.email_alerts` drop edildi (0047). `EmailAlertsToggle` komponenti və `/api/auth/email-alerts` endpoint-ləri artıq yoxdur. 0044 infrastrukturu (ledger, `email_lifecycle`, unsubscribe) qalır.
- ✅ **Fermer ad-görünürlük məxfiliyi** (migration 0045).
- ✅ **Admin genişləndirmə** (bütün-sahələr xəritə/siyahı, user idarəetmə, ixrac).
- ✅ **How it works səhifəsi** (hazelnut→ümumi) · ingilis slug-lar · app-host dil→Settings.
- ✅ **Bug fix:** panel chrome sızması · Nav flicker · share NASA→S2 · share verdict+metadataOptions i18n.
- ⏸ **Google SSO** — welcome (SSO variantı) onunla aktivləşəcək (E2.5, şablon hazır).


## 2026-07-26 sessiyası — SHIPPED (canlı test + E13 onboarding quiz)

**Canlı test (agradex.com + app.agradex.com, desktop + 375px mobil) → tapılan və düzəldilən buglar:**
- **Nav (istifadəçi #4):** `Nav.tsx` marketinq linklərini `user` üzərindən gizlədirdi → daxil olmuş istifadəçi agradex.com-da yalnız loqo görürdü (mobil hamburger də yox idi). İndi gate **APP host**-dur. Mobil şüfyəyə dil seçici əlavə edildi (əvvəl telefonda dil dəyişmək **ümumiyyətlə** mümkün deyildi). ✅ canlı doğrulandı.
- **Paylaşma linkləri sınıq idi:** app.agradex.com-da yaradılan `/s/<token>` linki app host-un auth qapısına düşürdü → hər qəbul edən /login görürdü. İndi public linklər (paylaşma + komanda dəvəti) apex üzərindən qurulur, `/s/` isə middleware-də auth-dan ƏVVƏL keçir. ✅ canlı doğrulandı.
- **Dil host-lar arasında itirdi:** `bagban_locale` host-only idi + apex→app yönləndirməsi `/en` prefiksini atırdı. İndi cookie `.agradex.com` domenindədir və prefiks saxlanılır. ✅
- **Valyuta/tərcümə məntiq səhvləri (istifadəçi #3):** hero "every manat" en/tr/de/hu/pl → dollar/lira/Euro/forint/złoty · fermerin öz pul sahələrində `₼` → lokal simvol · `lib/pricing.ts`-də sabit **"Paket 2 · 10 AZN/ay"** (ay = AZ sözü) → i18n açarları (`mkt.pkg.name1..3`, `priceUnit`, `priceUnitMonth`) · müqayisə cədvəlində "Azerbaijani language" üstünlük kimi · ingilis səhifədə "in plain Azerbaijani" · AZ pestisid reyestri bütün dillərə · maşın-tərcümə qüsurları (en "for free join" təkrarı, de qoşa boşluqlar, hu tək-cəm uyuşmazlığı, it söz sırası, hu "A Agradex"→"Az Agradex", 53 pl dırnaq cütü).
- **Hazelnut fokusu silindi (istifadəçi #5):** marquee çip, hero badge, müqayisə sətri, peer təklifi, modul maketi, rəy — hamısı ümumi məhsula çevrildi.
- `/yenilikler` → **`/whats-new`** (308 saxlanıldı) + `#imkanlar`/`#canli-demo` → `#features`/`#live-demo` (ingilis slug işi tamamlandı).

**E13 — landing onboarding quiz (istifadəçi #6) ✅ CANLI:** ana səhifədə xəritənin yerində 4 sual (məhsul → ölkə/rayon → hazırkı çətinlik [keçilə bilər] → ehtiyaclar [çoxseçimli]) → şəxsi plan + qeydiyyat CTA. Cavablar `localStorage` → qeydiyyatda hesaba (**migration 0046** `users.onboarding` jsonb), qeydiyyat formunu doldurur, sahə sehrbazını doldurur, və **crop/region-u boş olan mövcud sahələrə tətbiq olunur** (`POST /api/auth/onboarding`, mövcud dəyərin üstünə heç vaxt yazmır). Canlı xəritə `#live-demo` bölməsi kimi rol kartlarının altına köçdü. 49 sətir ×7 dil.

### ✅ HƏLL OLUNDU — bütün xəritələr fon tabında boş qalırdı (kök səbəb tapıldı)
**Simptom:** `app.agradex.com`-da xəritə boz boş qutu — canvas düzgün ölçüdə, WebGL sağ, zoom kontrolu və leqenda çəkilir, **heç bir JS xətası yox**.

**Kök səbəb (canlı səhifədə React fiber üzərindən MapLibre instansiyasına çatıb ölçüldü):** `style._loaded=false`, `style.stylesheet=null`, `sourceCaches=[]`, `style._frameRequest` **hələ gözləyir**, `document.visibilityState='hidden'`, `requestAnimationFrame` işləmir. MapLibre-in `Style.loadJSON`-u style-ı dərhal parse etmir — əvvəlcə **bir animasiya kadrı gözləyir** (`browser.frameAsync`) və kadr gəlməsə rədd cavabını udur. **Fon tabı kadr istehsal etmir** → style heç vaxt yüklənmir → `load` hadisəsi atəşlənmir → `applyBasemap` çağırılmır → nə tile sorğusu, nə poliqon, nə xəta. Tab sonradan önə gətiriləndə MapLibre **yenidən cəhd etmir** → xəritə həmişəlik boş qalır.

**Vacib düzəliş:** bu heç vaxt `FieldsOverviewMap`-ə xas olmayıb — eyni host-da **sahə xəritəsi və zona xəritəsi də boş idi**. Marketinq xəritəsi yalnız ona görə işləyirdi ki, o səhifə tabı öndə olarkən qurulmuşdu. İstifadəçilər buna orta düyməylə/"yeni tabda aç", sessiya bərpası və ya PWA soyuq başlanğıcı ilə düşür.

**Həll:** `app/src/lib/useMapReady.ts` — **5 xəritə qurulmasının hamısı** (FieldMap ×3, FieldsOverviewMap, ZonesTab) ilk real animasiya kadrını gözləyir. `requestAnimationFrame` dəqiq siqnaldır: kiçildilmiş və ya tam örtülmüş pəncərə `visibilityState='visible'` deyə bilər, amma kadr istehsal etmir.

**Canlı doğrulandı (commit 073b62f):** əvvəl 0 source / 0 layer + gözləyən kadr; indi sahə xəritəsində `basemap, basemap-labels-src, field, measure, index-overlay` + 8 layer, idarə panelində `basemap, basemap-labels, fields-fill, fields-line`, basemap tile URL Esri World Imagery, `zoom:15` (fitBounds işlədi), `framePending:false`.

**Qayda:** hər YENİ MapLibre xəritəsi `useMapReady()` ilə gate olunmalıdır (hazırda 5 qurulma). Bu hook-suz qurulan xəritə fon tabında **həmişəlik boş** qalır və heç bir xəta vermir. Tanınma simptomu: düzgün ölçülü canvas, canlı WebGL konteksti, işləyən zoom kontrolu, çəkilmiş leqenda — amma nə tile, nə konsol xətası.

### 2026-07-26 — günün ikinci yarısı (E14 · /fields · SEO+E15 · RU+vahidlər · P0/P1/P2 · RU canlı test)

> Tam sıralı siyahı statusla **§A.1**-dədir; burada yalnız təkrarlanmaması vacib olan dərslər və qərarlar.

**İki eyni sinifli skript-redaktə sınığı (bir gündə):**
- `30b3698` — E14 redaktəsi ZonesTab-dan **yalnız sensor picker-i** çıxarmalı idi; silmə JSX blokunun sərhədində dayanmadı və ardınca gələn bütün qardaşları apardı (compute düyməsi, 4 state banneri, xəritə, verdikt sətri, statistika cədvəli). **109 sətir getdi, 85-i geri qoyuldu.** Tip sistemi bunu tutmur — funksiya yoxa çıxsa da kod kompilyasiya olunur.
- `8c38e8b` — açar əlavə edən skript faylın **sonuncu `};`**-inə bağlandı; `i18n.ts`-də o, `az` lüğəti yox, `DICTS` registrisidir → modul sındı. 7 lokal faylı tək obyekt saxladığı üçün onlarda problem yox idi.
- **Dərs:** JSX ağacına və ya böyük obyekt literalına edilən skript-redaktənin **tam diff-i oxunmalıdır**, yalnız nəzərdə tutulan hunk yox. Hər ikisi yalnız serverin `docker build web`-ində üzə çıxdı (bu Mac-da node yoxdur).

**Rusca canlı testdən çıxan 4 düzəliş (ardıcıl):** məsləhət AZ gəlirdi (**5** ayrı boşluq — `f83fbe5`) → yenidən-yaratma düyməsi 200 qaytarıb heç nə etmirdi (kvota; **429** — `f3a7cf3`) → boş passportlu sahədə AI "məhsul növü qeyd olunmayıb" deyirdi, amma o ekrandan qeyd etmək mümkün deyildi (`8846aed`+`2a0b00d`) → brauzerdə **iki** `bagban_locale` cookie tapıldı (`X-Locale` başlığı — `1ebb516`).

**Bu sessiyanın davamlı məhsul qərarları (gələcək işi məhdudlaşdırır):**
- **Email = TƏK həftəlik digest** (Çərşənbə 07:00 Bakı). Gündəlik heç nə yoxdur; kritik alertlər digest-ə qatlanır və dərhal yalnız **in-app + Telegram** ilə çatır. `rules/engine.py` və `ai/advice.py`-də silinmiş email yollarında açıq **"Do not re-add"** şərhi var — orada göndərmə `send_template`-i tam yan keçir (idempotentlik ledger-i yox, opt-out yox, unsubscribe linki yox). Yeni şablon əlavə etməzdən əvvəl sual: bu, həftəlik digest-in **variantı** deyilmi?
- **Fındıq fokusu yoxdur** — platforma məhsul-ümumi mövqelənir.
- **Heç bir dil atılmır** — strategiya hesabatının "lokal sayını azalt" təklifi rədd edildi (6bf36a6).
- **4 ERP modulu tək `/farm` tabının içindədir** və park olunub; **Kataloq/İcma** məzmun gələnə qədər `SHOW_MARKETPLACE_NAV` arxasında gizlidir (route/API/komponentlər canlı, birbaşa link işləyir).
- **Hektar DB/API vahidi olaraq qalır** — çevirmə yalnız render kənarında (`lib/units.ts` `"use client"`; Server Component-lər `formatArea()` çağırmamalıdır). Sahə YAZAN yerlər `fromUnit()` ilə geri çevirməlidir (YieldsTab belə edir). **Hektar-başına dərəcələr** (t/ha, kq/ha dozalar) qəsdən hektar-başına qalır — normalar belə dərc olunur.
- **Backend fermerə görünən mətni Python-da tərcümə ETMİR** — `*_code` + `*_params`, AZ cümlə yalnız köhnə sətirlər üçün fallback. Bir yol digərinin mətnini əvəz edirsə, **kodu da əvəz etməlidir** (bu, b2e973f-də düzəldilən real bug idi).
