// Field boundary import/export — GeoJSON + KML, dependency-free.
// Parsing uses the browser DOMParser/JSON; serialization is plain string building.
import type { Polygon } from "@/lib/types";

// ---- Export ---------------------------------------------------------------

export function polygonToGeoJSON(polygon: Polygon, name = "sahə"): string {
  const fc = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name },
        geometry: { type: "Polygon", coordinates: polygon.coordinates },
      },
    ],
  };
  return JSON.stringify(fc, null, 2);
}

export function polygonToKML(polygon: Polygon, name = "sahə"): string {
  const ring = polygon.coordinates[0] ?? [];
  // KML wants lon,lat[,alt] tuples, whitespace-separated, ring explicitly closed.
  const closed =
    ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ? [...ring, ring[0]]
      : ring;
  const coords = closed.map(([lng, lat]) => `${lng},${lat},0`).join(" ");
  const safe = name.replace(/[<&>]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>${safe}</name>
    <Polygon><outerBoundaryIs><LinearRing>
      <coordinates>${coords}</coordinates>
    </LinearRing></outerBoundaryIs></Polygon>
  </Placemark>
</kml>`;
}

/** Trigger a client-side file download. */
export function downloadText(filename: string, text: string, mime = "application/octet-stream") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Import ---------------------------------------------------------------

function ringToPolygon(ring: number[][]): Polygon | null {
  if (!ring || ring.length < 3) return null;
  const closed =
    ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]
      ? [...ring, ring[0]]
      : ring;
  return { type: "Polygon", coordinates: [closed] };
}

function firstPolygonFromGeoJSON(obj: unknown): Polygon | null {
  const walk = (g: any): number[][] | null => {
    if (!g || typeof g !== "object") return null;
    if (g.type === "Polygon" && Array.isArray(g.coordinates)) return g.coordinates[0] ?? null;
    if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) return g.coordinates[0]?.[0] ?? null;
    return null;
  };
  const o = obj as any;
  if (o?.type === "FeatureCollection" && Array.isArray(o.features)) {
    for (const f of o.features) {
      const r = walk(f?.geometry);
      if (r) return ringToPolygon(r);
    }
    return null;
  }
  if (o?.type === "Feature") return ringToPolygon(walk(o.geometry) ?? []);
  const r = walk(o);
  return r ? ringToPolygon(r) : null;
}

function firstPolygonFromKML(text: string): Polygon | null {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const coordsEl = doc.querySelector("Polygon coordinates") || doc.querySelector("coordinates");
  if (!coordsEl?.textContent) return null;
  const ring = coordsEl.textContent
    .trim()
    .split(/\s+/)
    .map((tuple) => {
      const [lng, lat] = tuple.split(",").map(Number);
      return [lng, lat] as number[];
    })
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return ringToPolygon(ring);
}

/** Parse a zipped shapefile (.zip with .shp/.dbf/.prj) into the first polygon it contains (T19).
 * shpjs is loaded lazily so it never enters the main bundle — only when a farmer imports one. */
export async function parseShapefile(buffer: ArrayBuffer): Promise<Polygon | null> {
  const shp = (await import("shpjs")).default;
  const geo = await shp(buffer);
  const layers = Array.isArray(geo) ? geo : [geo];
  for (const fc of layers) {
    const p = firstPolygonFromGeoJSON(fc);
    if (p) return p;
  }
  return null;
}

/** Parse a GeoJSON/KML string into the first polygon it contains. Returns null if none. */
export function parseGeoImport(text: string, filename = ""): Polygon | null {
  const lower = filename.toLowerCase();
  const looksKml = lower.endsWith(".kml") || /<kml[\s>]/i.test(text) || text.includes("<coordinates>");
  if (looksKml) {
    const p = firstPolygonFromKML(text);
    if (p) return p;
  }
  try {
    return firstPolygonFromGeoJSON(JSON.parse(text));
  } catch {
    // Fall back to KML if JSON parse failed and we hadn't tried it.
    return looksKml ? null : firstPolygonFromKML(text);
  }
}
