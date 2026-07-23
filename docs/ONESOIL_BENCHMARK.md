# OneSoil Benchmark — dizayn + funksionallıq araşdırması (2026-07-23)

> Mənbələr: onesoil.ai/en + /en/platform + 4 solution səhifəsi + pricing/help-center + app.yield.onesoil.ai **canlı istifadəçi sessiyası ilə gəzinti** (13 ekran screenshot) + 9-agent araşdırma workflow-u (`wf_87aeca11`). Məqsəd: Bağban AI (agradex.com) dizayn/funksionallıq təkmilləşdirmə planına giriş.

---

## 1. Ən vacib strateji tapıntılar (Bağban üçün)

1. **OneSoil Azərbaycanı dəstəkləmir — 3 səviyyədə:**
   - **Dil yox:** app 20 dildədir (tr/ru var, **az YOX**; yeni dil yalnız "on request").
   - **Sərhəd pre-detection AZ-də İŞLƏMİR:** canlı test — Ukraynada (49.2,31.5) hər sahənin ağ avtokonturu var; **Xudatda (41.61,48.64) z16-da heç bir kontur yoxdur**. Onların flaqman "zoom in, click your field" onboarding-i AZ-də ölüdür. Bağban-ın on-demand tap-to-detect-i (geoapi/SAM) **real yerli moat-dur**.
   - **Məhsul uyğunluğu:** OneSoil öz FAQ-ında etiraf edir — "less suited for **berries, fruit, and nuts**". Fındıq/bağ = Bağban-ın kalibrləndiyi seqment.
2. **Pul modeli 3 qatlıdır:** (a) fermer app freemium; (b) **B2B2F partner kanalı** (aqro-konsaltinq, gübrə satıcıları, soil-sampling servisləri — white-label, "+60% müştəri, 1.5–4× artım" pitch-i) — əsl growth mühərriki budur; (c) Global Analytics (sərhəd+krop-ID datası BASF/Cargill-ə). AZ-də analoq kanal: **kooperativlər + gübrə satıcıları + müstəqil aqronomlar**.
3. **Freemium xətti "vaxt dərinliyi" üzrədir:** FREE = "indi nə var" (son buludsuz şəkil, cari hava/1s yağış); PAID = "tarixçə + plan" (mövsüm tarixçəsi, 4s yağış proqnozu, spray window, boundary export). Qiymət hektara görə (Small/Medium/Large paket, workspace-wide — per-seat YOX), app özü sahə cəmindən paketi təklif edir.
4. **Şirkət sağlamlığı:** cəmi $6.7M funding, son raund 2021 (5+ il yeni kapital yox), İsveçrə HQ, professional CEO (ex-CNH/AGCO). Kiçik komanda — AZ bazarına lokal girişi gözlənilmir.
5. **Yield prediction zəifdir** (Capterra tənqidi: "prediction models missing") — Bağban-ın GDD + FAO-56 + pest-risk + T16 season-features paketi "Proqnoz" kimi qablaşdırıla bilər — OneSoil-da olmayan şey.

## 2. App dizaynı — canlı turdan müşahidələr (app.yield.onesoil.ai)

**Layout:** sol nazik **icon rail** (Seasons/Fields/Crop rotation/Notes/Upload/Field Data/Sensors + altda Support/Mobile/News/Profile) → **2 panel** (qruplar/siyahı + kontekst paneli) → qalan hər şey **tam-ekran Mapbox xəritəsi**. "Map IS the app": bütün bölmələr xəritə üzərində overlay paneldir, ayrıca "səhifə" yoxdur.

**Add fields axını (killer UX):** `Add fields ▾` → Select on map / Draw fields / Upload file / Import from John Deere. Select rejimində üst yaşıl banner "Zoom in to select fields", pre-detected konturlar; **bir klik** → sahə sarı dolur → panelə kart düşür: thumbnail + "Field 1 ≈16.8 ha" + ad inputu + Crop… dropdown + Variety inputu + sil. Cancel/Save. Sıfır rəsm bacarığı tələb olunmur.

