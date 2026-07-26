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
| Landing (gradient hero) | `app/page.tsx` Landing | D3: public xəritə + toxun-tap draft → **E13: hero = 4-suallıq quiz**, xəritə `#live-demo` bölməsinə endi | D3 → E13 |
| Login / Signup / OTP | `login`, `signup`, `OtpVerify` | **Telefon-first OTP** (Telegram+SMS), email fallback | D3 |
| Onboarding (org→farm→field) | `onboarding/page.tsx` | Səssiz tenancy + FieldOnboarding sehrbaz | D0+D3 |
| Dashboard (org selector, ferma/sahə) | `app/page.tsx` Dashboard | **"Bu gün"** kart ana ekranı | D2 |
| Nav (üst + hamburger) | `Nav.tsx` | **Bottom nav (5+FAB)** / desktop sidebar | D2 (bell D0) |
| NotificationBell (desktop-only) | `NotificationBell.tsx` | **Bildiriş mərkəzi**, mobil header | D0+D2 |
| Sahə səhifəsi (9 tab) | `fields/[id]/page.tsx` | D2: 3-snap sheet → **E14: `lib/fieldSections.ts` — 16 bölmə / 3 qrup** | D2 → E14 |
| İcmal insight | ~~`OverviewTab.tsx`~~ (SİLİNDİ, 03620b1) | **"Sahənin vəziyyəti"** bölməsi: `overview/FieldPulse` + `SatelliteGlance` + `SignalsActions` + `MetadataNudge` | E14.2 |
| Sağlamlıq balı kartı | ~~`WellnessCard.tsx`~~ (SİLİNDİ, 03620b1) | `FieldPulse` daxilində (bal halqası + hökm + komponent zolaqları — iki kart bir kart oldu) | E14.2 |
| Sentinel-2 / NASA tab | `SatelliteTab.tsx` | **Tək "Peyk görüntüsü"** bölməsi (`<SatelliteTab sensor="S2" />` sabit); NASA/HLS UI-dan çıxdı (`HLS_ENABLED=false`) | D2/D4 → E14.3 |
| AI Məsləhət + chat | `AiTab.tsx` | **AI** bottom-nav səthi | D2 |
| KnowledgePassport | `KnowledgePassport.tsx` | MƏLUMAT qrupu + AI səthi | D2 |
| ClarificationBlock | `ClarificationBlock.tsx` | AI səthi | D2 |
| Foto diaqnoz | `PhotoDiagnose.tsx` | **AI səthi + kamera FAB** (guided capture) | D0+D2 |
| Gübrə planı | `FertilizerCard.tsx` | AI səthi (Business dəyəri) | D0 |
| Metadata (sahə pasportu) | `MetadataTab.tsx` | **MƏLUMAT** qrupu | D2 |
| Skautinq | `ScoutingTab.tsx` | **"Müşahidələr"** (İŞLƏR) + kamera FAB | D2/D5 |
| Tapşırıqlar / Əməliyyatlar / Məhsul | `TasksTab/OperationsTab/YieldsTab` | İŞLƏR qrupu, **click-first kit-ə** yenidən | D5 |
| ~~Subsidiya kalkulyatoru~~ | ~~`subsidy` + wizard~~ | **❌ məhsuldan çıxarıldı** (v1.12.0 — frontend + `routers/subsidy.py` silindi; 0008 `subsidy_*` cədvəlləri dormant qalır) | — |
| Qiymətlər / paywall | `pricing`, `PricingTable`, `UpgradeCta` | Stacked kartlar + pulsuz-nüvə xətti | D4 |
| Komanda / org / rol | `mgmt`, orgs | **"Daha çox" → Parametrlər/Komanda** (telefon dəvət) | D4 |
| Admin (Abunələr) | `admin` | "Daha çox" → Admin (dəyişmir) | D4 |
| Xəritə alətləri (basemap/ölç/compare/fırça/detect) | `FieldMap.tsx` | Explorer + sheet-də, çip toolbar | D2/D4 |
| PWA / offline outbox | `manifest/sw/offlineQueue` | Offline UX qatı + install kartı dəyər anında | D3/D5 |
| Telegram bağlantı | `TelegramConnect.tsx` | Onboarding OTP + "Daha çox" + iki-tərəf | D3/D5 |
| Bildiriş dispatcher (T1) | `rules/engine.py` | Dəyişmir (backend) — UI-ə deep-link əlavə | D2 |

**Gələcək (ROADMAP §C — T7…T26 + follow-up):** §H bölməsində hər biri fazaya bağlanıb.

> **E14 sonrası qrup adları (2026-07-26):** matrisdəki `VƏZİYYƏT / İŞLƏR / MƏLUMAT` qrupları
> **Monitorinq / İşlər / Qeydlər** oldu (`app.field.group.monitoring|work|records`), bölmə açarları
> isə `overview→status`, `sentinel2→satellite`, `ai→analysis`; `nasa` bölməsi silindi. Matrisin
> yuxarıdakı sətirləri həmin adlarla oxunmalıdır — tam taksonomiya §L-dədir.

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
- **D2.4 · "Ətraflı analiz" birləşməsi** — Fayllar: `SatelliteTab.tsx` → `ExpertExplorer.tsx`. Nə: Sentinel-2/NASA tabları birləşir; **kontrastlı sağlamlıq layı default** (per-field stretch, 3-zolaqlı etiketli legend); sensor = filtr çipi; indeks seçici AZ adlarla; scene timeline h-11 çip; cloud filtr; two-date compare. DoD: sensor jarqonu naviqasiyadan çıxır; bir poller. **→ E14.3-də başqa cür bağlandı:** birləşmə əvəzinə HLS UI-dan tamamilə çıxarıldı (bax §L).
- **D2.5 · Bildiriş mərkəzi** — Fayllar: `NotificationBell.tsx` genişlənmə, yeni `notifications` view. Nə: hər bildiriş = event + severity çip + tək "nə etməli" düyməsi → `field?panel=` deep-link. DoD: mərkəz + deep-link işləyir.
- **D2.6 · Kamera FAB axını** — Fayllar: `BottomNav.tsx`, kontekst sheet. Nə: FAB → sheet (foto diaqnoz / sahə əlavə / müşahidə əlavə). DoD: istənilən ekrandan kamera.
- **D2.7 · Soft-delete + undo** — Fayllar: `routers/fields.py` (DELETE → soft), `fields/[id]/page.tsx`. Nə: 2 addım + 10s undo toast + `deleted_at` (migration). DoD: təsadüfi silmə geri qaytarıla bilir.

