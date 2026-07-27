// Basemap gallery for the field maps (parity with Azercosmos FarmerApp "Xəritə növləri").
// All sources are free / keyless and used with attribution. Satellite = Esri World Imagery,
// recent cloud-free = EOX Sentinel-2 cloudless, plus OSM street and OpenTopoMap.
import type maplibregl from "maplibre-gl";

// Esri reference overlay (place names + boundaries, transparent) — used for the Hybrid basemap.
const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_REFERENCE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

export interface Basemap {
  id: string;
  label: string;
  tiles: string[];
  attribution: string;
  maxzoom: number;
  /** Overlay Esri place-name/boundary tiles on top of the imagery. */
  labels?: boolean;
}

export const BASEMAPS: Basemap[] = [
  {
    id: "hybrid",
    label: "Hibrid (peyk + adlar)",
    tiles: [ESRI_IMAGERY],
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxzoom: 19,
    labels: true,
  },
  {
    id: "satellite",
    label: "Peyk",
    tiles: [ESRI_IMAGERY],
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxzoom: 19,
  },
  {
    id: "s2",
    label: "Buludsuz peyk",
    tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
    attribution: "Sentinel-2 cloudless 2023 — EOX (CC BY-NC-SA 4.0)",
    maxzoom: 18,
  },
  {
    id: "osm",
    label: "Küçə (OSM)",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap",
    maxzoom: 19,
  },
  {
    id: "topo",
    label: "Topo",
    tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenTopoMap (CC-BY-SA)",
    maxzoom: 17,
  },
];

export const DEFAULT_BASEMAP_ID = "hybrid";
const STORAGE_KEY = "bagban.basemap";
const HILLSHADE_KEY = "bagban.hillshade";

export function getSavedBasemap(): Basemap {
  let id = DEFAULT_BASEMAP_ID;
  if (typeof window !== "undefined") {
    id = window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BASEMAP_ID;
  }
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

export function saveBasemap(id: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
}

export function getSavedHillshade(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HILLSHADE_KEY) === "1";
}

export function saveHillshade(on: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(HILLSHADE_KEY, on ? "1" : "0");
}

// A blank valid style — the basemap is applied imperatively so we can swap it without
// tearing down the field / draw layers added on top.
export const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
};

// (Re)apply a basemap. `beforeId` keeps the basemap under the field/draw layers when
// switching after load; pass undefined on first application (nothing above it yet).
export function applyBasemap(map: maplibregl.Map, bm: Basemap, beforeId?: string) {
  for (const id of ["basemap-labels", "basemap"]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ["basemap-labels-src", "basemap"]) {
    if (map.getSource(id)) map.removeSource(id);
  }
  map.addSource("basemap", {
    type: "raster",
    tiles: bm.tiles,
    tileSize: 256,
    maxzoom: bm.maxzoom,
    attribution: bm.attribution,
  });
  map.addLayer({ id: "basemap", type: "raster", source: "basemap" }, beforeId);
  if (bm.labels) {
    map.addSource("basemap-labels-src", {
      type: "raster",
      tiles: [ESRI_REFERENCE],
      tileSize: 256,
      maxzoom: 19,
    });
    map.addLayer({ id: "basemap-labels", type: "raster", source: "basemap-labels-src" }, beforeId);
  }
}

// ── RainViewer rain radar (free, keyless, ATTRIBUTION REQUIRED) ────────────────────────────────
//
// Not a Basemap and deliberately absent from BASEMAPS: the radar is a time-varying OVERLAY that
// sits between the basemap and the field polygons, so it is never something the farmer picks
// INSTEAD of imagery. It lives in this file because this is where every free tile source in the
// app is declared next to the credit it owes.
//
// VERIFIED LIVE, twice (2026-07-27 and 2026-07-28), not assumed:
//   GET https://api.rainviewer.com/public/weather-maps.json
//   → { version:"2.0", generated:<unix s>, host:"https://tilecache.rainviewer.com",
//       radar: { past:[{time:<unix s>, path:"/v2/radar/<id>"}, …13 frames…], nowcast:[] },
//       satellite:{ infrared:[] } }
// `past` held 13 frames at 600 s steps — the last two hours — on both probes, but nothing in this
// codebase depends on that count; the frame list is read as sent. `nowcast` came back EMPTY on
// every probe, so a radar index with NO future frames is a normal state, not a failure — the
// scrubber says so in words rather than drawing a future nobody sent (app.weather.radar.noForecast).
export const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";

