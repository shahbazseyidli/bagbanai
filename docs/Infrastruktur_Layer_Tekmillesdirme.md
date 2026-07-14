# İnfrastruktur Layer — Təkmilləşdirmə Sənədi

> Azercosmos **FarmerApp** (farmer.gis.az) platformasının canlı araşdırması əsasında Bağban AI-nin
> xəritə / peyk / GIS infrastruktur layer-inin təkmilləşdirilməsi planı.
> Tarix: 2026-07-13. Mənbə: `farmer.gis.az/map?area_id=722` canlı sessiya (alətlər paneli + şəbəkə trafiki analizi).

---

## 1. Xülasə

FarmerApp **Esri ArcGIS** korporativ GIS platforması üzərində qurulub: yüksək-dəqiqlikli peyk basemap
qalereyası, rəqəmsal relyef (elevation), ölçmə/çəkmə alətləri, sahə idxal/ixracı (GeoJSON/Shapefile/KML),
PDF/DOCX hesabatlar, rəsmi əkin-sahə (cadastre) FeatureServer layer-i və — **ən əsası** — sahəyə klikləyəndə
açılan **tam Sentinel-2 indeks-analiz suite-i** (bax §3.1). Bizim xəritə isə **yalnız OSM raster basemap** +
tək istifadəçi-poliqonu göstərir; İcmal tab-da yalnız bir NDVI **qrafiki** var (indicə düzəldildi), xəritədə
**heç bir peyk indeks rasteri** yoxdur.

> **Düzəliş (mühüm):** Bu sənədin ilk versiyasında "xəritədə NDVI raster overlay + tarix seçici bizim
> üstünlüyümüzdür, FarmerApp-də yoxdur" iddiası **səhv idi**. Sahə poliqonuna klikləyəndə FarmerApp-in
> **tam işləyən** raster-analiz paneli açılır: ~14 indeks, piksel-səviyyəli rəngli overlay + legend, səhnə
> timeline-ı (tarix + bulud %), bulud filtri, statistika qrafiki (ölkə ortası ilə benchmark) və iki tarixi
> yan-yana müqayisə. **Bu, bizim ən böyük boşluğumuzdur** — üstünlük yox, çatışmazlıq.

**Yaxşı xəbər:** Bu suite-in hamısını **pulsuz / self-hosted** texnologiyalarla (MapLibre + açıq tile
xidmətləri + bizim **TiTiler** + hazır HLS COG-ları) təkrar yarada bilərik. Bizdə artıq 9 indeks DB-də
hesablanıb; çatışmayan yalnız **raster tile servisi + xəritə UI-si**dir. ArcGIS lisenziyasına ehtiyac yoxdur.

---

## 2. FarmerApp — texniki arxitektura (şəbəkə trafiki analizi)

Səhifənin 765 şəbəkə sorğusunun analizi göstərdi ki, platforma tam **Esri stack**-dir:

| Komponent | Xidmət | Qeyd |
|---|---|---|
| Xəritə mühərriki | **ArcGIS Maps SDK for JavaScript** (WebGL) + Calcite Design System | asset adları: `layersCreator`, `portalLayers`, `FeatureService`, `CIMSymbolHelper`, `streamLayerUtils`, `GraphicsView2D`, `editingTools` |
| Peyk basemap | **Esri World Imagery** — `services/server.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}` | ~0.3–1 m dəqiqlik (Maxar/Earthstar) |
| Vektor basemap | **Esri World Basemap v2** — `basemaps.arcgis.com/.../World_Basemap_v2/VectorTileServer` | küçə/topo vektor |
| Relyef | **Esri WorldElevation3D / Terrain3D ImageServer** — `elevation3d.arcgis.com` | hündürlük/terrain |
| Google basemap | Google tile | "Google" basemap seçimi |
| **Öz datası** | **ArcGIS Enterprise (GIS Server)** — `gisserveriis.gis.az/gisserver/rest/services/FarmerApp/Cropfields_FarmerApp/FeatureServer` | əkin sahələri (parsel) layer-i, **token** autentifikasiyalı |

**Nəticə:** İnfrastruktur onların üstünlüyü kommersiya Esri məhsulu + dövlət ArcGIS serveridir. Biz bunu
lisenziya olmadan açıq alternativlərlə bağlaya bilərik (bax §6).

---

## 3. FarmerApp alətlər paneli — funksionallıq inventarı

Sol yan panel (yuxarıdan aşağı) və digər elementlər canlı yoxlanıldı:

