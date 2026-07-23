# Farmbrite Benchmark — dizayn + funksionallıq araşdırması (2026-07-23)

> Mənbələr: farmbrite.com (marketinq + pricing + modul səhifələri) + help.farmbrite.com + developers.farmbrite.com + Capterra/G2 + **app.farmbrite.com canlı istifadəçi sessiyası ilə tur** (trial hesab "findiq", Xudat AZ; 15+ ekran) + istifadəçinin onboarding screenshot-ları + 9-agent araşdırma workflow-u (`wf_d0a0d67f`). OneSoil-un tam əksi olan arxetip: **records-first ferma ERP-si**. Hibrid plan üçün 2-ci benchmark.

---

## 1. Şirkət və mövqe

- **3-4 nəfərlik bootstrap şirkət** (ər-arvad Ian & Janine Russell, 2012, Hygiene, Colorado; $0 investisiya, "yalnız müştərilərə cavabdehik"). 5,000+ ferma, Capterra **4.8/5** (support 4.9, ease-of-use 4.5), G2 4.7 — kiçik/qarışıq fermalar üçün "best all-in-one FMS".
- **Arxetip:** OneSoil = xəritə-first peyk intellekti; Farmbrite = **records-first ERP** (qeyd = mərkəz; pul/tapşırıq/inventar/satış — qeydin ətrafında). Xəritə bəzəkdir, geometriya opsionaldır.
- **10-modul taksonomiya** saytın onurğasıdır (nav = homepage = /features = footer, eyni sıra): Tasks · Accounting · Livestock · Crops · Resources/Inventory · Orders/eCommerce · Mapping · Climate · Reports · Admin/Security.

## 2. AZ-də canlı yoxlanılmış zəifliklər (bizim üstünlük)

1. **Weather History AZ-də İŞLƏMİR**: canlı test — "This feature is not currently available in your location" (yalnız ABŞ).
2. **"Peyk" = MODIS 8-günlük 250m** overlay ("Satellite Maps"), üstəlik xəritə default olaraq Kanzasa baxır — per-field stats, sərhəd, zonal analiz, S2/HLS YOXDUR. 38 aylıq release-notes-da **AI/NDVI/peyk sıfır dəfə** keçir — AI dalğasına ümumiyyətlə cavab verməyiblər.
3. **Fındıq crop kitabxanasında YOXDUR** ("hazel" axtarışı boş; OneSoil ilə eyni kor nöqtə). Az dili yoxdur (ingiliscə-only; 120+ valyuta/vahid dəstəyi var, dil yox).
4. **Mobil = webview wrapper** (help-center özü deyir: brauzerlə eyni; setup "on your desktop"); xəritə çəkmə desktop-only. Reviews: "extraordinarily slow", çox klik, bulk-əməliyyat yoxdur, stale-state buglar. **Bizim mobile-first PWA + tap-to-detect birbaşa fərqləndiricidir.**

## 3. Güclü tərəfləri — bizdə ÇATIŞMAYANLAR (hibridin əsas xammalı)

### 3.1 Records maşını (crop tərəfi)
- **Template→instance nüvə patterni:** *Crop Type* = aqronomik şablon (kitabxanadan autofill: botanika adı, cücərmə günləri, əkin arası/dərinliyi, boy, days-to-maturity, harvest window, **harvest units + estimated revenue/unit + expected yield/ha**, perennial bayrağı) → *Planting* = şablon×yer instansı — bütün təqvim frost tarixi + yerdən **avto-hesablanır**. Canlı turda təsdiqləndi (corn autofill, Metric-ə çevrilmiş).
- **"Automatically create tasks for planting & harvest dates"** — default AÇIQ: planting yaradanda tapşırıq zənciri özü doğulur.
- **Crop Plan** (tarix-aralıqlı Gantt), succession planting, **Yield Comparison**, harvest log → **auto Trace Number** → inventar lotu (FIFO) → sifariş → satış → per-record P&L. Bir "axmaq" trace nömrəsi ilə ucuz izlənilebilirlik.
- Livestock-dan portativ patternlər: **dossier qrammatikası** (hər qeyddə eyni tab dəsti: Details/Notes/Calendar/Yield/Accounting/Images/Files), **14-dəyərli lifecycle status enum** (filtr+report+avtomatikanı sürür), **"Record Activity" typed-event menyusu** (sərbəst qeyd yox, tipli hadisə → hesabatlana bilir), **countdown avtomatikaları** (dərman → withdrawal sayğacı → təqvim xəbərdarlığı), **Wellness Score** (5 ballıq rubrika → 20-100 çəkili bal, 4 rəng zolağı).

