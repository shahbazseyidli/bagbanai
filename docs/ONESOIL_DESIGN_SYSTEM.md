# OneSoil mobil — dizayn sistemi (ölçülmüş)

> **Mənbə:** OneSoil Scouting **v9.2.0** (`io.onesoil.scouting`), Pixel 9 Pro · Android 17 · 1280×2856 px @ density 480 (**3.0×**) → məntiqi kətan **427 × 952 dp**.
> **Metod:** `adb` ilə canlı idarəetmə. **40 ekran** — hər biri üçün PNG + `uiautomator` XML iyerarxiyası.
> Ölçülər XML `bounds`-dan (**piksel dəqiqliyi**, `dp = px / 3`), rənglər PNG-dən **PIL ilə piksel oxunuşu**.
>
> ⚠️ **Nə ölçülüb, nə təxmin edilib:** `dp` ölçüləri və HEX rənglər **ölçülüb**. Şrift ölçüləri (`sp`) **təxmindir** — `uiautomator` şrift ölçüsünü vermir, yalnız TextView hündürlüyünü; sp dəyərləri həmin hündürlükdən çıxarılıb və ±1–2sp səhv edə bilər.
>
> Ekran-bə-ekran inventar: `ONESOIL_SCREEN_INVENTORY.md`. Strateji müqayisə: `ONESOIL_MOBILE_TEARDOWN.md`.

---

## 1. Rəng tokenləri

### 1.1 Brend
| Token | HEX | İstifadə |
|---|---|---|
| `green/primary` | **`#27AE60`** | Bütün əsas düymələr (`Subscribe`, `Unlock Monitoring`), yaşıl linklər (`All fields`, `Set harvesting date`), seçili paket sərhədi, saxla ✓ FAB-ı |
| `green/active-pill` | **`#BFE7D0`** | Bottom nav aktiv indikator kapsulu |

> **Tək accent intizamı:** bütün tur boyu **bir dənə** brend yaşılı işlədilir. İkinci brend rəngi yoxdur.

### 1.2 Səth və fon
| Token | HEX | İstifadə |
|---|---|---|
| `surface/base` | `#FFFFFF` | Ekran fonu, bottom sheet fonu |
| `surface/secondary` | **`#F4F4F4`** | Kart fonu, thumbnail konteyneri, input/sətir fonu |
| `surface/nav` | `#F5FAFB` | Bottom nav fonu (ağdan bir qədər soyuq) |
| `surface/dark-pill` | **`#222425`** – `#232526` | Xəritə üzərindəki pill və dairəvi düymələr |
| `surface/dark-sheet` | `#1D1B20` | Qat seçici pill (Material 3 `surfaceContainer` tünd) |

### 1.3 Mətn
| Token | HEX | İstifadə |
|---|---|---|
| `text/primary` | **`#171D1E`** | Başlıqlar, sətir adları, rəqəmlər |
| `text/secondary` | **`#615F5C`** | Alt sətirlər (`1.1 ha`), izahlar, ox işarələri |
| `text/on-dark` | `#FFFFFF` | Xəritə pill-lərinin içi |

### 1.4 Qeyd rəngləri (7 ədəd, tam palitra)
`#FB4040` · `#EFD644` · `#27AE60` · `#00BAFF` · `#007AFF` · `#724CF9` · `#E576FF`

Seçili swatch **halqa** kimi çəkilir (mərkəzi ağ), seçilməmişlər dolu dairədir.

### 1.5 NDVI legend qradiyenti (aşağıdan yuxarı = pisdən yaxşıya)
`#7F3B21` (tünd qəhvəyi) → `#E3C367` → `#E2E86B` → `#82AA47` → `#203A18` (tünd yaşıl)

⚠️ Bu **klassik RdYlGn deyil** — daha torpaq tonludur, qırmızı ucu qəhvəyiyə çəkilib. Bizim TiTiler `colormap_name=rdylgn`-dən görünüş etibarilə fərqlidir.

### 1.6 Svetofor (Spraying Windows zolağı)
`#F44336` (pis) · `#FFCC00` (orta) · `#27AE60` (yaxşı)

---

## 2. Layout ölçüləri

### 2.1 Şaquli struktur
| Zona | Hündürlük |
|---|---|
| Status bar | ~40 dp |
| **Məzmun / xəritə** | **847 dp** (ekranın 89%-i) |
| **Bottom nav** | **80 dp** |

### 2.2 Bottom nav (Material 3 `NavigationBar`)
| Ölçü | Dəyər |
|---|---|
| Konteyner | 427 × **80 dp** |
| Slot (5 ədəd) | **85 × 80 dp** |
| Aktiv indikator kapsulu | **64 × 32 dp**, `#BFE7D0` |
| İkon | **24 × 24 dp** |
| Etiket | 16 dp hündürlük, **həmişə görünür** (heç vaxt gizlənmir) |