| # | Alət (AZ) | Funksiya | Bizdə |
|---|---|---|---|
| 1 | **Axtar** (yuxarı) | Yer/məkan axtarışı (geocoding) | ❌ yox |
| 2 | ☰ **Menyu / Ərazilər** | Sahələr siyahısı | ⚠️ qismən (idarə paneli) |
| 3 | 📍 **Ərazilər** | Sahə siyahısı; hər sahədə 4 əməliyyat | ⚠️ qismən |
| 4 | ⛰️ **Ərazilər** (analiz) | Sahə kartları | ⚠️ qismən |
| 5 | ▢ **Alətlər** | Çəkmə: **Nöqtə / Poliqon / Məsafə** (hər biri rəng seçimi) + Çap + Sil | ⚠️ yalnız sahə çəkmə |
| 6 | 📅 **Təqvim** | Peyk datasının **tarixini** seçmək (zaman naviqasiyası, "Bu gün") | ❌ yox (xəritədə) |
| 7 | 📏 **Ölçmək** | **Sahə** (ha) və **Məsafə** (km) ölçmə, vahid dropdown | ❌ yox |
| 8 | ▦ **Xəritə növləri** | Basemap qalereyası: **Peyk, Hibrid, Tünd-boz, Küçə (gecə vektor), Topo, Google** | ❌ yox (yalnız OSM) |
| 9 | ⬇️ **Report** | Sahə + **tarix diapazonu** + qeyd → **PDF/DOCX** hesabat | ❌ yox |
| 10 | Koordinat oxunuşu | Canlı lon/lat (aşağı-sağ) | ❌ yox |

**Hər sahə üçün 4 əməliyyat ikonu:**
1. **İxrac** — sahə sərhədi: **GeoJSON / Shapefile / KML** ("Fayl tipini seçin")
2. **Xəritədə tap** (zoom-to)
3. **Redaktə** (həndəsə)
4. **Əkin mərhələləri** (fenologiya paneli — per-sahə böyümə mərhələləri)

**Portal (Home):** naviqasiya — *Haqqımızda · Ərazi · Xəritə · **Hava** (hava paneli: temp/rütubət/külək/təzyiq) · **Statistika***; dashboard-da şəkilli **SAHƏLƏR** qalereyası + "＋" ilə yeni sahə.

---

## 3.1 Sahə-analiz suite-i ⭐ (poliqona klik) — platformanın ürəyi

Mavi əkin-sahə poliqonuna **klikləyəndə** aşağıda tam analiz paneli açılır. Bu, platformanın ən güclü və
bizdə **tamamilə çatışmayan** hissəsidir:

1. **İndeks seçici (~14 Sentinel-2 məhsulu)** — dropdown:
   - *Bitki sağlamlığı* (**NDVI**), *Sıx ərazidə b.s.*, *Seyrək ərazidə b.s.* (**SAVI**),
     *Aerozollu atmosferdə b.s.* (**ARVI**), *Boş torpaq* (bare soil / **BSI**),
     *Təbii görüntü* (**true color RGB**), *False Color*, *Su yayılması* (**NDWI**),
     *Bitki nəmliyi* (**NDMI**), *Şoranlaşma* (salinity), *Şum* (tillage),
     *Yanmış ərazi* (**NBR**), *Atmospheric penetration*, *Burned area combination*.
2. **Piksel-səviyyəli raster overlay** — seçilən indeks sahə sərhədinə kəsilmiş rəngli raster kimi xəritə
   üzərinə çəkilir (Sentinel-2 ~10–20 m hüceyrələr). Sahədaxili dəyişkənlik (hansı zona zəifdir) birbaşa görünür.
3. **Legend** — "NDVI dəyərlər" −1.00 → 1.00, **Yüksək / Orta / Zəif** kateqoriyaları, qırmızı-sarı-yaşıl colormap.
4. **Səhnə timeline-ı** (aşağı) — mövcud peyk tarixləri + **bulud faizi** (məs. 2026-07-11 · 0%, 07-06 · 0.13%);
   tarixə klik → həmin günün rasteri.
5. **Tarix diapazonu** filtri (məs. 2026-03-13 → 2026-07-13).
6. 📊 **NDVI statistikası** qrafiki — **sahə ortası** (narıncı) + **min–maks zolağı** (yaşıl) +
   **ölkə üzrə orta göstərici** (mavi benchmark — sahəni milli ortalama ilə müqayisə edir).
7. **Müqayisə et** — *Birinci tərəf* / *İkinci tərəf* (indeks + tarix seçimi) → iki tarixi/indeksi **yan-yana**
   müqayisə (before/after dəyişiklik).
