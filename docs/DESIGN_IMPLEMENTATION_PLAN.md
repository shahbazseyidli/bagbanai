# Bağban AI — Redizayn İcra Planı (D0–D5)

> Mənbə: dizayn araşdırması `wf_68ea40bc` (OneSoil/Plantix/FarmerApp/GSMA + canlı kod auditi) →
> `docs/` dizayn istiqaməti. Bu sənəd o istiqaməti **addım-addım icraya** çevirir və **mövcud +
> gələcək bütün funksionallığın** yeni dizayna necə köçdüyünü zəmanət altına alır (§A matris).
>
> **İş qaydası (MÜTLƏQ):**
> - **Feature-parity:** heç bir mövcud funksiya itmir — hər biri §A matrisdə yeni yerə map olunub.
> - **Additive + phase-gated:** hər faza öz-özlüyündə deploy oluna bilər; sonrakı faza əvvəlkini pozmur.
> - Hər addım: **Fayllar · Nə · DoD (qəbul meyarı).** Hər faza sonunda `next build` gate + canlı test + ROADMAP status.
> - Status kodu (ROADMAP kimi): ⬜ plan · 🔨 develop · 🚀 prod · ✅ prod+test.
> - **Naviqasiya D2-dən sonra donur** (yalnız əlavə). Dağıdıcı hərəkət = 2 addım + undo + soft-delete.

---

## §A. Feature-parity matrisi — heç nə itmir

Cari hər ekran/funksiya → yeni yer → hansı fazada köçür.

| Mövcud (indi) | Fayl | Yeni yer (redizayn) | Faza |
|---|---|---|---|
| Landing (gradient hero) | `app/page.tsx` Landing | **Public xəritə** + toxun-tap draft | D3 |
| Login / Signup / OTP | `login`, `signup`, `OtpVerify` | **Telefon-first OTP** (Telegram+SMS), email fallback | D3 |
| Onboarding (org→farm→field) | `onboarding/page.tsx` | Səssiz tenancy + FieldOnboarding sehrbaz | D0+D3 |
| Dashboard (org selector, ferma/sahə) | `app/page.tsx` Dashboard | **"Bu gün"** kart ana ekranı | D2 |
| Nav (üst + hamburger) | `Nav.tsx` | **Bottom nav (5+FAB)** / desktop sidebar | D2 (bell D0) |
| NotificationBell (desktop-only) | `NotificationBell.tsx` | **Bildiriş mərkəzi**, mobil header | D0+D2 |
| Sahə səhifəsi (9 tab) | `fields/[id]/page.tsx` | Xəritə + **3-snap sheet** (VƏZİYYƏT/İŞLƏR/MƏLUMAT) | D2 |
| İcmal insight | `OverviewTab.tsx` | **VƏZİYYƏT** qrupu + ana-ekran kartları (qrammatika saxlanır) | D2 |
| Sentinel-2 / NASA tab | `SatelliteTab.tsx` | **"Ətraflı analiz"** ekspert qatı (sensor=filtr) | D2/D4 |
| AI Məsləhət + chat | `AiTab.tsx` | **AI** bottom-nav səthi | D2 |
| KnowledgePassport | `KnowledgePassport.tsx` | MƏLUMAT qrupu + AI səthi | D2 |
| ClarificationBlock | `ClarificationBlock.tsx` | AI səthi | D2 |
| Foto diaqnoz | `PhotoDiagnose.tsx` | **AI səthi + kamera FAB** (guided capture) | D0+D2 |
| Gübrə planı | `FertilizerCard.tsx` | AI səthi (Business dəyəri) | D0 |
| Metadata (sahə pasportu) | `MetadataTab.tsx` | **MƏLUMAT** qrupu | D2 |
| Skautinq | `ScoutingTab.tsx` | **"Müşahidələr"** (İŞLƏR) + kamera FAB | D2/D5 |
| Tapşırıqlar / Əməliyyatlar / Məhsul | `TasksTab/OperationsTab/YieldsTab` | İŞLƏR qrupu, **click-first kit-ə** yenidən | D5 |
| Subsidiya kalkulyatoru | `subsidy` + wizard | Saxlanır + onboarding step 4 + shareable kart | D3/D4 |
| Qiymətlər / paywall | `pricing`, `PricingTable`, `UpgradeCta` | Stacked kartlar + pulsuz-nüvə xətti | D4 |
| Komanda / org / rol | `mgmt`, orgs | **"Daha çox" → Parametrlər/Komanda** (telefon dəvət) | D4 |
| Admin (Abunələr) | `admin` | "Daha çox" → Admin (dəyişmir) | D4 |
| Xəritə alətləri (basemap/ölç/compare/fırça/detect) | `FieldMap.tsx` | Explorer + sheet-də, çip toolbar | D2/D4 |
| PWA / offline outbox | `manifest/sw/offlineQueue` | Offline UX qatı + install kartı dəyər anında | D3/D5 |
| Telegram bağlantı | `TelegramConnect.tsx` | Onboarding OTP + "Daha çox" + iki-tərəf | D3/D5 |
| Bildiriş dispatcher (T1) | `rules/engine.py` | Dəyişmir (backend) — UI-ə deep-link əlavə | D2 |