// The credit RainViewer's free tier requires.
//
// The credit a FARMER sees is the dictionary key app.weather.radar.attribution, rendered as visible
// text beside the map — because every map in this app is built with `attributionControl:false`, so
// a source's own `attribution` string is painted nowhere. This constant is set on the source anyway,
// for parity with the basemaps above: if an attribution control is ever switched on, the credit is
// already attached to the layer that owes it rather than having to be remembered.
export const RAINVIEWER_ATTRIBUTION = "RainViewer";

// Colour scheme 2 = "Universal Blue" (RainViewer's own colour-scheme reference lists it under that
// number). The legend gradient below is READ FROM THAT TABLE, so the scheme id and the legend are
// ONE decision that has to move together — a scheme change here with a stale ramp underneath would
// put colours on the map that the legend explains wrongly.
const RAINVIEWER_SCHEME = 2;

// Smooth = 1. Snow = 0 ON PURPOSE. With snow=1 RainViewer paints snow from a SEPARATE half of the
// palette (a second blue/white ramp), which would put colours on the map that have no entry in the
// legend beside it. Snow is still shown at snow=0 — it is simply coloured on the one intensity ramp
// the legend actually describes.
const RAINVIEWER_SMOOTH = 1;
const RAINVIEWER_SNOW = 0;

/**
 * Tile template for one radar frame.
 *
 * Shape confirmed against live 200/image-png responses:
 *   <host><path>/<size>/{z}/{x}/{y}/<colour>/<smooth>_<snow>.png
 * `host` and `path` come from the index above and rotate every ten minutes, which is why this is a
 * function of the frame rather than a constant.
 */
export function rainviewerTiles(host: string, path: string): string[] {
  return [
    `${host}${path}/256/{z}/{x}/{y}/${RAINVIEWER_SCHEME}/${RAINVIEWER_SMOOTH}_${RAINVIEWER_SNOW}.png`,
  ];
}

/**
 * The Universal Blue ramp as a CSS gradient, weak at the BOTTOM (CSS 0deg points up), for the
 * vertical intensity legend down the left edge of the radar — ONESOIL_MOBILE_TEARDOWN §4.7.
 *
 * Every stop is a real RGBA value out of RainViewer's published colour table for scheme 2, and the
 * position of each is its dBZ mapped linearly onto 15…65 dBZ — the band where the scheme actually
 * paints something (below 15 the table is near-transparent haze, at 65 it saturates to white):
 *   15 #88ddee · 20 #00a3e0 · 24 #007fb4 · 34 #004768 · 35 #ffee00 · 40 #ffaa00
 *   45 #ff4400 · 50 #c10000 · 54 #5d0000 · 64 #ff4eff · 65 #ffffff
 * The hard blue→yellow step at 34/35 dBZ is in the source table, not an artefact of this string.
 */
export const RAINVIEWER_LEGEND_GRAD =
  "linear-gradient(0deg,#88ddee 0%,#00a3e0 10%,#007fb4 18%,#004768 38%,#ffee00 40%,#ffaa00 50%,#ff4400 60%,#c10000 70%,#5d0000 78%,#ff4eff 98%,#ffffff 100%)";

// Free, keyless DEM (AWS Terrain Tiles, Terrarium encoding) for a relief/hillshade overlay.
const HILLSHADE_DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// Toggle a hillshade (relief shading) layer. Kept under `beforeId` so it sits below the
// field/draw layers but above the basemap imagery.
export function applyHillshade(map: maplibregl.Map, on: boolean, beforeId?: string) {
  const SRC = "hillshade-dem";
  const LYR = "hillshade";
  if (!on) {
    if (map.getLayer(LYR)) map.removeLayer(LYR);
    if (map.getSource(SRC)) map.removeSource(SRC);
    return;
  }
  if (!map.getSource(SRC)) {
    map.addSource(SRC, {
      type: "raster-dem",
      tiles: [HILLSHADE_DEM],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 14,
      attribution: "Elevation — AWS Terrain Tiles / Mapzen",
    });
  }
  if (!map.getLayer(LYR)) {
    map.addLayer(
      {
        id: LYR,
        type: "hillshade",
        source: SRC,
        paint: { "hillshade-exaggeration": 0.45 },
      },
      beforeId,
    );
  }
}
