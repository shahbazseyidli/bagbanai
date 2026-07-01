import * as turf from "@turf/turf";
import type { Polygon } from "./types";

export interface PolygonValidation {
  ok: boolean;
  errorKey?: "field.err.minVertices" | "field.err.selfIntersect";
  areaHa?: number;
}

// Ensure the linear ring is closed (first === last).
export function closeRing(coords: number[][]): number[][] {
  if (coords.length === 0) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...coords, [first[0], first[1]]];
  }
  return coords;
}

// Build a GeoJSON Polygon from a list of [lon,lat] rings' outer ring.
export function polygonFromRing(ring: number[][]): Polygon {
  return { type: "Polygon", coordinates: [closeRing(ring)] };
}

export function validatePolygon(poly: Polygon | null): PolygonValidation {
  if (!poly) return { ok: false, errorKey: "field.err.minVertices" };
  const ring = poly.coordinates[0] ?? [];
  // A closed ring of a triangle has 4 points (last repeats first).
  const distinct = ring.length && sameCoord(ring[0], ring[ring.length - 1])
    ? ring.length - 1
    : ring.length;
  if (distinct < 3) return { ok: false, errorKey: "field.err.minVertices" };

  const closed = polygonFromRing(ring);
  const feature = turf.polygon(closed.coordinates);

  // Self-intersection check.
  const kinks = turf.kinks(feature);
  if (kinks.features.length > 0) {
    return { ok: false, errorKey: "field.err.selfIntersect" };
  }

  const areaM2 = turf.area(feature);
  return { ok: true, areaHa: areaM2 / 10000 };
}

function sameCoord(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// Parse a textarea of "lon,lat" lines into a ring. Throws on malformed input.
export function parseCoordinates(text: string): number[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ring: number[][] = [];
  for (const line of lines) {
    const parts = line.split(/[,;\s]+/).filter(Boolean);
    if (parts.length < 2) throw new Error("parse");
    const lon = Number(parts[0]);
    const lat = Number(parts[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error("parse");
    ring.push([lon, lat]);
  }
  if (ring.length < 3) throw new Error("min");
  return ring;
}
