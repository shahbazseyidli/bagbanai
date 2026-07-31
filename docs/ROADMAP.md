# Bağban AI — Roadmap & Task Tracker

> **Bu sənəd tək iş-izləyicisidir (single task tracker).** Bütün gələcək tasklar burada, statusla.
> LIVE: **agradex.com** (marketinq) + **app.agradex.com** (tətbiq). SSoT:
> `docs/Bagban_AI_Platforma_Spesifikasiya_AZ.md` (§1–§29); `…_Subsidiya_Kalkulyatoru_Modul.md` (§30)
> **artıq icra olunmur** — modul məhsuldan çıxarılıb (§A). İş konteksti: `CLAUDE.md`. Nə deploy olub:
> `CHANGELOG.md`. Qayda: UI 8 dildə (default `az`); kod/SQL/commit İngiliscə; Supabase yox
> (self-hosted PG16 + öz JWT); main-ə push = **prod deploy** (hər push-dan əvvəl istifadəçidən təsdiq).
>
> **Son yenilənmə:** 2026-07-30 — HEAD **`decbdb2`** (git ilə yoxlanıb). **Heç bir branch-da
> mənimsənilməmiş iş yoxdur** — sübut `HANDOFF.md`-də.
>
> 2026-07-26 dalğası (`90829eb..84e5f28`) §A.1-dədir. **2026-07-27…30 dalğası (`c98943a..decbdb2`,
> 15 commit, 155 fayl) §A.2-dədir** və bu roadmap-ın böyük hissəsini köhnəldir: sahibin qərarı ilə
> **ERP yarısı məhsuldan çıxarıldı** (`81660df`), sonra Terra Oracle iş masası (`8f25630`),
> OneSoil mobil (`03eb081`) və email-only qeydiyyat + magic link (`786bb4d`) gəldi.
> Miqrasiyalar **0055** (`login_tokens`) · **0056** (`ai_usage.source`).
> **Sadələşdirmənin ləğv etdiyi tasklar:** T7 · T16 · T20 (§C-də ❌, səbəbi ilə).
> Yeni açıq işlər: **T32–T35**. E+T tək backlog (§C).

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
> edəndə növbəti **T#** nömrəsini ver — **növbəti boş nömrə `T36`** (T3, T7, T14, T16, T20 çıxarılıb,
> təkrar istifadə etmə). Status **iddiadır**: bundle/kod təsdiq etmirsə ✅ yazma — 🚀 (test gözləyir) və ya
> açıq "doğrulanmayıb" qeydi ilə saxla.

---

## A. Bitmiş — CANLI (✅)

Faza 1 tam canlı + üstünə düşən sprintlər. Detal `CHANGELOG.md` [1.0.0]…[1.3.0].