---

## §E. D3 — Onboarding hunisi  ·  ≈2-3 həftə

"Əvvəl dəyər, sonra hesab." Hədəf: 0→AHA ~5 dəq.

- **D3.1 · Public landing xəritəsi** — Fayl: `app/page.tsx` Landing yenidən. Nə: tam-ekran hibrid basemap, axtarış pill (Nominatim) + "Mənim yerim" (icazə yalnız toxunuşda + fayda cümləsi); anonim toxun-tap → sərhəd + sahə çipi; draft `localStorage`. DoD: hesabsız sahə görünür. **→ E13-də hero yerini dəyişdi:** xəritə `#live-demo` bölməsinə endi, hero-nu 4-suallıq quiz tutdu (bax §K).
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
| ~~**T14** Subsidiya tarixçə + prefill~~ | ❌ mövzusuz — subsidiya modulu məhsuldan çıxarıldı (v1.12.0) | — |
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

> **⚠️ "Naviqasiya D2-dən sonra donur (yalnız əlavə)" qaydası 2026-07-26-da POZULDU — bilərəkdən.**
> E14 bölmə açarlarını adlandırdı və `nasa` bölməsini sildi (alias cədvəli olmadan), P2 rail-i 11→5
> hədəfə endirdi və dörd ERP modulunu `/farm`-ın `?tab=` bölmələrinə yığdı, `/fields` isə xəritəsini
> itirdi. Feature-parity qorundu (heç bir funksiya silinmədi — hamısı bir səviyyə aşağı köçdü və köhnə
> marşrutlar 307 ilə yönləndirir), amma **açar/marşrut sabitliyi qorunmadı**. Dondurma qaydası real
> olaraq D5.5 çöl testinə qədər qüvvədə deyil; sonra yenidən elan edilməlidir.

---

## §K. Status izləyici (hər addım bitəndə yenilə)

**D0 ✅ · D1 ✅ · D2 ✅ · D3 ✅ (əsas+checklist/preparing) · D4 ✅ (əsas+desktop map/perf) · D5 🚀 (səs/offline/chips ✅; iki-tərəf kanal + STT + çöl-testi asılılıqla bloklu) · E13 ✅ · E14 ✅ (→ §L) · E15 ✅ (→ §M, bir cron qeydi ilə)** — hər addım (D0.1…D5.5, E13…E15) bitəndə commit hash + ✅ ilə işarələ. Bu sənəd `ROADMAP.md` §C ilə paralel işləyir (T-backlog funksional, bu — dizayn/İA).

**Üçüncü dalğa (2026-07-25/26) — canlı vəziyyət.** Bu dalğanın iki böyük dizayn işi (E14, E15) ayrıca
bölmə kimi §L və §M-dədir; aşağıdakılar qalan İA/dizayn dəyişiklikləridir:
- **E13 ✅ (fc3f9c7):** landing hero-su **4-suallıq onboarding quiz** oldu (`components/landing/OnboardingQuiz.tsx` + `lib/onboardingQuiz.ts`): məhsul → ölkə/rayon (AZ-da `AZ_RAYONS` select, digərlərində mətn) → hazırkı çətinlik → nə lazımdır (çox-seçim) → nəticə + 3 sətirlik plan + signup CTA. Tək-seçim addımları avto-keçir, fokus yeni sual başlığına düşür, hər addım keçilə bilir. Cavablar `localStorage` (`agradex.onboarding.v1`) → signup body (`SignupIn.onboarding`, migration 0046 `users.onboarding` jsonb) → signup formasının ölkə/rayonu + `FieldOnboarding`-in crop/region ilkin doldurulması. **Canlı xəritə silinmədi** — `RoleCards`-ın altına, `#live-demo` bölməsinə endi (hero-nun "demonu izlə" düyməsi hələ ora aparır). Səbəb: xəritə məhsulu artıq başa düşən adam üçün gözəl oyuncaqdır, quiz isə ziyarətçidən **öz təsərrüfatını** soruşur və cavabları yaratdığı hesaba ötürür.
  - Qeyd: `POST /api/auth/onboarding` (mövcud sahələrə crop/region yazan yol) frontend-də **çağırılmır** — cavablar DB-yə yalnız signup-dan düşür. Bu yarım funksiya dormant sayılmalıdır.
- **Bütün xəritələr fon tabında boş qalırdı — HƏLL ✅ (073b62f; əvvəlki səhv diaqnoz 70e1378):** MapLibre-in `Style.loadJSON`-u bir animasiya kadrı gözləyir (`browser.frameAsync`) və kadr gəlməsə rejection-u udur. Fon tabında kadr istehsal olunmur → `style._loaded=false`, `stylesheet=null`, `load` heç vaxt işə düşmür, tayl sorğusu getmir, **xəta da atılmır**, tab görünəndə MapLibre təkrar cəhd etmir. Simptom: doğru ölçülü canvas, işləyən zoom kontrolları, çəkilmiş legend, sıfır konsol xətası. Bu **bir komponentin problemi deyildi** — sahə xəritəsi və zona xəritəsi də eyni host-da boş idi; marketinq xəritəsi yalnız o səhifə ön planda qurulduğuna görə işləyirdi. İstifadəçi bura orta-klik / yeni tabda-aç, bərpa olunmuş sessiya və ya PWA-nın soyuq açılışı ilə düşür. Fix: yeni `lib/useMapReady.ts` — **hər beş MapLibre qurulması** (`FieldMap`-də `DrawMap`/`DisplayMap`/`CompareMap`, `FieldsOverviewMap`, `ZonesTab`) ilk real kadra qədər gözləyir, `visibilitychange`-də yenidən qurulur. `requestAnimationFrame` `document.visibilityState`-dən qəsdən üstün tutulub: kiçildilmiş və ya tam örtülmüş pəncərə "visible" deyə bilər. **Yeni xəritə əlavə edən hər kəs bu hook-u işlətməlidir.**
  - 70e1378 (listener-ları çəkişdən əvvəl bağlamaq + `drawSafe` try/catch) kodda qalır və kök-səbəb düzəlişi kimi görünür — **deyil**, o səhv diaqnozla edilmiş 1-ci cəhd idi; müdafiə olaraq faydalıdır.
