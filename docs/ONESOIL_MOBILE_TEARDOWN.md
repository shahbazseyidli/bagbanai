# OneSoil **mobil app** teardown — ölçülmüş (2026-07-26)

> **Metod:** istifadəçinin şəxsi Pixel 9 Pro-su USB ilə qoşuldu, `adb` (platform-tools 37.0.0) ilə canlı idarə edildi.
> Hər ekran üçün **screenshot + `uiautomator` iyerarxiya dump-ı** götürüldü → ölçülər gözlə deyil, **piksellə** çıxarılıb.
> **15 ekran.** Cihaz: Pixel 9 Pro · Android 17 · 1280×2856 px @ density 480 (3.0×) → **427×952 dp**.
> Tətbiq: `io.onesoil.scouting` **v9.2.0**. Hesab: istifadəçinin öz hesabı, canlı sahə (`Field 1`, 1.1 ha, Barley winter, Azərbaycan).
>
> ⚠️ Bu sənəd **mobil app**-ı təsvir edir. Desktop web (`app.yield.onesoil.ai`) ayrıca `ONESOIL_BENCHMARK.md` və `ONESOIL_UX_SPEC.md`-dədir. **İkisi eyni məhsul deyil** — web desktop-only (420px-ə sıxdıqda layout dəyişmir), mobil isə tam ayrı native tətbiqdir.
>
> **Test zamanı heç bir data yaradılmadı/silinmədi.** Yeganə dəyişiklik: xəritə qatı `Satellite image` → `Vegetation`.

---

## 1. Texniki cins — bu **native** Android tətbiqidir

`uiautomator` dump-ı sübut edir: `LinearLayout` / `FrameLayout` / `SurfaceView` (Mapbox SDK) + `ComposeView` adaları, `navigation_bar_item_*` resource id-ləri = **Material 3 `NavigationBar`**. WebView yoxdur.

Yəni OneSoil mobil **PWA deyil, hibrid deyil** — Kotlin + Material 3 + Mapbox Native SDK. Bu, "biz nə qurmalıyıq" sualı üçün birbaşa arqument deyil (aşağıda §7), amma vacib faktdır.

---

## 2. Ölçülmüş dizayn spesifikasiyası

Bunlar teardown-un ən qiymətli hissəsidir — bu rəqəmləri heç bir marketinq materialından ala bilməzsən.

### Shell
| Element | Ölçü (dp) | Qeyd |
|---|---|---|
| Ekran | 427 × 952 | Pixel 9 Pro, 3.0× |
| **Bottom nav (`bottomBar`)** | **427 × 80** | 5 slot × **85 × 80** |
| Nav ikonu | 24 × 24 | |
| Nav aktiv indikator (pill) | 64 × 32 | Material 3 yaşıl kapsul |
| Nav etiketi | 16 hündürlük | **həmişə görünür**, gizlənmir |
| Xəritə sahəsi | 427 × **847** | ekranın **89%-i** |

### Xəritə üzərindəki kontrollar — **hamısı 48 × 48 dp**
| Düymə | Mövqe | Ölçü |
|---|---|---|
| `search_button` | sağ-üst | **48 × 48** |
| `add_field_button` (+) | sağ-üst | **48 × 48** |
| `own_position_button` | sağ-alt | **48 × 48** |
| `marker_add_button` (qeyd) | sağ-alt | **48 × 48** |
| `filter_container` (Qrup/Mövsüm) | sol-üst | 157 × 50 |
| `layer_button` (qat seçici) | alt-mərkəz | 198 × 52 |
| Sahə siyahısı thumbnail | — | 52 × 52 |

---

## 3. İnformasiya arxitekturası

### 5 bottom tab — **`Map · Fields · Weather · Notes · Profile`**
Xəritə **default tab-dır və evdir**. Ayrıca "dashboard/bu gün" ekranı **YOXDUR**.

