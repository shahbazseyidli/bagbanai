# HİBRİD PLAN — OneSoil × Farmbrite × Bağban AI (2026-07-23)

> İki benchmark-ın ([ONESOIL_BENCHMARK.md](ONESOIL_BENCHMARK.md) + [FARMBRITE_BENCHMARK.md](FARMBRITE_BENCHMARK.md)) sintezi: "mükəmməl versiya" icra planı. **STATUS: İSTİFADƏÇİ TƏSDİQİ GÖZLƏNİLİR — heç nə icra olunmayıb.**

## 0. Vizyon — heç birinin bağlamadığı dövrə

- **OneSoil** = peyk gözü (xəritə-first, zonalar, VRA) — amma qeyd/pul tərəfi yoxdur, AZ-də kordur (dil yox, boundary-detection yox, nuts zəif).
- **Farmbrite** = təsərrüfat dəftəri (qeydlər, P&L, inventar, hesabatlar) — amma peyk intellekti sıfır (MODIS oyuncaq, AZ-də hava belə işləmir), AI sıfır, mobil zəif.
- **Bağban AI hibridi** — hər ikisinin bağlamadığı dövrəni bağlayır:
  **peyk anomaliyası → AI məsləhət → tapşırıq → əməliyyat (xərc AZN) → məhsul (qiymət AZN) → sahə-mövsüm mənfəət kartı → növbəti mövsüm planı.**
  Gözü OneSoil-dan, dəftəri Farmbrite-dan, beyni (AI aqronom) yalnız bizdə.

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

## 2. İcra dalğaları (təsdiqdən sonra sıra ilə)

- **W0 — `app.agradex.com` keçidi (portal→app rename)**: dormant panel host-routing kodunda/docs-da `panel.agradex.com` → **`app.agradex.com`** (NEXT_PUBLIC_PANEL_HOST env dəyəri onsuz da user tərəfindən veriləcək; kod host-agnostikdir — dəyişən yalnız sənədlər/aktivasiya təlimatı + CF A-record adı). — *istifadəçi qərarı, 30 dəq*
- **W1 — Peyk quick-win paketi** (A1-A4, A9 + C11, C12): mövcud data üstündə, günlər.
- **W2 — Hibrid dövrənin nüvəsi** (B1-B6, B10, B11, B15, B18): mövsüm entity + P&L-lite + avto tapşırıqlar + PHI + Quick Add. Ən böyük differensiasiya.
- **W3 — Peyk analitika dərinliyi** (A5, A8, B8/A3 birləşik, B9): müqayisə + backfill + wellness + hesabatlar.
- **W4 — Onboarding/marketinq/qiymət** (C1-C10, C5-C7 landing): konversiya + trust.
- **W5 — Dəftər genişlənməsi** (B7, B12-B14, B16, B17, B19): satış-log, inventar, texnika, bulk.
- **W6 — Böyük mərclər** (A6, A7, A10, A11 + partner proqramı O22/O17-dən): zonalar, VRA-lite, share/viral, koop kanalı.

## 3. Qorunacaq prinsiplər (hər iki rəqibin səhvlərindən)
1. **Klik-dərinliyi əlavə etmə** — Farmbrite-ın #1 şikayəti mürəkkəblikdir; yeni modullar mövcud axınlara MƏCBURİ sahə əlavə etmir, opsional chip arxasında yaşayır.
2. **Mobil-first qalır** — Farmbrite webview-i uğursuzdur; hər yeni feature əvvəl telefonda test.
3. **Xəritə = qeyd** birliyi pozulmur (OneSoil DNA) — amma qeyd geometriyasız da yaşaya bilər (yığım/xərc girişi xəritəsiz).
4. **Şəffaf AZN qiymət** + fermerin saydığı ölçülər (sahə sayı/komanda; hektar cap sakit texniki limit).
5. **AI aqronom = uncontested moat** — hər yeni qeyd tipi (xərc, məhsul, inventar) AI kontekstinə qoşulur; rəqiblərin heç birində yoxdur.
