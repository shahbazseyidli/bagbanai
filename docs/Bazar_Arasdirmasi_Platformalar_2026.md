# Bazar Araşdırması — Peyk əsaslı əkin monitorinqi platformaları (iyul 2026)

> Bağban AI (agradex.com) üçün rəqib/analoq analizi: hansı platformalar var, hansı funksionallıqları var, user cəlbi üçün nə mütləqdir. Bütün iddialar mənbə ilə sitatlanıb; yoxlanmamış rəqəmlər ayrıca qeyd olunub.

## 1. Xülasə (əsas nəticələr)

1. **Azərbaycanda birbaşa özəl rəqib yoxdur.** Yeganə lokal analoq — dövlət dəstəkli Azercosmos FarmerApp — 2025-in sonunda hələ MVP mərhələsində idi (yalnız veb-səhifə, mobil app hazırlanırdı). EKTIS/eagro.az subsidiya reyestridir, monitorinq aləti deyil.
2. **Pulsuz tier artıq sənaye standartıdır** (OneSoil, FieldView Basic, xFarm Start, Tarla.io Starter). 2025–26 trendi: tam-pulsuz applar (OneSoil) freemium-a keçir.
3. **Table stakes (mütləq baza):** Sentinel-2/HLS indeksləri (NDVI + 4-8 əlavə indeks), bulud maskası, hava proqnozu + frost/GDD, sahə çəkmə, mobil əlçatanlıq, skautinq.
4. **2024–26 differensiator yarışı: LLM aqronom çatbotu.** FBN Norm, Syngenta Cropwise AI, Bayer E.L.Y., Digital Green Farmer.Chat. Heç biri çatbotu sahə-səviyyəli peyk indeks trendlərinə Agradex qədər birbaşa bağlamır (əksəri bilik bazası üzərində Q&A-dır).
5. **Aktivasiya üçün ən güclü hook-lar:** ilk sessiyada dərhal pulsuz vizual dəyər (avtomatik sahə sərhədi + NDVI), foto ilə xəstəlik diaqnozu (Plantix 10M+ yükləmə), hava/qiymət xəbərdarlıqları.
6. **Retensiya üçün ən güclü amillər:** real hadisəyə bağlı push bildirişlər, yerli dildə məsləhət, fermerin onsuz da istifadə etdiyi kanal (WhatsApp/Telegram), ekosistem bağlaması (məsləhət + input + bazar).

---

## 2. Qlobal platformalar

| Platforma | Əsas funksiyalar | Qiymət modeli | Peyk mənbəyi |
|---|---|---|---|
| **OneSoil** (140k+ fermer, 180 ölkə) | Avtomatik sahə sərhədi aşkarlama, NDVI/nəmlik, məhsuldarlıq zonaları, VRA, skautinq, virtual hava stansiyası, "AI Agronomist" gündəlik sahə xəbərdarlıqları | May 2026-dan freemium: pulsuz = son buludsuz NDVI + hava + qeydlər; ödənişli = mövsüm tarixçəsi, çiləmə pəncərələri | Sentinel-2 |
| **EOSDA Crop Monitoring** | NDVI/NDRE/MSAVI/ReCI/NDMI, hava, skautinq tapşırıqları, zonlama/VRA, komanda idarəetməsi, API | Essential ≤1000 ha / Professional (ha-ya görə) / Enterprise; pulsuz giriş ~1 sahə ≤300 ha (yoxlanmamış) | Sentinel-2 + |
| **Climate FieldView** (Bayer) | Maşın data toplama, Field Health peyk təsvirləri, skautinq, yield analizi, səpin/gübrə skriptləri | Basic $0 (yalnız data); Plus $649/il — peyk təsvirləri tam paywall arxasında | açıqlanmır |
| **Syngenta Cropwise** | Imagery (gündəlik NDVI, 10 il arxiv, VRA), Protector (skautinq), Financials, Cropwise AI (GenAI, ABŞ/Braziliya) | Açıq qiymət yox; input satışı ilə bundle (B2B2C) | Sentinel-2 + |
| **xFarm** (600k ferma / 9M ha) | Sahə dəftəri, maşın telemetriyası, suvarma, xəstəlik DSS, davamlılıq; xFarm Agent (WhatsApp AI) | Start pulsuz (limitsiz sahə); modullar €30–350/il; Agent €99–150/il | Sentinel-2 |
| **Agrio** | AI foto xəstəlik/zərərverici diaqnozu, preventiv xəbərdarlıq, NDVI, hiperlokal hava (GDD, pest modelləri) | Fərdi pulsuz; ~$4/ay ≤200 ha (yoxlanmamış) | Sentinel + 3m opsiya |
| **CropX** | Torpaq sensorları + peyk + suvarma planlaması, xəstəlik riski | Hardware ~$600–900 + ~$275/il sensor başına | Sentinel + öz modelləri |
| **Farmonaut** | Per-ha peyk monitorinqi + məsləhət, API | ~$6.6/ha/il API; ən ucuz qlobal oyunçu | Sentinel |

