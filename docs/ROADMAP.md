# Bağban AI — Roadmap & Task Tracker

> **Bu sənəd tək iş-izləyicisidir (single task tracker).** Bütün gələcək tasklar burada, statusla.
> LIVE: **agradex.com** (marketinq) + **app.agradex.com** (tətbiq). SSoT:
> `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29); `…_Subsidiya_Kalkulyatoru_Modul.md` (§30)
> **artıq icra olunmur** — modul məhsuldan çıxarılıb (§A). İş konteksti: `CLAUDE.md`. Nə deploy olub:
> `CHANGELOG.md`. Qayda: UI 8 dildə (default `az`); kod/SQL/commit İngiliscə; Supabase yox
> (self-hosted PG16 + öz JWT); main-ə push = **prod deploy** (hər push-dan əvvəl istifadəçidən təsdiq).
>
> **Son yenilənmə:** 2026-08-04 — **§A.3 yeni dalğadır** (DeepSeek/Gemini keçidi, sahə səhifəsinin
> ikinci kəsimi, mövsüm xülasəsi, Mesajlar, görmə kvotası, xəbərdarlığın həlli). Miqrasiya **0063**;
> **növbəti boş nömrə `0064`**. Dalğanın diapazonu: **`580c22c..8247b39`** (9 commit).
>
> 2026-07-26 dalğası (`90829eb..84e5f28`) §A.1-dədir. **2026-07-27…30 dalğası (`c98943a..decbdb2`,
> 15 commit, 155 fayl) §A.2-dədir** və bu roadmap-ın böyük hissəsini köhnəldir: sahibin qərarı ilə
> **ERP yarısı məhsuldan çıxarıldı** (`81660df`), sonra Terra Oracle iş masası (`8f25630`),
> OneSoil mobil (`03eb081`) və email-only qeydiyyat + magic link (`786bb4d`) gəldi.
> Miqrasiyalar **0055** (`login_tokens`) · **0056** (`ai_usage.source`).
> **Sadələşdirmənin ləğv etdiyi tasklar:** T7 · T16 · T20 (§C-də ❌, səbəbi ilə).
> **§A.3-ün ləğv etdiyi tasklar:** T33 · T34 (DeepSeek keçidi ikisini də predmetsiz etdi).
> Yeni açıq işlər: **T32** · **T35** · **T36** (dormant cədvəllərin ikinci nəsli). E+T tək backlog (§C).

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
> edəndə növbəti **T#** nömrəsini ver — **növbəti boş nömrə `T37`** (T3, T7, T14, T16, T20, T33, T34
> çıxarılıb, təkrar istifadə etmə). Status **iddiadır**: bundle/kod təsdiq etmirsə ✅ yazma —
> 🚀 (test gözləyir) və ya açıq "doğrulanmayıb" qeydi ilə saxla.

---

## A. Bitmiş — CANLI (✅)

Faza 1 tam canlı + üstünə düşən sprintlər. Detal `CHANGELOG.md` [1.0.0]…[1.3.0].

| Sahə | Nə | Ref | Status |
|---|---|---|---|
| Platform | Multi-tenant PG16+PostGIS, öz-JWT auth, RLS + server gating, org→farm→field, invites | Faza1 | ✅ |
| Peyk | HLS 9-indeks pipeline + Sentinel-2 10m + **NDRE/CIre**, TiTiler raster overlay, async "hazırlanır" UX | **E0** | ✅ |
| Xəritə | Basemap qalereyası, hillshade, Nominatim axtarış, compare/swipe, bulud filtri, ölç, GeoJSON/KML, **fırça/lasso** | v1.3.0 | ✅ |
| Sahə UX | Sahə səhifəsi + edit/sil paneli. ⚠️ **İki dəfə köhnəldi:** (1) E14 (§A.1) NASA tabını sildi və `OverviewTab.tsx`+`WellnessCard.tsx`-i `FieldPulse`/`SatelliteGlance`/`SignalsActions`-a birləşdirdi; (2) sadələşdirmə (§A.2) bölmə sayını **16 → 12** endirdi, `03eb081` isə telefonda səhifəni **tabsız** etdi (tək skroll + «Daha çox» siyahısı). Desktop bölmə menyusunu saxlayır; hər ikisi `fieldSections.ts`-i oxuyur | v1.3.0 → **E14** → **§A.2** | ✅ |
| AI | LLM adapter, **məsləhət (yalnız S2)** + chat + **mövsüm xülasəsi**, **Bilik Qatı M1–M8**. ⚠️ Mühərrik 2026-08-04-dən **DeepSeek (mətn) + Gemini (görmə)** — bax §A.3 | M1–M8 | ✅ |
| Aqro-model | Saxton-Rawls pedotransfer TAW/RAW · çiləmə pəncərəsi + frost/heat/külək alert | **E1, E2** | ✅ |
| Sərhəd | Toxun-tap avtomatik sahə (geoapi region-growing) | **E8a (C3)** | ✅ |
| Billing | 3-paket gating + admin Abunələr + `/pricing` + **upgrade CTA** | v1.3.0 | ✅ |
| ~~Subsidiya~~ | ~~Kalkulyator (117 tarif 2026), match+modifier engine, wizard~~ — **məhsuldan çıxarıldı** (v1.12.0: frontend + `routers/subsidy.py` silindi; `/api/subsidy/*` 404). 0008 `subsidy_*` cədvəlləri **dormant qalır** (drop olunmayıb) | §30 | ❌ |
| Infra | Deploy (Compose+nginx+CF), **10 cron** (8 pipeline/knowledge + həftəlik email digest + **günlük wellness süpürməsi**, §A.3), DB backup, UFW+fail2ban, CF SSL Full(Strict). ⚠️ **A6 zones cron-u** sadələşdirmə ilə həm repodan (`deploy/process-zones.sh`), həm serverin crontab-ından silindi (`81660df`) | — | ✅ |

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
~~⚠️ **ZİDDİYYƏT — serverdə yoxlanmalıdır:** iki müstəqil oxucu 0046–0049-un tətbiq statusunda uyuşmur.~~
**HƏLL OLUNDU (`4c7e9dd`, 2026-07-27):** commit mətni `schema_migrations`-i **serverdə** oxuyub qeyd edir —
**0050–0054-ün hamısı canlıda tətbiq olunub**, yəni 0046–0049 onlardan əvvəl gəldiyi üçün onsuz da tətbiq
olunub. Eyni commit həftəlik digest cron sətrinin (`0 3 * * 3`) canlı crontab-da olduğunu da doğrulayır.

---

### A.2 — 2026-07-27…30 dalğası (`c98943a..decbdb2`, 15 commit, 155 fayl)

> Bu dalğa məhsulun **əhatəsini daraltdı**, sonra qalanı yenidən dizayn etdi. §C-dəki bir neçə task
> buna görə predmetsiz qaldı (T7/T16/T20 — orada ❌). Detal `CHANGELOG.md` [1.15.0]–[1.17.0].
>
> **Deploy statusu bu dalğada bircins DEYİL** — hər sətirdə ayrıca yazılıb. `81660df`+`a1b362e` canlı
> doğrulanıb; `8f25630` və `03eb081` dalğalarının hər ikisinin ardınca **build düzəlişi** commit-i gəlir
> (`c13ba8f`, `05c3870`), yəni o an `update.sh` konteyner əvəz etmədən dayanmışdı və ondan sonra uğurlu
> build/deploy qeydi repoda yoxdur.

| Kod | Nə | Commit | Status |
|---|---|---|---|
| **S1 — Sadələşdirmə** | **ERP yarısı çıxdı** (sahibin qərarı, 12 funksiya): sahə bölmələri `tasks`/`yields`/`zones`/`harvest`; təsərrüfat modulları dəftər/satış/anbar/texnika/yığım-sifarişi/yerlər **+ `/farm` konteyneri**; `reports` (1027 sətir); marketinq `/whats-new`+`/yenilikler`, `/status`, `/finduq`. **8 backend router**, **445 i18n açarı**, rail 11→5, sahə səhifəsi 16→**12 bölmə**. `deploy/process-zones.sh` repodan **və** serverin crontab-ından silindi. ⚠️ **DB cədvəlləri DROP EDİLMƏYİB** (subsidiya ilə eyni naxış — yatmış və geri-qaytarıla bilən) | `81660df` | ✅ canlı (`31b6e58` deploy sonrası ölçmələri qeyd edir) |
| **S1 mühakimə** | Silinmə yox, qərar tələb edən 3 yer: **operations QALDI** (mühasibat yox, **AI girişi** — `ai/context.py` oxuyur) · `ai/context.py` tasks/yields oxumağı dayandırdı (yoxsa modelə həmişə boş iki siyahı gedərdi) · `BackfillCard` `zones`→`season` (keçmiş mövsümləri istəməyin YEGANƏ yolu; `for_zones` bayrağı olmadan) | `81660df` | ✅ |
| **6.5/6.6 — Sahə xəritə kartı** | Sahə səhifəsində davamlı xəritə **kartı** (hero yox), bölmə naviqasiyasının üstündə mount → bölmə dəyişikliyindən sağ çıxır; tam ekran `?map=full`-da (Android geri jesti bağlayır). **Skautinq qeydləri xəritə datası oldu** — pinlər, redaktə/sil/**həll et** (həll olunmuş silinmiş deyil), mərkəz-retikul ilə yerləşdirmə | `3f5f9ce` | ✅ canlı |
| **UX-D — Tam-bleed desktop** | App host 1152px oxu konteynerindən çıxır (`SHELL_BLEED` + 2200px track, marşrut üzrə `isWideStage()`); ölçülən səhnə 1440-da **778→938px**. **Marketinq konstruksiyaya görə toxunulmazdır** (bleed app-host erkən return-undan SONRA yaşayır). «Bu gün» instrument paneli (4 stat plitəsi + xəritə əsas obyekt + xəbərdarlıq reydi) | `a1b362e` | ✅ canlı |
| **UX-M — Mobil komfort** | 80px etiketli aşağı menyu + 64×32 aktiv pill, **48px toxunma döşəməsi**, `--nav-h`/`--nav-clear` (aşağıya bağlanan heç nə bir daha zolağın hündürlüyünü təxmin etmir); qat seçici indeks akronimi yerinə **sahənin özünün həmin indeksdəki şəklini** göstərir; sayğaclı `lib/scrollLock.ts` | `a1b362e` + `31b6e58` | ✅ **614px-də canlı ölçülüb** (nav 81.5px, 5 slot bərabər) |
| **UX-L — `users.locale` uyğunlaşdırması** | `users.locale`-i yalnız `LanguageSwitcher` yazırdı, middleware isə dili **URL prefiksindən** qurur → `/ru/fields` bookmark-ı interfeysi həmişəlik dəyişir, hesab `az` qalır. Sorğusuz iki səth (avtomatik məsləhət, həftəlik digest) yanlış dildə yazırdı. İndi yükləmə başına **bir dəfə**, **yalnız açıq siqnaldan**; köhnə host-only cookie də silinir | `a1b362e` + `31b6e58` | ✅ **canlı doğrulanıb** (sahib hesabı `bagban_locale`-i iki dəfə daşıyırdı — tr+ru — `users.locale` isə `az`; deploy-dan sonra `ru`-ya uyğunlaşdı) |
| **TO — Terra Oracle shell** | Üzən rail → həqiqi **sidebar** (fixed, tam hündürlük, kvadrat künc); `Nav` üst panel (toggle + marşrutdan törənən başlıq + zəng/kömək/avatar); **7 istiqamət**. ⚠️ Sidebar-ın etiketli 256px vəziyyəti **`2xl`-dədir, `xl` DEYİL** — `FieldListPanel` `xl`-də gəlir və 1280px-də ikisini birdən ödəmək səhnəni `WORKBENCH_MIN`-dən aşağı, 740px-ə salırdı | `8f25630` | 🚀 **deploy doğrulanmayıb** |
| **TO — Dashboard** | 8 KPI plitəsi + scope dropdown + xəritənin **rəngləmə mənbəyini** seçən seqment (sağlamlıq/xəbərdarlıq/hava) + çox-sahə xəritəsi əsas obyekt + Məlumat lenti. **MARKET INTELLIGENCE və VRA QƏSDƏN qurulmadı** — bizdə nə bazar datası, nə dəyişkən-doza var; plitəni doldurmaq rəqəm uydurmaq olardı | `8f25630` | 🚀 |
| **TO — Qrafik paneli** | `field/chart/` — tarix, `1H 1A 3A 6A 1İ Hamısı`, ←/Son/→, həll olunmuş aralıq, **hansı indeksin çizildiyini** seçən Layers, kilid, tam ekran. ⚠️ `windowOf()` **`maxTs` ilə `maxMeasuredTs`-i ayırır**: aralıq **ölçmədən** geri sayılır (yoxsa proqnoz ekranda olanda «1H» tamamilə gələcəkdə qalır, içində ölçmə olmur və düymə özünü söndürür — canlı bug idi); proqnoz span-ın ən çoxu ¼-ini alır | `8f25630` | 🚀 |
| **TO — `?ui=v1` silindi** | Köhnə konsol Dashboard + `lib/uiFlag.ts` + sahə səhifəsinin paralel v1 budağı getdi; **13 yetim `dash.*` açarı** 8 lüğətdən çıxdı. `SHOW_MARKETPLACE_NAV = **true**` — Kataloq/İcma menyudadır, `/provider` `/more`-da **yalnız provider rollu** hesablara | `8f25630` | 🚀 |
| **OS — Mobil: xəritə ana səhifədir** | Telefonda `/` = təsərrüfatın tam-bleed xəritəsi (`MapHome`); **5 həqiqi tab** (Xəritə·Sahələr·Hava·Qeydlər·Hesab), «+» menyudan çıxıb xəritəyə keçdi; sahə ekranı telefonda **tabsız** (tək skroll + «Daha çox»), **hər `?tab=` dərin linki hələ də həll olunur**. Ölçü mənbəyi `docs/ONESOIL_MOBILE_TEARDOWN.md` (adb+uiautomator) | `03eb081` | 🚀 **deploy doğrulanmayıb** |
| **OS — Radar + Qeydlər** | RainViewer yağış radarı (açarsız, krediti ilə; **keçmiş kadr = müşahidə, nowcast = proqnoz**, ikisi qarışdırılmır) · `/notes` təsərrüfat üzrə skautinq jurnalı — backend lazım idi, çünki `GET /api/scouting` `field_id` tələb edirdi (org-səviyyəli oxu yeni, sahə-səviyyəli **bayt-bayt eyni**) | `03eb081` | 🚀 |
| **A1 — Email-only qeydiyyat** | Qeydiyyat **tək sahədir** (email + bir düymə); ad/soyad/parol/ölkə/rayon çıxdı, hamısı `/account`-da istəyə bağlıdır | `786bb4d` | 🚀 **deploy doğrulanmayıb** |
| **A2 — Magic link** | Migration **0055** `login_tokens`: `token_urlsafe(32)`, DB-də yalnız **sha256**, 15 dəq, tək istifadə (atomik şərtli UPDATE). Endpoint həm signup həm login-dir və **eyni cavabı verir** (enumeration-a yaramır); bitmiş/xərclənmiş/etibarsız **tək fərqlənməyən xəta**. **Parol girişi toxunulmayıb.** Token **URL fraqmentində** gedir — `?token=` ilə hər girişdə nginx loguna iki dəfə yazılırdı | `786bb4d` | 🚀 |
| **A3 — Avtomatik sahə adı** | Ad server tərəfdə, advisory lock altında, **org daxilində**, mövcud adlardan törədilir (`count(*)` yox — soft-delete olunmuş «Sahə 2» adını təkrar verməsin) | `786bb4d` + `4f350c2` | 🚀 |
| **A4 — Tək göndərən** | 8 lokal personası → hər dildə **Ülkər Nəsirova `<ulkar@agradex.com>`**. ⚠️ Ünvan **tək oldu, amma hələ çatılan deyil** — agradex.com MX dərc etmir, cavablar bounce olur (→ **T32**) | `786bb4d` | 🚀 |
| **AI-1 — Bilik keşi oxunur** | Prod `ai_usage`-dən ölçülüb: `research` bütün AI xərcinin **58%-i** idi (6 iş × ~$0.38; advice ~$0.055). Səbəb model/prompt deyil — `kb.read_zone_blocks()` mövcud idi, orkestrator isə hər dəfə birbaşa `_synthesize_zone`-a gedirdi, yəni hər yeni sahə cədvəldə **onsuz da təzə** duran məzmunu yenidən sintez edirdi. İsraf sahə sayına yox, **QEYDİYYAT sayına** görə böyüyürdü. `index_norms` eyni formada idi (seed nüfuzludur → model pulu **atılacaq cavab** alırdı). İndi: yalnız **tam** blok dəsti hit, norms 180-günlük TTL, `zone:cached`/`index_norms:cached` | `7021a66` | 🚀 **ölçmə prodda, kod deploy-u doğrulanmayıb** |
| **AI-2 — Ölçmə düzəlişləri** | Migration **0056** `ai_usage.source` (`auto`/`user`/NULL — **backfill qəsdən yoxdur**) · qiymət cədvəli **tarixləndi** (`effective_from`; Sonnet 5 introductory tarifi **2026-08-31** bitir və $2/$10 → $3/$15 olur, sabit qalsaydı hər sonnet çağırışı 50% əskik hesablanacaqdı — sentyabr sətri **əvvəlcədən yazılıb**) · **web axtarış artıq hesablanır** ($10/1000, `max_uses=4` → research işinə ~$0.04) | `18113e3` | 🚀 |
| **AI-3 — Bake-off mexanizmi** | `tools/bakeoff.py` Anthropic-i **məcburi tool çağırışı** ilə ölçürdü (`input_schema` = ən yaxşı səy, `required` zəmanəti yox), prodakşn isə `messages.parse(output_format=…)` işlədir → qoşqu **məhsulun icra etmədiyi** yolu qiymətləndirirdi (təxminən hər 3 promptdan birində saxta «müqavilə pozuntusu»). SDK ilə yenidən: **9/9, sıfır pozuntu**; çıxış tokenləri də düşdü (Opus 2146→1565). Digər 3 provayder **qəsdən** xam HTTP-də qalır — o, onların əsl mexanizmidir | `decbdb2` | 🔨 (yalnız alət, prod yolu deyil) |

**Bu dalğanın miqrasiyaları:** `0055` `login_tokens` · `0056` `ai_usage.source`. **Hər ikisi əlavəedicidir və
köhnə image işləyərkən tətbiq oluna bilər, amma yeni image-dən ƏVVƏL tətbiq olunmalıdır** — yeni kod onlara
SELECT/INSERT edir. `update.sh` miqrasiya işlətmir.

---

### A.3 — 2026-08-04 dalğası (AI provayder keçidi + ikinci kəsim). Miqrasiya **0063**

> Bu dalğa iki ayrı şey etdi: **məhsulun AI mühərrikini dəyişdi** (Anthropic → DeepSeek mətn +
> Gemini görmə, sahibin qərarı) və **sahə səhifəsini bir daha daraltdı**. Üstünə üç ölçülmüş nasazlıq
> bağlandı: satılan diaqnoz kvotasını avtomatik etiketləmə yeyirdi, xəbərdarlıq heç vaxt bağlana
> bilmirdi, qiymət səhifəsi kodun saxlamadığı beş şey satırdı.
> Diapazon `580c22c..8247b39`. Sətirlər fayl yolu ilə göstərilib — bir dalğanın içində hansı
> sətrin hansı commit-də olduğu, faylın özündən daha az faydalıdır.

| Kod | Nə | Harada | Status |
|---|---|---|---|
| **AI-4 — DeepSeek/Gemini keçidi** | `LLM_PROVIDER=deepseek` · `LLM_MODEL=deepseek-v4-flash` · `VISION_PROVIDER=gemini`. `ai/llm.py` yenidən yazıldı: **model-prefiksinə görə marşrut**, **provayder-başına açar (çarpaz fallback YOX)**, ayrı `is_configured()`/`vision_available()`, açıq httpx timeout-ları + kor backoff, və sxem məcburiyyəti olmadığı üçün **məcburi tool çağırışı → JSON parse → Pydantic validate → məhdud repair retry** (həm cəhd sayı, həm **divar-saatı büdcəsi** ilə kəsilir). Yeni `LLMInvalidOutput` + `LLMTruncated`, hər ikisi `LLMUnavailable`-dan törəyir. `config.py` default-ları **qəsdən** `.env` ilə eynidir ki, kod məxfilik səhifəsi ilə ziddiyyət təşkil edə bilməsin | `services/app/ai/llm.py`, `services/app/config.py` | ✅ canlı ölçüldü |
| **AI-4a — İki reasoning tələsi** | Hər ikisi **canlıda tapıldı**: reasoning **default AÇIQdır**, ona görə (1) məcburi tool çağırışı `HTTP 400 "Thinking mode does not support this tool_choice"` verirdi, (2) düz mətndə düşüncə tokenləri **completion büdcəsindən** yeyilir və chat prompt-u `finish_reason=length`-ə çatıb 503 verirdi. İndi hər DeepSeek çağırışında **açıq söndürülür**; opt-in `DEEPSEEK_THINKING` | `ai/llm.py` (`thinking: {"type": "disabled"}`) | ✅ |
| **AI-4b — Görmə DeepSeek-ə getmir** | DeepSeek **heç bir endpoint-də** şəkil qəbul etmir: native API `image_url`-u 400 ilə rədd edir, Anthropic-uyğun endpoint isə bloku qəbul edib **HTTP 200** və hərfi `"[Unsupported Image]"` qaytarır — yəni yaşıl deploy + ölü funksiya + xəta yoxdur. `complete_vision_structured` deepseek üçün **bağlantı açmadan** atır | `ai/llm.py` | ✅ |
| **AI-4c — Ölçmə** | Eyni kod, eyni sahələr: **advice $0.05360 → $0.00089 (60×)** · **chat $0.04432 → $0.00105 (42×)** · chat gecikməsi **20.3s → 5.2s**. Gemini görmə: `gemini-flash-latest` və `gemini-3.6-flash` sxemə + enum-a əməl edir, `gemini-2.5-flash`/`gemini-3.1-pro` bu hesabda **404**. `tiers.py`-dəki per-tier `model` açarı **SİLİNDİ** (`model_for()` → None) | `ai/llm.py`, `tiers.py` | ✅ |
| **AI-4d — Məxfilik səhifəsi** | **9 dilin hamısı** iki subprosessoru adı ilə sadalayır, emal ölkəsini yazır, **heç bir fotonun DeepSeek-ə getmədiyini** deyir və üçüncü-ölkə ötürməsi qeydini xülasə qutusunda daşıyır | `app/src/app/privacy/legal/privacy.*.ts` | ✅ |
| **S2 — Sahə səhifəsinin ikinci kəsimi** | **16 → 12 → 10 bölmə.** AI composer `/chat`-ə köçdü (sahə səhifəsi ora **link** verir, `?ai=<fieldId>`) · iki hava bloku (əl ilə yağış jurnalı + illər-arası yağıntı qrafiki) və onların üç route-u getdi, **`/frost-dates` QALDI** · skautinq **XƏRİTƏSİ** getdi (qeyd forması + siyahı + geolokasiya düyməsi qaldı, pinlər toxunulmadı) · **ƏMƏLİYYATLAR** bölməsi + `routers/mgmt.py` + son yazıcısı `POST /api/bulk/operations` getdi · **SƏNƏDLƏR** bölməsi getdi, `routers/documents.py` **tək route-a soyuldu** (`GET /api/photos/{id}/download` — `PhotosTab` hər miniatürü ondan alır), `ai/receipt.py` silindi | `app/src/lib/fieldSections.ts`, `routers/weather_history.py`, `routers/documents.py`, `routers/bulk.py` | ✅ canlı |
| **S2 mühakimə** | ⚠️ **`81660df`-in «operations AI girişidir, ona görə QALIR» qərarı ƏVƏZ OLUNDU.** ⚠️ **Cədvəllər DROP EDİLMƏYİB, miqrasiya yoxdur** — `field_operations`, `field_documents`, `field_rain_log` yerindədir; `field_weather_daily`-ni hələ `ai/season.py` oxuyur. Eyni naxış (subsidiya → ERP → bu) — **→ T36** | — | ✅ |
| **B — Mövsüm AI xülasəsi** | `ai/season_summary.py` + `SeasonSummaryCard.tsx` + `GET/POST /api/fields/{id}/season-summary[/generate]`. **Dörd rejim:** `none`/`single` **LLM çağırmır** (bir mövsüm üzərində müqayisə çətin sual deyil, **mümkünsüz** sualdır — model yenə cavab verir, müqayisə qrammatikasında) · `pair` fərqə icazə verir, **trend dilini qadağan edir** · `multi` (3+) hər ikisinə. Cari mövsüm **konstruksiyaya görə yarımçıqdır** → `partial`+`through_doy` həm faktlarda, həm prompt qaydası kimi. Keş `field_knowledge`, `block_type='season_summary'`, `input_hash` ilə — **GET heç vaxt LLM xərcləmir**. Kvota advice büdcəsinə qatılır | `ai/season_summary.py`, `routers/seasons.py` | ✅ canlı |
| **B — Mövsüm feature-lərinin backfill-i** | ⚠️ `field_season_features` yalnız cari ili saxlayırdı (aylıq cron yalnız onu hesablayır) — **2021-2025 əl ilə** `POST /api/internal/season/compute?season_year=YYYY` ilə dolduruldu. İstinad sahə «fındıq bağım» indi **altı mövsüm** daşıyır və **2022 gözlə görünən pis ildir** (inteqral 81.6 vs ~200) | `routers/internal.py::compute_season` | ✅ ölçüldü |
| **C — Mesajlar (əvvəl «İcma»)** | `/chat` hər yerdə **«Mesajlar»** (açar adları saxlanıldı, yalnız dəyər dəyişdi). **Agradex AI SİNTETİKDİR** — `public.users`-də sətri yoxdur (real sətir kataloqda görünərdi, yad adamlar yaza bilərdi, email istəyərdi, statistikaya düşərdi), `public.conversations`-da da yoxdur (`_assert_participant` guard-ı boşaldılmalı olardı); `ASSISTANT_ID` **uuid deyil** ki, real hesaba ünvanlana bilməsin. Yeni **`GET /api/chat/directory`** | `routers/chat.py` | ✅ |
| **C — Kataloq mənbəyi** | Təchizatçılar `users`-dən **ROLA** görə gəlir, `provider_profiles`-a **LEFT JOIN** ilə: həmin cədvəldə istehsalatda **sıfır sətir** var, halbuki altı lab/konsultant/təchizatçı hesabı mövcuddur — yalnız profildən oxumaq **boş ekran** deploy etmək olardı. Fermerlər caller-in öz məhsul/regionlarına scope olunur, adlar `public_display_name`-dən keçir, fermer yarısı **caller-in fermer olmasına** gate-lənir (əks halda təchizatçı öz qeydiyyat regionundakı fermerləri sadalayardı) | `routers/chat.py::directory` | ✅ |
| **E — Foto kvota deşiyi bağlandı** | Avtomatik etiketləmə **HƏR yükləmədə**, tier yoxlaması olmadan işləyirdi və `kind="photo"` yazırdı — **ödənişli diaqnozun gate olduğu eyni sayğac**. Qalereyanı doldurmaq qiymət səhifəsinin satdığı **30 diaqnozu** xərcləyirdi, free/pro isə tier-lərində olmayan funksiya üçün ödəyirdi. İndi öz limiti (`photo_label_per_month`, Business 60) + öz kind-i; `/soil-lab` **`soil_lab_per_month`** aldı (Business 10, əvvəl **limitsiz**); **üç görmə route-u da `vision_available()`-ə** gate olunur; `except Exception: pass` **getdi** | `routers/photos.py`, `routers/fields.py`, `tiers.py` | ✅ |
| **F — Xəbərdarlıq bağlana bilir** | Migration **0063**. `alert_state.active` hər atəşdə true olurdu, **heç vaxt geri qayıtmırdı və heç kim oxumurdu** — ona görə «bu şərt hələ də doğrudurmu» sualı cavabsız idi və dashboard plitəsi «Yeni xəbərdarlıq» adlandırılıb **oxunmamış bildirişlərə** yönəldilmişdi. 0063: `last_match_at`/`last_clear_at`/`clear_streak`/`resolved_at`/`source`; **üç nəticə**, və həll **STREAK** tələb edir (`CLEAR_STREAK_TO_RESOLVE=2`) ki, sərhəddə salınan hədd nişanı yandırıb-söndürməsin. Yeni `routers/notifications.py` → `GET /api/alerts/summary` | `db/migrations/0063_alert_resolution.sql`, `rules/engine.py`, `routers/notifications.py` | ✅ canlı (bir run: evaluated 6, cleared 1, resolved 0) |
| **F — YÜK DAŞIYAN QAYDA** | **SÜBUTUN YOXLUĞU HƏLL DEYİL** — mühərrikin **qiymətləndirə bilmədiyi** qayda (səhnə yox, proqnoz yox, emal olunmamış sahə) **toxunulmadan** qalır: nə təsdiqlənir, nə həll olunur. Oxu modelinin üç cavabı var: `open` · `resolved` · `unconfirmed`. Backfill **QƏSDƏN yoxdur** — mövcud sətirlərin hamısı `unconfirmed`-ə düşür, çünki dürüst oxunuş budur | `0063` başlığı + `routers/notifications.py` | ✅ doğrulandı |
| **G — Qiymət səhifəsi düzəlişi** | Kodun saxlamadığı **beş ödənişli vəd** silindi: email + WhatsApp bildiriş pillələri (**belə kanal yoxdur** — `messaging/` yalnız `telegram.py`), çiləmə pəncərəsi və suvarma balansı (**hər ikisi pulsuzdur**), «+ NDRE / CIre» (indekslər heç yerdə gate olunmur). **Güzgü səhvi də düzəldildi:** foto diaqnoz, gübrə kalkulyatoru, regional benchmark və zərərverici pasportu **canlı olduğu halda «tezliklə»** yazılırdı. Test docstring-ə yazıldı: **bayrağın adı ilə `allows(` axtar** | `tiers.py`, `app/src/lib/pricing.ts` | ✅ |
| **H — Sağlamlıq skoru gündəlik süpürülür** | `deploy/refresh-wellness.sh`, cron `20 4 * * *`. Sahə səhifəsi skoru **baxışda** hesablayırdı, siyahı isə **saxlanmış son sətri** oxuyurdu — canlıda bir sahə eyni anda siyahıya **89**, öz səhifəsinə **70** verirdi (89 iki günlük idi). Gündəlikdir, səhnə başına deyil: su və GDD komponentləri hava dəyişən hər gün tərpənir | `deploy/refresh-wellness.sh` | ✅ |
| **H — Advice seçimi dil-şüurludur** | `GET /advice` artıq **oxucunun dilindəki ən yeni sətri** seçir (bir i18n test run-ı üç dəqiqədə bir sahəyə **yeddi dildə yeddi analiz** yazmışdı); dil yoxdursa yad dildəkinə düşür və `lang_mismatch`+`newer_other` qalır. Ən yeni sətir onsuz da oxucunun dilindədirsə **ikinci sorğu getmir**. Eyni tərcih `ai/context.py`, `ai/chat.py` və həftəlik digest-də | `routers/advice.py`, `ai/emails/weekly.py` | ✅ |
| **H — Kiçik düzəlişlər** | Mesaj sıralamasına **determinist tiebreak** (sual və cavab `created_at`-i mikrosaniyəyə qədər paylaşır) · məhsul açarları **iki yerdə** xam i18n açarı kimi sızmağı dayandırdı · marketinq mətni **9 yerdə** təsərrüfat dəftərini vəd etməyi dayandırdı · «hər yeni peyk səhnəsindən sonra» **real 15 günlük throttle**-a düzəldildi | `routers/chat.py`, `app/src/lib/i18n.ts`, `ai/advice.py` | ✅ |

**Bu dalğanın miqrasiyası:** yalnız `0063`. **Əlavəedicidir və image-dən ƏVVƏL tətbiq oluna bilər** —
işləyən image `alert_state`-ə açıq sütun siyahısı ilə insert/select edir, ona görə yeni sütunları nə
yazır, nə oxuyur. Default-lar sabitdir → cədvəl yenidən yazılmır, yazı yolu bloklanmır.
⚠️ **`.env` dəyişikliyi var** (`LLM_PROVIDER`, `LLM_MODEL`, `VISION_PROVIDER`, `DEEPSEEK_API_KEY`,
`GEMINI_API_KEY`) — `docker restart` **kifayət deyil**, konteyner yenidən yaradılmalıdır
(`bash deploy/update.sh`). **Yeni cron sətri:** `20 4 * * * … deploy/refresh-wellness.sh`.

---

## B. Bloklanıb — istifadəçi addımı lazımdır (⏳)

| # | Task | İstifadəçi nə edir | Mən nə edirəm | Prioritet | Status |
|---|---|---|---|---|---|
| U1 | **EARTHDATA_TOKEN yenilə** (2026-08-30 bitir ⚠️) | urs.earthdata.nasa.gov → yeni bearer → `.env`+`.bak` → restart | Swap sonrası HLS COG 200 yoxla | **Yüksək** | ⏳ |
| U2 | **Köhnə Anthropic açarını LƏĞV ET** (bir dəfə açıq görünüb) ⚠️ **task dəyişdi:** §A.3-dən sonra məhsul artıq o açarı işlətmir (DeepSeek + Gemini), yəni **rotate lazım deyil — ləğv lazımdır**; açar hələ etibarlıdır və heç nəyi qorumur | console.anthropic.com → köhnə açarı revoke; `.env`-dən `LLM_API_KEY` sətrini təmizlə → `bash deploy/update.sh` (restart KİFAYƏT DEYİL) | — | **Yüksək** | ⏳ |
| U3 | ~~**Email/OTP (Resend)**~~ — **BİTDİ 2026-07-25** | `RESEND_API_KEY` + `EMAIL_FROM` `.env`-dədir, agradex.com Resend-də verified | Email AKTİV: OTP + welcome + data_ready + həftəlik digest (E15). ⚠️ `.env`-də boşluqlu dəyər **dırnaqda** olmalıdır — `update.sh` faylı source edir | **Yüksək** | ✅ |
| U4 | **Telegram bot token** (→ T22) | @BotFather → `TELEGRAM_BOT_TOKEN`/`_USERNAME`/`_WEBHOOK_SECRET` → sonra `POST /api/internal/telegram/setup` | **✅ KOD HAZIR (f71d1b8):** 0024 messaging_channels/message_log; telegram.py; /messaging/telegram + /telegram/webhook; dispatcher delivery; TelegramConnect kartı. Tokensiz dormant. | **Yüksək** | ⏳ token gözləyir |
| U5 | ~~**app.agradex.com**~~ — **BİTDİ 2026-07-25** | CF A-record qoyuldu | Split AKTİV: `NEXT_PUBLIC_PANEL_HOST=app.agradex.com` + `COOKIE_DOMAIN=.agradex.com`; apex=marketinq, app=tətbiq. Bu dalğada üstünə: `x-app-host` header ilə **server-tərəfli** host həlli (6bf36a6) + public linklər apex üzərindən (fc3f9c7) | Orta | ✅ |
| U6 | **EPPO_TOKEN** (→ T9 pest datası) | data.eppo.int Data Portal hesabı → `EPPO_TOKEN` | ⚠️ köhnə API 2026-09-01 bağlanır → yeni Data Portal adapter | Orta | ⏳ |
| U7 | **Billing PSP** (Payriff/Stripe) | Payriff merchant → `PAYRIFF_SECRET_KEY`, PSP seç | payments + checkout/callback + autoPay cron + hectare_cap | Orta | ⏳ |
| U8 | **2FA + Tier-2 firewall** | Hetzner+CF 2FA; origin-IP CF aralığı qərarı | — (UFW+fail2ban var) | Orta | ⏳ |
| U9 | **WhatsApp Business API** (T22 2-ci kanal) | Provayder + per-mesaj ödəniş | Telegram-dan sonra 2-ci kanal | Aşağı | ⏳ |
| U10 | **Xudat crop_type=fındıq** (demo data) | UI-dən dəyiş (yoxsa M5/E0 generic, saxta "Zəif") | İstəsən DB update | Aşağı | ⏳ |
| U11 | **Canlı smoke-test** ⚠️ **yenidən yazıldı 2026-08-04**: köhnə mətndəki «16 bölmə», «12 bölmə» və «`/farm?tab=` 4 bölmə» **artıq mövcud deyil** | Brauzer: `?tab=status` (FieldPulse + SatelliteGlance + SignalsActions) · 3 qrup / **10 bölmə** menyusu · `?tab=operations` və `?tab=documents` səssizcə **status**-u açmalıdır · `/farm` və `/reports` **404** · sahə analizindən `/chat?ai=…`-ə ötürmə + orada sancılmış **Agradex AI** sapı · hava bölməsində **yağış jurnalı və illik qrafik olmamalıdır**, frost tarixləri **olmalıdır** · skautinq: xəritə yox, geolokasiya düyməsi var · foto yükləyəndə **diaqnoz sayğacı tərpənməməlidir** · qiymət səhifəsində email/WhatsApp/«+NDRE» **yoxdur**, foto diaqnoz və gübrə **«tezliklə» YAZMIR** · desktop sidebar 2xl-də etiketlənir və 1280px-də sahə səhnəsi ≥760px qalır · qrafik panelində proqnoz varkən «1H» **sönmür** · telefonda 5 tab + xəritə-ana-səhifə · sahə vahidi seçicisi · RU/EN cəm başlığı | Kod `main`-dədir; §A.2-də 🚀 olan hər sətir həm **deploy**, həm vizual yoxlama gözləyir | **Yüksək** | ⏳ |
| U12 | **Kadastr + EKTIS/eagro.az + D3 L3** (→ T25) | Dövlət WMS/WFS/AKTA razılaşma + L3 kommersiya təsdiq | Yalnız texniki infra (giriş sonrası) | Aşağı | ⏳ |
| U13 | ~~**Google ilə giriş**~~ — **BİTDİ 2026-08-01** | Açarlar `.env`-də; Google konsolunda redirect URI qeydiyyatdan keçib və tətbiq **In production**-dadır (canlı yoxlanıldı: `redirect_uri_mismatch` yox, `access_blocked` yox) | **✅ CANLI** (`645b2ed` + 0062). `providers` → `google:true`, `/google/start` → 302, düymə 8 dildə render olunur, `_safe_next()` açıq yönləndirməni bağlayır, callback 3 xəta halını `?err=` ilə qaytarır. ⚠️ **Qalıq: məxfilik siyasəti 8 dildə Google-u data emalçısı kimi əlavə etməlidir** | **Yüksək** | ✅ |

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
| **T7** | PDF/çap hesabatı | §17 | backend/reports | L | — | — | ✅ **QAYITDI** (`b5b9cec`, 2026-07-31) — ERP yarısı olmadan. Aşağıdakı köhnə qeyd `81660df` dövrünə aiddir: ❌ **sadələşdirmə ləğv etmişdi** (`81660df`) — `routers/reports.py` (1027 sətir) və `/reports` səhifəsi silindi, çünki mənbələri (dəftər/satış/tapşırıq/məhsuldarlıq) getdi. `public.reports` cədvəli **dormant** qalır. Yenidən açmaq = əvvəl hesabatın nəyi oxuyacağına qərar vermək |
| **T8** | Tam FAO-56 suvarma cədvəli | **E5** / B2 | ai/weather | L | 🟡 | T4, E1 | ✅ a1d4476 |
| **T9** | Pest-risk engine (GDD + leaf-wetness) | **E4** / B1 | ai/model | L | 🟡 | T4, T1 (data U6) | ✅ 0d760c5 |
| **T10** | D2 benchmark hardening (p10/50/90 + k-anon n≥5 + consent) | **E10** / D2 | analytics | M | 🟡 | yox | ✅ eba27c6 |
| **T11** | Gübrə plan engine (N-P-K balans + splits) | **E9** / C7 | ai/agro | L | 🟡 | AZ katalog | ✅ 4594a3e |
| **T12** | PWA/offline sahə rejimi (web-push təxirə) | **E8b** / C4 | frontend/pwa | L | 🟡 | yox | ✅ 8d5d46f |
| **T13** | MetadataTab region → ölkə/rayon dropdown | UX | frontend/ux | S | 🟡 | yox | 🚀 0eafc89 |
| **T14** | ~~Subsidiya: tarixçə UI + region/suvarma prefill~~ | §30.7 | subsidy | S | — | — | ❌ **subsidiya modulu məhsuldan çıxarıldı** (v1.12.0) — task predmetsizdir |
| **T15** | Səsli skautinq (STT + LLM struktur + audio fallback) | **E12** / C5 | ai/voice | M | ⚪ | STT hosting qərarı | ⬜ |
| **T16** | ~~NDVI-inteqral ↔ məhsuldarlıq korrelyasiya~~ | analytics | analytics/yield | S | — | — | ❌ **sadələşdirmə ləğv etdi** (`81660df`) — feature-store hissəsi ✅ qurulub və `compute-season-features.sh` cron-u işləməyə davam edir, amma **məhsuldarlıq girişi silindi** (`YieldsTab` + `mgmt.py` yields yolu), yəni korrelyasiyanın hədəf dəyişəni artıq toplanmır. Model predmetsizdir; feature-lər AI kontekstinə qalır |
| **T17** | Research → crop_thresholds.index_norms write-back + mövsümi auto-enqueue | knowledge | ai/knowledge | M | ⚪ | yox | ✅ 6212fa7 (guarded upsert + seasonal endpoint; canlı) |
| **T18** | Çoxdilli lokalizasiya (§25 RU daxil) | §25 | i18n | M | ⚪ | yox | 🚀 **8 lokal canlı** (az/en/ru/tr/de/hu/it/pl) + path-prefix + switcher + hreflang. Bu dalğada bağlandı: `lib/pricing.ts` (`nameKey`/`periodKey`), `azError()` → `app.err.*` açarları, backend prozası CODE+PARAMS (P0.2), AI məsləhətin dili (P0.3), `X-Locale` başlığı. **Qalıq (kod ilə yenidən ölçülməlidir, köhnə siyahını kopyalama):** prose mühərrikləri `insights.ts`/`indexStatus.ts` + `metadataOptions`. Bax [[i18n-architecture]] Server-Component gotcha |
| **T19** | Shapefile import/export + rəngli annotasiya + ScaleControl | map | frontend/map | S | ⚪ | yox | 🚀 586efb7 (shapefile import + ScaleControl canlı; export & annotasiya təxirə) |
| **T20** | ~~VRA/idarəetmə zonaları + prescription export~~ | Faza3 | geo | L | — | — | ❌ **sadələşdirmə ləğv etdi** (`81660df` + `8f25630`) — A6 məhsuldarlıq zonaları (`routers/zones.py`, `ZonesTab`, `process-zones.sh`) silindi, `8f25630` isə **VRA-nı qəsdən qurmadı** («dəyişkən-doza funksiyası yoxdur, plitəni doldurmaq rəqəm uydurmaq olardı»). Yenidən açmaq = əvvəl zona hesablamasını bərpa etmək |
| **T21** | Qruplu Faza-3/4 (cost rollup · IoT · partner API · SAR · EUDR sənəd-gen) | platform | platform | XL | ⚪ | müxtəlif | ⬜ |
| **T22** | Bot kanalı (Telegram, bir-tərəfli alert) | **E3** / C2 | backend/bot | M | 🔴 | ⏳ U4 token | ✅ f71d1b8 (kod; token gözləyir) |
| **T23** | İki-tərəfli bot (sorğu/cavab) | **E6** / C2 | backend/bot | M | ⚪ | T22 | ⬜ |
| **T24** | Lab-analiz OCR yükləmə (soil_profiles, lab>manual>soilgrids) | **E1b** / D1 | ai/soil | M | 🟡 | T5 (vision) | ✅ ba497fe (vision OCR + precedence; canlı) |
| **T25** | D3 data qatı L1+L2 (consent/audit/k-anon infra) | **E11** / D3 | analytics | L | ⚪ | T10, U12 | ⬜ |
| **T26** | İcma forumu / Q&A (Telegram-qrup MVP) | **E12** / C6 | community | M | ⚪ | T22 (infra) | ⬜ |
| **T27** | Cəm səthləri | i18n | frontend/i18n | S | 🟡 | yox | ✅ **2026-08-01** — ⚠️ köhnə mətndəki 4 səth **YANLIŞ idi**: «satış qeydləri» sadələşdirmə ilə silinib, «paylaşma baxışları/qonşu fermerlər/yağış günləri» üçün açar heç istifadə olunmurdu. ru/pl lüğətlərini tam skan etdim: əsl problem **kiçik n** olan 2 səthdir — `app.wl.pest.active` (1-5 risk pəncərəsi) və `onb.check.profileHint` (1-5 boş xana). Hər ikisi `tp()`-yə keçdi, cəm forması **bütöv isim qrupunu** (sifət + lazım olanda felə) daşıyır. Qalanlar ya **sabit n**-dir (`notes.capped`=100, `weatherCoverage`=12, magic link=15 dəq), ya da tərcüməçi onsuz da ikinöqtə/mötərizə ilə həll edib |
| **T28** | Həftəlik digest tərcümə borcu | E15/i18n | backend/email | S | 🟡 | yox | ✅ **2026-08-01** — `WEEKLY_EXTRA`-ya tr/de/hu/it/pl əlavə edildi (4 variant × 6 sahə = 120 sətir). `_LABELS` onsuz da 8 dildə idi (`e48b8fa`). Ton hər dilin öz konvensiyasına uyğundur: de/hu/tr rəsmi, it/pl qeyri-rəsmi. İmza açarı **mütləq mövcud olmalıdır** — `catalog.build()` imzanı ƏVƏZ edir, YARATMIR |
| **T29** | ~~`POST /api/auth/onboarding` frontend-də çağırılmır~~ | E13 | frontend/backend | S | 🟡 | yox | ✅ **HƏLL OLUNUB — task səhv yazılmışdı.** Kodla yoxlanıb (2026-07-30): iki çağıran var — `landing/OnboardingQuiz.tsx` (daxil olmuş ziyarətçi quizi təkrar keçəndə, `20615d5`, **roadmap sətri ilə eyni gün**) və `auth/carryQuiz.ts` (`786bb4d`, magic-link sessiyası yaranandan sonra). `OnboardingQuiz.tsx`-in şərhi niyə **yalnız landing-də** olduğunu izah edir: `localStorage` origin başınadır, quiz apex-də yazılır, app host-da `loadAnswers()` **həmişə null**-dır — «app açılışında süpür» çağıranı konstruksiyaya görə ölü kod olardı |
| **T30** | Digest AI məsləhətinin dili | E15/P0.3 | backend/email | S | 🟡 | 0049 | ✅ **`e48b8fa` (2026-07-31)** — `_advice()` artıq `order by ... (lang = $3) desc, generated_at desc` işlədir: oxucunun dili **rekordluqdan üstündür**. Dili olmayan oxucu boş bölmə əvəzinə yad dildə mətn alır — bu, kodda **qəsdən** yazılmış güzəştdir |
| **T31** | `HLS_ENABLED` **"bir-boolean rollback" DEYİL** (dead-end): `sensors.ts`-dən kənarda `HLS_ENABLED`/`UI_SENSORS`/`sensorVisible()` heç yerdə istifadə olunmur; səhifə `sensor="S2"` hard-code edir, `SECTION_GROUPS`-da HLS bölməsi yoxdur. Ya rollback-ı doğrudan bağla, ya da şərhdəki iddianı düzəlt | E14 | frontend | S | ⚪ | yox | ✅ **2026-08-01 — iddia düzəldildi.** `sensors.ts` başlığı indi rollback üçün əlavə **3 şeyi adı ilə sadalayır** (bölmə girişi, `app.sensor.hls.*` açarları, sensor seçicisi) — heç biri bu flaqı oxumur. Bayraq da tam ölü qalmadı: səhifə `sensor="S2"` hard-code etmək əvəzinə `UI_SENSORS[0]` oxuyur. **Silinmiş UI-ni bayraq arxasında bərpa etmək qəsdən edilmədi** — HLS-in çıxarılması məhsul qərarı idi (E14.3) |
| **T32** | **`ulkar@agradex.com` cavab qəbul etmir** — `786bb4d` göndərəni təkləşdirdi, amma `notify.py` başlığı açıq yazır ki, agradex.com **MX dərc etmir**: fermerin welcome/digest məktubuna cavabı bounce olur. Poçt qutusu + MX qeydi lazımdır (istifadəçi addımı, sonra kod tərəfdə heç nə) | E15/A4 | infra/email | S | 🔴 | istifadəçi (DNS) | ⬜ |
| **T33** | ~~Bake-off nəticəsinə görə qərar (Batch API / tier-model)~~ | AI/cost | ai | M | — | — | ❌ **§A.3 predmetini apardı.** Qərar tam başqa istiqamətdə verildi: mühərrik Anthropic-dən **DeepSeek v4-flash**-a keçdi və eyni kod üzərində ölçülən xərc **60× (advice) / 42× (chat)** düşdü. Batch API-nin 50% endirimi bu rəqəmlərin yanında mənasızdır, tier-model seçimi isə artıq **mövcud deyil** (`tiers.py`-dəki `model` açarı silindi, hər yerdə tək model). `ai_usage.source` (0056) faydalı qalır — ölçmə üçün, qərar üçün yox |
| **T34** | ~~Sonnet 5 qiymət artımı 2026-08-31~~ | AI/cost | ai | S | — | — | ❌ **Predmetsiz** — məhsul artıq Sonnet işlətmir (§A.3). `ai/pricing.py`-dəki tarixli sətirlər **qalır və qalmalıdır**: `ai_usage`-dəki tarixi Anthropic sətirləri düzgün qiymətlənsin deyə. Anthropic-ə qayıtsaq bu task da qayıdır |
| **T35** | **Silinmiş ERP cədvəllərinin taleyi** — `81660df` 8 router və bütün UI-ni sildi, **cədvəllər isə qəsdən qaldı** (dəftər/satış/anbar/texnika/zonalar/tapşırıq/məhsuldarlıq + 0008 `subsidy_*`). Qərar tələb edir: dormant qalsın (cari vəziyyət), arxivləşdirilsin, yoxsa drop olunsun. **Qərarsız drop ETMƏ** — bu, geri-qaytarıla bilən olmaq üçün belə saxlanılıb. ⚠️ **T36 ilə birlikdə qərar veriləsi** — indi üç nəsil yatmış cədvəl var | S1 | db | S | ⚪ | sahib qərarı | ⬜ |
| **T36** | **Dormant cədvəllərin ÜÇÜNCÜ nəsli** (§A.3) — `public.field_operations`, `public.field_documents`, `public.field_rain_log`. UI və route-lar 2026-08-04-də getdi, **cədvəllər və disk faylları qaldı**: yüklənmiş hər lab hesabatı, kadastr çıxarışı, müqavilə və qəbz hələ `settings.object_storage_root` altındadır. Geri açmaq **miqrasiya deyil**, endpoint-ləri köhnə adları ilə bərpa etməkdir. ⚠️ `public.field_weather_daily` **bu siyahıda DEYİL** — onu hələ `ai/season.py` oxuyur (mövsüm yağıntısı + provenansı), yəni canlı asılılıqdır | S2 | db | S | ⚪ | sahib qərarı (T35 ilə birlikdə) | ⬜ |

### C.1 Task detalları (niyə / harada — kod ilə yoxlanmış)

- **T0** — 0009 `data_status` enum-da 'partial' yox, `first_scene_at` yox; tam-ekran banner 60-günlük tarix bitənə qədər xəritəni bloklayır. Ən böyük aktivasiya quick-win.
- **T1** — `internal.py` POST /rules/run → 501 'rules_phase_2'; `services/app/rules/` yoxdur; hava alertləri `ai/weather.py`-də hardcoded. Engine + dedup(field_id+type) + dispatch. **Digər alertlər üçün təməl.**
- **T2** — yalnız hava (frost/heat/wind) bildiriş göndərir; vegetasiya tərəf tam yoxdur. Rules engine-in ilk istehlakçısı.
- **T4** — `gdd_base_c` crop_thresholds-də seed + load olunur, amma heç yerdə Σ yox. Fenologiya/yield/pest/FAO-56 üçün paylaşılan asılılıq. Open-Meteo ARCHIVE (pulsuz, açarsız).
- **T5** — `ai/`-də vision kodu yoxdur (grep təmiz); `uploads.py` yalnız fayl saxlayır. `llm.complete_vision` + `ai/diagnose.py` + endpoint → `scouting_observations.diagnosis`. **Qayda 7** (problem tipi + qeydiyyatlı-siyahı göstərici + aqronom referral, pestisid dozası YOX). Ən güclü kiçik-fermer cəlbetmə qarmağı.
- **T6** — `geo_pipeline/README.md` açıq "Phase 2" deyir; fenologiya yalnız LLM mətnidir, growth_stage əl ilə. Temporal baseline (p10/median/p90) + z-score + Savitzky-Golay → avto growth_stage.
- **T7** — ✅ **QAYITDI 2026-07-31** (`b5b9cec` + `60761bf`). Aşağıdakı sual ("hesabat indi nəyi oxuyacaq?") cavablandı: sahə pasportu + son 10 mövsüm + 60 əməliyyat + 60 skautinq qeydi + S2 NDVI/NDMI seriyası + sağlamlıq balı + ən son AI rəyi (risklər/tövsiyələr/addımlar). Köhnə qeyd tarixi kontekst üçün saxlanılır: ❌ **Çıxarılmışdı.** `81660df` `routers/reports.py`-ı (1027 sətir) və `/reports` səhifəsini sildi: onlar dəftər/satış/tapşırıq/məhsuldarlıqdan oxuyurdu, o dördü isə eyni commit-də getdi — saxlamaq **boş hesabat göndərmək** olardı. `public.reports` (0005) və business-tier flag **dormant** qalır. Yenidən açmaq üçün əvvəl sual: hesabat indi **nəyi** oxuyacaq (peyk trendləri + AI məsləhət + əməliyyat jurnalı?).
- **T8** — `weather.py` yalnız kobud 7-günlük net-need (ΣET0·Kc−yağış). Günlük depletion balans + mm+tarix + NDMI cross-check clarification + "Hesablamanı gör" panel.
- **T9** — yalnız tiers.py flag; pest_risk_models/field_gdd_daily/pest_risk_events/field_pest_mutes yox. Engine (scoring/cooldown/hysteresis/"yoxdur" mute) indi qurulur, model datası U6 EPPO gözləyir. **Qayda 7.**
- **T10** — `index_benchmark` (0010) yalnız orta qaytarır; p10/p50/p90 yox, HAVING n≥5 yox, consent yox, fenologiya kohortu yox. k-anon **HARD-CODED** olmalı. Endpoint-i tier-ə gate et.
- **T11** — yalnız `fertilizer_history` sərbəst mətn + flag; crop_nutrient_norms/fertilizer_plans/splits yox. N-P-K core indi; AZ məhsul kataloqu sonra.
- **T12** — manifest/service-worker/next-pwa/IndexedDB yoxdur (grep təmiz). Serwist SW + IndexedDB outbox (skautinq/foto/əməliyyat) + tile keş + web-push (VAPID).
- **T13** — MetadataTab hələ sərbəst `AutoField`; `regions.ts` (66 rayon) onboarding-də işləyir — sadəcə təkrar istifadə.
- **T14** — ❌ **Çıxarılıb.** Subsidiya kalkulyatoru v1.12.0-da məhsuldan silindi (frontend + `services/app/routers/subsidy.py`); `/api/subsidy/*` artıq 404 qaytarır. 0008 `subsidy_*` cədvəlləri qəsdən **dormant** saxlanılıb (drop olunmayıb) — ona görə "cədvəllər silindi" yazmaq da yanlışdır. Task predmetsiz olduğu üçün bərpa edilmir, ancaq konvensiya üzrə görünür qalır.
- **T15** — səs/STT kodu yoxdur; AZ STT keyfiyyəti risk (audio-save fallback saxla).
- **T16** — ❌ **Çıxarılıb.** Feature-store hissəsi qurulub və işləyir (`field_season_features`, 0028; `compute-season-features.sh` aylıq cron — **silinmədi**), amma `81660df` `YieldsTab`-ı və `mgmt.py`-nin yields yolunu sildi, yəni korrelyasiyanın **hədəf dəyişəni artıq toplanmır**. Model «≥3 mövsüm gözlə» səbəbindən yox, **girişi olmadığı üçün** predmetsizdir. Feature-lər AI kontekstinə faydalı qalır.
- **T17** — index_norms seed-provisional qalır; research zone_knowledge yaradır amma crop_thresholds-a write-back yox (grep təmiz). + mövsümi cron auto-enqueue (process-research.sh yalnız drain edir).
- **T18** — 8 lokal canlıdır (`i18n.ts` `LOCALES`); `i18n.ts`-in 1-ci sətri hələ "Default and only locale for now" yazır — kod şərhidir, sənəd deyil, amma yanıldıcıdır. **Tələ (kod ilə yoxlanmış):** faylın SONUNCU `};` az lüğəti yox, `DICTS` registrisidir — ora açar əlavə edən skript modulu sındırır (8c38e8b belə sındı, yalnız serverin `docker build web`-i tutdu, çünki bu Mac-da node yoxdur). Yeni cəm açarı əlavə edərkən `<base>.other` **az obyektinin içinə** getməlidir (I18nKey oradan törəyir), `few/many` isə `Dict`-in `PluralForms` genişlənməsindən asılıdır (84e5f28).
- **T27** — `tp(base, n)` + `Intl.PluralRules` artıq `i18n.ts`-dədir və 2 yerdə işlənir (`/fields` başlığı, `TodayHome`). 34b0f79 commit mətni eyni qüsurlu 4 səthi adı ilə sadalayır: **satış qeydləri, paylaşma baxışları, qonşu fermerlər, yağış günləri**. Say + tək sabit isim yalnız az/tr-də doğrudur; en/de `one/other`, ru/pl üç forma istəyir.
- **T28** — `catalog.py::_payload` locale → en → az gəzir, ona görə sınmır, sadəcə **ingiliscə** göndərir. İki yer birlikdə doldurulmalıdır: `catalog_i18n.WEEKLY_EXTRA` (digest çərçivəsi) və `weekly.py::_LABELS` (data-formalı sətirlər). `weekly.py` şərhi hələ "AZ and EN are hand-written" deyir — 76abcb5-dən sonra köhnəlib (ru da yazılıb). Qeyd: `catalog_i18n.SIMPLE_EXTRA`-da silinmiş 11 şablonun tr/de/hu/it/pl mətni (~900 sətir) **ölü data** olaraq qalır — canlı şablon siyahısı kimi oxuma.
- **T29** — ✅ **Task səhv idi, kod deyil.** 2026-07-30-da grep ilə yoxlanıb: `POST /api/auth/onboarding`-in **iki** frontend çağıranı var — `components/landing/OnboardingQuiz.tsx` (`20615d5`, roadmap sətri ilə eyni gün yazılıb, ona görə sətir doğulanda artıq köhnə idi) və `components/auth/carryQuiz.ts` (`786bb4d`, magic-link sessiyası yaranan kimi). `_apply_onboarding_to_fields()` beləliklə işləyir. `OnboardingQuiz.tsx`-dəki şərh **niyə yalnız landing-də** olduğunu da izah edir: `localStorage` origin başınadır, quiz apex-də saxlanılır, `app.agradex.com`-da `loadAnswers()` **həmişə null** qaytarır — «app açılışında süpür» çağıranı **konstruksiyaya görə ölü kod** olardı, əlavə etmə.
- **T30** — `weekly._advice()` `distinct on (field_id) … summary, findings` seçir, `lang` predikatı yoxdur, xülasə birbaşa email-ə yerləşdirilir. 0049 mövcud sətirləri `'az'` ilə backfill etdiyi üçün RU/EN oxucu digest içində AZ proza görə bilər. Sahə səhifəsində bu `lang_mismatch` + `AdviceLangNote` ilə həll olunub — email-də olunmayıb.
- **T31** — `sensors.ts:9-12` şərhi `HLS_ENABLED`-i "owner-in istədiyi bir-boolean rollback" adlandırır, amma grep göstərir ki, `HLS_ENABLED`/`UI_SENSORS`/`sensorVisible()` **fayldan kənarda istehlak olunmur**: `fields/[id]/page.tsx` `<SatelliteTab sensor="S2" />` hard-code edir və `SECTION_GROUPS`-da HLS bölməsi yoxdur. Həqiqi rollback üçün `fieldSections.ts`-də bölmə girişi + ikinci `SatelliteTab` nüsxəsi lazımdır. **Data qatına toxunma** — pipeline/cron/benchmark/A8/A6 hələ HLS oxuyur, `sensorFamily()` 's30'/'l30'-u həll etməyə davam etməlidir. ⚠️ Bu bənddəki «A6» istinadı köhnəldi — A6 zonaları `81660df`-də silindi; qalan HLS oxucuları pipeline/cron/benchmark/A8-dir.
- **T32** — `services/app/ai/notify.py` başlığı `786bb4d`-də açıq yazır: dəyişiklik ünvanı **təkləşdirdi, amma çatılan etmədi** — agradex.com MX dərc etmir, ona görə `ulkar@agradex.com`-a gələn cavab bounce olur. Bu, tam **istifadəçi/DNS addımıdır** (poçt qutusu + MX qeydi); kod tərəfdə heç nə lazım deyil. Fermer welcome və ya həftəlik digest məktubuna cavab yazanda hazırda **heç kim görmür**.
- **T33/T34** — ❌ **Hər ikisi §A.3-də predmetsiz qaldı.** Ölçmə borcu (`18113e3` + `decbdb2`) qərar borcunu doğurmuşdu; qərar isə tam başqa istiqamətdə verildi — **provayder dəyişdi**. Eyni kod, eyni sahələr üzərində ölçülən nəticə: advice **$0.05360 → $0.00089**, chat **$0.04432 → $0.00105**, chat gecikməsi **20.3s → 5.2s**. Batch API-nin 50% endirimi bu böyüklüklərin yanında qərar tələb etmir; tier-model seçimi isə artıq mövcud deyil. **`ai/pricing.py`-dəki tarixli Anthropic tarifləri SİLİNMƏMƏLİDİR** — `ai_usage`-dəki tarixi sətirlər onlarla qiymətlənir.
- **T35/T36** — `81660df` **qəsdən** cədvəl drop etmədi (commit mətni: «data yatmış və geri-qaytarıla bilən qalır, bu məhsul qərarıdır, sökülmə deyil»). Eyni naxış 0008 `subsidy_*` üçün v1.12.0-da, sonra §A.3-də `field_operations`/`field_documents`/`field_rain_log` üçün təkrarlandı. Yəni sxemdə indi **üç nəsil** yatmış cədvəl var və qərar birdir. **Sənədlərdə xüsusi diqqət:** `field_documents` sətirlərinin arxasında **diskdə real fayllar** durur (`settings.object_storage_root`) — cədvəli drop etmək onları yetim qoyar, ona görə qərar «drop»dursa fayl təmizliyi də ona daxildir. ⚠️ `field_weather_daily` bu qrupa **aid deyil** (canlı oxucusu var). Qərar sahibindir; **qərarsız drop etmə**.
- **T19** — geoio.ts yalnız GeoJSON+KML; shpjs/shp-write. Rəngli annotasiya alətı yox. ScaleControl (bir sətir).
- **T20** — ❌ **Çıxarılıb.** Bir vaxt qurulmuş A6 zonaları (`routers/zones.py`, `ZonesTab`, `field_zone_runs`, `process-zones.sh`) `81660df`-də tamamilə silindi, `8f25630` isə VRA plitəsini **qəsdən qurmadı**: «bu məhsulda dəyişkən-doza funksiyası yoxdur, ona görə o referans plitəsinin dürüst mənbəyi yoxdur». Yenidən açmaq iki addımdır — əvvəl zona hesablaması, sonra prescription export. Cədvəllər dormant (→ T35).
- **T21** — Faza-3/4 qrup: cost rollup dashboard yox; sensor_readings/api_keys/v1 router yox; SAR fusion təxirə; EUDR sənəd ən müstəqil parça (poliqonlar var).
- **T22** — Telegram kodu sıfır. messaging_channels/message_log + deep-link opt-in + /webhook + sakit-saat 22-07 + outbound alert. Ən güclü retention lever; aktivləşmə U4 token.
- **T23** — E6, iki-tərəfli (istifadəçi sorğu → cavab); T22-yə bağlı.
- **T24** — pedotransfer core bitib; yalnız lab-report OCR/vision yolu + soil_profiles cədvəl (lab>manual>soilgrids). uploads.py + T5 vision-u təkrar istifadə.
- **T25** — D3 field_inputs/consent/audit + k-anon (n≥10 sahə ≥5 təsərrüfat, HARD-CODED). U12 (hüquq/giriş) + T10 təməl. **Qeyd:** bu L1+L2 infra; **D3 L3 (data satışı)** U12 (hüquq/dövlət razılaşma) + T21 (MRV/EUDR) altındadır.
- **T26** — C6 icma forumu: spec-də **Telegram-qrup MVP** kimi başlayır (fermerlər bir-birinə + aqronoma sual). Öz forum kodu yoxdur. Telegram infra (T22) üzərində qurulur. E12 bundle-ının 2-ci hissəsi.

### C.2 Tam əhatə xəritəsi — hər spec alt-kodu → hara getdi

> ⚠️ Başlıq **2026-07-30-da dəyişdirildi**: əvvəl «heçnə itməyib» yazırdı. Artıq doğru deyil —
> `81660df` bilərəkdən funksiya çıxardı. Cədvəlin məqsədi eynidir (heç bir alt-kod **izsiz** yoxa
> çıxmasın), amma indi ❌ də legitim mənzildir.

> v2.1 alt-kodları (B/C/D) və E0–E12 birləşmədə itməsin deyə: hər biri ya ✅ (§A bitmiş), ya bir T#.

> **Qeyd (2026-07-26):** bu cədvəlin statusları §C-dən geri qalmışdı (T5/T8/T9/T10/T11/T12/T22/T24
> orada ✅ olduğu halda burada ⬜ görünürdü). İndi §C ilə sinxronlaşdırılıb. E13/E14/E15 və P0/P1/P2
> spec alt-kodları deyil — onlar §A.1-dədir.
>
> **Qeyd (2026-07-30):** «heçnə itməyib» iddiası artıq **şərtsiz doğru deyil** — `81660df` bilərəkdən
> funksiya çıxardı. Sadələşdirmənin toxunduğu alt-kodlar aşağıda **❌ ilə** işarələnib; bu, itmə deyil,
> **qeyd olunmuş məhsul qərarıdır** (cədvəllər dormant qalır, → T35).

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
| E13 | Landing onboarding quiz | §A.1 | ✅ (T29 **bağlandı** — task səhv yazılmışdı) |
| E14 | Sahə bölmə taksonomiyası + NASA UI-dan | §A.1 → §A.2 → §A.3 | ✅ canlı (16→12→**10 bölmə**, telefonda tabsız); T31 bağlandı |
| E15 | Email konsolidasiyası (tək həftəlik digest) | §A.1 | ✅ (T28/T30 **bağlandı**; göndərən təkləşdi, **T32** MX gözləyir) |
| — | ~~Hesabatlar (T7)~~ · ~~məhsuldarlıq korrelyasiyası (T16)~~ · ~~VRA/zonalar (T20)~~ | §A.2 (`81660df`) | ❌ **sadələşdirmə ləğv etdi** — səbəblər §C-də (T7 sonradan **QAYITDI**) |
| — | ~~Batch API qərarı (T33)~~ · ~~Sonnet 5 tarif artımı (T34)~~ | §A.3 | ❌ **provayder keçidi ləğv etdi** — DeepSeek/Gemini, 60×/42× ucuz; səbəblər §C-də |
| — | Mövsüm AI xülasəsi · Mesajlar + kataloq · görmə kvotası · xəbərdarlığın həlli (0063) | §A.3 | ✅ **yeni** — spec alt-kodu yoxdur, sahibin qərarı/canlı ölçmə ilə gəldi |

---

## D0. OneSoil korpus analizi — icra vəziyyəti (2026-07-31)

Mənbə: `Agradex_Fermer_Ehtiyaclari_Analizi.docx` (OneSoil icmasının 8 illik yazışması) + həmin gün
aparılmış kod auditi, 8 dildə canlı sayt yoxlaması və sahibin brauzerində tətbiqdaxili test.
Tam plan və sübutlar: sessiya jurnalı. Aşağıda yalnız **status**.

### ✅ Bitdi və CANLIDIR (8 commit, `a25aece..68cda1c`)

| Nə | Commit |
|---|---|
| Gecəlik S2 refresh OOM-dan ölürdü — `rio.clip()` bütün rasteri yaddaşa alırdı | `a25aece` |
| Qeydiyyatdan əvvəl çəkilmiş sahə hər dəfə itirdi (origin sərhədi) | `769ebfb` |
| `t()` modul səviyyəsində ilk dili dondururdu — 3 həqiqi hal | `769ebfb` |
| Landing-də uydurma provayder kartları (★ reytinqlə) | `769ebfb` |
| Public geo endpoint-lərində rate limit yox idi | `769ebfb` |
| Türkcə «Alanlar» vs «Tarlalar» (46 açar) · macarca «Mezők» vs «Tábla» (94 dəyər) | `71f27c0` |
| Çiləmə pəncərəsi pulsuz oldu (yalnız o blok; pasportun qalanı ödənişli) | `71f27c0` |
| Ölkə adı bütün dillərdə «Türkiyə» görünürdü | `71f27c0` |
| İlk sahə üçün məhsul məcburi idi (API heç vaxt tələb etmirdi) | `1362bb4` |
| Demo «hər gün yenilənir» yazırdı, səhnə 5 günlük idi | `1362bb4` |
| Tap-to-detect keşi (təkrar toxunuş 56 s → 0.1 s) + ucuz probe | `ce464ee` |
| Eksport: sərhəd GeoJSON/KML + indeks sırası CSV (pulsuz) | `50b8b75` |
| Mövsüm forması keçən mövsümdən dolur · skorun yanında verdikt sözü | `50b8b75` |
| Anomaliya həddi 0.001-ə işləyirdi → `ANOMALY_MARGIN = 0.05` | `b3f876c` |
| `/fields` tək org-a bağlı idi (aqronom seqmenti üçün bloker) | `b3f876c` |
| Data hazırlanır banneri: proqres + real ETA + `failed` vəziyyəti | `68cda1c` |

### ⬜ Qalan iş (2026-07-31 sonu)

**Ölçülüb, HƏLL OLUNMAYIB — kod şərhində tam yazılıb:**
- ⬜ **Tap-to-detect 45-60 s worst case.** Kök səbəb `segment.py`-də sənədləşdirilib: döngə 32+
  granul gəzir, hamısı `lbl[row,col] == 0`-da düşür (toxunulan piksel kənar maskasında). İki
  düzəliş sınanıb və **ölçmədən sonra geri qaytarılıb** — ikisi də vaxtı yox, **cavabı** dəyişirdi.
  Həqiqi həll kənar-seed halındadır və **real toxunuşlarla çöl testi** tələb edir.
  Keş (təkrar toxunuş 56 s → 0.1 s) və ucuz probe **canlıdır**.

**Böyük, ayrıca sessiya tələb edən:**
- ✅ **Per-sahə paylaşma (L)** — `9fb4fce`, migration **0061**. `field_grants` +
  `public.has_field_access(uid,fid)` + `deps.require_field_read()`. ⚠️ **~60 gate çağırışı
  sındırılmadı** — bu qəsdən belədir: qrant sahibi **CƏMİ BİR route-a** çatır,
  `GET /api/fields/{id}/report`. Hesabat onsuz da tam, oxu-üçün, tək-sahə sənədidir, ona görə
  84 sahə-scoped route-dan hansının təhlükəsiz olduğuna dair ikinci mühakimə lazım gəlmir.
  Yazı yolları toxunulmayıb (`require_field_write()` YOXDUR). 10 uçdan-uca ACL testi canlıda
  keçdi; ən vacibi **qonşu sahə yenə 403**.
- ✅ **PDF/çap hesabatı (M)** — `b5b9cec` + `60761bf`. `GET /api/fields/{id}/report?format=html|csv`.
  81660df-dən stil/escape/qurucular/RFC 5987/BOM **eynilə** bərpa olundu; ledger/tasks/yields oxumaları
  atıldı. Miqrasiya lazım olmadı. `report_labels.py` frontend lüğətindən **çıxarılıb** (111 söz).
  ⚠️ Hesabat hələ azərbaycancadır — endpoint-də TODO kimi yazılıb.
- ✅ **Növbəti peyk keçidi + uğursuz cəhd jurnalı (M-L)** — `eaf7290` + `bee6a38` + `7eff57f`,
  migration **0060**. `scene_attempts` (written/no_valid_pixels/read_error/too_cloudy) +
  `GET /api/fields/{id}/coverage` + `CoverageNote`. Keçid təqvimi **orbit datasından deyil, öz
  müşahidələrimizdən** törəyir: `(tarix mod 5)` qrupları, 86 boşluğun hamısı 5-in qatı.
  ⚠️ STAC axtarışı buludluları serverdə süzdüyü üçün ayrıca metadata-only axtarış lazım oldu —
  onsuz siyahı boş qalırdı.
- ⬜ **Ferma CRUD + sahə qruplaşdırma (S→M)** — `PATCH /api/farms/{id}` **var** (`e89147c`);
  qalan hissə **yaratma UI-si** və sahələrin fermalar arasında köçürülməsidir.

**Xəbərdarlıqların ÇIXAN kanalları:**
- ✅ Telegram / web push / həftəlik digest **oxucunun dilindədir** (`e48b8fa`, migration 0057 —
  bildirişlərə də `title_code`/`params`). **Tərcümə borcu 2026-08-01-də bağlandı** (T28): `_LABELS`
  səkkiz lokalın hamısında əl ilə yazılıb, `WEEKLY_EXTRA` tr/de/hu/it/pl-i də saxlayır.

**Kiçik qalıqlar:**
- ✅ `robots.txt` + `sitemap.xml` + `/az` — `0efac3b`. 104 URL tam hreflang dəsti ilə;
  `PUBLIC_ROUTES` **tək siyahıdır** (sitemap və robots ondan oxuyur); `/az` artıq 307 ilə `/`-ə;
  manifest oxucunun dilində.
- ✅ **Sortlar artıq bazara görədir** (2026-08-01) — `metadataOptions.varietiesFor(crop, locale)`:
  tr (fındıq/buğda/üzüm/alma), de/it/hu (üzüm/alma), pl (alma), ru (alma/üzüm); dili olmayan məhsul
  **AZ reyestrinə düşür**. Sort adı **xüsusi isimdir**, ona görə `labelKey` YOXDUR — yoxsa lüğətdə
  olmayan açar «app.meta.variety.Tombul» kimi render olunardı. Sərbəst mətn həmişə qalır: bu,
  **təklifi** dəyişir, qəbulu yox.
- ✅ Dil seçicinin öz etiketi — onsuz da `t("app.languageSwitcher.label")`-dir (köhnə qeyd yanlış idi).
- ✅ Alman/polyak landing-də AZN — bu **boşluq deyil, qərardır**: `pricing.ts` açıq yazır ki, məbləğ
  AZN-də qalır, çünki faktiki olaraq bu valyutada hesab kəsilir.

**Yoxlanmamış (gizli-tab artefaktı — açıq tabda baxılmalıdır):**
- ✅ **Hər ikisi onsuz da qurulub** (2026-08-01-də yoxlandı): `DashboardMap.fitTo()` iki yerdən çağırılır (ilk çəkiliş + sahə dəsti dəyişəndə, rəng dəyişəndə YOX), `weather/RadarMap.tsx` (407 sətir) isə `WeatherScreen`-də mount olunub. Köhnə qeyd yanlış idi.

---

## D. Tövsiyə olunan növbə (sıra) — 2026-08-04 yenidən yazıldı

> Köhnə sıra (T0/T1/T2/T4/T5/T6/T8-T12 + T14) tamamilə bitib və ya çıxarılıb — silindi.
> 2026-07-30 sırasının **3 və 6-cı bəndləri də düşdü**: (3) T28+T30 digest borcu bağlandı ·
> (6) T33/T34 AI xərc qərarı provayder keçidi ilə predmetsiz qaldı.

1. **U11 canlı smoke-test — birinci.** §A.3 həm **UI-dan funksiya çıxardı**, həm **AI mühərrikini
   dəyişdi**, yəni yanlışlığın iki müstəqil mənbəyi var. Yenilənmiş siyahı §B-dədir; «16 bölmə»,
   «12 bölmə» və `/farm` artıq yanlışdır.
2. **U2 — köhnə Anthropic açarını LƏĞV et.** Task mahiyyətcə dəyişdi: açar bir dəfə açıq görünüb və
   indi **heç nəyi qorumur** (məhsul onu işlətmir), yəni rotate deyil, revoke lazımdır.
3. **T32** MX qeydi — `ulkar@agradex.com` hər dildə göndərəndir, amma cavab qəbul etmir.
   Tək göndərənə keçmək bu boşluğu daha görünən etdi: bütün cavablar bir ünvana gedir və orada itir.
4. **T35 + T36 birlikdə** — sxemdə artıq **üç nəsil** dormant cədvəl var (subsidiya → ERP → §A.3).
   Sahib qərarı; `field_documents`-in arxasında **diskdə real fayllar** durduğu üçün «drop» variantı
   fayl təmizliyini də əhatə edir.
5. **T15** səs · **T19** export/annotasiya qalığı — hər ikisi təmiz, asılılıqsız.
6. *Paralel — istifadəçi açanda:* **U1** EARTHDATA (sərt deadline **2026-08-30**) · **U4** Telegram
   token (→ T22 aktivləşir) · **U6** EPPO (**2026-09-01** köhnə API bağlanır, → T9 datası).
7. Təxirə: **T23** iki-tərəf bot · **T26** icma forumu · **T25** D3 L1+L2 · **T21** Faza-3/4.

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

**2026-07-30 dalğasından risklər:**
- ⚠️ **§A.2-nin yarısının canlı olduğu sübut olunmur.** `8f25630` və `03eb081` — hər ikisinin ardınca build düzəlişi (`c13ba8f`, `05c3870`), yəni `update.sh` o an dayanmışdı; `786bb4d..decbdb2` heç yoxlanmayıb. **Yaşıl görünən sayt deploy-un düşdüyünə sübut deyil** — uğursuz build heç bir konteyner əvəz etmədən dayanır.
- ⚠️ **Miqrasiya 0055/0056 image-dən ƏVVƏL.** Hər ikisi əlavəedicidir (köhnə image işləyərkən təhlükəsiz), amma yeni kod onlara SELECT/INSERT edir → tərsinə sıra `undefined column` 500 verir. `update.sh` miqrasiya işlətmir.
- ⚠️ **`ulkar@agradex.com` cavab qəbul etmir** (T32) — MX yoxdur. Artıq **hər dildə tək göndərəndir**, yəni bütün cavablar bir ünvana axır və orada itir.
- ⚠️ **Sonnet 5 tarifi 2026-08-31-də iki dəfə artır** ($2/$10 → $3/$15). `ai/pricing.py` sentyabr sətrini onsuz da saxlayır — **hesablama düzgün qalacaq**, amma model seçimi qərarı ondan əvvəl verilməlidir (T34).
- **Silinmiş ERP-nin cədvəlləri sxemdə qalır** (T35) — subsidiya ilə birlikdə **iki nəsil** yatmış cədvəl. Zərərsizdir, amma sxemi oxuyan hər kəs bunları canlı funksiya kimi oxuya bilər.

**2026-07-26 dalğasından risklər:**
- ~~⚠️ **Son commit-in build-i doğrulanmayıb** (`84e5f28`).~~ **BAĞLANDI** — sonrakı dalğalar həmin kod üzərində qurulub və `31b6e58` canlı ölçmələri qeyd edir; o diapazon üçün risk keçdi. (Yeni versiyası yuxarıdadır.)
- ⚠️ **Migration 0047 əks istiqamətli sıra tələb edir** — o `users.email_alerts`-i **DROP** edir. Onu oxuyan kod (`rules/engine._deliver_email`, `/api/auth/email-alerts`) eyni commit-də (6bf36a6) silinib, ona görə tətbiq təhlükəsizdir; **amma api-ni 6bf36a6-dan geriyə rollback etsən**, silinmiş sütuna qarşı 2 endpoint + 1 dispatcher 500 verəcək. Dəyər-qoruyan rollback yolu yoxdur.
- ~~⚠️ **Cron sətri əl ilə dəyişməlidir** (`0 3 * * 3`).~~ **BAĞLANDI** — `4c7e9dd` canlı crontab-ı oxuyub qeyd edir ki, sətir həqiqətən `0 3 * * 3`-dür və köhnə gündəlik sətir yoxdur. Eyni yoxlamada **A6 zones cron-unun** da crontab-dan getdiyi təsdiqləndi.
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

**Ölü kod / borc** (hamısı zərərsiz — sındırmır, sadəcə yanıldıcıdır). ⚠️ Hər bənd 2026-07-30-da
grep ilə yenidən yoxlanıb; bağlananlar üstündən xətt çəkilib, silinməyib ki, təkrar «tapılmasın».

- ~~`FieldMapSheet.tsx` ölü raster boru kəməri (`rasterUrl`, `dataSaver`, `forceRaster`, `DisplayMap`/`Layers` import-ları).~~ **BAĞLANDI `0ec417a`** (`perf(field): drop dead raster plumbing left behind by the hero map removal`). 2026-07-30-da yoxlanıb: fayl bu adların heç birini daşımır.
- **Yetim i18n açarları — 8 lüğətdə də qalır:** `field.tab.overview` · `field.tab.sentinel2` · `field.tab.nasa` · `field.tab.ai` (heç nə istinad etmir; `SECTION_GROUPS` `app.field.section.*` işlədir) və `app.fieldDetail.groupVaziyyet/Isler/Melumat` (yerini `app.field.group.monitoring/work/records` tutdu). **Tələ:** `field.tab.nasa` ölü olmasına baxmayaraq 722b808-də **adı dəyişdirildi** ("Peyk arxivi") — ona görə grep-də NASA rename sweep tam görünür. ⚠️ **2026-07-30-da yenidən yoxlanıb — beşi də hələ 8 lüğətdədir.** `81660df` 445 açar sildi, amma bunlar o silmənin əhatəsində deyildi.
- **`services/app/routers/mgmt.py` sonuncu sətri boş `# ---------- yields ----------` başlığıdır** (fayl 92 sətirdir, başlıqdan sonra heç nə gəlmir) — `81660df`-dən qalıb. Zərərsiz, amma faylı oxuyan növbəti adam kəsilmiş kod axtaracaq. **Bu fayl bu sənədin sahibliyində deyil** — silinməsi ayrıca dəyişiklikdir.
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
- ~~4 ERP modulu tək `/farm` tabının içindədir və park olunub; Kataloq/İcma `SHOW_MARKETPLACE_NAV` arxasında gizlidir.~~ ⚠️ **İKİ DƏFƏ KÖHNƏLDİ:** `81660df` `/farm` konteynerini və dörd modulu **tamamilə sildi** (indi 404), `8f25630` isə `SHOW_MARKETPLACE_NAV`-ı **`true`** etdi — `/catalog` və `/chat` menyudadır və sonuncu artıq **«Mesajlar»** adlanır (§A.3).
- **Hektar DB/API vahidi olaraq qalır** — çevirmə yalnız render kənarında (`lib/units.ts` `"use client"`; Server Component-lər `formatArea()` çağırmamalıdır). Sahə YAZAN yerlər `fromUnit()` ilə geri çevirməlidir (YieldsTab belə edir). **Hektar-başına dərəcələr** (t/ha, kq/ha dozalar) qəsdən hektar-başına qalır — normalar belə dərc olunur.
- **Backend fermerə görünən mətni Python-da tərcümə ETMİR** — `*_code` + `*_params`, AZ cümlə yalnız köhnə sətirlər üçün fallback. Bir yol digərinin mətnini əvəz edirsə, **kodu da əvəz etməlidir** (bu, b2e973f-də düzəldilən real bug idi).

## 2026-07-27…30 — SHIPPED (detal §A.2; burada yalnız gələcək işi məhdudlaşdıran qərarlar)

- **Məhsulun əhatəsi rəsmən daraldı** (`81660df`): **peyk təsviri və indekslər · AI analiz və tövsiyə ·
  hava · sahə qeydi**. Yeni funksiya təklif edəndə əvvəl sual: bu dördündən birinə xidmət edirmi?
  ERP-yə qayıdış (dəftər/satış/anbar/texnika/hesabat/tapşırıq/məhsuldarlıq/zonalar) **qərarla geri
  alınmalıdır**, təsadüfən yenidən qurulmamalıdır.
- **Silinən funksiyaların DB cədvəlləri qəsdən qalır** — «yatmış və geri-qaytarıla bilən». Sxemdə ölü
  cədvəl görüb drop etmə (→ T35).
- ~~`operations` mühasibat deyil, AI girişidir — növbəti sadələşdirmədə silmək məsləhətin
  keyfiyyətini azaldar.~~ ⚠️ **BU QƏRAR 2026-08-04-DƏ ƏVƏZ OLUNDU (§A.3):** əməliyyatlar bölməsi,
  `routers/mgmt.py` və `POST /api/bulk/operations` sahibin qərarı ilə silindi. Cədvəl **dormant
  qaldı** (→ T36), yəni geri qaytarmaq miqrasiya tələb etmir. Yuxarıdakı arqument hələ də doğrudur —
  sadəcə **qərarla** üstələndi, unudulmaqla yox.
- **Uydurmuş rəqəm yoxdur** (`8f25630`): MARKET INTELLIGENCE və VRA plitələri **qəsdən boş buraxıldı**,
  çünki mənbələri yoxdur. Naməlum = özünü izah edən tire. Bu qayda dashboard-a yeni plitə əlavə edən
  hər kəsə aiddir.
- **Sidebar-ın etiketli vəziyyəti `2xl`-dədir, `xl` DEYİL** və `FieldListPanel`-in `xl:flex`-i sahə
  səhifəsinin `xl:hidden` çip sətri ilə **cütdür** — birini tərpədən ikisini də tərpətməlidir, yoxsa
  1280px-də sahə səhnəsi `WORKBENCH_MIN`-dən aşağı düşür.
- **Qrafik aralıqları ölçmədən geri sayılır** (`maxMeasuredTs`, `maxTs` yox) — proqnozdan geri saymaq
  «1H»-i tamamilə gələcəyə salır və düyməni söndürür.
- **`lib/scrollLock.ts` sayğaclıdır, save/restore DEYİL** — yeni kilid yazan hər kəs bu modulu
  işlətməlidir, yoxsa iç-içə sheet `<html>`-i `overflow:hidden`-də qoyur.
- **Auth iki yolludur və elə qalır** (`786bb4d`): magic link **əlavə olundu**, parol girişi
  **silinmədi** — hash-ı olan hesablar əvvəlki kimi girir. Magic-link cavabları qəsdən
  **fərqlənməzdir** (signup vs login, bitmiş vs xərclənmiş vs etibarsız) — «daha faydalı xəta mesajı»
  vermək hesab sadalama vektoru açar.
- **Qiymət cədvəli tarixlidir** (`ai/pricing.py`): model qiyməti sabit deyil, `(effective_from, …)`
  sətridir. Yeni model əlavə edən **başlanğıc tarixini də** verməlidir.
- **`ai_usage.source` heç vaxt təxminlə doldurulmur** — köhnə sətirlər NULL qalır və nisbətlərdən
  çıxarılır. Uydurulmuş dəyər ölçülmüşdən seçilməz olur.

## 2026-08-02 — SEO dalğası (plan + audit: `docs/SEO_PLAN.md`)

- **S0 texniki təməl ✅ CANLI** (`033310d`-yarısı + `ca5aeaf`): canonical/hreflang bug-u 6 route-da
  düzəldi (page-level `alternates` → `lib/seo.ts::pageAlternates` + `metadataBase`), per-locale
  keyword title-lar (`mkt.meta.homeTitle` və b.), sitemap 104→152 URL (7 guide məqaləsi +
  `/solutions/consultant` daxil; `/login`/`/signup` çıxdı; hər girişdə x-default), app-host
  `X-Robots-Tag: noindex`, crawler-lər Accept-Language redirect-dən azad, OG/twitter şəkil +
  favicon/icon dəsti, brendli lokallaşmış 404, Organization/WebSite/Article JSON-LD, guide
  byline (müəllif: təsisçi, `lib/author.ts`), `/demo` SSR gövdəsi («pulsuz NDVI xəritəsi»
  mövqeyi), HSTS/nosniff/referrer başlıqları. Hamısı canlı curl ilə doğrulandı.
- **Analitika qərarı (Q5):** GSC + `deploy/goaccess-report.sh` (nginx log, cookie-siz) — privacy
  policy-dəki «analitika yoxdur» vədi toxunulmaz qalır.

| ID | İş | Status |
|---|---|---|
| SEO-T1 | GSC qeydiyyatı (CF DNS TXT ilə doğrulama), sitemap submit, 3 URL üçün indeksləmə tələbi — sahibin Chrome-u ilə icra edildi. GSC tapıntısı: Google 07-27-də crawl edib «Duplicate without user-selected canonical» vermişdi (K2/K4 təsdiqi) | ✅ 2026-08-02 |
| SEO-T5 | CF «Always Use HTTPS» + `www→apex` 301 Redirect Rule — canlıda 4 variant da kanonikə 301 verir | ✅ 2026-08-02 |
| SEO-T1b | Bing Webmaster Tools (GSC import) — OAuth/SSO icazəsi tələb edir, ayrıca təsdiqlə | ⏳ istifadəçi icazəsi |
| SEO-T15 | PSI/CWV baseline ölçümü (keyless kvota açılanda) | ⬜ |
| SEO-C (Dalğa 1+2) | **35 məqalə CANLI**: 7 mövzu × 5 dil (az/en/ru/de/es) — `/blog` infra + registry + Article JSON-LD + məhdud hreflang; hər dil variantı bazar adaptasiyasıdır, tərcümə deyil (sahibin sifarişi ilə plan genişləndi: 3 en → 7×5) | ✅ 2026-08-02 (`40fd45b`+`3912702`) |
| SEO-ES | **es locale CANLI və TAM PARİTETDƏ** (aşağıdakı B4): UI lüğəti 2,824 açar + content-overlay 679 + legal privacy/terms; `/es` bütün səthlərdə ispancadır | ✅ 2026-08-02 gecə |
| SEO-C-next | Kontent Dalğa 3: TR məqalələri + AZ uzun-quyruq — aşağıdakı **B1/B2**-də icra olundu (blog 14 slug / 49 səhifə) | ✅ 2026-08-02 gecə |
| SEO-S3 | Kataloqlar (Product Hunt/Capterra/G2/Crunchbase/F6S) + AZ ekosistem linkləri | ⏳ istifadəçi hesabları |
| — | Müəllif: **Sabir Ismayilbayli** + LinkedIn linki (`lib/author.ts`, byline + Article JSON-LD) | ✅ 2026-08-02 |
| — | ES locale qərarı (hədəf 5-10 user/gün pilləsində) | ⏳ qərar |

## 2026-08-02 gecə — SEO dalğa 3 + brend (sahibin «B1-B4,B6,C,D + branding» sifarişi)

- **B1 ✅** TR variantları: 7 mövzu × tr (dekar/dönüm, Karadeniz fındığı, MGM dürüstlüyü) — blog 6 dilə çıxdı.
- **B2 ✅** AZ uzun-quyruq: fertilizer-rates · wheat/hazelnut-growing-guide · grape-diseases · online-agronomist · farm-apps-comparison (aqro rəqəmlər interval + «torpaq analizi ilə dəqiqləşdir» qeydi ilə).
- **B3 ✅** `agradex-vs-onesoil` (en) — dürüst müqayisə; «OneSoil alternative» sorğusunun səhifəsi.
- **B4 ✅ TAM** es lokalizasiyası: UI lüğəti 2,824 açar (en ilə tam paritet, placeholder-validator 0 xəta) + content-overlay 679 + legal privacy/terms — `/es` bütün səthlərdə ispancadır.
- **B6 ✅** landing h2 «Əkin sahələrinin peyklə monitorinqi…» (9 dildə) + footer «kim qurub» sətri (müəllif kimliyi ilə eyni).
- **C ✅** Ölçmə ritualı: server cron ×2 (`seo-weekly.sh` B.e. 06:12 — nginx-dən organik kliklər; `goaccess-report.sh` ayın 1-i) + bulud rutini «Agradex weekly SEO check» (B.e. 09:07 Bakı, `trig_01XbZaa8TM8MZHbsfG2SySpn`). İlk ölçmə: son 7 gündə **13 Google keçidi** (/, /en, /guide, /demo).
- **D 🚀** PSI baseline (T15): **SEO 100 · Perf 66 (mobil) · A11y 95 · BP 92**; CrUX hələ «No Data». Perf 66 → gələcək perf dalğasının hədəfi (O3 keş və s.). Lighthouse UA bot-istisnaya əlavə edildi (PSI /en-ə 307 alırdı).
- **Brend v2 ✅** NDVI-piksel nişan: favicon/ikonlar/OG + nav/footer loqoları. Token re-teması → ayrıca dizayn dalğası (⏳).
- Blog cəmi: **14 slug / 49 səhifə**; sitemap **229 URL**.