**Gələcək (ROADMAP §C — T7…T26 + follow-up):** §H bölməsində hər biri fazaya bağlanıb.

---

## §B. D0 — Cərrahi quick-win  ·  ≈1 həftə  ·  redizayn riski YOX

Mövcud strukturu saxlayır; kritik buqları bağlayır, huninin ən zəif nöqtəsini düzəldir.

- **D0.1 · İlk-sahə yolu düzəlişi** — Fayl: `app/src/app/onboarding/page.tsx`. Nə: `FieldCreator` → `FieldOnboarding` svopu (məhsul sualı + toxun-tap + fırça). DoD: yeni user ilk sahəni kalibrli yaradır (crop_thresholds tətbiq olunur, İcmal düzgün). *[KRİTİK bug]*
- **D0.2 · Mobil bildiriş zəngi** — Fayl: `Nav.tsx`. Nə: `NotificationBell`-i `hidden md:flex`-dən çıxarıb mobil header-ə; hamburger 48px. DoD: telefonda zəng + unread badge görünür.
- **D0.3 · Tab URL state + skroller** — Fayl: `fields/[id]/page.tsx`. Nə: tab `useState` → `useSearchParams` (`?tab=`); tab sırası tək-sıra `overflow-x-auto snap-x`. DoD: bildirişdən deep-link, "geri" tətbiqdən çıxmır.
- **D0.4 · Səssiz tenancy (ilkin)** — Fayllar: `routers/auth.py` (signup), `app/page.tsx` Dashboard. Nə: signup-da org "Mənim təsərrüfatım" + farm avto-yaranır; tək-org üçün org selector + "Rol: owner" gizlə. DoD: yeni user forma/jarqon görmür.
- **D0.5 · Xəta lüğəti** — Fayllar: `lib/api.ts` `handle()`, komponent catch-lər. Nə: backend kodu/HTTP → sadə AZ cümlə + retry; field-page xətaları inline (səhifə şeli qalır). DoD: "HTTP 500"/snake_case istifadəçiyə çatmır.
- **D0.6 · Toxunma hədəfləri** — Fayllar: `globals.css` (`.btn`, `.input`), `info/chip.tsx`. Nə: `min-h-12` (48px), CTA `h-14`. DoD: hər interaktiv element ≥48px.
- **D0.7 · Boş/hero halları** — Fayllar: `ui.tsx` Placeholder istifadəçiləri, `OverviewTab.tsx`. Nə: boş hallara **içəri əsas düymə**; İcmal hero-da raster yoxdursa static `DisplayMap`. DoD: heç bir ölü boş ekran.
- **D0.8 · Yerdəyişmələr** — Fayllar: `AiTab.tsx`, `ScoutingTab.tsx`, `page.tsx` (fields), `fields/[id]/page.tsx`. Nə: `PhotoDiagnose` → AI tab; `FertilizerCard` metadata-dan AI-a; MGRS header-dən texniki sətrə; `⚙️ Redaktə` emoji → lucide `Settings`. DoD: foto/gübrə gözlənilən yerdə.
- **D0.9 · `useFieldDataStatus` hook** — Fayl: yeni `lib/useFieldDataStatus.ts`. Nə: OverviewTab/SatelliteTab dublikat 6s pollerlərini bir hook-a. DoD: bir poller, ETA copy PreparingBanner ilə uyğun.