Mənbələr: onesoil.ai, help.onesoil.ai (freemium), eos.com/user-guide, climate.com/en-us/pricing.html, cropwise.com/us/imagery, xfarm.ag/en/versions-and-prices, agrio.app, cropx.com, sat.farmonaut.com.

## 3. Regional platformalar (AZ / TR / MDB)

| Platforma | Status / funksiyalar | Qiymət |
|---|---|---|
| **Azercosmos FarmerApp** (AZ) | NDVI/NDWI/NDRE + torpaq temperaturu, böyümə mərhələsi, hava xəbərdarlığı; **okt 2025-də yalnız veb-səhifə, MVP app hazırlanırdı**; giriş "Get in touch" forması ilə (B2B/pilot mərhələ) | Açıqlanmayıb |
| **EKTIS / eagro.az** (AZ, dövlət) | 600k+ qeydiyyatlı fermer; subsidiya, toxum/gübrə, marketplace, GIS layı (kadastr, pambıq/fındıq sahələri). Reyestr platformasıdır, monitorinq deyil | Dövlət xidməti |
| **Doktar / Orbit** (TR) | Orbit pulsuz skautinq appı (gündəlik peyk, NDVI, xəstəlik riski), Filiz IoT sensoru, PestTrap, CropMap; "500k fermer datası" iddiası | Orbit pulsuz; korporativ quote |
| **Tarla.io** (TR, 50k+ fermer iddiası) | Landsat/Sentinel/Planet qarışığı, radar hava, xəstəlik riski, AI advisor + WhatsApp agent | Starter pulsuz (10 ha); Professional ₺19,999/il (100 ha); diler kanalı |
| **ExactFarming** (RU) | NDVI/EVI, vegetasiya fazası proqnozu, K/P gübrə xəritələri | ~$0.20/ha/ay |
| **АгроСигнал** (RU) | Enterprise aqro-ERP: NDVI, telematika, skautinq | Skautinq ~15 RUB/ha/il |
| **Egistic** (KZ) | 1M+ ha, Planet tərəfdaşlığı, telematika | Aşağı qiymətli |
| Gürcüstan | Yerli startup yoxdur; Fermer Assosiasiyası EOSDA-nı yenidən satır | — |

**Nəticə:** regional benchmark qiyməti $0.20–0.70/ha/il (MDB) və ya pulsuz-freemium (TR). Heç kim Azərbaycan dilində AI aqronom + 2026 subsidiya rejiminə inteqrasiya təklif etmir.

## 4. Funksionallıq: baza vs differensiator (2025–26)

**Table stakes (bunlarsız platforma ciddi qəbul edilmir):**
- Sentinel-2 səviyyəli pulsuz peyk təsvirləri, 5–9 vegetasiya indeksi (NDVI + NDRE/MSAVI/NDMI minimum)
- Səhnə-səviyyəli bulud maskası və timeline
- 14 günlük hava proqnozu, frost/istilik xəbərdarlığı, GDD
- Sahə çəkmə + skautinq qeydləri + mobil istifadə
- Baza VRA/zonlama (precision tier-lərdə)

