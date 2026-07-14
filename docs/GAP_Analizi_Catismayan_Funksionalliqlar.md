# GAP Analizi — Bağban AI-da olmayan funksionallıqlar (iyul 2026)

> Mənbə: `docs/Bazar_Arasdirmasi_Platformalar_2026.md` (rəqib araşdırması) və layihənin cari vəziyyəti (v1.0.7). Hər funksiya üçün: kimdə var, niyə vacibdir, bizim stack-də icra qeydi, roadmap statusu.
> **Bizdə OLANLAR bura daxil deyil:** 9 peyk indeksi, TiTiler raster overlay, timeline + bulud filtri, müqayisə/swipe, benchmark, ölçmə, geocode, GeoJSON/KML import/export, skautinq/tapşırıq/əməliyyat/məhsuldarlıq jurnalı, subsidiya kalkulyatoru, AI məsləhət + chatbot (qurulub, açar gözləyir), asinxron emal UX, i18n az.

---

## P0 — Aktivasiya və retensiya üçün kritik (rəqib araşdırmasında sübut olunmuş)

### 1. Hava proqnozu + aqro-modellər (GDD, frost, çiləmə pəncərəsi, quraqlıq)
- **Kimdə var:** hamıda — EOSDA, OneSoil, xFarm (Agroweather PRO €30/il), Agrio (GDD, pest modelləri), Tarla.io (radar hava). Table stakes.
- **Niyə vacib:** sübut olunmuş willingness-to-pay olan yeganə VAS kateqoriyası (Esoko: 68% user ~$1.30/ay ödəməyə hazır; Ignitia: ~$476 gəlir artımı). Frost xəbərdarlığı fındıq üçün birbaşa pul dəyərindədir.
- **Bizdə:** `weather_cache` cədvəli DB-də var, frontend/backend istifadəsi yoxdur. Spec §-də Open-Meteo (pulsuz, açarsız) nəzərdə tutulub.
- **Status:** Faza 2-də planlıdır. **Tövsiyə: Faza 2-nin ilk sprintinə çək.**

### 2. Hadisə-əsaslı push bildirişlər + Telegram/WhatsApp kanalı
- **Kimdə var:** OneSoil (AI Agronomist gündəlik alert), Agrio (preventiv alert), xFarm Agent (WhatsApp), Tarla.io (WhatsApp agent), Farmer.Chat (WhatsApp/Telegram).
- **Niyə vacib:** PxD tədqiqatı — hadisəyə bağlı 2-yönlü mesajlaşma engagement-i 2x edir; fermer app-a qayıtmır, mesaj fermerin yaşadığı kanala gəlməlidir. Retensiyanın №1 lingi.
- **Bizdə:** yalnız in-app bildiriş + best-effort SMTP email. Telegram/WhatsApp/SMS yoxdur.
- **Status:** Faza 2 "çox-kanallı bildirişlər". **Tövsiyə: Telegram bot ilə başla (pulsuz API, Azərbaycanda geniş istifadə), WhatsApp Business API sonra.** n8n boxu orkestrasiya üçün hazırdır.

### 3. Avtomatik sahə sərhədi aşkarlama
- **Kimdə var:** OneSoil (0.96 IoU, pulsuz onboarding hook-u — 140k userin əsas cəlb mexanizmi), DigiFarm (~94%), EOSDA (ayrıca məhsul).
- **Niyə vacib:** əl ilə çəkmə ən böyük aktivasiya sürtünməsidir; ilk sessiyada dəyəri gecikdirir.
- **Bizdə:** yalnız native klik-lə-çək + GeoJSON/KML import (1.0.7).
- **Status:** roadmapda yoxdur. **Tövsiyə:** tam AI-detect əvəzinə aralıq addım — klik-lə "sahəni tap" (Segment Anything/SAM əsaslı segmentasiya HLS/Esri təsviri üzərində) və ya EKTIS kadastr layından import.

