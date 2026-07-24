# HİBRİD PLAN — OneSoil × Farmbrite × Bağban AI (2026-07-23)

> İki benchmark-ın ([ONESOIL_BENCHMARK.md](ONESOIL_BENCHMARK.md) + [FARMBRITE_BENCHMARK.md](FARMBRITE_BENCHMARK.md)) sintezi: "mükəmməl versiya" icra planı. **STATUS: İSTİFADƏÇİ TƏSDİQİ GÖZLƏNİLİR — heç nə icra olunmayıb.**

## 0. Vizyon — heç birinin bağlamadığı dövrə

- **OneSoil** = peyk gözü (xəritə-first, zonalar, VRA) — amma qeyd/pul tərəfi yoxdur, AZ-də kordur (dil yox, boundary-detection yox, nuts zəif).
- **Farmbrite** = təsərrüfat dəftəri (qeydlər, P&L, inventar, hesabatlar) — amma peyk intellekti sıfır (MODIS oyuncaq, AZ-də hava belə işləmir), AI sıfır, mobil zəif.
- **Bağban AI hibridi** — hər ikisinin bağlamadığı dövrəni bağlayır:
  **peyk anomaliyası → AI məsləhət → tapşırıq → əməliyyat (xərc AZN) → məhsul (qiymət AZN) → sahə-mövsüm mənfəət kartı → növbəti mövsüm planı.**
  Gözü OneSoil-dan, dəftəri Farmbrite-dan, beyni (AI aqronom) yalnız bizdə.
- **2026-07-23 genişlənmə (bax §E):** üstəlik **çox-tərəfli platforma** — 4 rol (Fermer · Laboratoriya · Konsultant · Təchizatçı) + kataloq/directory + rol-arası & fermer-fermer mesajlaşma + kontekstual peer suggestion. Fermer sahə problemində eyni-məhsul/yaxın-zona fermerlərlə və ya xidmət provayderləri ilə platformada bağlanır. OneSoil "grow/help-to-grow" bölgüsü məhsulun içindədir. Yeni app modulları: **Gübrə** (qrafik + AI təklif), **Torpaq analizi** (upload + AI kontekst), **Foto** (AI auto-ID + analizə daxil).

## 1. BİZDƏ ÇATIŞMAYANLAR — birləşdirilmiş siyahı

### A. Peyk-intellekt qatı (OneSoil-dan)
| # | Çatışmayan | Effort |
|---|---|---|
| A1 | Kontrast görünüş (per-scene min/max rescale) — vahid yaşıl bağlarda zəif zonaları açır | S |
| A2 | Timeline çiplərində dəyər+delta ("12 iyl · 0.71 · −0.04") | S |
| A3 | Sahə balı 0–100 çipi (kart + xəritə) | S |
| A4 | Yağış nowcast (minutely_15, 1–2 saat) | S |
| A5 | Mövsüm müqayisəsi (bu il vs keçən il əyrisi + "X% geridə" cümləsi) | M |
| A6 | Məhsuldarlıq zonaları (multi-season percentile → 3-5 zona + homogenlik) | L |
| A7 | VRA-lite gübrə xəritəsi (zona dozası + gözlənilən qənaət AZN) | L |
| A8 | Retrospektiv backfill (yeni sahədə HLS 2015+ keçmiş mövsüm xülasələri) | M |
| A9 | Yığım sırası modulu (koop üçün NDVI-əsaslı "əvvəl bunu yığ") | S |
| A10 | Share link + WhatsApp "sahə kartı" şəkli | M |
| A11 | Anon landing-də signup-dan ƏVVƏL real NDVI overlay | M |

