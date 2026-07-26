# OneSoil ⟷ Agradex — funksiya-bə-funksiya qarşılıq cədvəli

> **Necə çıxarılıb:** OneSoil tərəfi Pixel 9 Pro-da `adb` ilə canlı ölçülüb (`ONESOIL_SCREEN_INVENTORY.md`, 40 ekran). Agradex tərəfi **9 paralel agentlə kodda axtarılıb**, sonra hər «bizdə yoxdur» iddiası **ayrıca əks-yoxlama agenti** ilə rədd edilməyə çalışılıb (49 iddiadan 3-ü qismən rədd edildi — aşağıda §Düzəlişlər).

> **Bütün fayl:sətir istinadları agentlərin kodda tapdığıdır.** Sənəd yazıldığı andakı `main` vəziyyətini əks etdirir — kod dəyişsə istinadlar sürüşə bilər.

> ⚠️ Bu sənəd **nə etmək lazım olduğunu demir** — yalnız *nə olduğunu* sənədləşdirir. Prioritetləşdirmə ayrıca qərardır.

> **Dil haqqında:** başlıq və statuslar azərbaycanca, **gövdə mətni ingiliscədir**. Bu qəsdidir — mətn 9 araşdırma agentinin xam çıxışıdır və hər cümlə konkret `fayl:sətir` istinadı daşıyır; tərcümə həm dəqiqliyi itirər, həm də sənədi istehlak edəcək növbəti agent üçün faydasızdır. Repo qaydası (`CLAUDE.md`) prozanın azərbaycanca olmasını tələb edir — bu fayl **avtomatik yaradılmış istinad materialıdır**, əl ilə yazılmış sənəd deyil, ona görə istisnadır.


---

## Yekun mənzərə

**186 qabiliyyət** 9 funksional sahədə müqayisə edilib:

| Status | Say | Pay |
|---|---:|---:|
| ✅ VAR | 59 | 31% |
| 🟡 QISMƏN | 58 | 31% |
| ❌ YOX | 49 | 26% |
| 🔷 QƏSDƏN FƏRQLİ | 20 | 10% |

- **✅ VAR** — funksional ekvivalent mövcuddur (görünüşü fərqli ola bilər)
- **🟡 QISMƏN** — var, amma maddi şəkildə zəif və ya başqa yerdə/başqa formada
- **❌ YOX** — kodda heç nə tapılmadı (əks-yoxlamadan keçib)
- **🔷 QƏSDƏN FƏRQLİ** — bizdə açıq qərarla başqa cür edilib (sənədləşdirilmiş səbəbi var)

---


## A. Xəritə evi və xəritə kontrolları

### Add-note-pin button (drop a note on the map) — ❌ YOX

**Bizdə:** No map interaction anywhere places a note/pin. The nearest counterpart is `/places` (“Yerlər”, B16), and it renders NO map: `app/src/app/places/page.tsx` imports no maplibre — a place is created from typed lat/lon inputs (`places/page.tsx:112-113, 218-222`), from the device location button (`places/page.tsx:193-201`), or from a `?lat=&lon=` handoff (`places/page.tsx:135-141`). Backing store is real: `services/app/routers/places.py` over `public.map_places` (Point/LineString/Polygon, kinds building/water/storage/hazard/road/other, migration 0040). Scouting notes capture GPS but only as text: `app/src/components/field/ScoutingTab.tsx:26, 57-63, 82-83` posts `lat`/`lon`, and `ScoutingTab.tsx:180-183` prints them as `40.12345, 48.55432`.

**Qeyd:** Two traps here. (1) The `?lat=&lon=` map-centre handoff documented at `places/page.tsx:135` has NO caller — `grep '"/places'` across `app/src` returns only `middleware.ts:20` (route list) and `app/src/app/more/page.tsx:27` (the menu row). The feature is half-wired: the receiving end exists, nothing hands over. (2) `/places` is reachable only from `/more`; it is not in the rail (`AppRail.tsx:70-76` says “Yerlər → /more”) nor in the bottom nav. So we have the notes DATA MODEL and CRUD but none of the map affordance, and the entry point is buried two taps deep.

### Group + season selector pill on the map (opens a bottom sheet) — 🟡 QISMƏN

**Bizdə:** Split across two places and neither is on a map. Org (≈“group”) switcher: a plain `<select>` in `app/src/components/home/TodayHome.tsx:263-274`, rendered ONLY when `orgs.length > 1`, so the single-org smallholder never sees it. Season: a READ-ONLY row in the desktop field-list column — `app/src/components/shell/FieldListPanel.tsx:445-457` renders `{t("…seasonLabel")} {season}` plus `{total} sahə · {formatArea(areaTotal, areaUnit)}`, where `const season = new Date().getFullYear();` (`FieldListPanel.tsx:370`). There is no control to change it.

**Qeyd:** Selectable seasons DO exist elsewhere, just never as a global map filter: `/reports` has a season dropdown (`app/src/app/reports/page.tsx:85,156`), and per-field `YieldsTab.tsx:32` / `SeasonTab.tsx:112` default to the current year. The `field_seasons` entity is real server-side (`services/app/routers/seasons.py`, migration 0034) — the gap is purely the global selector UI. Also note the season row lives in `FieldListPanel`, which is `xl:flex` / hidden below (`FieldListPanel.tsx:422`), i.e. ≥1280px only — invisible on mobile and on laptops under xl.

### Search button as a map overlay control (top-right circle) — 🟡 QISMƏN

**Bizdə:** No circular map-overlay search button anywhere. Search exists in two unrelated forms. (a) A geocoding form rendered ABOVE the map inside the draw map: `app/src/components/FieldMap.tsx:111-181` (`SearchControl`), mounted at `FieldMap.tsx:454-456` with the comment “Search lives ABOVE the map so it never collides with the draw toolbar or the zoom/geolocate controls”; also mounted inside `DisplayMap` at `FieldMap.tsx:728`. (b) A client-side field-name filter in the desktop field-list column: `app/src/components/shell/FieldListPanel.tsx:486-521` (input) filtering at `FieldListPanel.tsx:347-350`. The home map component itself has NO search: `app/src/components/FieldsOverviewMap.tsx:197` adds only `NavigationControl({showCompass:false})`.

**Qeyd:** There is no `/search` route (nothing under `app/src/app/`). The Nominatim search is hard-limited to Azerbaijan: `app/src/components/FieldMap.tsx:123` — `…/search?format=jsonv2&limit=5&countrycodes=az&q=…` with `headers: { "Accept-Language": "az" }` (line 124). With 8 UI locales live (tr/de/hu/it/pl/ru/en), a non-Azerbaijani farmer searching their own village gets zero results — a real parity hole, not a styling difference. `settings.nominatim_base` exists in `services/app/config.py` but the frontend hardcodes the public host and never proxies through it.

### Add-field button as a map overlay control (top-right circle) — 🟡 QISMƏN

**Bizdə:** Add-field is everywhere EXCEPT on a map. Mobile centre FAB in the bottom nav: `app/src/components/BottomNav.tsx:62-68` — `<Link href="/onboarding" … className="mx-1 -mt-5 flex h-14 w-14 … rounded-full bg-emerald-600"><Plus className="h-7 w-7"/></Link>`. Page-header button on `/fields`: `app/src/app/fields/page.tsx:261-263`. Inline links on home: `app/src/components/home/TodayHome.tsx:348-350, 356-358`. Empty-state button in the list panel: `app/src/components/shell/FieldListPanel.tsx:550-555`. The destination `/onboarding` then renders the real drawing map (`app/src/components/field/FieldOnboarding.tsx:13, 496-502` → `DrawMap` with `detectMode`/`brushMode`). `FieldsOverviewMap` exposes no add control.

**Qeyd:** The 56px FAB is a close visual analogue of the competitor's 48dp circle, but it sits in the nav bar, not on a map, and it is `md:hidden` (BottomNav.tsx:57) — desktop users add fields only from the page header or the rail's destinations. Our drawing surface is richer than a single add button implies: tap-to-add vertices, freehand brush/lasso (`FieldMap.tsx:339-420`), tap-to-detect boundary via the geoapi microservice (`FieldMap.tsx:299-311` → `services/app/routers/geo.py` `/api/geo/segment`), and GeoJSON/KML/shapefile import (`FieldCreator.tsx:34-52`).

### Global layer selector pill ("Satellite image / Vegetation") — 🟡 QISMƏN

**Bizdə:** No single global imagery-vs-index toggle. Two separate, differently-scoped controls. (1) Basemap gallery, a bottom-left pill on the FIELD maps only: `app/src/components/FieldMap.tsx:50-107` (`BasemapControl`, mounted at `FieldMap.tsx:466` and `729`), offering the 5 basemaps in `app/src/lib/basemaps.ts:22-59` (Hibrid / Peyk / Buludsuz peyk (EOX s2cloudless) / Küçə (OSM) / Topo) plus a hillshade toggle (`basemaps.ts:127-156`); the choice persists in localStorage (`basemaps.ts:62-75`). (2) Vegetation-index selection is PER FIELD, not global: a 9-item `<select>` in `app/src/components/field/SatelliteTab.tsx:377-381` and three chips (NDVI/NDMI/NDRE) in `app/src/components/field/overview/SatelliteGlance.tsx:104-119, 25`. The home/overview map has NO layer control at all — it silently reads the stored basemap once: `app/src/components/FieldsOverviewMap.tsx:212` — `applyBasemap(map,…

**Qeyd:** Consequence for the table: our home map can never show a vegetation layer. It paints flat polygons coloured by the stored 0-100 wellness score (green/amber/red) falling back to processing status (`FieldsOverviewMap.tsx:42-59, 90-93`) — not pixel imagery. Pixel-level index rasters (TiTiler COGs) exist only inside a single field's view (`FieldMap.tsx:617-649` `applyRaster`). Also relevant: `app/src/lib/sensors.ts:17` `HLS_ENABLED = false` removed NASA HLS from every user surface (data layer untouched), so the only sensor a farmer can pick is Sentinel-2 — `<SatelliteTab sensor="S2" />` is hard-coded on the field page.

### Locate-me button (bottom-right circle) — 🟡 QISMƏN

**Bizdə:** A MapLibre `GeolocateControl` exists on exactly one of our four map constructions — the drawing map: `app/src/components/FieldMap.tsx:257` — `map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");`. It is absent from `DisplayMap` (`FieldMap.tsx:527-528` adds only Navigation + Scale), from `FieldsOverviewMap` (`FieldsOverviewMap.tsx:197`) and from `ZonesTab` (`app/src/components/field/ZonesTab.tsx:160-161`). Raw `navigator.geolocation` is used as a form button in two non-map screens: `app/src/app/places/page.tsx:193-201` and `app/src/components/field/ScoutingTab.tsx:57-63`.

**Qeyd:** So the one map a farmer would want to centre on themselves (the home overview) cannot do it; the one that can is the boundary-drawing map, where it is genuinely useful. Placement also differs: ours is top-right (stacked under the zoom control), the competitor's is a bottom-right 48dp circle. Everything is default MapLibre chrome — no custom-styled circular buttons anywhere.

### Vertical colour legend on the map edge when an index layer is active — 🟡 QISMƏN

**Bizdə:** We render legends, but horizontally and BELOW the map, never as a map-edge strip. Index ramp: `app/src/components/field/SatelliteTab.tsx:100-122` (`IndexLegend` — gradient bar + low/mid/high words + the ACTUAL rescale numbers in use), mounted at `SatelliteTab.tsx:495` (compare) and `513` (single). Glance ramp: `app/src/components/field/overview/SatelliteGlance.tsx:142-148`. The only IN-map legend is on the home/overview map and it describes something else entirely — wellness score bands + processing status, bottom-left, listing only the classes actually drawn: `app/src/components/FieldsOverviewMap.tsx:317-356`.

**Qeyd:** Our legend is arguably more honest than a fixed strip: it prints the real rescale range and switches wording when per-scene contrast stretch is on (`SatelliteTab.tsx:115-119` `contrastOnHint` vs `fixedRangeHint`), and index-adaptive vocabulary (Zəif/Orta/Sağlam for vegetation, Quru/Orta/Nəm for water indices) comes from `legendFor()` in `app/src/lib/indexStatus.ts`. But there is no legend on the home map for any index, because the home map has no index layer.

### Bottom navigation bar with 5 destinations — 🟡 QISMƏN

**Bizdə:** `app/src/components/BottomNav.tsx` — 4 destinations plus the centre FAB: `BottomNav.tsx:46-53` — LEFT `{ "/" Bu gün, Home }`, `{ "/fields" Sahələr, Sprout }`; RIGHT `{ "/farm" Təsərrüfat, Tractor }`, `{ "/more" Daha çox, LayoutGrid }`. Rendered at `BottomNav.tsx:55-71`. Mobile only — `md:hidden` (`BottomNav.tsx:57`); desktop gets the left icon rail `app/src/components/shell/AppRail.tsx:77-95` (Bu gün · Sahələr · Təsərrüfat · Hesabatlar · Daha çox, plus Bildirişlər/Hesab pinned at the bottom).

**Qeyd:** No Map tab (we have no map destination), no Weather tab (weather is a per-field section, `app/src/lib/fieldSections.ts:52` `{ key: "weather" }`, plus the `WeatherBar` strip on home), no Notes tab (see the note-pin row), no Profile tab (profile lives under `/more` → `/account`, `app/src/app/more/page.tsx:37`). The count was deliberately cut from 11 to 5 — see `AppRail.tsx:70-76` and CLAUDE.md “/farm birləşməsi”. ⚠️ Two more destinations are BUILT AND HIDDEN behind a flag: `app/src/lib/navFlags.ts:16` `SHOW_MARKETPLACE_NAV: boolean = false` hides `/catalog` and `/chat` from rail, bottom nav and /more — routes, API and components are live and a direct link still works.

### Search by field name, place name, or coordinates (one search screen) — 🟡 QISMƏN

**Bizdə:** Three fragments, no unified screen. Field names: client-side substring filter, desktop-only column — `app/src/components/shell/FieldListPanel.tsx:493-503` (input) and `FieldListPanel.tsx:347-350` — `sorted.filter(r => r.name.toLocaleLowerCase("az").includes(term))`, inside a `nav` that is `xl:flex` (line 422), so it does not exist below 1280px. Place names: Nominatim submit-only search inside the field maps, `app/src/components/FieldMap.tsx:117-143`, results fly the map to the pick (`FieldMap.tsx:437-442`). Coordinates: never in a search box — only as a field-creation input mode (`app/src/lib/geo.ts:53-69` `parseCoordinates`, used by `app/src/components/FieldCreator.tsx:55-60`) and as the two lat/lon fields on `/places` (`app/src/app/places/page.tsx:112-113`).

**Qeyd:** A mobile user has NO field-name search at all — the only field search lives in the xl-and-up panel. The place search is Azerbaijan-locked (`countrycodes=az`, `FieldMap.tsx:123`) despite 8 live locales. Nothing parses a pasted `40.12, 48.55` into a map jump.

### Full-screen map as the home tab — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** On the app host `/` renders TodayHome, a scrolling card feed, never a map: `app/src/app/page.tsx:42-45` — `if (!appHost) return <Landing />; if (loading) return <Spinner />; if (!user) return <Landing />; return v2 ? <TodayHome /> : <Dashboard />;`. TodayHome's own layout (`app/src/components/home/TodayHome.tsx:240-372`) is greeting → WeatherBar → AttentionHero → alert strip → map section → FieldGrid → TodayTasks. The map is one 380px block, explicitly desktop-only: `app/src/components/home/TodayHome.tsx:332-341` — `<section className="hidden md:block">…<div className="h-[380px]"><FieldsOverviewMap …/></div></section>`. So on a phone (the competitor's form factor) the home screen contains NO map at all.

**Qeyd:** Two deliberate reversals a comparison writer must not miss. (1) A map-first shell WAS built (D2.3 `FieldMapSheet` = full-bleed map + draggable 3-snap sheet) and has been gutted: `app/src/components/field/FieldMapSheet.tsx:5-13` — “It began as a full-bleed map with a draggable bottom sheet… Nothing here renders a map any more, and nothing here reads the field.” (2) The multi-field map hero on `/fields` was deleted on 2026-07-26, commit `800597e feat(fields): drop the map from the list screen, add per-row share` — rationale in `app/src/app/fields/page.tsx:3-6` (“on this screen it answered a question nobody was asking”). ⚠️ Stale code comments still describe the old world and will mislead:…

### Map-first field detail (full-bleed map + bottom sheet) — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** Removed in two documented steps and now the field page opens on a verdict, not on scenery. `app/src/components/field/FieldMapSheet.tsx:5-13`: “It began as a full-bleed map with a draggable bottom sheet (mobile) / fixed right sidebar (desktop); the narrow ~440px column made the labels and controls cramped… Then E14 removed the hero map from the top of it as well… Nothing here renders a map any more.” What survives in the wrapper is the vertical rhythm and the camera FAB (`FieldMapSheet.tsx:42-54`). The map that remains on the field's default section is a right-sized card: `app/src/components/field/overview/SatelliteGlance.tsx:128-149` (DisplayMap + fixed ramp + date strip), with the full workbench one click away in the `satellite` section (`app/src/lib/fieldSections.ts:47`).

**Qeyd:** For the table: this is our explicit counter-position to “map is the primary surface”. Section order on the field page is RainNowcast → FieldPulse → SatelliteGlance → SignalsActions → ShareButton, and the taxonomy is 16 sections in 3 groups (`app/src/lib/fieldSections.ts:40-77`). Section nav is horizontal chips below xl (`app/src/app/fields/[id]/page.tsx:244-245`, `xl:hidden`) and the left-panel `FieldSectionMenu` at xl+ (`FieldListPanel.tsx:482`). Also note `SatelliteGlance` respects the data-saver toggle and will NOT fetch the raster on a metered connection until asked (`SatelliteGlance.tsx:46-48, 130-140`) — a deliberate difference from an always-on map home.

### Bottom-nav visual treatment: always-visible labels + green pill active indicator — ✅ VAR

**Bizdə:** `app/src/components/BottomNav.tsx:13-28` — every item renders its label unconditionally at `text-[11px] font-bold`, and the active state is a pill behind the icon: `className={"flex h-7 items-center rounded-full px-3 " + (active ? "bg-emerald-50" : "")}` with `active ? "text-emerald-700" : "text-slate-500"` on the item. Touch target is `min-h-14` (56px, above the 48dp bar). Active matching is segment-boundary safe: `BottomNav.tsx:38-39` — `pathname === href \|\| pathname.startsWith(href + "/")`.

**Qeyd:** This is the one row where we match the competitor's Material 3 treatment essentially exactly (mint/emerald pill + persistent labels), just with 4 slots + FAB instead of 5 slots. `aria-current="page"` is set (`BottomNav.tsx:17`) and the bar respects `env(safe-area-inset-bottom)` (line 57). Note the bar is suppressed on the marketing apex: `BottomNav.tsx:35` — `if (!user \|\| !appHost) return null;`.

### Tap a field on the map to open it — ✅ VAR

**Bizdə:** `app/src/components/FieldsOverviewMap.tsx:235-240` — `map.on("click", "fields-fill", (e) => { const id = e.features?.[0]?.properties?.id; if (id) router.push(`/fields/${id}`); })` plus pointer-cursor mouseenter/mouseleave. The map auto-fits every drawn ring (`FieldsOverviewMap.tsx:117-131` `fitTo`, `padding: 44, maxZoom: 15`) and refits only when the field SET changes, never when scores arrive (`FieldsOverviewMap.tsx:281-293`).

**Qeyd:** Fully working — but only reachable on `hidden md:block` home (TodayHome.tsx:333) and in `/admin` (`app/src/app/admin/page.tsx:803`). Data comes from one org-wide call `GET /api/fields/geo` (`services/app/routers/fields.py:105-125`, returns geom + centroid + data_status), and colours from one more org-wide read model `GET /api/orgs/{id}/wellness` (`FieldsOverviewMap.tsx:164-183`) — never per-field requests.

### Basemap gallery, hillshade, scale bar, live coordinate readout, measure tool — ✅ VAR

**Bizdə:** Beyond the competitor's surface. Basemap picker + hillshade toggle: `app/src/components/FieldMap.tsx:50-107`, sources in `app/src/lib/basemaps.ts:22-59` and `basemaps.ts:122-156` (keyless AWS Terrarium DEM). Scale bar: `FieldMap.tsx:258` and `528` (`ScaleControl({maxWidth:120, unit:"metric"})`, T19). Live lon/lat + attribution readout bottom-right: `FieldMap.tsx:183-192` (`CoordBar`) fed by `map.on("mousemove", …)` (`FieldMap.tsx:260-262`). Measure distance/area (turf): `FieldMap.tsx:497-506, 533-556, 705-727`, area rendered in the farmer's own unit via `formatArea(…, areaUnit)` (line 720). Two-date swipe compare: `FieldMap.tsx:760-900` (`CompareMap`, synced maps + draggable clip divider).

**Qeyd:** Attribution is a licence obligation, not decoration — EOX s2cloudless is CC BY-NC-SA (`basemaps.ts:42`) and the Copernicus notice is required; do not describe these as removable chrome. Also mandatory for any new map we build: every MapLibre construction must be gated by `app/src/lib/useMapReady.ts` (used at `FieldMap.tsx:234, 503, 782`, `FieldsOverviewMap.tsx:161, 188`, `ZonesTab.tsx`) — a map built in a background tab never loads its style, fires no `load`, requests no tiles and throws NO error. There are currently 5 gated constructions.


## B. Qat / indeks seçicisi və render rejimləri

### Real preview images on the layer tiles (3x2 grid) — ❌ YOX

**Bizdə:** `BasemapControl` renders a 2px coloured dot + a text label per row: FieldMap.tsx:78-84 (`<span className={...rounded-full ...}` then `{basemapLabel(b)}`). The index picker is plain `<option>` text (SatelliteTab.tsx:378-380). No thumbnail, sprite or preview image exists in any picker; searched FieldMap.tsx, SatelliteTab.tsx, SatelliteGlance.tsx, ZonesTab.tsx, FieldsOverviewMap.tsx, lib/basemaps.ts.

**Qeyd:** IMPORTANT for the table: the machinery to do this already exists and is used elsewhere. The FIELD LIST renders a real per-field NDVI preview PNG straight from TiTiler — app/src/app/fields/page.tsx:101-125 (`FieldThumb`, `imageRendering: pixelated`) fed by `preview_url()` at services/app/routers/indices.py:76-79 (`/titiler/cog/preview.png?...&max_size=128`). So per-layer previews are a UI-composition gap, not a data/render gap.

### "No Fill" layer (basemap only, no data overlay) — ❌ YOX

**Bizdə:** No user-selectable "none" option in either picker. `BASEMAPS` (app/src/lib/basemaps.ts:22-59) has 5 entries and none is "no fill"; `SENSOR_INDICES.S2` (app/src/lib/sensors.ts:77-80) has 10 indices and no null option. The raster is applied unconditionally whenever a scene exists: SatelliteTab.tsx:500 `<DisplayMap polygon={field.geom} rasterUrl={rasterUrl} />`.

**Qeyd:** Two near-misses, both incidental rather than a layer choice: (a) data-saver mode withholds the raster behind a tap-to-load button — SatelliteGlance.tsx:83 `const rasterVisible = !dataSaver \|\| showRaster;` and 130-140; (b) `DisplayMap` with `rasterUrl={null}` draws outline-only (FieldMap.tsx:626-628 removes the layer), which is what the share page and the draw map show. Neither is reachable as "pick No Fill". There is also no raster-opacity control: `rasterOpacity` is a prop defaulting to 0.85 (FieldMap.tsx:478, 644) that NO caller ever passes.

### "Crop" layer (field polygons coloured by crop) — ❌ YOX

**Bizdə:** No map in the app paints by crop. The only multi-field map, `FieldsOverviewMap`, colours by wellness-score band then falls back to processing status: /Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/FieldsOverviewMap.tsx:42 `const BAND_COLOR: Record<Band,string> = { good: "#15803D", warn: "#B45309", bad: "#B91C1C" }`, :55-59 `STATUS_COLOR`, :90-93 `colorOf()`. Grep for `crop_type` in FieldsOverviewMap.tsx, shell/FieldListPanel.tsx and app/fields/page.tsx: zero hits.

**Qeyd:** `crop_type` is stored and used heavily elsewhere (crop-calibrated index norms via GET /api/fields/{id}/norms, services/app/routers/indices.py:181-190; share card, shares.py) — it is simply never a cartographic dimension. The comparison table should note our overview map answers "which field needs me" (score), OneSoil's answers "what is planted where".

### Sub-mode: Average NDVI (multi-date composite as a map layer) — ❌ YOX

**Bizdə:** No averaged/composite raster is ever rendered on a map. Every raster the UI draws is ONE scene: `/api/fields/{id}/scenes` returns one row per acquisition date (services/app/routers/indices.py:359-375, `distinct on (r.acquired_at)` picking the least-cloudy) and the UI picks one by index (SatelliteTab.tsx:250 `activeScene`).

**Qeyd:** Averaging exists as NUMBERS and as INPUT, never as a layer: the trend chart plots per-date field means (SatelliteTab.tsx:274-296), `field_season_features` stores NDVI peak/mean/integral (migration 0028), and ZonesTab's productivity zones are literally built from a multi-season mean composite inside services/geo_pipeline/zones.py. So the pixels for an "Average" layer are computed and then discarded rather than published as a COG.

