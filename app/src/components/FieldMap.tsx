"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
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

// MapLibre-compatible draw theme. The stock @mapbox/mapbox-gl-draw theme uses a
// `line-dasharray` expression that newer MapLibre rejects (addLayer throws → blank map),
// so we supply the full layer set with solid lines + our green palette.
const G = "#16a34a";
const DRAW_STYLES: object[] = [
  { id: "gl-draw-polygon-fill-inactive", type: "fill",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    paint: { "fill-color": G, "fill-outline-color": G, "fill-opacity": 0.1 } },
  { id: "gl-draw-polygon-fill-active", type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: { "fill-color": G, "fill-outline-color": G, "fill-opacity": 0.15 } },
  { id: "gl-draw-polygon-midpoint", type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 3, "circle-color": G } },
  { id: "gl-draw-polygon-stroke-inactive", type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": G, "line-width": 2 } },
  { id: "gl-draw-polygon-stroke-active", type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": G, "line-width": 2 } },
  { id: "gl-draw-line-inactive", type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "LineString"], ["!=", "mode", "static"]],
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": G, "line-width": 2 } },
  { id: "gl-draw-line-active", type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": G, "line-width": 2 } },
  { id: "gl-draw-polygon-and-line-vertex-stroke-inactive", type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 5, "circle-color": "#fff" } },
  { id: "gl-draw-polygon-and-line-vertex-inactive", type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 3, "circle-color": G } },
  { id: "gl-draw-point-point-stroke-inactive", type: "circle",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Point"], ["==", "meta", "feature"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 5, "circle-color": "#fff" } },
  { id: "gl-draw-point-inactive", type: "circle",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Point"], ["==", "meta", "feature"], ["!=", "mode", "static"]],
    paint: { "circle-radius": 3, "circle-color": G } },
  { id: "gl-draw-point-stroke-active", type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "active", "true"], ["!=", "meta", "midpoint"]],
    paint: { "circle-radius": 6, "circle-color": "#fff" } },
  { id: "gl-draw-point-active", type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["!=", "meta", "midpoint"], ["==", "active", "true"]],
    paint: { "circle-radius": 4, "circle-color": G } },
  { id: "gl-draw-polygon-fill-static", type: "fill",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    paint: { "fill-color": "#404040", "fill-outline-color": "#404040", "fill-opacity": 0.1 } },
  { id: "gl-draw-polygon-stroke-static", type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#404040", "line-width": 2 } },
  { id: "gl-draw-line-static", type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "LineString"]],
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#404040", "line-width": 2 } },
  { id: "gl-draw-point-static", type: "circle",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Point"]],
    paint: { "circle-radius": 5, "circle-color": "#404040" } },
];

interface DrawMapProps {
  /** Called whenever the drawn polygon changes (or is cleared). */
  onPolygon: (poly: Polygon | null) => void;
  /** Optional polygon to render initially (e.g. coordinate-entry preview). */
  polygon?: Polygon | null;
}

// Editable drawing map used on field creation.
export function DrawMap({ onPolygon }: DrawMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const cbRef = useRef(onPolygon);
  cbRef.current = onPolygon;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: AZ_CENTER,
      zoom: 7,
    });
    mapRef.current = map;

    // mapbox-gl-draw expects a couple of globals/methods present on maplibre.
    // maplibre-gl is API-compatible enough for Draw to work.
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      styles: DRAW_STYLES,
    });
    drawRef.current = draw;

    // Cast: types expect a mapbox-gl control; maplibre control shape matches.
    map.addControl(draw as unknown as maplibregl.IControl, "top-right");
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    function emit() {
      const data = draw.getAll();
      const feat = data.features.find((f) => f.geometry.type === "Polygon");
      if (feat && feat.geometry.type === "Polygon") {
        cbRef.current(feat.geometry as Polygon);
      } else {
        cbRef.current(null);
      }
    }

    // Keep only the most recent polygon.
    function onCreate() {
      const data = draw.getAll();
      const polys = data.features.filter((f) => f.geometry.type === "Polygon");
      if (polys.length > 1) {
        polys.slice(0, -1).forEach((f) => f.id && draw.delete(String(f.id)));
      }
      emit();
    }

    map.on("draw.create", onCreate);
    map.on("draw.update", emit);
    map.on("draw.delete", emit);

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-lg border border-slate-200"
    />
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
