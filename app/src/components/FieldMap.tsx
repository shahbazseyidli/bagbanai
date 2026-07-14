"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Layers } from "lucide-react";
import type { Polygon } from "@/lib/types";
import {
  BASEMAPS,
  BLANK_STYLE,
  applyBasemap,
  getSavedBasemap,
  saveBasemap,
  type Basemap,
} from "@/lib/basemaps";

const AZ_CENTER: [number, number] = [47.5, 40.3];
const G = "#16a34a";

// Basemap gallery switcher (parity with FarmerApp "Xəritə növləri").
function BasemapControl({
  current,
  onChange,
}: {
  current: Basemap;
  onChange: (b: Basemap) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-3 left-3 z-10">
      {open && (
        <div className="mb-2 w-44 rounded-lg bg-white/95 p-1 shadow-lg">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onChange(b);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs hover:bg-slate-100 ${
                b.id === current.id ? "font-semibold text-emerald-700" : "text-slate-700"
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  b.id === current.id ? "bg-emerald-600" : "bg-slate-300"
                }`}
              />
              {b.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-white"
      >
        <Layers className="h-3.5 w-3.5" /> {current.label}
      </button>
    </div>
  );
}

// Live coordinate + attribution readout (bottom-right, FarmerApp-style).
function CoordBar({ coord, attribution }: { coord: string; attribution: string }) {
  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-10 max-w-[70%] truncate rounded bg-white/85 px-2 py-0.5 text-[10px] text-slate-600 shadow">
      {coord && <span className="tabular-nums">{coord}</span>}
      {coord && " · "}
      <span>{attribution}</span>
    </div>
  );
}

interface DrawMapProps {
  /** Called whenever the drawn polygon changes (or is cleared). */
  onPolygon: (poly: Polygon | null) => void;
  /** Optional polygon to render initially (e.g. coordinate-entry preview). */
  polygon?: Polygon | null;
}

// Editable drawing map — MapLibre-native click-to-draw (no mapbox-gl-draw, which is
// incompatible with this MapLibre version). Click the map to add polygon vertices;
// the ring closes automatically once there are ≥3 points.
export function DrawMap({ onPolygon }: DrawMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ptsRef = useRef<[number, number][]>([]);
  const renderRef = useRef<() => void>(() => {});
  const cbRef = useRef(onPolygon);
  cbRef.current = onPolygon;
  const [count, setCount] = useState(0);
  const [basemap, setBasemap] = useState<Basemap>(() => getSavedBasemap());
  const basemapRef = useRef(basemap);
  basemapRef.current = basemap;
  const [coord, setCoord] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: AZ_CENTER,
      zoom: 7,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");
    map.doubleClickZoom.disable();
    map.on("mousemove", (e) =>
      setCoord(`${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`),
    );

    function render() {
      const pts = ptsRef.current;
      const ring = pts.length >= 3 ? [...pts, pts[0]] : pts;
      const shape =
        pts.length >= 3
          ? { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} }
          : pts.length >= 2
            ? { type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: {} }
            : { type: "FeatureCollection", features: [] };
      const src = map.getSource("draw") as maplibregl.GeoJSONSource | undefined;
      const psrc = map.getSource("draw-pts") as maplibregl.GeoJSONSource | undefined;
      src?.setData(shape as GeoJSON.GeoJSON);
      psrc?.setData({
        type: "FeatureCollection",
        features: pts.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: p },
          properties: {},
        })),
      } as GeoJSON.GeoJSON);
      cbRef.current(pts.length >= 3 ? ({ type: "Polygon", coordinates: [ring] } as Polygon) : null);
      setCount(pts.length);
    }
    renderRef.current = render;

    map.on("load", () => {
      applyBasemap(map, basemapRef.current);
      map.addSource("draw", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "draw-fill", type: "fill", source: "draw", filter: ["==", "$type", "Polygon"], paint: { "fill-color": G, "fill-opacity": 0.2 } });
      map.addLayer({ id: "draw-line", type: "line", source: "draw", paint: { "line-color": G, "line-width": 2 } });
      map.addSource("draw-pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "draw-pts", type: "circle", source: "draw-pts", paint: { "circle-radius": 5, "circle-color": G, "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
    });

    map.on("click", (e) => {
      ptsRef.current = [...ptsRef.current, [e.lngLat.lng, e.lngLat.lat]];
      render();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeBasemap(bm: Basemap) {
    setBasemap(bm);
    saveBasemap(bm.id);
    const map = mapRef.current;
    if (map && map.getLayer("draw-fill")) applyBasemap(map, bm, "draw-fill");
    else if (map) applyBasemap(map, bm);
  }
  function clearPts() {
    ptsRef.current = [];
    renderRef.current();
  }
  function undoPt() {
    ptsRef.current = ptsRef.current.slice(0, -1);
    renderRef.current();
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-lg border border-slate-200" />
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700 shadow">
        <span>Xəritəyə klikləyin — təpə: {count}</span>
        <button type="button" onClick={undoPt} className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50">Geri</button>
        <button type="button" onClick={clearPts} className="rounded bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-700">Təmizlə</button>
      </div>
      <BasemapControl current={basemap} onChange={changeBasemap} />
      <CoordBar coord={coord} attribution={basemap.attribution} />
    </div>
  );
}

function polygonBounds(polygon: Polygon): [number, number, number, number] | null {
  const coords = polygon.coordinates[0];
  if (!coords || !coords.length) return null;
  let w = coords[0][0], s = coords[0][1], e = coords[0][0], n = coords[0][1];
  for (const [lng, lat] of coords) {
    w = Math.min(w, lng); e = Math.max(e, lng);
    s = Math.min(s, lat); n = Math.max(n, lat);
  }
  return [w, s, e, n];
}

// Read-only display of a single polygon (field detail overview). Optionally overlays a
// satellite index raster (TiTiler XYZ template) under the field outline.
export function DisplayMap({
  polygon,
  rasterUrl,
  rasterOpacity = 0.85,
  heightClass = "h-64",
}: {
  polygon: Polygon | null | undefined;
  rasterUrl?: string | null;
  rasterOpacity?: number;
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const [basemap, setBasemap] = useState<Basemap>(() => getSavedBasemap());
  const basemapRef = useRef(basemap);
  basemapRef.current = basemap;
  const [coord, setCoord] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: AZ_CENTER,
      zoom: 7,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("mousemove", (e) =>
      setCoord(`${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`),
    );

    map.on("load", () => {
      applyBasemap(map, basemapRef.current);
      if (polygon) {
        map.addSource("field", {
          type: "geojson",
          data: { type: "Feature", geometry: polygon, properties: {} },
        });
        map.addLayer({
          id: "field-fill",
          type: "fill",
          source: "field",
          paint: { "fill-color": "#059669", "fill-opacity": 0.15 },
        });
        map.addLayer({
          id: "field-line",
          type: "line",
          source: "field",
          paint: { "line-color": "#facc15", "line-width": 2.5 },
        });

        const coords = polygon.coordinates[0];
        if (coords && coords.length) {
          const bounds = coords.reduce(
            (b, c) => b.extend([c[0], c[1]] as [number, number]),
            new maplibregl.LngLatBounds(
              [coords[0][0], coords[0][1]],
              [coords[0][0], coords[0][1]],
            ),
          );
          map.fitBounds(bounds, { padding: 40, maxZoom: 16 });
        }
      }
      loadedRef.current = true;
      applyRaster(rasterUrl ?? null);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add/update/remove the index raster overlay (below the field outline).
  function applyRaster(url: string | null) {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (!url) {
      if (map.getLayer("index-overlay")) map.removeLayer("index-overlay");
      if (map.getSource("index-overlay")) map.removeSource("index-overlay");
      return;
    }
    const bounds = polygon ? polygonBounds(polygon) : null;
    const existing = map.getSource("index-overlay") as maplibregl.RasterTileSource | undefined;
    if (existing) {
      existing.setTiles([url]);
    } else {
      map.addSource("index-overlay", {
        type: "raster",
        tiles: [url],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 20,
        ...(bounds ? { bounds } : {}),
      });
      const before = map.getLayer("field-line") ? "field-line" : undefined;
      map.addLayer(
        {
          id: "index-overlay",
          type: "raster",
          source: "index-overlay",
          paint: { "raster-opacity": rasterOpacity },
        },
        before,
      );
    }
  }

  useEffect(() => {
    applyRaster(rasterUrl ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rasterUrl]);

  function changeBasemap(bm: Basemap) {
    setBasemap(bm);
    saveBasemap(bm.id);
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("field-fill")) applyBasemap(map, bm, "field-fill");
    else applyBasemap(map, bm);
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`${heightClass} w-full overflow-hidden rounded-lg border border-slate-200`}
      />
      <BasemapControl current={basemap} onChange={changeBasemap} />
      <CoordBar coord={coord} attribution={basemap.attribution} />
    </div>
  );
}