### Sub-mode: Heterogenity NDVI — ❌ YOX

**Bizdə:** No within-field variability raster. Nothing in app/src renders std/CV per pixel.

**Qeyd:** Closest equivalent, and it is a number not a map: ZonesTab reads `homogeneity_cv` / `homogeneity_class` off the zone run (app/src/components/field/ZonesTab.tsx:38-39) and turns them into a one-sentence verdict (:384-390, rendered :475-478). The satellite chart also draws the in-field p10–p90 spread as two pale lines (SatelliteTab.tsx:405-406) — variability over time, not over space. A person writing the table should say: we quantify heterogeneity, we never paint it.

### "Labels" row — a chosen number printed on each field polygon — ❌ YOX

**Bizdə:** No map in the app has a `symbol` layer or a `text-field` paint property. Every `addLayer` call across the codebase is fill / line / circle / raster / hillshade: FieldMap.tsx:292-295, 566-596, 639-646, 739, 754; FieldsOverviewMap.tsx:215-228; ZonesTab.tsx:167-190; basemaps.ts:110,118,146. The only text on any map comes from the Esri reference RASTER tiles in the `hybrid` basemap (basemaps.ts:9-10,111-119) — place names, not field values.

**Qeyd:** Highest-confidence MISSING in this area, and there is no dormant implementation behind a flag. On the overview map a field's score is discoverable only by clicking through (FieldsOverviewMap.tsx:235-238 routes to /fields/{id}); the map's own legend (:317-355) names the colour classes but never a per-field number. Note the legend does have a good property worth citing back: it lists ONLY the classes actually drawn (:296-310), "so it can never claim a meaning the map is not showing".

### Layer picker reachable from the multi-field / overview map — ❌ YOX

**Bizdə:** `FieldsOverviewMap` mounts no picker at all — it calls `applyBasemap(map, getSavedBasemap())` once inside `draw()` (app/src/components/FieldsOverviewMap.tsx:212) and adds only NavigationControl (:197). Same for `ZonesTab` (:165, control at :160-161) and `CompareMap` (FieldMap.tsx:808).

**Qeyd:** So the basemap a farmer picks on a field map silently applies to the overview map, but can only be CHANGED from a field map. Where the overview map lives also matters for the comparison: it was REMOVED from /fields (see the file header comment at app/src/app/fields/page.tsx:3-6 — "the multi-field map that used to be the hero was removed (E15)") and now survives only on the desktop home (`TodayHome.tsx:331-340`, wrapped in `hidden md:block`) and the admin page (app/src/app/admin/page.tsx:803). On mobile there is effectively no multi-field map.

### Dedicated "Map layer" picker surface (bottom sheet) — 🟡 QISMƏN

**Bizdə:** We have TWO unrelated pickers, neither a sheet. (1) Basemap picker: `BasemapControl` in /Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/FieldMap.tsx:50-107 — a small popover anchored `absolute bottom-3 left-3` over the map (line 63), opened by a pill with the lucide `Layers` icon (lines 98-104), rendering a vertical `w-48` list. It picks the BACKGROUND imagery only. (2) Data-layer (index) picker: a native `<select className="input">` inside the satellite section, /Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/SatelliteTab.tsx:376-382, under the heading `t("idx.title")` = "Satellite indices" / label `t("idx.select")` = "Select index" (app/src/lib/locales/en.ts:127-128).

**Qeyd:** There is no bottom-sheet UI primitive anywhere in the app. `FieldMapSheet.tsx` sounds like one but its own header (lines 5-13) records that the draggable bottom sheet was ABANDONED — the ~440px column was too cramped — and E14 then removed the hero map too; the file is now a 57-line layout shell with no map and no fetch. So "sheet" is a rejected pattern, not a missing one. `BasemapControl` is only mounted on DrawMap (FieldMap.tsx:466) and DisplayMap (FieldMap.tsx:729); CompareMap, FieldsOverviewMap (line 212) and ZonesTab (line 165) silently consume `getSavedBasemap()` with no picker of their own.

### Selected-tile visual state — 🟡 QISMƏN

**Bizdə:** Basemap picker: filled emerald dot + `font-semibold text-emerald-700` on the active row (FieldMap.tsx:74-82). Index chips in the status-section glance: emerald border + mint background + `aria-pressed` (app/src/components/field/overview/SatelliteGlance.tsx:106-118). Scene-date chips and the Contrast/Compare toggles use the same `border-emerald-600 bg-emerald-50 font-semibold` treatment (SatelliteTab.tsx:454-456, 462-464, 534-536).

**Qeyd:** The main index picker in the satellite section has NO tile/chip state at all — it is a native `<select>`, so selection is whatever the OS renders. The chip pattern only exists in the reduced 3-index glance.

### "Satellite image" layer (dated true-colour RGB of the field) — 🟡 QISMƏN

**Bizdə:** We serve satellite BASEMAPS, not the field's own true-colour scene: `hybrid` and `satellite` = Esri World Imagery, `s2` = EOX Sentinel-2 cloudless 2023 mosaic (app/src/lib/basemaps.ts:22-51, labels via `mkt.map.basemapSatellite` / `mkt.map.basemapS2` = "Satellite" / "Cloudless satellite", app/src/lib/locales/en.ts:964-965). The geo pipeline writes ONLY index COGs — a grep for rgb/truecolor/true_color/natural.color across services/geo_pipeline and services/app returns nothing but an unrelated CSS colour in ai/emails/layout.py:500.

**Qeyd:** Material difference: OneSoil's "Satellite image" is that field on that date; ours is a static global mosaic (Esri undated, EOX frozen at 2023). Anyone writing the table should not score this as parity. Adding it would need a new COG product in the pipeline, not just a UI entry. The EOX attribution string (CC BY-NC-SA 4.0, basemaps.ts:42) is licence-mandated — see CLAUDE.md "Atribusiya QƏSDƏN qalır".

### "Productivity" layer — 🟡 QISMƏN

**Bizdə:** Exists, but as its OWN field section, not a layer of the main map: `zones` section (app/src/lib/fieldSections.ts:50) → /Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ZonesTab.tsx. Multi-season NDVI clustering computed in the geo image and drawn as its own MapLibre map with a weak→strong ramp (ZonesTab.tsx:92 `const RAMP = ["#d73027","#fc8d59","#fee08b","#a6d96a","#1a9850"]`, ZonesMap at :121-230). Zone count is user-picked 3-7 (`ZONE_COUNTS = [3,4,5,6,7]`, :248, chips at :415-428).

**Qeyd:** Two frictions vs OneSoil: (1) it is NOT one tap on a layer picker — it is a separate section, and it must be COMPUTED on demand (`POST /api/fields/{id}/zones`, ZonesTab.tsx:322-330) then polled every 15s until the */5min `process-zones.sh` cron finishes (:311-317); (2) it needs multi-season COGs that only exist after an A8 backfill, so the field page pairs it with `<BackfillCard forZones />` (app/src/app/fields/[id]/page.tsx:302-308). The zone index is HARD-CODED NDVI (ZonesTab.tsx:324 `index_name: "NDVI"`) even though the API accepts others.

### Sub-mode list revealed under the selected layer (4 NDVI render modes) — 🟡 QISMƏN

**Bizdə:** We have ONE render-mode axis, expressed as a toggle button rather than a list: "Contrast" — SatelliteTab.tsx:449-459 (button, `Contrast` lucide icon, `t("app.field.satelliteTab.contrastBtn")`), state at :135, resolution at :251-261. It swaps the tile template between the fixed family rescale and the scene's own p10–p90 stretch. No list of named modes exists.

**Qeyd:** The toggle only appears when it would change something: `contrastAvailable` (SatelliteTab.tsx:256-257) requires at least one scene whose `rescale_auto` differs from the fixed range. Both hint strings are explicit about the trade-off (locales/en.ts:1589 "Contrast on: colors are stretched to this date's own range — differences are clearer, but colors can't be compared across dates." / :1730 "Fixed range: colors mean the same across all dates."). OneSoil gives no explanations for its four modes; that is a differentiator worth stating.

### Layer choice persists globally across screens — 🟡 QISMƏN

**Bizdə:** Only the BASEMAP and hillshade persist: app/src/lib/basemaps.ts:62-63 (`STORAGE_KEY = "bagban.basemap"`, `HILLSHADE_KEY = "bagban.hillshade"`), :65-84 (`getSavedBasemap` / `saveBasemap` / `getSavedHillshade` / `saveHillshade`), written on change at FieldMap.tsx:422-436 and 662-676. Every map in the app reads it on construction (FieldMap.tsx:290, 560, 808; FieldsOverviewMap.tsx:212; ZonesTab.tsx:165). The INDEX choice does NOT persist: `useState("NDVI")` at SatelliteTab.tsx:127 and SatelliteGlance.tsx:41 — component-local, reset on every navigation, and not shared between the two components on the same page.

**Qeyd:** Concrete consequence for the table: a farmer who picks NDMI in the satellite section, opens another field (or just returns to the status section), is back on NDVI, and the glance card above it was never following along anyway. The only cross-screen state we do carry is the section itself, via `?tab=` (app/src/lib/fieldSections.ts:101-105 `sectionHref` preserves all other query params). Adding index persistence would be a ~10-line addition to lib/basemaps.ts-style storage; nothing blocks it.

### Chosen layer changes the metric shown in list rows — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** List rows show a fixed pair — the 0-100 wellness score chip and a fixed NDVI thumbnail — regardless of any layer state. Thumbnail index is hard-coded with an explicit decision comment: services/app/routers/indices.py:82-83 `# Fixed: the list thumbnail is the "is it green" glance, not an index picker.` / `THUMB_INDEX = "NDVI"`. Row rendering: app/src/app/fields/page.tsx:314 `<FieldThumb …/>` and :321 `{s && <ScoreChip s={s} />}`. Desktop left panel is the same: app/src/components/shell/FieldListPanel.tsx:54 `type SortKey = "score" \| "name"` — sorting is by score (worst-first, :322-345), never by an index.

**Qeyd:** Deliberate, and consistent across surfaces: the public share card is also NDVI-only (services/app/routers/shares.py:251-252, 268-274 hard-code `colormap_name=rdylgn&rescale=-0.1,0.9`), and /demo is NDVI-only by construction (app/src/components/demo/DemoSatellite.tsx:3-9: "NDVI only, because that is what GET /api/public/demo's timeline contains; there is no parameter an anonymous visitor could use to pivot the payload"). The product's cross-field currency is the wellness SCORE, not a chosen index — that is the real architectural difference to put in the table, not a missing feature.

### "Vegetation" layer (NDVI raster on the field) — ✅ VAR

**Bizdə:** Pixel-level TiTiler raster over the boundary. Index list for Sentinel-2 = 10 indices: app/src/lib/sensors.ts:76-80 `ALL_INDICES` minus TVI plus NDRE, CIre → NDVI, EVI, SAVI, MSAVI, NDMI, NDWI, NBR, NBR2, NDRE, CIre. Selector: SatelliteTab.tsx:376-382. Tile URLs built server-side per scene: services/app/routers/indices.py:382-401 (`/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=…&colormap_name=…&rescale=…`). Colormap/range per family: indices.py:57-64 (`rdylgn`, `-0.1,0.9` for vegetation). Index-adaptive legend + one-line explanation: app/src/lib/indexStatus.ts:42-55 (`legendFor`), :34-38 (`indexInfo`), rendered SatelliteTab.tsx:100-122.

**Qeyd:** We are BROADER here than OneSoil (10 indices vs one NDVI layer) but shallower on render modes (next rows). Farmer-facing names are plain-language, not acronym-first: `app.idx.label.NDVI` = "Plant health (NDVI)", `NDMI` = "Plant moisture (NDMI)", `NDRE` = "Red-edge health (NDRE)" (app/src/lib/locales/en.ts:2330-2340).

### "Moisture" layer — ✅ VAR

**Bizdə:** NDMI and NDWI are entries in the same index dropdown (sensors.ts:76) and get their own diverging colormap and legend vocabulary, so moisture is not rendered with the vegetation ramp: services/app/routers/indices.py:53,58-59 (`_WATER = {"NDMI","NDWI"}` → `rdbu`, `-0.5,0.5`) and app/src/lib/indexStatus.ts:42-55 (`LEGEND_GRAD.water` blue-red gradient, `app.idx.legend.water.low\|mid\|high` = Dry/Medium/Wet). Interpretation thresholds are moisture-specific: indexStatus.ts:88-97. NDMI is also one of the three glance chips on the status section (SatelliteGlance.tsx:25 `GLANCE_INDICES = ["NDVI","NDMI","NDRE"]`).

**Qeyd:** Also feeds the wellness score as a documented PROXY when the FAO-56 soil-water balance is missing — services/app/ai/wellness.py, see CLAUDE.md "Wellness proxy qaydası" (clamped to a 25..85 band, labelled `water.ndmi` = "Satellite moisture signal" rather than borrowing the name of the measurement it stands in for).

### Sub-mode: Basic NDVI — ✅ VAR

**Bizdə:** This is our default rendering: fixed per-family rescale so the same value is the same colour on every date. services/app/routers/indices.py:57-64 `_raster_style()` → `("rdylgn", "-0.1,0.9")`; the server returns it as `rescale` and `tile_url` (indices.py:388-396). Client uses it whenever `contrast` is false (SatelliteTab.tsx:252-254).

**Qeyd:** SatelliteGlance (the status-section map) is fixed-ramp ONLY — no contrast toggle there, and the comment at SatelliteGlance.tsx:142 says so: "Fixed ramp — the same value means the same colour on every date."

### Sub-mode: Contrasted NDVI — ✅ VAR

**Bizdə:** Per-scene contrast stretch from the scene's own distribution. Backend: services/app/routers/indices.py:113-142 — robust window p10..p90, falling back to min..max, then to the fixed family range, with `_MIN_SPAN = 0.05` ("below this the stretch just amplifies noise"); emitted as `rescale_auto` + `tile_url_auto` (indices.py:398-399). Frontend toggle SatelliteTab.tsx:449-459; the legend prints the range actually in force (`IndexLegend range={activeRange}`, :513 and :100-122).

**Qeyd:** Genuinely more careful than a plain toggle: in two-date compare mode both panes are forced onto ONE shared range (the union of the two stretches) — SatelliteTab.tsx:312-321 `cmpRescale` — with the comment "Two different stretches side by side would fake a change that isn't there." The rewrite helper `withRescale()` (:70-75) rejects any value not matching `/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/`.

### Basemap gallery + hillshade (no OneSoil counterpart in this area) — ✅ VAR

**Bizdə:** 5 keyless basemaps with attribution — Hybrid (Esri imagery + Esri reference labels), Satellite (Esri), Cloudless satellite (EOX s2cloudless 2023), Street (OSM), Topo (OpenTopoMap): app/src/lib/basemaps.ts:22-59; applied imperatively over a `BLANK_STYLE` so the field/draw layers survive a swap (:88-120). Hillshade from free AWS Terrain Tiles (terrarium, exaggeration 0.45): basemaps.ts:123-156, toggled from inside the same popover (FieldMap.tsx:86-95).

**Qeyd:** Doc contradiction to flag — CLAUDE.md says code is authoritative. docs/ARCHITECTURE.md:655-656, docs/OPERATIONS.md:826-827 and docs/DECISIONS.md:352-353 all still list "cloud-cover filter UI, two-date compare/swipe, geocoding search, hillshade/terrain" as REMAINING work. All four are shipped: cloud slider SatelliteTab.tsx:514-519, swipe compare SatelliteTab.tsx:471-497 + FieldMap.tsx:760-899, Nominatim search FieldMap.tsx:111-181, hillshade basemaps.ts:127-156. docs/ROADMAP.md:44 has it right (✅). Also stale: docs/DESIGN_IMPLEMENTATION_PLAN.md:379-382 claims FieldMapSheet still fires `/scenes?index=NDVI&sensor=s2` with dead `DisplayMap`/`Layers` imports — the file is now 57 lines and…

### Scene/date selection alongside the layer (no OneSoil counterpart shown) — ✅ VAR

**Bizdə:** Horizontal scene strip with date, index value, delta vs the previous VISIBLE scene and cloud %: SatelliteTab.tsx:524-548 (deltas computed :265-271, coloured only where a rise is genuinely good — `HIGHER_IS_BETTER` at :79). Cloud-cover filter slider 10-100%: :514-519 with `visibleScenes` at :241-242. Two-date swipe compare with per-side date selects: :460-497. Reduced 8-date strip in the glance: SatelliteGlance.tsx:174-194.

**Qeyd:** Include this row so the table is not one-sided: our per-field satellite workbench is materially deeper than OneSoil's layer tile, even though our layer PICKER is weaker. Also worth noting the sensor axis is gone from the UI on purpose: app/src/lib/sensors.ts:17 `export const HLS_ENABLED = false` removed NASA HLS from every user surface (E14.3) while the data layer keeps ingesting it. CLAUDE.md and docs/DESIGN_IMPLEMENTATION_PLAN.md:33-37 both warn the flag is NOT consumed outside sensors.ts — app/src/app/fields/[id]/page.tsx:300 hard-codes `<SatelliteTab field={field} sensor="S2" />`, so flipping the boolean alone restores nothing. SatelliteTab still carries unreachable HLS branches (e.g.…


## C. Sahə yaratma: seç / çək / dairə

### White X close button to abandon field creation — ❌ YOX

**Bizdə:** No close/cancel affordance exists on either creation surface. `app/src/app/onboarding/page.tsx:47-58` renders a heading + `<FieldOnboarding>`; `app/src/components/field/FieldOnboarding.tsx:866-884` renders only "Geri" (back, disabled on step 1, line 871) and "İrəli"/"Sahə yarat". `app/src/app/farms/[farmId]/fields/new/page.tsx:25-32` likewise renders only an `<h1>` and the wizard.

