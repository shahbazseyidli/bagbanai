# OneSoil mobil — ekran-bə-ekran inventar

> **Mənbə:** OneSoil Scouting **v9.2.0**, canlı `adb` sessiyası, **40 çəkiliş** (PNG + `uiautomator` XML), Pixel 9 Pro (427×952 dp).
> Dizayn tokenləri: `ONESOIL_DESIGN_SYSTEM.md` · Strateji nəticələr: `ONESOIL_MOBILE_TEARDOWN.md` · Bizim qarşılıqlar: `ONESOIL_VS_AGRADEX.md`
>
> **Əhatə dairəsi:** app-ın **daxili** bütün ekranları gəzildi. Xarici brauzerə çıxan sətirlər (`Web version features`, `Updates history`, `Support chat`, `User Guide`, `Telegram community`, `Privacy policy`, `Terms of Use`) qəsdən açılmadı — onlar app ekranı deyil, veb səhifədir; `Share app` sistem paylaşma vərəqidir.
> **Əlçatmaz qalan:** pullu funksiyaların **içi** (Monitoring/AI Agronomist alınmayıb — yalnız upsell ekranları sənədləşdirilib; abunə almaq mənə qadağandır), çoxlu sahəsi/qrupu olan hesabın görünüşü (test hesabında 1 sahə var).
>
> ⚠️ **Qeydiyyat axını üçün əlavə qeyd:** istifadəçi qəsdən logout etdi və pre-auth axını **tam gəzildi** (bax §0 aşağıda). **Hesab yaradılmadı və heç bir parol yazılmadı** — bu mənə qadağandır; ekranlar, sahələr və razılıq mexanizmi struktur olaraq sənədləşdirilib. Anonim halda sahə yaratma axınına **girilib**, amma **saxlanmayıb** — ona görə "saxlama addımı qeydiyyat tələb edirmi?" sualı **yoxlanılmamış qalır**.

---

## Naviqasiya xəritəsi

```
Bottom nav (5)
├─ Map ★default
│  ├─ Qrup/Mövsüm seçici (sheet)
│  ├─ Axtarış (tam ekran)
│  ├─ Qat seçici (sheet) → Vegetation → 4 NDVI rejimi
│  │                     → Labels (dropdown)
│  ├─ + Sahə əlavə et → Select | Draw
│  ├─ ⊕ Qeyd əlavə et (sheet) → Add issue (6 kateqoriya)
│  └─ Sahəyə toxun → Sahə detalı (sheet)
│                    ├─ ⛶ Tam ekran
│                    ├─ ⋮ menyu (5 əməliyyat)
│                    ├─ ✏ Məhsul redaktəsi (sheet)
│                    └─ AI Agronomist (upsell)
├─ Fields → siyahı → (eyni sahə detalı)
├─ Weather → radar + zaman scrubber
├─ Notes → boş vəziyyət
└─ Profile
   ├─ My account → email / parol / hesabı sil / çıxış
   ├─ Settings → Dil (17) · Vahid sistemi · 3 bildiriş keçidi
   ├─ Subscription → Purchase (3 paket)
   └─ Export field boundaries (PAYWALL)
```

---

# §0 · PRE-AUTH — hesabsız istifadə ★ ən mühüm struktur tapıntı

> **OneSoil hesabsız TAM işləyir.** Login divarı yoxdur. App açılır, xəritə gəlir, öz mövqeyin görünür, hava işləyir, sahə əlavə etmə axını açılır. Hesab yalnız **saxlamaq və veb versiyaya keçmək** üçün təklif olunur.

## A0 · Soyuq açılış (hesabsız) — Map tabı
Tam ekran peyk xəritəsi, **istifadəçinin öz mövqeyində** (mavi nöqtə `#4A90E2` + istiqamət oxu).

| Element | Vəziyyət |
|---|---|
| Qrup/mövsüm pill · axtarış · `+` · mövqeyim | **var** (loginli ilə eyni) |
| Qat seçici pill | **YOX** |
| Qeyd əlavə et düyməsi | **YOX** |
| **`＋ Add fields` böyük CTA** | alt-mərkəzdə, **128×120 dp**, **MAVİ `#1877F2`** |

