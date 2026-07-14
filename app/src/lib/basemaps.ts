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
    label: "Sentinel-2 (buludsuz)",
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