### 2.3 Toxunma hədəfləri — **hamısı 48 dp**
Xəritə üzərindəki bütün dairəvi düymələr `48 × 48 dp`: axtarış, sahə əlavə et, mövqeyim, qeyd əlavə et. İstisna yoxdur.

### 2.4 Digər sabit ölçülər
| Element | Ölçü |
|---|---|
| Üst qrup/mövsüm pill-i | 157 × 50 dp |
| Qat seçici pill | 198 × 52 dp (mətn uzunluğuna görə 172–198) |
| Sahə siyahısı thumbnail | **52 × 52 dp** |
| Səhnə çipi thumbnail | 52 × 52 dp |
| Menyu sətri (Profile) | **49 dp addım**, ikon 24 dp, ox 24 dp |
| Xəritə legendi (şaquli) | 24 × 120 dp |
| Sahə detalında xəritə kartı | ~**360 dp** hündürlük |

---

## 3. Tipoqrafiya (təxmini — §0 xəbərdarlığına bax)

| Rol | Ölçülmüş hündürlük | Təxmini | Çəki |
|---|---|---|---|
| Ekran başlığı (`Fields`, `Settings`) | 36–41 dp | ~28 sp | Bold |
| Sheet başlığı (`Map layer`, `Field 1`) | 27–28 dp | ~21–22 sp | Bold |
| Paywall başlığı | 56 dp (2 sətir) | ~24 sp | Bold |
| Gövdə / sətir etiketi | 19–24 dp | ~15–16 sp | Regular |
| Sətir alt-mətni (`1.1 ha`) | 14–16 dp | ~12–13 sp | Regular |
| Bölmə başlığı (`Learn more`) | 16 dp | ~13 sp | Medium |
| Nav etiketi | 16 dp | ~12 sp | Medium |
| Səhnə çipi tarixi | 14 dp | ~11 sp | Regular |
| Səhnə çipi dəyəri | 16 dp | ~13 sp | Medium |

---

## 4. Komponent spesifikasiyaları

### 4.1 Xəritə pill-i (`MapPill`)
Tünd `#222425`, tam yuvarlaq (`pill`), ağ mətn, sol tərəfdə 24 dp ikon, sağda ⌄ chevron. İki ölçü: kompakt (50 dp) və qat seçici (52 dp).

### 4.2 Dairəvi xəritə düyməsi (`MapCircleButton`)
48 × 48 dp, tam dairə, `#222425` fon, ağ 24 dp ikon. Şaquli və üfüqi 16 dp aralıqla qruplaşır.

### 4.3 Sahə sətri (`FieldRow`) — **ən vacib komponent**
```
[52×52 thumbnail]  Field 1            0.19  ▐▬▬|▬▬▬▬▌
 (sahənin ÖZ         1.1 ha                   ↑ nişan
  forması,                                    şkalada mövqe
  indekslə rənglənmiş)
```
- Thumbnail `#F4F4F4` konteyner içində, sahənin həqiqi həndəsəsi aktiv indeksin rəngləri ilə render olunur
- Sağda: **rəqəm + mini qradiyent zolaq + mövqe nişanı**
- Qrup başlığı sətri: qrup adı solda, **qrupun ümumi sahəsi sağda**

### 4.4 Səhnə çipi (`SceneChip`)
```
┌──────────┐
│ [sahə    │   ← sahənin öz forması, həmin tarixin rasteri
│  forması]│
│ Jul 23   │   ← tarix, ~11sp
│ 0.19  -0.09  ← dəyər + qırmızı delta nişanı
└──────────┘
```
Seçili çip **qara 2dp sərhəd** alır. Üfüqi lentdə düzülür. **Delta nişanı** (`-0.09`) açıq qırmızı fonlu kiçik kapsuldur.

### 4.5 Qat kartı (`LayerTile`)
3 sütunlu grid. Hər kart: ~72 dp yuvarlaq kvadrat **real önizləmə şəkli** (abstrakt ikon YOX) + altında etiket. Seçili kart açıq boz yuvarlaq sərhəd alır.

### 4.6 Paywall bloku (`InlinePaywall`) — **əsas nümunə**
İki formada görünür, hər ikisi eyni prinsipi izləyir: **əvvəlcə real işlək data, sonra kiçik CTA**.

**(a) Bölmə daxilində:** `Spraying Windows` başlığı + izah cümləsi + **canlı qrafik** (külək oxları + m/s, yağış barları + mm, altda svetofor zolağı, saat oxu) + altda kiçik `🔓 Unlock` mətn-düyməsi.