| Sahə | Nə | Ref | Status |
|---|---|---|---|
| Platform | Multi-tenant PG16+PostGIS, öz-JWT auth, RLS + server gating, org→farm→field, invites | Faza1 | ✅ |
| Peyk | HLS 9-indeks pipeline + Sentinel-2 10m + **NDRE/CIre**, TiTiler raster overlay, async "hazırlanır" UX | **E0** | ✅ |
| Xəritə | Basemap qalereyası, hillshade, Nominatim axtarış, compare/swipe, bulud filtri, ölç, GeoJSON/KML, **fırça/lasso** | v1.3.0 | ✅ |
| Sahə UX | Sahə səhifəsi + edit/sil paneli. ⚠️ **İki dəfə köhnəldi:** (1) E14 (§A.1) NASA tabını sildi və `OverviewTab.tsx`+`WellnessCard.tsx`-i `FieldPulse`/`SatelliteGlance`/`SignalsActions`-a birləşdirdi; (2) sadələşdirmə (§A.2) bölmə sayını **16 → 12** endirdi, `03eb081` isə telefonda səhifəni **tabsız** etdi (tək skroll + «Daha çox» siyahısı). Desktop bölmə menyusunu saxlayır; hər ikisi `fieldSections.ts`-i oxuyur | v1.3.0 → **E14** → **§A.2** | ✅ |
| AI | LLM adapter, **məsləhət (yalnız S2)** + chat (Claude aktiv), **Bilik Qatı M1–M8** | M1–M8 | ✅ |
| Aqro-model | Saxton-Rawls pedotransfer TAW/RAW · çiləmə pəncərəsi + frost/heat/külək alert | **E1, E2** | ✅ |
| Sərhəd | Toxun-tap avtomatik sahə (geoapi region-growing) | **E8a (C3)** | ✅ |
| Billing | 3-paket gating + admin Abunələr + `/pricing` + **upgrade CTA** | v1.3.0 | ✅ |
| ~~Subsidiya~~ | ~~Kalkulyator (117 tarif 2026), match+modifier engine, wizard~~ — **məhsuldan çıxarıldı** (v1.12.0: frontend + `routers/subsidy.py` silindi; `/api/subsidy/*` 404). 0008 `subsidy_*` cədvəlləri **dormant qalır** (drop olunmayıb) | §30 | ❌ |
| Infra | Deploy (Compose+nginx+CF), **9 cron** (8 pipeline/knowledge + həftəlik email digest), DB backup, UFW+fail2ban, CF SSL Full(Strict). ⚠️ Əvvəl 10 idi — **A6 zones cron-u** sadələşdirmə ilə həm repodan (`deploy/process-zones.sh`), həm serverin crontab-ından silindi (`81660df`) | — | ✅ |

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
| U11 | **Canlı smoke-test — E14 + sadələşdirmə + Terra Oracle sonrası** ⚠️ **yenidən yazıldı 2026-07-30**: köhnə mətndəki «16 bölmə» və «`/farm?tab=` 4 bölmə» **artıq mövcud deyil** (`81660df`) | Brauzer: `?tab=status` (FieldPulse + SatelliteGlance + SignalsActions) · 3 qrup / **12 bölmə** menyusu · `/farm` və `/reports` **404 verməlidir** · desktop sidebar 2xl-də etiketlənir və 1280px-də sahə səhnəsi ≥760px qalır · qrafik panelində proqnoz varkən «1H» **sönmür** · telefonda 5 tab + xəritə-ana-səhifə · sahə vahidi seçicisi · RU/EN cəm başlığı | Kod `main`-dədir; §A.2-də 🚀 olan hər sətir həm **deploy**, həm vizual yoxlama gözləyir | **Yüksək** | ⏳ |
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
| **T7** | ~~PDF/Excel hesabatlar~~ | §17 | backend/reports | L | — | — | ❌ **sadələşdirmə ləğv etdi** (`81660df`) — `routers/reports.py` (1027 sətir) və `/reports` səhifəsi silindi, çünki mənbələri (dəftər/satış/tapşırıq/məhsuldarlıq) getdi. `public.reports` cədvəli **dormant** qalır. Yenidən açmaq = əvvəl hesabatın nəyi oxuyacağına qərar vermək |
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
| **T27** | Qalan `<n> <isim>` cəm səthlərini `tp()`-yə keçir: **satış qeydləri · paylaşma baxışları · qonşu fermerlər · yağış günləri** | i18n | frontend/i18n | S | 🟡 | yox (tp() hazır) | ⬜ |
| **T28** | Həftəlik digest tərcümə borcu — `catalog_i18n.WEEKLY_EXTRA`-da yalnız `ru`, `weekly.py _LABELS`-də az/en/ru → **tr/de/hu/it/pl istifadəçilər digest-i İNGİLİSCƏ alır** | E15/i18n | backend/email | S | 🟡 | yox | ⬜ |
| **T29** | ~~`POST /api/auth/onboarding` frontend-də çağırılmır~~ | E13 | frontend/backend | S | 🟡 | yox | ✅ **HƏLL OLUNUB — task səhv yazılmışdı.** Kodla yoxlanıb (2026-07-30): iki çağıran var — `landing/OnboardingQuiz.tsx` (daxil olmuş ziyarətçi quizi təkrar keçəndə, `20615d5`, **roadmap sətri ilə eyni gün**) və `auth/carryQuiz.ts` (`786bb4d`, magic-link sessiyası yaranandan sonra). `OnboardingQuiz.tsx`-in şərhi niyə **yalnız landing-də** olduğunu izah edir: `localStorage` origin başınadır, quiz apex-də yazılır, app host-da `loadAnswers()` **həmişə null**-dır — «app açılışında süpür» çağıranı konstruksiyaya görə ölü kod olardı |
| **T30** | Digest AI məsləhət mətnini **dil yoxlamadan** sitat gətirir (`weekly._advice()`-də `lang` predikatı yox) → RU/EN digest içində AZ proza. `lang_mismatch` düzəlişi yalnız sahə səhifəsini əhatə edir | E15/P0.3 | backend/email | S | 🟡 | 0049 | ⬜ |
| **T31** | `HLS_ENABLED` **"bir-boolean rollback" DEYİL** (dead-end): `sensors.ts`-dən kənarda `HLS_ENABLED`/`UI_SENSORS`/`sensorVisible()` heç yerdə istifadə olunmur; səhifə `sensor="S2"` hard-code edir, `SECTION_GROUPS`-da HLS bölməsi yoxdur. Ya rollback-ı doğrudan bağla, ya da şərhdəki iddianı düzəlt | E14 | frontend | S | ⚪ | yox | ⬜ **2026-07-30-da grep ilə yenidən yoxlanıb — hələ doğrudur** |
| **T32** | **`ulkar@agradex.com` cavab qəbul etmir** — `786bb4d` göndərəni təkləşdirdi, amma `notify.py` başlığı açıq yazır ki, agradex.com **MX dərc etmir**: fermerin welcome/digest məktubuna cavabı bounce olur. Poçt qutusu + MX qeydi lazımdır (istifadəçi addımı, sonra kod tərəfdə heç nə) | E15/A4 | infra/email | S | 🔴 | istifadəçi (DNS) | ⬜ |
| **T33** | **Bake-off nəticəsinə görə qərar** — `decbdb2` ölçdü ki, Anthropic-i `messages.parse` ilə çağırmaq eyni promptda Opus çıxışını **2146 → 1565 token** endirir (prodakşn onsuz da belə çağırır) və `18113e3` göstərdi ki, `research` düzəlişindən sonra qalan hesabın ~75%-i **advice**-dir. Növbəti qərar oradadır: **Batch API** (`ai_usage.source='auto'` sətirləri üçün 50% endirim) və/və ya tier-model seçiminin yenidən baxılması | AI/cost | ai | M | 🟡 | 0056 (data yığılmalıdır) | ⬜ |
| **T34** | **Sonnet 5 qiymət artımı 2026-08-31** — `ai/pricing.py` sentyabr sətrini onsuz da saxlayır (kod hazır, əl işi lazım deyil), amma **tarif iki dəfə bahalaşır** ($2/$10 → $3/$15). O tarixdən əvvəl model seçimi yenidən qiymətləndirilməlidir (T33 ilə birlikdə) | AI/cost | ai | S | 🟡 | T33 | ⬜ |
| **T35** | **Silinmiş ERP cədvəllərinin taleyi** — `81660df` 8 router və bütün UI-ni sildi, **cədvəllər isə qəsdən qaldı** (dəftər/satış/anbar/texnika/zonalar/tapşırıq/məhsuldarlıq + 0008 `subsidy_*`). Qərar tələb edir: dormant qalsın (cari vəziyyət), arxivləşdirilsin, yoxsa drop olunsun. **Qərarsız drop ETMƏ** — bu, geri-qaytarıla bilən olmaq üçün belə saxlanılıb | S1 | db | S | ⚪ | sahib qərarı | ⬜ |