**Qeyd:** Searched `FieldOnboarding.tsx`, `onboarding/page.tsx`, `farms/[farmId]/fields/new/page.tsx`, `AppShell.tsx` — no X / cancel / router.back control. The user escapes by browser back or the bottom-nav/rail, which keeps the app chrome visible throughout (unlike OneSoil's chrome-less full-screen mode). Because it is a route and not a modal, Android's back gesture works, but nothing tells the user that.

### DRAW mode — draw-circle tool — ❌ YOX

**Bizdə:** Nothing. No circle/radius/centre-point drawing tool exists. Grepped `app/src` for `circle\|radius\|pivot` — every hit is a MapLibre `circle` paint property, a Tailwind `rounded-full`, or a lucide icon name (`HelpCircle`, `CheckCircle2`); `app/src/components/FieldMap.tsx` has only polygon/line/point sources. `app/src/lib/geo.ts` exposes only `closeRing`, `polygonFromRing`, `validatePolygon`, `parseCoordinates` — no circle constructor. `app/src/lib/geoio.ts` imports/exports polygons only.

**Qeyd:** No doc anywhere records a decision to omit circles — I grepped all of `docs/*.md` for `circle\|dairə\|çevrə\|pivot` and found only unrelated hits, so this is a genuine gap rather than a design stance. Practical impact is modest for the target market: centre-pivot irrigation (the main reason a circle tool exists) is rare in Azerbaijan/Caucasus smallholdings, and our freehand brush covers rounded shapes approximately. The backend would accept a circle-derived polygon with no changes — `fields.py:52-58` only requires a valid non-self-intersecting POLYGON with ≥4 ring points.

### Fixed centre crosshair — pan the map under a reticle to place points — ❌ YOX

**Bizdə:** Not implemented. `DrawMap` places points at the tap location (`app/src/components/FieldMap.tsx:299-311` uses `e.lngLat`), and nothing renders a centre marker: the only absolutely-positioned overlays on the map are the draw toolbar top-left (`:461-465`), `BasemapControl` bottom-left (`:63`), `CoordBar` bottom-right (`:184-192`) and MapLibre's own zoom/geolocate/scale top-right and bottom-left (`:256-258`). A crosshair CURSOR is set, but only in brush mode (`:349` `canvas.style.cursor = "crosshair"`) and in the read-only map's measure mode (`:659`) — that is a mouse cursor, not a fixed screen-centre reticle.

**Qeyd:** This is the single biggest interaction-model difference in the area and it favours OneSoil on mobile: a reticle lets you place a vertex under a fingertip you can see, at zoom, without your finger covering the corner. Our nearest ergonomic equivalents are the freehand brush (`FieldMap.tsx:339-420`: pointer-down/move paints a path, `dragPan` disabled at `:346`, released path simplified with turf at `:377-380` into editable vertices) and tap-to-detect, both of which sidestep precise per-corner tapping rather than solving it.

### 36x36dp add-point button (place a point without tapping the map) — ❌ YOX

**Bizdə:** No add-point button exists. The draw toolbar contains exactly three items: a vertex counter, Undo and Clear — `app/src/components/FieldMap.tsx:461-465` (`<span>{t("mkt.map.vertex")} {count}</span>`, `undoPt`, `clearPts`). Points can only be created by a map click (`:299-311`), a brush drag (`:389-406`), an import (`:321-334`) or a detect result.

**Qeyd:** Follows from having no crosshair — with tap-to-place there is nothing for such a button to do. Consequence for the table: on our UI a farmer cannot place a vertex without their finger occluding the exact spot, and cannot place one at the current GPS position either (the GeolocateControl at `FieldMap.tsx:257` only recentres the map; there is no walk-the-perimeter GPS capture anywhere in the codebase).

### Boundary is confirmed/finished at creation and cannot be redrawn later — ❌ YOX

**Bizdə:** There is no edit-geometry path after a field is created. `services/app/routers/fields.py:148-158` — `@router.put("/{field_id}")` docstring is literally "Rename a field (field-level edit)" and only writes `name`; no route anywhere accepts a new `geom`. The only geometry write is the INSERT in `create_field` (`fields.py:70-79`). Front end matches: no component passes `DrawMap` an existing field.

**Qeyd:** Materially relevant to this area because it raises the stakes on getting the drawing right first time — with no crosshair, no vertex dragging and a 320px map. The only recovery is soft-delete (`fields.py:161-171`) and re-create, which loses the queued satellite history and burns a field slot on the free tier (`services/app/tiers.py:22` `max_fields: 1` for free, 5 for pro). Creation is also capped by that tier limit server-side (`fields.py:44-48`, HTTP 402 `field_limit_reached`), surfaced as a marketing upgrade CTA rather than an error (`FieldOnboarding.tsx:388-392`).

### "+" entry point that opens a dedicated field-creation mode — 🟡 QISMƏN

**Bizdə:** Mobile: a raised "+" FAB in the centre of the bottom nav — `app/src/components/BottomNav.tsx:62-68` (`<Link href="/onboarding" aria-label={t("bnav.addField")} … rounded-full bg-emerald-600>`), and the whole nav is `md:hidden` (`BottomNav.tsx:57`), so the "+" does not exist on desktop. Desktop entry points are ordinary buttons: `app/src/app/fields/page.tsx:261-263` ("Sahə əlavə et" → `/onboarding`) and the empty state at `app/src/app/fields/page.tsx:272`; the Today home has `app/src/components/home/TodayHome.tsx:348-349` (first field) and `:356-357` ("+ Add"). `/onboarding` (`app/src/app/onboarding/page.tsx:16-58`) silently auto-creates org+farm (lines 30-34) then renders `FieldOnboarding`. The desktop left rail `app/src/components/shell/AppRail.tsx:76-88` has NO add-field slot at all.

**Qeyd:** Ours opens a ROUTE (a scrolling wizard page inside the app shell), not a full-screen map mode. The legacy dashboard has a third, different entry — `app/src/app/page.tsx:287-289` links to `/farms/{farmId}/fields/new` — but that dashboard only renders when the user has opted out via `?ui=v1` (`app/src/app/page.tsx:44`, `v2 ? <TodayHome/> : <Dashboard/>`; `app/src/lib/uiFlag.ts:13-34` makes v2 the default). So two entry points lead to `/onboarding` and one flag-gated one leads to `/farms/[farmId]/fields/new` — both ultimately render the same `FieldOnboarding` component (`app/src/app/farms/[farmId]/fields/new/page.tsx:29`).

### Search button inside the creation mode — 🟡 QISMƏN

**Bizdə:** Place search exists but is always-expanded, not a button: `app/src/components/FieldMap.tsx:111-181` (`SearchControl`) rendered unconditionally above every DrawMap at `FieldMap.tsx:456` (comment lines 454-455 explain it was moved out of the map corners to avoid collisions). Submits to Nominatim on Enter/button: `FieldMap.tsx:123` `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=az&q=…`, results fly the map to the bbox (`:437-442`).

**Qeyd:** Two hard constraints a comparison must state: (1) `countrycodes=az` is HARD-CODED (`FieldMap.tsx:123`) — in a product shipping 8 UI languages, a Turkish/Russian/Polish user literally cannot search their own village; (2) `Accept-Language: az` (`FieldMap.tsx:124`) so results come back in Azerbaijani regardless of locale. Search is throttled by policy to submit-only (comment `FieldMap.tsx:109-110`), i.e. no type-ahead. MapLibre `GeolocateControl` (`FieldMap.tsx:257`, `trackUserLocation: false`) gives a one-shot "where am I" as a second way to reach the field.

### "Place first point of boundary" instruction line — 🟡 QISMƏN

**Bizdə:** There is a static hint line above the map that swaps by mode — `app/src/components/field/FieldOnboarding.tsx:457-464`: brush → `app.field.fieldOnboarding.brushHint`, detect → `app.field.fieldOnboarding.detectHint` ("Sahənizin içinə toxunun — sərhədi avtomatik tapacağıq."), otherwise `field.drawHint`. It is not stateful — it never changes after the first point, and there is no per-point prompt.

**Qeyd:** The default draw hint is WRONG in all 8 locales. `app/src/lib/locales/az.ts:105` says "Xəritədə çoxbucaqlı çəkmək üçün yuxarı sağdakı alətdən istifadə edin" (= "use the tool at the TOP RIGHT"), same in en.ts:98, ru.ts:93, tr.ts:83, de.ts:83, hu.ts:98, it.ts:98, pl.ts:98. But the draw toolbar is top-LEFT (`FieldMap.tsx:459-461`, whose comment states the top-right corner holds the zoom/geolocate controls), and there is no "tool" to use at all — you tap the map. So the one sentence a first-time farmer reads points at the zoom buttons and never says "tap the map". Contrast this directly with OneSoil's explicit "Place first point of boundary".

### Dark segmented pill toggling "Select \| Draw" — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** Step 1 has a two-button row, but the axis is different: `app/src/components/field/FieldOnboarding.tsx:438-453` toggles `mode` between `"draw"` (`t("field.mode.draw")` = "Xəritədə çək") and `"coords"` (`t("field.mode.coords")` = "Koordinatları daxil et", a lon/lat textarea at `:521-531`). The Select-equivalent is NOT in that pair — it is a third, independent toggle inside draw mode: `FieldOnboarding.tsx:477-488` ("✨ Toxun və tap" / active "✓ Toxun və tap (aktiv)"), sitting beside a fourth toggle "✏️ Fırça ilə çək" (brush) at `:466-476`. Styling is emerald outline/filled pills, not a dark segmented control.

**Qeyd:** So our step 1 exposes FIVE input methods where OneSoil has two: tap-vertices draw, freehand brush, tap-to-detect, coordinate paste, and file import (`FieldOnboarding.tsx:504-519`, accepting `.geojson,.json,.kml,.zip,.shp`). Brush and detect are mutually exclusive and each clears the other (`:468`, `:479`); both default OFF (`:101` `useState(false)`, `:104`), so a first-time farmer lands on plain tap-to-add-vertex.

### SELECT mode — tap a pre-detected field boundary to claim it — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** We do not pre-render contours; we compute the boundary ON DEMAND at the tapped point. UI: `FieldOnboarding.tsx:477-488` arms detect mode → `DrawMap` routes the map click to `onDetect` instead of adding a vertex (`app/src/components/FieldMap.tsx:299-311`, `if (detectRef.current) { onDetectRef.current?.(e.lngLat.lng, e.lngLat.lat); return; }`) → `FieldOnboarding.tsx:154-177` POSTs `/api/geo/segment` → `services/app/routers/geo.py:22-35` proxies the always-on `geoapi` microservice (`_GEOAPI_URL = "http://geoapi:8010"`, line 19) → `services/geo_pipeline/segment_api.py:34-38` → `services/geo_pipeline/segment.py::detect_boundary` (NDVI region-growing on a recent Sentinel-2 window: `NDVI_TOL=0.08`, `EDGE_THRESH=0.05`, `MAX_HA=35.0`, `SEARCH_DAYS=120`, `TARGET_VERTICES=24`, lines 12-24). The returned ring is loaded as EDITABLE vertices (`FieldOnboarding.tsx:161-168` sets…

**Qeyd:** This is the deliberate differentiator and it is documented: `docs/ONESOIL_BENCHMARK.md:11` records the live measurement that OneSoil's pre-detected contours do not exist in Azerbaijan (Ukraine 49.2,31.5 has them; Xudat 41.61,48.64 at z16 has none) and calls our on-demand detect "real yerli moat". `docs/ONESOIL_MOBILE_TEARDOWN.md:127` repeats it. Trade-off for the table: ours costs one satellite read per tap (~seconds, with a `setDetecting` spinner) and can fail — `segment.py` returns `no_recent_scene`, `boundary_unclear` (>35 ha bleed, line 168-169), `no_readable_scene`; the UI then falls back to manual draw. Anonymous visitors get the same thing before signup via `/api/geo/segment-public`…

### Creation surface is a full-screen, chrome-free map — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** Ours is a 4-step wizard page inside the normal app shell, and the map is one 320px-tall element in it: `app/src/components/field/FieldOnboarding.tsx:401-428` renders a numbered 4-step progress header ("Sərhəd" → crop info → optional details → confirm), step 1 holds name + mode buttons + map + import (`:432-539`), and the map itself is `h-80` (`app/src/components/FieldMap.tsx:458`). Rail (`AppRail.tsx`) and bottom nav stay on screen throughout.

**Qeyd:** There IS an explicit, documented decision nearby that a comparison writer will otherwise misread: the full-bleed map-first field view was BUILT and then REVERTED — `app/src/components/field/FieldMapSheet.tsx:1-13` ("It began as a full-bleed map with a draggable bottom sheet … the narrow ~440px column made the labels and controls cramped, so the content moved into a normal full-width column … Nothing here renders a map any more"). That reversal is about the field DETAIL view, not the creation flow — the creation flow was never full-screen. Also note the wizard demands a field NAME before the boundary (`FieldOnboarding.tsx:434-436`, enforced at `:292-295`), so unlike OneSoil the very first…

### DRAW mode — draw-polygon tool — ✅ VAR

**Bizdə:** MapLibre-native click-to-add-vertex (no mapbox-gl-draw — see the decision comment at `app/src/components/FieldMap.tsx:208-212`). Each map click appends a vertex: `FieldMap.tsx:299-311`; the ring auto-closes at ≥3 points and the polygon is pushed to the parent (`FieldMap.tsx:264-286`, `cbRef.current(pts.length >= 3 ? {type:"Polygon",coordinates:[ring]} : null)`). Rendered as green fill + line + 5px vertex circles (`:291-295`). Double-click zoom is disabled so a fast double tap doesn't zoom (`:259`).

**Qeyd:** Interaction model is the opposite of OneSoil's: the user TAPS the map where the corner is; the map does not move under a reticle. Two capability gaps vs any mature drawing tool: (1) vertices cannot be dragged or edited — there is no mousedown/drag handler on the `draw-pts` layer anywhere in `FieldMap.tsx`; the only corrections are undo-last and clear-all; (2) the drawing surface is a fixed 320px-tall embedded map inside a scrolling form (`FieldMap.tsx:458`, `className="h-80 w-full …"`), not a full-screen canvas — on a phone that is roughly a third of the screen. Client-side guards: self-intersection + min-3-vertices via turf (`app/src/lib/geo.ts:26-46`), <0.05 ha rejected…

### Undo control (appears after the first point) — ✅ VAR

**Bizdə:** Undo is always present, plus a Clear and a live vertex counter: `app/src/components/FieldMap.tsx:461-465` — toolbar pinned top-left over the map; `undoPt()` at `:447-450` (`ptsRef.current = ptsRef.current.slice(0, -1)`), `clearPts()` at `:443-446`; the counter is driven by `setCount(pts.length)` inside `render()` (`:285`). Strings: `mkt.map.undo` = "Geri", `mkt.map.clear` = "Təmizlə", `mkt.map.vertex` = "Təpə:" (`app/src/lib/locales/az.ts:1003-1005`).

**Qeyd:** Ours is stronger in two ways (always visible, and it shows a live vertex count) and weaker in one: Undo is unbounded-depth for points but there is no redo, and it does not undo a brush stroke or an imported/detected boundary as a unit — `undoPt` peels one vertex off whatever is in the buffer, so undoing a 24-vertex detected boundary means 24 taps or a full Clear. The counter chip occupying the top-left is also why the search box had to move above the map (`FieldMap.tsx:454-455`).

### Freehand brush / lasso boundary tracing — ✅ VAR

**Bizdə:** We have it, OneSoil (as measured) does not. `app/src/components/field/FieldOnboarding.tsx:466-476` toggles it; `app/src/components/FieldMap.tsx:336-420` implements it: `dragPan.disable()` and `touchAction="none"` while active (`:346,350`), pointer path captured to lng/lat (`:354-358`), live LineString/Polygon preview (`:359-369`), and on release the path is Douglas-Peucker simplified (`turfSimplify`, tolerance `0.00008`, `:377-380`) into normal EDITABLE vertices so the farmer can still undo/refine.

**Qeyd:** Include this as a row where WE win. Caveat for accuracy: the brush is only wired up in the authenticated wizard — `LandingHeroMap.tsx:174-181` does not pass `brushMode`, so the anonymous landing map has detect + tap-vertices only. Also `FieldCreator.tsx:140` (the legacy component) passes neither.

### Import an existing boundary file (GeoJSON / KML / shapefile) — ✅ VAR

**Bizdə:** `app/src/components/field/FieldOnboarding.tsx:504-519` — hidden file input accepting `.geojson,.json,.kml,.zip,.shp`; `onFile` at `:213-243` routes `.zip`/`.shp` to `parseShapefile` (`app/src/lib/geoio.ts:102`, lazy shpjs, T19) and everything else to `parseGeoImport` (`geoio.ts:114`); the parsed ring is loaded into the draw buffer as editable vertices and the map fits its bounds (`FieldMap.tsx:321-334`).

**Qeyd:** No OneSoil counterpart in the measured flow (OneSoil gates boundary EXPORT behind its paid tier per `docs/ONESOIL_BENCHMARK.md:15`). Note the asymmetry on our side: the live wizard imports but does NOT export. Export-at-creation exists only in `app/src/components/FieldCreator.tsx:156-171` (GeoJSON + KML download buttons) — and that whole component is DEAD CODE: grepping `app/src` for `FieldCreator` finds only its own definition and two prose comments (`onboarding/page.tsx:5`, `FieldOnboarding.tsx:4`), no importer. Do not credit the product with creation-time export.

### Type/paste coordinates instead of drawing — ✅ VAR

**Bizdə:** `app/src/components/field/FieldOnboarding.tsx:446-452` (mode button) and `:521-531` (a monospace textarea, placeholder `47.50,40.30\n47.52,40.30\n47.52,40.32`), parsed by `parseCoordinates` in `app/src/lib/geo.ts:53-70` (one `lon,lat` per line, separators `[,;\s]+`, throws `"min"` under 3 points).

**Qeyd:** No OneSoil counterpart. Aimed at agronomists/cadastre paperwork. Weak spot worth noting: the coords textarea does NOT render on the map — `polygon` is recomputed from the text (`FieldOnboarding.tsx:201-208`) but the map is not shown in that mode at all, so the user gets no visual confirmation until the area readout at `:533-538`.


## D. Skautinq qeydləri, fotolar, problem taksonomiyası

### Drop a note pin at the map centre (large red map marker) — ❌ YOX

**Bizdə:** No map-based note placement exists anywhere. The note form (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:142-153`) offers only a device-GPS button: `navigator.geolocation.getCurrentPosition(...)` (`ScoutingTab.tsx:55-65`) writes `coords` and renders raw decimals `{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}` (`ScoutingTab.tsx:147-151`). The coordinate reaches the DB as a real PostGIS point — `geom_sql = "st_setsrid(st_point($5,$6),4326)"` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/scouting.py:19`) into `scouting_observations.geom geometry(Point,4326)` with a GIST index (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:9,17`). No MapLibre marker is constructed anywhere in the app: `grep -rn 'Marker'` over `app/src` returns zero hits; `FieldMap.tsx` only ever adds `NavigationControl`,…

**Qeyd:** The data layer is fully ready (Point geometry + GIST index) — only the map UI is absent. Two gaps compound it: (1) the note-add flow is pure GPS (farmer must be standing on the spot), there is no way to mark a remote spot; (2) even the captured coordinate is invisible after saving — see the 'note pin rendered on map / coordinate readback' row. Searched: all of `app/src/components` (FieldMap, FieldsOverviewMap, SatelliteGlance, ZonesTab, FieldMapSheet), `lib/basemaps.ts`, `lib/useMapReady.ts`.

### Row of 7 note colour swatches with the selected one ringed — ❌ YOX

**Bizdə:** No colour selection exists for notes, and no colour picker of any kind exists in the app: `grep -rni 'swatch\|colorpicker\|color-picker\|type="color"'` over `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src` returns zero hits. `scouting_observations` (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:4-15`) has no colour column, and `ScoutingIn` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/schemas.py:166-173`) has no colour field. The only colour signal on a note is derived, not chosen: the category chip is hard-coded emerald (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:174-176`).

**Qeyd:** This is an explicitly DEFERRED item, not an unknown gap: `/Users/mirshahbazseyidli/Desktop/bagbanai/docs/ROADMAP.md:137` tracks T19 as "Shapefile import/export + rəngli annotasiya + ScaleControl" with status "🚀 ... (shapefile import + ScaleControl canlı; export & annotasiya təxirə)" — coloured annotation postponed — and `ROADMAP.md:176` states plainly "Rəngli annotasiya alətı yox". Deferred is not the same as designed-away, so I scored it MISSING rather than DIFFERENT_BY_DESIGN.

### Existing notes shown as pins on the map / note coordinate readable after save — ❌ YOX

**Bizdə:** Notes render as a flat card list only (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:169-197`) — category chip, severity, note text, thumbnail. There is a coordinate line, but it is DEAD CODE: it reads `s.lat`/`s.lon` (`ScoutingTab.tsx:180-184`) while the API returns neither — `GET /api/scouting` selects `st_asgeojson(geom) as geom` and parses it into a `geom` key (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/scouting.py:36-44`), never `lat`/`lon`. The client type still declares the wrong shape: `lon?: number\|null; lat?: number\|null;` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/types.ts:173-174`), so TypeScript cannot catch it and `s.lat != null` is permanently false.

**Qeyd:** CONFIRMED BUG, high value for the comparison table: the geotag a farmer walks to the spot to capture is stored correctly in PostGIS but is never displayed back, anywhere — not on a map, not as text. `lib/types.ts:168-178` also declares `created_at` while the API returns `observed_at` (`routers/scouting.py:37,42`), and indeed the list shows no date at all. Docs do not flag this: `/Users/mirshahbazseyidli/Desktop/bagbanai/docs/API_REFERENCE.md:452-453` documents the endpoints without noting the response/type divergence.

### Edit, delete, or resolve an existing note — ❌ YOX

**Bizdə:** Notes are append-only. `routers/scouting.py` declares exactly two endpoints — `@router.post("")` and `@router.get("")` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/scouting.py:14,30`); there is no PATCH, PUT or DELETE. RLS mirrors this: only `scouting_read` (select) and `scouting_insert` (insert) policies exist — no update or delete policy (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0007_rls.sql:87-90`), in contrast to the sibling `tasks_manage ... for all` policy immediately below (`0007_rls.sql:93-95`). The list UI renders no per-item controls (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:170-196`).

**Qeyd:** The schema anticipates a lifecycle that the product never exposes: `status text default 'open' -- open\|resolved` (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:14`). It IS read back by `GET /api/scouting` (`routers/scouting.py:36`) and printed in reports as "Açıq"/"Bağlı" (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/reports.py:672, 813`) — but nothing can ever set it to `resolved`, so every note in every PDF reads "Açıq" forever. The ScoutingTab UI ignores the field entirely. Also note `docs/ARCHITECTURE.md:265` lists `status (open\|resolved)` as if it were a working feature.

### Sheet chrome: X cancel (left), 'New note' title, large green circular check to save — 🟡 QISMƏN

**Bizdə:** We have a title and a save button but no cancel affordance. Title: `<h3 className="font-semibold text-slate-800">{t("scout.add")}</h3>` = "Yeni qeyd" / "New note" (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:120`; strings at `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/i18n.ts:180` and `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/locales/en.ts:169`). Save: a rectangular text button `<button className="btn-primary" type="submit">` with a `Plus` icon reading "Əlavə et"/"Saving…" (`ScoutingTab.tsx:159-161`). There is no X / cancel / discard control — `resetForm()` (`ScoutingTab.tsx:67-72`) is only called internally after a successful or queued submit, never bound to a user control.

**Qeyd:** Because the form is always mounted (not a modal), "cancel" has no natural home — the farmer clears fields manually or navigates away. Note the wording match is exact: our AZ/EN copy is literally "Yeni qeyd" / "New note", the same label OneSoil uses.

### 'Take photo' button — direct camera capture from the note form — 🟡 QISMƏN

**Bizdə:** The note form's photo control is a bare file input with NO `capture` attribute: `<input className="input" type="file" accept="image/*" onChange={...} />` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:140`), labelled `t("scout.photo")` = "Şəkil"/"Photo" (`i18n.ts:184`). On mobile this surfaces the OS chooser (camera is one option among several), not a one-tap camera. Camera-direct capture DOES exist, but only in other sections: `PhotosTab` uses `<input ... accept="image/*" capture="environment" />` behind a "Şəkil əlavə et" button (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/PhotosTab.tsx:52-55`), and `DocumentsTab.tsx:301` likewise. There is also a mobile-only camera FAB (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/FieldMapSheet.tsx:45-54`) but it routes to AI photo diagnosis, not to a note…

**Qeyd:** Key structural difference for the table: OneSoil puts photo capture INSIDE the note. We split photos into a separate `photos` section from `scouting` — both live in the İŞLƏR group as sibling sections (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/fieldSections.ts:59-60`) and write to different tables (`field_photos` vs `scouting_observations.photos[]`). A farmer who taps the camera FAB gets disease diagnosis and never creates a note.

### 'Select photo' button — pick an existing photo from the gallery — 🟡 QISMƏN

**Bizdə:** The note form's single file input (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:140`) permits gallery selection because it omits `capture`, but it is one undifferentiated control, not a labelled 'Select photo' button beside a 'Take photo' button. Conversely, in `PhotosTab` the `capture="environment"` attribute (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/PhotosTab.tsx:55`) makes most Android browsers open the camera directly and suppress the gallery, so that surface has the opposite limitation.

**Qeyd:** Net: we never present the take-vs-select choice OneSoil presents. Whichever section the farmer lands in, the control silently decides for them. Also: exactly ONE photo per note — `setFile(e.target.files?.[0] ?? null)` (`ScoutingTab.tsx:140`) and `photos = [up.path]` (`ScoutingTab.tsx:95-99`) — even though the column is `photos text[]` (`db/migrations/0005_farm_mgmt.sql:12`) and `ScoutingIn.photos` is a list (`services/app/schemas.py:173`).

### 'Add issue' dropdown / issue taxonomy (competitor: 6 — Disease, Pests, Weeds, Lodging, Waterlogging, Other) — 🟡 QISMƏN

**Bizdə:** A required `<select>` with 7 fixed categories, defaulting to `pest`: `const CATEGORIES = ["pest", "disease", "weed", "nutrient", "water", "damage", "other"] as const;` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:11`), rendered at `ScoutingTab.tsx:122-130`, state default `useState<string>("pest")` (`ScoutingTab.tsx:22`). Labels are localized in all 8 locales — AZ at `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/i18n.ts:188-194`, EN at `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/locales/en.ts:177-183` (Pest / Disease / Weed / Nutrient deficiency / Water stress / Damage / Other). The same list is echoed as a SQL comment (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:10`), in `ScoutingIn` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/schemas.py:168`), and in the PDF/journal label map…

**Qeyd:** Taxonomy diff for the table — overlapping: Disease=disease, Pests=pest, Weeds=weed, Other=other. Ours-only: `nutrient` (nutrient deficiency), `damage`. Theirs-only: **Lodging** (no equivalent) and **Waterlogging** — our `water` is glossed "Su stresi"/"Water stress" (`i18n.ts:192`, `en.ts:181`), i.e. drought, the opposite condition; do not map them 1:1. Structural diffs: the category is REQUIRED and pre-selected for us (no 'no issue' plain note), whereas OneSoil's 'Add issue' is an optional dropdown on an otherwise plain note. There is NO DB constraint enforcing the list — `category text not null` only (`0005_farm_mgmt.sql:10`) — and no validator in `ScoutingIn`, so the enum lives only in…

### Notes-tab empty state: one sentence + a single 'Add note' button — 🟡 QISMƏN

**Bizdə:** One sentence, no button: `{items.length === 0 ? <Placeholder>{t("scout.empty")}</Placeholder> : ...}` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:166-167`); copy is "Hələ skautinq qeydi yoxdur." / "No scouting notes yet." (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/i18n.ts:187`, `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/locales/en.ts:176`). `Placeholder` is a dashed-border grey box with centred text and no action slot (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/ui.tsx:26-32`).

**Qeyd:** The CTA is structurally unnecessary for us because the add-note form is permanently mounted directly ABOVE the empty-state box (`ScoutingTab.tsx:119-162` then `164-199`) — a first-time farmer sees the whole form, not a button. Trade-off worth stating in the table: OneSoil's empty state is calmer (one button); ours is denser but zero-tap.

### Attached photo visible on the saved note (thumbnail) — 🟡 QISMƏN

**Bizdə:** The thumbnail is rendered but its URL resolves to a route that does not exist: `<img src={apiAsset(s.photos[0])} ... onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:186-194`). `photos[0]` is the raw `"uploads/<token>.jpg"` string returned by `POST /api/uploads` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/uploads.py:29`), and `apiAsset` maps it to `${API_BASE}/uploads/<token>.jpg` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/api.ts:178`) — a path with no FastAPI route (`main.py` mounts no `StaticFiles`; nginx proxies only `/titiler/`, `/api/`, `/` per `/Users/mirshahbazseyidli/Desktop/bagbanai/deploy/nginx-agradex.conf:29,36,45`). `apiAsset`'s own docstring says so: "Legacy stored paths look like 'uploads/xxx.jpg' — those have NO route"…

**Qeyd:** CONFIRMED BUG — scouting photo thumbnails are silently blank (the `onError` handler hides the broken image, so it fails invisibly). The authenticated serve route exists but only covers the OTHER table: `GET /photos/{photo_id}/download` reads `public.field_photos` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/documents.py:319-340`), and its docstring records that the identical problem was already fixed there — "those rows store the identical 'uploads/<token>.<ext>' convention and had no read route at all, so thumbnails were dead links". `scouting_observations.photos[]` never got the same fix. Practical effect: a photo attached to a note is write-only.

### Severity / intensity rating on a note — 🟡 QISMƏN

**Bizdə:** We have a severity input the competitor does not, but the three layers disagree on its type. UI: `<input type="number" min={1} max={5}>` under "Şiddət (1-5)" / "Severity (1-5)" (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:131-133`; `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/i18n.ts:182`, `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/locales/en.ts:171`), sent as a JSON NUMBER: `severity: severity ? Number(severity) : undefined` (`ScoutingTab.tsx:80`, serialized by `JSON.stringify` at `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/api.ts:76-82`). API: `severity: Optional[str] = None # low\|medium\|high` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/schemas.py:169`). DB: `severity text, -- low\|medium\|high` (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:11`). Reports translate…

**Qeyd:** LIKELY BROKEN, worth flagging as a caveat rather than a feature: under pydantic 2.10.4 (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/requirements.txt:5`) a `str` field rejects a JSON int — pydantic v2 removed int→str coercion — so filling the severity box should return 422 and only blank-severity notes should save. I could NOT execute this (no pydantic on this Mac; CLAUDE.md line 190 notes there is no local node/toolchain either), so treat the 422 as inferred from the pinned version, while the four-way type disagreement is directly verified from the files above. Either way, a numeric 1-5 entered by a farmer can never render correctly in the PDF journal, which only knows…

### Add-note bottom sheet layered over a still-visible map — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** The note form is a plain always-expanded card stacked above the note list inside a normal full-width page section — `<form onSubmit={onSubmit} className="card space-y-3">` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:119-162`), reached via section `scouting` in the İŞLƏR group (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/fieldSections.ts:60`) and rendered at `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/app/fields/[id]/page.tsx:329`. The map-over-sheet pattern WAS built and then deliberately removed. `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/FieldMapSheet.tsx:5-13` documents the reversal verbatim: "It began as a full-bleed map with a draggable bottom sheet (mobile) / fixed right sidebar (desktop); the narrow ~440px column made the labels and controls cramped, so the content moved into a normal full-width…

**Qeyd:** Strongest DIFFERENT_BY_DESIGN evidence in this area — we tried OneSoil's exact layout (D2.3 `FieldMapSheet`, still shipped behind `useUiV2()` which now defaults ON, `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/uiFlag.ts:11-13`) and backed out for legibility reasons. CLAUDE.md line 100 corroborates (E14.2 consolidation). The component name `FieldMapSheet` is now purely historical — it renders no map; do not read the filename as evidence a map sheet exists.

### 'Attached field' row, pre-filled with the field the pin fell inside — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** Field attachment is structural, not a picker: the note form only exists inside a field's own page, so the field is fixed by the route. `ScoutingTab({ fieldId })` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:17`) is rendered only at `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/app/fields/[id]/page.tsx:329` (`{tab === "scouting" && <ScoutingTab fieldId={field.id} />}`), and `field_id` is a required, non-nullable body field (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/schemas.py:167`; FK `not null references public.fields(id) on delete cascade`, `/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:6`). Reads are equally field-scoped: `GET /api/scouting?field_id=` requires the query param (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/scouting.py:31,38`).

**Qeyd:** Consequence for the table: there is NO cross-field / org-wide notes list or map anywhere — you cannot see all notes at once, only one field at a time. Also, no point-in-polygon inference exists: the GPS coordinate is stored verbatim and is never validated against the field boundary, so a note geotagged 5 km away still attaches to whichever field page the farmer had open. Searched for a global notes surface in `app/src/app` (no `/notes` route), `components/home/TodayHome.tsx`, `components/BottomNav.tsx`, `FieldsOverviewMap.tsx` — none reference scouting.

### Free-text 'Note' field — ✅ VAR

**Bizdə:** `<textarea className="input h-20" value={note} onChange={...} />` under label `t("scout.note")` = "Qeyd"/"Note" (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:135-137`; strings `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/i18n.ts:183`, `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/locales/en.ts:172`). Sent as `note: note \|\| undefined` (`ScoutingTab.tsx:81`), typed `Optional[str]` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/schemas.py:170`), stored in `note text` (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:12`), rendered in the list at `ScoutingTab.tsx:179`.

**Qeyd:** Full parity, with a bonus: unlike a purely local note, our note text is fed to the AI agronomist — `select category, severity, note, observed_at::date ... limit 8` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/ai/context.py:91-94`, surfaced as `"scouting"` in the context payload at `context.py:153`), and printed into the field journal / season PDF (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/reports.py:671-674, 728-730, 804-815`).

### Offline note capture with automatic sync — ✅ VAR

**Bizdə:** Ours-only capability (T12). If `!navigator.onLine`, the note is written to a localStorage outbox instead of POSTed: `queueScouting({ fieldId, body, ts: Date.now() })` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/ScoutingTab.tsx:87-92`), with a second catch-path for a mid-submit network drop (`ScoutingTab.tsx:104-108`). Flush runs on mount and on the `online` event (`ScoutingTab.tsx:44-53`). Outbox implementation: key `"bagban.outbox.scouting"`, `getQueue`/`queueScouting`/`flushQueue` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/offlineQueue.ts:5-49`). A global pill surfaces the queue depth and a post-sync confirmation (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/OfflineIndicator.tsx:13-79`).