---

## §C. D1 — Dizayn tokenləri + komponent kit  ·  ≈1-2 həftə

Görünüşü dəyişir, İA yox — hər ekran avtomatik günəş-uyğun olur.

- **D1.1 · Token qatı** — Fayllar: `tailwind.config.ts`, `globals.css`. Nə: palitra (ink `#0F172A`, brand `#15803D`, severity 700-çəki, border `slate-300`, tint fonlar); fermer gövdə `text-lg`(18px); **ban:** `font-light`, `<12px`, `slate-400` məzmun mətni. DoD: tokenlər CSS var kimi; köhnə emerald-600 mətn qadağan.
- **D1.2 · Şrift** — Fayl: `layout.tsx` (`next/font`). Nə: **Inter Variable** self-host, latin-ext subset (ə/ğ/ı/İ/ş/ç/ö/ü), sistem fallback. DoD: schwa düzgün, FOUT yoxdur.
- **D1.3 · StatusChip** — Fayllar: yeni `components/StatusChip.tsx`; istifadəçilər: `indexStatus.ts` TONE, İcmal, SatelliteTab, KnowledgePassport. Nə: rəng-only dot → **ikon + AZ söz + rəng + aria-label** çip (Sağlam/Diqqət/Təcili). DoD: heç bir rəng-only status.
- **D1.4 · Skeletonlar** — Fayl: yeni `components/Skeleton.tsx`. Nə: kart-geometriyalı `animate-pulse`; bütün list fetch-lərdə çılpaq spinner əvəzinə. DoD: <2s fetch-lər skeleton.
- **D1.5 · Ölçü + a11y sweep** — Fayllar: `globals.css`, komponentlər. Nə: button/list-row/chip 48/56px; `focus-visible` ring qlobal; `aria-label` hər ikon-düymədə, `aria-current` nav-da. DoD: klaviatura fokusu görünür, ikon-düymələr adlanır.
- **D1.6 · i18n sweep** — Fayl: `lib/i18n.ts` + komponentlər. Nə: hardcoded inline AZ stringləri i18n-ə hoist. DoD: ru/tr yolu açıq, copy ≤12-söz qaydasına yoxlanıla bilər.

---

## §D. D2 — İnformasiya arxitekturası  ·  ≈2-3 həftə

Ən böyük struktur dəyişikliyi. Sonunda naviqasiya donur.