### C.1 Task detalları (niyə / harada — kod ilə yoxlanmış)

- **T0** — 0009 `data_status` enum-da 'partial' yox, `first_scene_at` yox; tam-ekran banner 60-günlük tarix bitənə qədər xəritəni bloklayır. Ən böyük aktivasiya quick-win.
- **T1** — `internal.py` POST /rules/run → 501 'rules_phase_2'; `services/app/rules/` yoxdur; hava alertləri `ai/weather.py`-də hardcoded. Engine + dedup(field_id+type) + dispatch. **Digər alertlər üçün təməl.**
- **T2** — yalnız hava (frost/heat/wind) bildiriş göndərir; vegetasiya tərəf tam yoxdur. Rules engine-in ilk istehlakçısı.
- **T4** — `gdd_base_c` crop_thresholds-də seed + load olunur, amma heç yerdə Σ yox. Fenologiya/yield/pest/FAO-56 üçün paylaşılan asılılıq. Open-Meteo ARCHIVE (pulsuz, açarsız).
- **T5** — `ai/`-də vision kodu yoxdur (grep təmiz); `uploads.py` yalnız fayl saxlayır. `llm.complete_vision` + `ai/diagnose.py` + endpoint → `scouting_observations.diagnosis`. **Qayda 7** (problem tipi + qeydiyyatlı-siyahı göstərici + aqronom referral, pestisid dozası YOX). Ən güclü kiçik-fermer cəlbetmə qarmağı.
- **T6** — `geo_pipeline/README.md` açıq "Phase 2" deyir; fenologiya yalnız LLM mətnidir, growth_stage əl ilə. Temporal baseline (p10/median/p90) + z-score + Savitzky-Golay → avto growth_stage.
- **T7** — ❌ **Çıxarılıb.** `81660df` `routers/reports.py`-ı (1027 sətir) və `/reports` səhifəsini sildi: onlar dəftər/satış/tapşırıq/məhsuldarlıqdan oxuyurdu, o dördü isə eyni commit-də getdi — saxlamaq **boş hesabat göndərmək** olardı. `public.reports` (0005) və business-tier flag **dormant** qalır. Yenidən açmaq üçün əvvəl sual: hesabat indi **nəyi** oxuyacaq (peyk trendləri + AI məsləhət + əməliyyat jurnalı?).
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
- **T33/T34** — `18113e3` + `decbdb2` ölçmə borcunu bağladı; qərar borcu qalır. Faktlar: `research` düzəlişindən (`7021a66`) sonra qalan hesabın ~75%-i **advice**-dir və advice **istifadəçi sayı ilə** böyüyür; `ai_usage.source` (0056) `auto`/`user` ayrımını **indi** yazmağa başladı, yəni Batch API qərarı (auto sətirlərə 50% endirim) bir neçə həftəlik data yığıldıqdan sonra rəqəmlə verilə bilər. Sərt tarix: **2026-08-31** Sonnet 5 introductory tarifi bitir ($2/$10 → $3/$15) — `pricing.py` bunu onsuz da bilir, amma model seçimi ondan əvvəl yenidən qiymətləndirilməlidir.
- **T35** — `81660df` **qəsdən** cədvəl drop etmədi (commit mətni: «data yatmış və geri-qaytarıla bilən qalır, bu məhsul qərarıdır, sökülmə deyil»). Eyni naxış 0008 `subsidy_*` üçün v1.12.0-da tətbiq olunmuşdu. Yəni sxemdə indi **iki nəsil** yatmış cədvəl var. Qərar sahibindir; **qərarsız drop etmə** — geri-qaytarma yolu məhz budur.
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
| E14 | Sahə bölmə taksonomiyası + NASA UI-dan | §A.1 → §A.2 | ✅ canlı (16→**12 bölmə**, telefonda tabsız); T31 qalıq |
| E15 | Email konsolidasiyası (tək həftəlik digest) | §A.1 | 🚀 (T28/T30 qalıq; göndərən təkləşdi, **T32** MX gözləyir) |
| — | ~~Hesabatlar (T7)~~ · ~~məhsuldarlıq korrelyasiyası (T16)~~ · ~~VRA/zonalar (T20)~~ | §A.2 (`81660df`) | ❌ **sadələşdirmə ləğv etdi** — səbəblər §C-də |

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