### 3.2 Biznes modulları (bizdə tam yoxdur)
- **Accounting:** Transactions / P&L / Cash Flow / Balance Sheet / Budgeting; ABŞ Schedule F xərc kateqoriyaları **öncədən yüklü** (lokallaşdırılmış default hesablar planı patterni) → day-one vergi-hazır. Killer: **per-record P&L** (sahə/heyvan/məhsul üzrə mənfəət).
- **Resources:** Equipment (servis qeydləri) / Warehouses / Inventory (lot izləmə, low-stock, receipt scanner).
- **Market:** daxili storefront + orders + POS; **0% komissiya** (yalnız Stripe) — anti-Shopify mövqe.
- **Contacts CRM**, **Reports: 100+ hazır hesabat** (marketinq rəqəmi kimi satılır!) + custom report builder + User Activities audit.
- **Developer API:** developers.farmbrite.com — tam REST (api.farmbrite.com/v1, PAT token, ~20 entity ailəsində CRUD) + webhooks. Zapier "8000+ integrations".

### 3.3 Onboarding + qiymət dərsleri
- **Nazik signup (4 sahə, kart yox) → in-app 2-addımlı wizard**: (1) Ferma haqqında — ad, tip radiosu (livestock/crops/both — **routing sualı**: hansı modula yönləndiriləcəyini seçir; bizim istifadəçi screenshot-larında Livestock nav-ı crops-only seçimə görə boz idi — **adaptiv nav!**), ölkə/ünvan; (2) Preferences — ölçü sistemi, timezone, valyuta, **average last frost** (hər sahə aşağı axında hesablamanı qidalandırır — "CRM üçün" heç nə yığılmır).
- **Sample data yox — öncədən yüklü lüğətlər** (200+ crop şablonu): ilk qeyd anında autofill sevinci, silinəcək saxta data yox.
- **Trial yuxarı tier-də başlayır** (ən yaxşı versiyanı yaşa, sonra endir), **self-serve "+14 gün uzat"** (1 dəfə), teal banner + "Activate Account" + **Getting Started Guide** həmişə görünür. **Quick Add** qlobal menyu (Note/Task/Transaction/Inventory/Climate Log/Photo + modul qrupları) hər ekranda.
- **Qiymət:** 3 xətt (Livestock/Crop/Complete) × 3 tier ($29–$109/ay); illik = 10×aylıq ("2 ay pulsuz", toggle-suz sadə mətn); ölçmə **fermerin saydığı şeylərlə** (heyvan sayı, komanda, inventar) — **"No acreage limits"** başlıq arqumentidir; ayrıca ucuz SKU (Accounting-only $119/il); **endirim proqramları brend kimi**: yeni fermer −50%/3 il, nonprofit −65%, Heroes −25%; 15-suallıq pricing FAQ; sadə kartlar + ayrıca müqayisə-matris səhifəsi.
- **Dizayn dili:** krem #F7F5F1 + kömür #303030 + yaşıl #34A853/teal #0B4040; Proxima Nova; real screenshot + ferma fotosu növbələşməsi; 22-seksiyalı "modul turu" homepage; hər seksiya: fel-başlıqlı fayda + screenshot + öz CTA-sı; iki-sürətli CTA cütü hər yerdə ("Get started" + "Watch demo").

## 4. Canlı tur inventarı (app.farmbrite.com)

- **Farm Map:** 11 rəng-kodlu yer tipi (Property Boundary/Animal Enclosure/Bed/Buffer Zone/Building/Field/Growing Enclosure/Irrigation/Hazard/Storage/Other) + 6 çəkmə aləti; place popup: Total Area (sqm+ha) + Edit/Adjust/Copy/Delete + "Manage Animals" (tip-ə görə əlaqəli qeyd əməliyyatı); Type filtri, layers, print. Google Maps static imagery, tarix seçimi yox.
- **Plantings:** My Crops / Grow Locations / Crop Plan / Location Map / Yield Comparison. Boş-hal formulu hər yerdə: icon + izah + CTA + Getting Started linki. Crop wizard 3-addım; **Cancel step-2-də step-1 qeydini özü geri aldı** ("Record Deleted") — təmiz rollback UX.
- **Schedule:** tam təqvim (Month/Week/Day/List/Year + Timesheets[gated] + All Users filtri). **Accounting/Market/Reports/Climate**: yuxarıda. **Settings:** kart-grid (email/parol/dil/vahid/**Download data**/delete) + Workspace/Team/John Deere/METOS analoqu yox — sadə.

## 5. Nə KOPYALANMAYACAQ
- Storefront/POS/e-commerce (AZ bazarında hazır deyil — "Later" siyahısına), livestock ERP dərinliyi (watchlist-lite bəsdir), Wix-səviyyə performans, 10-modulun hamısını birdən (Farmbrite-ın öz reviews-u: klik-dərinliyi/mürəkkəblik #1 şikayət — bizim click-first chips fəlsəfəmiz düzgündür), gizli qiymətsiz amma ABŞ-mərkəzli Schedule F (AZ analoqu ilə əvəz).
- **Qorunacaq öz üstünlüyümüz:** per-field peyk intellekti + AI aqronom (onlarda sıfır), mobile-first, az dili, tap-to-detect.

## 6. Status
**2026-07-23: HƏR İKİ ARAŞDIRMA TAMAM.** OneSoil ([ONESOIL_BENCHMARK.md](ONESOIL_BENCHMARK.md), O1-O23) + Farmbrite (bu sənəd). Hibrid plan: **[HYBRID_PLAN.md](HYBRID_PLAN.md)** — istifadəçi təsdiqi gözlənilir.