★ **Nümunə — vəziyyətə görə yuva dəyişməsi:** xəritənin alt-mərkəz yuvası eyni qalır, məzmunu dəyişir: **sahə yoxdursa** `Add fields` CTA → **sahə varsa** qat seçici pill.

★ **Rəng qərarı:** boş vəziyyətin əsas hərəkəti **brend yaşılı deyil, mavidir** (`#1877F2`). Kontrastla ayrılıb — yaşıl "təsdiq/uğur", mavi "başla".

## A1 · Sign in (`Welcome back!`)
Loqo 56 dp · başlıq · `Email` (395×56 dp) · `Password` (395×52 dp) + göz keçidi (48 dp) · `Forgot your password?` · yaşıl `Sign in` (395×56) · `Or continue with` · **Google** dairəsi · `Sign up`.

## A2 · Sign up (`Welcome to OneSoil!`)
Boz dairəvi `✕` (sağ-üst) · yaşıl yuvarlaq-kvadrat loqo · başlıq · `Email` · `Password` + göz.

★ **İKİ AYRI RAZILIQ QUTUSU** (paketlənmiş tək checkbox DEYİL), hər ikisi **sağ tərəfdə** dairəvi:
1. *"I have read and agree to OneSoil's **Terms of Use**"* (altdan xətli link)
2. *"I give consent for my personal data to be processed according to **Privacy policy**"* (altdan xətli link)

Sonra yaşıl `Create account` · `Or continue with` → Google · boz `Sign in`.

★ **Ad, telefon, ölkə sahəsi YOXDUR** — qeydiyyat cəmi **2 sahə + 2 razılıq**. Maksimum az sürtünmə.

## A3 · Profile tabı (hesabsız)
Başlıqda upsell bloku:
> **`Keep your fields safe`**
> *"Create an account or sign in to save your data and use the web version"*
> `Create an account` · `I have an account`

Altında menyu **qismən qalır**: `Settings` · `Subscription` · `Export field boundaries` · `Learn more`…
(`My account` yoxdur — o, yalnız loginlidə var.)

★ Upsell **funksiyanı kəsmir** — "datanı itirmə" və "veb versiya" faydası ilə satılır, qorxu ilə yox.

## A4 · Fields tabı (hesabsız)
Boş vəziyyət: *"Add fields to start monitoring vegetation, satellite images…"* + `Add fields` düyməsi. Başlıq sətrində `Save` · `Add` · `More options` ikonları qalır.

## A5 · Notes tabı (hesabsız)
*"You need at least one field before adding notes."* — **hesab yox, SAHƏ tələb olunur**. Yəni asılılıq düzgün modelləşdirilib: qeyd sahəyə bağlıdır, hesaba yox.

## A6 · Weather tabı (hesabsız) ★
Tam işləyir. **Fərqli basemap:** tünd/söndürülmüş dünya xəritəsi (Map tabındakı peyk deyil) — yağış rəngləri onun üzərində seçilsin deyə.

- Sol kənarda **iki hissəli şaquli legend** (yuxarı: sarı→çəhrayı→bənövşəyi→mavi; aşağı: sian gradient)
- Alt-mərkəzdə **`⊕ Add virtual weather station`** — həmin mavi `#1877F2`
- Sağ-üstdə pin-plus ikonu (stansiya əlavə et)
- Zaman scrubber: keçmiş bərk, gələcək çizgili

★ **Virtual hava stansiyası ayrıca varlıqdır** — sahəyə bağlı deyil, xəritədə istənilən nöqtəyə qoyulur. Bizdə analoqu yoxdur (`weather_cache` sahəyə bağlıdır).

## A7 · Sahə əlavə etmə (hesabsız)
`Select | Draw` seqmenti açılır, alt-mərkəzdə zoom ikonu + **`Zoom-in to select fields`** ipucu.
⚠️ **Saxlama addımı yoxlanılmadı** — sahə yaratmaq istifadəçinin hesabında data yaratmaq demək olardı.