8. **Buludluğu təyin edin** — maks. bulud örtüyü slayderi (15–100%), timeline-ı təmiz səhnələrə süzür.

**Data mənbəyi (nəticə):** Sentinel-2 (10–20 m), server-tərəfdə çoxsaylı band-kombinasiyaları hesablanır və
raster tile kimi verilir (Sentinel Hub üslubu). Bizim analoqumuz: **NASA HLS** (Landsat 8/9 + Sentinel-2
birləşmiş, 30 m, daha tez-tez) — data artıq DB-də, çatışmayan yalnız **raster servis + UI**.

---

## 4. Bizim mövcud infrastruktur layer (Bağban AI)

`app/src/components/FieldMap.tsx` — MapLibre GL 4.7:

- **Basemap:** yalnız **OSM raster** (`tile.openstreetmap.org`) — küçə xəritəsi, sahələr üçün zəif.
- **Layer-lər:** tək istifadəçi poliqonu (fill + line). Rəsmi parsel / peyk / relyef layer-i yox.
- **Alətlər:** yalnız kliklə sahə çəkmə (native). Ölçmə, annotasiya, məsafə yox.
- **Temporal:** İcmal tab-da NDVI zaman-seriyası **qrafiki** var (yeni düzəldildi), amma **xəritədə raster** yox, tarix seçici yox.
- **İdxal/ixrac:** yox. **Axtarış/geocoding:** yox. **Koordinat oxunuşu:** yox. **Basemap keçidi:** yox.
- **Mövcud aktivlər:** `@turf/turf` 7.1 (ölçmə üçün hazır), `maplibre-gl`, deploy-da **TiTiler** profili (raster tile üçün hazır, hələ aktiv deyil).

---

## 5. Fərq analizi (Gap analysis)

| Funksionallıq | FarmerApp | Bağban AI | Prioritet |
|---|---|---|---|
| Yüksək-dəqiqlikli peyk basemap | ✅ Esri World Imagery | ❌ | **P0** |
| Basemap qalereyası + keçid | ✅ 6 basemap | ❌ | **P0** |
| Hibrid (peyk + etiketlər) | ✅ | ❌ | **P0** |
| Koordinat oxunuşu + miqyas | ✅ | ❌ | P1 (asan) |
| Ölçmə (sahə/məsafə + vahid) | ✅ | ❌ | P1 (turf hazır) |
| Çəkmə/annotasiya (nöqtə/xətt/poliqon + rəng) | ✅ | ⚠️ | P1 |
| Sahə idxal/ixrac (GeoJSON/KML/SHP) | ✅ | ❌ | P1 |
| Yer axtarışı (geocoding) | ✅ | ❌ | P2 |
| Relyef / hillshade | ✅ Terrain3D | ❌ | P2 |
| **Sahə-analiz suite-i (poliqona klik)** | ✅ tam (§3.1) | ❌ | **P0 ⭐ ən böyük boşluq** |
| ├ İndeks seçici (~14 məhsul) | ✅ | ⚠️ 9 DB-də, UI yox | P0 |
| ├ Piksel raster overlay + legend | ✅ | ❌ | P0 |
| ├ Səhnə timeline-ı + bulud % | ✅ | ❌ | P0 |
| ├ Bulud örtüyü filtri | ✅ | ❌ | P1 |
| ├ Statistika qrafiki + ölkə benchmark | ✅ | ⚠️ qrafik var, benchmark yox | P1 |
| └ İki tarixi müqayisə (before/after) | ✅ | ❌ | P1 |
| PDF/DOCX hesabat | ✅ | ❌ | P2 (Faza 2) |
| Rəsmi əkin-sahə (cadastre) layer | ✅ FeatureServer | ❌ | P3 (data asılı) |
| Fenologiya (əkin mərhələləri) | ⚠️ (boş) | ⚠️ (metadata) | P2 |

⭐ = platformanın ürəyi; bizim ən böyük çatışmazlığımız (üstünlük **deyil**).

---

## 6. Təkmilləşdirmə planı (pulsuz / self-hosted)

Bütün seçimlər açıq lisenziyalı və ya self-hosted-dir; ArcGIS/Google lisenziyası **tələb olunmur**.

### 6.1 — Basemap qalereyası + keçid  **[P0]**
MapLibre `style` obyektinə çoxlu raster/vektor mənbə əlavə edib bir "Xəritə növləri" kontrolü qururuq.
Tövsiyə olunan **pulsuz** basemap-lər (hər biri attribution ilə):