### B. Təsərrüfat dəftəri qatı (Farmbrite-dan — bizdə TAM YOXDUR)
| # | Çatışmayan | Effort |
|---|---|---|
| B1 | **Sahə-mövsüm P&L-lite**: əməliyyata xərc (AZN), məhsula qiymət → "bu sahə bu mövsüm X AZN/ha qazandı" | M |
| B2 | AZ default xərc kateqoriyaları (toxum/gübrə/dərman/yanacaq/su/işçi… — "Schedule F patterni" lokal) | S |
| B3 | **Mövsüm/Planting entity + lifecycle status** (hazırlıq→səpin→vegetasiya→yığım→herik; filtr+avtomatika sürür) | M |
| B4 | **Crop-şablon kitabxanası fermerə görünən** (crop_thresholds → passport: GDD, spacing, maturity, harvest window, gözlənilən məhsul/ha + fındıq daxil!) | M |
| B5 | **Avto tapşırıq zənciri** (planting → gübrə/dərman pəncərəsi/yığım tapşırıqları özü doğulur) | M |
| B6 | PHI/withdrawal countdown (dərman → "yığım X gündən sonra təhlükəsiz" sayğac + bloklama) | S |
| B7 | Yığım qeydi + auto Trace nömrə + alıcı/qiymət (satış-log + buyer CRM-lite) | M |
| B8 | Field Wellness Score (NDVI trend + su balansı + pest risk + GDD → 20-100 bal; A3 ilə birləşir) | M |
| B9 | **Hazır hesabatlar kitabxanası** (8-12 PDF: mövsüm hesabatı, əməliyyat jurnalı, xərc xülasəsi, subsidiya sənəd paketi) | M |
| B10 | Təqvim görünüşü + .ics abunə (tapşırıq/spray/GDD mərhələləri) | S |
| B11 | Qlobal Quick Add (kamera FAB → 5-bəndlik menyu: foto/skautinq/tapşırıq/əməliyyat/məhsul) | S |
| B12 | Inventory-lite (giriş stoku, əməliyyatda avto-çıxılma, low-stock xəbərdarlıq) | M |
| B13 | Texnika qeydi + servis xatırlatmaları (tasks engine üstündə) | S |
| B14 | Bulk əməliyyatlar (multi-select sahə → bir tapşırıq/əməliyyat hamısına) | M |
| B15 | Qeyd-dossier qrammatikası (sahə qeydində Files/Images tabı — lab PDF, kadastr, qəbz) | S |
| B16 | Xəritədə qeyri-sahə yer tipləri (bina, su xətti, anbar, təhlükə — linestring+point) | M |
| B17 | Qəbz-foto → xərc qeydi (mövcud vision pipeline ilə) | M |
| B18 | Rayon frost tarixləri (Open-Meteo arxivindən avto) → əkin pəncərəsi/GDD başlanğıcı | S |
| B19 | Fermer yağış-log ("yağış yağdı → X mm") + YoY hava qrafiki | S |

### C. Onboarding + marketinq + qiymət (hər ikisindən)
| # | Çatışmayan | Effort |
|---|---|---|
| C1 | 2-addımlı welcome wizard (təsərrüfat adı + əsas məhsul + rayon → dil/vahid/bildiriş) — cavablar hesablamanı qidalandırır | M |
| C2 | **14-günlük Pro trial default** (kartsız; bitəndə səliqəli free-yə enmə; "+N gün uzat" self-serve) | M |
| C3 | Endirim proqramları (gənc fermer −50%, kooperativ, tələbə-aqronom) — pricing kartları kimi | S |
| C4 | Pricing FAQ (10-15 sual) + "Bütün paketlərə daxildir" bloku + ayrıca müqayisə-matris səhifəsi | S |
| C5 | Landing "modul turu" (hero xəritə + hər imkan üçün seksiya: screenshot + fel-başlıq + CTA) + canlı sayğac trust-strip | M |
| C6 | Fındıq/bağ segment səhifələri ("rəqiblərin ikisi də nuts-u dəstəkləmir — biz bunun üçün qurulmuşuq") | M |
| C7 | Demo video(lar) 60-90s AZ səsli + "Demo izlə" ikinci CTA hər yerdə | M |
| C8 | Getting Started bələdçi hub (/more → 5-7 az səhifə) + email onboarding ardıcıllığı (Resend açarı düşəndə) | M |
| C9 | Empty-state pass (hər boş siyahıda: niyə vacib + CTA) + "Zəng istəyin" support kartı | S |
| C10 | Public changelog (/yenilikler) + status/təhlükəsizlik səhifələri | S |
| C11 | Freemium xəttini time-depth-ə köçür (free = son şəkil+hava+cari məsləhət; pro = tarixçə/benchmark/export) | S |
| C12 | Sərhəd/AI feedback düyməsi ("düz deyil?") | S |