### ⬜ Qalan iş — prioritetlə

**Ölçülüb, amma HƏLL OLUNMAYIB:**
- ⬜ **Tap-to-detect 45-60 s worst case.** Kök səbəb tapılıb və `segment.py`-də yazılıb: döngə 32+
  granul gəzir, hər biri tam pəncərə oxuyur, hamısı `lbl[row,col] == 0`-da düşür (toxunulan piksel
  kənar maskasında). İki düzəliş sınanıb və **geri qaytarılıb** — ikisi də cavabı dəyişirdi.
  Həqiqi həll kənar-seed halındadır və **real toxunuşlarla çöl testi** tələb edir.

**W1 qalığı:**
- ⬜ Bağ/çoxillik üçün `mean` yerinə **p90** (p10/p50/p90 artıq saxlanılır — miqrasiya lazım deyil).
  ⚠️ `analytics.py` baseline-i `mean` üzərində qurur — bazis uyğunluğu birlikdə dəyişməlidir.
- ⬜ Kiçik sahədə piksel sayı (`index_stats.valid_pixels` göndərilir, 0 istifadəçisi var)
- ⬜ Qeyd müəllifi (sütunlar var, API qaytarmır, UI göstərmir)
- ⬜ `/weather` hələ `orgs[0]`-a bağlıdır