---

# MAP tabı

## M1 · Xəritə evi ★ default ekran
Tam ekran Mapbox peyk xəritəsi. **Ayrıca "dashboard" ekranı yoxdur** — xəritə evdir.

| Element | Mövqe | Ölçü |
|---|---|---|
| Qrup/mövsüm pill (`All fields` / `Season 2026`) | sol-üst | 157×50 dp |
| Axtarış | sağ-üst | 48×48 dp |
| Sahə əlavə et `+` | sağ-üst | 48×48 dp |
| Qat seçici (`Satellite image` ⌄) | alt-mərkəz | 198×52 dp |
| Mövqeyim | sağ-alt | 48×48 dp |
| Qeyd əlavə et ⊕ | sağ-alt | 48×48 dp |
| İndeks legendi (şaquli) | sol kənar | 24×120 dp |

Sahə poliqonu üzərində **indeks dəyəri mətn kimi yazılır** (`0.19`).

## M2 · Qrup / Mövsüm seçici
Aşağıdan sheet: `Group` · `Season 2026` · `All fields`. Mövsüm birinci səviyyəli anlayışdır.

## M3 · Axtarış
Tam ekran. Başlıq `Search`, sağda `Cancel`.
Placeholder: **"Search by your fields' names, place names, or coordinates"** — üç axtarış növü bir sahədə (sahə adı · yer adı · koordinat).

## M4 · Qat seçici (`Map layer`)
3×2 grid, **6 qat**, hər kart **real önizləmə şəkli** ilə:

| Qat | Önizləmə |
|---|---|
| `No Fill` | yaşıl, boş kontur ikonu |
| `Satellite image` ★ | peyk parçası |
| `Crop` | mavi, sünbül ikonu |
| `Vegetation` | yaşıl gradient, yarpaq |
| `Productivity` | **qırmızı-yaşıl NDVI şəkli** |
| `Moisture` | mavi, damcılar |

Altda sərhədli sətir: **`Labels — Average NDVI ⌄`** (poliqon üzərində hansı rəqəmin yazılacağını seçir).

## M5 · Vegetation → 4 render rejimi
`Vegetation` seçiləndə kartların altında şaquli siyahı açılır:
**`Basic NDVI` · `Contrasted NDVI` · `Average NDVI` · `Heterogenity NDVI`**
Seçili olan açıq boz kapsul alır.
⚠️ **İzah YOXDUR** — fermer fərqi bilmir. Bu, onların zəifliyi və bizim şansımızdır.

## M6 · Labels dropdown
`Average NDVI` seçicisi — poliqon üzərindəki etiketi dəyişir. *(Tam siyahısı açılmadı.)*

## M7 · Sahə əlavə et — `Select` rejimi
Ağ ✕ (sol-üst) · tünd seqment pill **`Select | Draw`** · axtarış (sağ-üst).
Mövcud sahə **yaşıl dolğu** ilə işarələnir.
⚠️ **Azərbaycanda ətrafda heç bir avto-kontur yoxdur** — pre-detection burada işləmir.

## M8 · Sahə əlavə et — `Draw` rejimi
- Sol kənarda iki alət: **`Draw`** (poliqon) və **`Draw Circle`** (dairəvi/pivot sahələr), hər biri 24 dp ikon
- Mərkəzdə **sabit nişangah** + 36×36 dp düymə
- Təlimat: **"Place first point of boundary"**
- İlk nöqtədən sonra **`Undo`** çıxır

★ **Nümunə:** barmaqla toxunmursan — **xəritəni sabit nişanın altında sürüşdürürsən**.

## M9 · Yeni qeyd (`New note`)
Pin **xəritənin mərkəzinə** düşür (böyük qırmızı marker), sheet açılır, **xəritə yuxarıda görünməyə davam edir**.

| Sıra | Element |
|---|---|
| 1 | `✕` (ləğv) · `New note` · **böyük yaşıl `✓`** (saxla) |
| 2 | **7 rəng dairəsi** — seçili olan halqa kimi |
| 3 | **`Take photo`** \| **`Select photo`** — yan-yana iki düymə |
| 4 | `Attached field: Field 1` — **avtomatik doldurulub** |
| 5 | `Add issue ⌄` |
| 6 | `Note` (sərbəst mətn) |