### D. Bilərəkdən SONRAYA (Later/watchlist)
Storefront/POS/e-commerce · tam livestock ERP (yalnız lite-notes watchlist) · Public developer API (Farmbrite patterni — Faza 5+) · maşın teleметriyası/John Deere · OneSoil-style Global Analytics data məhsulu (toxum ONESOIL_BENCHMARK §5 O22-də).

### E. ÇOX-TƏRƏFLİ PLATFORMA MODELİ (istifadəçi tələbləri, 2026-07-23) — VİZYON DƏYİŞİKLİYİ
Tək-tərəfli fermer alətindən → **4 rollu marketplace + icma platforması**. OneSoil-un "grow / help-to-grow" bölgüsü məhsulun İÇİNƏ qoşulur.

**4 rol (qeydiyyatda seçilir):**
1. **Fermer** — sahələri, məhsulları, monitorinq, AI, dəftər.
2. **Laboratoriya** (Soil Sampling Services) — nümunə xidmətləri təklif edir.
3. **Aqro-konsultant** (Agro Consulting) — məsləhət/çox-müştəri xidməti.
4. **Təchizatçı** (Input Supplier) — toxum/gübrə/dərman/texnika satıcısı.

| # | Tələb | Feature | Backend (yüksək səviyyə) | Effort |
|---|---|---|---|---|
| E1 | Rol-əsaslı qeydiyyat sihirbazı | signup: rol seç → **ölkə (məcburi) + region/ərazi** → rol-spesifik profil | `users.role` enum + `provider_profiles` cədvəli; migration | M |
| E2 | Təchizatçı profili | **multi-select ixtisaslaşma** (toxum/gübrə/dərman/texnika/xidmət) + şirkət adı + ünvan + kataloq/məhsullar | `provider_profiles.specializations[]`, `catalog_items` | M |
| E3 | Laboratoriya & konsultant profili | xidmətlər, əhatə zonası, qiymət, kredensiallar, şirkət | `provider_profiles` (type=lab/consultant) | M |
| E4 | **Kataloq / directory** | fermer laboratoriya/konsultant/təchizatçını axtarır, filtrləyir (ölkə/region/ixtisas), profilə baxır | `GET /providers` + filtr | M |
| E5 | **Rol-arası mesajlaşma** | fermer → provider müraciət + yazışma; provider gələn sorğuları görür | `conversations`, `messages` (RLS) | M |
| E6 | **Fermer icması (farmer↔farmer)** | fermerlər bir-biri ilə məsləhətləşir | eyni chat infrastrukturu, peer tipli | M |
| E7 | **Kontekstual peer suggestion** | AI analiz bloku yanında: "eyni məhsulu əkən / yaxın zonada N fermer bununla üzləşib — məsləhətləş" | məhsul + region + geo yaxınlıq sorğusu | M |
| E8 | **Gübrə modulu** | user gübrələmə qrafiki əlavə edir + görür; **AI gübrə təklifi** (T13 kalkulyator + torpaq analizi + NDVI əsasında) | `fertilizer_plans` + mövcud fertilizer engine | M |
| E9 | **Torpaq analizi modulu** | lab analizini upload (T24 OCR var) → `soil_profiles`; **AI məsləhətdə nəzərə alır** | mövcud 0027 + AI kontekstə soil əlavəsi | S |
| E10 | **Foto modulu** | fermer sahə/məhsul/ağac şəklini çəkir → **AI auto-ID + adlandırır**; analizdə bu şəkillərin vəziyyəti nəzərə alınır | PhotoDiagnose genişlənir → `field_photos` + vision auto-label | M |
| E11 | **Solutions səhifələri (4)** | hər seqment üçün cəlbedici landing (fermer/laboratoriya/konsultant/təchizatçı) | marketinq (Next.js landing) | M |
| E12 | **Home daha canlı/vurucu** | onesoil.ai səviyyəli: video/motion hero, foto-qapılar, marquee, testimonial, real screenshot | landing redizayn | M |
| E13 | **Detallı account səhifəsi** | OneSoil settings-grid: email/parol/dil/vahid/download data/delete + workspace/komanda/rol-profil/inteqrasiya | mövcud + UI | S |
| E14 | **Qlobal qeydiyyat** | BÜTÜN rollarda ölkə məcburi + region/ərazi dəqiqləşdirmə | signup + geo | S |

