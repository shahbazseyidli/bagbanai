# Agradex SEO Planı — audit, strategiya, icra (2026-08-02)

> **Status: TƏKLİF — müzakirə gözləyir.** Heç bir kod dəyişikliyi edilməyib.
> Mənbə: 4 paralel araşdırma axını (2026-08-02) — ① kod bazası auditi, ② canlı sayt auditi (agradex.com/app.agradex.com), ③ Google 2025-2026 siyasət tədqiqatı (ilkin mənbələrlə), ④ 10+ bazar üzrə keyword + rəqib tədqiqatı (real SERP yoxlamaları ilə).
> **Hədəf:** SEO ilə gündə 1 istifadəçi = ayda ~30 organik klik, davamlı.

---

## 0. TL;DR

1. **Ən vacib fakt: sayt Google-da ümumiyyətlə YOXDUR.** `site:agradex.com` = 0 nəticə. Search Console yoxdur, doğrulama yoxdur, sitemap heç vaxt submit olunmayıb. Yəni bugünə qədər SEO oyununa heç girməmişik — bu həm pis xəbərdir, həm yaxşı: bütün potensial qabaqdadır.
2. **Texniki təməl 80% hazırdır, amma 6 kritik bug var** (canonical/hreflang bug-u 6 route-da, title-lar boş, OG/JSON-LD sıfır, host konsolidasiyası yoxdur, `/demo` crawler üçün boş, sitemap-da 64 URL çatışmır). Hamısı 1 həftəlik işdir.
3. **Bazar seçimi bizə işləyir:** AZ-dilli aqro-SERP demək olar ki boşdur ("NDVI nədir" üçün #2 nəticə Çin saytının maşın tərcüməsidir). "OneSoil alternative" sorğusunu dünyada heç kim tutmayıb — OneSoil məhz indi freemium-a keçib və narazı istifadəçi axını yaranır. `/demo` səhifəmiz "free NDVI map online" nişi üçün hazır aktivdir (o nişdə bu gün mikro-saytlar rank alır).
4. **Yol: S0 texniki (həftə 1) → S1 on-page (həftə 1-2) → S2 kontent (həftə 2-12, ~20 səhifə) → S3 authority (davamlı).** Realist gözlənti: ilk impressionlar indeksasiyadan 2-4 həftə sonra, ilk non-brand kliklər 6-10 həftə sonra, **hədəfə çatma 3-4-cü ay**.
5. **Səndən 6 addım lazımdır** (yalnız sən edə bilərsən): GSC doğrulaması (CF-də DNS TXT), Cloudflare redirect qaydaları, Bing Webmaster, kataloq hesabları (Capterra/G2/PH), kontent müəllifliyi qərarı, ES locale qərarı. Bax §7.

---

## 1. Mövcud vəziyyət — audit nəticələri

### 1.1 Yaxşı olan (qorunmalı) ✅

| Nə | Sübut |
|---|---|
| Landing SSR-də tam render olunur, 8 dildə həqiqi lokallaşmış mətn (~900 söz statik proza) | curl testi: h1/description hər locale-də fərqli; `PublicLanding` SSR branch-ı |
| hreflang 9 tag (8 dil + x-default) **7 route-da düzgün**: `/`, `/pricing`, `/privacy`, `/terms`, `/login`, `/signup` | `app/src/app/layout.tsx:27-54` `alternatesFor()` |
| `sitemap.xml` + `robots.txt` mövcuddur (0efac3b, 2026-07-31) | `app/src/app/sitemap.ts`, `robots.ts`, `src/lib/publicRoutes.ts` |
| Tərcümə tamlığı: 605 `mkt.*` açarı × 8 dil, legal sənədlər 8 dildə tam | key-count pariteti dəqiq yoxlanıb |
| Təmiz URL-lər, `/az` → prefixsiz 307 (hreflang hədəfi sabit), trailing-slash normalizasiyası işləyir | `middleware.ts:34-50`; canlı: `/en/` → 308 → `/en` |
| Silinmiş səhifələr həqiqi HTTP 404 qaytarır (soft-404 yox) | canlı test: `/status`, `/finduq`, `/whats-new` → 404 |
| Kontent aktivi artıq var: `/how-it-works` 1817 söz, `/solutions/*` 6963 söz, `/guide` 7 məqalə 2446 söz, pricing FAQ 15 sual | `content.ts` + i18n sayımları |

### 1.2 KRİTİK problemlər (P0) 🔴

| # | Problem | Sübut / fayl | Təsir |
|---|---|---|---|
| K1 | **İndeksdə yoxuq.** GSC yox, DNS TXT doğrulama yox, sitemap submit olunmayıb. Bing də yox. | `site:agradex.com` = 0; `dig TXT agradex.com` = boş | Google saytın mövcudluğunu bilmir. Hər şey bundan sonra gəlir. |
| K2 | **Canonical/hreflang bug-u 6 route-da:** `/how-it-works`, `/demo`, `/solutions`, `/solutions/[segment]`, `/guide`, `/guide/[slug]` page-level `alternates` verir → valideynin 9 hreflang-ı **tamamilə silinir** + canonical **nisbi** (`href="/how-it-works"`) və `metadataBase` YOXDUR → bütün dillər AZ yoluna canonical verir. `/en/how-it-works` özünü AZ səhifəsinin dublikatı elan edir. | 6 fayl: `how-it-works/page.tsx:9-18`, `demo/page.tsx:9-18`, `solutions/page.tsx:12-19`, `solutions/[segment]/page.tsx:22-41`, `guide/page.tsx:13-20`, `guide/[slug]/page.tsx:31-45`. Canlı təsdiq: relative canonical + 0 hreflang | Google qaydası (2026-07-10 yenilənib): hreflang klasterində canonical **eyni dildə** olmalıdır. Bu bug 6 route × 7 dil = 42 səhifəni indeksdən kənarda saxlayacaq. |
| K3 | **Homepage title = sadəcə "Agradex"** (bütün dillərdə). `title.template` yox. Login/signup/404 da eyni title-ı miras alır. | `layout.tsx:49` hardcoded literal | Ən güclü səhifəmiz heç bir keyword daşımır; SERP-də CTR sıfıra yaxın olar. |
| K4 | **Host konsolidasiyası yoxdur:** `http://agradex.com`, `https://www.agradex.com`, `http://www.agradex.com` — hamısı 301 əvəzinə **200** qaytarır. Hər səhifənin 4 URL variantı yaşayır. | canlı test; repo nginx-də www→apex 301 var (`deploy/nginx-agradex.conf:5-17`) amma canlı davranış fərqlidir (CF "Always Use HTTPS" söndürülüb + köhnə dublikat server bloku) | Siqnal parçalanması + crawl israfı. Yeganə müdafiə canonical tag-dır. |
| K5 | **`/demo` gövdəsi crawler üçün boşdur:** metadata SSR-dədir, amma body = 173 simvol spinner ("Nümunə sahə yüklənir…"), 0 h1, 0 p. | canlı curl; `demo/page.tsx` server wrapper + client `DemoPage` | "Pulsuz NDVI xəritəsi" nişinin açar səhifəsi görünməzdir. |
| K6 | **OG image / twitter card / favicon.ico / apple-touch-icon — heç biri yoxdur.** `app/public/` = 3 fayl (`icon.svg`, `sw.js`, `.gitkeep`). Saytda ümumiyyətlə 0 şəkil var. | kod auditi §7; 3 route-da `openGraph` var amma şəkilsiz | Fermerlər linki WhatsApp/Telegram-da paylaşır — indi link boş kart kimi görünür. Sosial paylaşım = bizim əsas referral kanalımız olacaq. |
| K7 | **JSON-LD sıfır.** Organization / WebSite / BreadcrumbList / Article — heç nə. | grep: 0 nəticə | Brand SERP-i qura bilmirik (ad kolliziyası var — bax P2), Article/Breadcrumb zənginləşdirmələri itir. |
| K8 | **Sitemap boşluqları:** `/solutions/consultant` yoxdur (8 URL), 7 `/guide/[slug]` məqaləsi yoxdur (56 URL); əvəzində `/login`+`/signup` var (16 lazımsız URL). `lastmod` yox, sitemap alternates-də x-default yox. | `publicRoutes.ts` 13 route; guide slug-ları `guide/content.ts:61-340` | Ən dəyərli kontent (guide məqalələri) Google-a təqdim olunmur. |
| K9 | **app.agradex.com noindex deyil:** eyni robots.txt-i (`Allow: /`) servis edir, `X-Robots-Tag` yoxdur; yalnız redirect qoruyur. Üstəlik A record unproxied → origin IP (95.216.208.82) açıqdır. | canlı test §4; grep: repo-da 0 "noindex" | İndeks çirklənməsi riski + təhlükəsizlik (CF-in qoruduğu origin IP app subdomenindən sızır). |

### 1.3 ORTA problemlər (P1) 🟡

| # | Problem | Fayl / sübut |
|---|---|---|
| O1 | `not-found.tsx` yoxdur — 404-lər Next-in standart səhifəsidir (brendsiz, naviqasiyasız) və root metadata-nı miras alır (404 URL üçün özünə-canonical yaranır) | kod auditi §10 |
| O2 | **Accept-Language avtomatik redirect:** prefixsiz + cookie-siz ilk ziyarətdə brauzer dilinə görə 307 → `/{lang}`. Googlebot adətən Accept-Language **göndərmir** (bizə dəymir), amma Google rəsmən auto-redirect-i tövsiyə etmir; digər bot-lar üçün risk. | `middleware.ts:55-59` |
| O3 | Marketing HTML tam keşsizdir: `cf-cache-status: DYNAMIC`, `cache-control: private, no-store` + hər anonim hit-də `set-cookie: bagban_locale` (cookie CF keşini onsuz da pozur) | canlı headers |
| O4 | Təhlükəsizlik başlıqları yoxdur (HSTS, X-Content-Type-Options, Referrer-Policy), `x-powered-by: Next.js` sızır | canlı headers; `next.config.mjs`-də `headers()` yoxdur |
| O5 | `guide/[slug]` title suffix-i bütün 8 dildə hardcoded Azərbaycanca: `"${g.title} — Agradex bələdçisi"` | `guide/[slug]/page.tsx:31-45` |
| O6 | Landing footer `/catalog`-a link verir → app host → login divarı; həm də robots-da Disallow-dur. Footer-də `/privacy`, `/terms`, `/solutions` indeksi linkləri yoxdur. | `LandingFooter.tsx:81`, `57-82` |
| O7 | PSI/Core Web Vitals ölçülməyib (keyless kvota bitdi) — yenidən ölçülməlidir | audit §9 |

### 1.4 KİÇİK (P2) ⚪

- Manifest `theme_color: #059669` vs layout `themeColor: #15803D` ziddiyyəti (`manifest.ts` / `layout.tsx:59`).
- `robots.txt`-də `Host:` direktivi URL formatındadır (standart: çılpaq hostname; yalnız Yandex oxuyur).
- **Brand kolliziyası:** "Agradex" adı ilə Agradex International (Monreal, yem ticarəti), "Agradex Crop Oil" (ABŞ aqrokimya), Agridex.com mövcuddur. İndeksə düşəndən sonra brand SERP-i Organization schema + profillərlə (LinkedIn, Crunchbase, PH) qazanmalıyıq.
- Landing-də 0 `<img>` — hər şey SVG/gradient/canvas. SEO üçün şəkil şərt deyil, amma unikal məhsul screenshot-ları həm E-E-A-T "experience" siqnalı, həm Google Images kanalıdır.

---

## 2. Google 2026 — bizə təsir edən 12 fakt

Hamısı ilkin mənbələrlə yoxlanıb (Search Central docs/blog, Search Status Dashboard; tarixlər göstərilib).

1. **Yeniliklər axını:** 2025-26-da 5 core update (mart/iyun/dekabr 2025, mart/may 2026), 3 spam update (avq 2025, mart+iyun 2026). İyun 2025 core-dan başlayaraq Google **kiçik/müstəqil saytların** bərpasını sənədləşdirilmiş şəkildə göstərdi; may 2026 core rəsmi olaraq "hər tip saytdan qənaətbəxş kontenti göstərmək" məqsədilə çıxdı. Bizə: kiçik sayt olmaq 2026-da 2023-dəkindən az cəzadır.
2. **Fevral 2026 Discover update:** istifadəçinin ölkəsinə görə **yerli-relevant saytları qaldırır**, mövzu-mövzu nümayiş olunan ekspertizanı mükafatlandırır. Bizə: AZ auditoriyaya AZ-dilli aqro-ekspertiza = tam bu profildir.
3. **AI kontent qadağan deyil** — pozuntu yalnız "reytinq manipulyasiyası üçün" istifadədir. **"Scaled content abuse"** = dəyər qatmadan kütləvi səhifə istehsalı (spam policies, yenilənmə 2026-05-15). Bizə: AI-köməkli yazı OK, amma insan baxışı + real məhsul datası şərtdir.
4. **Maşın tərcüməsi siyasəti 2025-də yumşaldı:** faydalı səhifənin real auditoriya üçün MT-si spam sayılmır; MT ilə nazik səhifələri kütləvi çoxaltmaq scaled abuse-dur. Bizə: blog yazılarını az/en/tr/ru-da əl ilə yazıb, qalan 4 dilə yalnız baxışdan keçmiş halda buraxmaq — mövcud i18n fəlsəfəmizlə üst-üstə düşür.
5. **E-E-A-T = "kim / necə / niyə" testi:** görünən müəlliflik, kontentin necə hazırlandığının açıqlanması, insan üçün yazılma. "Experience" (birinci-əl sübut) ən yüksək leverage siqnaldır. Bizə: **öz peyk datamız, öz sahə screenshot-larımız, `scene_attempts` kimi unikal statistika** — rəqiblərin yaza bilmədiyi birinci-əl kontent.
6. **FAQPage rich result TAM ÖLÜB** (may 2026 changelog; sənədlər iyun 2026-da silindi). HowTo da ölüb (2023). Bizə: FAQ-ları schema-sız, səhifədə oxunan mətn kimi saxla (indiki accordion-lar DOM-da mətn saxlayır — uyğundur); FAQPage JSON-LD-yə vaxt xərcləmə.
7. **Yaşayan structured data:** Organization, BreadcrumbList, Article, Product+Review, SoftwareApplication (amma rich result üçün real `aggregateRating` tələb edir — reytinqsiz yalnız baza markup). Bizə: Organization+WebSite sitewide, Article blog-da, SoftwareApplication-ı Capterra/G2 reytinqləri yaranandan sonra.
8. **AI Overviews:** informasiya sorğularında CTR-i kəskin salır (Pew: AI xülasəli SERP-də klik 15%→8%; Ahrefs: #1 mövqe −34.5%), amma **AIO içində sitat olmaq klikləri ~35% artırır**. Xüsusi optimallaşdırma YOXDUR (rəsmi) — cavab-formalı, çıxarıla bilən pasajlar adi SEO-dur. Qeyri-ingilis dillərdə AIO yayılması hələ aşağıdır → AZ/TR/RU kontentimiz az təsirlənir.
9. **llms.txt-i Google iqnor edir** (rəsmi, 2026-06-15 changelog). Vaxt xərcləmə.
10. **hreflang qaydaları:** iki-tərəfli, absolute, self-inclusive; **canonical eyni dildə olmalıdır** (2026-07-10 yenilənməsi — bizim K2 bug-ı məhz bunu pozur); x-default seçici/fallback üçün. IP/Accept-Language ilə auto-redirect etməmək rəsmi tövsiyədir (Googlebot ABŞ-dan, Accept-Language-siz gəzir).
11. **IndexNow-u Google dəstəkləmir**, amma Bing/Yandex dəstəkləyir. Bing indeksi **ChatGPT Search və Copilot cavablarını qidalandırır** — Bing-də olmayan səhifə orada sitat ala bilməz. Yandex ru-auditoriya üçün ayrıca qeydiyyat istəyir (Webmaster + region + davranış siqnalları). Bizə: 30 dəqiqəlik Bing WMT + IndexNow = AI-search kanalına pulsuz bilet.
12. **Yeni domen reallığı:** rəsmi "sandbox" yoxdur, amma konsensus 3-9 ay basdırılmış reytinq dövrüdür; **aşağı-rəqabətli qeyri-ingilis keyword-lər sürətli ucdadır** — indeksasiyadan həftələr sonra impression, 2-4 ayda ilk kliklər. GSC, daxili linklər, bir neçə real referring domain, brand axtarışları prosesi sürətləndirir.

---

## 3. Strategiya — "gündə 1 user" riyaziyyatı

**Hədəf:** ayda ~30 organik klik. Bu, SEO aləmində çox kiçik hədəfdir — strategiya buna uyğun "snayper" olmalıdır, "artilleriya" yox.

**Nə üçün AZ + 2 EN səhifə + TR quyruğu:**

| Mənbə | Mexanizm | Gözlənilən töhfə (ay 3-4) |
|---|---|---|
| AZ kontent klasteri (15-20 səhifə) | SERP faktiki boşdur: "NDVI nədir" #2 = tərcümə-spam; "dəqiq əkinçilik" = PDF skanları + Farmonaut auto-səhifəsi. Keyfiyyətli AZ səhifə 4-8 həftəyə top-3 alır. Fərdi həcmlər kiçikdir (10-100 axtarış/ay) → klaster kompaund edir. | **15-25 klik/ay** |
| EN "pul səhifələri" ×2: *OneSoil alternative* + *Free NDVI map online* | "OneSoil alternative" SERP-ində yalnız kataloqlar var, real rəqib səhifəsi yoxdur; OneSoil iyul 2026-da mobile-ı freemium-a keçirdi (narazılıq dalğası). "Free NDVI" nişində ndvi.us / PixelGust kimi mikro-saytlar rank alır = domain authority tələb olunmur. | **5-15 klik/ay** (ay 4-6-da) |
| TR uzun-quyruq (dəyər-izahı kontenti) | Pul keyword-ləri Doktar/Orak/TARKİP-lə doludur, amma "NDVI değerleri ne anlama gelir" tipli suallar forum səviyyəsindədir. | **0-10 klik/ay** (bonus) |
| Brand axtarışları | Marketinq/söz-ağızdan asılı; Organization schema + profillərlə tuturuq. | **5-10 klik/ay** |

**Cəm (konservativ):** ay 3-4-də 25-45 klik/ay → hədəf yerinə yetir. AZ klasteri tək başına çata bilər; EN səhifələr ehtiyat + böyümə rezervidir.

**Nəzarət qapıları (GSC ilə):**

| Vaxt | Qapı | Keçməzsə |
|---|---|---|
| Həftə 2 | ≥100 URL indeksdə (sitemap submit-dən sonra) | URL Inspection ilə əsas səhifələri əl ilə tələb et; K2/K4 fix-lərinin deploy-unu yoxla |
| Ay 1 sonu | Impressions >200/həftə | Title/description CTR baxışı; daha 5 kontent səhifəsi |
| Ay 2 | İlk non-brand kliklər | Keyword genişlənməsi TR/RU-ya; kontent tezliyini artır |
| Ay 3 | ≥20 klik/ay | EN pul səhifələrinə daxili link gücü; kataloq listinqlərini tamamla |
| Ay 4 | **≥30 klik/ay = HƏDƏF** | Plan reviziyası (bu sənədin §6 qərarlarına qayıt) |

**Risk:** yeni domen lag-ı (3-9 ay konsensus). Mitigasiya: aşağı-rəqabət AZ bazarı sürətli ucdadır; brand + referral (kataloqlar) paralel işləyir; həftəlik GSC ritual erkən korreksiya verir.

---

## 4. İcra planı

### S0 — Texniki təməl (həftə 1; hamısı frontend `app/`, miqrasiya yoxdur, deploy = `update.sh`)

| ID | İş | Fayl(lar) | Effort | DoD |
|---|---|---|---|---|
| SEO-T1 | **GSC + Bing qeydiyyatı** → sitemap submit → 13 əsas URL üçün URL Inspection. Bing-ə GSC-dən import + IndexNow açarı. ⚠️ İstifadəçi addımı (§7) + 30 dəq | — (CF DNS TXT) | S | GSC "Sitemap oxundu, 104+ URL kəşf edildi" |
| SEO-T2 | **Canonical/hreflang fix:** `alternatesFor()` helper-i `src/lib/seo.ts`-ə çıxar (locale-aware canonical + languages + x-default qaytaran `pageAlternates(path, locale)`); 6 route-un `generateMetadata`-sı bunu işlətsin; `metadataBase` əlavə et (`layout.tsx`) | `layout.tsx`, yeni `lib/seo.ts`, `how-it-works/`, `demo/`, `solutions/page`, `solutions/[segment]/`, `guide/page`, `guide/[slug]/` | M | Hər route hər locale-də absolute, öz-dilli canonical + 9 hreflang verir (curl ilə yoxla) |
| SEO-T3 | **Title-lar:** root `generateMetadata` → per-locale keyword-lu default + `title.template: "%s — Agradex"`; login/signup-a öz title; 16 `mkt.meta.*` açarına homepage title dəsti əlavə (aşağıda §4-S1 cədvəli) | `layout.tsx`, `i18n.ts` + 7 lüğət | M | `<title>` heç yerdə çılpaq "Agradex" deyil |
| SEO-T4 | **Sitemap düzəlişi:** `/solutions/consultant` + 7 guide slug əlavə (slug-ları `guide/content.ts`-dən import et — ikinci siyahı yaratma!), `/login`+`/signup` çıxar, alternates-ə x-default | `publicRoutes.ts`, `sitemap.ts` | S | 19 route × 8 = 152 URL; login/signup yoxdur |
| SEO-T5 | **Host konsolidasiyası:** CF-də "Always Use HTTPS" ON + Redirect Rule `www.agradex.com/* → https://agradex.com/$1` (301). Alternativ/paralel: canlı nginx-dəki dublikat server blokunu təmizlə (CLAUDE.md-də "conflicting server_name" qeydi). ⚠️ İstifadəçi addımı (CF panel) | CF dashboard; `deploy/nginx-agradex.conf` canlı sync | S | 4 variantın 3-ü 301 ilə `https://agradex.com`-a gedir |
| SEO-T6 | **App host noindex:** middleware app-host cavablarına `X-Robots-Tag: noindex` header-i əlavə etsin (redirect cavabları daxil); app host-da robots host-aware olsun (`Disallow: /`) | `middleware.ts:110-116` bölgəsi, `robots.ts` | S | `curl -I https://app.agradex.com/login` → X-Robots-Tag: noindex |
| SEO-T7 | **Vizual identiklik:** `app/src/app/opengraph-image.png` (1200×630, brand + "Peyk + AI əkin monitorinqi" mesajı) + `twitter-image` + `icon.png` (32/192/512) + `apple-icon.png`; `openGraph.images`+`twitter.card` metadata-da; manifest theme_color-u `#15803D`-ə bərabərləşdir | `app/src/app/` file conventions, `layout.tsx`, `manifest.ts` | M | Telegram/WhatsApp-da link kartla açılır; favicon görünür |
| SEO-T8 | **JSON-LD:** layout-da Organization + WebSite (server component `<script type="application/ld+json">`); guide məqalələrində Article (+ author, datePublished); guide/solutions-da BreadcrumbList | `layout.tsx`, `guide/[slug]/page.tsx` | S-M | Rich Results Test 3 tipi tanıyır |
| SEO-T9 | **`not-found.tsx`:** brendli, lokallaşmış, naviqasiyalı 404 + `robots: noindex` | yeni `app/src/app/not-found.tsx` | S | 404-lər brendli, noindex |
| SEO-T10 | **`/demo` SSR gövdəsi:** server wrapper-də h1 + 250-400 söz izahat (nə görəcəksən, peyk nə vaxt keçir, qeydiyyatsız) + skrinşot-təsvir + CTA; client xəritə altına yüklənsin | `demo/page.tsx` + `DemoPage` split | M | curl-da `/demo` ≥1 h1 + ≥250 söz |
| SEO-T11 | guide title suffix-ini lokallaşdır (`— Agradex bələdçisi` hardcode-unu `mkt.meta` açarına çevir) | `guide/[slug]/page.tsx:31-45` | S | 8 dildə öz suffix-i |
| SEO-T12 | Footer düzəlişi: `/catalog` linkini çıxar; `/privacy`, `/terms`, `/solutions` linkləri əlavə et | `LandingFooter.tsx` | S | Login divarına aparan marketinq linki yoxdur |
| SEO-T13 | Headers: `next.config.mjs` `headers()` → HSTS (subdomain-siz), X-Content-Type-Options, Referrer-Policy; `poweredByHeader: false` | `next.config.mjs` | S | curl -I təmiz |
| SEO-T14 | Accept-Language redirect-inə bot-istisna (UA `bot\|crawl\|spider` → redirect yox) — §6 Q4 qərarına bağlı | `middleware.ts:55-59` | S | Bot UA ilə `/` → 200 az |
| SEO-T15 | PSI-ni yenidən ölç (kvota açılanda), LCP problemi çıxsa ayrıca task | — | S | CWV baseline sənəddə |

⚠️ Deploy qeydi: bu Mac-da node yoxdur — TS xətaları yalnız serverdə `docker build web`-də çıxır; `update.sh` exit statusunu həmişə oxu (CLAUDE.md qaydası).

### S1 — On-page gücləndirmə (həftə 1-2, S0 ilə paralel)

**Homepage title təklifi (mkt.meta-ya yeni açar dəsti):**

| Locale | Title (≤60 simvol) |
|---|---|
| az | `Agradex — peyk və AI ilə əkin sahələrinin monitorinqi` |
| en | `Agradex — Satellite crop monitoring with an AI agronomist` |
| ru | `Agradex — спутниковый мониторинг полей и AI-агроном` |
| tr | `Agradex — Uydu ile tarla takibi ve yapay zekâ agronom` |
| de | `Agradex — Satelliten-Feldmonitoring mit KI-Agronom` |
| hu | `Agradex — műholdas táblamonitoring AI-agronómussal` |
| it | `Agradex — Monitoraggio satellitare dei campi con AI` |
| pl | `Agradex — satelitarny monitoring pól z agronomem AI` |

**`/demo` yenidən-mövqeləndirmə (K5 fix-i ilə birlikdə):** title AZ `Pulsuz NDVI xəritəsi — sahəni çək, peykdən bax`, EN `Free NDVI map — draw your field, see satellite health`. Bu səhifə "free NDVI map online" nişinin birbaşa cavabıdır.

**Landing mətn tənzimləmələri (kiçik, brend səsini pozmadan):** h2-lərdən birinə "peyklə əkin sahələrinin monitorinqi" ifadəsinin təbii daxil edilməsi; footer-ə 1 cümləlik təsvir (keyword-lu); hero subtitle onsuz da yaxşıdır — toxunma.

**E-E-A-T səthi:** sadə `/about` bölməsi və ya footer-də "Kim qurub" bloku (təsisçi adı + LinkedIn), guide/blog məqalələrinə müəllif imzası + tarix. Google-un "kim/necə/niyə" testinə birbaşa cavab. → §6 Q1 qərarı.

### S2 — Kontent mühərriki (həftə 2-12)

**İnfrastruktur qərarı (→ §6 Q2):** mövcud `/guide` sistemini genişləndir (content.ts + overlay i18n naxışı; Article JSON-LD, müəllif, tarix sahələri əlavə olunur). 20-40 məqalədə TS-fayl yanaşması ağırlaşsa, MDX-ə keçid ayrıca task olar — ilk 20 üçün mövcud naxış kifayətdir və repo konvensiyasına uyğundur.

**Redaksiya təqvimi — Dalğa 1 (həftə 2-6, 10 səhifə):**

| # | Səhifə | Dil | Hədəf keyword | Format |
|---|---|---|---|---|
| 1 | NDVI nədir — tam bələdçi | az | NDVI nədir | İzahat + dəyər şkalası vizualı + öz sahə screenshot-u |
| 2 | NDVI dəyərləri cədvəli: 0.2, 0.3, 0.5 nə deməkdir | az | NDVI dəyərləri | Cədvəl + interpretasiya |
| 3 | Əkin sahələrinin peyklə monitorinqi: necə işləyir | az | peyk monitorinqi | Pillar guide → /demo CTA |
| 4 | Peyk şəkilləri neçə gündə bir yenilənir? | az | Sentinel-2 keçid | **Unikal data:** öz `scene_attempts` statistikamız |
| 5 | Niyə sahəmin təzə peyk şəkli yoxdur? (buludlar) | az | — uzun-quyruq | Dürüst izahat (rəqib yazmır) |
| 6 | Dəqiq əkinçilik nədir — Azərbaycan fermeri üçün | az | dəqiq əkinçilik | Pillar guide |
| 7 | Buğdanı nə vaxt suvarmalı — FAO-56 sadə dildə | az | suvarma norması buğda | Cədvəl + feature tie-in |
| 8 | **Agradex vs OneSoil: 2026-da nə pulsuzdur** | en | OneSoil alternative | Dürüst müqayisə cədvəli |
| 9 | **Free NDVI map online — draw your field, no signup** | en | free NDVI map | `/demo`-ya feature səhifəsi |
| 10 | NDVI values explained (with real field examples) | en | NDVI values meaning | Cədvəl + öz screenshot-lar |

**Dalğa 2 (həftə 6-12, 10 səhifə):** az: aqronom məsləhəti onlayn (AI aqronom fərqi), fermer üçün 5 tətbiq müqayisəsi (dürüst, özümüz daxil), gübrə norması cədvəli, fındıq bağında NDVI, torpaq analizini oxumaq; tr: NDVI değerleri ne anlama gelir, uydu görüntüsü kaç günde bir gelir, dekar/dönüm çevirmə mikro-aləti; ru: что показывает NDVI (таблица), аналог OneSoil бесплатно.

**Format qaydası (hər məqalə):** ilk abzasda qısa qəti cavab → 1 vizual (dəyər şkalası / timeline / real screenshot) → canlı funksiyaya daxili link → müəllif imzası + tarix + "necə hazırlanıb" qeydi. AIO-larda sitat almağın yeganə yolu = çıxarıla bilən, cavab-formalı pasajlar.

**Dil qaydası (scaled-content təhlükəsizliyi):** məqalə az + en (+ tr/ru relevantdırsa) **əl ilə**; qalan dillərə yalnız insan baxışından keçəndə. 8 dilə avtomatik püskürtmə YOX — bu, 2026 "scaled content abuse" tərifinə düşə bilər və Yandex-də tərcümə-qoxulu mətn onsuz da batır.

### S3 — Authority + paylanma (davamlı, ayda ~2 saat)

| Kanal | Konkret hədəf | Dəyər |
|---|---|---|
| SaaS kataloqları | **Capterra, G2, Product Hunt, SourceForge, Crunchbase, F6S, EU-Startups, Toolradar** | Linklər + "X alternative" SERP-lərində görünmə (o sorğuları kataloqlar tutur — orada olmaq özü SEO-dur) + gələcək SoftwareApplication reytinqi |
| AZ dövlət/institusional | **aim.gov.az** (Aqrar İnnovasiya Mərkəzi — "AI in Precision Agriculture" proqramı, 90+ startap), **ADAU** (qonaq mühazirə → .edu.az link), agro.gov.az/DAİM, atm.gov.az | Ən güclü yerli trust siqnalları |
| AZ media/ekosistem | Trend.az, Report.az (aqrar bölmə), Marja; SABAH.fund (aqrotech preseed hədəfidir), AgroX akselerator, SUP.VC; **Caspian Agro** sərgisi (AZERTAC işıqlandırır) | Brand axtarışı + linklər |
| AZ aqro-portallar | gubre.az, aqronom.com, agro-lab.az, dragro.az ekosistemi | Listicle daxil olma |
| Yandex (ru üçün) | Yandex Webmaster + region + sitemap; IndexNow onsuz da Yandex-i əhatə edir | RU-dilli Qafqaz/Mərkəzi Asiya auditoriyası |
| Sosial profillər | LinkedIn şirkət səhifəsi, X/Facebook minimal | Brand SERP-ini kolliziyalardan (Agradex International, Agradex Crop Oil) qorumaq |

### S4 — Ölçmə ritualı

- **Həftəlik (15 dəq):** GSC Performance → yeni sorğular, impression trendi, CTR<1% olan title-lar; Coverage → indeksdən düşənlər. §3 qapılarına bax.
- **Aylıq:** hansı məqalə impression alır → onun klasterini dərinləşdir; almayanı yenilə/birləşdir.
- **Analytics məhdudiyyəti:** privacy policy açıq şəkildə "analitika yoxdur" deyir (privacy.en.ts:295) — GSC saytdankənar olduğu üçün ziddiyyət yaratmır. Əlavə trafik analitikası istəsək → §6 Q5 qərarı (nginx log əsaslı GoAccess ən təmiz yoldur, policy dəyişmir).

---

## 5. Keyword xəritəsi (bazar-bazar)

> Metod qeydi: pullu alət yoxdur; həcm/çətinlik **SERP tərkibindən keyfiyyət qiymətidir** (2026-08-02 real axtarışlarla yoxlanıb, ABŞ indeksi). Doğrulama yolu: Google Keyword Planner (pulsuz) + 6 həftə sonra GSC impressions; ru üçün Yandex Wordstat.

### 5.0 Ən yüksək inamlı 10 mərc (hədəfə ən qısa yol)

| # | Keyword | Dil | Niyə |
|---|---|---|---|
| 1 | NDVI nədir | az | SERP = tərcümə-junk + PDF; təmiz izahat #1 alır |
| 2 | əkin sahələrinin peyk monitorinqi | az | Yalnız Azərkosmos xəbərləri; 0 kommersiya səhifəsi |
| 3 | dəqiq əkinçilik | az | PDF skanları + Farmonaut auto-content — döyülə bilən |
| 4 | suvarma norması (buğda/pambıq) | az | Wikipedia + 2021 PDF-lər; praktik cədvəl qazanır |
| 5 | aqronom məsləhəti onlayn | az | gubre.az telefon xətti; "AI aqronom 7/24" fərqləndirici |
| 6 | fermer üçün tətbiq/proqram | az | Yalnız app-store səhifələri; müqayisə kontenti yoxdur |
| 7 | OneSoil alternative | en | SERP-də yalnız kataloqlar; OneSoil freemium keçidi = artan intent |
| 8 | free NDVI map online / NDVI app free | en | Mikro-saytlar (ndvi.us, PixelGust) rank alır = qapı açıqdır |
| 9 | NDVI nedir / NDVI değerleri | tr | Dron blogları + forum; 1 keyfiyyətli TR guide döyür |
| 10 | NDVI 0.3 nə deməkdir (dəyər klasteri) | az+tr | Heç kim cavab vermir; məhsul istifadəsinə birbaşa bağlı |

### 5.1 Azərbaycan (əsas hədəf — SERP faktiki boş)

| Keyword | Intent | Həcm | Çətinlik (kim rank alır) | Format |
|---|---|---|---|---|
| NDVI nədir | info | aşağı | **çox aşağı** — opticslens (MT-junk), dynamics.az | Blog izahatı + şkala |
| əkin sahələrinin peyk monitorinqi | info/kom | aşağı | aşağı — yalnız xəbərlər | Landing + dəstək postu |
| dəqiq əkinçilik (nədir) | info | aşağı-orta | aşağı — PDF-lər, Farmonaut | Pillar guide |
| suvarma norması buğda/pambıq | info | aşağı | çox aşağı — Wikipedia, ADAU PDF | Cədvəl postu |
| gübrə norması hektara | info | aşağı | çox aşağı | Cədvəl postu (NPK mərhələ üzrə) |
| aqronom məsləhəti onlayn | kom | aşağı | aşağı — gubre.az | Feature landing |
| fermer üçün tətbiq / proqram | kom | aşağı | aşağı — app stores, DrAgro | Dürüst müqayisə listicle |
| buğda becərilməsi texnologiyası | info | orta (ən böyük bitki) | aşağı-orta | Tam bitki bələdçisi (şablon: arpa/pambıq/kartof) |
| fındıq becərilməsi/gübrələnməsi | info | aşağı | çox aşağı | Bitki bələdçisi (irs üstünlüyü, Xudat sahəsi) |
| üzüm xəstəlikləri | info | aşağı-orta | aşağı | Xəstəlik bələdçisi + foto-diaqnoz tie-in |
| bitki xəstəliyini foto ilə müəyyən etmək | info/kom | aşağı | çox aşağı | Feature səhifə |
| torpaq analizi (oxumaq/qiymət) | info/kom | aşağı | aşağı | Post + soil-OCR tie-in |
| kənd təsərrüfatı hava proqnozu | info | aşağı-orta | aşağı | Feature landing (spray window) |
| NDVI xəritəsi pulsuz | trans | çox aşağı | heç kim | `/demo` |
| ⛔ subsidiya / EKTİS | — | yüksək | dövlət tutub | **Qovalama** (məhsuldan çıxıb; ən çoxu 1 info-post) |

Nüans: bir çox AZ fermer rusca axtarır → **ru locale səhifələrimiz Bakı/iri təsərrüfat auditoriyası üçün ikiqat işləyir**.

### 5.2 Türkiyə (pul sorğuları tutulub — uzun-quyruqdan gir)

| Keyword | Intent | Həcm | Çətinlik | Format |
|---|---|---|---|---|
| uydu ile tarla takibi | kom | orta | **orta-yüksək** — Orak hub ×3, Doktar, TARKİP | Uzunmüddətli; əvvəl uzun-quyruq |
| NDVI nedir | info | orta-yüksək | orta — dron blogları, forum | Definitiv guide |
| NDVI değerleri ne anlama gelir | info | aşağı-orta | **aşağı** | Dəyər cədvəli + vizual |
| buğday ne zaman sulanır | info | orta | aşağı-orta | Bitki-vaxt postu (şablon ×10) |
| fındık gübreleme ne zaman | info | orta-yüksək (Qaradəniz) | orta | Fındıq klasteri |
| dekar başına gübre hesaplama | info | orta | aşağı-orta | Hesablayıcı-post (donum dəstəyimiz var!) |
| zirai don uyarı | info | yüksək (mövsümi) | **yüksək — MGM (dövlət)** | Döyüşmə; "don öncesi önlemler" quyruğu |
| tarlamı uydudan nasıl izlerim | info | aşağı | aşağı | How-to → app |
| sentinel-2 çözünürlük / kaç günde | info | aşağı | aşağı | Texniki izahat |
| çiftçi uygulamaları en iyi | kom | orta | orta | Listicle |

### 5.3 Rus (Qafqaz + Mərkəzi Asiya auditoriyası; RU-nun özü konversiya üçün deyil)

| Keyword | Intent | Həcm | Çətinlik | Format |
|---|---|---|---|---|
| спутниковый мониторинг полей | kom | orta-yüksək | **yüksək** — Агросигнал və b. | Baş termini burax; geo-quyruq: "…в Азербайджане/Казахстане" |
| NDVI индекс что показывает | info | orta | orta | Daha yaxşı vizual izahat |
| аналог OneSoil (бесплатный) | kom/trans | aşağı, artan | **aşağı** — həsr olunmuş səhifə yoxdur | Müqayisə səhifəsi |
| мониторинг посевов приложение | kom | orta | orta — listicle-lər | Listicle-lərə düşmə (outreach) |
| вегетационный индекс онлайн бесплатно | trans | aşağı | aşağı | `/demo` |
| норма полива пшеницы/хлопка | info | orta | aşağı-orta | Cədvəl (UZ pambığına da xidmət edir) |
| мониторинг полей Казахстан/Узбекистан | kom | aşağı | **aşağı** | Ölkə landing-ləri |
| Qeyd: Yandex payı RU-da ~50% → Yandex Webmaster (S3); ru mətnlər native keyfiyyətdə olmalı | | | | |

### 5.4 İngilis (Şimali Amerika + qlobal)

| Keyword | Intent | Həcm | Çətinlik | Format |
|---|---|---|---|---|
| satellite crop monitoring | kom | yüksək | **çox yüksək** — EOS, Wikipedia, FAO | ⛔ burax |
| free NDVI map online / NDVI app free | trans | orta | **aşağı-orta** — mikro-saytlar rank alır | `/demo` feature səhifəsi |
| OneSoil alternative / vs | trans | aşağı | **aşağı** — yalnız kataloqlar | Vs-səhifə |
| crop monitoring app free | kom | orta | orta | Müqayisə listicle |
| why is my NDVI low | info | aşağı | aşağı | Q&A post |
| NDVI values meaning table | info | orta | orta | Vizual cədvəl |
| how often do satellites pass over my field | info | aşağı | **aşağı** | **Unikal data:** next-pass/scene_attempts |
| irrigation scheduling FAO-56 app | kom | çox aşağı | aşağı | Feature (istehlakçı-üzlü FAO-56 heç kimdə yoxdur) |
| AI agronomist online | kom | aşağı, artan | aşağı-orta | Feature landing (OneSoil kateqoriyanı təzəcə açdı — dalğasına min) |
| hazelnut orchard monitoring | kom | çox aşağı | **çox aşağı** | Niş bitki səhifəsi (TR/IT/GE/AZ irsi) |

### 5.5 Avropa (mövcud locale-lər)

**DE:** `NDVI Karte kostenlos` (orta çətinlik — TerraZo/KWS pulsuz rəqiblər), `Feldmonitoring App` (**aşağı-orta** — zəif Mapsfy rank alır = qapı açıq), `Satellitenbilder Landwirtschaft`, `NDVI Werte interpretieren` (aşağı). ⛔ `Ackerschlagkartei` kateqoriyasına girmə — compliance məhsuludur, biz deyilik.
**PL:** `co widzi satelita ARiMR / monitoring ekoschematy` (**ən yaxşı PL girişi** — subsidiya-yoxlama narahatlığı, mövsümi trafik maqniti), `NDVI mapa pola za darmo`, `kiedy satelita przelatuje nad polem`. Baş termin SatAgro/OneSoil-pl-lə dolu.
**HU:** **8 locale-dən ən yumşaq EU SERP-i** — `NDVI térkép` (aşağı), `műholdas táblamonitoring` (aşağı — Mapsfy döyülür), `vegetációs index értelmezése`. Az xərclə yaxşı nisbi qazanc.
**IT:** Agricolus (50 ha pulsuz!) + xFarm güclü → yalnız niş: `monitoraggio nocciolo satellite` (**çox aşağı** — Piemont fındığı, irs bucağımız), `quando passa il satellite sul campo`.

### 5.6 Cənubi Amerika + İspaniya (locale YOXDUR — qərar tələb edir, §6 Q3)

- **ES SERP təəccüblü boşdur:** "monitoreo satelital de cultivos gratis" üçün 2019 xəbərləri + Agrio ES + xırda oyunçular; müasir pulsuz alətlə heç kim tutmayıb. Auravant (AR) kontent lideridir amma "gratis" mövqeyi açıqdır.
- **PT-BR çətindir:** Aegro blogu professional səviyyə qoyub; davamlı kontent tələb edər.
- Birgə "NDVI que es/gratis" klasteri = **bu siyahıdakı ən böyük toxunulmamış hovuz** (minlərlə axtarış/ay).
- **Tövsiyə:** hədəf (1 user/gün) üçün LAZIM DEYİL. Növbəti hədəf pilləsində (5-10 user/gün) **es** locale + 5 səhifə (landing, NDVI qué es, valores NDVI, gratis-alət, OneSoil alternativa) — pt-dən əvvəl es.

### 5.7 Asiya (qısa skan)

- **Hindistan (en):** trafik realdır ("Satellite Crop Monitoring India"-da kiçik FarmHawk rank alır), konversiya zəifdir (ödəniş/ARPU). **Passiv götür** — EN Q&A postları onsuz da qlobal rank alacaq; xüsusi investisiya yox.
- **Mərkəzi Asiya (ru):** **ən realist Asiya genişlənməsi** — mövcud ru locale xidmət edir; SERP = akademik məqalələr + texnika dilerləri. 2 ölkə landing-i (KZ taxıl, UZ pambıq+FAO-56) kifayətdir.
- **SEA:** düyü NDVI uzun-quyruğu boşdur amma konversiya şübhəli; palma = enterprise. Passiv.

### 5.8 Rəqib xəritəsi (xülasə)

| Rəqib | 2026 vəziyyəti | Bizə dərs |
|---|---|---|
| **OneSoil** | Sağdır amma yavaşlayıb; mobile **freemium-a keçdi** (iyul 2026), changelog 2024-dən köhnə | "Alternative/бесплатный аналог" pəncərəsi açılıb — dürüst müqayisə səhifəsi |
| **EOSDA** | Güclü; EN blog imperiyası + LandViewer pulsuz aləti | Baş termləri onlara burax; pulsuz-alət səhifəsinin link cəzb etdiyini sübut edir |
| **Farmonaut** | Programmatic/AI kontent hər dildə (AZ daxil!), hətta mədən/donanma sahələrinə yayılıb | AZ/CIS SERP-lərinin həcmlə alına bildiyinin sübutu; amma generic filler — keyfiyyət döyür |
| **xFarm / Agricolus** | İT/EU güclü, xFarm-da pulsuz tier itib; Agricolus 50 ha pulsuz | IT-də yalnız niş; DE/PL-də "pulsuz" mövqeyi hələ boş |
| **Agrio** | 12 dildə yüngül çoxdilli məqalə playbook-u | Bizə ən yaxın analoq — per-dil məqalə modelini kopyala |
| **TR yerlilər (Doktar/Orak/TARKİP)** | Orak dərslik SEO hub-ı qurub (top-7-də 3 nəticə) | TR-də pul termininə girmə; dəyər-izahı quyruğundan gir |

---

## 6. Qərar nöqtələri (müzakirə üçün)

| # | Sual | Variantlar | Tövsiyəm |
|---|---|---|---|
| Q1 | **Kontent müəllifliyi kim olacaq?** E-E-A-T "kim yazıb" istəyir | (a) təsisçi adı + LinkedIn ilə imza; (b) "Agradex komandası"; (c) anonim | **(a)** — kiçik saytda şəxsi imza ən güclü trust siqnalıdır. AI-köməkli yazılırsa "necə hazırlanıb" qeydi əlavə edilir (rəsmi tövsiyə). |
| Q2 | **Blog infrastrukturu** | (a) `/guide` naxışını genişləndir (content.ts); (b) MDX blog; (c) headless CMS | **(a)** ilk 20 məqalə üçün — repo konvensiyası, i18n overlay hazır. 40+-da MDX-ə keçid ayrıca qərar. |
| Q3 | **ES locale əlavə edilsin?** | indi / hədəfdən sonra / heç | **Hədəfdən sonra** (ay 4+): 1 user/gün üçün lazım deyil, 5-10 user/gün pilləsinin ən böyük qapısıdır. |
| Q4 | **Accept-Language auto-redirect** (`middleware.ts:55-59`) | (a) saxla + bot-istisna; (b) tamamilə çıxar + dil təklifi banneri | **(a)** — ucuz, UX qalır, crawler riski sıfırlanır. Google-un gold standard-ı (b)-dir, sonra keçmək olar. |
| Q5 | **Trafik analitikası** (privacy policy "analitika yoxdur" deyir) | (a) yalnız GSC; (b) nginx log əsaslı GoAccess (policy dəyişmir); (c) Plausible + policy yeniləmə | **(b)** — server-side, cookie-siz, policy-yə toxunmur; həftəlik GSC + aylıq GoAccess kifayətdir. |
| Q6 | **Kataloq reytinqləri:** Capterra/G2-də ilk rəyləri kim yazacaq? | real istifadəçilərdən xahiş / gözlə | Real istifadəçilərdən (demo@ yox!) — saxta rəy platforma banı + Google site reputation riskidir. |
| Q7 | **Brand kolliziyası** ("Agradex" ↔ Agradex International/Crop Oil/Agridex) | heç nə / monitor / profillərlə möhkəmlət | Monitor + S3 profilləri kifayətdir; ad dəyişikliyi müzakirə mövzusu deyil. |
| Q8 | **Büdcə** | — | Bu planın pul xərci ≈ 0 (hamısı vaxt). Yeganə opsional xərc: Caspian Agro iştirakı / kiçik PR. |

---

## 7. İstifadəçi addımları (yalnız sən edə bilərsən) ⚠️

1. **Google Search Console:** [search.google.com/search-console](https://search.google.com/search-console) → Domain property `agradex.com` → verilən TXT recordu Cloudflare DNS-ə əlavə et → təsdiqlə. Sonra mənə de — sitemap submit + URL Inspection mən edərəm (və ya addımları verərəm).
2. **Cloudflare (2 dəq):** SSL/TLS → Edge Certificates → **"Always Use HTTPS" ON**; Rules → Redirect Rules → `www.agradex.com/*` → `https://agradex.com/$1` (301).
3. **Bing Webmaster Tools:** [bing.com/webmasters](https://www.bing.com/webmasters) → "Import from GSC" (GSC-dən sonra 5 dəq). ChatGPT Search/Copilot görünürlüğü buradan keçir.
4. **Kataloq hesabları:** Product Hunt, Capterra, G2, Crunchbase, F6S — hesabları sən açmalısan (şirkət təsdiqi). Mətnləri mən hazırlayaram.
5. **Q1 qərarı:** məqalələr sənin adınla imzalansın? (LinkedIn profil linki ilə)
6. **aim.gov.az / AgroX / SABAH.fund:** aqrotech proqramlarına müraciət niyyəti varsa de — müraciət mətnini hazırlayaram (həm funding, həm .gov.az link/mention dəyəri).

---

## 8. ROADMAP-a təklif olunan tasklar (təsdiqdən sonra köçürüləcək)

`SEO-T1..T15` (§4-S0, texniki) → ROADMAP §C-yə "SEO texniki təməl" bloku kimi; `SEO-C1..C20` (kontent təqvimi, §4-S2) → ayrıca "SEO kontent" bloku; S3 kanalları → istifadəçi-bloklu §B-yə (kataloq hesabları, GSC). **Bu sənəd təsdiqlənməmiş ROADMAP-a toxunulmayıb.**

## 9. Əsas mənbələr

- Google Search Status Dashboard (ranking updates tarixi) · Search Central: spam policies (2026-05-15), consolidate-duplicate-urls (2026-07-10), localized-versions (2025-12-22), ai-features (2025-12-10), js-seo-basics (2026-03-04), search-gallery (2026-06-15), llms.txt changelog (2026-06-15)
- Discover core update — Google blog (2026-02); FAQ rich result retirement — changelog (2026-05-08)
- Pew Research AIO-CTR (2025-07-22) · Ahrefs AIO study (2025-04) · Seer Interactive CTR 2026 update
- Glenn Gabe: June 2025 core recoveries; MT policy softening (2025-06/07)
- SERP yoxlamaları: 16 sorğu, 4 dil, 2026-08-02 (bu sənədin §5.4-cədvəlləri onların xülasəsidir)