- **/fields siyahısı — xəritə çıxarıldı ✅ (800597e):** `FieldsOverviewMap` və org-səviyyəli `GET /api/fields/geo` sorğusu siyahı ekranından silindi, iki-sütunlu map+list grid tək `max-w-3xl` sütuna çevrildi, hər sətrə `ShareButton` əlavə olundu (sətir `<Link>`-inin **qardaşı** kimi — `<a>` içində `<button>` ola bilməz; açılana qədər heç nə fetch etmir). **İstifadəçi düzəlişi:** bu ekranda xəritə heç kimin vermədiyi suala cavab verirdi — hər sətir onsuz da ad, sahə və sağlamlıq balını daşıyır, sahənin öz səhifəsində isə xəritə var. `FieldsOverviewMap` **silinmədi**: `TodayHome` (dashboard) və admin səhifəsində qalır.
  - Qeyd (ziddiyyət): `app/src/app/fields/page.tsx`-dəki şərh bu dəyişikliyi "(E15)" adlandırır, halbuki bu sənəddə və commit tarixçəsində E15 = email konsolidasiyasıdır. Şərhdəki nömrələmə səhvdir; dəyişikliyin özü 800597e-dir.
- **Landing SSR + hero mövqeləndirməsi ✅ (6bf36a6):** `app/page.tsx`-də `if (!appHost) return <Landing />` **`if (loading)` qapısından yuxarı** qaldırıldı — serverdə auth `loading` həmişə `true` başlayır, ona görə hər craweler marketinq səhifəsinin yerinə spinner alırdı. Host artıq sorğudan bilinir: middleware `x-app-host` header-i qoyur, `layout.tsx` onu `AppHostProvider`-ə verir, `useIsAppHost()` mount-effect əvəzinə kontekstdən oxuyur (`lib/host.ts` → **`lib/host.tsx`**, çünki modul artıq JSX provider ixrac edir). Yan fayda: app host artıq marketinqi göstərib sonra özünü düzəltmir. `layout.tsx`-in statik `metadata`-sı `generateMetadata()` oldu → hər sorğuda canonical + **bütün lokallar üçün hreflang** + `x-default` (əvvəl heç biri yox idi). Hero mesajı differensiatora keçdi: "Tarlanız üçün AI aqronom — xəritə yox, cavab." Fındıq-yönümlü mövqeləndirmə marquee çipindən, hero nişanından, müqayisə sətrindən, peer təklifindən, modul maketindən və rəydən çıxarıldı.
  - Ölçmə dürüstlüyü: commit yalnız **ƏVVƏLKİ** HTML ölçülərini yazır (ana səhifə 12.5KB, sıfır `<h1>`, sıfır `<p>`; /pricing, /how-it-works, /solutions, /status onsuz 83–152KB server-render idi). **SONRAKI ölçmə repoda yoxdur** — düzəliş struktur olaraq iddia edilir, ölçülməyib.
