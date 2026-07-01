"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Polygon } from "@/lib/types";

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const AZ_CENTER: [number, number] = [47.5, 40.3];
const G = "#16a34a";

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: AZ_CENTER,
      zoom: 7,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.doubleClickZoom.disable();

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
    </div>
  );
}

// Read-only display of a single polygon (field detail overview).
export function DisplayMap({ polygon }: { polygon: Polygon | null | undefined }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: AZ_CENTER,
      zoom: 7,
    });
    mapRef.current = map;

    map.on("load", () => {
      if (!polygon) return;
      map.addSource("field", {
        type: "geojson",
        data: { type: "Feature", geometry: polygon, properties: {} },
      });
      map.addLayer({
        id: "field-fill",
        type: "fill",
        source: "field",
        paint: { "fill-color": "#059669", "fill-opacity": 0.3 },
      });
      map.addLayer({
        id: "field-line",
        type: "line",
        source: "field",
        paint: { "line-color": "#047857", "line-width": 2 },
      });

      // Fit to the polygon bounds.
      const coords = polygon.coordinates[0];
      if (coords && coords.length) {
        const bounds = coords.reduce(
          (b, c) => b.extend([c[0], c[1]] as [number, number]),
          new maplibregl.LngLatBounds(
            [coords[0][0], coords[0][1]],
            [coords[0][0], coords[0][1]],
          ),
        );
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-lg border border-slate-200"
    />
  );
}