### Ən vacib struktur tapıntı: **sahə detalında TAB YOXDUR**
OneSoil-un sahə ekranı **tək fasiləsiz scroll**-dur:

```
[sürüklənən sheet dəstəyi]
Field 1 · 1.1 ha                                    ⋮
┌──────────────────────────────────────┐
│ [Vegetation ⌄]              [⛶ tam]  │  ← xəritə KART kimi (sheet-in İÇİNDƏ)
│ ▐ şaquli qradiyent legend             │
└──────────────────────────────────────┘
History        → üfüqi lent: [paywall kartı] [Jul 23 · 0.19]
Barley, winter ✏ / Planting date / Set harvesting date
Weather Forecast → üfüqi lent: [Temperature 37°] [Yağış…]
Spraying Windows → real data + 🔓 Unlock
                        ( AI Agronomist )  ← üzən pill
```

**Müqayisə:** Agradex-də sahə səhifəsi **16 bölmə / 3 qrup**, mobildə **iki sıra çip** (`fields/[id]/page.tsx:242-281` — 3 seqment pill + üfüqi sürüşən 7 alt-tab). OneSoil-da **sıfır tab**.

Bu, məhsul fəlsəfəsi fərqidir: OneSoil "bir ekran, aşağı sürüş", biz "16 bölmə, tap və seç". Bizim modelimiz daha çox funksiya verir, amma **ilk dəfə açan fermer üçün 16 seçim = donma**.

### Qat seçici **qlobaldır**
`Vegetation ⌄` pill-i həm `Map`, həm `Fields` tabında qalır. Qatı dəyişəndə **sahə siyahısındakı rəqəm də dəyişir**. Tək zehni model: *"hazırda nəyə baxıram"*.

---

## 4. Oğurlanmalı nümunələr (prioritetlə)

### 4.1 ⭐ Sahənin öz forması thumbnail kimi
Sahə siyahısında, tarixçə çiplərində, hər yerdə — generik kvadrat yox, **sahənin həqiqi konturu, NDVI ilə rənglənmiş** (52×52dp). Fermer öz sahəsini adı oxumadan tanıyır.
→ Bizdə: `FieldListPanel` sətirlərində və `SatelliteGlance` səhnə çiplərində tətbiq oluna bilər. `index_rasters` + sahə həndəsəsi onsuz da var.

### 4.2 ⭐ Rəqəm + qradiyent mövqe zolağı
Siyahı sətrində `0.19` yazır, **yanında mini qradiyent zolağı və üzərində nişan** — "bu sahə şkalada haradadır". Abstrakt rəqəmi bir baxışda hökmə çevirir.
→ Bizdə: `completeness.ts`/wellness skoru ilə eyni məntiq, amma indekslər üçün.

### 4.3 ⭐ Paywall **işlək datanı göstərir**, bağlı qutu yox
`Spraying Windows` bölməsi: real külək oxları (2/6/5/4/2/1 m/s), yağış barları (2/1/3/2 mm), **qırmızı-sarı-yaşıl svetofor zolağı** — hamısı canlı — sonra altda kiçik `🔓 Unlock`. Sən dəyəri **görürsən**, sonra qiymətini soruşurlar.
Eyni şəkildə `History` lentində paywall kartı **birinci element kimi**, məhz çatışmazlığı hiss etdiyin yerdə.
→ Bizdə paywall hələ yoxdur (billing təxirdədir), amma tier gating var — bu nümunə **hazırda yazılmalıdır**.

### 4.4 Qat seçici real önizləmə şəkilləri ilə
6 kart: `No Fill · Satellite image · Crop · Vegetation · Productivity · Moisture`. Hər kart **abstrakt ikon deyil, o qatın həqiqi görüntüsünün miniatürü** (Productivity = qırmızı-yaşıl NDVI şəkli, Moisture = mavi). Savadsız/ilk dəfə istifadəçi üçün "göstər, izah etmə".