**W2 qalığı:**
- ✅ **Xəbərdarlıqların dili — BİTDİ və CANLIDIR** (`49f979c`, miqrasiya **0057** tətbiq olunub və
  `schema_migrations`-a yazılıb). `notifications`-a `title_code/title_params/body_code/body_params`
  əlavə edildi; 4 vegetasiya + 3 hava qaydası kod daşıyır; `alertText()` oxucunun dilində render
  edir; 12 sətir × 8 dil. Köhnə sətirlər (kodsuz) saxlanmış AZ mətnə düşür — qəsdən.
  ⚠️ **Qalıq:** Telegram / web push / həftəlik digest hələ **server tərəfdə AZ mətni** göndərir —
  onlar oxucunun dilini bilmir, ona görə `emails/catalog.py` üslubunda server-tərəfli locale
  cədvəli lazımdır. Bu, ayrıca işdir.
  ⚠️ **Müşahidə edilməyən həlqə:** təzə *kodlu* alert canlıda görülmədi, çünki hazırda heç bir alert
  şərti yoxdur (`candidates: 0` — bu, `ANOMALY_MARGIN` düzəlişinin özünün işlədiyini göstərir).
  Yazma yolu koddan yoxlanılıb və konteynerdə map/helper canlı təsdiqlənib; ilk real alertdə
  `title_code` sütununu bir dəfə yoxlamaq qalır.
- ✅ **Ölkə kilidi AÇILDI — CANLIDIR** (`6bd02ed`). `regions.ts` tək ölkədən `QUIZ_COUNTRY_CODES`-a
  keçdi (ad `Intl.DisplayNames` ilə oxucunun dilində) · sehrbazdakı `disabled` select açıldı və
  landing quizinin cavabı ilə doldurulur · 66 rayon yalnız AZ üçün, digər ölkələrdə sərbəst mətn ·
  xəritə axtarışından `countrycodes=az` + `Accept-Language: az` çıxarıldı (**brauzerdə təsdiqləndi**:
  chunk-da nominatim var, AZ kilidi yoxdur) · `geo.py` reverse-geocode `X-Locale` izləyir ·
  **xəritə artıq geolokasiya icazəsi istəyir və fermerin mövqeyinə yaxınlaşır** (yalnız default
  zoom-dadırsa — idxal olunmuş sərhədin üstündən kameranı qaçırmır).
  ⚠️ Ölkə **saxlanılmır**: `field_metadata`-da sütun yoxdur, köhnə select onsuz da heç vaxt yazmırdı.
  Yalnız region xanasının dropdown yoxsa sərbəst mətn olduğunu həll edir. Nəyəsə hesablama lazım
  olsa, sütun sonra əlavə edilə bilər.
- ⬜ Digest dil qarışığı (tr/de/hu/it/pl üçün 3 dil bir məktubda) — T28/T30
- ⬜ 25 ekran xam backend xəta kodu göstərir (`azError()`-u keçmir)
- ⬜ Xəritədə mənbə sətri (fon ili + səhnə tarixi)
- ⬜ `org_is_paid` RLS siyasətləri (yatmış, amma «tarixçəni geri almırıq» qaydasını pozur)
- ⬜ Rəylər 5 beynəlmiləl ada · quiz «Digər» mətn qutusu · yan menyu kəsilməsi (ru/hu)
- ⬜ Bulud %-in granul üzrə olduğunu bildirmək · hava modelinin dəqiqliyi

**W3 (struktur):**
- ⬜ **Per-sahə paylaşma (L)** — sahibin qərarı: bu dalğada. Yeni `field_grants` + `deps.py`-də
  `require_field_access` + ~60 gate çağırışının org-fərziyyəsi
- ⬜ Ferma CRUD + sahə qruplaşdırma · toplu məhsul/mövsüm · PDF/çap hesabatı (60%-i `81660df`-də
  hazır yazılıb) · növbəti peyk keçidi + uğursuz cəhd jurnalı · e-poçt unikallığı

### ⚠️ Yoxlanmamış qalan
- Dashboard xəritəsinin sahələrə yaxınlaşmaması — kodda `fitBounds` var; canlıda gördüyüm çox güman
  ki, **gizli-tab artefaktıdır**. Açıq tabda yoxlanmalıdır, kor-koranə dəyişilməməlidir.
- Hava radarı eyni səbəbdən qiymətləndirilə bilmədi.

---

## D. Tövsiyə olunan növbə (sıra) — 2026-07-30 yenidən yazıldı

> Köhnə sıra (T0/T1/T2/T4/T5/T6/T8-T12 + T14) tamamilə bitib və ya çıxarılıb — silindi.
> 2026-07-26 sırasının **1, 4 və 6-cı bəndləri də düşdü**: (1) 0046–0049 doğrulaması `4c7e9dd`-də
> bağlandı · (4) T29 səhv yazılmış task idi · (6) T7 hesabatlar sadələşdirmə ilə ləğv olundu.