| Ad | URL şablonu | Qeyd |
|---|---|---|
| **Peyk (Esri World Imagery)** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | ~0.5–1 m, keysiz; attr: "Esri, Maxar, Earthstar" |
| **Sentinel-2 cloudless (EOX)** | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg` | 10 m, buludsuz, açıq (CC-BY); "təzə peyk" |
| **Hibrid** | Peyk + OSM etiket overlay (yuxarı şəffaf layer) | küçə/kənd adları peyk üzərində |
| **Küçə (OSM)** | mövcud | default |
| **Topo (OpenTopoMap)** | `https://a.tile.opentopomap.org/{z}/{x}/{y}.png` | relyef xətləri |

**İş:** `FieldMap.tsx`-i refaktor edib `BASEMAPS` reyestri + sağ-yuxarıda kiçik basemap seçici düymə/panel;
`localStorage`-da seçim yadda saxlanır. Həm `DrawMap`, həm `DisplayMap` eyni basemap-dən istifadə edir.

### 6.2 — Koordinat oxunuşu + miqyas paneli + naviqasiya  **[P1, asan]**
- MapLibre `mousemove` → aşağı-sağ lon/lat göstər (FarmerApp kimi).
- `maplibregl.ScaleControl` + mövcud `NavigationControl`.
- `GeolocateControl` (istifadəçinin yeri).

### 6.3 — Ölçmə aləti  **[P1, turf hazır]**
Yeni `MeasureControl`: kliklə xətt/poliqon, `@turf/area` və `@turf/length` ilə canlı **ha / km / m²**
göstər, vahid dropdown, təmizlə. (Artıq çəkmə məntiqi var — yenidən istifadə.)

### 6.4 — Çəkmə / annotasiya layer-i  **[P1]**
Mövcud native-draw-u genişləndir: **nöqtə / xətt / poliqon**, **rəng seçimi**, mətn etiketi, sil/təmizlə,
şəkil/GeoJSON ixracı. Sahə çəkmə ilə eyni bazadan.

### 6.5 — Sahə idxal / ixrac  **[P1]**
- **İxrac:** cari sahə poliqonu → **GeoJSON** (native), **KML** (`tokml`/`@placemarkio/tokml`), **Shapefile** (`shp-write`).
- **İdxal:** yeni sahə yaradarkən fayldan → GeoJSON/KML (`@tmcw/togeojson`), zip Shapefile (`shpjs`).
FarmerApp-in "Fayl tipini seçin" (GeoJson/Shape/KML) axını ilə eyni.

### 6.6 — Sahə-analiz suite-i (raster overlay + timeline + stats)  ⭐ **[P0 — ən vacib]**
FarmerApp §3.1 suite-inin **parite**si. Bizdə NASA HLS COG-ları (30 m, per-tarix, 9 indeks DB-də) var —
çatışmayan yalnız raster servis + UI. Alt-mərhələlər (FarmerApp-in hər elementinə uyğun):

- **Raster servisi:** **TiTiler**-i aktivləşdir (deploy profili hazır). HLS COG-larını **XYZ** kimi ver:
  - **true-color** (RGB kompozit), və hər indeks üçün **colorized** raster (NDVI/NDWI/NDMI… → colormap).
  - Sahə sərhədinə **kəsmə** (mask) + `rescale` (indeksin diapazonuna görə).
- **İndeks seçici** (§3.1.1): bizim 9 indeks (NDVI/EVI/SAVI/MSAVI/NDMI/NDWI/NBR/NBR2/TVI) + true-color;
  FarmerApp adları ilə AZ etiketlər ("Bitki sağlamlığı" = NDVI və s.).
- **Xəritə overlay + legend** (§3.1.2–3): seçilən indeks rasteri sahə üzərinə (opacity slayderi) + Yüksək/Orta/Zəif legend.
- **Səhnə timeline-ı** (§3.1.4): `scenes` cədvəlindən tarixlər + bulud % (`cloud_pct`); tarixə klik → həmin raster.
- **Bulud filtri** (§3.1.8): maks bulud % slayderi (timeline-ı süzür).
- **Statistika qrafiki** (§3.1.6): İcmal qrafikini genişləndir — sahə ortası + **min–maks zolağı** (p10–p90, artıq var)
  + sonradan **ölkə/rayon ortası benchmark** (milli NDVI ortalaması hesablanıb saxlanır — P1/P2).
- **Müqayisə** (§3.1.7): iki tarixin raster-lərini **swipe/split** (MapLibre `maplibre-gl-compare` üslubu).