### 4.5 4 NDVI rejimi — `Basic · Contrasted · Average · Heterogenity`
`Vegetation` seçiləndə altında açılır. **O1 backlog maddəmiz məhz budur** (`rescale=<scene_min>,<scene_max>`).
⚠️ **Zəiflik — bizim şansımız:** rejimlərin heç bir izahı yoxdur. Fermer "Heterogenity NDVI"nin nə olduğunu bilmir. Bizdə hər rejimin altında **bir sətir azərbaycanca izah** olmalıdır.

### 4.6 Qeyd (scouting) axını
Pin **xəritənin mərkəzinə** düşür (pin-i sürükləmirsən — xəritəni sürüşdürürsən). Sheet: `✕` / `New note` / böyük yaşıl `✓`; **7 rəng dairəsi**; **`Take photo` və `Select photo` AYRI iki düymə**; `Attached field: Field 1` avtomatik; `Add issue` dropdown; sərbəst `Note`. Xəritə yuxarıda görünməyə davam edir.
→ ⚠️ **Bizdə birbaşa boşluq:** `PhotoDiagnose.tsx:71-76`-da `capture` atributu **yoxdur** → kamera açılmır, fayl seçicisi açılır. `ScoutingTab.tsx:140`-da da yoxdur.

### 4.7 Hava = radar xəritəsi + zaman sürüşdürücüsü
Ayrıca tam-ekran tab. Sol kənarda yağış intensivliyi legendi, altda scrubber: **keçmiş = düz xətt, gələcək = çizgili (hatched)**. Sözsüz "müşahidə vs proqnoz" fərqi.

### 4.8 Sahə detalında xəritə **kartdır**, fon deyil
Yuvarlaq künclü kart, `[Vegetation ⌄]` çipi sol-üstdə, **tam-ekran düyməsi** sağ-üstdə, şaquli **rəqəmsiz** qradiyent legend sol kənarda.

> 📌 **Bu, bizim keçmiş səhvimizi izah edir.** `FieldMapSheet.tsx:3-11`-də yazılıb ki, tam-ekran xəritə + dar sheet ləğv edildi, çünki "~440px sütun sıxışıq idi". **OneSoil bu problemi heç yaşamır, çünki sheet tam ENİ tutur və xəritə sheet-in İÇİNDƏ karta çevrilir.** Yəni seçim "tam-ekran xəritə" ilə "adi scroll" arasında deyil — üçüncü yol var. Bizim hazırkı `h-64` (256px) xəritəmiz OneSoil-un ~360dp kartından xeyli kiçikdir və tam-ekran keçidi yoxdur.

### 4.9 Boş vəziyyət formulu
`Notes` tabı: ikon + bir cümlə izah ("Add notes when you conduct field scouting…") + tək `Add note` düyməsi.

### 4.10 `AI Agronomist` daimi üzən pill
Sahə detalında scroll boyu ekranın altında qalır — yaşıl kapsul, ✨ ikonu.

---

## 5. Rəqabət təsdiqləri (canlı, bu gün, sizin sahənizdə)

| Tapıntı | Sübut |
|---|---|
| **Azərbaycan dili YOXDUR** | Settings → Language: 17 dil — Čeština, Deutsch, English, Español, Français, Italiano, Magyar, Polski, Português, Română, Tagalog, Türkçe, Български, Русский, Українська, Ελληνικά, العربية. **`az` yox.** |
| **AZ-də sərhəd pre-detection İŞLƏMİR** | `+` → `Select` rejimi: sizin sahənizdən başqa ətrafda **heç bir avto-kontur yoxdur**, halbuki peyk şəklində sərhədlər aydın görünür. Onların flaqman onboarding-i burada ölüdür. |
| **AI Agronomist tam paywall arxasında** | 7 vəd sadalanır (7 gündən bir dərin analiz · zona prioritetləşdirmə · yaddaş · peyk+hava siqnallarını sadə dilə çevirmə · növbəti tədbir tövsiyəsi · qonşu sahələr və tarixçə ilə müqayisə · chat) → `Unlock AI Agronomist`. **Bizdə bunlar pulsuzdur və canlıdır.** |
| **Spraying Windows paywall** | data göstərilir, `Unlock` tələb olunur. Bizdə `spray_window` bloku var. |
| **Tarixçə paywall** | Free-də cəmi 1 səhnə (`Jul 23 · 0.19`) + "Need more satellite data? … Monitoring plan". |