**Qeyd:** Explicit limitation, stated in both the module header and inline: photos are dropped offline — "Photos are skipped offline (they need a live upload) — the note syncs, the farmer can add the photo later" (`offlineQueue.ts:2-3`) and `ScoutingTab.tsx:85-86`. Since there is no edit path on a saved note (see next row), "add the photo later" is not actually possible — the farmer must create a second note. Storage is localStorage, not IndexedDB, despite `docs/ROADMAP.md:164` describing T12 as an "IndexedDB outbox".

### Note authoring permission model — ✅ VAR

**Bizdə:** Write requires worker-or-above, read requires membership, enforced both server-side and in RLS. Server: `await require_role(conn, user_id, org_id, ROLES_WORKER)` on POST and `await require_member(conn, user_id, org_id)` on GET (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/scouting.py:18,34`), with the org resolved from the field via `_org_of_field` (`scouting.py:17,33`). RLS: `has_org_role(..., array['owner','admin','agronomist','worker'])` for insert (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0007_rls.sql:89-90`). Authorship is recorded (`created_by uuid references public.users(id)`, `/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0005_farm_mgmt.sql:8`).

**Qeyd:** Ours-only versus a single-user mobile app: notes are multi-tenant team artefacts. But `created_by` is written (`routers/scouting.py:22,25`) and never SELECTed back (`scouting.py:36-37`) — the note list shows no author, so on a shared org account you cannot tell who scouted. Author does surface in the admin activity feed (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/admin.py:212-214`).

### AI auto-labelling of field photos (subject + condition) — ✅ VAR

**Bizdə:** Ours-only, no competitor equivalent described. Uploading to the separate `photos` section triggers Claude vision labelling: `POST /api/fields/{field_id}/photos` stores the file, then if `llm.is_configured()` calls `photo_label.label_and_store(...)` with a tier-selected model (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/photos.py:39-73`). The vision schema returns `subject` (free-text, e.g. 'Fındıq yarpağı') plus a constrained `condition` — `"healthy \| stress \| pest \| disease \| nutrient \| other"` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/ai/photo_label.py:22-26`) — persisted into `field_photos.ai_label/ai_condition/ai_notes/parsed` (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0031_marketplace.sql:100-112`). The gallery paints a coloured condition badge from a 6-entry map…

**Qeyd:** Important taxonomy wrinkle for the table: this is a SECOND, machine-assigned 6-value issue taxonomy (healthy/stress/pest/disease/nutrient/other) that overlaps but does not match the 7-value human scouting taxonomy (no weed, no damage; adds healthy/stress). They live in different tables and are never reconciled. Degrades gracefully: with no LLM key or on any exception the photo is still stored with a null label (`routers/photos.py:64-72`). Thumbnails here work correctly — they use the authenticated route `apiAsset('/api/photos/${p.id}/download')` (`PhotosTab.tsx:66`), the fix that scouting never received.

### AI photo disease/pest diagnosis from a photo — ✅ VAR

**Bizdə:** Ours-only. `POST /api/fields/{field_id}/diagnose` runs Claude vision and returns a structured diagnosis `{problem_type, confidence, observations, likely_causes[], recommended_actions[], disclaimer}` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/ai/diagnose.py:28-35`), persisted to `public.photo_diagnoses` (`/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations/0019_photo_diagnoses.sql:4-12`) with AI usage accounting. Endpoint at `/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/fields.py:185-213`; history at `fields.py:304-318`. UI: `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/field/PhotoDiagnose.tsx`, rendered inside the `analysis` section under anchor `id="photo-diagnose"` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/app/fields/[id]/page.tsx:313-315`).

**Qeyd:** Business-tier gated and quota'd: `photo_not_in_plan` / `photo_quota_exceeded` return 402 (`routers/fields.py:205-208`), which the UI renders as an upgrade CTA rather than an error (`PhotoDiagnose.tsx:52,95-102`); 503 when no LLM key. Safety-constrained by spec Rule 7 — the prompt forbids naming any pesticide/fertilizer brand or dose and mandates a registered-product-list pointer plus agronomist referral (`services/app/ai/diagnose.py:15-24`). This is the destination of the mobile camera FAB (`app/src/app/fields/[id]/page.tsx:343-352`), i.e. our 'quick capture' gesture produces a diagnosis, not a note.

### Notes surfaced beyond the notes list (AI context, reports) — ✅ VAR

**Bizdə:** Ours-only. (a) AI advice context pulls the 8 most recent notes — `select category, severity, note, observed_at::date as date from public.scouting_observations where field_id=$1::uuid order by observed_at desc limit 8` (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/ai/context.py:91-94`), emitted as the `"scouting"` block (`context.py:153`). (b) The field journal report interleaves notes with operations and tasks on one timeline, labelled and severity-translated (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/reports.py:779-815`), plus season-report tables at `reports.py:665-674` and CSV rows at `reports.py:728-730`. (c) Admin activity feed (`/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/admin.py:212-214`).

**Qeyd:** This is the strongest asymmetry in our favour for this area: a note is not a private map annotation, it is an input to the agronomy model and to the printable farm record. Caveats to disclose: the report label maps are hard-coded Azerbaijani (`_SCOUT_AZ`, `_SEVERITY_AZ` at `reports.py:102-105`) with no locale switch, so a Russian or Polish user's journal PDF still says 'Zərərverici'/'Açıq'; and the AI context receives the raw `severity` value, which per the severity row may be a number the model has no scale for.


## E. Sahə detalı ekranının strukturu

### Drag handle affordance — ❌ YOX

**Bizdə:** Nothing. Grepped `components/field` and `components/shell` for `snap`/`drag handle`/`touchmove`/`bottom sheet` — the only hits are `MetadataTab.tsx:146` (a state snapshot, unrelated) and the historical comment in `FieldMapSheet.tsx:6`. No sheet, therefore no handle.

**Qeyd:** Consequence of the sheet reversal above, not an oversight.

### Edit field boundaries after creation — ❌ YOX

**Bizdə:** `services/app/routers/fields.py:148-158` — `PUT /{field_id}` accepts **name only**: `name = (str(body.get("name") or "")).strip(); if not name: raise HTTPException(400, "name_required"); await conn.execute("update public.fields set name=$2 where id=$1::uuid", ...)`. No geometry parameter, and no other route in `fields.py` (endpoints enumerated at lines 36/92/105/128/148/161/174/185/217/248/273/286/304/321/336/355) writes `geom` after the initial POST.

**Qeyd:** Geometry drawing exists only in the creation wizard (`components/FieldMap.tsx` `DrawMap`, line 213, used by `FieldCreator`/`FieldOnboarding`). To change a boundary today a farmer must delete the field and redraw it — which also loses the processed scene history. Genuine gap; searched fields.py, the app route tree, and FieldMap exports.

### "Show on map" / jump to the field on an overview map — ❌ YOX

**Bizdə:** No such action on the field page. The multi-field map that would be its destination was REMOVED from the field list: `app/src/app/fields/page.tsx:3-6` — "Sahələr — a plain list. The multi-field map that used to be the hero was removed (E15): on this screen it answered a question nobody was asking". `FieldsOverviewMap` still exists and is mounted only on `components/home/TodayHome.tsx:338` and `app/admin/page.tsx:803`.

**Qeyd:** CLAUDE.md still lists "D4.3 desktop çox-sahə xəritə" as live — true for the home/"Bu gün" screen, NOT for /fields and never for the field detail page. Do not read that roadmap line as a field-detail capability.

### Fullscreen-expand button on the map — ❌ YOX

**Bizdə:** `DisplayMap`'s overlay controls are exactly: measure toggle, `SearchControl`, `BasemapControl`, `CoordBar` (components/FieldMap.tsx:700-731). No expand/fullscreen control. Grepped the whole `app/src` tree for `fullscreen\|Fullscreen\|Maximize\|Minimize` — the only hit is `ZonesTab.tsx:377`, and that is a zone STRATEGY option labelled "maximize", not a map control.

**Qeyd:** Partial substitute: the "Tam ekranda aç"-style handoff button in SatelliteGlance.tsx:95-100 navigates to the full `satellite` section, which gives a larger workbench — but it is a tab switch, not a map fullscreen.

### Fullscreen mode pinning the History strip to the bottom — ❌ YOX

**Bizdə:** No fullscreen map mode anywhere on the field page (see the fullscreen row above). The nearest layout change is switching to the `satellite` section, which gives a two-column workbench: index selector + time-series chart on the left, map + scene timeline on the right (`SatelliteTab.tsx:370-372, 437-556`). The timeline sits under the map in normal flow, not pinned.

### ⋮ overflow menu (Show on map / Rename / Edit boundaries / Share / Remove) — 🟡 QISMƏN

**Bizdə:** No overflow menu. A "Redaktə" gear button in the header (page.tsx:170-177) toggles an **inline settings panel** (page.tsx:183-238) holding exactly two of the five actions: **Rename** (input + save → `PUT /api/fields/{id}`, page.tsx:192-211) and **Remove** (two-step confirm → `DELETE`, page.tsx:213-235). **Share** is not in that panel — it is a separate `<ShareButton>` card at the BOTTOM of the status section (page.tsx:297).

**Qeyd:** Per-item: Rename HAVE · Remove HAVE (soft-delete with a 6s undo bar, page.tsx:100-126, 150-160) · Share HAVE but relocated · **Edit boundaries MISSING** · **Show on map MISSING**. See the two rows below.

### Rounded map card (~360dp) inside the detail screen — 🟡 QISMƏN

**Bizdə:** `components/field/overview/SatelliteGlance.tsx:131` renders `<DisplayMap polygon={field.geom} rasterUrl={active?.tile_url ?? null} />`, defaulting to `heightClass = "h-64"` = **256px** (`components/FieldMap.tsx:479`), `rounded-lg border` (FieldMap.tsx:701-704). It sits THIRD in the status scroll (page.tsx:293-297), below RainNowcast and FieldPulse.

**Qeyd:** Materially different in two ways: (1) ~256px vs OneSoil's ~360dp, and (2) it is not the hero — E14 pushed it below the verdict on purpose ("the page opens on the verdict rather than on scenery", DESIGN_IMPLEMENTATION_PLAN.md:308-310). On a metered connection the raster is not even fetched until tapped (`useDataSaver` → tap-to-load button, SatelliteGlance.tsx:46-48, 132-140).

### Layer chip on the map ("Vegetation") — 🟡 QISMƏN

**Bizdə:** Two different chips, neither exactly OneSoil's. (a) **Index switcher** — three chips ABOVE the map, not overlaid on it: `GLANCE_INDICES = ["NDVI", "NDMI", "NDRE"]` (SatelliteGlance.tsx:25, rendered 104-119). (b) **Basemap picker** overlaid on the map itself via `<BasemapControl>` (FieldMap.tsx:729, chip drawn at FieldMap.tsx:103 with a `Layers` icon) offering Hybrid/Satellite/Cloudless-S2/Street/Topo + hillshade.

**Qeyd:** Our overlaid chip changes the BASEMAP, not the index — the index chips are separate and above the frame. The full section (`SatelliteTab`) replaces the 3 chips with a 9-index `<select>` (SatelliteTab.tsx:375-381, `SENSOR_INDICES`).

### History strip of scene chips — 🟡 QISMƏN

**Bizdə:** Two strips, both **text-only**. Status glance: `SatelliteGlance.tsx:174-194`, `scenes.slice(0, 8)`, each chip = MM-DD + index value + cloud % with a `CloudSun` icon; tapping repaints the map above (`setSceneIdx(i)`). Full section: `SatelliteTab.tsx:525-548`, unlimited chips, each = date + cloud% + value + signed delta vs the previous visible scene.

**Qeyd:** **Key difference: our chips do NOT render the field's own shape with that date's raster.** They are date/number tiles. Rendering shape thumbnails would need N extra TiTiler requests per open. Also note the full-section strip is filtered by a cloud slider (`maxCloud`, SatelliteTab.tsx:242, 514-518) which the glance strip has no equivalent of.

### Crop card on the detail screen (colour dot + crop + pencil edit) — 🟡 QISMƏN

**Bizdə:** No dedicated crop card in the status scroll. Crop appears three places: (1) as a text fragment in the header subtitle — `cropLabelOf(crop)` inside `bits` (FieldHeader.tsx:203-207); (2) as read-only rows in the **metadata** section (`MetadataTab.tsx:274-281`: crop_cycle, crop_type, variety, planting_date, expected_harvest, previous_crop, growth_stage) behind an "Edit" button (MetadataTab.tsx:259-262); (3) as season cards in the **season** section (`SeasonTab.tsx:347-455`).

**Qeyd:** When crop is MISSING, `MetadataNudge` surfaces an inline one-tap `CropGrid` picker right inside the FieldPulse card (`overview/MetadataNudge.tsx:26-30, 78+`, mounted at FieldPulse.tsx:203) — but it deletes itself once the data exists (MetadataNudge.tsx:3-9), so an established field has no crop affordance on the status screen at all. Two tabs away, not one pencil tap.

### Remove crop — 🟡 QISMƏN

**Bizdə:** No "remove crop" control. `crop_type` is REQUIRED by the metadata form — `MetadataTab.tsx:198`: `if (!meta.crop_type \|\| !meta.crop_type.trim()) { ... }` blocks the save. A season row can be deleted wholesale (`SeasonTab.tsx` Trash2 action) or set non-current, and `field_seasons.crop_type` defaults to `''` = unknown (0034_seasons.sql:15), but there is no path that clears the crop while keeping the field's metadata row.

**Qeyd:** Closest equivalent is creating a new season with status `fallow` (one of preparation\|planted\|vegetation\|harvest\|fallow\|closed, SeasonTab.tsx:13).

### Add multi-crop (several crops on one field) — 🟡 QISMƏN

**Bizdə:** The schema allows several crops per field-year — `create unique index field_seasons_year_uq on public.field_seasons (field_id, season_year, crop_type)` (db/migrations/0034_seasons.sql:35) — so two rows with different crops in 2026 are legal, and SeasonTab's "Yeni mövsüm" form (SeasonTab.tsx:239-331) can create them. BUT only one can be active: `create unique index field_seasons_current_uq on public.field_seasons (field_id) where is_current` (0034_seasons.sql:36), and `field_metadata.crop_type` is strictly single-valued (`lib/types.ts:101`).

**Qeyd:** Everything downstream — the header subtitle, AI advice context, GDD, crop_thresholds norms, fertilizer plan — reads the SINGLE `field_metadata.crop_type` / current season. So a farmer can record intercropping in the season log, but the platform will analyse only one crop. Treat as PARTIAL, not HAVE.

### Weather forecast strip with sparklines — 🟡 QISMƏN

**Bizdə:** There is **no multi-day forecast on the field page**. The `weather` section renders `<WeatherHistoryTab>` (page.tsx:301), which is **history/climatology**: regional frost dates (B18), planting window, and the farmer's own rain log vs observed year-over-year precipitation (WeatherHistoryTab.tsx:1-5, 25-84). The only sparkline-bearing weather element is `RainNowcast` at the very top of the status section (page.tsx:293) — a one-sentence verdict plus a 15-minute-resolution precipitation bar sparkline covering the next ~2 hours (`RainNowcast.tsx:94-117`, `window_minutes` default 120).

**Qeyd:** Grepped the whole app for `forecast`: hits are only PricingCompare, DemoWeather, LandingHeroMap, `components/home/WeatherBar.tsx` and locale files. `WeatherBar` (current temp + WMO condition + spray chip) is mounted on the **"Bu gün" home**, not on the field detail. So OneSoil's per-field multi-metric forecast strip has no equivalent — closest is the 2-hour rain nowcast. RainNowcast renders NOTHING when data is unavailable (RainNowcast.tsx:66) rather than showing a placeholder.

### Spraying Windows card — 🟡 QISMƏN

**Bizdə:** Exists but is TWO tabs away from where OneSoil puts it. `components/field/KnowledgePassport.tsx:145-155` renders a "Səpmə pəncərəsi" tile with `best_window.start – best_window.end`, fed by the `spray_window` block of `field_knowledge` (filled by the daily weather cron, `deploy/run-weather.sh`). Weather alerts (frost/heat/wind, critical vs warning) render above the grid at KnowledgePassport.tsx:107-124. KnowledgePassport is mounted only inside `AiTab.tsx:158,165` — i.e. the **analysis** section.

**Qeyd:** A second, weaker spray signal does reach the status section: `RainNowcast` returns `spray_safe` / `minutes_to_rain` and its verdict sentence is written to say e.g. "hold off on spraying" (RainNowcast.tsx:27-28, 87-92). Note KnowledgePassport returns `null` entirely until the research worker has run (KnowledgePassport.tsx:52-59) — a brand-new field shows no spray card at all.

### Persistent floating "AI Agronomist" pill — 🟡 QISMƏN

**Bizdə:** No floating AI pill. The ONLY floating control on the field page is the **camera FAB** (`FieldMapSheet.tsx:45-54`, `fixed bottom-… right-4 z-30 … md:hidden`), which jumps to `?tab=analysis` and scrolls to the photo-diagnose card (page.tsx:343-354). AI itself is reached two ways: the `analysis` section (`AiTab.tsx` = advice card + KnowledgePassport + live chat, page.tsx:309-317) and a summary card `SignalsActions` pinned in the status scroll (page.tsx:296) with an "open full analysis" link (SignalsActions.tsx:84-89).

**Qeyd:** Confirmed by grep: `fixed bottom-` matches exactly one file in the whole app — FieldMapSheet.tsx. The FAB is mobile-only (`md:hidden`), so on desktop there is no floating element at all. Content-wise our AI is far deeper (structured risks with severity, recommendations, next_steps, disclaimer, per-field chat with 12-turn memory, TTS via SpeakButton) — the gap is purely one of persistent reachability.

### Draggable bottom sheet over a full-bleed map (map-first field view) — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** `app/src/components/field/FieldMapSheet.tsx` still has the name but is now a plain vertical shell: header → tabNav → children → camera FAB (lines 32-56). Its own header comment states the reversal: "It began as a full-bleed map with a draggable bottom sheet (mobile) / fixed right sidebar (desktop); the narrow ~440px column made the labels and controls cramped, so the content moved into a normal full-width column. Then E14 removed the hero map from the top of it as well … Nothing here renders a map any more" (FieldMapSheet.tsx:5-13). The field page renders `<div className="space-y-6">` stacked content (app/src/app/fields/[id]/page.tsx:337-377).

**Qeyd:** Double reversal, both deliberate: (1) the 3-snap sheet → full-width column, (2) E14 removed the hero map so "the page opens on the verdict rather than on scenery". docs/DESIGN_IMPLEMENTATION_PLAN.md:93 and :237 still describe the live 3-snap sheet as shipped — that is STALE; the code (and commit e4c20fb `docs(field): stop the FieldMapSheet header describing a map it no longer has`) is authoritative. The doc's "Təmizlənməmiş qalıq" note at DESIGN_IMPLEMENTATION_PLAN.md:378 (claiming FieldMapSheet still fetches /scenes on every open) is ALSO stale — commit 0ec417a removed that plumbing; the current file has zero fetches.

### No tabs — one continuous scroll — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** We are the opposite: **16 tabbed sections in 3 groups**, single source `app/src/lib/fieldSections.ts:41-76`. Monitoring (status, satellite, analysis, weather, zones) · Work (tasks, fertilizer, photos, scouting, operations, yields, harvest) · Records (season, soil, metadata, documents). `DEFAULT_SECTION = "status"` (fieldSections.ts:78). Tab state lives in the URL `?tab=` (page.tsx:59-68) so notifications/Telegram can deep-link. Only the active section's component mounts (page.tsx:291-333).

**Qeyd:** The nearest thing to OneSoil's single scroll is our **status** section, which stacks 5 blocks in one scroll: RainNowcast → FieldPulse → SatelliteGlance → SignalsActions → ShareButton (page.tsx:291-299). Everything else is behind a tab. Section keys were renamed in E14 with **deliberately no alias table** (fieldSections.ts:8-13): old `?tab=overview\|ai\|sentinel2\|nasa` links silently open "status" — no redirect, no 404.

### Satellite sensor choice (Sentinel-2 vs NASA HLS) on the screen — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** The page hard-codes `<SatelliteTab field={field} sensor="S2" />` (page.tsx:300). `app/src/lib/sensors.ts` sets `HLS_ENABLED = false` and `UI_SENSORS = ["S2"]`; the former `nasa` section was deleted from `fieldSections.ts` entirely.

**Qeyd:** The rollback flag is a trap: per CLAUDE.md and DESIGN_IMPLEMENTATION_PLAN.md:374-377, `HLS_ENABLED`/`UI_SENSORS`/`sensorVisible()` are consumed NOWHERE outside sensors.ts — flipping the boolean to true changes nothing, because page.tsx hard-codes the sensor and fieldSections.ts has no HLS entry. The HLS **data layer** is untouched and still feeds benchmark, A8 backfill and A6 zones (SatelliteTab.tsx:3-4, SatelliteGlance.tsx:11-12), and the NASA/Copernicus attribution deliberately remains on /status.

### Field name + area in the header — ✅ VAR

**Bizdə:** `app/src/components/field/FieldHeader.tsx:215-248`: back chevron (h-11 w-11), `<h1>` field name, and a subtitle line `bits.join(" · ")` built from area + crop + location (FieldHeader.tsx:205-207, 236-238). Area is rendered in the farmer's own unit via `formatArea(areaHa, areaUnit)` (FieldHeader.tsx:114-118).

**Qeyd:** We show MORE than OneSoil: name + area + crop + district + a 0-100 score pill. Unknown crop/location simply drop out of the line — no "—" placeholders (FieldHeader.tsx:9-12). Area unit is ha/dönüm/sotka per `users.area_unit` (P1.2), so "1.1 ha" may render as "11.0 dönüm" for a TR user.

### 0-100 health score pill next to the name — ✅ VAR

**Bizdə:** `FieldHeader.tsx:241-245` renders `<StatusChip tone={score.tone} label={"Sahə balı " + score.score} />` from `GET /api/fields/{id}/wellness`. Rendered ONLY when the API returns a real number (FieldHeader.tsx:10-12, 156). Fetch is deliberately delayed 1200ms (`SCORE_DELAY_MS`, FieldHeader.tsx:94-98) so it reads the row FieldPulse's mount just computed instead of racing a second server-side computation.

**Qeyd:** OneSoil has no equivalent. This is our differentiator — the same score also drives the left field-list panel dots (`FieldListPanel.tsx:578-584`) and the sort order (worst-first, FieldListPanel.tsx:332-344).

### Vertical gradient legend with no numbers — ✅ VAR

**Bizdə:** `SatelliteGlance.tsx:143-148` — a **horizontal** gradient bar `style={{ background: legend.grad }}` with three word labels below (`legend.low` / `legend.mid` / `legend.high`, e.g. Zəif / Orta / Sağlam), **no numeric ticks**. Ramp comes from `legendFor(index)` in `lib/indexStatus.ts` and is fixed so "the same value means the same colour on every date" (SatelliteGlance.tsx:142).