**Differensiatorlar (premium/fərqləndirici):**
- 3m Planet təsvirləri (ödənişli upsell), SAR/optik fusion ilə buludsuz seriya
- AI ilə avtomatik sahə sərhədi aşkarlama (DigiFarm ~94%, OneSoil 0.96 IoU) — premium-dan bazaya keçməkdədir
- ML yield proqnozu (həmişə ödənişli tier)
- Peyk təsvirindən xəstəlik aşkarlama (hələ əsasən aspirational)
- **Sahə datasına söykənən LLM aqronom** — ən isti yarış sahəsi; Agradex-in mövcud memarlığı (hər səhnədən sonra indeks trendləri → Claude → strukturlu məsləhət) bu yarışda unikal mövqedir

## 5. User cəlbi üçün MÜTLƏQ funksionallıqlar (prioritetlə)

Adopsiya tədqiqatlarına əsaslanır (GSMA, CGIAR, PxD, Plantix/OneSoil/DeHaat case-ləri):

**P0 — Aktivasiya (ilk sessiyada dəyər, yoxsa >90% user 30 gündə itir):**
1. **Dərhal pulsuz vizual nəticə** — qeydiyyatdan dəqiqələr içində öz sahəsinin NDVI xəritəsini görmək. OneSoil bunun üstündə 140k user yığıb. *Agradex-də var, amma asinxron emal 60 günlük tarixçə yığana qədər gözlədir — ilk səhnəni daha sürətli göstərmək kritikdir.*
2. **Avtomatik/asan sahə sərhədi** — əl ilə çəkmə maneədir; auto-detect və ya kadastrdan import aktivasiya sürtünməsini kəskin azaldır.
3. **Pulsuz tier area cap ilə** (məs. 20–50 ha) — sənaye norması; tam paywall aktivasiyanı öldürür.

**P1 — Retensiya (geri qayıtma səbəbi):**
4. **Hadisəyə bağlı push/alert** — "NDVI düşdü", "frost gəlir", "yeni səhnə hazırdır". PxD: hadisə-əsaslı 2-yönlü mesajlaşma engagement-i 2x etdi. *Agradex-də in-app/email var; Telegram/WhatsApp kanalı əlavə edilməlidir — fermerin yaşadığı kanal budur.*
5. **Yerli dildə, sadə dildə məsləhət** — Farmer.Chat təcrübəsi: vernacular dil + səs mesajı power-user-ləri yaradır. *Agradex-in Azərbaycanca AI məsləhəti birbaşa bu boşluğu tutur — aktivləşdirilməlidir (LLM_API_KEY).*
6. **Hava proqnozu + aqro-modellər (GDD, çiləmə pəncərəsi, frost)** — sübut olunmuş willingness-to-pay olan yeganə VAS kateqoriyalarından biri (Esoko: userlərin 68%-i ~$1.30/ay ödəməyə hazır idi; Ignitia: ~$476 gəlir artımı). *Faza 2-də plandadır — prioriteti yüksəltmək lazım.*

**P2 — Genişlənmə/inam:**
7. **Foto ilə xəstəlik diaqnozu** — smallholder bazarında ən güclü acquisition hook (Plantix 10M+ yükləmə). Agradex üçün: skautinq fotosu → Claude vision analizi nisbətən ucuz əlavədir.
8. **Etibarlı kanallar üzərindən yayılma** — app-store deyil, kooperativ/assosiasiya/EKTIS üzərindən (Gana tədqiqatı: fermer təşkilatı üzvlüyü adopsiyanın ən güclü prediktorudur; DeHaat hub modeli). Subsidiya kalkulyatoru bu kanal üçün təbii giriş nöqtəsidir.
9. **Ekosistem bağlaması** — yalnız monitorinq yox: subsidiya + məsləhət + tapşırıq/əməliyyat jurnalı birlikdə retensiyanı artırır (Frontiers LMIC review).

**Tərketmə səbəbləri (qaçınılmalı):** ümumi/lokal olmayan məsləhət, mövsümdənkənar susqunluq, "qara qutu" alqoritm (izahsız), mürəkkəb UI, ilk gündən ödəniş tələbi. Smallholder WTP aşağı və mövsümidir — monetizasiya B2B2C (kooperativ, dövlət, input satıcısı) üzərindən qurulmalıdır.