### 4. İlk dəyərə qədər vaxtın qısaldılması (time-to-first-NDVI)
- **Kimdə var:** OneSoil — qeydiyyatsız belə dərhal NDVI göstərir.
- **Niyə vacib:** app churn benchmark: aktivasiya hadisəsinə çatmayan userlərin >90%-i 30 gündə itir.
- **Bizdə:** queue worker ən-yeni-səhnə-əvvəl işləyir (yaxşı), amma tam 60 günlük tarixçə emal olunana qədər banner göstərilir.
- **Status:** qismən var. **Tövsiyə:** ilk səhnə hazır olan kimi xəritədə göstər ("tarixçə arxada yüklənir" rejimi), hədəf <5 dəqiqə.

---

## P1 — Rəqabət pariteti üçün lazım

### 5. Foto ilə xəstəlik/zərərverici diaqnozu
- **Kimdə var:** Plantix (10M+ yükləmə — smallholder bazarının ən güclü acquisition hook-u), Agrio, xarvio Scouting.
- **Bizdə:** skautinq qeydləri var, foto analizi yoxdur.
- **İcra qeydi:** mövcud LLM adapterinə vision əlavəsi — skautinq fotosu → Claude vision → diaqnoz + tövsiyə. Ayrıca ML modeli tələb etmir; mövcud memarlıqla ucuz genişlənmədir.
- **Status:** roadmapda yoxdur. **Tövsiyə: AI aktivləşəndən sonra ilk əlavə olsun.**

### 6. PDF/DOCX hesabatlar
- **Kimdə var:** EOSDA, Cropwise, АгроСигнал — aqronom/kooperativ seqmentinin baza tələbi; subsidiya sənədləşməsi üçün də lazımdır.
- **Bizdə:** `reports` cədvəli var, generasiya yoxdur.
- **Status:** Faza 2 + Infrastruktur §6-da qeyd olunub.

### 7. Fenologiya / böyümə mərhələsi izləmə + anomaliya aşkarlama
- **Kimdə var:** Azercosmos FarmerApp (elan edilmiş əsas funksiya), ExactFarming (vegetasiya fazası proqnozu), EOSDA.
- **Bizdə:** xam indeks trendləri var, mərhələ şərhi yoxdur (AI məsləhət qismən kompensasiya edir).
- **Status:** Faza 2 ("baza/anomaliya/fenologiya").

### 8. VRA / zonlama xəritələri (prescription maps)
- **Kimdə var:** OneSoil (pulsuz/Pro), xFarm (€100/il), EOSDA, Cropwise — precision tier-lərin bazası.
- **Niyə vacib:** ödənişli tier-ə keçidin klassik səbəbi; amma Azərbaycan smallholder seqmentində VRA texnikası azdır — təcili deyil.
- **Bizdə:** yoxdur (index_stats-dan zonlar hesablana bilər).
- **Status:** roadmapda yoxdur. Faza 3 namizədi.

### 9. Məhsuldarlıq proqnozu (ML yield prediction)
- **Kimdə var:** FieldView (Plus tier), EOSDA, xarvio — həmişə premium.
- **Bizdə:** yield qeydiyyatı var, proqnoz yoxdur.
- **Status:** roadmapda yoxdur. Data yığıldıqca (1-2 mövsüm) mümkün olur; indi yox.

### 10. Monetizasiya mexanizmi (billing/PSP + pulsuz tier limitləri)
- **Kimdə var:** hamıda freemium cap (EOS ~300 ha, Tarla.io 10 ha, OneSoil feature-cap).
- **Bizdə:** `org_subscriptions` + `org_is_paid()` gating hazır, PSP inteqrasiyası və konkret tier tərifi yoxdur.
- **Status:** Faza 2 (bilinçli təxirə salınıb). **Tövsiyə:** tier tərifini (pulsuz: X ha / Y sahə) indi qərarlaşdır — regional norma $0.2–2/ha/il; əsas satış B2B2C (kooperativ/dövlət/diler).

---

## P2 — Differensiator / ekosistem (sonrakı fazalar)

### 11. Mobil app / PWA + offline rejim
- **Kimdə var:** OneSoil, Plantix, Orbit — smallholder seqmentində mobil əsas cihazdır; GSMA: aşağı bant genişliyi offline tələb edir.
- **Bizdə:** responsive web; PWA manifest/service worker yoxdur.
- **Status:** Faza 3+ ("offline PWA"). **Tövsiyə:** native app-dan əvvəl PWA (installable + offline keş) — mövcud Next.js üzərində aşağı xərclidir.