- **D2.1 · Bottom nav + desktop sidebar** — Fayllar: yeni `components/BottomNav.tsx`, `Nav.tsx` refaktor, `layout.tsx`. Nə: mobil 5-maddə (Bu gün · Sahələr · [kamera FAB] · AI · Daha çox), etiketlər həmişə görünür, aktiv pill; desktop sol sidebar. DoD: hamburger yoxdur; hər maddə deep-link olunur.
- **D2.2 · "Bu gün" ana ekranı** — Fayl: `app/page.tsx` Dashboard yenidən. Nə: (1) hava+çiləmə kartı üstdə, (2) alert kartları (1 hərəkət), (3) sahə hökm-kartları (StatusChip + İcmal cümləsi + raster thumbnail + "son yenilənmə"), (4) Başlanğıc checklist. DoD: kart-first; org chrome tək-org-da yoxdur; skeleton.
- **D2.3 · Sahə səhifəsi → xəritə + 3-snap sheet** — Fayllar: `fields/[id]/page.tsx` yenidən, yeni `components/field/FieldSheet.tsx`. Nə: tam-ekran xəritə + non-modal bottom sheet (peek: hökm çipi; half: "Nə dəyişdi?" + sparkline; full: **VƏZİYYƏT / İŞLƏR / MƏLUMAT** segmentləri); sheet state `?panel=`; Android geri-jesti sheet-i endirir. DoD: 9 tab → 3 qrup; raster həmişə görünür; back sanity.
- **D2.4 · "Ətraflı analiz" birləşməsi** — Fayllar: `SatelliteTab.tsx` → `ExpertExplorer.tsx`. Nə: Sentinel-2/NASA tabları birləşir; **kontrastlı sağlamlıq layı default** (per-field stretch, 3-zolaqlı etiketli legend); sensor = filtr çipi; indeks seçici AZ adlarla; scene timeline h-11 çip; cloud filtr; two-date compare. DoD: sensor jarqonu naviqasiyadan çıxır; bir poller.
- **D2.5 · Bildiriş mərkəzi** — Fayllar: `NotificationBell.tsx` genişlənmə, yeni `notifications` view. Nə: hər bildiriş = event + severity çip + tək "nə etməli" düyməsi → `field?panel=` deep-link. DoD: mərkəz + deep-link işləyir.
- **D2.6 · Kamera FAB axını** — Fayllar: `BottomNav.tsx`, kontekst sheet. Nə: FAB → sheet (foto diaqnoz / sahə əlavə / müşahidə əlavə). DoD: istənilən ekrandan kamera.
- **D2.7 · Soft-delete + undo** — Fayllar: `routers/fields.py` (DELETE → soft), `fields/[id]/page.tsx`. Nə: 2 addım + 10s undo toast + `deleted_at` (migration). DoD: təsadüfi silmə geri qaytarıla bilir.

---

## §E. D3 — Onboarding hunisi  ·  ≈2-3 həftə

"Əvvəl dəyər, sonra hesab." Hədəf: 0→AHA ~5 dəq.

- **D3.1 · Public landing xəritəsi** — Fayl: `app/page.tsx` Landing yenidən. Nə: tam-ekran hibrid basemap, axtarış pill (Nominatim) + "Mənim yerim" (icazə yalnız toxunuşda + fayda cümləsi); anonim toxun-tap → sərhəd + sahə çipi; draft `localStorage`. DoD: hesabsız sahə görünür.
- **D3.2 · Məhsul plitə + ani-dəyər** — Fayllar: onboarding komponentləri. Nə: TƏK sual — məhsul foto-plitələri; sonra 3 kart (<1s): sahə + §30 subsidiya AZN + hava. DoD: sessiya dəyərlə bitir (getsə belə).
- **D3.3 · Telefon-first OTP** — Fayllar: `routers/auth.py` (+phone), `messaging/telegram.py` (OTP göndər), `messaging/sms.py` (yeni, fallback provider), `signup`/`login`, `OtpVerify`. Nə: nömrə → 6 rəqəm Telegram deep-link ilə (SMS fallback); email OTP pro fallback kimi qalır. DoD: nömrə ilə giriş; parol yoxdur.
- **D3.4 · Səssiz tenancy (tam)** — Fayllar: `routers/auth.py`, geo `_region()`. Nə: OTP-də poliqonun rayonundan org/farm avto-yaranır. DoD: forma yoxdur; sonra Parametrlərdə adlandırıla bilir.
- **D3.5 · Hazırlanır ekranı + PWA install** — Fayllar: onboarding, `PwaRegister`/install kartı. Nə: PreparingBanner + dəyər kartları üst-üstə (T0 partial reveal ilə); "Hazır olanda Telegram-dan xəbər"; PWA install kartı **data-hazır anında** (soyuq banner yox). DoD: gözləmə dəyərlə dolur; install konvertləri artır.
- **D3.6 · Başlanğıc checklist + huni analitikası** — Fayllar: yeni `components/Onboarding checklist`, `routers/` event log (opt). Nə: checklist 2/6-dan (endowed); named funnel events (landing→tap→crop→OTP→map-seen). DoD: aktivasiya metrikası izlənir.

---

## §F. D4 — Ekspert qatı + desktop + qiymət  ·  ≈2 həftə