**Data modeli (yeni cədvəllər — planlama):** `users.role` + `provider_profiles` (type, company, specializations[], address, country, region, coverage, services jsonb) · `catalog_items` (supplier məhsulları) · `conversations`+`messages` (marketplace + peer) · `fertilizer_plans` · `field_photos` (auto-label + condition) · (soil_profiles 0027 mövcud).

**Prinsip:** hər yeni rol/qeyd tipi (provider profili, mesaj, foto, torpaq analizi, gübrə qrafiki) **AI aqronom kontekstinə qoşulur** — bu, heç bir rəqibdə olmayan hibrid moat-dır.

## 2. İcra dalğaları (təsdiqdən sonra sıra ilə) — E-seriya ilə yenilənib

- **W0 — `app.agradex.com` keçidi (portal→app rename)**: dormant panel host-routing kodunda/docs-da `panel.agradex.com` → **`app.agradex.com`** (kod host-agnostikdir — dəyişən yalnız sənədlər/aktivasiya + CF A-record). — *30 dəq*
- **W1 — Rol modeli + qeydiyyat + account** (E1, E2, E3, E13, E14): `users.role` enum + `provider_profiles` migration + rol-əsaslı signup sihirbazı (ölkə/region məcburi + rol-spesifik profil) + detallı account səhifəsi. **Marketplace-in təməli — birinci.**
- **W2 — Landing redizayn + 4 solution səhifəsi** (E11, E12 + C5-C7): canlı home + Fermer/Laboratoriya/Konsultant/Təchizatçı səhifələri + big-number/testimonial/FAQ. Cəlbetmə qatı.
- **W3 — Peyk quick-win** (A1-A4, A9 + C11): kontrast, sahə balı, timeline delta, yağış nowcast, freemium xətti. Mövcud data üstündə.
- **W4 — App yeni modullar** (E8 Gübrə, E9 Torpaq analizi, E10 Foto): hər üçü rail-a + AI kontekstinə qoşulur.
- **W5 — Marketplace + icma** (E4 Kataloq, E5 rol-arası mesaj, E6 fermer chat, E7 peer suggestion): `conversations`/`messages` + directory + AI-blok yanı peer təklifi.
- **W6 — Hibrid dövrənin nüvəsi** (B1-B6, B10, B15, B18): mövsüm entity + P&L-lite + avto tapşırıq zənciri + PHI. Dəftər×peyk birləşməsi. — *✅ TAM (branch): B1/B2/B3/B5/B6/B10/B15/B18; B4 artıq mövcud idi (KnowledgePassport)*
- **W7 — Peyk analitika + dəftər genişlənməsi** (A5, A8, B8, B9, B7, B12-B14, B16, B17, B19): müqayisə, wellness, hesabatlar, satış-log, inventar, texnika, bulk. — *✅ (branch)*
- **W8 — Böyük mərclər** (A6, A7, A10, A11): zonalar, VRA-lite, share/viral. — *✅ (branch)*