## M10 · Problem seçici (`Select issue`)
**6 kateqoriya:** `Disease` · `Pests` · `Weeds` · `Lodging` · `Waterlogging` · `Other`

## M11 · Sahə detalı ★ ən vacib ekran
Sürüklənən sheet, demək olar tam ekran. **TAB YOXDUR — tək fasiləsiz scroll.**

1. Sürükləmə dəstəyi
2. `Field 1` · `1.1 ha` · **`⋮`**
3. **Xəritə kartı** (~360 dp): `Vegetation ⌄` çipi (sol-üst) · **⛶ tam-ekran** (sağ-üst) · **rəqəmsiz şaquli qradiyent legend** (sol kənar)
4. **`History`** — üfüqi səhnə lenti; **birinci element paywall kartıdır** (`Need more satellite data?` → `Unlock Monitoring`), sonra real çiplər (`Jul 23 · 0.19`)
5. **Məhsul kartı** — rəng nöqtəsi + `Barley, winter` + ✏ · `Planting date / Jul 26, 2026` · `Set harvesting date` (yaşıl = əməliyyat)
6. **`Weather Forecast`** — üfüqi metrik kartları, hər birində **pilləli sahə-qrafiki** + saat oxu (`Now / 19:00 / 23:00 / 03:00 / 07:00 / 11:00`)
7. **`Spraying Windows`** — külək oxları + m/s, yağış barları + mm, **svetofor zolağı**, sonra `🔓 Unlock`
8. **`AI Agronomist`** — daimi üzən yaşıl pill

## M12 · Sahə detalı — tam-ekran rejimi
Ağ dairəvi ← (sol-üst) · başlıq xəritə üzərində mərkəzdə · xəritə böyüyür · **`History` lenti aşağıda ağ sheet kimi qalır**.

## M13 · Sahə `⋮` menyusu
`Show on map` · `Rename` · `Edit boundaries` · `Share field` · `Remove`

## M14 · Məhsul redaktəsi (`Add crop`)
Məhsul dropdown · `Specify variety/hybrid` · `Planting date` \| `Growth stage` (iki sütun) · `Harvest date` · `Remove crop` \| **`Add multi-crop`**
★ Bir sahədə **çox məhsul** dəstəklənir.

## M15 · AI Agronomist (upsell)
Başlıq `AI Agronomist`, alt sətir `1.1 ha • Field 1`, sonra **7 vəd**:
1. Hər 7 gündən bir avtomatik dərin sahə analizi
2. Diqqət tələb edən zonaları önə çıxarır
3. Sahə haqqında paylaşdığın hər şeyi yadda saxlayır
4. Peyk/hava/sahə siqnallarını aydın dilə çevirir
5. Növbəti skautinq, çiləmə, gübrələmə tövsiyə edir
6. Sahəni **qonşu sahələr və tarixçə ilə müqayisə edir**
7. Chat-də sahəyə aid suallara cavab verir

→ `Unlock AI Agronomist`

---

# FIELDS tabı

## F1 · Sahə siyahısı
- Böyük başlıq `Fields` + altında yaşıl `All fields ⌄` (qrup seçici)
- Sağda: axtarış · `+` · `⋮`
- Qrup başlığı (`No groups`) + **qrupun ümumi sahəsi sağda** (`1.1 ha`)
- Sətir: **52×52 dp sahə-formalı thumbnail** · ad · sahə · sağda **dəyər + qradiyent mövqe zolağı**
- **Qat pill-i bottom nav-ın üstündə üzür** — qatı dəyişəndə sətirlərdəki rəqəm dəyişir

---

# WEATHER tabı

## W1 · Hava radarı
Tam ekran xəritə (kart siyahısı **deyil**). Sahələr ağ konturla + adları ilə.
- Sol kənarda **iki hissəli şaquli intensivlik legendi**
- Altda tünd **zaman scrubber**: **keçmiş = düz xətt, gələcək = diaqonal çizgili**, cari vaxt ağ kapsulda (`14:46`), etiketlər `12:46 · Now · 18:46`