**Digər müşahidələr:**
- **Empty state hər yerdə eyni formul:** icon + 1 cümlə izah ("Mark the fields as yours…") + tam-en yaşıl CTA + panelin dibində "Have a question? **Request a free call**" support kartı (satış-yardım CTA-sı məhsulun içindədir).
- **Sync şəffaflığı:** sağ-altda toast: "Additional data ✓ / Fields ✓ / Field history ✓ Done" + progress bar.
- **Crop rotation** ayrıca bölmə: season × sahə cədvəli (Name/Area/Crop), "0 ha out of 0 ha" progress, **"Allocate crops automatically"** (peyk krop-ID-dən) və "+ New season".
- **Upload data** modalı 3 tip: As-applied/Yield maps · Soil analysis results · Electrical conductivity. **Sensors**: OneSoil öz sensoru + METOS FieldClimate connect.
- **Settings:** kart-grid (E-mail/Parol/Dil/Vahid/Download data/Delete account) + Workspace/Team/John Deere/METOS. "Download data — field data and boundaries" (data-ownership siqnalı).
- **Xəritə kontrolları:** ölçü xətkeşi, **3D toggle**, +/-, geolocate; üst-solda "Crop / Field name" layer çipi; URL-də `?ll=&z=` (dərin-link).
- Field detail tabları (platform screenshot-dan): **Status / Field productivity / Prescription maps / Data / Analysis** — tablar data tipi ilə yox, **nəticə/deliverable adı ilə**.
- **NDVI tarix çipləri:** `Aug 26 · 0.71 · -0.04` — hər səhnə çipi dəyər + dəyişiklik delta göstərir; seçili çip tünd.
- **"Contrasted" görünüş:** per-field min/max rescale (mobil 4 adlandırılmış rejim: Basic/Contrasted/Average/Heterogeneous) — vahid yaşıl görünən bağlarda zəif zonaları üzə çıxarır.
- Qeydlər: rəng + kateqoriya (Disease/Pests/Weeds/Lodging/Waterlogging/Other), koordinat kopyala/naviqasiya.

## 3. Marketing sayt dizaynı (onesoil.ai)