- **Naviqasiya konsolidasiyası (P2) ✅ (b2e973f):** `AppRail` **11 → 5 hədəf** (Bu gün · Sahələr · Təsərrüfat · Hesabatlar · Daha çox). Dəftər/Satış/Anbar/Texnika bir `/farm` konteynerinin `?tab=` bölmələri oldu (`lib/farmSections.ts` + `app/farm/page.tsx`; gövdələr eynilə `components/farm/*Section.tsx`-ə köçdü, köhnə dörd marşrut `redirect()` = **307** ilə yönləndirir — `permanentRedirect()` qəsdən İŞLƏDİLMƏYİB, çünki daimi yönləndirmə brauzerdə əbədi keşlənir və konsolidasiyadan geri dönsək köhnə URL-i ziyarət etmiş adam ilişib qalar). `BottomNav`-ın Bildirişlər slotu **Təsərrüfat** oldu (bildiriş zəngi mobil header-də hər ekranda var), `isActive` isə seqment sərhədinə keçdi — `/farms` `/farm` ilə başlayır və xam prefiks yanlış tabı yandırırdı. Kataloq (`/catalog`) və İcma (`/chat`) `lib/navFlags.ts::SHOW_MARKETPLACE_NAV = false` ilə naviqasiyadan gizləndi: hər ikisi tam qurulub və **boşdur** (seed olunmuş təchizatçı yox, mesaj yox) — boş vitrin dəyər axtarılan yerdə boşluq reklam edir. Marşrutlar, API və komponentlər canlı qalır, landing hələ `/catalog`-a link verir; sabit `: boolean` annotasiyası ilə (annotasiyasız TS literal `false` çıxarır və aktiv budağı ölü kod sayır).
- **Pasport boşluqları (P1) ✅ (b2e973f + 8846aed + 2a0b00d):** `MetadataNudge` + `completeness.ts` — detal §L E14.2-də.
- **Sahə vahidləri (P1.2) ✅ (76abcb5):** `lib/units.ts` — **ha / dönüm / sot**, hər vahid üçün ayrı onluq dəqiqlik (ha 2, dönüm 1, sot 0 — "13.60 dönüm" oxunmur). `users.area_unit` (migration 0048) NULL = ölkədən törə (TR → dönüm, digər → ha); **sot heç vaxt default deyil** (40 ha sahəni "4000 sot" göstərmək faydasızdır) — yalnız açıq seçim. `AreaUnitSetting` /more və /account-da (silinmiş `EmailAlertsToggle`-ın yerini tutdu). Konversiya **yalnız render kənarında** olur: DB, API, geo pipeline və bütün modellər hektarda qalır; sahə YAZAN yer geri çevirməlidir (`YieldsTab` `fromUnit()` ilə edir). Hektar-başı **normalar** (t/ha, kq/ha dozalar) qəsdən hektarda qalır. ~20 səth vahiddən keçirildi. Səbəb: hamıya hektar göstərmək "bu tətbiq mənim üçün qurulmayıb" siqnalıdır.
- **Sağlamlıq balının yalan "kritik" hökmü (P0.1) ✅ (b2e973f):** FAO-56 su balansı olmayanda su komponenti NDMI-yə düşür; köhnə xəritələmə real sahənin NDMI −0.13 dəyərini 0/100-ə sıxırdı və bal içində 38.5% çəki daşıyırdı → bitki örtüyü 45 olan sahə **28/100, "Risk: su balansı kritik (0/100)"** başlığı ilə çıxırdı — üstəlik bir sətir aşağıda "(torpaq-su balansı hesablanmayıb)" yazılırdı. Üç hissəli **PROXY QAYDASI** kodlaşdırıldı: (1) proxy komponent 25..85 zolağına sıxılır — nə 0 (kritik), nə 100 (mükəmməl) ala bilir; (2) **öz adını daşıyır** (`water.ndmi` → "Peyk nəmlik siqnalı"), əvəz etdiyi ölçmənin adını yox; (3) real ölçmə varsa proxy heç vaxt "ən pis komponent" kimi adlandırılmır və tək başına tonu "bad"-a itələyə bilmir. Eyni sahə indi **40/100, "Diqqət: bitki örtüyü zəifdir (45/100)"**. Ayrıca çəkilər `_apportion()` ilə tam 100-ə yığılır (kart 62% + 39% = 101% göstərirdi) — `FieldPulse` `weight_pct ?? Math.round(weight*100)` oxuyur. **Dizayn nəticəsi:** əvəzedici siqnal rəqəmi tərpədə bilər, amma platformanın barmaq basıb "sahənin problemi budur" dediyi şey ola bilməz.
- **Backend AZ cümlələri lokallaşdırıldı (P0.2) ✅ (b2e973f):** altı backend modulu Python-da hazır **Azərbaycanca cümlə** qururdu, yəni türk və ya rus fermer tərcümə olunmuş interfeys içində azərbaycanca mətn oxuyurdu. İndi hər biri sabit `*_code` + xam `*_params` cütünü **köhnə cümlə ilə YANAŞI** qaytarır, frontend `tf()` ilə həll edir, köhnə sətirlər fallback qalır (`RainNowcast`, `SeasonCompareChart`, `WeatherHistoryTab` şaxta, `ClarificationBlock`, `KnowledgePassport` FAO-56, `WeatherBar`). Qayda: **Python-da tərcümə etmə.**
- **AI məsləhəti oxucunun dilində (P0.3) ✅ (f83fbe5 + f3a7cf3 + 1ebb516):** məsləhət mətni bir dəfə yaradılır və mətn kimi saxlanılır — oxunanda tərcümə olunmur. `advice.lang` (migration 0049) + org sahibinin `users.locale`-ı (avtomatik generasiya üçün) + `POST /api/auth/locale` (dil seçici artıq sütunu da yazır) + `GET /advice`-in `lang_mismatch` bayrağı. UI dizaynı: yad dildəki analizi səssizcə göstərmək əvəzinə **`AdviceLangNote`** bunu deyir və bir toxunuşla yenidən yaradır; kvota bitibsə **429 `advice_quota_exceeded`** ilə əsl səbəbi göstərir (əvvəl 200 OK gəlirdi, spinner dayanırdı və heç nə dəyişmirdi). Şiddət sözləri (`aşağı/orta/yüksək`) mənbədə **KOD** qalır, yalnız çip etiketi tərcümə olunur (`severityLabel()`).
- **Cəm/kəmiyyət uzlaşması ✅ (34b0f79 + 8c38e8b + 84e5f28):** siyahı başlığı "1 полей" / "1 fields" yazırdı. `tp(base, n)` `Intl.PluralRules` ilə formanı seçir; ru/pl üç, en/de iki, az/tr bir forma verir. Digər "`<n> <isim>`" səthləri (satış qeydləri, paylaşım baxışları, peer fermerlər, yağış günləri) eyni yolla çevrilə bilər.

**İkinci dizayn dalğası (2026-07-23, autonomous run 2 — hər biri build-gate + deploy + canlı test):**
- **D3.6 ✅ (d653da5):** onboarding **aktivasiya checklist** (endowed 3/5 goal-gradient, server-state-dən auto-addımlar + action-link addımlar, Telegram dormant-da buraxılır, bağlana bilir) + **huni event-ləri** (migration 0029 `user_events` + `POST /api/events` allow-list + `lib/track`; field_created/crop_set/advice_viewed/telegram_connected/checklist_complete). Canlı: checklist 3/5 render, event DB-yə düşdü.
- **D3.5 ✅ (966412b):** `InstallPrompt` — `beforeinstallprompt` tutub **data-hazır anında** install kartı göstərir (soyuq banner yox); standalone/dismissed-də gizli. "Hazırlanır" dəyər-kartları T0 partial-reveal + PreparingBanner ilə onsuz örtülü.
- **D4.3 ✅ (56f646d):** **desktop çox-sahə xəritə** — `GET /api/fields/geo` + `FieldsOverviewMap` (bütün poliqonlar bir xəritədə, status-rəngli, fit-bounds, klik→aç), Bu-gün home-da md+ · **org switcher** (>1 org). Canlı: lecet poliqonu yaşıl-ready render (fix: `load` etibarsız → `idle` safety-net + resize).
- **D4.5 ✅ (1c0f44f):** **data-saver** (`lib/dataSaver` — explicit toggle + brauzer Save-Data hint; `DataSaverToggle` "Daha çox"-da); FieldMapSheet ağır full-bleed rasteri avto-yükləmir, tap-to-load çipi. Tile-keş sw.js-də onsuz var.
- **D0.9 ✅ (966412b):** paylaşılan `useFieldDataStatus` hook — OverviewTab+SatelliteTab dublikat 6s pollerlərini əvəz etdi. Canlı: İcmal pozulmadı.
- **D5.4+ ✅ (966412b):** kamera FAB birbaşa foto-diaqnoz kartına scroll edir (guided capture). CropGrid/NumberSlider təxirə (ChoiceChips tezisi örtür).
- **D1.6 (i18n sweep) — QƏRAR: T18 ilə birləşdirilir.** Tam çıxarış (~40 fayl, yüzlərlə sətir) tərcüməsiz churn + risk yaradır və T18 (RU/TR) onsuz eyni sətirlərə toxunacaq. i18n infrastrukturu (`i18n.ts` + `t()`) hazırdır. Çıxarış+tərcümə **T18-də birlikdə** ediləcək — daha təhlükəsiz, daha az risk.
- **D5.5 çöl testi — insan addımı** (real fındıq/buğda fermeri 55+, 2 raund) — "redizayn bitdi" şərti; kod tərəfli hazırlıq tamamdır.

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
  - **⚠️ Bu qərar E14.3-də (2026-07-26, 03620b1 + 722b808) istifadəçi tərəfindən GERİ ALINDI** — birləşmə də edilmədi, `nasa` bölməsi sadəcə silindi və HLS `HLS_ENABLED = false` ilə UI-dan çıxarıldı. Data qatı toxunulmaz qaldı. Detal §L.