- **D4.1 · Rayon-ortası benchmark + band UI** — Fayllar: `ExpertExplorer.tsx`, İcmal chart, `indices.py` benchmark (T10 hazır). Nə: "sizin sahə vs rayon ortası" kəsik xətti + p10–p90 zolaq (follow-up UI). DoD: benchmark n≥5-də görünür.
- **D4.2 · Compare/cloud/chart cilası** — Fayl: `ExpertExplorer.tsx`. Nə: two-date swipe cilası, cloud filtr çipləri, chart 2-3 seriya + birbaşa son-etiket. DoD: kiçik ekranda oxunaqlı.
- **D4.3 · Desktop aqronom iş sahəsi** — Fayllar: responsive `page.tsx`, sahə səhifəsi. Nə: xəritə-first layout, multi-field org görünüşü, org switcher (>1 org-da), hesabat giriş nöqtələri. DoD: aqronom personası desktopda.
- **D4.4 · Qiymət səhifəsi yenidən** — Fayllar: `pricing`, `PricingTable.tsx`. Nə: 3 stacked kart (ikon+söz, table/emoji yox); **pulsuz-nüvə xətti** (son buludsuz sağlamlıq xəritəsi + hava həmişə pulsuz); UpgradeCta hər 402-də. DoD: horizontal scroll yoxdur; free tier dəyər göstərir.
- **D4.5 · Performans büdcəsi** — Fayllar: dynamic import MapLibre, `sw.js`, data-saver toggle. Nə: ilkin marşrut <200KB, lazy xəritə, mobil datada raster auto-yükləmə təxirə, tile keş. DoD: LCP <2.5s (3G).

---

## §G. D5 — Səs + kanal + offline + çöl testi  ·  ≈2-3 həftə + test

- **D5.1 · Telegram iki-tərəfli (T23)** — Fayllar: `messaging/telegram.py`, `routers/messaging.py` webhook genişlənmə. Nə: foto-göndər→diaqnoz-al; həftəlik bazar-ertəsi xülasə (cron); hər alert bir deep-link ilə. DoD: botda foto→diaqnoz cavabı.
- **D5.2 · Səs (T15)** — Fayllar: `AiTab`/chat, `ScoutingTab`, advice kartı. Nə: mikrofon input (STT və ya audio-note), "Səsləndir" TTS advice-də, per-ekran audio Kömək. DoD: səslə sual + oxuma.
- **D5.3 · Offline UX qatı** — Fayllar: `offlineQueue.ts`, qlobal offline chip. Nə: persistent "Oflayn" çip, hər növbədə "göndərilməyib" saat nişanı + sync toast; keşlənmiş son hökm/hava "son yenilənmə" ilə. DoD: oflayn dəyər + görünən sync.
- **D5.4 · İŞLƏR click-first rebuild** — Fayllar: `TasksTab/OperationsTab/YieldsTab`. Nə: yazılı formalar → ChoiceChips/CropGrid/ClickDate/NumberSlider kit. DoD: yazılı-forma split-brain ölür.
- **D5.5 · Çöl testi + IA freeze** — Nə: 2 raund real fındıq/buğda fermeri (55+, qadın daxil), açıq havada, aşağı-büdcəli Android; tapılan problemlər düzəlir. DoD: **redizayn "bitdi" şərti**; sonra IA dondurulur (yalnız əlavə).

---

## §H. Gələcək funksiyalar (ROADMAP §C T7…T26 + follow-up) yeni dizaynda

Hər gələcək task artıq yeni İA-da yeri müəyyən — ayrıca redizayn tələb etmir.