## 6. Agradex üçün strateji nəticələr

1. **Mövqe:** Azərbaycanda ilk işlək özəl peyk monitorinqi + yeganə Azərbaycanca AI aqronom. FarmerApp MVP-yə çatmamış bazarı tutmaq pəncərəsi açıqdır.
2. **Ən yüksək ROI addım:** AI-ı aktivləşdir (açar hazırdır) — bu, əsas differensiatordur və rəqiblərin heç biri sahə-trend-əsaslı LLM məsləhəti vermir.
3. **Aktivasiya boşluğu:** ilk NDVI görüntüsünə qədər olan vaxtı qısalt (ilk səhnə → dərhal göstər, tarixçə arxada yığılsın).
4. **Retensiya boşluğu:** Telegram/WhatsApp bildiriş kanalı (Faza 2 qayda mühərriki ilə birlikdə) — tədqiqatlara görə ən güclü retensiya lingi.
5. **Qiymət oriyentiri:** pulsuz tier (kiçik sahə capı) + ödənişli ~$0.5–2/ha/il diapazonu regional norma; fərdi fermerdən çox kooperativ/dövlət/diler kanalına satış.
6. **Faza 2 prioriteti:** hava modelləri (GDD/spray/frost) sübut olunmuş WTP-yə malikdir — billing-dən əvvəl gəlsin.

---

## Mənbələr (seçilmiş)

- OneSoil: https://onesoil.ai/en · https://help.onesoil.ai/en/articles/14885036-mobile-monitoring-subscription
- EOSDA: https://eos.com/user-guide/crop-monitoring/account-and-pricing/ · https://eos.com/blog/vegetation-indices/
- Climate FieldView: https://climate.com/en-us/pricing.html
- Cropwise: https://www.cropwise.com/us/imagery · https://www.syngentagroup.com/newsroom/2024/syngenta-group-adds-cutting-edge-generative-artificial-intelligence-genai-cropwise-0
- xFarm: https://www.xfarm.ag/en/versions-and-prices
- Agrio: https://agrio.app/ · CropX: https://cropx.com/ · Farmonaut: https://sat.farmonaut.com/api_partner.html
- Azercosmos FarmerApp: https://azercosmos.az/en/products/farmer-app · https://report.az/en/amp/ict/azercosmos-farmers-to-be-able-to-track-crop-growth-stages-through-app
- EKTIS: https://www.agro.gov.az/en/ekt · https://www.fao.org/e-agriculture/news/azerbaijan-gets-digital-eagro
- Doktar: https://www.doktar.com/en/ · Tarla.io: https://www.tarla.io/en-US/pricing
- ExactFarming: https://exactfarming.com/en · АгроСигнал: https://agrosignal.com/resheniya/monitoring-poley/
- Plantix (CGIAR): https://bigdata.cgiar.org/digital-intervention/plant-disease-diagnosis-using-artificial-intelligence-a-case-study-on-plantix/
- GSMA AgriTech: https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/programme/agritech/
- PxD: https://precisiondev.org/launching-our-experiment-registry-what-weve-learned-from-10-years-of-iterative-experimentation-at-pxd/
- Farmer.Chat: https://arxiv.org/abs/2409.08916
- Adopsiya tədqiqatı (Gana): https://pmc.ncbi.nlm.nih.gov/articles/PMC10731230/
- WTP tədqiqatı: https://www.tandfonline.com/doi/full/10.1080/14735903.2025.2609433 · https://1worldconnected.org/project/africa_agriculture_esoko/
- Esri/DigiFarm boundaries: https://digifarm.io/products/field-boundaries
- App churn benchmark: https://www.businessofapps.com/data/app-churn-rates/

*Yoxlanmamış kimi qeyd olunanlar: EOS 300 ha pulsuz cap, Agrio qiymətləri, Doktar "500k fermer", Tarla.io "50k fermer" (öz iddiaları), FBN Norm-un 2026 statusu.*