**(b) Lent daxilində:** `History` üfüqi lentinin **birinci elementi** kimi kart: başlıq + bir sətir + dolu yaşıl `Unlock Monitoring` düyməsi; onun yanında real səhnə çipləri davam edir.

### 4.7 Qiymət vərəqi (`PricingSheet`)
1. Yaşıl yuvarlaq-kvadrat ulduz ikonu
2. Başlıq (2 sətir, bold)
3. **Fərdiləşdirilmiş alt başlıq** — istifadəçinin öz hektarı yaşıl rənglə: *"For **1.1 ha** in active season"*
4. **Funksiya-nümayiş karuseli** — hər kart funksiyanı real datayla işlək göstərir; növbəti kart kənardan görünür (sürüşdürmə işarəsi)
5. **Əlavə-modul keçidi** (`AI Agronomist` + toggle)
6. Dövr seçicisi: `Monthly | Quarterly` + yaşıl `Save 13%` nişanı
7. **3 hektar-limitli paket kartı** — istifadəçinin sahəsinə uyğun olan **avtomatik seçilir**, yaşıl sərhədlə
8. Tam enli yaşıl `Subscribe`

### 4.8 Boş vəziyyət (`EmptyState`)
İkon + **bir cümlə** izah + **tək** düymə. Başqa heç nə.

---

## 5. Qarşılıqlı təsir nümunələri

### 5.1 ⭐ Sabit nişan, hərəkət edən xəritə
Həm **qeyd pin-i**, həm **sərhəd çəkmə** eyni prinsiplə işləyir: nişan ekranın **mərkəzində sabit** qalır, istifadəçi **xəritəni onun altında sürüşdürür**, sonra düyməyə basır.

**Səbəb:** barmaq toxunduğu nöqtəni örtür. Mobil xəritədə dəqiq nöqtə qoymağın yeganə düzgün yolu budur.

### 5.2 Qlobal qat seçicisi
Seçilmiş qat (`Vegetation`, `Moisture`…) **tablar arasında qalır** və sahə siyahısındakı rəqəmi də dəyişir. Tək zehni model: *"hazırda nəyə baxıram"*.

### 5.3 Zaman: keçmiş bərk, gələcək çizgili
Hava scrubber-ində keçmiş **düz xətt**, proqnoz **diaqonal çizgili**. Sözsüz etibar göstəricisi.

### 5.4 Tam-ekran = xəritə böyüyür, lent qalır
Sahə detalında tam-ekran düyməsi xəritəni böyüdür, **`History` lentini aşağıda saxlayır** — böyük xəritədə tarixlər arasında gəzmək mümkün olur.

### 5.5 Sahə detalında **tab yoxdur**
Bir fasiləsiz scroll. Naviqasiya yükü sıfır.

---

## 6. Bizim tərəflə birbaşa müqayisə

| Ölçü | OneSoil | Agradex |
|---|---|---|
| Bottom nav hündürlüyü | **80 dp** | 56 px (`min-h-14`, `BottomNav.tsx:18`) |
| Toxunma hədəfi | **48 dp** (istisnasız) | 44 px (`.btn min-h-11`, `globals.css:66-88`) |
| Sahə detalı xəritəsi | ~360 dp + tam-ekran | 256 px (`h-64`, `FieldMap.tsx:479`) |
| Sahə detalı naviqasiyası | **tab yoxdur** | 16 bölmə / 3 qrup, 2 sıra çip |
| Brend accent | `#27AE60` | `#15803D` (`tailwind.config.ts:16`) |
| İkincil səth | `#F4F4F4` | Tailwind `slate-100` |

> ⚠️ Bizim yaşıl **`#15803D`** onlarınkından (`#27AE60`) nəzərəçarpacaq dərəcədə **tünddür və soyuqdur**. Bu qəsdi seçimdir (D1 token qatı) — kor-koranə dəyişmə, amma fərqi bil.

---

## 7. Bilərəkdən köçürülməməli
- **Mapbox** — bizdə MapLibre qalır (`DECISIONS.md`).
- **Gizli qiymət / yalnız $ valyuta** — bizdə şəffaf AZN.
- **NDVI rejim adlarının izahsız qalması** — onların zəifliyidir; bizdə hər rejimin altında bir sətir azərbaycanca izah olmalıdır.
- **Export-un paywall arxasında olması** — data sahibliyi siqnalı kimi bizdə pulsuz qalmalıdır.

---

## 8. Status
**2026-07-26: SƏNƏDLƏŞDİRMƏ TAMAM. İCRA QƏRARI VERİLMƏYİB.**
Screenshot və XML dump-ları sessiya scratchpad-indədir (kalıcı deyil).