| Task | Yeni dizaynda yer | Faza |
|---|---|---|
| **T7** PDF/Excel hesabatlar | MƏLUMAT qrupu "Hesabat" + desktop iş sahəsi | D4 |
| **T14** Subsidiya tarixçə + prefill | Subsidiya ekranı (D3 onboarding step 4 + shareable kart) | D3/D4 |
| **T16** NDVI↔məhsuldarlıq | İŞLƏR → Məhsul kartında trend | D4/D5 |
| **T17** norms write-back | Backend (UI dəyişmir) | istənilən |
| **T18** RU/TR | D1 i18n sweep-dən sonra tərcümə | D1 sonrası |
| **T19** Shapefile + annotasiya + ScaleControl | Ətraflı analiz toolbar + MƏLUMAT idxal/ixrac | D4 |
| **T20** VRA/zonalar | Ətraflı analiz (desktop ekspert) | D4/sonra |
| **T22** Telegram bot | ✅ hazır — D3 OTP + D5 iki-tərəf | D3/D5 |
| **T23** İki-tərəfli bot | D5.1 | D5 |
| **T24** Lab-analiz OCR | AI foto axını (guided capture) + MƏLUMAT torpaq | D5 |
| **T25** D3 data qatı | Backend + "Daha çox → Parametrlər" consent | sonra |
| **T26** İcma forumu | "Daha çox → İcma" (Telegram-qrup MVP) | D5/sonra |
| follow-up **web-push** | D3 PWA install + bildiriş mərkəzi | D3 |
| follow-up **fenologiya-avto** | Backend; VƏZİYYƏT-də growth_stage çipi | D2/backend |
| follow-up **mərhələ-Kc** | Backend (FAO-56 dəqiqləşmə) | backend |
| follow-up **benchmark band UI** | D4.1 | D4 |

---

## §I. Yeni backend işi (dizayn tələbləri)

- **Auth:** `POST /auth/phone-otp` (nömrə → Telegram/SMS OTP), `POST /auth/phone-verify`; `messaging/sms.py` fallback provider (env-gated, dormant).
- **Fields:** soft-delete (`fields.deleted_at` migration + DELETE dəyişməsi + list filtri).
- **Onboarding:** anonim draft claim (localStorage → ilk save); region→org/farm avto (mövcud `geo._region`).
- **Reports (T7):** `GET /fields/{id}/report` (PDF, WeasyPrint) — D4.
- **Funnel events (opt):** `POST /events` (landing/tap/crop/otp/map-seen) analitika üçün.
- **Telegram (D5):** həftəlik digest cron; webhook foto→diaqnoz axını.
- Mövcud engine/endpointlər (rules, indices, advice, irrigation, pest, fertilizer, benchmark) **dəyişmir** — yalnız UI onlara yeni şəkildə çıxır + deep-link `?panel=`.

---

## §J. Test, risk, rollback

- **Hər faza:** `next build` tip-gate (server node) + import-gate (api) + demo sahədə canlı test + ROADMAP §C/§K status.
- **D0 riski ≈0** (mövcud struktur). **D2 ən riskli** (İA) — feature flag `?ui=v2` altında paralel marşrutla test, sonra kəs.
- **Rollback:** hər faza öz commit dəsti; geri qaytarma bir `git revert` diapazonu. Token qatı (D1) geriyə-uyğun (köhnə class-lar işləyir).
- **Feature-parity yoxlaması:** §A matrisin hər sətri D5 sonunda ✅ olmalıdır — heç bir funksiya "yoxa çıxmır".
- **Bitmə şərti:** D5.5 çöl testi 2 raund + §A matris tam ✅.

---

## §K. Status izləyici (hər addım bitəndə yenilə)

**D0 ✅ (98e43cb)** · **D1 ✅ (0f57db2)** · **D2 ✅ (0e801a4 — 3 dilim canlı, `?ui=v2` altında)** · **D3 🚀 (əsas hissə canlı)** · **D4 🚀 (əsas hissə canlı)** · **D5 🚀 (səs+offline+chips canlı; kanal dormant)** — hər addım (D0.1…D5.5) bitəndə commit hash + ✅ ilə işarələ. Bu sənəd `ROADMAP.md` §C ilə paralel işləyir (T-backlog funksional, bu — dizayn/İA).