- **D2 qalan (kiçik, sonrakı fazalara):** desktop sidebar dəqiqləşdirməsi (agronom persona — hazırda v2 desktop-da da map-sheet işləyir) · `?panel=` sheet-state URL-də (hazırda tab `?tab=`-da) · Android geri-jesti sheet-i endirmə · guided-capture kamera axını (foto-diaqnoza birbaşa scroll).

**D1 detal (2026-07-22):** D1.1 ✅ (token qatı — emerald-600→#15803D global lift, ink/warn/bad/good/info tokenlər, card border-1.5, 16px floor; CSS-də təsdiq) · D1.2 ✅ (Inter Variable next/font, latin-ext) · D1.3 ✅ (StatusChip ikon+söz+rəng+aria; SatelliteTab summary-də) · D1.4 ✅ (Skeleton kit, dashboard yükləmə) · D1.5 ✅ (qlobal focus-visible ring). **D2-ə köçdü:** D1.6 (i18n sweep — mexaniki, T18-dən əvvəl), D0.7 (boş-hal düymələri — D2 empty-as-onboarding), D0.9 (useFieldDataStatus — D2 sheet işi ilə). Deploy: web-only, build gate (Inter fetch daxil) keçdi, marşrutlar 200.

**D0 detal (2026-07-22):** D0.1 ✅ (onboarding→səssiz tenancy + FieldOnboarding) · D0.2 ✅ (mobil zəng) · D0.3 ✅ (tab URL `?tab=` + skroller) · D0.4 ✅ (avto org/farm, tək-org chrome gizli) · D0.5 ✅ (`azError()` lüğəti + inline field xətaları) · D0.6 ✅ (.btn/.input min-h-44 + 16px input) · D0.8 ✅ (PhotoDiagnose+FertilizerCard→AI, MGRS header-dən, ⚙️→lucide). **D1-ə köçdü:** D0.7 (boş-hal action düymələri — D1 komponent kitində), D0.9 (`useFieldDataStatus` poller dedupe — D1 skeleton işi ilə). Deploy: web-only, `next build` gate keçdi, marşrutlar 200.

---

## §L. E14 — Sahə səhifəsinin yenidən qurulması  ·  2026-07-26  ·  **✅ CANLI**

**Commitlər:** `03620b1` (əsas) → `30b3698` (regres düzəlişi) → `722b808` (7 dil paritet + sweep) →
`8846aed` + `2a0b00d` (pasport strip düzəlişləri). **Bisect edərkən `03620b1..722b808` bir məntiqi
dəyişiklik kimi oxunmalıdır.**

**Niyə:** doqquz tab, üstündə isə üst-üstə iki kart — `WellnessCard` (0-100 bal, öz `/wellness`
fetch-i ilə) və `OverviewTab`-ın hökm hero-su — təxminən min piksel yer tutub **eyni şeyi iki dəfə
deyirdi: bal, sonra balı izah edən cümlə**.

### E14.1 · Bölmə taksonomiyası
**Fayllar:** yeni `app/src/lib/fieldSections.ts` (105 sətir) · yeni `app/src/components/shell/FieldSectionMenu.tsx` (77) · `app/src/app/fields/[id]/page.tsx` · `app/src/components/shell/FieldListPanel.tsx`.
**Nə:** köhnə `TabKey/TABS/GROUPS/GROUP_OF` dördlüyü sahə səhifəsinin içindən çıxdı — **16 bölmə / 3 qrup**:

| Qrup | Açar | Bölmələr |
|---|---|---|
| Monitorinq (5) | `app.field.group.monitoring` | `status` · `satellite` · `analysis` · `weather` · `zones` |
| İşlər (7) | `app.field.group.work` | `tasks` · `fertilizer` · `photos` · `scouting` · `operations` · `yields` · `harvest` |
| Qeydlər (4) | `app.field.group.records` | `season` · `soil` · `metadata` · `documents` |

`DEFAULT_SECTION = "status"`. Köçürməni iki şey məcbur etdi: (a) desktop sol paneli bu menyunu
render edir, şel isə bir səhifəni import edə bilməz; (b) `GROUP_OF` əl ilə saxlanan tərs xəritə idi —
bir sətir unudulanda `GROUPS.find(...)!` render vaxtı throw edirdi. İndi `Object.fromEntries(...)` ilə
**törədilir**, `groupSections()` isə tapmayanda throw əvəzinə `[]` qaytarır.
**DoD:** `?tab=` deep-link işləyir; desktop panel menyusu və mobil çip sırası eyni siyahıdan oxuyur.

### E14.2 · "Sahənin vəziyyəti" birləşmiş bölməsi
**Yeni fayllar:** `components/field/overview/FieldPulse.tsx` (218) · `SatelliteGlance.tsx` (200) · `SignalsActions.tsx` (159) · `MetadataNudge.tsx` (424) · `completeness.ts` (89).
**SİLİNDİ:** `components/field/OverviewTab.tsx` (−328) · `components/field/WellnessCard.tsx` (−196).

- **`FieldPulse`** — SVG bal halqası + hökm başlığı (`wellnessHeadline`) + sabit sıra ilə komponent
  zolaqları (`ndvi/water/pest/gdd`, çəki `weight_pct ?? Math.round(weight*100)`) + hər komponentin
  öz səbəb sətri + "platformanın görə bilmədiyi" sətri (`missing`/`missing_labels`) + `SpeakButton` +
  `?refresh=1` düyməsi + altında `MetadataNudge`. **B8 qaydası (faylda yazılıb):** *bal heç vaxt tək
  göstərilmir — onu doğuran hər komponent öz alt-balı və çəkisi ilə sadalanır, platformanın
  GÖRMƏDİYİ isə adı ilə deyilir.*
- **`SatelliteGlance`** — vəziyyət bölməsinin peyk bloku: **kiçik** `DisplayMap` (hero yox), düz üç
  indeks çipi `GLANCE_INDICES = ["NDVI","NDMI","NDRE"]` (örtük · nəmlik · azot), sabit rəng rampası +
  legend, son 8 tarixin sürüşən zolağı (dəyər + bulud %), 4-səhnə geriyə delta, "tam bölməni aç" və
  data-saver qapısı (toxunana qədər raster çəkilmir). Doqquz indeks, bulud slayderi, kontrast,
  iki-tarix müqayisə və trend chart **peyk bölməsində qalır — bir düymə uzaqda**; hamısını bura
  gətirmək təzəcə sadələşdirdiyimiz iş dəzgahını yenidən qurmaq olardı.
- **`SignalsActions`** — "Siqnallar və görülməli tədbirlər": xülasə, `MAX_RISKS = 3` risk (şiddət
  çipi ilə), `MAX_ACTIONS = 4` tədbir (`next_steps`, yoxdursa tövsiyə başlıqları), disclaimer, "tam
  analizə keç". **Eyni `GET /api/fields/{id}/advice`-i oxuyur — yeni endpoint yoxdur**, söhbət
  yoxdur: bu `AiTab`-ın ikinci nüsxəsi deyil, xülasəsidir. Fetch xətası udulur ki, vəziyyət səhifəsi
  sınmasın.
- **`MetadataNudge` + `completeness.ts`** — pasport boşluqları `crop_type · planting_date ·
  irrigation_method · soil_type · region` sırası ilə, eyni anda **ən çox 2** (`MAX_GAPS`), hər biri
  nəyi açdığını və neçə saniyə çəkdiyini deyir, sətir-içi redaktə (CropGrid / ClickDate /
  ChoiceChips / rayon siyahısı), 14 günlük `localStorage` snooze, region üçün saxlanmış sentroid
  üzərindən `GET /api/geo/site` ilə **bir-toxunuşluq qəbul** (mətn qutusu yox). **Dürüstlük qaydası
  (faylda yazılıb):** heç vaxt "bal və ya diaqnoz səhvdir" demir — yalnız **məsləhətin
  kəskinləşəcəyini** deyir. Eyni sıralama `FieldOnboarding` addım-4 qeydi və `OnboardingChecklist`
  tərəfindən paylaşılır ki, mətn və prioritet bir-birindən ayrılmasın.

**Bölmə məzmun sırası:** `RainNowcast → FieldPulse → SatelliteGlance → SignalsActions → ShareButton`.
`SeasonCompareChart` vəziyyət bölməsindən çıxıb **`season` bölməsinə** keçdi (çox-mövsümlü chart
qeyd artefaktıdır). `FieldMapSheet`-in tam-en hero xəritəsi (`h-[52vh]` `DisplayMap` + data-saver
düyməsi) silindi — sarğı yalnız kamera FAB-ı və səhifə düzümünü saxlamaq üçün qaldı: **səhifə
mənzərə ilə yox, hökmlə açılır.**
**DoD:** iki kart bir kart oldu; səhifə açılışda hökm göstərir.

### E14.3 · NASA/HLS UI-dan çıxır + "Peyk görüntüsü" adlandırması
**Fayllar:** `lib/sensors.ts` · `fields/[id]/page.tsx` · `ZonesTab.tsx` · `lib/basemaps.ts` · `SatelliteTab.tsx` · `landing/LandingSections.tsx` · `i18n.ts` + 7 lokal fayl.
**Nə:** `HLS_ENABLED = false` (tək açar) + `UI_SENSORS` + `sensorVisible()`; sabit `SENSOR_META`
rekordu `sensorMeta()` **funksiyasına** çevrildi (etiketlər `t()`-dən keçir və **render vaxtı** aktiv
dildə həll olunmalıdır — modul səviyyəli sabit ilk yüklənən dili tuturdu); `nasa` bölməsi silindi və
səhifə `<SatelliteTab field={field} sensor="S2" />` şərtsiz render edir; `ZonesTab`-ın sensor seçicisi
silindi; basemap adı "Sentinel-2 (buludsuz)" → "Buludsuz peyk"; `SatelliteTab`-ın "o biri taba bax"
mətni `app.field.glance.preparing`-ə yığıldı.
**Data qatı toxunulmadı** — geo pipeline, `run-hls` cron, saxlanan S30/L30 sətirləri, rayon benchmark
SQL-i, A8 backfill və A6 zonalar HLS oxumağa davam edir. HLS artıq sadəcə **fermerin haqqında
düşünməli olduğu şey deyil.**
**Atribusiya QƏSDƏN qaldı:** `/status` mənbə səhifəsi hələ "NASA HLS (Harmonized Landsat–Sentinel)"
yazır, `mkt.status.metaDescription` 8 dildə NASA HLS / Sentinel-2 / Open-Meteo adlarını saxlayır, EOX
basemap-ın "Sentinel-2 cloudless 2023 — EOX (CC BY-NC-SA 4.0)" krediti hərfi ilə qaldı və tələb olunan
**"Contains modified Copernicus Sentinel data 2026"** bildirişi 7 tərcümə dilində
`mkt.status.src2Body`-yə ƏLAVƏ edildi. Lisenziya atribusiyası brendinq deyil — sweep-dən kənardır.
Yan düzəliş: `SatelliteTab`-ın sahə-içi **p10–p90 zolağı** `sensor === "HLS"` qapısından azad edildi
(p10/p90 hər sensor üçün `persist_scene` tərəfindən yazılır — qapı NASA göstərilməyi dayandıran anda
zolağı UI-dan silərdi).
**DoD:** istifadəçi məhsul mətnində "NASA" sözünü görmür; provenans səhifəsi hər iki peyki adlandırmağa
davam edir.

### İstifadəçi düzəlişləri — dizayn qərarı, belə qalır
1. **Bölmə adları:** **"Sahənin vəziyyəti"** (`app.field.section.status`, əvvəl `field.tab.overview`
   "İcmal") · **"Peyk görüntüsü"** (`app.field.section.satellite`) · **"Sahə analizi"**
   (`app.field.section.analysis`, əvvəl `field.tab.ai` "AI Məsləhət") · blok başlığı **"Siqnallar və
   görülməli tədbirlər"** (`app.field.signals.title`). **"Sahə analizi" Monitorinq qrupundadır** —
   peykdən sonrakı ilk blok, İşlər/Qeydlərdə deyil. Adlar köhnə açarların üstünə yazılmadı, **yeni
   açar** kimi əlavə olundu.
2. **Mobil/laptopda üfüqi çiplər qalır, desktopda panel menyusu.** İki naviqasiya heç vaxt eyni anda
   ekranda olmur: səhifənin `tabNav`-ı `xl:hidden`, `FieldListPanel` isə `hidden … xl:flex`.
   `xl`-dən yuxarıda çiplər gizləndiyi üçün məzmun sütunu açıq bölmənin adını özü deməlidir —
   `<h2 className="… hidden … xl:block">{t(sectionOf(tab).labelKey)}</h2>`. Sahə açılanda panel
   yığılır: siyahı bir sətirlik karta enir (bal çipi + ad + sahə ölçüsü), altında `FieldSectionMenu`,
   "bütün sahələr (N)" düyməsi siyahını geri açır (`browsing` state, `activeId` dəyişəndə sıfırlanır);
   axtarış/sıralama sırası və sürüşən siyahı `focused` olanda `hidden` alır. `FieldSectionMenu`
   href-ləri **həmişə `/fields/${fieldId}`-ə** qurur, `usePathname()`-ə yox — panel sahə olmayan
   marşrutda da mount ola bilər.
3. **Alias cədvəli YOXDUR — qəsdən.** `resolveSection()` tanımadığı `?tab=` dəyərini səssizcə
   `status`-a həll edir. Səbəb `fieldSections.ts:8-13`-dədir: məhsulun yalnız test istifadəçiləri var,
   hər daxili link qurucusu adlandırma ilə birlikdə yeniləndi, və **mövcud olmayan uyğunluq problemi
   üçün shim onu niyə yazdığımızı xatırlayan hər kəsdən uzun yaşayardı.** Naməlum dəyərin ilk bölməyə
   düşməsi kəsilmiş/əl ilə redaktə olunmuş URL-ə qarşı adi möhkəmlikdir, legacy dəstəyi deyil.
   **Bilinməli nəticə:** `?tab=overview | ai | sentinel2 | nasa` daşıyan köhnə link (email, Telegram,
   skrinşot) nə 404 verir, nə yönləndirilir — **siqnalsız səhv bölmə açır**. Fikir dəyişsə,
   `fieldSections.ts:96-98`-də 5 sətirlik dəyişiklikdir; əvvəl başlıq şərhini oxu.

### Fallout və qeydlər
- `03620b1` **build gate işlədilmədən** push edildi (commit mətni: *"Build gate not yet run — pushing
  so the server can compile it. Production keeps serving the previous image until update.sh runs."*).
  Bu Mac-da node yoxdur — yeganə TypeScript qapısı serverdəki `docker build web`-dir.
- **`30b3698` — regres:** `ZonesTab`-dan sensor seçicisini silmək bloka bitişik **hər şeyi udmuşdu** —
  hesabla düyməsi, computing/insufficient/failed/empty bannerləri, zona xəritəsi + legend, hökm sətri
  və zona statistika cədvəli (03620b1-də −109 sətir, 30b3698-də +85 geri). **Dərs:** JSX ağacında
  sxematik silmə susaraq kompilyasiya olunur — tip sistemi bir funksiyanın yoxa çıxdığını görmür.
  Belə diff **tam** oxunmalıdır. (Eyni sinif səhv sessiyada `8c38e8b`-də təkrarlandı.)
- **Orfan lüğət açarları** (8 dildə qalır, heç yerdən istifadə olunmur): `field.tab.overview`,
  `field.tab.sentinel2`, `field.tab.nasa`, `field.tab.ai`, həmçinin
  `app.fieldDetail.groupVaziyyet/Isler/Melumat`. Qeyd: `field.tab.nasa` ölü olmasına baxmayaraq
  `722b808`-də "Peyk arxivi"-yə adlandırıldı — grep-də sweep tam görünsün deyə.
- **Rollback dəqiqləşdirməsi:** `sensors.ts` `HLS_ENABLED`-i "bir-boolean rollback" kimi elan edir,
  amma `sensors.ts`-dən kənarda `HLS_ENABLED` / `UI_SENSORS` / `sensorVisible()` **istifadə edən yer
  yoxdur**. Sabiti `true` etmək tək başına heç nə qaytarmır: `fields/[id]/page.tsx` `sensor="S2"`
  hard-code edir və `SECTION_GROUPS`-da HLS bölməsi yoxdur. Real rollback üçün əlavə olaraq
  `fieldSections.ts`-ə bölmə sətri və ikinci `SatelliteTab` nüsxəsi lazımdır.
- **Təmizlənməmiş qalıq:** `FieldMapSheet.tsx` hər sahə açılışında hələ
  `GET /api/fields/{id}/scenes?index=NDVI&sensor=s2` sorğusu atır, nəticəsi (`rasterUrl`) isə hero
  xəritəsi silindikdən sonra istifadəsizdir; `dataSaver`, `forceRaster`/`setForceRaster` və
  `DisplayMap`/`Layers` importları da ölüdür. Bu qərar yox, nəzarətdən qaçmış qalıqdır (production
  build-dən keçib — deməli istifadəsiz-dəyişən qaydası burada error səviyyəsində deyil).

---

## §M. E15 — Email konsolidasiyası  ·  2026-07-26  ·  **✅ CANLI (bir cron qeydi ilə)**

**Commit:** `6bf36a6` (SEO commit-inin içində gəldi). Dizayn tərəfi burada izlənir, çünki bu, D2.5
(bildiriş mərkəzi) və D5.1/D5.3 (kanal + offline) ilə **eyni sualın email tərəfidir: fermerin
diqqətinə nə vaxt və neçə dəfə toxunuruq.**

**Niyə:** üç müstəqil göndərən vardı və ikisi şablon sistemini tamamilə keçirdi. Pis havada üç sahəsi
olan fermer gündə onlarla email yığa bilirdi.

**Nə:** yeddi göndərmə yolu → **tranzaksiya (OTP/təsdiq, welcome, ilk "sahə hazırdır") + BİR həftəlik
digest**.
- Digest: yeni `services/app/ai/emails/weekly.py` (562 sətir), **tək** `TEMPLATE_ID = "weekly"`, dörd
  variant `no_fields | no_crop | alerts | calm`, dedup açarı **ISO həftə**
  (`to_char(now(),'IYYY-"W"IW')`). Ayrı template id-lər cümə axşamı sahə əlavə edən fermerə eyni
  həftədə ikinci email göndərərdi — ona görə bir id + variantlar.
- **Silindi:** `rules/engine.py::_deliver_email()` (hər işə düşən alert üçün bir email, hər sahə üzrə)
  və `ai/advice.py::_notify()`-dakı məsləhət-dəyişdi emaili (praktikada hər yeni peyk səhnəsindən
  sonra — 2-3 gündən bir, hər sahə). Hər iki yerdə **"Do not re-add"** şərhi qaldı: onlar
  `send_template`-i keçirdi, yəni **idempotentlik jurnalı yox, opt-out qapısı yox, unsubscribe linki
  yox** və heç bir həcm limiti yox idi.
- **Anilik kimdə qalır:** in-app bildiriş (`public.notifications`) + Telegram — dəyişmədi. Alert
  dispatch-i yalnız email-i itirdi.
- **Opt-out sadələşdi:** migration `0047` `users.email_alerts` sütununu **silir**; tək açar
  `users.email_lifecycle` qalır. `GET/POST /api/auth/email-alerts` endpointləri və
  `app/src/components/EmailAlertsToggle.tsx` silindi (silinmiş sütuna qarşı 500 verərdi).
  **`EmailLifecycleToggle` indi yeganə qeyri-tranzaksiya email açarıdır** və başlığında yeni müqavilə
  yazılıb: OTP/təsdiq, welcome və ilk "sahə hazırdır" hesabatı **həmişə** gedir, qalan hər şey bir
  çərşənbə digestidir.
- **Şablon qatı:** `emails/layout.py` blok sistemi aldı (`image · score · bullets · divider · text ·
  heading · steps · stats · cta`) — hər renderer **həm HTML, həm mətn güzgüsünü** qaytarmalıdır, yoxsa
  blok emailin mətn hissəsindən xəbərsiz yox olur. Dark-mode + responsive **yalnız progressiv
  təkmilləşdirmə** kimi əlavə olundu (inline stillər tək başına düzgün light email verir — Outlook
  desktop media query-ni oxumur). Escape iki səviyyəyə bölündü: `esc()` hər etibarsız slotda,
  `_rich()` yalnız `b/strong/i/em/u` + `<br>` açır, `_safe_url()` `javascript:`/`data:` bloklayır —
  digest **fermerin yazdığı sahə adını və LLM xülasəsini** email mətninə yerləşdirir.
- **Cədvəl:** **çərşənbə 03:00 UTC = 07:00 Asia/Baku** (`deploy/lifecycle-emails.sh`; əvvəl
  `15 6 * * *` gündəlik). Endpoint yolu **qəsdən dəyişmədi**:
  `POST /api/internal/emails/lifecycle/drain` — istənilən gün çağırıla bilər, ISO-həftə dedupu
  təkrarın qarşısını alır.

**Qayda (weekly.py başlığından):** *əlavə email şablonu yazmazdan əvvəl soruş — bu, həftəlik digestin
variantı deyilmi?*

**DoD / qalıq:**
- ✅ Kod canlı; `send_template` iki müstəqil daşqın qapısı ilə: dedup açarı + `TRANSACTIONAL_CAP_HOURS
  = 24` yuvarlanan limit (bir günorta beş sahə çəkən fermer beş "sahəniz hazırdır" emaili almasın).
- ⚠️ **YOXLANMAYIB:** 95.216.208.82-də root crontab sətrinin `15 6 * * *` → `0 3 * * 3` dəyişdiyi bu
  repodan görünmür — skript yalnız sətri şərhdə sənədləşdirir, crontab-ı dəyişə bilmir. Dəyişməyibsə,
  drain gündəlik işləyir (ISO-həftə dedupu dublikatı saxlayır, amma digest çərşənbə yox, köhnə
  cədvəldə düşür).
- ⚠️ **Tərcümə borcu:** `catalog_i18n.WEEKLY_EXTRA` yalnız `ru` daşıyır, `weekly.py::_LABELS` isə
  yalnız az/en/ru üçün yazılıb — `_payload` locale → en → az yeridiyi üçün **tr/de/hu/it/pl
  istifadəçiləri digesti ingiliscə alır.** Fallback kodda qəsdlidir; tərcümənin qəsdən təxirə
  salınıb-salınmadığı isə heç bir commitdə yazılmayıb.
- ℹ️ Digest fermerin məsləhət mətnini **dil yoxlamadan** sitat gətirir (`weekly._advice()` `lang`
  şərti qoymur), yəni köhnə (azərbaycanca) sətir rus və ya ingilis digestin içində azərbaycanca
  görünə bilər. `lang_mismatch` düzəlişi (§K, P0.3) sahə səhifəsini əhatə edir, emaili yox.
- ℹ️ Digestdəki peyk şəkli **public** TiTiler URL-i ilə yüklənir (`/cog/preview.png`), çünki Gmail
  şəkilləri proxy edir; ifşa səviyyəsi `routers/shares.py` public linki ilə eynidir. Şəkil bloklanarsa
  digest sınmır — rəqəmlər mətn kimi təkrarlanır.
