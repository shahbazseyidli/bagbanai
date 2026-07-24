# QALAN İŞLƏR — kod-əsaslı audit (2026-07-24)

> 6 paralel yoxlayıcı **176 bənd**i real koda qarşı yoxladı: **35 qurulub**, **139 boşluq**.
> Status yalnız kodla təsdiqlənib — sənəd iddiaları qəbul edilməyib (əvvəl bir dəfə yanlış çıxıb).

## 0. TƏCİLİ — məhsul yerinə yetirmədiyini vəd edir

| Vəd | Reallıq |
|---|---|
| "1 ay pulsuz" (17 yerdə, FAQ-da izahlı) | `orgs.py:24` yeni org-u `free`-ə salır; kodda `trial` yoxdur → **C2** |
| "Kontrast görünüşü" (landing + solutions) | `indices.py:53-60` rescale sabitdir; idarə yoxdur → **A1** |

## 1. Funksional boşluqlar

| # | Status | Effort | Başlıq |
|---|---|---|---|
| A1 | missing | S | Kontrast görünüş (per-scene min/max rescale) |
| A2 | missing | S | Timeline çiplərində dəyər+delta ("12 iyl · 0.71 · −0.04") |
| A4 | missing | S | Yağış nowcast (minutely_15, 1–2 saat) |
| A9 | missing | S | Yığım sırası modulu (koop üçün NDVI-əsaslı "əvvəl bunu yığ") |
| B11 | missing | S | Qlobal Quick Add (kamera FAB → 5-bəndlik menyu: foto/skautinq/tapşırıq/əməliyyat/məhsul) |
| C10 | missing | S | Public changelog (/yenilikler) + status/təhlükəsizlik səhifələri |
| C11 | missing | M | Freemium xəttini time-depth-ə köçür (free = son şəkil+hava+cari məsləhət; pro = tarixçə/benchmar |
| C12 | missing | S | Sərhəd/AI feedback düyməsi ("düz deyil?") |
| C2 | missing | M | 14-günlük Pro trial default (kartsız; bitəndə free-yə enmə; "+N gün uzat") |
| C3 | missing | S | Endirim proqramları (gənc fermer −50%, kooperativ, tələbə-aqronom) pricing kartları kimi |
| C6 | missing | M | Fındıq/bağ segment səhifələri ("rəqiblərin ikisi də nuts-u dəstəkləmir") |
| C7 | missing | M | Demo video(lar) 60-90s AZ səsli + "Demo izlə" ikinci CTA hər yerdə |
| C8 | missing | M | Getting Started bələdçi hub (/more → 5-7 az səhifə) + email onboarding ardıcıllığı |
| E-prose-4 | missing | M | §E prose: provider rolları üçün məhsul təcrübəsi (lab/konsultant/təchizatçı girişdən sonra nə gö |
| MOCK-app-ai-screen | missing | M | Standalone AI Aqronom screen (cross-field attention list + ask box) |
| MOCK-app-contrast-toggle | missing | M | "Kontrast: açıq" raster contrast chip on the map and Sentinel-2 tab |
| MOCK-app-icmal-irrigation | missing | M | İcmal right-hand card: FAO-56 irrigation figure + post-spray harvest countdown |
| MOCK-app-listpanel | missing | L | List panel contents: title+subtitle, search box, field cards with score dot / status pill / reas |
| MOCK-app-today-tasks | missing | M | "Bu günün işləri" checkable task list on the home screen |
| MOCK-app-today-weatherbar | missing | S | "Bu gün" weather bar (temp + condition + spray-window chip) |
| MOCK-register-step3-farmer | missing | M | Registration step 3 for FARMERS (Təsərrüfat adı*, Əsas məhsul, Ölçü sistemi) |
| A10 | partial | S | Share link + WhatsApp "sahə kartı" şəkli |
| A3 | partial | M | Sahə balı 0–100 çipi (kart + xəritə) |
| B1 | partial | S | Sahə-mövsüm P&L-lite (xərc AZN → gəlir AZN → AZN/ha) |
| B10 | partial | M | Təqvim görünüşü + .ics abunə |
| B16 | partial | M | Xəritədə qeyri-sahə yer tipləri (bina, su xətti, anbar, təhlükə — linestring+point) |
| B2 | partial | S | AZ default xərc kateqoriyaları (toxum/gübrə/dərman/yanacaq/su/işçi) |
| B4 | partial | M | Crop-şablon kitabxanası fermerə görünən (GDD, spacing, maturity, harvest window, gözlənilən məhs |
| B5 | partial | M | Avto tapşırıq zənciri (planting → gübrə/dərman/yığım tapşırıqları özü doğulur) |
| B6 | partial | S | PHI/withdrawal countdown (sayğac + bloklama) |
| B9 | partial | M | Hazır hesabatlar kitabxanası (8-12 PDF) |
| C1 | partial | M | 2-addımlı welcome wizard (təsərrüfat adı + əsas məhsul + rayon → dil/vahid/bildiriş) |
| C4 | partial | S | Pricing FAQ (10-15 sual) + "Bütün paketlərə daxildir" bloku + ayrıca müqayisə-matris səhifəsi |
| C5 | partial | S | Landing "modul turu" (hero xəritə + seksiya: screenshot + fel-başlıq + CTA) + canlı sayğac trust |
| C9 | partial | S | Empty-state pass (hər boş siyahıda: niyə vacib + CTA) + "Zəng istəyin" support kartı |
| E12 | partial | M | Home daha canlı/vurucu (onesoil.ai səviyyəli) |
| E13 | partial | M | Detallı account səhifəsi (OneSoil settings-grid) |
| E14 | partial | S | Qlobal qeydiyyat (bütün rollarda ölkə məcburi + region dəqiqləşdirmə) |
| E3 | partial | S | Laboratoriya & konsultant profili (xidmətlər, əhatə, qiymət, kredensiallar, şirkət) |
| E4 | partial | M | Kataloq / directory (axtar, filtrlə ölkə/region/ixtisas, profilə bax) |
| E6 | partial | M | Fermer icması (farmer↔farmer chat) |
| E8 | partial | M | Gübrə modulu (qrafik + AI gübrə təklifi NDVI+torpaq əsasında) |
| MOCK-app-account | partial | M | Parametrlər card grid + section chips + integrations + delete account |
| MOCK-app-apphead | partial | M | Per-screen app header bar (.apphead): title + context chip + global search + avatar |
| MOCK-app-catalog | partial | M | Kataloq directory: search, region/crop filters, provider meta, profile detail view |
| MOCK-app-community | partial | M | İcma & mesajlar: Fermerlər/Provayderlər filter, peer meta, timestamped bubbles |
| MOCK-app-fert | partial | S | Gübrə: AI dose callout + schedule rows + "Kataloqdan gübrə al" cross-sell |
| MOCK-app-field-header | partial | S | Field-detail header: back chip, "ha · crop · location" subtitle, "Sahə balı NN" pill |
| MOCK-app-field-tabs | partial | M | Field-detail tab bar: 8 flat tabs vs shipped 3-group / 17-tab hierarchy |
| MOCK-app-fields-map | partial | M | "Sahələr" as a full-bleed map screen (polygons, labels, legend, layer chip, AI chip) |
| MOCK-app-icmal-peer | partial | S | Peer-consult block embedded inside the "Nə dəyişdi" change card |
| MOCK-app-ledger | partial | S | Dəftər screen: P&L headline cells, per-field table, cost-category breakdown |
| MOCK-app-rail-destinations | partial | L | Rail destination set — Gübrə / Torpaq / İşlər / AI as standalone screens |
| MOCK-app-shell-3col | partial | L | App view three-column shell (78px rail + 336px list panel + stage) |
| MOCK-app-soil | partial | M | Torpaq screen: last-analysis table + AI commentary + "Laboratoriya sifariş et" |
| MOCK-app-tab-ledger | partial | M | Per-field "Dəftər" tab (P&L cells + operations/cost table + add-expense + receipt photo) |
| MOCK-app-tab-water | partial | M | "Su balansı" tab (TAW / RAW / irrigation cells + 7-day spray-window chips) |
| MOCK-app-today-attention | partial | S | "Diqqət lazımdır" hero card with score dot + inline peer suggestion |
| MOCK-app-today-fieldgrid | partial | S | "Sahələrim" 3-up card grid with numeric score pill |
| MOCK-landing-nav | partial | S | Landing top nav links (Məhsul · Həllər · Qiymətlər · Bloq) |
| MOCK-pricing | partial | M | Pricing view: trial badge, Pulsuz/Pro/Biznes cards with annual prices, provider-free block |
| MOCK-register-step2 | partial | S | Registration step 2 = location only (Ölkə*, Region*, Şəhər/kənd, Ünvan) + mint callout |
| MOCK-register-step3-supplier-catalog | partial | M | Supplier registration step 3 inline catalog rows ("Məhsul əlavə et") |
| MOCK-register-stepper | partial | S | Registration 3-step stepper (Rol · Ölkə & ərazi · Profil) |

## 2. i18n / tamamlanmamışlıq borcu — 75 bənd

Yeni səhifələr inline azərbaycancadır; en/tr/de lüğətlərində açarlar çatmır. Tək mexaniki sweep (T18).

<details><summary>Fayl siyahısı</summary>

- `I18N-SUMMARY` — Headline: i18n plumbing is complete, the content is not
- `I18N-DEAD-KEYS` — 39 i18n keys are dead — translated 4x, referenced 0 times
- `I18N-METADATA` — All Next.js page metadata + manifest is az-only for every locale
- `I18N-components/solutions/content.ts` — Solution-page marketing copy — 507 hard-coded AZ strings
- `I18N-lib/metadataOptions.ts` — Crop / soil / planting option labels — 161 hard-coded AZ strings
- `I18N-components/landing/LandingSections.tsx` — Landing role cards / stats / modules / comparison / testimonials — 70 strings
- `I18N-app/sales/page.tsx` — /sales (Satış və alıcılar) — 68 hard-coded AZ strings
- `I18N-app/admin/page.tsx` — /admin — 56 hard-coded AZ strings
- `I18N-lib/regions.ts` — Country + rayon name list — 51 AZ strings
- `I18N-app/signup/page.tsx` — /signup role-selection wizard — 50 hard-coded AZ strings
- `I18N-app/inventory/page.tsx` — /inventory (Anbar) — 46 hard-coded AZ strings
- `I18N-lib/indexStatus.ts` — Satellite index names + status band labels — 45 AZ strings
- `I18N-components/field/FieldOnboarding.tsx` — Field onboarding wizard — 40 AZ strings still inline despite using t()
- `I18N-lib/insights.ts` — AI-free rule-based insight sentences — 39 AZ strings
- `I18N-components/field/DocumentsTab.tsx` — Field document dossier tab — 36 AZ strings
- `I18N-components/field/ZonesTab.tsx` — Productivity zones + VRA tab — 32 AZ strings
- `I18N-components/BulkActions.tsx` — Multi-field bulk action bar — 31 AZ strings
- `I18N-components/field/SeasonTab.tsx` — Season entity tab — 29 AZ strings
- `I18N-app/equipment/page.tsx` — /equipment (Texnika) — 25 AZ strings
- `I18N-app/reports/page.tsx` — /reports (Hesabatlar) — 25 AZ strings
- `I18N-components/field/WeatherHistoryTab.tsx` — Weather history / frost climatology tab — 25 AZ strings
- `I18N-app/places/page.tsx` — /places (Yerlər) — 24 AZ strings
- `I18N-lib/api.ts` — azError() — the app-wide API error dictionary is az-only — 23 strings
- `I18N-app/provider/page.tsx` — /provider profile editor — 18 AZ strings
- `I18N-lib/pricing.ts` — Pricing plan feature matrix — 18 AZ strings
- `I18N-components/field/HarvestTab.tsx` — Harvest batch tab — 17 AZ strings
- `I18N-components/field/SatelliteTab.tsx` — Satellite tab — 17 AZ strings still inline despite using t()
- `I18N-components/solutions/SolutionView.tsx` — Solution page renderer chrome — 14 AZ strings
- `I18N-components/field/ShareButton.tsx` — Public share-link dialog — 14 AZ strings
- `I18N-app/ledger/page.tsx` — /ledger (Təsərrüfat dəftəri) — 12 AZ strings
- `I18N-app/account/page.tsx` — /account (Parametrlər) — 12 AZ strings
- `I18N-components/landing/LandingHeroMap.tsx` — Landing anonymous tap-to-detect map — 12 AZ strings despite using t()
- `I18N-components/field/MetadataTab.tsx` — Field metadata tab — 11 AZ strings despite 43 t() calls
- `I18N-components/field/OperationsTab.tsx` — Operations tab — 11 AZ strings despite 16 t() calls
- `I18N-components/field/SeasonCompareChart.tsx` — Season comparison chart — 11 AZ strings
- `I18N-components/shell/AppRail.tsx` — Desktop left nav rail — 10 AZ labels, and the t() keys for them ALREADY EXIST
- `I18N-components/field/BackfillCard.tsx` — Retrospective backfill card — 10 AZ strings
- `I18N-components/field/PhotosTab.tsx` — Field photos tab — 10 AZ strings
- `I18N-components/landing/LandingFaq.tsx` — Landing FAQ — 9 AZ strings
- `I18N-components/field/SoilLabUpload.tsx` — Soil lab-analysis OCR upload — 9 AZ strings
- `I18N-app/fields/[id]/page.tsx` — Field detail shell — 8 AZ strings despite using t() for tab labels
- `I18N-components/field/FertilizerTab.tsx` — Fertilizer module tab — 8 AZ strings
- `I18N-components/field/OverviewTab.tsx` — Field overview tab — 8 AZ strings
- `I18N-components/field/TasksTab.tsx` — Tasks tab — 8 AZ strings despite 15 t() calls
- `I18N-app/chat/page.tsx` — /chat (İcma & mesajlar) — 7 AZ strings
- `I18N-components/field/AiTab.tsx` — AI advice + chat tab — 7 AZ strings
- `I18N-components/field/PhotoDiagnose.tsx` — Photo disease diagnosis — 7 AZ strings
- `I18N-app/catalog/page.tsx` — /catalog (Kataloq) — 6 AZ strings
- `I18N-app/s/[token]/page.tsx` — Public share page /s/<token> — 6 AZ strings
- `I18N-components/home/TodayHome.tsx` — Today home — 6 AZ weekday names despite 13 t() calls
- `I18N-components/field/info/ClickDate.tsx` — Date picker month names — 6 AZ strings
- `I18N-app/notifications/page.tsx` — /notifications — 5 AZ strings
- `I18N-components/NotificationBell.tsx` — Notification bell dropdown — 5 AZ strings
- `I18N-components/landing/LandingFooter.tsx` — Landing footer — 5 AZ strings
- `I18N-components/field/FertilizerCard.tsx` — T13 fertilizer calculator card — 5 AZ strings
- `I18N-components/FieldCreator.tsx` — Legacy field creator — 4 AZ strings despite 14 t() calls
- `I18N-components/FieldMap.tsx` — Map control labels — 4 AZ strings
- `I18N-app/fields/page.tsx` — /fields list — 3 AZ strings
- `I18N-app/onboarding/page.tsx` — /onboarding — 3 AZ strings despite importing i18n
- `I18N-components/SpeakButton.tsx` — TTS read-aloud button — 3 AZ strings
- `I18N-components/TelegramConnect.tsx` — Telegram connect card — 3 AZ strings
- `I18N-components/landing/PublicLanding.tsx` — Landing shell — 3 AZ strings
- `I18N-components/field/WellnessCard.tsx` — Wellness score card — 3 AZ strings
- `I18N-components/field/YieldsTab.tsx` — Yields tab — 3 AZ strings despite 14 t() calls
- `I18N-components/field/info/CropGrid.tsx` — Crop picker grid — 3 AZ strings
- `I18N-components/field/info/CycleCards.tsx` — Planting-cycle chooser — 3 AZ strings
- `I18N-app/layout.tsx` — Root layout — 3 AZ strings (metadata)
- `I18N-app/manifest.ts` — PWA manifest — 3 AZ strings
- `I18N-app/solutions/page.tsx` — /solutions index — 3 AZ strings
- `I18N-tail-2strings` — Tail: 5 files with 2 hard-coded AZ strings each
- `I18N-tail-1string` — Tail: 9 files with 1 hard-coded AZ string each
- `POLISH-account-dead-controls` — /account ships three controls that do nothing
- `POLISH-account-no-loading-state` — /account renders blank cards during auth load
- `POLISH-FertilizerCard-silent-null` — Fertilizer calculator renders nothing on an unhandled reason
- `POLISH-FertilizerTab-no-loading` — Fertilizer tab shows an empty schedule before data arrives

</details>

## 3. İcra sırası

1. **Doğruluq** — C2 trial + A1 kontrast (vədləri real et) 🔨
2. **W3 qalığı** — A2 timeline delta · A3 sahə balı çipi · A4 yağış nowcast · A9 yığım sırası 🔨
3. **Maket paritetı** — 3-sütun shell + siyahı paneli · Bu gün ekranı · sahə başlığı bal pill-i
4. **Marketinq/onboarding** — C seriyası (endirim, pricing FAQ, fındıq segment, bələdçi hub, changelog, empty-state)
5. **i18n sweep** — inline AZ → 4 dil

Hər dalğa: əsl `tsc` + `next build` → deploy → canlı yoxlama.