**D3–D5 detal (2026-07-23, autonomous run — hər biri build-gate + deploy + canlı test):**
- **D3.1 ✅ (1852227):** public landing xəritəsi — anonim toxun-tap (`/api/geo/segment-public`, auth-suz/yazımsız) → sərhəd + sahə + CTA; çəkilən tarla localStorage draft → onboarding prefill. MapLibre lazy (next/dynamic). Canlı: segment-public `{ok:true,polygon}`, draft prefill 13.869 ha. **D3.4 (səssiz tenancy) D0-da bitib.** Landing vizualı signed-out — istifadəçi yoxlamalı.
- **D3.2 ✅ (925d7fe):** landing detected-kartında canlı hava (keyless Open-Meteo, sahə mərkəzi) + subsidiya CTA. Crop seçimi onboarding-də; dəqiq subsidiya kalkulyatorda (yanlış rəqəm riski yox).
- **D4.4 ✅ (525f5cd):** qiymət 3 yığılmış kart (lucide ikon, emoji/cədvəl yox), per-tier check bulletlər, free-core xətti. Canlı doğrulandı.
- **D4.1/D4.2 ✅ (30d07e2):** SatelliteTab-da bölgə **p10–p90 kölgəli zolağı** (ComposedChart range Area; backend T10 hazır idi) + benchmark xətti/cloud filtr/multi-seriya onsuz var idi. Canlı: chart xətasız (zolaq business-gated).
- **D5.2 ✅ (525f5cd):** `SpeakButton` (brauzer Web Speech API, asılılıqsız/offline) — İcmal verdict + AI məsləhət səsləndirilir (az→tr→ru səs). Canlı: klik `speaking=true`, 199 səs.
- **D5.3 ✅ (925d7fe):** qlobal `OfflineIndicator` (Oflayn/göndərilməyib/sinxronlaşdı çip; offlineQueue T12 üzərində). Canlı: offline hadisəsi çipi göstərir.
- **D5.4 ✅ (30d07e2):** `ChoiceChips` click-first — Operations (növ+valyuta), Yields (vahid), Tasks (növ). Canlı: chip-lər render (Suvarma/Gübrələmə/… + AZN/USD/EUR).
- **D4.3 (desktop iş sahəsi):** field görünüşü desktop sidebar D2-də bitib; dashboard-workspace refinement qismən.
- **D4.5 (perf):** landing MapLibre lazy-load edildi (əsas qazanc). Data-saver toggle təxirə.
- **SKIP (asılılıq — istifadəçi göstərişi ilə):** **D5.1 Telegram iki-tərəf** (T23 — Telegram token) · **D5.2 STT** (mikrofon-transkripsiya — STT provayder; TTS oxuma hissəsi bitib) · **D3.3 telefon-OTP** (SMS/Telegram delivery; email-OTP U3 onsuz var) · **D5.5 çöl testi** (real fermer — insan addımı). D3.5/D3.6 (hazırlanır ekranı PreparingBanner onsuz var + checklist) minor, təxirə.