---

## 6. Agradex ilə ölçülmüş fərq

| | OneSoil mobil | Agradex (hazırkı) | Mənbə |
|---|---|---|---|
| Bottom nav hündürlüyü | **80 dp** | 56 px (`min-h-14`) | `BottomNav.tsx:18` |
| Toxunma hədəfi | **48 dp** | 44 px (`min-h-11`) | `globals.css:66-88` |
| Sahə ekranında xəritə | ~360 dp kart + **tam-ekran keçidi** | **256 px** (`h-64`), tam-ekran yoxdur | `FieldMap.tsx:479` |
| Sahə ekranı naviqasiyası | **tab yoxdur**, tək scroll | **16 bölmə / 3 qrup**, 2 sıra çip | `fieldSections.ts` |
| Push bildiriş | **3 kateqoriya** (indeks yeniləməsi / tövsiyələr / yeniliklər) | **ümumiyyətlə yoxdur** — kodda sıfır `PushManager` | `public/sw.js` |
| Kamera | `Take photo` ayrıca düymə | `capture` atributu **yoxdur** → fayl seçicisi | `PhotoDiagnose.tsx:71-76` |
| Qat seçici | qlobal, tablar arası qalır | bölməyə bağlı | `SatelliteTab.tsx` |
| Dil | 17 (az **yox**) | **8, az əsas** | `lib/i18n.ts` |
| Safe-area | native idarə edir | `env(safe-area-inset-bottom)` **işləmir** (`viewportFit` yoxdur) | `layout.tsx:56-58` |

---

## 7. "Native, yoxsa PWA?" — bu turdan çıxan sübut

OneSoil-un mobil app-ı native olması **bizim də native qurmalı olduğumuzu sübut etmir**. Amma turda gördüyüm hansı hissələrin PWA-da **struktur olaraq mümkün olmadığını** dəqiqləşdirir:

**PWA-da mümkün olmayan (turda gördüklərimdən):**
- Push bildiriş (indeks yeniləməsi/tövsiyə) — iOS-da yalnız home-screen quraşdırmasından sonra, Android-də mümkün, **amma bizdə heç bir push kodu yoxdur**
- Fon lokasiyası (sahə perimetrini gəzərək çəkmək)
- Mağazada tapılmaq (Google Play) — AZ auditoriyası üçün ən böyük fərq

**PWA-da tam mümkün olan (turda gördüklərimin ƏKSƏRİYYƏTİ):**
- Bütün §4 nümunələri (thumbnail, qradiyent zolaq, paywall dizaynı, qat seçici, NDVI rejimləri, boş vəziyyət, radar scrubber, xəritə-kart)
- `Take photo` — `capture="environment"` bir atributdur
- Offline keş, tam-ekran xəritə, jestlər

**Nəticə:** turda ölçdüyüm dəyərin **~80%-i bugünkü Next.js PWA-da qurula bilər**. Native-ə keçmək bu 80%-i **avtomatik vermir** — sadəcə yenidən yazmaq lazım gələcək. Native-in verdiyi unikal şey: **push + mağaza mövcudluğu**.

---

## 8. Status
**2026-07-26: TEARDOWN TAMAM.** Screenshot-lar və `uiautomator` XML-ləri sessiya scratchpad-ində (`shots/01-launch … 15-langs`) — kalıcı deyil, lazım olsa yenidən çəkilməlidir.
**İcra qərarı verilməyib** — §4 nümunələri `ROADMAP.md` O-seriyası ilə birləşdirilməlidir.