---

# NOTES tabı

## N1 · Boş vəziyyət
İkon + bir cümlə (*"Add notes when you conduct field scouting or when you want to…"*) + tək `Add note` düyməsi.

---

# PROFILE tabı

## P1 · Profil menyusu
Başlıq: loqo · **`My fields`** (workspace adı) · **`Workspace owner`** (rol) · ⌄ (workspace dəyişdirici)

| Bölmə | Sətirlər |
|---|---|
| *(başlıqsız)* | `My account` · `Settings` · `Subscription` · `Export field boundaries` |
| `Learn more` | `Web version features` ↗ · `Updates history` ↗ |
| `Support & Help` | `Support chat` ↗ · `User Guide` ↗ · `Telegram community` ↗ |
| `Legal` | `Privacy policy` ↗ · `Terms of Use` ↗ |
| *(sonda)* | `Share app` |

↗ = xarici brauzer. Sətir addımı 49 dp.

## P2 · My account
`Change email` (cari ünvanı göstərir) · `Change password` · `Delete account` · **`Sign out`**

## P3 · Settings
- **`Language`** → 17 dil
- **`Unit system`** → `Metric`
- Bölmə **`Recommendations`** — **3 push bildiriş keçidi**:
  `Vegetation index updates` · `Recommendations` · `New features`

## P4 · Dil siyahısı — **17 dil, Azərbaycan dili YOXDUR**
`Čeština · Deutsch · English · Español · Français · Italiano · Magyar · Polski · Português · Română · Tagalog · Türkçe · Български · Русский · Українська · Ελληνικά · العربية`

## P5 · Subscription
`Plan: Free` · **`Total fields area: 1.1 ha`** · `About Subscription` · `Purchase Subscription`
★ Abunə ekranı **hektar cəmini birinci dərəcəli məlumat** kimi göstərir.

## P6 · Qiymət vərəqi ★
Yaşıl ulduz ikonu → başlıq *"Don't miss critical moments in your fields"* → **fərdiləşdirilmiş** alt başlıq *"For **1.1 ha** in active season"* → **funksiya-nümayiş karuseli** (real datalı səhnə çipləri + qırmızı delta nişanları, məs. `Aug 21 · 0.75 · −0.09`) → **`AI Agronomist` əlavə-modul keçidi** → `Monthly | Quarterly` + yaşıl `Save 13%` → 3 paket:

| Paket | Limit | Aylıq |
|---|---|---|
| `Small` | 50 ha-dək | **$5.00** |
| `Medium` | 500 ha-dək | **$25.00** |
| `Large` | 5000 ha-dək | **$99.00** |

İstifadəçinin sahəsinə uyğun paket **avtomatik seçilir** (yaşıl sərhəd). Altda tam enli yaşıl `Subscribe`.

## P7 · Export field boundaries — **PAYWALL**
`Download Field Boundaries` · *"Export your field borders in GeoJSON, Shapefile, GeoPackage…"* · **`Unlock Feature`**

---

## Pullu / pulsuz sərhədi (turda müşahidə edilən)

| Funksiya | Free | Paid |
|---|---|---|
| Son buludsuz səhnə | ✅ | ✅ |
| **Səhnə tarixçəsi** | ❌ (1 səhnə) | ✅ limitsiz |
| **AI Agronomist** | ❌ | ✅ |
| **Spraying Windows** | ❌ (data görünür, kilidli) | ✅ |
| **Sərhəd eksportu** | ❌ | ✅ |
| Cari hava + proqnoz | ✅ | ✅ |
| Qeydlər / skautinq | ✅ | ✅ |
| Sahə çəkmə / məhsul / mövsüm | ✅ | ✅ |

★ Sərhəd **"vaxt dərinliyi + ekspert şərhi"** üzərindən çəkilib — gündəlik istifadə tam pulsuzdur, ona görə app heç vaxt boş görünmür.