**D2 detal (2026-07-22):**
- **1-ci dilim ✅ (013802a):** D2.3-lite (sahə tabları **9→3 niyyət qrupu** + ikinci-səviyyə chip; `?tab=` saxlanıldı) · D2.7 (soft-delete/undo, migration 0025 — canlı test sil→404→restore→200).
- **2-ci dilim ✅ (fabba8d):** D2.1 (mobil **bottom nav** 5 slot: Bu gün/Sahələr/[+FAB]/Bildiriş/Daha çox — mobil hamburger-i əvəz etdi, desktop top-nav qalır) · yeni marşrutlar **/fields** (böyük-sətir siyahı), **/more** (menyu), **/notifications** (D2.5 mərkəz — event kartlar + severity çip + field-ə deep-link, açılışda oxu). Canlı: bütün marşrutlar 200.
- **3-cü dilim ✅ (5b2c22e + fix 0e801a4):** `?ui=v2` bayrağı arxasında (yapışqan localStorage, `lib/uiFlag.ts`; `?ui=v1` geri çıxarır — canlı prod-da test, default UI toxunulmur):
  - **D2.2 "Bu gün" ana ekranı** (`components/home/TodayHome.tsx` + `lib/today.ts`): tarixli salam + "N sahə · M diqqət tələb edir" xülasə + aktiv-alert zolağı (field-ə deep-link) + hər sahə üçün **verdict kartı** (StatusChip + İcmal cümləsi) + **FAO-56 suvarma ipucu**. Deterministik (buildInsights + water-balance), progressiv per-sahə yükləmə.
  - **D2.3 map-first sahə görünüşü** (`components/field/FieldMapSheet.tsx`): tam-ekran sahə xəritəsi (z-0, sticky header + bottom-nav altında) + **sürüşən 3-snap sheet** (peek/half/full) — düz pointer-event + CSS height transition (animasiya asılılığı yox). Eyni tab state/handler-lər klassik görünüşlə paylaşılır (`page.tsx` bir dəst node → iki təqdimat). `OverviewTab` `compact` propu aldı (böyük map arxada olanda hero-map düşür).
  - **D2.6 kamera FAB** → AI foto-diaqnoz tabına keçir + sheet-i tam açır (full-da FAB gizlənir).
  - **Canlı test (2026-07-22, demo brauzer sessiyası):** Bu gün home (desktop+mobil), map-sheet drag (peek↔half↔full snap işləyir), kamera FAB, bottom-nav, verdict/NDVI overlay — hamısı ✓. **Tapılıb düzəldilib:** map div `h-full` → DisplayMap-ın height:auto `relative` wrapper-inə görə 2px-ə yığılırdı (maplibre render etmirdi); `h-screen`-ə keçirildi → Esri şəkli + poliqon + NDVI overlay düzgün render (mapH=757 təsdiq).
- **D2.4 (Sentinel/NASA birləşmə) QƏSDƏN edilmədi:** istifadəçinin açıq tələbi (item #1) NASA və Sentinel-2-nin **ayrı tablarda** qalmasıdır. Onlar VƏZİYYƏT qrupunda ayrı ikinci-səviyyə tab (İcmal/Sentinel-2/NASA) kimi saxlanılır. Birləşmə/"Ətraflı analiz" spec-i bu qərara görə donduruldu.
- **D2 qalan (kiçik, sonrakı fazalara):** desktop sidebar dəqiqləşdirməsi (agronom persona — hazırda v2 desktop-da da map-sheet işləyir) · `?panel=` sheet-state URL-də (hazırda tab `?tab=`-da) · Android geri-jesti sheet-i endirmə · guided-capture kamera axını (foto-diaqnoza birbaşa scroll).

**D1 detal (2026-07-22):** D1.1 ✅ (token qatı — emerald-600→#15803D global lift, ink/warn/bad/good/info tokenlər, card border-1.5, 16px floor; CSS-də təsdiq) · D1.2 ✅ (Inter Variable next/font, latin-ext) · D1.3 ✅ (StatusChip ikon+söz+rəng+aria; SatelliteTab summary-də) · D1.4 ✅ (Skeleton kit, dashboard yükləmə) · D1.5 ✅ (qlobal focus-visible ring). **D2-ə köçdü:** D1.6 (i18n sweep — mexaniki, T18-dən əvvəl), D0.7 (boş-hal düymələri — D2 empty-as-onboarding), D0.9 (useFieldDataStatus — D2 sheet işi ilə). Deploy: web-only, build gate (Inter fetch daxil) keçdi, marşrutlar 200.

**D0 detal (2026-07-22):** D0.1 ✅ (onboarding→səssiz tenancy + FieldOnboarding) · D0.2 ✅ (mobil zəng) · D0.3 ✅ (tab URL `?tab=` + skroller) · D0.4 ✅ (avto org/farm, tək-org chrome gizli) · D0.5 ✅ (`azError()` lüğəti + inline field xətaları) · D0.6 ✅ (.btn/.input min-h-44 + 16px input) · D0.8 ✅ (PhotoDiagnose+FertilizerCard→AI, MGRS header-dən, ⚙️→lucide). **D1-ə köçdü:** D0.7 (boş-hal action düymələri — D1 komponent kitində), D0.9 (`useFieldDataStatus` poller dedupe — D1 skeleton işi ilə). Deploy: web-only, `next build` gate keçdi, marşrutlar 200.
