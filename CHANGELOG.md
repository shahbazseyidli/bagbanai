# Changelog

Bütün əhəmiyyətli dəyişikliklər burada qeyd olunur. Format [Keep a Changelog](https://keepachangelog.com/),
versiyalar [SemVer](https://semver.org/).

## [1.17.0] — 2026-07-30 — Email-only qeydiyyat + magic link + avtomatik sahə adı + AI xərcinin ölçülməsi

> Mənbə: `786bb4d`, `4f350c2`, `7021a66`, `18113e3`, `decbdb2`. Miqrasiyalar **0055**, **0056**.
> ⚠️ **Deploy statusu repodan sübut olunmur.** `7021a66` və `18113e3` **prod DB-sini oxuyub** ölçü aparır
> (`ai_usage` ledger-i, `zone_knowledge` sətirləri) — bu, kodun canlıya vurulduğunu göstərmir. Miqrasiya sırası:
> **0055 və 0056 yeni api image-dən ƏVVƏL** (hər ikisi əlavəedici və köhnə image işləyərkən təhlükəsizdir;
> yeni kod isə onlara SELECT/INSERT edir). `update.sh` miqrasiya işlətmir — ayrıca əl addımıdır.

### Added
- **Magic link ilə giriş (`786bb4d`, migration 0055 `login_tokens`):** `secrets.token_urlsafe(32)`, DB-də
  yalnız **sha256** saxlanılır, 15 dəqiqə, tək istifadə (atomik şərtli `UPDATE`). Endpoint həm qeydiyyat,
  həm giriş üçündür və **hər iki halda eyni cavabı verir** — hesab sadalamağa (enumeration) yaramır;
  bitmiş/xərclənmiş/etibarsız üçün **tək fərqlənməyən xəta** eyni səbəbdən. **Parol girişi toxunulmayıb**
  (hash-ı olan hesablar əvvəlki kimi girir).
  Token **URL fraqmentində** (`#`) gedir, query-də yox: brauzer `#`-dən sonrasını ötürmür, ona görə nə nginx
  access log-una, nə landing-in çəkdiyi asset-lərin `Referer` başlığına düşür (`?token=` ilə hər girişdə
  loga **iki dəfə** yazılırdı).
- **Sahənin adı həmişə var (`786bb4d` + `4f350c2`):** ad server tərəfdə, advisory lock altında, **org
  daxilində** və mövcud adlardan törədilir (`count(*)` yox) — soft-delete olunmuş «Sahə 2» adını növbəti
  sahəyə vermir.
- **`ai_usage.source` (migration 0056, `18113e3`):** çağırışı **kim başladı** — `auto` (pipeline/cron/research
  drain) vs `user` (chat, əl ilə yenidən-generasiya). Batch API qərarı (50% endirim ↔ «24 saat içində»)
  məhz bu ayrımı tələb edir. **Tarixi sətirlər NULL qalır** — qəsdən backfill edilmir, çünki təxmin edilmiş
  dəyər `GROUP BY`-da ölçülmüşdən seçilməz olur.
- **`tools/bakeoff.py`** — provayder müqayisə qoşqusu (`decbdb2`).

### Changed
- **Qeydiyyat tək sahədir (`786bb4d`):** yalnız email + bir düymə. Ad, soyad, parol, ölkə, rayon çıxdı —
  hamısı istəyə bağlıdır və `/account`-dadır.
- **Tək göndərən:** 8 dil personası → hər dildə **Ülkər Nəsirova `<ulkar@agradex.com>`**. Sahibin qərarı ilə
  azərbaycanca ad seçildi (əsas auditoriya). ⚠️ `notify.py` başlığı açıq yazır ki, ünvan indi **təkdir, amma
  hələ çatılan deyil** — agradex.com MX dərc etmir, cavablar bounce olur (poçt qutusu + MX qalır).
- **nginx `set_real_ip_from` Cloudflare aralıqları** (hər iki konfiqdə): `CF-Connecting-IP` nginx tərəfindən
  olduğu kimi ötürülürdü, ona görə per-IP limit **saxta başlıqla keçilirdi** — istifadəçi yaradan və məktub
  göndərən auth-suz endpoint üzərindəki yeganə qlobal əyləc.
- **AI qiymət cədvəli tarixləndi (`18113e3`, `ai/pricing.py`):** sabitlər → `(effective_from, input, output)`,
  çağırış günündə qüvvədə olan sətir qalib gəlir. Səbəb konkretdir: Claude Sonnet 5-in $2/$10 tarifi
  **2026-08-31-də bitir** və $3/$15 olur — sabit qalsaydı hər sonnet çağırışı **50% əskik** hesablanacaqdı,
  həm də admin panelin və «keçmək sərfəlidirmi» müzakirəsinin oxuduğu cədvəldə. Sentyabr dəyişikliyi
  **əvvəlcədən yazılıb**. Əlavə: `claude-opus-5` (GET /v1/models ilə təsdiqlənib), Anthropic keş
  multiplikatorları, müqayisəyə düşən qeyri-Anthropic modellər (yoxsa `DEFAULT`-a düşüb Opus qiymətinə
  hesablanırdılar).
- **Web axtarış artıq hesablanır:** Anthropic 1 000 server-tərəfli axtarışa $10 alır; `ai/research.py`
  `max_uses=4` ilə işləyir, yəni hər research işi ledger-də **olmayan** $0.04-a qədər alət haqqı daşıyırdı.
- **Bake-off Anthropic-i prodakşnın çağırdığı yolla ölçür (`decbdb2`):** qoşqu məcburi **tool** çağırışı
  (`input_schema` — «ən yaxşı səy», `required` zəmanəti yox) işlədirdi; prodakşn isə
  `messages.parse(output_format=…)` (structured outputs, sxemə qarşı validasiya). Yəni qoşqu **məhsulun heç
  vaxt icra etmədiyi** kod yolunu qiymətləndirirdi. SDK ilə yenidən ölçüldü: 3 model × 3 prompt = **9/9,
  sıfır müqavilə pozuntusu** (əvvəl təxminən hər 3 promptdan biri). Çıxış tokenləri də düşdü (Opus eyni
  promptda 2146 → 1565) — tool sxemi modeli cavabın içində formanı təkrarlamağa itələyir. Digər üç
  provayder **qəsdən** xam HTTP-də qalır: OpenAI `strict json_schema`, Gemini `responseSchema`, DeepSeek
  sxemsiz `json_object` — onların **əsl** mexanizmi budur.

### Fixed
- **Magic link uçdan-uca ölü idi:** məktubdakı link `/magic`-ə gedirdi, marşrut isə `/auth/link` —
  hər link 404 verirdi. İki yarım fərqli dillərdə olduğu üçün heç bir kompilyator tuta bilməzdi.
- **`POST /magic-link` `send_email`-in boolean cavabını atırdı** → rotate olunmuş açar, bounce və ya timeout
  halında da fermerə «poçtunuza baxın» deyirdi. İndi **502** (heç nə sızdırmır — yanındakı 503 kimi, budaq
  yalnız nəqldən asılıdır).
- **Keçici şəbəkə xətası etibarlı, XƏRCLƏNMƏMİŞ linki məhv edirdi** — token URL-dən təmizlənmişdi və yalnız
  closure-da yaşayırdı, catch-all isə «yeni link istəyin» deyirdi. İndi `ApiError` (server rədd etdi) və
  şəbəkə xətası ayrı nəticələrdir, ikincisi **təkrar cəhd** təklif edir.
- **`schemas.FieldIn.name: str` avtomatik adı bloklayırdı (`4f350c2`):** `routers/fields.py` adı onsuz da
  generasiya edirdi, amma Pydantic adsız sorğunu handler işə düşməmişdən **422** ilə rədd edirdi — funksiya
  tam qurulmuş və **əlçatmaz** idi.
- **Bilik keşi heç vaxt oxunmurdu (`7021a66`):** prod `ai_usage` ledger-indən ölçüldü — `research` bütün AI
  xərcinin **58%-i** idi (6 iş, ~$0.38/iş; müqayisə üçün advice ~$0.055). Səbəb model və ya prompt deyildi:
  `zone_knowledge` (crop_type + zone_id üzrə açarlanır, org-lar arasında **paylaşılan**) və `kb.read_zone_blocks()`
  mövcud idi, amma orkestrator hər dəfə birbaşa `_synthesize_zone`-a gedirdi. Yəni hər yeni sahə 4-axtarışlı
  web_research sintezi işlədib cədvəldə **onsuz da təzə** duran məzmunu üstünə yazırdı — israf sahə sayına
  yox, **QEYDİYYAT sayına** görə böyüyürdü (`routers/fields.py` hər sahə yaradılışında `blocks=["ALL"]`
  enqueue edir). `index_norms` bir blok aşağıda eyni formada idi: **məhsul başına** data, sahə başına yenidən
  törədilirdi, 0026-nın `norms_source`/`norms_updated_at` provenans sütunları oxunmadan qalırdı; `seed` sətri
  isə nüfuzludur və `_writeback_norms` onun üstünə yazmır — yəni model pulu **atılacaq cavab** alırdı.
  İndi: yalnız **tam** blok dəsti hit sayılır (`_synthesize_zone` beşini bir çağırışda verir), araşdırılmış
  norms 180 günlük TTL ilə təzələnir, keş hitləri `zone:cached` / `index_norms:cached` kimi qeyd olunur ki,
  **heç nə etməyən iş** uğursuz işdən seçilsin. Model/prompt/provayder **qəsdən toxunulmadı**.

## [1.16.0] — 2026-07-28 — OneSoil mobil: xəritə ana səhifədir

> Mənbə: `03eb081` (+ build fix `05c3870`). Ölçü mənbəyi `docs/ONESOIL_MOBILE_TEARDOWN.md` —
> real OneSoil Android tətbiqinin adb + uiautomator ilə piksel-ölçülmüş teardown-u, təxmin deyil.
> ⚠️ **Deploy statusu repodan sübut olunmur** — `05c3870` uğursuz `next build`-i düzəldir (o vaxta qədər
> `update.sh` heç bir konteyner əvəz etmədən dayanmışdı); ondan sonra canlı doğrulama qeydi yoxdur.

### Added
- **Telefonda `/` = təsərrüfatın tam-bleed xəritəsi** (`home/MapHome.tsx`), altında günün diqqət materialı.
  Yığılmış «salam + kartlar» ana səhifəsi getdi. **Heç nə atılmadı, yeri dəyişdi:** poliqon rəngi + diqqət
  zolağı «hansı sahə məni istəyir»i daşıyır, alertlər üst-panel zəngində qalır, «Sahələrim» = `/fields` tabı,
  `/more` isə `/account`-da bir sətirdir.
- **Beş həqiqi tab:** Xəritə · Sahələr · Hava · Qeydlər · Hesab. Mərkəzdəki **«+» menyudan çıxdı** — OneSoil
  sahə-əlavəni xəritənin üstündə 48×48 kontrol kimi verir (teardown §2).
- **Yağış radarı (`weather/RadarMap` + `RadarScrubber` + `useRadarFrames`):** RainViewer, **açarsız və
  krediti ilə**. Keçmiş kadrlar **müşahidə**, nowcast kadrları **proqnoz** — ikisi heç vaxt eyni şey kimi
  təqdim olunmur.
- **`/notes` — təsərrüfat üzrə skautinq jurnalı.** Backend lazım idi: `GET /api/scouting` `field_id` tələb
  edirdi, yəni bir təsərrüfatın qeydlərini siyahılamağın yolu **yox idi**. Org-səviyyəli oxu yenidir;
  sahə-səviyyəli yol **bayt-bayt eynidir**.
- **Sahə ekranı telefonda tabsızdır:** tək skroll — xəritə kartı → səhnə tarixçəsi → sağlamlıq → AI məsləhət →
  hava → çiləmə; qalan altı bölmə «Daha çox» siyahısında. **Hər `?tab=` dərin linki hələ də həll olunur**
  (bildiriş/paylaşma linkləri sınmır), desktop isə bölmə menyusunu saxlayır — ikisi də `fieldSections.ts`-dəki
  **tək taksonomiyanı** oxuyur.

### Fixed
- **Çiləmə bloku hər fermerə pəncərənin «hava datası hazır olanda» görünəcəyini deyirdi.** Bilik Pasportu
  Pro/Business-dir, billing təxirə salınıb, yəni **hər org pulsuzdur** və hər org **yalan səbəb** alırdı.
  İndi `gated` oxunur və heç nə demir — billing qaydasına görə havanı günahlandırmır.
- **Uğursuz `/api/fields/geo` telefon ana səhifəsini sessiya boyu fırlanan skeleton-da qoyurdu** — «yoldadır»
  və «uğursuz oldu» eyni `null` idi. İndi ayrıdır.
- **Sahə-əlavə kontrolu xəritə budağının içində idi**, yəni fermerin ona ən çox ehtiyacı olan üç vəziyyət
  (yüklənir, uğursuz, hələ heç nə çəkilməyib) məhz onsuz qalırdı — üstəlik aşağı menyudakı «+» artıq
  «sahə-əlavə xəritədə yaşayır» əsasıyla silinmişdi.
- **Qeydlər başlığı «Hamısı: 100» yazırdı**, altındakı footer isə siyahının kəsildiyini deyirdi. Endpoint indi
  limitdən **bir sətir artıq** oxuyub `has_more` qaytarır — kəsilmə **müşahidə olunur**, ehtimal edilmir.
- Bir uğursuz qeydlər oxuması xəta bannerini bütün sonrakı uğurlu oxumaların üstündə saxlayırdı.
- Telefon geri-zolağı **dərinlik** lazım olan yerdə boolean işlədirdi → bölmə → bölmə → geri, adını çəkdiyi
  ekrandan başqa yerə düşürdü.
- **`/weather` və `/notes` middleware-in app-path siyahısında yox idi** → marketinq apex-i onları çılpaq
  verirdi; `/weather`-in ümumiyyətlə desktop girişi yox idi.
- `RadarMap`-də hoisted closure-ların tutduğu `map` üçün açıq tipli alias (`05c3870`) — `const map = …; if (!map) return;`
  effekt gövdəsində daraldır, amma `stop`/`finish` **hoisted funksiya bəyanlarıdır** (qəsdən — `.on()`
  zamanı gələn `sourcedata` hadisəsi const-ı temporal dead zone-da tutmasın deyə), TypeScript isə
  control-flow daralmasını hoisted gövdəyə daşımır.

## [1.15.0] — 2026-07-27 — Sadələşdirmə (ERP yarısı çıxdı) + Terra Oracle iş masası + OneSoil mobil komfort

> Mənbə: `3f5f9ce`, `81660df`, `a1b362e`, `31b6e58`, `8f25630`, `c13ba8f` (+ sənəd `4c7e9dd`, `e4a7c13`).
> **Deploy statusu iki hissədə fərqlidir:** `81660df` + `a1b362e` dalğası **canlı doğrulanıb** — `31b6e58`
> commit mətni 614px-də ölçmələri və sahib hesabının deploy-dan sonra `ru`-ya uyğunlaşmasını qeyd edir.
> `8f25630` (Terra Oracle) dalğası üçün repoda uğurlu build/deploy qeydi **yoxdur** — `c13ba8f` məhz uğursuz
> `next build`-i düzəldir, ondan sonrakı yeganə commit sənəddir. Serverdə təsdiqlə.

### Removed
- **ERP yarısı məhsuldan çıxdı (`81660df`) — sahibin qərarı, 12 funksiya.** Qalan məhsul: **peyk təsviri və
  indekslər, onları oxuyan AI analiz və tövsiyə, ətrafdakı hava, hər ikisini qidalandıran sahə qeydi.**
  - **Sahə bölmələri:** `tasks` · `yields` · `zones` (məhsuldarlıq zonaları) · `harvest`. Sahə səhifəsi
    **16 → 12 bölmə**.
  - **Təsərrüfat modulları:** dəftər · satış · anbar · texnika · yığım sifarişi · yerlər — **və onları
    saxlayan `/farm` konteyneri**. `farmSections.ts`, `farmRedirect.ts` və `/ledger` `/sales` `/inventory`
    `/equipment` redirect-ləri də getdi; hamısı indi **404**.
  - **Hesabatlar** (`reports`, 1027 sətir) — indicə getmiş dəftər/satış/tapşırıq/məhsuldarlıqdan oxuyurdu;
    saxlamaq **boş hesabat göndərmək** olardı.
  - **Marketinq səhifələri:** `/whats-new` (+`/yenilikler`) · `/status` · `/finduq`.
  - **8 backend router silindi** (`equipment`, `harvest_order`, `inventory`, `ledger`, `places`, `reports`,
    `sales`, `zones`); rail 11 → **5 istiqamət**; **445 i18n açarı** 8 lüğətdən çıxdı.
  - **`deploy/process-zones.sh`** repodan və **serverin crontab-ından** silindi (girişi olmayan funksiya üçün
    hər 5 dəqiqədə işləməyə davam edərdi).
  - ⚠️ **DB CƏDVƏLLƏRİ DROP EDİLMƏYİB** — subsidiya kalkulyatoru ilə eyni naxış: data yatmış və geri-qaytarıla
    bilən qalır. Bu **məhsul qərarıdır, sökülmə deyil**.
  - **Mühakimə tələb edən üç yer:** (1) `mgmt.py` tasks + operations + yields-i birlikdə saxlayırdı —
    **operations QALDI**, çünki onlar mühasibat yox, **AI girişidir** (`ai/context.py` oxuyur ki, məsləhət
    «10 gün əvvəl suvarma qeyd olunub, NDMI hələ düşür» deyə bilsin); tasks/yields oradan kəsildi, əməliyyat
    jurnalının tetiklədiyi anbar çıxımı ilə birlikdə. (2) `ai/context.py` tasks/yields oxumağı dayandırdı —
    yoxsa modelə həmişə **boş iki siyahı** gedərdi. (3) `BackfillCard` yalnız `zones` bölməsindən əlçatan idi
    və keçmiş mövsümləri istəməyin **YEGANƏ** yoludur (mövsüm müqayisəsini və proqnozun `own_history` pilləsini
    qidalandırır) → `season` bölməsinə köçdü, artıq heç kimin istehlak etmədiyi piksel-başına COG-ları yazan
    `for_zones` bayrağı olmadan.
  - `notify_prefs` texnika/anbar ilə gedən `service_due` və `low_stock` xəritələmələrini atdı.
- **`?ui=v1` köhnə konsol Dashboard-u və `lib/uiFlag.ts` (`8f25630`)** — `TodayHome` həftələrdir default idi,
  yəni qaçış lyukunun auditoriyası yox idi, amma `/`-a hər layout dəyişikliyi **iki dəfə** düşünülməli olurdu
  (geniş-səhnə işi məhz buna ilişmişdi). Sahə səhifəsinin paralel v1 budağı da getdi; **13 yetim `dash.*`
  açarı** 8 lüğətdən çıxdı.

### Added
- **Sahə səhifəsində davamlı xəritə kartı (`3f5f9ce`)** — E14-ün sildiyi hero **qəsdən** geri gətirilmədi:
  normal axında məhdud, yuvarlaq **KART**, bölmə naviqasiyasının **üstündə** mount olunur ki, bölmə
  dəyişikliyindən sağ çıxsın. Sol-üstdə indeks çipləri, sağ-üstdə tam ekran, kənarda şaquli leqenda, altda
  tarix zolağı (struktur `docs/ONESOIL_MOBILE_TEARDOWN.md` §4.8/§5.4-dən ölçülüb). Tam ekran tarix zolağını
  sabit saxlayır və **URL-də yaşayır** (`?map=full`) — Android geri jesti onu pulsuz bağlayır.
  **Heç vaxt ikiləşmir:** geniş səhnədə xəritə iş masasınındır, `satellite` və `zones` bölmələri özününküsünü
  qurur — kart onların heç birində render olunmur. **Skautinq yeganə geniş-ekran istisnasıdır**: xəritəsiz
  pinlər = çıxışı silinmiş funksiya.
- **Skautinq qeydləri xəritə datasına çevrildi (`3f5f9ce`):** pinlər həmin kartda render olunur, birinə
  toxunmaq qeydi açır, qeyd artıq **redaktə, silinə və HƏLL OLUNA** bilir — həll olunmuş **silinmiş deyil**,
  tarixçədə tarixi ilə qalır; skautinqi to-do siyahısı yox, **qeyd** edən budur. Yerləşdirmə sabit mərkəz
  retikulu + altdan sürüşən xəritə ilə olur: barmaq toxunduğu nöqtəni örtür, ona görə telefonda nöqtəni
  dəqiq qoymağın yeganə yolu budur. (Miqrasiya **0054** koordinatları onsuz da 2026-07-26-da əlavə etmişdi.)
- **Terra Oracle iş masası (`8f25630`) — üç səth.** Sahibin tələbi: portal.terraoracle.ai-ın ciddiliyi
  (proporsiyalar, menyu yeri, qrafiklər, tarix filtrləri) — **bizim funksiyalarla**.
  - **Shell:** 78px yuvarlaq üzən rail → həqiqi **sidebar** (fixed, tam pəncərə hündürlüyü, sol kənara yapışıq,
    kvadrat künc, üstdə wordmark, ikon+etiket sətirləri). `Nav` üst panel oldu: sidebar toggle + marşrutdan
    törənən qalın səhifə başlığı + zəng/kömək/avatar. **Yeddi istiqamət:** Bu gün · Sahələr · Kataloq · İcma ·
    Daha çox, aşağıda Bildirişlər və Hesab.
  - **Dashboard:** 8 KPI plitəsi, scope dropdown, xəritənin **rəngləmə mənbəyini** seçən seqment
    (sağlamlıq / xəbərdarlıqlar / hava), əsas obyekt kimi çox-sahə xəritəsi, yanında Məlumat lenti.
  - **Sahə qrafik paneli (`field/chart/`):** seçilmiş tarix, `1H 1A 3A 6A 1İ Hamısı` aralıq kontrolu,
    ←/Bu gün/→ addımlayıcısı, həll olunmuş aralıq, **hansı indeksin çizildiyini** seçən Layers dropdown-u,
    kilid və tam ekran. Dəyər-rəngli xətt, hər real səhnəyə bir nöqtə, zolağı ilə kəsik proqnoz davamı,
    Bu gün markeri, hover tooltip.
  - **QURULMAYAN (qəsdən):** *MARKET INTELLIGENCE* və *VRA* — məhsulda nə bazar datası, nə dəyişkən-doza var,
    ona görə o referans plitələrinin **dürüst mənbəyi yoxdur**. Yerinə API-nin onsuz da verdiyi dörd şey:
    peyk emalı vəziyyəti, qüvvədə olan suvarma tövsiyələri, diqqət tələb edən sahələr, ən yeni səhnə tarixi.
    Naməlum = özünü izah edən tire.
- **`/catalog` və `/chat` naviqasiyada göründü** (`SHOW_MARKETPLACE_NAV = true`); `/provider` `/more`-dadır,
  **yalnız provider rollu hesablara** — o, fermerdə olmayan profili redaktə edir.

### Changed
- **Desktop tam-bleed iş sahəsi (`a1b362e`):** app host 1152px oxu konteynerindən çıxır — axıcı bleed track
  (rail / sahə siyahısı / səhnə), maksimum 2200px, səhnə **marşruta görə** siniflənir ki, proza məhdud qalsın,
  xəritə-əsaslı səthlər isə pəncərəni alsın. Ölçülən səhnə 1440px-də **778 → 938px**.
  **Marketinq konstruksiyaya görə toxunulmazdır** — bleed `AppShell`-in app-host erkən return-undan SONRA yaşayır.
- **«Bu gün» instrument paneli:** ölçülmüş 760px səhnənin üstündə 4 stat plitəsi, çox-sahə xəritəsi əsas
  obyekt kimi, xəbərdarlıqlar yan reyd kimi.
- **Mobil komfort (OneSoil):** həmişə görünən etiketli **80px** aşağı menyu + 64×32 aktiv pill, **48px toxunma
  döşəməsi**, və `--nav-h` / `--nav-clear` — aşağıya bağlanan heç nə bir daha zolağın hündürlüyünü **təxmin
  etməsin** deyə.
- **Qat seçici (`field/layers/`):** on indeks akronimi saymaq əvəzinə **sahənin özünü hər indeksdə render
  edilmiş şəkli** + hər qata bir sadə cümlə; sayğaclı (ref-counted) `lib/scrollLock.ts` ilə — iç-içə sheet
  `<html>`-i `overflow:hidden`-də qoya bilmir.

### Fixed
- **`h-[min(360px,46dvh)]` — dəstəklənməyən vahid daşıyan `min()` PARSE anında etibarsızdır**, ona görə bütün
  hündürlük atılır, kart yığılır və MapLibre **0×0** ölçüdə qurulur. `dvh` Chrome 108 / Safari 15.4-dür, yəni
  məhz bu məhsulun hədəflədiyi büdcə Android. İndi px hündürlük + dvh tavanı.
- Yükləmə pərdəsində `pointer-events-none` yox idi → hər `/scenes` gedişi boyu xəritə **sürüşdürülə bilmirdi**,
  yerləşdirmə rejimində isə retikulun **üstündə** dururdu.
- **Tam ekran skroll kilidi no-op idi:** `globals.css` `html,body`-yə `overflow-x:hidden` verir, ona görə
  body-nin overflow-u artıq viewport-a yayılmır. İndi `documentElement` kilidlənir.
- «Xəritədə yerləşdir» ekrandan kənarda başlayırdı; `flyTo` `ready`-yə gate olunmamışdı (konstruksiyadan əvvəlki
  «xəritədə göstər» atılır və təkrarlanmırdı); `sectionHref` `?map=full`-u növbəti bölməyə kopyalayırdı.
- **`Nav` shell-in track-ını import etmirdi**, ona görə ≥1280px-də hər app marşrutunda loqo rail-dən ~380px
  sağda dururdu.
- **Toplu (bulk) zolaq hələ `/api/bulk/tasks`-ə POST edirdi** — `81660df`-də silinmişdi, yəni düzgün görünən
  formanın arxasında **zəmanətli 404**. Task yarısı çıxarıldı, 14 ölü açar 8 lüğətdən düşdü.
- **`FieldMapCard` `/scenes`-i olduğu kimi qəbul edirdi**, ona görə HLS fallback-ı **Sentinel-2 kimi** render
  olunur və həmin tile seçicinin keşinə **hazır S2 preview** kimi düşürdü.
- **«Hər şey qaydasındadır» heç kimin qiymətləndirmədiyi sahənin üzərinə yazıla bilirdi:** `fetchFieldToday`
  öz sorğularını tutur, ona görə 404 verən sahə də `null` verdiktlə **həll olunmuş** sayılırdı. Qapı indi
  **qiymətləndirmədir**, həll olunma deyil.
- **Reduced-motion sıfırlaması 14 spinnerin hamısını** bir 0.01ms dönüşdən sonra dondururdu — spinner çox yerdə
  yeganə «işləyir» siqnalıdır.
- **Bildiriş zəngi 36px idi (`31b6e58`).** Bu, sadəcə 12px deyil: aşağı menyu beşinci slotunu **məhz** header-in
  bu zəngi daşıdığına görə `/account`-a verir, yəni telefonda bildirişlərin giriş nöqtəsi odur və həmin
  zolaqla eyni hədəfi ödəməlidir. Badge indi düymədən yox, **ikondan** asılır (yoxsa 48-ə böyüyən hit sahəsi
  nöqtəni zəngdən ~14px uzağa üzdürərdi). Telefon ana səhifəsindəki «sahə əlavə et» və «bütün xəbərdarlıqlar»
  20px idi → hit sahəsi **pseudo-element** ilə böyüyür (padding sətrin ritmini sürüşdürərdi).
- **`users.locale` yalnız `LanguageSwitcher` tərəfindən yazılırdı**, halbuki middleware interfeys dilini
  **marşrut prefiksindən** qurur — `/ru/fields`-i bookmark etmək interfeysi həmişəlik dəyişir, hesab isə `az`
  qalırdı. Sorğu daxilində işləyən hər şey `X-Locale` ilə xilas olurdu; **sorğusu olmayan** iki səth
  (səhnədən sonrakı avtomatik məsləhət, həftəlik digest) oxucunun tərk etdiyi dildə yazırdı. İndi hesab
  yükləmə başına **bir dəfə**, **yalnız açıq siqnaldan** uyğunlaşdırılır. Eyni yerdə panel-split-dən əvvəlki
  **host-only** `bagban_locale` cookie-si də silinir (domain-scoped yazı onu əvəz edə bilmir).
  ⚠️ Canlı doğrulanmış: sahib hesabı `bagban_locale`-i **iki dəfə** (tr və ru) daşıyırdı, `users.locale` isə
  üçüncü dəyərdə (`az`) idi; deploy-dan sonra hesab interfeysin həqiqətən render etdiyi `ru`-ya uyğunlaşdı.
- **`Intelligence Feed`-i açıb-bağlamaq eyni mövqedə div-i Fragment-lə əvəz edirdi**, ona görə React MapLibre-i
  **məhv edib yenidən qururdu** — fermerin pan/zoom-u itirdi və yağış nowcast fan-out-u yenidən atəşləndi.
- **Xəbərdarlıq xəritəsi `/api/notifications` UĞURSUZ olanda hər sahə üçün «açıq xəbərdarlıq yoxdur»** iddia
  edirdi. Leqenda bu oxunuşu onsuz da rədd edirdi, hover popup isə yox.
- **Sidebar-ın 256px vəziyyəti və `FieldListPanel` hər ikisi `xl`-də gəlirdi**, ona görə 1280px pəncərə ikisini
  birdən ödəyir və sahə səhnəsi `WORKBENCH_MIN`-dən aşağı, **740px**-ə düşürdü. Sidebar `2xl`-ə keçdi; panel
  **tərpənə bilməz**, çünki onun `xl:flex`-i sahə səhifəsinin `xl:hidden` çip sətri ilə cütdür.
- `dotRender` `: ReactElement` kimi annotasiya olunmuşdu — `@types/react` 19-da (`ReactElement<P = unknown>`)
  recharts-ın `LineDot`-una **assign oluna bilmir**; bu Mac-da node olmadığı üçün yalnız **oxumaqla** tutuldu.
- **Hər qrafik aralığı son PROQNOZ nöqtəsindən geri sayılırdı**, ona görə ekranda proqnoz olanda «1H» tamamilə
  gələcəyi əhatə edir, içində **heç bir ölçmə olmur** və düymə özünü söndürürdü. Aralıqlar indi son **real
  müşahidəyə** bağlanır və span-ın ən çoxu **dörddə birini** proqnoza xərcləyir.
- `stageW` çağırış yerində `number | null` qalırdı, `FieldWorkbench` isə `number` elan edir (`c13ba8f`) —
  `next build` tip-yoxlamasında düşürdü və `update.sh` **heç bir konteyner əvəz etmədən** dayanırdı.
  `stageW ?? 0` yerinə **açıq null testi**: fallback kompilyasiya olunub iş masasının 1000/1280 pillə
  nərdivanına sıfır ötürərdi.

## [1.14.0] — 2026-07-26 — Sahə səhifəsi yenidən (E14) + tək həftəlik email (E15) + rus dili + hesab öz-xidməti

> Detallı sessiya jurnalı: `docs/SESSION_2026-07-26.md`. **37 commit, 211 fayl.**
> ⚠️ Bu buraxılışın son hissəsi (hesab UI, hüquqi səhifələr, push, proqnoz) **hələ deploy edilməyib** —
> istifadəçi nəzarəti altında tək deploy gözlənilir. Miqrasiya 0053 image-dən ƏVVƏL tətbiq olunmalıdır.

### Added
- **Sahə səhifəsi E14 taksonomiyası:** 16 bölmə / 3 qrup, tək mənbə `app/src/lib/fieldSections.ts`.
  «İcmal»→**«Sahənin vəziyyəti»**, «AI aqronom»→**«Sahə analizi»** (monitorinq qrupuna keçdi),
  AI bloku→**«Siqnallar və görülməli tədbirlər»**. `OverviewTab.tsx` + `WellnessCard.tsx` **silindi**,
  yerinə `field/overview/{FieldPulse,SatelliteGlance,SignalsActions,MetadataNudge}`.
  **`?tab=` alias cədvəli QƏSDƏN yoxdur** — köhnə link səssizcə ilk bölməyə düşür.
- **Rus dili — 8-ci locale** (`lib/locales/ru.ts` + `content-locales/ru.ts`), path-prefix `/ru`.
- **Sahə vahidləri:** ha / dönüm / sotka (`lib/units.ts`, migration **0048** `users.area_unit`).
  NULL = ölkədən törə (TR→dönüm); sotka heç vaxt default deyil.
- **Landing onboarding quiz** (4 sual) hero-da; cavablar signup-a və profilə keçir (**0046**).
- **Public demo turu** `/demo` — qeydiyyatsız açıqdır, 5 addımlıq tur, `GET /api/public/demo`
  (**0050** `fields.is_demo`). Marşrut **heç vaxt LLM çağırmır** — anonim endpoint hesab boşaldan
  vektor olardı; məsləhət 8 dildə əvvəlcədən yaradılıb.
- **Desktop iş masası:** geniş ekranda «Sahənin vəziyyəti» tək iş səthinə çevrilir — mərkəzdə xəritə,
  üstündə indeks çipləri, altında səhnə lenti, sağda sağlamlıq balı + siqnallar.
- **Qısa üfüqlü NDVI proqnozu** (`GET /api/fields/{id}/forecast`): üç pilləli metod nərdivanı
  (öz tarixçən → qonşular → cari trayektoriya), Theil-Sen maillik + sönmə + genişlənən zolaq.
  Data yetməzsə **xətt çəkilmir**.
- **Hesab öz-xidməti:** parol dəyişmə, profil redaktəsi, hesab bağlama (**0052**). Bağlama şəxsi
  məlumatı silir, yaratdığı qeydləri saxlayır — 15 cədvəl `users`-ə `NO ACTION` ilə bağlıdır.
- **Məxfilik siyasəti + istifadə şərtləri**, 8 dildə. ⚠️ **Hüquqi baxışdan keçməyib.**
- **Web push** (**0053**) — bildiriş matrisində dördüncü kanal. VAPID açarları gələnə qədər dormant.
- **Bildiriş matrisi:** 5 kateqoriya × kanallar (**0051** `users.notify_prefs`), çatdırılma
  nöqtələrində **həqiqətən tətbiq olunur** — saxlanan, amma işləməyən keçid deyil.
- NDVI thumbnail-ləri sahə siyahısında + paket istifadə barı; AI çatda hazır sual çipləri;
  `PhotoInput` (kamera + qalereya ayrıca).

### Changed
- **Email TAM konsolidasiya (E15):** hər-hadisə-bir-email **silindi** → **tək həftəlik dijest**,
  çərşənbə 07:00 Asia/Baku. `rules/engine._deliver_email` və məsləhət-emaili silindi (hər ikisinin
  yerində «Do not re-add» şərhi var). Tək opt-out `users.email_lifecycle`; `email_alerts` **0047**-də
  DROP. Təcililik in-app + Telegram ilə.
- **NASA/HLS istifadəçi səthindən çıxarıldı** — «Peyk görüntüsü». Data qatı və atribusiya toxunulmayıb.
- **/fields sadələşdi** (xəritə çıxdı), **/farm** dörd modulu bir tabda birləşdirdi (307 redirect).
- **AI məsləhəti oxucunun dilində** (**0049** `advice.lang`): avtomatik generasiya sahibin dilini
  götürür, uyğunsuzluqda bir toxunuşla yenidən yaradılır.
- Marketinq landing artıq **SSR-də** render olunur (əvvəl crawler spinner alırdı) + hreflang.

### Fixed
- **Yanlış «kritik» hökm:** NDMI proxy 0-a çatıb kompoziti aşağı çəkirdi — lecet 28/kritik → 40/diqqət.
  Proxy indi 25–85 bandına sıxılır və **öz adını** daşıyır («Peyk nəmlik siqnalı»).
- **Xəritələr arxa-fon tabda boş qalırdı** — MapLibre style-ı kadr gözləyir (`lib/useMapReady.ts`).
- **`viewport-fit=cover` yox idi**, ona görə `env(safe-area-inset-*)` 0-a həll olunurdu: aşağı menyu
  jest zolağının altında qalırdı. ⚠️ Real cihazda **yoxlanmayıb**.
- Kvota bitəndə `/advice/generate` **200** qaytarırdı → indi **429**.
- Kamera açılmırdı (fayl seçicisi); cəm formaları (`tp()` + `Intl.PluralRules`).

## [1.13.0] — 2026-07-25 — Agradex rebrand + email sistemi (E1+E2 CANLI) + panel split aktiv + UX/i18n

> Detallı sessiya jurnalı: `docs/SESSION_2026-07-25.md`.

### Changed
- **Rebrand: Bağban AI → Agradex** bütün istifadəçi səthlərində (262 yer; app/marketing/7 locale/email/PWA/User-Agent). İnfra id-ləri (`/opt/bagbanai`, repo, `bagban-api` health) qəsdən qaldı.
- **panel split AKTİVLƏŞDİ:** agradex.com=marketing, app.agradex.com=app (`NEXT_PUBLIC_PANEL_HOST`, `COOKIE_DOMAIN=.agradex.com`). Host məntiqi `useIsAppHost()` hook-unda.
- **App-host header-dən dil seçimi götürüldü** (yalnız Settings-də); marketinq apex-də qalır.
- Solution slug-lar ingiliscə: `/solutions/farmer|lab|consultant|supplier` (köhnələr 308 redirect).

### Added
- **Email sistemi TAM (Resend aktiv):** welcome (rola+dilə, 7 persona), data_ready (peyk hazır), davranış lifecycle cron (no_field 1/3/7 · inactive 10/30 · no_crop · trial · edu drip · həftəlik digest), unsubscribe (login-siz), frontend lifecycle-pref toggle. Migration **0044** (email_sends/last_seen_at/email_lifecycle/email_unsub_tokens). Şablonlar 13 × 7 dil.
- **Fermer ad-görünürlük məxfiliyi:** migration **0045** (`users.name_public`), qeydiyyatda+Settings toggle, söndürəndə digərləri `user_<hash>` alias görür (chat+peer). `services/app/display.py`.
- **Admin genişləndirmə:** bütün-sahələr xəritə/siyahı, istifadəçi idarəetmə (deaktiv/rol/admin/email-təsdiq), CSV/JSON ixrac.
- **How it works səhifəsi** (`/how-it-works`, hazelnut səhifəsindən ümumiləşdirildi, 7 dil).
- 8 müvəqqəti test user (chat demo, parol `AgradexTest2026`).

### Fixed
- Panel app-chrome-un marketinq host-una sızması; Nav signed-out flicker (auth localStorage keş).
- Share kartı NASA əvəzinə **Sentinel-2**-yə üstünlük verir; share verdict + 68 metadataOptions dropdown label 7 dilə tərcümə (əvvəl AZ hardcoded).

## [1.12.0] — 2026-07-23 — Subsidiya çıxarıldı + panel-split (dormant) + email bildiriş (CANLI)

### Removed
- **Subsidiya kalkulyatoru məhsuldan çıxarıldı** (#1): `/subsidy` səhifə, Nav/Daha-çox/landing/qiymət istinadları, subsidiya i18n açar+label-ları (+ `labelFor`), Subsidy tiplər, `routers/subsidy.py` + qeydiyyat. DB cədvəlləri (0008 subsidy_*) **dormant** saxlanılır (drop yox, geri dönümlü). Landing feature kartı "AI aqronom məsləhəti"nə keçdi.

### Added / Changed
- **panel.agradex.com bölünməsi (#2) — kod hazır, DORMANT:** tək-app **host-routing middleware** (agradex.com=marketing, panel.agradex.com=app), `NEXT_PUBLIC_PANEL_HOST` boş olanda no-op; session cookie `COOKIE_DOMAIN` (=.agradex.com prod-da) subdomain-lər arası paylaşılır; login `?next=`; **v2 (Bu gün home + map-sheet) DEFAULT** oldu (`?ui=v1` geri çıxarır). Aktivləşmə: `deploy/PANEL_ACTIVATION.md` (CF A-record `panel` + env + nginx + certbot --expand).
- **Email bildirişləri (#4):** rule-engine dispatcher-i critical/warning alertləri opt-in org üzvlərinə email göndərir (`_deliver_email`; quiet-hours 22-07 onsuz gate edir); migration 0030 `users.email_alerts` (default açıq) + `GET/POST /api/auth/email-alerts` + `EmailAlertsToggle` (Daha çox). **Resend açarına qədər dormant.** Canlı: endpoint true→false→true.
- **Email doğrulama (#3):** U3 (OTP/Resend) onsuz hazırdır — eyni `RESEND_API_KEY` ilə aktivləşir.

## [1.11.0] — 2026-07-23 — Redizayn 2-ci dalğa: D3.5/D3.6/D4.3/D4.5/D0.9 (CANLI)

Hər biri build-gate + deploy + canlı test.

### Added / Changed (CANLI, main)
- **D3.6 — Onboarding aktivasiya checklist + huni event-ləri:** `OnboardingChecklist` (endowed 3/5 goal-gradient; auto-addımlar sahə/məhsul/peyk-data server-state-dən + action-link addımlar AI/Telegram; Telegram dormant-da buraxılır; bağlana bilir; tamamlananda gizlənir). Huni: migration 0029 `user_events` + `POST /api/events` (allow-list, fire-and-forget, heç vaxt xəta qaytarmır) + `lib/track`; client field_created/crop_set/advice_viewed/telegram_connected/checklist_complete atır. Canlı: checklist render, event DB-yə düşdü.
- **D3.5 — PWA install (data-hazır):** `InstallPrompt` `beforeinstallprompt`-i tutur, **yalnız dəyər anında** (peyk data hazır) install kartı göstərir; standalone/dismissed-də gizli.
- **D4.3 — Desktop çox-sahə iş sahəsi:** `GET /api/fields/geo` (org-un bütün sahələri geom ilə) + `FieldsOverviewMap` (bütün poliqonlar bir xəritədə, status-rəngli, fit-bounds, klik→sahəni aç), Bu-gün home-da desktop (md+); **org switcher** (>1 org). Fix: `load` etibarsız işə düşürdü → `idle` safety-net + `resize`. Canlı: poliqon yaşıl-ready render.
- **D4.5 — Data-saver:** `lib/dataSaver` (explicit toggle + brauzer Save-Data hint) + `DataSaverToggle` "Daha çox"-da; FieldMapSheet data-saver açıq olanda ağır full-bleed rasteri avto-yükləmir, "Peyk təbəqəsini göstər" tap-to-load çipi verir. Tile-keş sw.js-də (T12).
- **D0.9 — Poller dedupe:** paylaşılan `useFieldDataStatus` hook OverviewTab+SatelliteTab dublikat 6s pollerlərini əvəz etdi.
- **D5.4+ — Guided capture:** kamera FAB birbaşa foto-diaqnoz kartına scroll edir.
- **D1.6 (i18n sweep) → T18-ə birləşdirildi:** tam çıxarış tərcüməsiz churn+risk; T18 (RU/TR) onsuz eyni sətirlərə toxunacaq — çıxarış+tərcümə birlikdə ediləcək. **D5.5 çöl testi** = insan addımı (real fermer).

## [1.10.0] — 2026-07-23 — Redizayn D3/D4/D5 əsas hissə (autonomous run) (CANLI)

Hər biri build-gate + deploy + canlı test. SKIP olunanlar asılılıqla bloklanıb (aşağıda).

### Added / Changed (CANLI, main)
- **D3.1 — Public landing xəritəsi:** signed-out home tam-ekran peyk xəritəsi (`PublicLanding`) — Nominatim axtarış + geolokasiya + **anonim toxun-tap** → sərhəd (yeni auth-suz/yazımsız `/api/geo/segment-public`) → sahə + tək CTA; çəkilən tarla localStorage draft → **onboarding-ə prefill** (dəyər→hesab döngüsü). MapLibre lazy (next/dynamic). Canlı: segment-public real sərhəd, draft prefill 13.869 ha.
- **D3.2 — Landing ani-dəyər:** detected-kartda canlı hava (keyless Open-Meteo, sahə mərkəzi) + subsidiya CTA.
- **D4.4 — Qiymət redizaynı:** `PricingTable` 3 yığılmış kart (lucide ikon+söz, emoji/cədvəl/scroll yox), per-tier check bulletlər, **free-core xətti** (peyk xəritəsi + hava həmişə pulsuz). Canlı doğrulandı.
- **D4.1/D4.2 — Chart cilası:** SatelliteTab-a bölgə **p10–p90 kölgəli zolağı** (ComposedChart range Area; T10 onsuz p10/p90 qaytarırdı); benchmark xətti + cloud filtr + multi-seriya onsuz var. Canlı: chart xətasız.
- **D5.2 — Səsləndir (TTS):** `SpeakButton` (brauzer Web Speech API, **asılılıqsız/offline**) — İcmal verdict + AI məsləhət səsləndirilir (az→tr→ru). Aşağı-savadlı/yaşlı fermerlər üçün əlçatanlıq. Canlı: klik `speaking=true`.
- **D5.3 — Offline UX:** qlobal `OfflineIndicator` (Oflayn + gözləyən-say / göndərilməyib / sinxronlaşdı çip; offlineQueue T12). Canlı: offline hadisəsi çipi göstərir.
- **D5.4 — İŞLƏR click-first:** `ChoiceChips` (tap-seç + "Digər") — Operations (növ+valyuta), Yields (vahid), Tasks (növ). Fermer sahədə kateqoriya yazmır. Canlı doğrulandı.
- **SKIP (asılılıq — istifadəçi göstərişi "asılılıq çıxarsa skip et"):** D5.1/T23 Telegram iki-tərəf (Telegram token) · D5.2-STT mikrofon-transkripsiya (STT provayder; TTS oxuma bitib) · D3.3 telefon-OTP (SMS delivery; email-OTP U3 onsuz var) · D5.5 çöl testi (real fermer — insan addımı).

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