**Nəticə:** fermer NDVI **rəqəmini** yox, sahənin **NDVI xəritəsini** (problemli zonalar harada) və zamanla
dəyişməsini görür — FarmerApp ilə eyni səviyyə, pulsuz HLS datası ilə.

### 6.7 — Yer axtarışı (geocoding)  **[P2]**
Self-host **Photon** (Komoot) və ya **Nominatim** (OSM) — pulsuz; Azərbaycan üçün yaşayış məntəqəsi axtarışı.
Sadə versiya: birbaşa OSM Nominatim API (attribution + rate limit).

### 6.8 — Relyef / hillshade  **[P2]**
MapLibre terrain: **AWS Terrain Tiles** (Terrarium, pulsuz) və ya MapTiler DEM (freemium) ilə hillshade/3D.

### 6.9 — Hesabatlar (PDF/DOCX)  **[P2 — Faza 2]**
Per-sahə + tarix diapazonu hesabat: NDVI qrafiki + orta/min/maks + xəritə şəkli + qeyd → **PDF** (server-side).
Bu, roadmap-də onsuz da Faza 2-dədir.

### 6.10 — Rəsmi parsel / cadastre layer  **[P3 — data asılı]**
Əgər dövlət açıq WMS/WFS və ya AKTA parsel datası əldə olunarsa, referans layer kimi əlavə et
(istifadəçi öz sahəsini rəsmi parselə uyğunlaşdıra bilsin). Data giriş razılığı tələb edir.

---

## 7. Texniki qeydlər

- **Lisenziya/attribution:** Esri World Imagery və EOX Sentinel-2 attribution tələb edir (xəritədə göstər).
  Google/Bing basemap **əlavə etmirik** (lisenziya/keyли). Hər şey pulsuz limitlərdə.
- **Xərc:** əlavə server xərci ≈ 0 — TiTiler artıq bizim Hetzner-də (compose profili), basemap-lər xarici pulsuz CDN.
- **Performans:** raster tile keş (nginx `proxy_cache` və ya TiTiler mosaic) tövsiyə olunur.
- **Yenidən istifadə:** `FieldMap.tsx` refaktoru bütün xəritələr üçün ümumi `BASEMAPS` + kontrol modulu yaratsın.

---

## 8. Prioritet / Roadmap

**Sprint 1 (P0 — dərhal görünən fərq):**
1. Basemap qalereyası + keçid (Esri Peyk + Sentinel-2 + Hibrid + OSM + Topo) — §6.1
2. Koordinat oxunuşu + miqyas + geolokasiya — §6.2

**Sprint 2 (P0 ⭐ — ən böyük boşluq, sahə-analiz suite-i):**
3. TiTiler raster servisi (true-color + colorized indekslər, sahə maskası) — §6.6
4. Xəritə overlay + indeks seçici + legend + opacity — §6.6
5. Səhnə timeline-ı (tarix + bulud %) + bulud filtri — §6.6

**Sprint 3 (P1 — praktiki alətlər + analiz tamamlama):**
6. Ölçmə aləti (ha/km) — §6.3
7. Çəkmə/annotasiya + rəng — §6.4
8. Sahə idxal/ixrac (GeoJSON/KML/SHP) — §6.5
9. İki tarixi müqayisə (swipe) — §6.6

**Sonra (P2–P3):** ölkə/rayon benchmark, geocoding, hillshade, PDF hesabat (Faza 2), cadastre layer, fenologiya.

---

### Əlavə: FarmerApp müşahidə xülasəsi
- Stack: Esri ArcGIS JS SDK + Calcite; data ArcGIS Enterprise (`gisserveriis.gis.az`).
- Basemap: Esri World Imagery/Basemap v2, Terrain3D, Google.
- Alətlər: Axtar, Ərazilər, Çəkmə (nöqtə/poliqon/məsafə+rəng), Təqvim, Ölçmək (ha/km), Xəritə növləri (6),
  Report (PDF/DOCX + tarix), koordinat oxunuşu; per-sahə: ixrac (GeoJSON/SHP/KML), zoom, redaktə, əkin mərhələləri.
- **Sahə-analiz suite-i (poliqona klik) ⭐:** ~14 Sentinel-2 indeks, piksel raster overlay + legend,
  səhnə timeline-ı (tarix + bulud %), bulud filtri, NDVI statistika qrafiki (ölkə benchmark), iki tarixi müqayisə.
- Portal: Haqqımızda / Ərazi / Xəritə / Hava / Statistika + SAHƏLƏR qalereyası.