1. **Deploy borcu, hər şeydən əvvəl.** §A.2-də 🚀 olan sətirlərin **canlı olduğu repodan sübut
   olunmur**: `8f25630` (Terra Oracle) və `03eb081` (OneSoil mobil) dalğalarının hər ikisinin ardınca
   build düzəlişi commit-i gəlir (`c13ba8f`, `05c3870`), yəni o an `update.sh` **konteyner əvəz
   etmədən** dayanmışdı; `786bb4d..decbdb2` dalğası isə heç yoxlanmayıb. Bu Mac-da node yoxdur →
   yeganə TS gate serverin `docker build web`-idir. **Miqrasiya 0055/0056 image-dən ƏVVƏL.**
2. **U11** canlı smoke-test (yenilənmiş siyahı §B-dədir — «16 bölmə» və `/farm` artıq yanlışdır).
3. **T28** + **T30** — digest həm 5 dildə ingiliscə gedir, həm də AZ məsləhət mətnini sitat gətirir.
   İlk Çərşənbə göndərişindən ƏVVƏL düzəlt, yoxsa səhv ilk təəssürat 8 dildən 5-inə çatır.
4. **T32** MX qeydi — `ulkar@agradex.com` indi **hər dildə** göndərəndir, amma cavab qəbul etmir.
   Tək göndərənə keçmək bu boşluğu daha görünən etdi: bütün cavablar bir ünvana gedir və orada itir.
5. **T27** cəm səthləri (S) + **T31** `HLS_ENABLED` dead-end (S) — hər ikisi təmiz, asılılıqsız.
6. **T33/T34** AI xərc qərarı — `18113e3`/`decbdb2` ölçməni bağladı, qərar qalır; **2026-08-31**
   Sonnet 5 tarif artımı sərt tarixdir.
7. *Paralel — istifadəçi açanda:* **U1** EARTHDATA (sərt deadline) · **U2** LLM rotate · **U4** Telegram
   token (→ T22 aktivləşir) · **U6** EPPO (→ T9 datası).
8. Təxirə: **T15** səs · **T19** export/annotasiya qalığı · **T23** iki-tərəf bot ·
   **T26** icma forumu · **T25** D3 L1+L2 · **T21** Faza-3/4 · **T35** dormant cədvəllərin taleyi.

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
- **4 ERP modulu tək `/farm` tabının içindədir** və park olunub; **Kataloq/İcma** məzmun gələnə qədər `SHOW_MARKETPLACE_NAV` arxasında gizlidir (route/API/komponentlər canlı, birbaşa link işləyir).
- **Hektar DB/API vahidi olaraq qalır** — çevirmə yalnız render kənarında (`lib/units.ts` `"use client"`; Server Component-lər `formatArea()` çağırmamalıdır). Sahə YAZAN yerlər `fromUnit()` ilə geri çevirməlidir (YieldsTab belə edir). **Hektar-başına dərəcələr** (t/ha, kq/ha dozalar) qəsdən hektar-başına qalır — normalar belə dərc olunur.
- **Backend fermerə görünən mətni Python-da tərcümə ETMİR** — `*_code` + `*_params`, AZ cümlə yalnız köhnə sətirlər üçün fallback. Bir yol digərinin mətnini əvəz edirsə, **kodu da əvəz etməlidir** (bu, b2e973f-də düzəldilən real bug idi).

## 2026-07-27…30 — SHIPPED (detal §A.2; burada yalnız gələcək işi məhdudlaşdıran qərarlar)

- **Məhsulun əhatəsi rəsmən daraldı** (`81660df`): **peyk təsviri və indekslər · AI analiz və tövsiyə ·
  hava · sahə qeydi**. Yeni funksiya təklif edəndə əvvəl sual: bu dördündən birinə xidmət edirmi?
  ERP-yə qayıdış (dəftər/satış/anbar/texnika/hesabat/tapşırıq/məhsuldarlıq/zonalar) **qərarla geri
  alınmalıdır**, təsadüfən yenidən qurulmamalıdır.
- **Silinən funksiyaların DB cədvəlləri qəsdən qalır** — «yatmış və geri-qaytarıla bilən». Sxemdə ölü
  cədvəl görüb drop etmə (→ T35).
- **`operations` mühasibat deyil, AI girişidir** — `ai/context.py` onu oxuyur. Növbəti sadələşdirmədə
  «əməliyyat jurnalı da ERP-dir» deyib silmək məsləhətin keyfiyyətini azaldar.
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