**Qeyd:** Orientation differs (horizontal, under the map, vs OneSoil's vertical on the left edge). The full section's `IndexLegend` (SatelliteTab.tsx:97-120) is the numeric variant — it appends the actual rescale bounds and states whether the range is fixed or per-scene auto-contrast, because there the range can change.

### Delta badge on the history chips (e.g. "-0.09") — ✅ VAR

**Bizdə:** `SatelliteTab.tsx:544-546` prints `fmtDelta(d)` per chip, coloured by `deltaClass(index, d)`. The colouring is index-aware: `HIGHER_IS_BETTER` (SatelliteTab.tsx:77) turns a rise green only for NDVI/EVI/SAVI/MSAVI/TVI/NDRE/CIre/NDMI; for NDWI/NBR the delta stays neutral grey "instead of lying" (SatelliteTab.tsx:75-81). `DELTA_EPS = 0.005` renders "±0.00" as flat. Separately SatelliteGlance.tsx:76-80, 157-166 shows one 4-week delta next to the big value.

**Qeyd:** We are stricter than OneSoil here: OneSoil paints a red badge unconditionally; we refuse to assign a direction to indices where a rise is not automatically good news. Our delta is per-scene-vs-previous-visible (i.e. it respects the cloud filter), not a fixed lookback.

### Planting date row — ✅ VAR

**Bizdə:** `field_metadata.planting_date` — displayed at `MetadataTab.tsx:277`, edited at `MetadataTab.tsx:363-368`. Also first-class per season: `field_seasons.planting_date` (`db/migrations/0034_seasons.sql:19`), form at `SeasonTab.tsx:274-280`, and `days_since_planting` is computed server-side (`SeasonTab.tsx:32`).

**Qeyd:** We have two competing stores for it — `field_metadata` (1:1 with the field, fully overwritten on every save) and `field_seasons` (per-season row added by 0034 precisely because "replanting ERASES last year's crop + planting date", 0034_seasons.sql:2-5). The header/AI context read field_metadata; the season cards read field_seasons. Worth flagging as a modelling wart if the comparison touches data fidelity.

### "Set harvesting date" row — ✅ VAR

**Bizdə:** `expected_harvest` — MetadataTab.tsx:278 (display) / 370-375 (edit); SeasonTab.tsx:282-288. Plus a distinct `actual_harvest_date` on the season row rendered at `SeasonTab.tsx:400-403` with an "actual" suffix.

**Qeyd:** We separate planned vs actual harvest, which OneSoil's single row does not. There is also a whole `harvest` section (`HarvestTab.tsx`) for post-harvest lots with server-generated trace codes (AGX-2026-…) that feed the sales module — far beyond OneSoil's scope.

### Crop edit: variety / hybrid — ✅ VAR

**Bizdə:** `field_metadata.variety` with crop-scoped options: `varietyOptions = VARIETY_OPTIONS_BY_CROP[meta.crop_type ?? ""] ?? []` (MetadataTab.tsx:237), displayed at 276, and selecting a new crop clears the stale variety (`if (nv !== meta.crop_type) set("variety", undefined)`, MetadataTab.tsx:347). Also `field_seasons.variety` (0034_seasons.sql:16, SeasonTab.tsx:268-270) and a chip picker `components/field/info/VarietyChips.tsx`.

### Crop edit: growth stage — ✅ VAR

**Bizdə:** `field_metadata.growth_stage` (MetadataTab.tsx:281, `GROWTH_STAGE_OPTIONS`) and `field_seasons.growth_stage` + `stage_source` enum `manual \| gdd \| ai` (db/migrations/0034_seasons.sql:23-25), form at SeasonTab.tsx:290-296, rendered at SeasonTab.tsx:421.

**Qeyd:** Richer than OneSoil: `stage_source` records whether the stage was typed by the farmer, derived from accumulated GDD, or inferred by the AI — OneSoil only takes manual input.

### Field navigation / list while a field is open — ✅ VAR

**Bizdə:** Not in OneSoil's list, but material for the comparison. On xl+ the shell mounts a 336px `FieldListPanel` beside the page (`components/shell/AppShell.tsx:41-47, 76-82`). When a field is open the list collapses to one row and `FieldSectionMenu` takes the space, listing all 16 sections grouped with icons (`FieldListPanel.tsx:459-484`, `components/shell/FieldSectionMenu.tsx:47-76`). Below xl the page renders horizontal chip rows instead (page.tsx:244-283); "The two are never on screen together" (FieldSectionMenu.tsx:5-8).

**Qeyd:** The panel has search, worst-first-vs-alphabetical sort, per-field score dots, and a season line with Σ area (FieldListPanel.tsx:445-457, 486-521). Two requests per org, 60s staleness guard, every failure degrades silently (FieldListPanel.tsx:12-19).

### UI-version feature flag on this screen — ✅ VAR

**Bizdə:** `app/src/lib/uiFlag.ts:14-36` — `useUiV2()` returns **true by default**; `?ui=v1` opts out and is sticky in localStorage. Consumed at page.tsx:55 and branched at page.tsx:337-377.

**Qeyd:** CRITICAL for anyone reading the docs: CLAUDE.md and DESIGN_IMPLEMENTATION_PLAN.md describe D2.3 as living "`?ui=v2` arxasında" (behind a flag). That is STALE — uiFlag.ts:12-13 states "v2 … is now the DEFAULT product UI … Kept as an escape hatch, not a rollout gate." And after the sheet reversal the two branches are nearly identical: v1 (page.tsx:369-377) renders the same header/tabNav/tabContent and differs only by having no camera FAB. So the flag no longer hides anything meaningful on this screen — unlike `lib/navFlags.ts SHOW_MARKETPLACE_NAV=false` and `lib/sensors.ts HLS_ENABLED=false`, which do hide built features.


## F. Sahə siyahısı və qruplaşdırma

### Group selector pill ("All fields") under the title — ❌ YOX

**Bizdə:** No group concept exists on any field list. `app/src/app/fields/page.tsx:249-264` renders only title + count/area subline + "Add field" button. The nearest string match is a red herring: `FieldListPanel.tsx:474-480` renders a `← All fields (N)` button (`app.shell.fieldListPanel.allFields` = "All fields", `en.ts:1179`) — that is a back-to-list control shown when one field is focused, not a group filter.

**Qeyd:** The DB has a genuine grouping entity — `public.farms` (`db/migrations/0003_core.sql:36-44`, fields join via `fields.farm_id`) — but it is deliberately invisible: onboarding auto-creates one org + one farm named "Əsas ferma" behind the farmer's back (`app/src/app/onboarding/page.tsx:3-5, 32-33`, "silent tenancy — auto-create the org + farm behind the scenes so a smallholder never sees 'create organization / create farm' forms"). So every farmer has exactly one implicit group and no way to make a second one from the app. There is also no field-level tag/group column anywhere in `db/migrations/0001..0050`.

### "⋮" overflow menu in the header — ❌ YOX

**Bizdə:** No overflow/kebab menu on either field list. The `/fields` header has exactly two controls (title block, add button) — `app/src/app/fields/page.tsx:251-264`. Per-field destructive/rename actions live on the field detail page instead, in a settings panel: `app/src/app/fields/[id]/page.tsx:182` ("Field settings/edit panel — rename + delete live here (delete no longer in the header)"), with soft-delete + a 6s undo bar at `:100-160`.

**Qeyd:** What sits in that visual slot for us is per-row, not per-screen: a `ShareButton` beside every row (`app/src/app/fields/page.tsx:329-331`). Note it renders as a full labelled button with text (`app/src/components/field/ShareButton.tsx:135-143`, `min-h-11` + "Sahəni paylaş"), not an icon — it is materially wider than a ⋮ and consumes row width on phones.

### Thumbnail rendered in the ACTIVE index's colours — ❌ YOX

**Bizdə:** Our thumbnail is hard-pinned to NDVI. `services/app/routers/indices.py:82-83`: `# Fixed: the list thumbnail is the "is it green" glance, not an index picker.` / `THUMB_INDEX = "NDVI"`. Colours come from `_raster_style()` (`indices.py:57-64`) → `rdylgn`, rescale `-0.1,0.9` for the vegetation family, so it matches the map's NDVI green but can never follow a user-selected index.

**Qeyd:** There is no active-index concept outside a single field page, so there is nothing for the thumbnail to follow. Changing this would need both an index parameter on `/api/orgs/{id}/thumbs` and a global layer state that does not exist.

### Mini gradient bar with a tick showing where the field sits on the scale — ❌ YOX

**Bizdə:** No list row anywhere renders a scale-position marker. The gradient primitive exists — `legendFor()` in `app/src/lib/indexStatus.ts:41-56` returns `linear-gradient(90deg,#d73027,#fee08b,#1a9850)` for vegetation and a blue ramp for water — but its three consumers all render a plain bar with low/mid/high words and NO tick: `app/src/components/field/SatelliteTab.tsx:100-122` (`IndexLegend`), `app/src/components/field/overview/SatelliteGlance.tsx:82`, `app/src/components/demo/DemoSatellite.tsx:46`. The ONE place in the codebase that draws a tick on a ramp is the public marketing landing: `app/src/components/landing/LandingHeroMap.tsx:239-247` — `<span className="absolute -top-1 h-[16px] w-[3px] rounded bg-white shadow" style={{ left: \`calc(${ndviPct}% - 1.5px)\` }} />` over a `.lp-ramp`, shown next to a live `NDVI 0.42` reading for an anonymous visitor's tapped field.

**Qeyd:** Sharp irony for the comparison: the exact widget the competitor puts in every list row already exists in our code, works, and is shown to strangers on agradex.com — but never to a signed-in farmer. Searched exhaustively: only two `style={{ left: …}}` positioned markers exist in the app (`FieldMap.tsx:887` is the compare-swipe divider; `LandingHeroMap.tsx:243` is this tick). `docs/ONESOIL_MOBILE_TEARDOWN.md:86-87` (§4.2) already lists this as a to-steal item.

### Global layer pill floating above the bottom nav — ❌ YOX

**Bizdə:** There is no persistent layer/metric pill anywhere in the app chrome. The bottom nav (`app/src/components/BottomNav.tsx:57-72`) is 4 slots + a `+` FAB and nothing floats above it. Index selection is component-local and per-field: `SatelliteTab.tsx:127` `const [index, setIndex] = useState("NDVI")` (a `<select>` at `:377`), and `SatelliteGlance.tsx:103-118` (three chips NDVI/NDMI/NDRE). Neither persists — no localStorage key for an index exists (full inventory of keys: auth cache, onboarding quiz, locale, `bagban.basemap`, `bagban.hillshade`, data-saver, `bagban_ui_v2`, done-flags, offline queue, area unit, install/trial dismissals, field-list collapse).

**Qeyd:** The closest structural analogue is the BASEMAP gallery — a `Layers` control on the map (`app/src/components/FieldMap.tsx:5`) whose choice IS global and persisted (`app/src/lib/basemaps.ts:62-75`, key `bagban.basemap`, options Hybrid/Satellite/s2cloudless/Street/Topo). But it switches background imagery, not the analytic metric, and it changes no number anywhere. `docs/ONESOIL_MOBILE_TEARDOWN.md:141` already records this gap as "Qat seçici \| qlobal, tablar arası qalır \| bölməyə bağlı".

### Layer choice drives what metric the list rows display — ❌ YOX

**Bizdə:** Structurally impossible today: the row metric is the stored wellness score fetched from `GET /api/orgs/{org_id}/wellness` (`services/app/routers/analytics.py:55`), which takes no index/layer parameter and returns one composite score per field. No list component accepts an index prop — see `app/src/app/fields/page.tsx:289-334`, `FieldListPanel.tsx:562-597`, `FieldGrid.tsx:84-90`.

**Qeyd:** Pair this row with the "index value" row in the table — they are the same architectural decision seen twice. Adding it means a new org-wide per-index read model, not a UI change.

### Search action in the list header — 🟡 QISMƏN

**Bizdə:** Search exists ONLY in the desktop side panel: `app/src/components/shell/FieldListPanel.tsx:487-504` (`<input type="search">`, the only `type="search"` in the whole app) filtering client-side by name with az collation at `FieldListPanel.tsx:347-350`. The `/fields` page itself has no search field at all (`app/src/app/fields/page.tsx` — no input element besides the row checkboxes).

**Qeyd:** Availability is the catch. `AppShell.showsFieldList()` (`app/src/components/shell/AppShell.tsx:41-47`) explicitly EXCLUDES `/fields` — comment: "NOT the exact '/fields' index — that page is itself the map-first field list, so the panel would duplicate it". The panel is also `hidden … xl:flex` (`FieldListPanel.tsx:422`). Net effect: on mobile there is NO field search anywhere, and on `/fields` there is none at any width. That AppShell comment is now STALE — the map was removed from `/fields` in commit 800597e, so `/fields` is a plain list, not a map-first list. `FieldMap.tsx:109-148` has a Search control but it is a Nominatim PLACE geocoder limited to Azerbaijan, not a field-name search.

### Group's total area right-aligned in the section header — 🟡 QISMƏN

**Bizdə:** We show ORG-level totals, never per-group. `/fields`: `app/src/app/fields/page.tsx:247` computes `totalHa` over all fields and `:255-257` renders `"{n} {plural(fields)} · {fmtArea(totalHa)}"` as a subline under the title. Desktop panel: a "season" row with the same idea, right-aligned — `FieldListPanel.tsx:445-457`, `Season {year}` left, `{total} fields · {formatArea(areaTotal)}` right (`ml-auto`), and its own comment cites OneSoil: "OneSoil 'Season 2026 · N.NN ha'".

**Qeyd:** The right-aligned total is genuinely present and was copied from OneSoil — it just describes the whole org rather than a group, because there are no groups. Areas everywhere are rendered in the farmer's own unit via `app/src/lib/units.ts` (ha / dönüm / sotka, `users.area_unit`, migration 0048) — the competitor is ha-only, which is a differentiator worth a row of its own.

### Per-row thumbnail showing THE FIELD'S OWN SHAPE — 🟡 QISMƏN

**Bizdə:** Present on `/fields` only: `FieldThumb` at `app/src/app/fields/page.tsx:101-125`, mounted inside the row link at `:314`. It is an `<img>` of a TiTiler `preview.png` of the field's clipped, boundary-masked NDVI COG — so the picture literally IS the field's outline. Backend: `services/app/routers/indices.py:76-110` (`GET /api/orgs/{org_id}/thumbs`, one org-wide query, `distinct on (r.field_id)`, S2 preferred over HLS). Size is `h-11 w-11` (44px), `sm:h-12 sm:w-12` (48px) — competitor is 52. `imageRendering: "pixelated"` because the COGs are ~30x25px natively (`indices.py:67-73`). Absent from the other two field lists: `FieldListPanel` rows show a 34x34 coloured score square instead (`FieldListPanel.tsx:578-584`), and the home `FieldGrid` cards show a generic `MapPin` lucide icon (`app/src/components/home/FieldGrid.tsx:42`).

**Qeyd:** BIGGEST CAVEAT IN THIS AREA: `FieldThumb`, the `/api/orgs/{id}/thumbs` endpoint AND its router registration (`services/app/main.py:41` `app.include_router(indices.org_router)`) are ALL UNCOMMITTED working-tree changes at HEAD e4c20fb — confirmed via `git diff`. They are not on production. Anyone writing "we have shape thumbnails" must qualify it as unshipped. Separately, `docs/ONESOIL_MOBILE_TEARDOWN.md:82-84` still lists shape thumbnails as a gap to close ("→ Bizdə: FieldListPanel sətirlərində … tətbiq oluna bilər") — the doc is behind the working tree, and it names the wrong component (the work landed on `/fields`, not FieldListPanel).

### Sort control on the list — 🟡 QISMƏN

**Bizdə:** Only in the desktop panel: `FieldListPanel.tsx:505-520`, a `<select>` with two orders, applied client-side at `:325-345` — "score" = worst-first (bad → warn → good → unscored, then ascending score) and "name" = az-collated alphabetical. The `/fields` page has no sort control; it renders farms' fields flattened in `created_at` order.

**Qeyd:** Same availability caveat as search: xl+ only, and not on `/fields`. The worst-first default is a deliberate agronomy choice (`FieldListPanel.tsx:321-324`: "The farmer's attention belongs at the top of a 336px column").

### Section headers = groups, with the group name — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** `/fields` renders ONE flat `<ul>` with no section headers: `app/src/app/fields/page.tsx:288-335`. Order is implicit — the page fans out over farms and flattens (`:211-215`), and each farm's fields come back ordered by `created_at` (`services/app/routers/fields.py:98`). The desktop panel is also flat and re-sorts globally (`FieldListPanel.tsx:325-345`). A farm-grouped list DOES exist but only in the legacy v1 dashboard: `app/src/app/page.tsx:275-315` renders one card per farm with `farm.name` + `farm.region` as the header, a per-farm "new field" link, and the farm's fields as a `<ul>` beneath.

**Qeyd:** CRITICAL FLAG: that grouped view is reachable only behind the sticky UI flag — `app/src/app/page.tsx:44` `return v2 ? <TodayHome /> : <Dashboard />` with `v2` from `app/src/lib/uiFlag.ts` (defaults true; `?ui=v1` opts out and persists in localStorage `bagban_ui_v2`). So we have a working grouped-by-farm field list that no farmer sees by default. It has no per-group area total. Also note `/api/fields/geo` (`services/app/routers/fields.py:105-126`) does NOT return `farm_id`, so the modern surfaces could not group by farm without extra requests even if they wanted to.

### Per-row index VALUE on the right (e.g. "0.19") — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** We never put a raw index number in a list row. Instead every row carries the composite 0-100 Field Wellness Score. `/fields`: `ScoreChip` at `app/src/app/fields/page.tsx:52-72` and `:321` — renders `{s.score}` + a `/100` suffix in a tone-coloured pill (green ≥70 / amber ≥45 / red, `bandOf()` at `:47-50`). Desktop panel: a filled 34x34 square with the number (`FieldListPanel.tsx:578-584`). Home grid: `ScorePill` (`app/src/components/home/ScoreBadge.tsx:82-105`). Source is a read-only model: `GET /api/orgs/{org_id}/wellness` (`services/app/routers/analytics.py:55-110`) returns the latest STORED score per field and explicitly NEVER computes on read (`:60-65`: "one computation runs ~8 queries … would turn opening a screen into a query stampede"). A field with no stored score renders NO chip at all (`fields/page.tsx:321` `{s && <ScoreChip …>}`) — never a placeholder number.

**Qeyd:** This is a deliberate philosophy difference worth its own table row: the competitor shows the measurement, we show a judgement that fuses NDVI, water balance, pest models, GDD and baseline (see `services/app/ai/wellness.py` and the proxy rule documented in CLAUDE.md). Consequence for the comparison: our number is comparable ACROSS fields but not to any published NDVI scale, and it cannot follow a layer switch. There is no org-wide endpoint that returns a per-field index value at all (only `/wellness` and `/thumbs` are org-scoped in this domain) — so putting "0.19" in a row would need new backend work, not just UI.

### Large screen title "Fields" — ✅ VAR

**Bizdə:** `app/src/app/fields/page.tsx:253` — `<h1 className="font-display text-2xl font-bold text-teal">{t("app.fieldsList.heading")}</h1>`. The key resolves to "Sahələr" in az (`app/src/lib/i18n.ts:2058`) and to "Fields" in en (`app/src/lib/locales/en.ts:2068`). The desktop side panel has its own heading `app/src/components/shell/FieldListPanel.tsx:426-428` (`app.shell.fieldListPanel.heading` = "Fields", `en.ts:1581`).

**Qeyd:** Two separate surfaces carry a "Fields" title: the `/fields` route page (all breakpoints) and the persistent 336px `FieldListPanel` column (xl+ only, and NOT on `/fields` itself — see `AppShell.tsx:41-47`). They are different components with different row designs, so the comparison must say which one it means.

### "+" (add field) action in the header — ✅ VAR

**Bizdə:** `app/src/app/fields/page.tsx:261-263` — `<Link href="/onboarding" className="btn-primary"><Plus/> {t("app.fieldsList.addField")}</Link>` ("Sahə əlavə et"). Also a raised centre FAB in the mobile bottom nav (`app/src/components/BottomNav.tsx:62-69`, `href="/onboarding"`), a "+" in the empty side panel (`FieldListPanel.tsx:550-555`) and a per-section add on the legacy dashboard.

**Qeyd:** Ours is a labelled primary button, not a 48dp icon-only affordance; it navigates to a full `/onboarding` wizard page rather than entering a draw mode over the current map.

### Field name in the row — ✅ VAR

**Bizdə:** `/fields`: `app/src/app/fields/page.tsx:316` — `<p className="truncate text-base font-bold text-ink">{f.name}</p>`. Desktop panel: `FieldListPanel.tsx:585-587`. Home grid card: `app/src/components/home/FieldGrid.tsx:43`.

**Qeyd:** All three truncate on overflow. Nothing notable diverges from the competitor here.

### Area shown beneath the name — ✅ VAR

**Bizdə:** `/fields`: `app/src/app/fields/page.tsx:317-319` — a second line under the name, `{fmtArea(f.area_ha)}` via `useFormatArea()`. Home grid: `FieldGrid.tsx:29-34` builds a meta line `area · statusWord`.

**Qeyd:** Layout differs in the desktop panel: there the area is right-aligned on the SAME line as the name (`FieldListPanel.tsx:588-590`, `ml-auto`), and the second line is a status pill + a plain-language wellness headline (`:592-594`, `StatusLine`) rather than the area. Unit is user-configurable (ha/dönüm/sotka) unlike the competitor.

### Multi-select rows + bulk actions — ✅ VAR

**Bizdə:** Ours, not the competitor's. Each `/fields` row carries a 44px checkbox target at its leading edge (`app/src/app/fields/page.tsx:293-305`) feeding a `selected: string[]`; a sticky bar appears once ≥1 field is picked (`:343-345` → `app/src/components/BulkActions.tsx`), offering one task per field or one operation-log row per field, written server-side in one transaction (`BulkActions.tsx:1-6`).

**Qeyd:** Worth a table row as a capability we have and they don't. Note the layout cost: the checkbox occupies exactly the leading 44px slot where OneSoil puts its 52dp thumbnail, so on `/fields` the shape thumbnail is pushed INSIDE the card, after the checkbox (`fields/page.tsx:310-314` documents this reasoning).

### Per-row share link — ✅ VAR

**Bizdə:** `app/src/app/fields/page.tsx:329-331` mounts `ShareButton` as a SIBLING of the row link (never nested — "an `<a>` may not contain a button", `:327-328`). It mints a revocable, view-counted public read-only field URL built onto the marketing apex (`app/src/components/field/ShareButton.tsx:34-38`, `publicUrl()`), and fetches nothing until opened.

**Qeyd:** Added in the same commit that removed the map from this screen (800597e: "drop the map from the list screen, add per-row share"). Competitor has share too but on the field detail, not per list row.

### Package/plan usage meter in the list header — ✅ VAR

**Bizdə:** `UsageBar` at `app/src/app/fields/page.tsx:129-175`, mounted at `:259`. Shows tier label + `used / max` (fields, or hectares when an admin set `hectare_cap`), a progress track, amber at the limit and a `/pricing` link. Backend `GET /api/orgs/{org_id}/usage` at `services/app/routers/orgs.py:90-116` — counts exactly what the create-field gate counts (`deleted_at is null`) and refuses to invent a hectare cap.

**Qeyd:** ALSO UNCOMMITTED — `UsageBar` and `/api/orgs/{id}/usage` are working-tree-only at HEAD e4c20fb (`git diff` confirms both). Not on production. Explicitly informational, never a block (`:127-128`).

### Per-row processing/analysis state ("preparing", "failed", "not assessed") — ✅ VAR

**Bizdə:** Desktop panel only: `StatusLine` at `FieldListPanel.tsx:148-189` reads `data_status` from `/api/fields/geo` and renders a spinner pill + explanatory sentence for `queued\|processing`, a failure pill for `failed`, and "not assessed" otherwise; when a score exists it instead shows a tone pill + the localized wellness headline. Home grid does a lighter version (`FieldGrid.tsx:27-63`). `/fields` rows show nothing for this — an unscored field simply has no chip.

**Qeyd:** Ours because fields are processed asynchronously (`data_status` from migration 0009, queue worker every 2 min). The competitor's rows always have a value because their pipeline is instant from the user's perspective. Good row for the table: our list can honestly say "still preparing", theirs cannot need to.


## G. Hava

### Full-screen precipitation/weather radar map — ❌ YOX

**Bizdə:** Nothing. No radar tile source exists anywhere in the codebase: `grep -rni "rainviewer\|openweather\|windy\|radar"` over `app/src services deploy docs` returns ONLY documentation hits (`docs/ONESOIL_MOBILE_TEARDOWN.md:106`, `docs/GAP_Analizi_Catismayan_Funksionalliqlar.md:11`, `docs/Bazar_Arasdirmasi_Platformalar_2026.md:38`) — zero code. `app/src/lib/basemaps.ts` offers 5 basemaps only (hybrid:24, satellite:32, s2:39, osm:46, topo:53); there is no weather/precipitation overlay layer and no layer picker entry for one. The only raster overlay the app draws is TiTiler-served satellite index COGs (`app/src/components/field/SatelliteTab.tsx`).

**Qeyd:** This is the single biggest gap in the area and it is a pure gap, not a design decision — `docs/ONESOIL_MOBILE_TEARDOWN.md:106` ("4.7 Hava = radar xəritəsi + zaman sürüşdürücüsü") documents the competitor's version as an observed finding, and `docs/GAP_Analizi_Catismayan_Funksionalliqlar.md:11` calls weather "table stakes" that everyone (EOSDA, OneSoil, xFarm, Agrio, Tarla.io) has. Nothing in `docs/ROADMAP.md` schedules a radar map — grep for hava/weather/radar there returns only T1/T2/T8/B3 rule-engine and irrigation items.

### Fields outlined on the weather map with their names — ❌ YOX

**Bizdə:** No weather map exists, and no map in the product renders field NAMES at all: `grep -rn 'type: "symbol"' app/src` returns zero hits — there is not a single MapLibre symbol/text layer in the codebase. The closest surface is the desktop multi-field map `app/src/components/FieldsOverviewMap.tsx`: polygons filled by wellness-score band (`fill-color` from a precomputed per-feature `color`, ~line 219-224) with a yellow outline `paint: { "line-color": "#facc15", "line-width": 2 }` (line 226). Identification is by click-through to `/fields/{id}` (lines 236-238), not by an on-map label.

**Qeyd:** Two sub-gaps for the table: (a) no weather basemap to draw fields onto, (b) no on-map field labels anywhere in the product. Outline colour is yellow (#facc15), not white. `FieldsOverviewMap` is desktop-only and lives on `/fields`, not on a weather surface.

### Vertical two-part precipitation-intensity legend on the map edge — ❌ YOX

**Bizdə:** No precipitation legend exists (no precipitation map). Our legends are different objects entirely: (1) `app/src/components/field/SatelliteTab.tsx:100-115` `IndexLegend` — a HORIZONTAL 3-stop gradient bar (low/mid/high) for the active vegetation/water index, optionally annotated with the numeric rescale range; (2) `app/src/components/FieldsOverviewMap.tsx:318-340` — a wellness-score band legend that deliberately lists only the classes actually present on the map (see the file header comment at line 8).

**Qeyd:** Worth noting for the table that our index legend is semantically labelled in the user's language (Zəif/Orta/Sağlam for vegetation, Quru/Orta/Nəm for moisture indices) whereas the competitor's radar legend is numberless colour only — but they are legends for different data, so this is not an offset.

### 7-day forecast promised to users — ❌ YOX

**Bizdə:** Marketing copy sells it in four places — `app/src/lib/i18n.ts:737` (`mkt.pricingFaq.a1Free`: free tier includes "7 günlük hava proqnozu"), `:926` (`mkt.compare.u3`), `:943` (`mkt.compare.rowWeather`), `:495` (`mkt.faq.q1Answer`: "Peyk sağlamlıq xəritəsi və hava proqnozu həmişə pulsuzdur") — but no authenticated screen renders a 7-day forecast (see previous row). The nearest in-app forecast surfaces are the 2-hour rain nowcast and the current-conditions bar.

**Qeyd:** This is a marketing-claim vs code contradiction, and per CLAUDE.md the code is authoritative. Anyone writing the comparison table must not source "we have a 7-day forecast" from the pricing page. The data is one small component away (weather_cache is populated daily), but today the claim is only satisfied on the public `/demo` page.

### Dedicated weather destination in the primary navigation — 🟡 QISMƏN

**Bizdə:** Weather is a PER-FIELD section, not a global nav tab. `app/src/lib/fieldSections.ts:49` declares it inside the "monitoring" group: `{ key: "weather", labelKey: "field.tab.weather", icon: "weather" }` (1 of 16 sections / 3 groups). Label is "Hava" (`app/src/lib/i18n.ts:131`). Reached only at `/fields/{id}?tab=weather`. The mobile bottom nav has exactly 5 destinations and none is weather — `app/src/components/BottomNav.tsx:47-52`: `/` (Bu gün), `/fields`, `/farm`, `/more` + a center "add field" FAB. There is no `/weather` route (`find app/src/app -maxdepth 2 -name page.tsx` lists 30 routes, none weather).

**Qeyd:** Structural difference: OneSoil makes weather a top-level, field-agnostic destination; we make it a sub-tab of one field, so a farmer with 5 fields has 5 weather sections and no cross-field weather view. The one place weather is field-agnostic-ish is the home screen bar (`app/src/components/home/WeatherBar.tsx`), which picks a SINGLE field — "the field that needs attention, else the first field we have a point for" (`app/src/components/home/TodayHome.tsx:226-233`).

### Bottom time-scrubber with a draggable now-marker and dot ticks — 🟡 QISMƏN

**Bizdə:** We have a NOW-anchored time axis but it is a static read-only sparkline, not a scrubber, and it is not attached to a map. `app/src/components/field/RainNowcast.tsx:94-117`: a row of 15-minute precipitation bars (`steps.map(...)`, height scaled against `peak` with `MIN_SCALE_MM = 0.5` at line 39 so drizzle stays visible), with a three-part caption row — left `t("app.field.rainNowcast.now")` ("İndi"), centre the total mm, right `+{windowLabel(windowMin)}` ("+2 saat"). Each bar carries a `title` tooltip `+{minutes} · {mm} mm` (line 102). Nothing is draggable and nothing re-renders a map. The nearest true timeline is the satellite scene timeline in `app/src/components/field/SatelliteTab.tsx:437` ("map with raster overlay + scene timeline / compare") — but that scrubs SATELLITE scenes, is past-only, and lives in the `satellite` section.

**Qeyd:** Report as "static 2-hour forecast sparkline, no scrubbing" rather than as a scrubber. The whole strip is decorative-by-contract: `RainNowcast.tsx:66` returns `null` if `!data.available \|\| steps.length === 0`, and `routers/nowcast.py:10-13` documents that an unreachable Open-Meteo returns `{"available": false}` with HTTP 200 so the strip "simply does not render" — it never shows an error. So on a bad-network day the farmer sees no weather element at all where OneSoil would still show a map.

### Visual past-observed vs future-forecast distinction on one timeline — 🟡 QISMƏN

**Bizdə:** We separate observed from forecast in the DATA MODEL but never encode it in a single timeline visual. `db/migrations/0036_weather_history.sql` creates `public.field_weather_daily` with an explicit `source text not null default 'openmeteo_archive' -- openmeteo_archive \| openmeteo_forecast`, and its header states weather_cache (0004) is "FORECAST-only". The two live in separate UI surfaces: observed history → the year-over-year chart in `app/src/components/field/WeatherHistoryTab.tsx:426-456` (Recharts ComposedChart, one `Line` per year from the archive + a grey `Bar` for the farmer's own rain-gauge readings); forecast → the future-only `RainNowcast` strip. `routers/weather_history.py:37` (`_ARCHIVE_LAG_DAYS = 5`) notes the archive lags today by ~5 days, so there is a real seam between the two.

**Qeyd:** The competitor's hatched-vs-solid track is a wordless "observation vs model" cue on one axis; our equivalent information is split across two components in two different sections of the field page (status vs weather), which no single view reconciles.

### "Weather Forecast" multi-metric card strip with sparklines inside field detail — 🟡 QISMƏN

**Bizdə:** Inside field detail we render exactly ONE forecast metric: `app/src/app/fields/[id]/page.tsx:293` puts `<RainNowcast fieldId={field.id} />` at the top of the `status` section — precipitation only, next ~2 hours, 15-minute steps, one bar sparkline. A genuine multi-metric multi-day strip EXISTS in the codebase but is wired only to the PUBLIC demo page: `app/src/components/demo/DemoWeather.tsx:23-56` renders a horizontally scrolling 5-day card strip (date, t_max/t_min °C, precip mm), mounted at `app/src/components/demo/DemoPage.tsx:213` (`{weather.length > 0 && <DemoWeather days={weather} />}`), fed by the unauthenticated `GET /api/public/demo` (`services/app/routers/demo.py:155-160`, `select distinct on (forecast_date) forecast_date, t_min, t_max, precip_mm, precip_prob from public.weather_cache`).

**Qeyd:** CRITICAL for the table — the 7-day forecast is fetched, cached and ALL seven metrics are stored, but no logged-in user can see them. `services/app/ai/weather.py:41-49` inserts `t_min, t_max, precip_mm, precip_prob, et0_mm, wind_max, rh_mean` into `public.weather_cache` daily. `grep -rn 'weather_cache' services/` shows the only readers are `demo.py`, `pest.py:18`, `irrigation.py:48` and the staleness join in `internal.py:208` — there is NO authenticated `/api/fields/{id}/weather` endpoint (full router endpoint list: `nowcast.py:88`, `weather_history.py:87,149,192,241,258,277`). `grep -rn 't_max\|precip_prob\|et0\|wind_max\|rh_mean' app/src` returns hits ONLY in `DemoWeather.tsx` and one…

### Weather data provider — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** One keyless provider for everything: `services/app/ai/sources/openmeteo.py` — `fetch_weather()` (line 17, 7-day daily incl. FAO ET0), `fetch_archive()` (line 75, historical), `fetch_hourly()` (line 124, 5-day hourly for spray/alerts), `fetch_minutely()` (line 173, `minutely_15` precipitation for the nowcast; its docstring at lines 178-184 explains that the block starts at LOCAL MIDNIGHT and that `forecast_minutely_15` is deliberately not used). Attribution is shipped: `i18n.ts:510` `mkt.footer.dataSources` and `i18n.ts:899` `mkt.status.src3Body` name Open-Meteo on the public /status page.

**Qeyd:** Open-Meteo has no precipitation-radar tile service, so a radar map would require a NEW third-party dependency (RainViewer / OpenWeather tiles) — the first weather dependency outside Open-Meteo and, unlike everything we ship today, likely key-bearing. That is the real cost line for the comparison table. `docs/ONESOIL_BENCHMARK.md:103` records that the competitor's own weather stack ("virtual weather stations" vs licensed radar) could not be determined.

### Live current conditions (temperature + condition) — ✅ VAR

**Bizdə:** `app/src/components/home/WeatherBar.tsx` — the "Bu gün" home header bar. It calls Open-Meteo DIRECTLY from the browser, keyless, at the field centroid: line 95-97 `fetch('https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...¤t=temperature_2m,weather_code&timezone=auto')`. Renders a WMO-code icon (`WmoIcon`, lines 50-61), a 26px temperature, the field name and a localized condition (`wmoDesc`, lines 40-48). Same pattern is reused on the public landing hero (`app/src/components/landing/LandingHeroMap.tsx:76-90,219-222`) for a signed-out visitor who draws a field.

**Qeyd:** Two things to flag: (1) it is a client-side third-party call, not same-origin — it bypasses our API, so it is not org-gated and not covered by the data-saver/offline paths; (2) it is strictly best-effort — `if (!cur && !now) return null` (line 123) means the entire bar disappears on failure, and the file header (lines 12-13) states "Anything that does not arrive is OMITTED… If nothing arrives, the whole bar renders nothing."

### Spray-window / can-I-spray-now guidance — ✅ VAR

**Bizdə:** Two layers. (1) Instant: `services/app/routers/nowcast.py:88-193` `GET /api/fields/{id}/rain-nowcast?window=30..360` returns 15-min steps plus `spray_safe`, `minutes_to_rain` (rounded to 5 min, line 158) and a CODE+PARAMS verdict (`nowcast.rainNow` / `nowcast.rainSoon` / `nowcast.dryHours\|dryMinutes`, lines 161-169; `RAIN_MM_THRESHOLD = 0.1` at line 34). Surfaced as the home spray chip (`WeatherBar.tsx:64-73,140-150`) and the nowcast verdict line (`RainNowcast.tsx:90-92`). (2) Planned: `services/app/ai/weather.py:143-163` `compute_spray_window()` grades 72 hourly slots good/marginal/unsuitable against wind <3 or >15 km/h, temp <5 or >28 °C, RH <40 %, rain now or within 4 h (`_spray_suitability`, lines 106-140) and picks the earliest ≥2-hour daytime (06:00-20:00) good run, stored as the `spray_window` field_knowledge block.

**Qeyd:** Distribution problem worth a table note: the 72-hour graded `hours` array is computed and stored but only `best_window` and `alerts` are rendered — `app/src/components/field/KnowledgePassport.tsx:145-153` shows just "best window start – end". Worse, the Knowledge Passport is PAID-GATED (`services/app/routers/knowledge.py:25-28`, free tier gets an empty passport; `services/app/tiers.py:27` `"passport": False` for free) AND it is rendered in the `analysis` section (`app/src/components/field/AiTab.tsx:158,165`), not in the `weather` section. So a free user's only spray guidance is the 2-hour rain nowcast. The competitor also paywalls Spraying Windows (`docs/ONESOIL_MOBILE_TEARDOWN.md`, §5…

### Frost / heat / wind weather alerts — ✅ VAR

**Bizdə:** `services/app/ai/weather.py:166-192` `compute_alerts()` scans the next 48 h: frost when `tmin <= crop_thresholds.frost_threshold_c` (default 2.0 °C), severity `critical` if the field is flowering/budding (`sensitive` detection at `weather.py:214-216`), heat when `tmax >= heat_threshold_c`, wind when max >40 km/h. Stored in the `spray_window` block, then dispatched by the rule engine: `services/app/rules/engine.py:37-56` `_weather_candidates()` → in-app `public.notifications` insert (`engine.py:159-162`) + Telegram (`engine.py:175,180-192`). Anti-spam: quiet hours 22:00-07:00 Asia/Baku with critical override (`engine.py:25`), 18 h cooldown per (field, rule_type) unless severity escalates (`engine.py:26`). They surface in the home attention strip (`app/src/components/home/TodayHome.tsx:304-307`) and the notification bell.

**Qeyd:** Three notes for the table. (1) `services/app/tiers.py:27` declares `"weather_alerts": False` for the free tier, but that flag is NEVER ENFORCED — `grep -rn 'weather_alerts' services/app` shows it only in tiers.py and the feature-list echo at `routers/orgs.py:85`; `rules/engine.py` contains no tier/`org_is_paid` check at all, so free users do receive weather alerts today. (2) Alert titles and bodies are HARDCODED AZERBAIJANI — `engine.py:30-32` (`"🥶 Şaxta xəbərdarlığı"` etc.) and `engine.py:54` `"body": a.get("detail")`, which takes the AZ fallback string and DROPS the `detail_code`/`detail_params` twin that `weather.py:180-192` bothered to produce; so a Russian or Turkish user gets…

### Regional frost-date climatology / planting window — ✅ VAR

**Bizdə:** No competitor equivalent observed — this is ours. `services/app/routers/weather_history.py:87` `GET /api/fields/{id}/frost-dates` computes last-spring / first-autumn frost percentiles from ~20 years of the Open-Meteo archive for the field's rayon, cached for a year in `zone_knowledge` (`FROST_CROP='*'`, `FROST_BLOCK='frost_dates'`, `FROST_TTL_DAYS=365`, lines 30-33) so every field in the rayon reuses one computation. UI: `app/src/components/field/WeatherHistoryTab.tsx:252-334` — three stat tiles (median last spring frost, median first autumn frost, frost-free days with min–max), a green "safe planting window" callout (lines 297-311) and a provenance line naming Open-Meteo, the year range and the °C threshold (lines 321-329). Heading "Bölgənin şaxta tarixləri" (`i18n.ts:1608`).

**Qeyd:** Explicitly NOT paid-gated — `routers/weather_history.py:6-7`: "NOT paid-gated (the Knowledge Passport is; this is basic safety information)". This and the rain log are what actually occupy our `weather` section, i.e. our weather tab is a HISTORY/CLIMATOLOGY tab where the competitor's is a LIVE RADAR tab. That framing difference is the headline of the comparison.

### Farmer's own rain-gauge log + year-over-year precipitation chart — ✅ VAR

**Bizdə:** No competitor equivalent observed. `db/migrations/0036_weather_history.sql` creates `public.field_rain_log` (unique per field+date) and `public.field_weather_daily` (observed archive). Endpoints `GET/POST/DELETE /api/fields/{id}/rain` (`routers/weather_history.py:241,258,277`), `POST /api/fields/{id}/weather/backfill` (line 149, 1-30 years) and `GET /api/fields/{id}/weather/yearly?years=` (line 192). UI in the `weather` section: a date+mm entry form with a recent-entries list (`WeatherHistoryTab.tsx:337-398`) and a ComposedChart overlaying the farmer's measured monthly totals as grey bars on top of one archive line per year (`WeatherHistoryTab.tsx:426-456`), with 3/5/10-year buttons (`YEAR_CHOICES` line 102) and an explicit "load/refresh archive" button (lines 461-472).

**Qeyd:** The archive is NOT auto-populated — the farmer (or someone) must press the backfill button before the chart has anything to draw; until then the tab shows a placeholder (`WeatherHistoryTab.tsx:466-473`). Good differentiator to claim, but note the manual first step.

### Weather-derived agronomy (FAO-56 water balance, ET0, GDD) — ✅ VAR

**Bizdə:** `services/app/ai/weather.py:51-66` computes a 7-day net irrigation need ≈ Σ(ET0·Kc) − Σ(precip) with Kc from `crop_thresholds.kc_stages` (`_kc_for`, lines 227-237) else a habit default (`_KC_DEFAULT`, line 15), upgraded to a full FAO-56 daily-depletion balance when a soil profile exists (`weather.py:70-86`, `ai/irrigation.py`). Result is the `water_requirements` block, rendered in `app/src/components/field/KnowledgePassport.tsx:157-178` (net need sentence via CODE+PARAMS, plus an NDMI cross-check mismatch note). Refresh cadence: one daily cron `45 3 * * *` → `deploy/run-weather.sh` → `POST /api/internal/weather/drain?limit=200` (`services/app/routers/internal.py:199-226`), which also runs the rule engine and GDD per field.

**Qeyd:** Two caveats. (1) Everything weather-derived is at most 24 h stale and the drain processes only `limit` least-recently-updated fields per night (`internal.py:208-210` orders by `max(fetched_at) nulls first`), so it is nothing like a live radar refresh. (2) GDD is computed and has an endpoint — `services/app/routers/indices.py:267 GET /{field_id}/gdd` — but has ZERO frontend consumers (`grep -rni 'gdd' app/src` finds only the wellness component label, the frost card's "GDD start" sentence at `WeatherHistoryTab.tsx:305-306`, and marketing copy such as `i18n.ts:663,725-726`). So "GDD istilik toplanması" is another marketing claim with no dedicated screen.


## H. Profil, hesab, ayarlar, i18n, vahidlər

### Workspace logo — ❌ YOX

**Bizdə:** No logo/avatar column exists. `db/migrations/*.sql` has no `logo` column on `public.organizations` (grep for 'logo' across `/Users/mirshahbazseyidli/Desktop/bagbanai/db/migrations` and `app/src/lib/types.ts` returns nothing). `Org` in `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/lib/types.ts:21-26` is `{id, name, country?, role}` only.

**Qeyd:** Not planned anywhere in docs/ROADMAP.md. Also no user avatar/profile photo anywhere in the product.

### Change email (shows the address) — ❌ YOX

**Bizdə:** The address is shown read-only on `/account` (`Card Icon={Mail} … value={user?.email}`, `app/src/app/account/page.tsx:50`) and as plain text on `/more` (`more/page.tsx:77`) — with no action. There is no endpoint: `/Users/mirshahbazseyidli/Desktop/bagbanai/services/app/routers/auth.py` exposes only signup/verify-otp/resend-otp/login/logout/me/onboarding/area-unit/locale/name-public/email-lifecycle (`@router` decorators at lines 145,175,210,223,242,248,265,278,332,345,367,378,389,398,407). No `update public.users set email` anywhere in `services/app` outside admin.

**Qeyd:** Verified by grepping the whole backend, not just auth.py. The only user-record writes an admin can do are `is_active/is_admin/email_verified/full_name` (`services/app/routers/admin.py:527-560`) — email is not among them, so even an admin cannot change it.

### Change password — ❌ YOX

**Bizdə:** DEAD UI. `/account` renders a Password card whose 'action' is a non-interactive `<span>`: `app/src/app/account/page.tsx:51` — `action={<span className="text-xs font-semibold text-emerald-700">{t("app.account.change")}</span>}`. `Card` (lines 26-37) is a plain `<div>` with no onClick/href, so tapping 'Dəyiş'/'Change' does nothing. Backend: `hash_password`/`verify_password` are used only by signup (auth.py:160) and login (auth.py:230); there is no change-password, no forgot-password and no reset-password endpoint (grep 'password' across `services/app` returns only config/schemas/security/auth/notify).

**Qeyd:** CRITICAL for the table: this is worse than MISSING — the UI advertises the capability. There is also no password-reset flow at all, so a farmer who forgets their password has no self-service recovery path (only admin intervention on the DB). OTP exists but is signup-verification only (auth.py:65-73,175-207).

### Delete account — ❌ YOX

**Bizdə:** No route, no component, no endpoint. Grep for `delete.account\|delete_account\|account_delete` across `app/src`, `services/app` and `db` returns nothing. The closest is admin-only deactivation: `PATCH /api/admin/users/{id}` with `is_active` (`services/app/routers/admin.py:527-545`), enforced at login by `if not row["is_active"]: 403 account_disabled` (auth.py:232-233).

**Qeyd:** Relevant to the Legal row too — no self-service deletion is a GDPR gap for the EU locales we ship (de/hu/it/pl). docs/ROADMAP.md tracks legal work as T25/U12 and both are still ⬜ (ROADMAP.md:143,182).

### Push-notification toggles (Vegetation index updates / Recommendations / New features) — ❌ YOX

**Bizdə:** No web push at all: grep for `PushManager\|pushManager\|Notification.requestPermission\|web-push\|vapid` across `app/src`, `app/public` and `services/app` returns nothing; `app/public/sw.js` has no push handler. There are also no per-category notification preferences — grep for notification prefs/settings endpoints across `services/app/routers` returns nothing. Alerts land in-app only (`app/src/app/notifications/page.tsx`, `GET /api/notifications`) and, when the bot token is set, in Telegram.

**Qeyd:** Our nearest analogue is a SINGLE non-transactional email switch: `EmailLifecycleToggle.tsx` → `GET/POST /api/auth/email-lifecycle` → `users.email_lifecycle` (`services/app/routers/auth.py:398-413`). Its header comment (lines 3-6) records that the previous per-alert email path and the separate `users.email_alerts` flag were REMOVED in E15/migration 0047 — so the granularity moved backwards on purpose (one Wednesday digest instead of per-event mail). That is a genuine design decision, but the result is that we have zero notification-category control versus their three.

### Export field boundaries — ❌ YOX

**Bizdə:** Effectively absent in production. `/account` shows a 'Məlumatı endir / Download data — Sahə və sərhədlər' card whose CTA is a non-interactive `<span>` with no handler (`app/src/app/account/page.tsx:54`; `Card` is a plain div, lines 26-37) — pure dead UI, same pattern as Change password. The real export helpers exist (`app/src/lib/geoio.ts:7` `polygonToGeoJSON`, `:21` `polygonToKML`, `:42` `downloadText`) but their ONLY call sites are `app/src/components/FieldCreator.tsx:159,167` — and FieldCreator is an ORPHANED component: `grep -rn "components/FieldCreator" app/src` returns nothing (the field wizard is `FieldOnboarding`, mounted at `app/src/app/onboarding/page.tsx:56` and `app/src/app/farms/[farmId]/fields/new/page.tsx:29`).

**Qeyd:** So: no export of a SAVED field's boundary anywhere, no bulk export of all boundaries, and the settings entry point that promises it is inert. Import is alive and richer than export — FieldOnboarding accepts .geojson/.json/.kml/.zip/.shp (`app/src/components/field/FieldOnboarding.tsx:508`, shapefile via `geoio.ts:102 parseShapefile`). What we DO export is tabular, not geometric: season/journal/cost CSV from `/reports` (`app/src/app/reports/page.tsx:200,233,275,387`).

### Privacy policy — ❌ YOX

**Bizdə:** No route, no link. `find app/src/app -type d` matching privacy/terms/legal returns nothing; `LandingFooter.tsx` (the only footer) has Product / Solutions / Account columns and a bare copyright line (`LandingFooter.tsx:39-90`) with no Legal column.

**Qeyd:** Tracked but unstarted: docs/ROADMAP.md:143 lists T25 (D3 consent/audit/k-anon infra) as ⬜ and U12 (legal/state agreements) as ⏳ at ROADMAP.md:108. This is a live compliance gap given we ship de/hu/it/pl to EU users and collect email + field geometry + optional lab documents.

### Terms of Use — ❌ YOX

**Bizdə:** Same as privacy — no route, no link anywhere in `app/src/app` or the footer. The only 'terms'-adjacent copy is marketing FAQ text in `app/src/components/PricingFaq.tsx` and locale files.

**Qeyd:** Signup collects email + password + country/region + name with no terms acceptance checkbox (`app/src/app/signup/page.tsx:100-114` posts no consent field, and `SignupIn` in `services/app/schemas.py:25-34` has no consent column).

### Share app — ❌ YOX

**Bizdə:** No app-level share. `grep -rn "navigator.share" app/src` returns nothing. What we have is FIELD sharing, which is a different feature: `app/src/components/field/ShareButton.tsx` mints a revocable public token link to one field (`/s/{token}`, `services/app/routers/shares.py`), with expiry options, view counters and revoke.

**Qeyd:** Field share is arguably the more valuable capability (send a field card to a buyer/bank with no account needed) but it is not the same row. Note the middleware ordering trap documented in CLAUDE.md: the `/s/` allowlist must stay ABOVE the auth gate (`app/src/middleware.ts:72-77` before :79) or every shared link hits a login wall.

### Editing your own profile fields (name / country / region) — ❌ YOX

**Bizdə:** `/account` shows country+region read-only (`app/src/app/account/page.tsx:53`, falling back to `t("app.account.notSet")`), and the full name is never shown. No endpoint writes `users.full_name`, `users.country` or `users.region` for the caller — the only writes are the signup INSERT (`services/app/routers/auth.py:154-162`), the admin patch (`services/app/routers/admin.py:527-560`, full_name only), and the provider upsert (`providers.py:96`, role only).

**Qeyd:** Directly compounds the Turkey/dönüm bug: a Turkish farmer who picked the wrong country at signup cannot correct it, so they cannot reach the dönüm auto-default either. `users.country` is stored as an Azerbaijani exonym string (`signup/page.tsx:30-37`) rather than an ISO code, which is what breaks the mapping in the first place.

### Profile / settings tab (top-level entry point) — 🟡 QISMƏN

**Bizdə:** We have TWO overlapping entry points, not one Profile tab. `/more` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/app/more/page.tsx`) is the mobile overflow destination in BottomNav (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/BottomNav.tsx:52-53`, label `bnav.more`). `/account` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/app/account/page.tsx`) is the desktop rail's gear icon (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/shell/AppRail.tsx:99-102`, `{ href: "/account", label: t("app.shell.appRail.account"), Icon: Settings }`) and is ALSO listed as a row inside `/more` (`more/page.tsx:37`). No user avatar, no workspace header block.

**Qeyd:** The two pages duplicate each other: DataSaverToggle, AreaUnitSetting, EmailLifecycleToggle and LanguageSwitcher are mounted on BOTH (`more/page.tsx:69-73` and `account/page.tsx:52,66-69`). NamePublicToggle is only on `/account` (`account/page.tsx:69`). `app.account.title` is literally "Parametrlər"/"Settings" (i18n.ts:1834, locales/en.ts:1785) while `/more` row calls it "Hesab / parametrlər" (i18n.ts:265) — so the same screen is named two different things. There is no separate 'My account' vs 'Settings' split like OneSoil's.

### Workspace name shown in profile — 🟡 QISMƏN

**Bizdə:** The org name is NOT on `/account` or `/more` at all. The only place it renders next to the user is the desktop-only left field-list panel: `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/shell/FieldListPanel.tsx:380-388` builds `ownerLine` = `${orgName} · ${roleLabel}` and paints it at line 429-431 under the heading. That panel is `xl:flex` / hidden below xl (`FieldListPanel.tsx:421-423`) and only mounts on `/` and `/fields/{id}` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/shell/AppShell.tsx:40-46,79`).

**Qeyd:** So on a phone — the platform the competitor was measured on — the farmer never sees which workspace they are in. FieldListPanel also hardcodes `orgs[0]` (`FieldListPanel.tsx:254-261`); it does not follow the org selected elsewhere.

### Role shown in profile ("Workspace owner") — 🟡 QISMƏN

**Bizdə:** Two different 'roles' exist and the settings page shows the wrong one for this comparison. `/account` renders a Role card via `roleLabel(user?.role)` (`app/src/app/account/page.tsx:17-24,55`) which resolves the MARKETPLACE role (`farmer\|lab\|consultant\|supplier`, `UserRole`), not org membership. The org membership role (`owner\|admin\|agronomist\|worker\|viewer`, `app/src/lib/types.ts:19`) is rendered only in `FieldListPanel.tsx:56-71` (`roleLabelOf`) and on `/team` (`app/src/app/team/page.tsx:13-17,161`).

**Qeyd:** A person writing the table should not read our '/account → Role: Fermer' as equivalent to OneSoil's 'Workspace owner' — they are different axes. Ours says what kind of business you are; theirs says your permission level in the workspace.

### Workspace switcher (expand chevron in profile header) — 🟡 QISMƏN

**Bizdə:** An org switcher exists but is a bare `<select>` on the home screen, not in the profile: `/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/components/home/TodayHome.tsx:262-275`, gated on `orgs.length > 1`. A second, independent org `<select>` lives on `/team` (`app/src/app/team/page.tsx:49-58`). The legacy v1 dashboard had a third (`app/src/app/page.tsx:204-215`, also `orgs.length > 1`).

**Qeyd:** Selection is component-local React state — there is no global 'current workspace' context, so switching org on 'Bu gün' does not change `/fields`, `/farm`, `/reports` or FieldListPanel, all of which independently take `orgs[0]` (e.g. `app/src/app/fields/page.tsx:205-224`). This is a materially weaker multi-workspace story than OneSoil's.

### Sectioned 49dp row list layout (icon + label + chevron, labelled sections) — 🟡 QISMƏN

**Bizdə:** `/more` uses exactly this pattern but WITHOUT section labels: `min-h-14` rows, 20px lucide icon, label, `ChevronRight` (`app/src/app/more/page.tsx:52-65`), one flat list. `/account` deliberately uses a different shape — a 3-column card grid (`account/page.tsx:26-37,49`) plus stacked toggle rows.

**Qeyd:** The `/account` file header calls itself 'OneSoil-style card grid' (`account/page.tsx:3-4`) — that comment describes the intent, but the rendered result is a card grid, not OneSoil's row list. Neither page has labelled sections ('Learn more', 'Support & Help', 'Legal').

### Settings sub-screen (Language + Unit system + notification toggles grouped) — 🟡 QISMƏN

**Bizdə:** There is no dedicated Settings screen. The controls are inlined on both `/more` and `/account`: LanguageSwitcher (`more/page.tsx:67-70`, `account/page.tsx:52`), AreaUnitSetting (`more/page.tsx:72`, `account/page.tsx:67`), EmailLifecycleToggle (`more/page.tsx:73`, `account/page.tsx:68`), DataSaverToggle (`more/page.tsx:71`, `account/page.tsx:66`), NamePublicToggle (`account/page.tsx:69` only).

**Qeyd:** Flat, not nested — one fewer tap than OneSoil, but also no grouping, and the duplication across two pages means a change made on one page is invisible to a user who only knows the other. AreaUnitSetting/EmailLifecycleToggle/NamePublicToggle each self-hide on API failure or signed-out (`AreaUnitSetting.tsx:40-49`, `EmailLifecycleToggle.tsx:17-21`, `NamePublicToggle.tsx:12-19`), so the settings list silently changes length offline.

### Area unit auto-default from country — 🟡 QISMƏN

**Bizdə:** Designed as: NULL = derive from `users.country` (TR → donum, other explicit country → ha, no country → interface language tr → donum, else ha). Implemented twice on purpose: `app/src/lib/units.ts:154-160` (`defaultAreaUnit`) and `services/app/routers/auth.py:300,303-315` (`_effective_area_unit`, `_TURKEY = {"TR","TUR","TURKEY","TÜRKIYE","TÜRKİYE"}`).

**Qeyd:** ⚠️ THE AUTO-DEFAULT IS DEAD FOR TURKEY. Signup stores the country as the canonical AZERBAIJANI exonym, not an ISO code — `app/src/app/signup/page.tsx:30-37` `const COUNTRIES = [{ value: "Azərbaycan", code: "AZ" }, { value: "Türkiyə", code: "TR" }, …]` and line 106 posts `country` (the `value`). `"Türkiyə".upper()` is `"TÜRKIYƏ"` (final schwa Ə), which is NOT in `_TURKEY` — verified with python3. Worse, the very next line `if c: return "ha"` (auth.py:311-312) short-circuits, so the `locale === "tr"` fallback can never rescue it either. Net effect: a Turkish farmer registering through the wizard is shown hectares unless they open settings and pick dönüm by hand — the exact scenario the…

### Telegram alert channel opt-in — 🟡 QISMƏN

**Bizdə:** `app/src/components/TelegramConnect.tsx` (status + connect URL + opt-in toggle) against `GET /api/messaging/telegram` and `POST /api/messaging/telegram/optin` (`services/app/routers/messaging.py:15,40`). It self-hides until the bot is configured server-side: `if (!s \|\| !s.configured) return null;` (`TelegramConnect.tsx:31`).

**Qeyd:** TWO reasons it is invisible today. (1) `TELEGRAM_BOT_TOKEN` is empty in production (CLAUDE.md secrets section), so `configured` is false. (2) Even with a token it would still not render: `<TelegramConnect />` is mounted at `app/src/app/page.tsx:198`, which is inside the legacy `Dashboard()` component, and the home picks `v2 ? <TodayHome/> : <Dashboard/>` (`page.tsx:44`) where v2 is now the DEFAULT (`app/src/lib/uiFlag.ts:12-17`, `useState(true)`). So the Telegram opt-in is only reachable at `?ui=v1`. This is a flag-hidden finished implementation of exactly the kind the brief warns about.

### Subscription screen — 🟡 QISMƏN

**Bizdə:** No in-app subscription screen. `/more` links to `/pricing` labelled 'Qiymətlər / paketlər' (`app/src/app/more/page.tsx:38`), which is the public MARKETING page (`app/src/app/pricing/page.tsx` → `PricingView`). Live plan/usage does surface, but on the fields list, not in settings: `UsageBar` in `app/src/app/fields/page.tsx:129-175` (tier label + fields-or-hectare quota + amber at-limit link to /pricing), fed by `GET /api/orgs/{id}/usage`. Trial state has its own banner: `app/src/components/TrialBanner.tsx` against `GET /api/orgs/{id}/subscription` (`services/app/routers/orgs.py:62-79`).

**Qeyd:** Two traps. (1) On the app host, tapping /pricing LEAVES the app: middleware redirects `/pricing` (and /guide, /how-it-works, /whats-new, /status, /demo, /solutions) to the marketing apex — `app/src/middleware.ts:72-77`. (2) The richest subscription view — package label + fields-used + advice-used + 'change package' link — is in the legacy dashboard only (`app/src/app/page.tsx:173-192`), i.e. `?ui=v1`. Also there is no payment integration at all (CLAUDE.md deviation #2); tiers are set by hand in the admin panel (`app/src/app/admin/page.tsx:899-912`).

### Updates history / changelog — 🟡 QISMƏN

**Bizdə:** `/whats-new` exists and is a real, translated Server Component changelog (`app/src/app/whats-new/page.tsx`, metadata + `getT()`), with `/yenilikler` 308-redirecting to it. But it is NOT linked from anywhere inside the app: `grep -rn "whats-new" app/src` outside its own route returns only `app/src/middleware.ts:74` and `app/src/components/landing/LandingFooter.tsx:62` — i.e. the marketing footer only. Neither `/more` nor `/account` links to it.

**Qeyd:** A signed-in farmer on app.agradex.com has no path to it. And because `/whats-new` is in the middleware's marketing allowlist (`middleware.ts:74`), even a direct hit from the app host bounces to the apex. The file header (`whats-new/page.tsx:8-14`) documents an honesty rule — coarse season-level periods, nothing forward-looking listed as done.

### Support chat — 🟡 QISMƏN

**Bizdə:** No chat — a mailto. `app/src/components/ui/SupportCard.tsx` renders 'request a callback' with `mailto:info@agradex.com` (default at :17, mailto built at :29), in two variants ('card' for empty states, 'quiet' for chrome). Mounted at `app/src/app/fields/page.tsx:283,338`, `app/src/components/farm/LedgerSection.tsx:62`, `app/src/components/farm/SalesSection.tsx:580`, `app/src/components/shell/FieldListPanel.tsx:605`. A phone button only appears if a `phone` prop is passed — deliberately never hardcoded (`SupportCard.tsx:8-9,22`).

**Qeyd:** NOT reachable from `/more` or `/account` — it only surfaces on empty states and the desktop field panel, so the farmer who goes looking for help in settings finds nothing. There is a real in-app messaging system (`/chat`, `app/src/app/chat/page.tsx`) but it is farmer↔provider, not support, and it is nav-hidden (see the community row).

### Long-form content translation (guide / solutions pages) — 🟡 QISMƏN

**Bizdə:** A dotted-path overlay rather than full dictionaries: `app/src/lib/contentI18n.ts` deep-clones the az source and replaces string leaves whose `${prefix}.<path>` is in the locale overlay (`localize()` at :24-49); missing paths keep the Azerbaijani text. Overlays are `app/src/lib/content-locales/{en,ru,tr,de,hu,it,pl}.ts`, 343 keys each, against az sources `app/src/components/solutions/content.ts` (1265 lines) and `app/src/components/guide/content.ts` (431 lines).

**Qeyd:** Deliberate graceful degradation (contentI18n.ts:3-6) — but it means a non-az visitor reading /solutions or /guide can hit untranslated Azerbaijani paragraphs mid-page, unlike the app UI where coverage is ~100%. Structural fields (slug/icon/accent/href) were never extracted so they can't be overwritten.

### Unit system (Metric / Imperial) — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** We do not offer metric-vs-imperial; we offer three METRIC AREA units with an auto default. `app/src/lib/units.ts` is the single formatter: `ha` (10 000 m²), `donum` (1 000 m² = Turkish dekar/tapu unit), `sotka` (100 m² = ar) — `M2_PER_UNIT` at :39, per-unit decimal precision at :49 (ha 2 / donum 1 / sotka 0). UI: `app/src/components/AreaUnitSetting.tsx` (radiogroup with Avtomatik + 3 units, :56-59). Storage: `users.area_unit` nullable with CHECK (`db/migrations/0048_area_unit.sql:16-21`), API `GET/POST /api/auth/area-unit` (`services/app/routers/auth.py:332-356`). Grep for `imperial\|fahrenheit\|acre\|mph\|inches` across `app/src` outside locale files returns nothing — temperature is always °C, rainfall always mm.

**Qeyd:** This is a deliberate regional bet spelled out in the module docstring (`units.ts:3-21`) and the migration comment: hectares is what everything stores; dönüm and sotka exist because the Turkish land registry and post-Soviet everyday speech use them. sotka is explicitly never auto-selected (`units.ts:148-160`). Strictly richer than a Metric/Imperial switch for our market, strictly poorer for a US/UK user.

### "Web version features" link (opens external browser) — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** Not applicable — we ARE the web version. Agradex ships as a responsive web app + PWA; there is no native app, so no feature gap to explain. The PWA install nudge is `app/src/components/InstallPrompt.tsx`, shown at a value moment (satellite data ready) from `TodayHome`. Service worker registration: `app/src/components/PwaRegister.tsx`, manifest `app/src/app/manifest.ts`.

**Qeyd:** The competitor needs this row because their Android app is a subset of their web product. For us the row inverts: everything is on the web, and the mobile experience is the same code (BottomNav below md, AppRail/FieldListPanel at md/xl — `app/src/components/shell/AppShell.tsx:74-84`).

### Telegram community link — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** We built an IN-APP farmer community instead of pointing at Telegram: `/chat` (`app/src/app/chat/page.tsx`, conversation list + thread + role labels) backed by the hybrid-marketplace conversations/messages tables (migrations 0031-0043). It is deliberately hidden from navigation: `app/src/lib/navFlags.ts:17` `export const SHOW_MARKETPLACE_NAV: boolean = false;` gates it out of `/more` (`more/page.tsx:31-36`) and the rail (`AppRail.tsx:84-89`). Our Telegram integration is a one-way ALERT bot (`TelegramConnect`, `services/app/routers/messaging.py`), not a community.

**Qeyd:** The flag's own comment (navFlags.ts:1-16) states the reason precisely: both /catalog and /chat are fully implemented and currently EMPTY (no seeded providers, no messages), and 'a community with no conversations advertises emptiness exactly where the farmer is looking for value'. Routes, API and components stay live — a direct link opens them. Flipping one constant re-enables. The `: boolean` annotation is load-bearing (without it TS narrows to the literal `false` and calls the enabled branch dead code).

### Sign out — ✅ VAR

**Bizdə:** Present in three places: `/account` (`app/src/app/account/page.tsx:44,72-77`, button shows the email inline), `/more` (`more/page.tsx:43-46,78-85`), and the marketing top bar (`app/src/components/Nav.tsx:87-89,145`). Logout calls `POST /api/auth/logout` which clears the cookie server-side (`services/app/routers/auth.py:242-245`) and then clears local state plus the area-unit cache (`app/src/lib/auth.tsx:77-87`).

**Qeyd:** `clearAreaUnitCache()` in `auth.tsx:85` must survive any logout refactor — otherwise the next account on the device inherits the previous farmer's dönüm/sot choice (documented at `app/src/lib/units.ts:199-209`).

### Language picker (17 locales, no Azerbaijani) — ✅ VAR

**Bizdə:** 8 locales, az-first. `app/src/lib/i18n.ts:2913-2918`: `export type Locale = "az" \| "en" \| "ru" \| "tr" \| "de" \| "hu" \| "it" \| "pl"` with `LOCALE_NAMES` in each language's own endonym. Picker: `app/src/components/LanguageSwitcher.tsx:46-61` (a native `<select>`). Switching does a full navigation to the path-prefixed URL (`LanguageSwitcher.tsx:43`, `/en /ru /tr /de /hu /it /pl`; az is unprefixed), writes localStorage + a `.agradex.com`-scoped cookie (lines 24-29) AND POSTs `/api/auth/locale` to persist `users.locale` (lines 34-42, backend `services/app/routers/auth.py:364-375`). Routing/rewrite in `app/src/middleware.ts:31-45,101-109`.

**Qeyd:** Dictionary coverage is essentially complete, not machine-stub: az 2716 keys vs en 2716 / ru 2718 / tr 2715 / de 2716 / hu 2715 / it 2716 / pl 2718 (counted with grep on `"key":` lines). We are the only one of the two with Azerbaijani — that is the whole product thesis. On the APP host the language control is REMOVED from the top bar on purpose (`app/src/components/Nav.tsx:72-74`, `{!appHost && <LanguageSwitcher/>}`) so it lives in settings only, matching the competitor's placement.

### Locale persistence to the account (so background jobs use it) — ✅ VAR

**Bizdə:** `POST /api/auth/locale` writes `users.locale` (`services/app/routers/auth.py:359-375`, `SUPPORTED_LOCALES` at :364). Every API call also sends `X-Locale` from the same value `t()` renders with (`app/src/lib/api.ts:20`), which the advice/chat router reads with the documented priority body → header → cookie → az (`services/app/routers/advice.py:12-25`). `advice.lang` column (migration `db/migrations/0049_advice_lang.sql`) records what language stored prose was written in.

**Qeyd:** ⚠️ CONTRADICTS the docs at signup: `app/src/app/signup/page.tsx:106` hardcodes `locale: "az"` in the signup body regardless of the interface language. So a Russian or Polish visitor who registers in their own language gets `users.locale='az'` — the OTP email (auth.py:71 `_OTP_EMAIL.get(locale)`), the welcome email, the weekly digest and every auto-generated advice come out in Azerbaijani until they touch the LanguageSwitcher at least once. CLAUDE.md's P0.3 section claims the language model is closed; this is the hole in it.

### User Guide — ✅ VAR

**Bizdə:** `/guide` — an index hub plus `/guide/[slug]` articles, Server Components with their own metadata and canonical (`app/src/app/guide/page.tsx:13-20`), content from `app/src/components/guide/content.ts` (431 lines) localized through the overlay (`content.ts:414,422` calling `localize()`). Linked from `/more` as 'Necə başlamalı' (`app/src/app/more/page.tsx:29`, `authOnly: false`) and from the landing footer (`LandingFooter.tsx:61`).

**Qeyd:** Genuine parity or better (ours is in-product HTML, not a browser hand-off). One wrinkle: `/guide` is in the middleware marketing allowlist (`app/src/middleware.ts:73`), so tapping it from `/more` on app.agradex.com redirects the farmer to agradex.com/guide — a host jump mid-session, same as OneSoil's external-browser behaviour, but unintentional in our case.

### Locale routing / URL strategy — ✅ VAR

**Bizdə:** Path-prefix routing with az unprefixed. `app/src/middleware.ts:14` `const PREFIXED = ["en","ru","tr","de","hu","it","pl"]`; the match regex is BUILT from that array (`:35`) precisely so adding a locale is one edit — the comment at :33-34 records that it used to be a hardcoded `en\|tr\|de` that silently ignored hu/it/pl. First-time visitors with a matching Accept-Language get one redirect to their prefix (`:39-45`). Locale reaches Server Components via the `x-locale` request header (`:95`) consumed by `app/src/lib/i18n-server.ts:21-33` (`getServerLocale`/`getT`), and client components via `LocaleProvider` (`app/src/components/LocaleProvider.tsx:26-37`). Per-request `generateMetadata` emits canonical + hreflang for all 8 languages + x-default (`app/src/app/layout.tsx:30-38,51`).

**Qeyd:** ⚠️ The same hardcoded-locale-list bug the middleware was fixed for still lives in `app/src/components/shell/AppRail.tsx:30-33` — `path.match(/^\/(en\|tr\|de)(\/.*)?$/)` — so on /ru, /hu, /it, /pl the desktop rail highlights the wrong destination (or none). `AppShell.tsx:25-30` has the corrected 7-locale version right next to it with a comment explaining the fix, and AppRail was missed. `app/src/components/BottomNav.tsx:38-40` strips no prefix at all. Cosmetic (links are unprefixed so the prefix disappears after one navigation) but it is a real i18n defect a reviewer will notice.

### Plural agreement in translated UI — ✅ VAR

**Bizdə:** `tp(base, n)` selects the form with `new Intl.PluralRules(locale).select(n)` (`app/src/lib/i18n.ts:2978-2987`); dictionaries supply only forms (`<base>.one\|few\|many\|other`, `.other` mandatory). `Dict` is widened to `Partial<Record<I18nKey,string>> & PluralForms` (`i18n.ts:2906-2907`) because `I18nKey` derives from the az dictionary and Azerbaijani has no few/many key to derive from. az has only `.other` (`i18n.ts:2061`), en one+other (locales/en.ts:2819-2820), ru and pl all four (locales/ru.ts:2797-2800, locales/pl.ts:2821-2824).

**Qeyd:** Worth a row because it is a place we are ahead of a 17-locale competitor's typical implementation. The rationale comment (i18n.ts:2969-2977) names the actual production bug it fixed ('1 полей' in the Russian field list). Three consecutive commits on this (34b0f79, 8c38e8b, 84e5f28) — including one where a script-driven edit put the key in the DICTS registry instead of the az dict.

### Backend-generated prose in the user's language — ✅ VAR

**Bizdə:** Backend returns stable codes + raw params, frontend renders the sentence: `app/src/lib/wellnessText.ts` resolves `*_code`/`*_params` through `tf()` (`app/src/lib/i18n.ts:2959-2967`, which interpolates `{token}` and accepts arbitrary key strings). LLM prose is generated once in one language and stored as text — never translated on read — with `advice.lang` recording which (`db/migrations/0049_advice_lang.sql`), a mismatch surfaced by `GET /api/fields/{id}/advice` (`services/app/routers/advice.py:51-63`) and a one-tap regenerate offer (`app/src/components/field/AdviceLangNote.tsx`).

**Qeyd:** Severity values stay Azerbaijani CODES in the DB (`aşağı\|orta\|yüksək`) and are only translated at the label layer — do not read stored AZ severity strings as an i18n gap. Known residual: the weekly digest quotes advice prose without checking `lang` (CLAUDE.md, E15 section), so a pre-0049 Azerbaijani row can appear inside a Russian digest; and `weekly.py::_LABELS` only covers az/en/ru, so tr/de/hu/it/pl digests arrive in English.

### Privacy control: real-name visibility — ✅ VAR

**Bizdə:** No competitor counterpart. `app/src/components/NamePublicToggle.tsx` → `GET/POST /api/auth/name-public` → `users.name_public` (`services/app/routers/auth.py:378-395`, migration 0045). When off, other users see a stable `user_xxxx` alias in chat, peer suggestions and community. Self-hides for non-farmer roles (`NamePublicToggle.tsx:19`). Default on; also settable at signup (`app/src/app/signup/page.tsx:62,107`).

**Qeyd:** Only on `/account`, not `/more` — so a phone user who lands on /more never sees it. This is a row where we are ahead and should be called out as such in the table.

### Data-saver / bandwidth control — ✅ VAR

**Bizdə:** No competitor counterpart. `app/src/components/DataSaverToggle.tsx` → `app/src/lib/dataSaver.ts`; when on, heavy TiTiler satellite raster tiles are not auto-loaded and the farmer taps to load. Defaults to the browser's `Save-Data` hint (DataSaverToggle.tsx:3-4). On both `/more:71` and `/account:66`.

**Qeyd:** localStorage-only — not synced to the account, so it does not follow the farmer to another device. Relevant to our market (rural mobile data) in a way it isn't for OneSoil's.

### Team / member management from settings — ✅ VAR

**Bizdə:** `/team` (`app/src/app/team/page.tsx`) — member list with inline role change (`:92-96`, `POST /api/orgs/{id}/members/{uid}/role`), email invites with a copyable link (`:80`, `POST /api/orgs/{id}/invite`), and 5 org roles `owner\|admin\|agronomist\|worker\|viewer` (`:13`). Gated on `canManage = role === owner \|\| admin` (`:65`). Linked from `/more` (`more/page.tsx:39`). Backend: `services/app/routers/orgs.py:132,145,159,181`.

**Qeyd:** Invite links are minted against the marketing apex via `publicUrl()` (`team/page.tsx:7`) so recipients without a session are not bounced to a login wall. OneSoil's profile has no team management at this level — another row where we are ahead.

### Provider / business profile (role switch) — ✅ VAR

**Bizdə:** No competitor counterpart. Non-farmer roles get a `/provider` entry card on `/account` (`app/src/app/account/page.tsx:42,56-62`, shown when `user.role !== "farmer"`). The profile itself (`company, bio, specializations, country, region, address, coverage, phone`) is upserted by `POST /api/providers/me` which also PROMOTES `users.role` to the provider kind (`services/app/routers/providers.py:79-98`).

**Qeyd:** Note the asymmetry: this is the ONLY way a user's own profile fields get written after signup — there is no farmer-facing equivalent, so a farmer cannot edit their own name, country or region at all (see the next row).


## I. Billing, abunə və paywall nümunələri

### Paywall subhead personalised to the user's own area — ❌ YOX

**Bizdə:** Nothing interpolates the org's hectares into any upgrade copy. `UpgradeCta` accepts `title/subtitle/priceLine` as free strings (`app/src/components/UpgradeCta.tsx:11-29`) but every one of the four call sites passes a constant translation key. The nearest thing is a HARD-CODED generic figure in the benefit list: `app/src/lib/locales/en.ts:428` `"5 fields (~25 ha) — manage several fields from one place"`. Searched: all `UpgradeCta` usages, `lib/pricing.ts`, `PricingView/Table/Compare/Faq`, `TrialBanner`.

**Qeyd:** The data to do it already exists client-side — `/api/orgs/{id}/usage` returns `ha_used` (`services/app/routers/orgs.py:115`) and `app/src/lib/units.ts` can format it in the farmer's unit. It is simply never wired into a paywall string.

### Swipeable feature-demo carousel showing the feature working with realistic data — ❌ YOX

**Bizdə:** The pricing surface is entirely static: hero → trial strip → 3 stacked plan cards with check bullets (`app/src/components/PricingTable.tsx:22-99`) → discount cards (`DiscountCards.tsx`) → an 18-row comparison matrix (`PricingCompare.tsx:56-94`) → FAQ (`PricingFaq.tsx`). No carousel, no screenshots, no sample data, no delta badges. Searched `app/src/components/Pricing*`, `DiscountCards.tsx`, `UpgradeCta.tsx`, `app/src/components/landing/*`.

**Qeyd:** Our nearest analogue is pre-signup, not paywall-side: the public demo-field tour `/demo` (`services/app/routers/demo.py:1-31`, `app/src/app/demo/page.tsx`) serves a real processed field with real wellness + advice + weather to anonymous visitors, and the landing hero map does anonymous tap-to-detect (`app/src/components/landing/LandingHeroMap.tsx`). The redesigned landing has NO pricing section at all — pricing is reachable only from the footer (`app/src/components/landing/LandingFooter.tsx:59`), the FAQ, `/how-it-works` and `/more`.

### Monthly \| Quarterly billing-period selector with a savings badge — ❌ YOX

**Bizdə:** One price, one period. `app/src/lib/pricing.ts:18-22` — each `Package` carries a single `price` string and a single `periodKey` (`mkt.pkg.priceUnitMonth` = "AZN/month", `app/src/lib/locales/en.ts:974`). No period state anywhere in `PricingTable.tsx` / `PricingCompare.tsx` / `PricingView.tsx`. Grepped `quarterly\|annual\|yearly\|illik` across `app/src/lib/pricing.ts`, `app/src/components`, `services/app` — no billing-period hits.

**Qeyd:** Backend has no notion of a billing period either: `org_subscriptions` stores only `tier`, `seats`, `hectare_cap`, `valid_until`, `trial_ends_at`, `source` (`db/migrations/0006_ai_subs.sql:44-50` + `db/migrations/0043_trial.sql:15-21`).

### Tier auto-preselected to match the user's farm size — ❌ YOX

**Bizdə:** The recommended plan is a static constant: `app/src/lib/pricing.ts:20` `{ id: "pro", …, highlight: true }`. `PricingTable.tsx:38-46` renders the emerald border + "Most popular" badge from that flag; `PricingCompare.tsx:128-133` does the same for the matrix column header. No component reads org usage on the pricing page — `PricingView`/`PricingTable`/`PricingCompare` make zero API calls.

**Qeyd:** `/pricing` is a marketing page served from the apex and is routinely viewed signed-out (middleware redirects it off the app host, `app/src/middleware.ts:72-76`), so it has no session to personalise from in the first place.

### Self-serve purchase ("Subscribe" button, in-app billing) — ❌ YOX

**Bizdə:** Deliberate, documented deferral. `docs/DECISIONS.md:278-294` ADR-0010 "Billing deferred: keep the gating, skip the payment provider" — "do not integrate Stripe/any PSP … The trade-off is that 'upgrade' has no self-serve checkout yet." `services/app/tiers.py:4-5`: "Billing (Payriff) is deferred — the admin sets a tier manually for now." The plan-card CTA is `<Link href="/signup">` (`app/src/components/PricingTable.tsx:62-73`), not a purchase. FAQ answer `app/src/lib/locales/en.ts:701`: "Online payment integration is in progress. For now, contact us to upgrade a package — our team activates your account manually." Upgrades happen via the admin panel: `PUT /api/admin/subscriptions/{org_id}` (`services/app/routers/admin.py:115-131`, writes `source='manual'`) driven by `SubscriptionsSection` (`app/src/app/admin/page.tsx:887-980`, a per-org tier `<select>`). Grep for…

**Qeyd:** Tracked as blocked work: `docs/ROADMAP.md:103` U7 "Billing PSP (Payriff/Stripe) — Payriff merchant → PAYRIFF_SECRET_KEY … payments + checkout/callback + autoPay cron + hectare_cap", status ⏳ (user-blocked). Discount programmes are also manual: `app/src/components/DiscountCards.tsx:78-83` opens a `mailto:info@agradex.com`, and `:89-94` prints an honest note that discounts are applied by hand. This is the single biggest structural difference from OneSoil in this area.

### Inline paywall card as the first element of a content strip — ❌ YOX

**Bizdə:** No component inserts a paywall card into a list/timeline. The scene timeline and history surfaces (`app/src/components/field/SatelliteTab.tsx`, `WeatherHistoryTab.tsx`, `app/src/components/field/overview/SatelliteGlance.tsx`) are ungated — history depth is not a tier dimension anywhere in `services/app/tiers.py:19-59`. Closest is `FertilizerCard.tsx:50-57`, which replaces its own card wholesale.

**Qeyd:** Satellite history is free for all tiers by design: `sensors: ["hls","s2"]` is identical across the three tiers (`services/app/tiers.py:23,36,49`) and the marketing 'free core' line promises it (`app/src/components/PricingTable.tsx:26-29`, key `price.freecore`).

### Field-boundary export, fully paywalled — ❌ YOX

**Bizdə:** We have no field-boundary export at all — paywalled or otherwise. Import exists (T19 shapefile .zip via shpjs, `app/src/components/FieldMap.tsx:197` `/** Imported polygon to load into the draw buffer … */`), export was explicitly deferred (CLAUDE.md T19 note: "export & rəngli annotasiya təxirə"). Grepped `services/app/routers/*.py` and `app/src/components`: the only export endpoint is the platform-admin CSV/JSON dump of orgs/users/fields metadata (`services/app/routers/admin.py:648-659`, gated by `require_platform_admin`, not by tier). Field geometry does leave the system through public share links (`services/app/routers/shares.py`) and `GET /api/fields/geo`, both ungated by tier.

**Qeyd:** A comparison table should record this as a feature gap, not a paywall difference.

### Dedicated in-app subscription screen — 🟡 QISMƏN

**Bizdə:** There is NO in-app subscription screen. The only plan surface is the PUBLIC marketing route `/pricing` (`/Users/mirshahbazseyidli/Desktop/bagbanai/app/src/app/pricing/page.tsx` → `app/src/components/PricingView.tsx:14-53`). `/account` (`app/src/app/account/page.tsx:5-14,48-60`) has NO plan/subscription block at all — it holds email, password, language, area unit, data-saver, email opt-out, name privacy. `/more` only carries a link row: `app/src/app/more/page.tsx:38` `{ href: "/pricing", label: t("more.pricingPlans"), Icon: Tag }`. In-app plan info is scattered across three fragments instead: a header chip on the v1 dashboard (`app/src/app/page.tsx:169-192`), the UsageBar on `/fields` (`app/src/app/fields/page.tsx:129-174`), and `TrialBanner` (`app/src/components/TrialBanner.tsx`).

**Qeyd:** CRITICAL for the table: the dashboard plan chip + usage row at `app/src/app/page.tsx:169-192` lives in the `Dashboard()` component, which is the **v1** home. `app/src/lib/uiFlag.ts:14-35` makes v2 the DEFAULT (`useState(true)`, only `?ui=v1` opts out), and `HomeInner` routes to `TodayHome` (`app/src/app/page.tsx:44`). `TodayHome` renders ONLY `<TrialBanner>` (`app/src/components/home/TodayHome.tsx:280`) — no plan label, no quota counters. So in the shipped default UI the farmer sees their plan name only on `/fields`. Second trap: `app/src/middleware.ts:72-76` redirects `/pricing` on the app host back to the marketing apex, so every in-app 'View plans' tap navigates the user OUT of…

### "Total fields area" on the subscription surface — 🟡 QISMƏN

**Bizdə:** `GET /api/orgs/{org_id}/usage` returns `ha_used` (sum of `fields.area_ha`, deleted excluded) and `ha_cap` (`services/app/routers/orgs.py:102-117`). `UsageBar` switches to an area reading ONLY when a cap exists: `app/src/app/fields/page.tsx:130-141` — `const byArea = u.ha_cap != null && u.ha_cap > 0;` otherwise it reads `"1 / 1 sahə"`. Total area IS shown, but as a plain sub-line of the fields list header, unrelated to the plan (`app/src/app/fields/page.tsx:~253`, `{fields.length} … · {fmtArea(totalHa)}`).

**Qeyd:** Because no tier sets `hectare_cap` (see the hectare-cap row), `byArea` is false for every real org — in production the bar always shows a field COUNT, never hectares. Area rendering also passes through the per-user unit formatter `app/src/lib/units.ts` (ha / dönüm / sotka), which OneSoil does not have.

### Purchase sheet / paywall modal with icon, headline, benefits — 🟡 QISMƏN

**Bizdə:** `app/src/components/UpgradeCta.tsx:30-66` — an INLINE card (not a sheet/modal): Sparkles eyebrow, title, subtitle, a 2-column list of 4 benefit bullets with check icons, a price line, and a `<Link href="/pricing">` 'View plans' button + optional dismiss. Defaults are the free-tier field-cap copy (`:24-29`, keys `upgrade.title/subtitle/benefit1-4/priceLine`, English text at `app/src/lib/locales/en.ts:425-433`).

**Qeyd:** It is a nudge, not a purchase sheet — the terminal action is a navigation to marketing, not a checkout. Four call sites: `FieldOnboarding.tsx:862` (defaults), `FertilizerCard.tsx:52-57`, `PhotoDiagnose.tsx:96-102`, `SoilLabUpload.tsx:108-114`. All pass static i18n strings.

### Marketed tier features vs. actually-enforced gates — 🟡 QISMƏN

**Bizdə:** Only 8 of the 15 keys in `services/app/tiers.py:19-59` are ever read by a gate. ENFORCED: `max_fields` (`services/app/routers/fields.py:44-51`), `advice_per_month` (`services/app/ai/advice.py:126-131`), `chat_per_month` (`services/app/ai/chat.py:96-101`), `photo_per_month` (`services/app/routers/fields.py:205-209,238-240`), `passport` (`services/app/routers/knowledge.py:26-31`), `fertilizer` (`services/app/routers/fields.py:281-283`), `benchmark` (`services/app/routers/indices.py:414-416`), `model` (`tiers.py:84-85`). NEVER ENFORCED: `weather_alerts`, `irrigation`, `email`, `whatsapp`, `reports`, `pest_risk`, `research_depth`, `sensors` — a full grep of `services/app` finds these strings only inside `tiers.py` itself and in the read-only echo at `services/app/routers/orgs.py:85-86`. `services/app/routers/reports.py`, `zones.py`, `weather.py` and `shares.py` contain no `tiers` import at…

**Qeyd:** So these PricingCompare rows are currently FREE for everyone despite being sold: spray window (`PricingCompare.tsx:81`), irrigation balance (`:82`), email notifications (`:83`), WhatsApp (`:84`), pest risk (`:86`), PDF reports (`:89`), and the 'red-edge from Pro' claim (`app/src/lib/locales/en.ts:699`). Also worth noting: the generic `require_paid()` helper still exists (`services/app/deps.py:81-83`, 402 `paid_feature`) but is attached to ZERO routes — `docs/API_REFERENCE.md:127-129` states this explicitly ("Still defined but not attached to any route — per-feature tier gating below replaced it").

### AI Agronomist as a paid add-on toggle — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** AI is not an add-on; it is the axis the tiers are built on. `services/app/tiers.py:19-59`: `advice_per_month` 1 / 8 / 30, `chat_per_month` 0 / 50 / 300, `photo_per_month` 0 / 0 / 30, and the MODEL itself is tiered — free/pro `claude-sonnet-5`, business `claude-opus-4-8` (`:31,44,57`, resolved by `model_for()` at `:84-85` and passed into every LLM call, e.g. `services/app/ai/advice.py:131`, `services/app/ai/chat.py:102`). There is no add-on concept in `org_subscriptions` (`db/migrations/0006_ai_subs.sql:44-50`) or anywhere in the API.

**Qeyd:** Also note our free tier ships 1 AI advice/month as a deliberate 'taste' (`tiers.py:24` comment `# 1 taste/month`), and it is spent AUTOMATICALLY: the geo pipeline calls `POST /api/internal/advice/run` after every new scene (`services/app/routers/internal.py:17-37`), which consumes the quota (`services/app/ai/advice.py:126-131`). A free farmer therefore usually never gets to spend it deliberately.

### Hectare-capped tier cards (Small 50 ha / Medium 500 ha / Large 5000 ha) — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** Our caps are FIELD COUNT, not area: `services/app/tiers.py:22,35,48` `max_fields` 1 / 5 / 100000, enforced at creation in `services/app/routers/fields.py:44-51` → `raise HTTPException(status_code=402, detail="field_limit_reached")`. The pricing FAQ states the decision explicitly (`app/src/lib/locales/en.ts:700`): "There's no separate hectare fee — the limit is by number of fields (Free 1, Pro 5, Business unlimited)." A `hectare_cap numeric` column DOES exist (`db/migrations/0006_ai_subs.sql:46`) but NO tier sets it — it is an admin-only manual override, written by `PUT /api/admin/subscriptions/{org_id}` (`services/app/routers/admin.py:108-131`) and read only for display in `GET /api/orgs/{id}/usage` (`services/app/routers/orgs.py:109-116`).

**Qeyd:** Verified by grep: `hectare_cap` appears ONLY in `orgs.py:100,110`, `admin.py:83,99,111,124,128`, `0006_ai_subs.sql:46`, `0043_trial.sql:9`. It is never compared against `sum(area_ha)` at any write path — an org with `hectare_cap = 5` can still add fields totalling 500 ha as long as it is under `max_fields`. The docstring at `services/app/routers/orgs.py:100-101` is honest about this: "the endpoint does not invent a hectare limit from the tier, because there isn't one." Prices are 0 / 10 / 25 AZN (`app/src/lib/pricing.ts:19-21`, mirroring `tiers.py:21,34,47`), i.e. two paid tiers vs their three.

### Paywall pattern: render the real feature with live data, then a small "Unlock" CTA — 🔷 QƏSDƏN FƏRQLİ

**Bizdə:** We never compute-then-tease. Four distinct shapes, none of which shows the gated output: (a) SILENT EMPTY 200 — Knowledge Passport returns `{crop_type:None, zone:{}, field:{}, gated:True}` (`services/app/routers/knowledge.py:26-31`) and `app/src/components/field/KnowledgePassport.tsx:52-58` computes `hasAny` and `return null`. Regional benchmark returns `{gated:True, series:[]}` (`services/app/routers/indices.py:409-417`) and `SatelliteTab` simply omits the amber benchmark line, band and legend (`app/src/components/field/SatelliteTab.tsx:298`, `398-410`, `422-430`). (b) CARD REPLACED BY CTA — `{"gated": True}` from `services/app/routers/fields.py:281-283` → `app/src/components/field/FertilizerCard.tsx:50-57` renders `UpgradeCta` INSTEAD of the plan. (c) INTERACT-THEN-402 — `PhotoDiagnose.tsx:52` / `SoilLabUpload.tsx:54` catch `err.status === 402` and only then show the CTA (`:95-101` /…

**Qeyd:** The backend comment at `services/app/routers/knowledge.py:25-26` claims "Free tier gets an empty passport (the UI hides it) → a nudge to upgrade" — the CODE CONTRADICTS IT: `KnowledgePassport.tsx:57-58` returns `null` with no CTA, no label, no link. Same for the benchmark: a free/pro user cannot tell the regional comparison exists. Two of our five gated features are therefore INVISIBLE rather than teased — the exact opposite of OneSoil's 'show it working, then charge'. `docs/API_REFERENCE.md:136-140` documents the two gate shapes accurately.

### Current plan name shown to the user ("Plan = Free") — ✅ VAR

**Bizdə:** `GET /api/orgs/{org_id}/subscription` returns `tier`, `label`, `price_azn`, `trial`, `usage` and a `features` map (`services/app/routers/orgs.py:62-87`). Rendered as: the plan word in the UsageBar (`app/src/app/fields/page.tsx:95-99` PLAN map, `:145`), and the v1 dashboard pill `{t("mkt.home.packageLabel")} {sub?.label ?? "Pulsuz"}` (`app/src/app/page.tsx:173-183`). The slimmer `GET /api/orgs/{org_id}/usage` also returns `tier` (`services/app/routers/orgs.py:90-117`).

**Qeyd:** `label` is `label_az` from `services/app/tiers.py:21,34,47` — an Azerbaijani-only string sent from the backend ("Pulsuz"/"Pro"/"Business"), so the API-supplied label is NOT localised; the frontend UsageBar sidesteps this by re-mapping tier→i18n key (`app/src/app/fields/page.tsx:93-99`), but the v1 dashboard chip prints the raw backend `label` and hard-codes the AZ fallback `"Pulsuz"`.

### Free trial of the paid plan — ✅ VAR

**Bizdə:** Richer than the competitor's screen. Every newly created org opens on a 1-month Pro trial: `services/app/routers/orgs.py:15-47` `_open_trial()` inserts `tier='pro', valid_until=now()+1 month, trial_ends_at=same, source='trial'` (constants `services/app/tiers.py:63-67`; schema `db/migrations/0043_trial.sql`). Expiry is computed, never written — `tiers.org_tier()` (`services/app/tiers.py:109-137`) falls back to free while the row keeps `tier='pro'` so `trial_state()` (`:140-169`) can still say "sınaq bitdi". UI: `app/src/components/TrialBanner.tsx` with three phases (`active`, `active-ending` ≤7 days, `expired`, `:39-43`), per-org+per-phase localStorage dismissal (`:35-37`), never blocking. Trial-ending also appears as a banner line inside the weekly email digest when ≤10 days remain (`services/app/ai/emails/weekly.py:62`, `:352-361`).

**Qeyd:** Migration 0043 deliberately backfills nothing (`db/migrations/0043_trial.sql:5-13`), so orgs predating the feature show no trial at all and `TrialBanner` renders null. `TrialBanner` IS shown in the default v2 home (`app/src/components/home/TodayHome.tsx:280`) — it is the one plan-related element that survives into the shipped UI. Translation debt: `weekly.py::_LABELS` only defines `trial_label`/`trial_text` for az/en/ru (`:90-91,117-118,147-148`), so tr/de/hu/it/pl owners get the trial warning in English.

### Plan comparison / what-you-get communication — ✅ VAR

**Bizdə:** Materially richer than OneSoil's three cards. `/pricing` ships: 3 plan cards listing only what each tier INCLUDES (`app/src/components/PricingTable.tsx:11-20` filters `f.tiers[i].on`, excluded rows are omitted), an always-free core reassurance strip (`:26-29`), an 18-row feature × 3-tier matrix with per-cell quota notes and a sticky first column (`app/src/components/PricingCompare.tsx:56-94,118-166`), 3 discount programmes (`DiscountCards.tsx`), and a 15-question FAQ covering trial mechanics, post-trial behaviour, hectare policy, cancellation, channels and privacy (`app/src/components/PricingFaq.tsx`, copy at `app/src/lib/locales/en.ts:687-717`). Row data is a single source shared by the cards and the matrix (`app/src/lib/pricing.ts:36-55`), all in i18n keys so it renders in 8 languages.

**Qeyd:** `app/src/lib/pricing.ts:1` says it "Mirrors services/app/tiers.py; keep in sync" — it is a hand-kept mirror, not generated, and it has already drifted (see the enforcement-drift row). Five rows carry `soon: true` (`pricing.ts:49-53`: pest, photo, fertilizer, benchmark, reports) rendered as an amber 'soon' badge — but photo diagnosis, the fertilizer plan and the regional benchmark ARE fully implemented and gated today, so the badge understates what Business buys.

### Over-quota / limit-reached error surfacing — ✅ VAR

**Bizdə:** Backend codes are mapped to localised farmer copy rather than shown raw: `app/src/lib/api.ts:131-150` maps `field_limit_reached`, `photo_not_in_plan`, `photo_quota_exceeded`, `advice_quota_exceeded` → i18n keys, resolved at call time by `azError()` (`:154-166`). The field cap specifically is upgraded from an error into a marketing moment: `app/src/components/field/FieldOnboarding.tsx:388-393` intercepts `field_limit_reached` and sets `limitReached`, which renders `UpgradeCta` and suppresses the error line (`:862-863`). The `/fields` UsageBar turns amber and grows an inline `/pricing` link at the cap (`app/src/app/fields/page.tsx:136,146,165-172`). Status codes: 402 for field/photo caps, 429 for `advice_quota_exceeded` (`services/app/routers/advice.py:85`).

**Qeyd:** Known inconsistency (also flagged in CLAUDE.md): `services/app/ai/advice.py:126-131` RETURNS a dict `{quota_exceeded: True, …}` instead of raising, so the pipeline caller `services/app/routers/internal.py:35-37` reports a quota rejection as `{"ok": true}`. Only the HTTP path `POST /api/fields/{id}/advice/generate` converts it into a real 429.


---

## Düzəlişlər (əks-yoxlama agentlərinin tapdıqları)

Aşağıdakı hallarda birinci agent «bizdə yoxdur» demişdi, amma yoxlayıcı **əksini sübut etdi** — yəni bizdə substrat var, sadəcə başqa formadadır:

- **Sub-mode: Average NDVI (multi-date composite as a map layer)** *(Layer / index selector and render modes)* — Partially refuted. A multi-season per-pixel composite IS computed and IS drawn as a map layer: services/geo_pipeline/zones.py builds a per-pixel multi-season median over a month/season window (zones.py:336 `field_mean = float(np.mean(abs_med[valid]))`, `abs_med` = the per-pixel composite), stores runs/zones (field_zone_runs / zones, migrations 0031-0043), served to app/src/components/field/ZonesTab.tsx which renders the composite-derived polygons on MapLibre (ZonesTab.tsx:167-190 fill/line layers) with per-zone mean/p10/p50/p90 (ZonesTab.tsx:50-59). It is a classed composite (zones), not a…
- **Sub-mode: Heterogenity NDVI** *(Layer / index selector and render modes)* — Partially refuted. Within-field heterogeneity is computed and surfaced: services/geo_pipeline/zones.py:52 documents CV = std/mean of the per-pixel multi-season value, :339 `cv = field_std / abs(field_mean)`, :344 classes uniform/moderate/variable (CV_UNIFORM/CV_MODERATE), persisted as homogeneity_cv/homogeneity_class (:398-400) and rendered in the UI at app/src/components/field/ZonesTab.tsx:386-391 (`run.homogeneity_cv`, i18n keys app.field.zonesTab.homogeneityVariable/Moderate, cvLabel). Per-zone std is also stored (`std_value`, ZonesTab.tsx types :57, zones.py:383-390). What is genuinely…
- **Field-boundary export, fully paywalled** *(Billing, subscription and paywall patterns)* — PARTIALLY REFUTED — the reviewer's premise 'we have no field-boundary export at all' is wrong. A dependency-free boundary export exists: app/src/lib/geoio.ts:1 ('Field boundary import/export — GeoJSON + KML'), with polygonToGeoJSON (geoio.ts:7), polygonToKML (geoio.ts:21) and downloadText (geoio.ts:42), wired to two live download buttons in app/src/components/FieldCreator.tsx:159 (.geojson) and :167 (.kml), imported at FieldCreator.tsx:11. The paywall half of the claim stands: those buttons have no tier check, and 'export' is not a key in services/app/tiers.py:19-59.

---

## Status

**2026-07-26: SƏNƏDLƏŞDİRMƏ TAMAM. İCRA QƏRARI VERİLMƏYİB.**  
Bu sənəd inventar + kod xəritəsidir; hansı boşluğun bağlanacağı ayrıca qərardır.