- **Palitra:** kağız-krem fon (#f6f4ef/#ede8e2), near-black #151515 mətn, torpaq-qəhvəyi ikincil #6d6351, tək accent ailəsi — mint #69dd9a→dərin yaşıl. **Geologica** variable font (Latin+Kiril). Real product screenshot-lar dominant, illüstrasiya yoxdur; motion yalnız CSS marquee/hover.
- **Hero = auditoriya triajı:** "Economic efficiency for agrifood, made easy!" + 3 foto-qapı kartı: *For those who grow* / *For those who help to grow* / *Global Analytics*. Nav-da Solutions da eyni bölgü ilə (Farmers | Soil Sampling/Agro Consulting/Machinery Dealers/Input Suppliers).
- **Sübut yığını:** 140K fermer · 180 ölkə · 3x–28x ROI · "OVER 90% CORRELATION TO YIELD MAP" · $11/ha · 300,000 ha trial; bayraq marquee; **testimonial formulu: foto + ad + təsərrüfat + ölkə + hektar** ("Duna Horizont, Hungary · 1500 ha").
- **Friction-removal ayrıca seksiyadır:** "**No data is needed from your side** to start getting value" tam-en blok + 4-addım onboarding kart reli (Add fields → Unlock insights → Take action → Upload operations).
- **Copy qaydası:** hər feature ≤125 simvol, fel ilə başlayır, nəticə satır ("Find stress before it spreads") — texnologiya adı çəkilmir.
- **FAQ akkordeonu hər səhifədə** — etirazlar sırası ilə (qiymət → hansı krop → data lazımdır? → AI məni əvəz edəcək? "No, you remain in control"). Dürüst zəiflik etirafı (nuts/berries) etibar yaradır.
- **Konversiya:** hər seksiyada cüt CTA — self-serve "Try Free" + sales-assist "Schedule a demo"; tək kontakt səhifəsi `?form=schedule_demo|become_partner|data_request` (seqment-analitika).
- Qiymət cədvəli YOXDUR (narrative + App Store lokal qiymətləri) — bizdə əksinə şəffaf AZN qalmalıdır (satış komandamız yoxdur).

## 4. UX-reputasiya dərsləri

- Zero-training prinsipi (70 yaşlı fermer anekdotu), value-before-signup (7 il pulsuz NDVI growth mühərriki), **son BULUDSUZ şəkil free-də həmişə qalır** (app heç vaxt boş görünmür).
- Dizayner co-founder; **27-krop kontrast-sıralı rəng sistemi** (zoom-a görə tüninq) mühəndislik işi kimi sənədlənib.
- Viral moment: "random beautiful fields" düyməsi + hover **field score** — analitikanı paylaşıla bilən etdi.
- Feedback loop UI-da: krop-ID "səhvdir" düyməsi; store review-lara üzrxahlıqla public cavab; public changelog (updates.onesoil.ai).
- №1 tənqid: **sahədə yavaşlıq** ("extraordinarily slow while spraying") — bizim üçün spec: 3G-də <3s cold-start, son raster offline keşdə.

## 5. Bağban AI üçün prioritetləşdirilmiş backlog (O-seriyası)

### Quick win-lər (S — günlər)
| # | İş | Mənbə dərs |
|---|---|---|
| O1 | **Kontrast rejimi**: TiTiler `rescale=<scene_min>,<scene_max>` toggle (index_stats-da min/max var) | "Contrasted" — fındıqda ən qiymətli görünüş |
| O2 | Səhnə timeline çiplərinə **dəyər + delta** ("12 iyl · 0.71 · −0.04") | tarix çipləri |
| O3 | **Sahə balı** 0–100 çipi (kart + desktop xəritə hover) | field score viral pattern |
| O4 | **Yağış nowcast** (Open-Meteo `minutely_15`, növbəti 1–2 saat) TodayHome kartında — həmişə pulsuz | hava = gündəlik açılış səbəbi |
| O5 | **Landing yenidənqurma**: fındıq/bağ positioning ("OneSoil öz FAQ-ında nuts-u dəstəkləmədiyini yazır"), "Telefonla toxun — sərhədi biz çəkirik (AZ-də bunu edən tək platforma)", 4-addım onboarding kartları, big-number sübut bloku, FAQ akkordeonu, cüt CTA + `?form=` seqmentli kontakt | bölmə 3 bütöv |
| O6 | **Freemium xəttini time-depth-ə köçür**: free = son buludsuz səhnə + cari hava + cari məsləhət; pro = tarixçə/benchmark/export/spray-window | ən izah-asan paywall |
| O7 | "Sərhəd düz deyil?" **feedback düyməsi** (tap-to-detect nəticəsində) + public **/yenilikler** changelog | feedback loop + shipping görünürlüyü |
| O8 | Empty-state formulu (icon+izah+CTA) + **"Zəng istəyin"** support kartı + sync toast | app turu |
| O9 | Qeyd kateqoriya paritetı (+yatma/subasma), koordinat kopyala/naviqasiya | scouting parity |
| O10 | Qiymət səhifəsinə **hektar-əsaslı paket təklifi** (org sahə cəmindən auto-suggest; "bütün komanda daxildir") + ROI ön-çərçivə xətti | pricing dərsi |

### Orta (M — həftələr)
| # | İş | Qeyd |
|---|---|---|
| O11 | **Mövsüm müqayisəsi**: bu il vs keçən il(lər) NDVI əyrisi overlay + "bu il keçən ildən X% geridədir" cümləsi | T16 field_season_features hazır |
| O12 | **Anon landing-də real NDVI**: tap-to-detect-dən sonra signup-dan ƏVVƏL rəngli raster + 1 cümlə verdict | ən güclü konversiya addımı |
| O13 | **Share link** (view-only tokenli sahə URL-i) + WhatsApp/Telegram "sahə kartı" şəkil generatoru | viral kanal = fermer qrupları |
| O14 | **Aqronom work-mode**: müştəri-qruplu multi-field dashboard (ən pis NDVI birinci) + `/aqronomlar` landing ("Təcrübəni miqyasla. Tövsiyəni sübut et.") | B2B2F kanalın birinci addımı |
| O15 | **Crop rotation cədvəli** + season entity + yeni sahədə **retrospektiv backfill** (HLS 2015+ → keçmiş mövsüm xülasələri) | ilk sessiya "dolu" görünür |
| O16 | **Desktop panel layout**: icon rail + 2 panel + tam-ekran xəritə (panel.agradex.com dizayn əsası); field tabları deliverable adları ilə | app turu İA-sı |
| O17 | **Post-harvest "sübut hesabatı"**: season features + yields + operations → paylaşılan PDF/link | retention/konsultant silahı |
| O18 | Performance büdcəsi: 3G cold-start <3s, son raster offline keş | OneSoil-un №1 şikayəti |

### Böyük mərclər (L — ay+)
| # | İş | Qeyd |
|---|---|---|
| O19 | **Məhsuldarlıq zonaları v1**: multi-season NDVI percentile → 3–5 sabit zona TiTiler layer + zona statsları + homogenlik traffic-light | OneSoil-un bütün pullu məhsulunun təməli; T16 substrat hazır |
| O20 | **VRA-lite gübrə xəritəsi**: zona-başına doza cədvəli (əl ilə tətbiq üçün) + "tətbiqdən əvvəl gözlənilən qənaət AZN" | maşınsız fermer üçün belə işləyir |
| O21 | **Zona-əsaslı torpaq nümunə planı** (sampling points + gediş sırası) → T24 lab-OCR ilə dövrə qapanır | servis-məhsul (koop/aqronom satar) |
| O22 | **Partner proqramı**: dealer/koop tier, logo-on-reports (white-label lite), AZ enablement kit | OneSoil-un growth mühərriki |
| O23 | **Trials-lite**: sahəni A/B böl, əməliyyatı yarıya bağla, mövsüm sonu index+yield müqayisəsi | skeptik-konvertoru |

## 6. Bilərəkdən KOPYALANMAYACAQ
- Gizli qiymət (bizdə şəffaf AZN qalır — satış komandası yoxdur, AZ fermerində "contact us" inamsızlıq yaradır).
- Mapbox/vendor kilidli stack (MapLibre qalır), John Deere/METOS inteqrasiyaları (AZ parkında yoxdur — gələcəkdə).
- Per-seat heç vaxt; workspace/hektar modeli onsuz da bizdədir (hectare_cap).