### 12. Torpaq xəritələri / torpaq analizi inteqrasiyası
- **Kimdə var:** Cropwise (SSURGO), CropX (sensor), FarmerApp ("soil health" elanı).
- **Bizdə:** yoxdur. Azərbaycan üçün açıq torpaq data mənbəyi məhduddur (SoilGrids 250m mümkün başlanğıc).

### 13. Suvarma planlaması (ET əsaslı)
- **Kimdə var:** CropX (əsas məhsul), xFarm. Bizdə NDMI/NDWI var, suvarma tövsiyəsi modeli yoxdur. Status: Faza 3 ("ET irrigation").

### 14. Maşın telemetriyası / IoT sensor inteqrasiyası
- **Kimdə var:** xFarm, FieldView (Drive), Doktar (Filiz), CropX. Hardware-yönlü, kapital tələb edir. Azərbaycan seqmenti üçün aşağı prioritet.

### 15. Bazar/input əlaqələndirmə + icma (community)
- **Kimdə var:** DeHaat (ekosistem modeli), WeFarm (1.8M user P2P), EKTIS (marketplace).
- **Niyə vacib:** tədqiqat — bundle olunmuş ekosistem standalone monitorinqdən yaxşı saxlayır. Bizim subsidiya kalkulyatoru + EKTIS mövcudluğu təbii körpüdür.
- **Status:** roadmapda yoxdur; EKTIS inteqrasiyası Faza 3/4-də qeyd olunub.

### 16. Yüksək rezolyusiya (3m Planet) upsell + SAR bulud-doldurma
- **Kimdə var:** FarmQA/Agrio (Planet add-on), Planet Crop Biomass (Sentinel-1 fusion).
- **Bizdə:** HLS 30m pulsuz. 30m kiçik sahələrdə (bizim demo 1.36 ha!) piksel sayı azdır — orta müddətdə Sentinel-2 10m əlavəsi daha realistik addımdır, Planet isə premium tier üçün.

### 17. Açıq API / tərəfdaş inteqrasiyaları
- **Kimdə var:** EOSDA, Farmonaut (API-first), Cropwise (partner platforma). Status: Faza 4 ("public API").

---

## Xülasə cədvəli

| # | Funksiya | Rəqiblərdə | Prioritet | Roadmap statusu |
|---|---|---|---|---|
| 1 | Hava + aqro-modellər (GDD/frost/spray) | Table stakes | **P0** | Faza 2 → önə çək |
| 2 | Push + Telegram/WhatsApp | Standart | **P0** | Faza 2 → Telegram ilə başla |
| 3 | Avto sahə sərhədi | Premium→baza | **P0** | Yoxdur → əlavə et |
| 4 | Time-to-first-NDVI <5 dəq | OneSoil standartı | **P0** | Qismən → tamamla |
| 5 | Foto xəstəlik diaqnozu | Commoditized | P1 | Yoxdur → Claude vision |
| 6 | PDF/DOCX hesabat | Baza (B2B) | P1 | Faza 2 |
| 7 | Fenologiya/anomaliya | Standart | P1 | Faza 2 |
| 8 | VRA xəritələri | Precision baza | P1 | Yoxdur → Faza 3 |
| 9 | Yield proqnozu | Premium | P1 | Yoxdur → data yığıldıqca |
| 10 | Billing + tier tərifi | Hamıda | P1 | Faza 2 → tier-i indi təyin et |
| 11 | PWA/offline | Smallholder tələbi | P2 | Faza 3 |
| 12 | Torpaq xəritələri | Qismən | P2 | Yoxdur |
| 13 | Suvarma (ET) | Niş | P2 | Faza 3 |
| 14 | IoT/telemetriya | Hardware oyunçular | P2 | Yoxdur (aşağı) |
| 15 | Bazar/icma ekosistemi | Retensiya lingi | P2 | Faza 3/4 (EKTIS) |
| 16 | 10m/3m rezolyusiya + SAR | Premium upsell | P2 | Yoxdur |
| 17 | Açıq API | B2B | P2 | Faza 4 |

**Qeyd:** AI aqronom məsləhəti bu siyahıda deyil, çünki qurulub — amma açar aktivləşdirilməyənə qədər user üçün "olmayan" funksiyadır. Bütün P0-lardan öncə gələn addım budur.
