"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Layers, Search, Ruler, Mountain, X } from "lucide-react";
import { length as turfLength, area as turfArea, simplify as turfSimplify } from "@turf/turf";
import type { Polygon } from "@/lib/types";
import {
  BASEMAPS,
  BLANK_STYLE,
  applyBasemap,
  applyHillshade,
  getSavedBasemap,
  saveBasemap,
  getSavedHillshade,
  saveHillshade,
  type Basemap,
} from "@/lib/basemaps";

const AZ_CENTER: [number, number] = [47.5, 40.3];
const G = "#16a34a";

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

// Basemap gallery switcher (parity with FarmerApp "Xəritə növləri") + hillshade toggle.
function BasemapControl({
  current,
  onChange,
  hillshade,
  onToggleHillshade,
}: {
  current: Basemap;
  onChange: (b: Basemap) => void;
  hillshade: boolean;
  onToggleHillshade: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-3 left-3 z-10">
      {open && (
        <div className="mb-2 w-48 rounded-lg bg-white/95 p-1 shadow-lg">
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
          <button
            type="button"
            onClick={() => onToggleHillshade(!hillshade)}
            className={`mt-1 flex w-full items-center gap-2 rounded border-t border-slate-100 px-3 py-1.5 text-left text-xs hover:bg-slate-100 ${
              hillshade ? "font-semibold text-emerald-700" : "text-slate-700"
            }`}
          >
            <Mountain className="h-3.5 w-3.5 shrink-0" />
            Relyef kölgəsi {hillshade ? "✓" : ""}
          </button>
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

// Place search (geocoding) — free OSM Nominatim, limited to Azerbaijan. Searches on submit
// only (respects the ≤1 req/s usage policy); the browser Referer identifies the app.
function SearchControl({ onPick }: { onPick: (lng: number, lat: number, bbox?: [number, number, number, number]) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lng: number; lat: number; bbox?: [number, number, number, number] }>>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=az&q=${encodeURIComponent(term)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "az" } });
      const data: Array<Record<string, unknown>> = res.ok ? await res.json() : [];
      setResults(
        data.map((r) => {
          const bb = (r.boundingbox as string[] | undefined)?.map(Number);
          return {
            name: String(r.display_name ?? ""),
            lng: Number(r.lon),
            lat: Number(r.lat),
            bbox: bb && bb.length === 4 ? ([bb[2], bb[0], bb[3], bb[1]] as [number, number, number, number]) : undefined,
          };
        }),
      );
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-20 mb-2 w-full">
      <form onSubmit={run} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Yer axtar (kənd, rayon…)"
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        {q && (
          <button type="button" onClick={() => { setQ(""); setResults([]); setOpen(false); }} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" disabled={busy || !q.trim()} className="shrink-0 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? "…" : "Axtar"}
        </button>
      </form>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onPick(r.lng, r.lat, r.bbox); setOpen(false); }}
              className="block w-full truncate rounded px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100"
              title={r.name}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
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
  /** Imported polygon to load into the draw buffer (e.g. from a GeoJSON/KML file). */
  importedPolygon?: Polygon | null;
  /** Bump this to (re)load `importedPolygon` into the draw buffer. */
  importSeq?: number;
  /** When true, a map tap fires `onDetect(lng,lat)` instead of adding a vertex (C3). */
  detectMode?: boolean;
  onDetect?: (lng: number, lat: number) => void;
  /** When true, press-and-drag paints a freehand boundary (lasso) instead of tapping vertices. */
  brushMode?: boolean;
}

// Editable drawing map — MapLibre-native click-to-draw (no mapbox-gl-draw, which is
// incompatible with this MapLibre version). Click the map to add polygon vertices;
// the ring closes automatically once there are ≥3 points. A "brush" mode lets the farmer
// press-and-drag to trace the boundary freehand; the traced path is simplified into editable
// vertices on release.
export function DrawMap({ onPolygon, importedPolygon, importSeq = 0, detectMode = false, onDetect, brushMode = false }: DrawMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ptsRef = useRef<[number, number][]>([]);
  const renderRef = useRef<() => void>(() => {});
  const cbRef = useRef(onPolygon);
  cbRef.current = onPolygon;
  const detectRef = useRef(detectMode);
  detectRef.current = detectMode;
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const brushRef = useRef(brushMode);
  brushRef.current = brushMode;
  const brushPtsRef = useRef<[number, number][]>([]);
  const [count, setCount] = useState(0);
  const [basemap, setBasemap] = useState<Basemap>(() => getSavedBasemap());
  const basemapRef = useRef(basemap);
  basemapRef.current = basemap;
  const [hillshade, setHillshade] = useState(() => getSavedHillshade());
  const hillshadeRef = useRef(hillshade);
  hillshadeRef.current = hillshade;
  const [coord, setCoord] = useState("");

  function reapplyHillshade(map: maplibregl.Map) {
    const before = map.getLayer("draw-fill") ? "draw-fill" : undefined;
    applyHillshade(map, false);
    if (hillshadeRef.current) applyHillshade(map, true, before);
  }

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
      reapplyHillshade(map);
    });

    map.on("click", (e) => {
      // Brush mode paints via pointer events (below) — ignore the click it also fires.
      if (brushRef.current) return;
      // Detect mode (C3): a tap asks the server to trace the field boundary instead of
      // adding a vertex. The result loads via importedPolygon (editable), so the farmer
      // still confirms/adjusts it.
      if (detectRef.current) {
        onDetectRef.current?.(e.lngLat.lng, e.lngLat.lat);
        return;
      }
      ptsRef.current = [...ptsRef.current, [e.lngLat.lng, e.lngLat.lat]];
      render();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load an imported polygon into the draw buffer when importSeq changes.
  useEffect(() => {
    if (!importSeq || !importedPolygon) return;
    const ring = importedPolygon.coordinates[0] ?? [];
    // Strip the closing duplicate vertex; the renderer re-closes the ring.
    const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
    ptsRef.current = open.map((p) => [p[0], p[1]] as [number, number]);
    renderRef.current();
    const map = mapRef.current;
    const b = polygonBounds(importedPolygon);
    if (map && b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40, maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importSeq]);

  // Brush (freehand lasso): press-and-drag paints the boundary. While active we disable map
  // panning so the drag draws instead of moving the map, capture the pointer path, and on
  // release simplify it (turf) into editable vertices — so the farmer can still fine-tune it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (!brushMode) {
      canvas.style.cursor = "";
      canvas.style.touchAction = "";
      map.dragPan.enable();
      return;
    }
    canvas.style.cursor = "crosshair";
    canvas.style.touchAction = "none"; // stop the page from scrolling while painting on touch
    map.dragPan.disable();
    let drawing = false;

    const toLngLat = (ev: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      const p = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
      return [p.lng, p.lat];
    };
    const renderBrush = () => {
      const pts = brushPtsRef.current;
      const ring = pts.length >= 3 ? [...pts, pts[0]] : pts;
      const shape =
        pts.length >= 3
          ? { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} }
          : pts.length >= 2
            ? { type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: {} }
            : { type: "FeatureCollection", features: [] };
      (map.getSource("draw") as maplibregl.GeoJSONSource | undefined)?.setData(shape as GeoJSON.GeoJSON);
    };
    const finalize = () => {
      const pts = brushPtsRef.current;
      brushPtsRef.current = [];
      if (pts.length < 3) { renderRef.current(); return; }
      const ring = [...pts, pts[0]];
      let out: [number, number][] = ring;
      try {
        const s = turfSimplify(
          { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} } as GeoJSON.Feature,
          { tolerance: 0.00008, highQuality: true },
        );
        const c = (s.geometry as GeoJSON.Polygon).coordinates?.[0] as [number, number][] | undefined;
        if (c && c.length >= 4) out = c;
      } catch { /* keep raw path on simplify failure */ }
      // Strip the closing duplicate — the renderer re-closes the ring.
      ptsRef.current = out.slice(0, -1).map((p) => [p[0], p[1]] as [number, number]);
      renderRef.current();
    };

    const down = (ev: PointerEvent) => {
      if (ev.button !== 0 && ev.pointerType === "mouse") return;
      drawing = true;
      brushPtsRef.current = [toLngLat(ev)];
      renderBrush();
      ev.preventDefault();
    };
    const move = (ev: PointerEvent) => {
      if (!drawing) return;
      brushPtsRef.current.push(toLngLat(ev));
      renderBrush();
      ev.preventDefault();
    };
    const up = () => {
      if (!drawing) return;
      drawing = false;
      finalize();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      canvas.style.cursor = "";
      canvas.style.touchAction = "";
      map.dragPan.enable();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brushMode]);

  function changeBasemap(bm: Basemap) {
    setBasemap(bm);
    saveBasemap(bm.id);
    const map = mapRef.current;
    if (map && map.getLayer("draw-fill")) applyBasemap(map, bm, "draw-fill");
    else if (map) applyBasemap(map, bm);
    if (map) reapplyHillshade(map);
  }
  function toggleHillshade(v: boolean) {
    setHillshade(v);
    saveHillshade(v);
    hillshadeRef.current = v;
    const map = mapRef.current;
    if (map) reapplyHillshade(map);
  }
  function flyToPick(lng: number, lat: number, bbox?: [number, number, number, number]) {
    const map = mapRef.current;
    if (!map) return;
    if (bbox) map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, maxZoom: 16 });
    else map.flyTo({ center: [lng, lat], zoom: 14 });
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
    <div>
      {/* Search lives ABOVE the map so it never collides with the draw toolbar or the
          zoom/geolocate controls (previously all crowded the top strip on mobile). */}
      <SearchControl onPick={flyToPick} />
      <div className="relative">
        <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-lg border border-slate-200" />
        {/* Draw toolbar top-left — the top-right corner holds the zoom/geolocate controls, and
            search now sits above the map, so the top strip no longer collides. */}
        <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700 shadow">
          <span>Təpə: {count}</span>
          <button type="button" onClick={undoPt} className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50">Geri</button>
          <button type="button" onClick={clearPts} className="rounded bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-700">Təmizlə</button>
        </div>
        <BasemapControl current={basemap} onChange={changeBasemap} hillshade={hillshade} onToggleHillshade={toggleHillshade} />
        <CoordBar coord={coord} attribution={basemap.attribution} />
      </div>
    </div>
  );
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
  const [hillshade, setHillshade] = useState(() => getSavedHillshade());
  const hillshadeRef = useRef(hillshade);
  hillshadeRef.current = hillshade;
  const [coord, setCoord] = useState("");

  // Measurement (distance + area) — opt-in mode; clicks add measure vertices.
  const [measure, setMeasure] = useState(false);
  const measureRef = useRef(false);
  measureRef.current = measure;
  const mPtsRef = useRef<[number, number][]>([]);
  const mRenderRef = useRef<() => void>(() => {});
  const [mStats, setMStats] = useState<{ dist: number; area: number | null }>({ dist: 0, area: null });

  function reapplyHillshade(map: maplibregl.Map) {
    const before = map.getLayer("field-fill") ? "field-fill" : undefined;
    applyHillshade(map, false);
    if (hillshadeRef.current) applyHillshade(map, true, before);
  }

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

    function renderMeasure() {
      const pts = mPtsRef.current;
      const closed = pts.length >= 3 ? [...pts, pts[0]] : pts;
      const shape =
        pts.length >= 3
          ? { type: "Feature", geometry: { type: "Polygon", coordinates: [closed] }, properties: {} }
          : pts.length >= 2
            ? { type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: {} }
            : { type: "FeatureCollection", features: [] };
      (map.getSource("measure") as maplibregl.GeoJSONSource | undefined)?.setData(shape as GeoJSON.GeoJSON);
      (map.getSource("measure-pts") as maplibregl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} })),
      } as GeoJSON.GeoJSON);
      let dist = 0;
      let area: number | null = null;
      if (pts.length >= 2) {
        dist = turfLength({ type: "Feature", geometry: { type: "LineString", coordinates: closed }, properties: {} } as GeoJSON.Feature, { units: "kilometers" });
      }
      if (pts.length >= 3) {
        area = turfArea({ type: "Feature", geometry: { type: "Polygon", coordinates: [closed] }, properties: {} } as GeoJSON.Feature) / 10000;
      }
      setMStats({ dist, area });
    }
    mRenderRef.current = renderMeasure;

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
      // Measurement overlay layers (empty until the user measures).
      map.addSource("measure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "measure-fill", type: "fill", source: "measure", filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#f59e0b", "fill-opacity": 0.15 } });
      map.addLayer({ id: "measure-line", type: "line", source: "measure", paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [2, 1] } });
      map.addSource("measure-pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "measure-pts", type: "circle", source: "measure-pts", paint: { "circle-radius": 4, "circle-color": "#f59e0b", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff" } });
      loadedRef.current = true;
      reapplyHillshade(map);
      applyRaster(rasterUrl ?? null);
    });

    map.on("click", (e) => {
      if (!measureRef.current) return;
      mPtsRef.current = [...mPtsRef.current, [e.lngLat.lng, e.lngLat.lat]];
      renderMeasure();
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

  // Crosshair cursor while measuring.
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = measure ? "crosshair" : "";
  }, [measure]);

  function changeBasemap(bm: Basemap) {
    setBasemap(bm);
    saveBasemap(bm.id);
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("field-fill")) applyBasemap(map, bm, "field-fill");
    else applyBasemap(map, bm);
    reapplyHillshade(map);
  }
  function toggleHillshade(v: boolean) {
    setHillshade(v);
    saveHillshade(v);
    hillshadeRef.current = v;
    const map = mapRef.current;
    if (map) reapplyHillshade(map);
  }
  function flyToPick(lng: number, lat: number, bbox?: [number, number, number, number]) {
    const map = mapRef.current;
    if (!map) return;
    if (bbox) map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, maxZoom: 16 });
    else map.flyTo({ center: [lng, lat], zoom: 14 });
  }
  function clearMeasure() {
    mPtsRef.current = [];
    mRenderRef.current();
  }
  function toggleMeasure() {
    setMeasure((m) => {
      const next = !m;
      if (!next) {
        mPtsRef.current = [];
        mRenderRef.current();
      }
      return next;
    });
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`${heightClass} w-full overflow-hidden rounded-lg border border-slate-200`}
      />
      <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={toggleMeasure}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shadow ${
            measure ? "bg-amber-500 text-white" : "bg-white/95 text-slate-700 hover:bg-white"
          }`}
        >
          <Ruler className="h-3.5 w-3.5" /> Ölç
        </button>
        {measure && (
          <div className="rounded-md bg-white/95 px-2 py-1 text-[11px] text-slate-700 shadow">
            <div>Xəritəyə klikləyin.</div>
            <div className="tabular-nums">
              Məsafə: <b>{mStats.dist.toFixed(2)} km</b>
              {mStats.area != null && <> · Sahə: <b>{mStats.area.toFixed(2)} ha</b></>}
            </div>
            <button type="button" onClick={clearMeasure} className="mt-0.5 text-amber-600 hover:underline">
              Təmizlə
            </button>
          </div>
        )}
      </div>
      <SearchControl onPick={flyToPick} />
      <BasemapControl current={basemap} onChange={changeBasemap} hillshade={hillshade} onToggleHillshade={toggleHillshade} />
      <CoordBar coord={coord} attribution={basemap.attribution} />
    </div>
  );
}

// --- Two-date swipe compare -------------------------------------------------

function compareOutline(map: maplibregl.Map, polygon: Polygon) {
  map.addSource("cfield", { type: "geojson", data: { type: "Feature", geometry: polygon, properties: {} } });
  map.addLayer({ id: "cfield-line", type: "line", source: "cfield", paint: { "line-color": "#facc15", "line-width": 2 } });
}

function compareRaster(map: maplibregl.Map, url: string | null) {
  if (!url) {
    if (map.getLayer("cidx")) map.removeLayer("cidx");
    if (map.getSource("cidx")) map.removeSource("cidx");
    return;
  }
  const src = map.getSource("cidx") as maplibregl.RasterTileSource | undefined;
  if (src) {
    src.setTiles([url]);
  } else {
    map.addSource("cidx", { type: "raster", tiles: [url], tileSize: 256, minzoom: 8, maxzoom: 20 });
    const before = map.getLayer("cfield-line") ? "cfield-line" : undefined;
    map.addLayer({ id: "cidx", type: "raster", source: "cidx", paint: { "raster-opacity": 0.9 } }, before);
  }
}

// Swipe/split view comparing two scene dates' rasters for the same field. Two synced
// MapLibre maps stacked; the right map is clipped to a draggable vertical divider.
export function CompareMap({
  polygon,
  leftUrl,
  rightUrl,
  leftLabel,
  rightLabel,
  heightClass = "h-72",
}: {
  polygon: Polygon | null | undefined;
  leftUrl: string | null;
  rightUrl: string | null;
  leftLabel?: string;
  rightLabel?: string;
  heightClass?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftMap = useRef<maplibregl.Map | null>(null);
  const rightMap = useRef<maplibregl.Map | null>(null);
  const [split, setSplit] = useState(50);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current || leftMap.current) return;
    const mk = (c: HTMLDivElement) =>
      new maplibregl.Map({ container: c, style: BLANK_STYLE, center: AZ_CENTER, zoom: 7, attributionControl: false });
    const a = mk(leftRef.current);
    const b = mk(rightRef.current);
    leftMap.current = a;
    rightMap.current = b;
    a.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    let syncing = false;
    const sync = (src: maplibregl.Map, dst: maplibregl.Map) => () => {
      if (syncing) return;
      syncing = true;
      dst.jumpTo({ center: src.getCenter(), zoom: src.getZoom(), bearing: src.getBearing(), pitch: src.getPitch() });
      syncing = false;
    };
    a.on("move", sync(a, b));
    b.on("move", sync(b, a));

    const init = (m: maplibregl.Map, url: string | null) => {
      m.on("load", () => {
        applyBasemap(m, getSavedBasemap());
        if (polygon) {
          compareOutline(m, polygon);
          const bnd = polygonBounds(polygon);
          if (bnd) m.fitBounds([[bnd[0], bnd[1]], [bnd[2], bnd[3]]], { padding: 30, maxZoom: 16, animate: false });
        }
        compareRaster(m, url);
      });
    };
    init(a, leftUrl);
    init(b, rightUrl);

    return () => {
      a.remove();
      b.remove();
      leftMap.current = null;
      rightMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = leftMap.current;
    if (m && m.isStyleLoaded()) compareRaster(m, leftUrl);
  }, [leftUrl]);
  useEffect(() => {
    const m = rightMap.current;
    if (m && m.isStyleLoaded()) compareRaster(m, rightUrl);
  }, [rightUrl]);

  // Nudge a resize shortly after mount so both canvases fill the container.
  useEffect(() => {
    const t = setTimeout(() => {
      leftMap.current?.resize();
      rightMap.current?.resize();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  function onDrag(clientX: number) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(4, Math.min(96, pct)));
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      if (draggingRef.current) onDrag(e.clientX);
    }
    function up() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${heightClass} w-full overflow-hidden rounded-lg border border-slate-200`}>
      <div ref={leftRef} className="absolute inset-0" />
      <div ref={rightRef} className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }} />
      {leftLabel && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow">
          {leftLabel}
        </div>
      )}
      {rightLabel && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow">
          {rightLabel}
        </div>
      )}
      <div
        className="absolute inset-y-0 z-20 -ml-3 w-6 cursor-ew-resize"
        style={{ left: `${split}%` }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          onDrag(e.clientX);
        }}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/90 shadow" />
        <div className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow">
          <span className="text-[10px]">↔</span>
        </div>
      </div>
    </div>
  );
}