## 2.5 İCRA STATUSU (branch `feat/hybrid-marketplace`, 2026-07-24 gecə autonom)
**Prod-a DEPLOY OLUNMAYIB** — branch-də, səhər birlikdə review + deploy. Canlı app (agradex.com) toxunulmayıb.

- **W0 ✅** app.agradex.com rename (docs/middleware/ROADMAP; PANEL_ACTIVATION.md → APP_ACTIVATION.md).
- **W1 ✅ (backend+frontend)** — migration **0031_marketplace** (user_role enum + users.role/country/region; provider_profiles, catalog_items, conversations, messages, fertilizer_plans, field_photos). auth signup rol+ölkə+region qəbul edir. **Qeydiyyat sihirbazı** (rol→hesab+ölkə/region→provider profil, supplier multi-select). **Account** səhifəsi. **Provider** profil/kataloq redaktoru.
- **W4 ✅ (backend+frontend)** — `providers.py`, `chat.py`, `fertilizer.py`, `photos.py` + `ai/photo_label.py`. Field tabları: **Gübrə** (qrafik+AI təklif), **Foto** (qalereya+AI auto-label), **Torpaq** (lab upload). Rail/nav: Kataloq, İcma.
- **W5 ✅ (backend+frontend)** — Kataloq directory, Chat/icma (conversations+messages), **peer-suggestion** (E7 — AI blokunda yaxın/eyni-məhsul fermer).
- **W6 (böyük hissə) ✅** — **B1 per-field P&L-lite**: migration **0032** (yields.revenue/price), `ledger.py` (GET /api/fields/{id}/pnl + /api/orgs/{id}/ledger), **/ledger** səhifəsi (org cəm + sahə-üzrə), YieldsTab-a gəlir sahəsi. **B5 avto tapşırıq zənciri**: `POST /api/fields/{id}/tasks/generate` (əkin tarixindən [auto] tarixli zəncir, dedupe) + TasksTab "Zəncir yarat". **B6 PHI/çiləmə-təhlükəsizliyi**: migration **0033** (field_operations.phi_days), `GET /api/fields/{id}/spray-safety` (aktiv yığım məhdudiyyəti + sayğac), OperationsTab bloklayıcı banner + PHI sahəsi, AI kontekstə `spray_restriction`. **B2 xərc-kateqoriya bölgüsü**: ledger by_category (əməliyyat tipinə görə Σ cost) + /ledger proporsional bar. **B10 təqvim (.ics)**: `GET /api/fields/{id}/tasks.ics` (all-day VEVENT, same-origin cookie auth) + TasksTab yükləmə linki. **QALIR (W6):** B3 mövsüm/planting entity, B4 crop-passport artıq `KnowledgePassport.tsx`-də var, B15 fayl-dossier, B18 frost tarixləri.
- **AI kontekst ✅** — `ai/context.py` indi torpaq analizi (soil_profiles) + AI foto etiketləri (field_photos) + gübrə planlarını (fertilizer_plans) + aktiv PHI çiləmə-məhdudiyyətini (spray_restriction) advice/chat kontekstinə qoşur (req #4, #6; defensiv — migration-suz boş).
- **Review ✅** — `feat/hybrid-marketplace` adversarial review workflow (7 agent, 0 error): yalnız 1 real bug (providers `?kind` free-text → user_role cast → 22P02/500) — **düzəldildi** (enum whitelist). B1/B5/B6/B2/B10 + AI-kontekst review-dən sonra əlavə edildi; py_compile-təmiz, yerli tsc yoxdur (node yox) → deploy build gate.
- **W6 QALIĞI ✅ (2026-07-24)** — **B3** `field_seasons` + 6-mərhələli lifecycle (server-validasiyalı, keçid auditi, partial-unique `is_current` idarəsi) + **Mövsüm** tabı · **B15/B17** `field_documents` (şəkil+PDF yükləmə, **autentifikasiyalı download marşrutu** — repo-da heç vaxt olmayıb, traversal qorumalı) + qəbz→vision→*layihə* xərc + **Sənədlər** tabı · **B18** 20-illik Open-Meteo arxiv şaxta klimatologiyası (`zone_knowledge`-də keş) + **B19** müşahidə hava + yağış jurnalı + illər-arası qrafik + **Hava** tabı. **B4 artıq mövcud idi** (`KnowledgePassport.tsx`).
- **W7 ✅ (2026-07-24)** — **B8** izahlı wellness balı (çatışmayan girişdə çəkiləri yenidən normallaşdırır, bal uydurmur) · **A5** DOY-əsaslı mövsüm müqayisəsi + "keçən ildən X% geridə" · **B7** alıcı CRM + trace-kodlu yığım lotları + satış (ledger indi `sales.revenue`-nu da sayır) · **B12** anbar + əməliyyatdan fuzzy avto-çıxılma (idempotent, best-effort) + az-ehtiyat bildirişi · **B13** texnika + dövri servis + idempotent tapşırıq · **B9** uçuşda çap-hazır HTML/CSV hesabatlar (yeni asılılıq YOX — API image-də PDF kitabxanası yoxdur) · **B16** xəritə yerləri · **B14** toplu əməliyyat.
- **W8 ✅ (2026-07-24)** — **A8** retrospektiv backfill (axtarışa açıq tarix pəncərəsi + **truncation aşkarlanması**; illik addımlarla, stats-only, bildirişsiz; `fields.data_status`-a toxunmur) · **A6/A7** çox-mövsümlü piksel-persentil məhsuldarlıq zonaları + VRA-lite (raster riyaziyyatı **geo image**-də, API yalnız nəticəni oxuyur) · **A10** tokenli public sahə kartı (yalnız token qəbul edir, payload açıq whitelist, naməlum/ləğv/vaxtı keçmiş üçün eyni 404) · **A11** anonim ziyarətçinin çəkdiyi poliqon üçün **real NDVI** (geoapi `/ndvi`, 200 ha limit, heç nə yazılmır).
- **QALIR:** yalnız yoxlama/deploy. **Deploy:** migration **0031→0041** tətbiq → `bash deploy/update.sh` → **`docker compose build geoapi && up -d geoapi`** (A11 üçün; update.sh geoapi-ni rebuild ETMİR) → 2 yeni cron (`process-backfill.sh`, `process-zones.sh`).
- **i18n (follow-up):** yeni səhifələr inline AZ mətndədir — T18 sweep 4-dilə çıxaracaq.

## 3. Qorunacaq prinsiplər (hər iki rəqibin səhvlərindən)
1. **Klik-dərinliyi əlavə etmə** — Farmbrite-ın #1 şikayəti mürəkkəblikdir; yeni modullar mövcud axınlara MƏCBURİ sahə əlavə etmir, opsional chip arxasında yaşayır.
2. **Mobil-first qalır** — Farmbrite webview-i uğursuzdur; hər yeni feature əvvəl telefonda test.
3. **Xəritə = qeyd** birliyi pozulmur (OneSoil DNA) — amma qeyd geometriyasız da yaşaya bilər (yığım/xərc girişi xəritəsiz).
4. **Şəffaf AZN qiymət** + fermerin saydığı ölçülər (sahə sayı/komanda; hektar cap sakit texniki limit).
5. **AI aqronom = uncontested moat** — hər yeni qeyd tipi (xərc, məhsul, inventar) AI kontekstinə qoşulur; rəqiblərin heç birində yoxdur.
