"use client";

// D4.3 — desktop agronomist workspace: ALL of an org's fields on one map. Polygons are coloured by
// processing status (green = data ready, amber = partial, grey = pending); the map fits every field
// and a click opens that field. Reuses the shared basemap machinery (lib/basemaps).
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { BLANK_STYLE, applyBasemap, getSavedBasemap } from "@/lib/basemaps";
import type { Polygon } from "@/lib/types";

export interface GeoField {
  id: string;
  name: string;
  area_ha: number | null;
  data_status?: string;
  geom: Polygon | null;
}

export default function FieldsOverviewMap({
  fields,
  heightClass = "h-full",
}: {
  fields: GeoField[];
  heightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BLANK_STYLE,
      center: [48.5, 40.4],
      zoom: 6,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    function draw() {
      if (map.getSource("basemap")) return; // already drawn
      applyBasemap(map, getSavedBasemap());
      const feats = fieldsRef.current
        .filter((f) => f.geom)
        .map((f) => ({
          type: "Feature" as const,
          geometry: f.geom as GeoJSON.Polygon,
          properties: { id: f.id, status: f.data_status ?? "none" },
        }));
      map.addSource("fields", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": ["match", ["get", "status"], "ready", "#10b981", "partial", "#f59e0b", "#94a3b8"],
          "fill-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        paint: { "line-color": "#facc15", "line-width": 2 },
      });

      if (feats.length) {
        const b = new maplibregl.LngLatBounds();
        feats.forEach((f) =>
          (f.geometry.coordinates[0] as [number, number][]).forEach((c) => b.extend(c)),
        );
        map.fitBounds(b, { padding: 44, maxZoom: 15, duration: 0 });
      }
      map.resize();

      map.on("click", "fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) router.push(`/fields/${id}`);
      });
      map.on("mouseenter", "fields-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "fields-fill", () => { map.getCanvas().style.cursor = ""; });
    }
    // Draw when the style is ready; `idle` is a safety net if `load` was missed.
    if (map.isStyleLoaded()) draw();
    else map.on("load", draw);
    map.on("idle", draw);

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={`${heightClass} w-full overflow-hidden rounded-2xl border-[1.5px] border-slate-200`} />;
}
