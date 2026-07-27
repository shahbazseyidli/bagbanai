"use client";

// The colour of a VALUE — the same colour language the map paints the field in.
//
// The stops mirror LEGEND_GRAD in lib/indexStatus.ts (grep `LEGEND_GRAD`), and the family split
// mirrors legendFor()'s: NDMI/NDWI read on the water ramp, everything else on the vegetation ramp.
// One language for three surfaces — the TiTiler pixels, the legend bar under the map, and this
// chart line — so a green line and a green field mean the same thing.
//
// The domain is NOT invented here. It is the `rescale` string TiTiler actually coloured the raster
// with, handed down from GET /api/fields/{id}/scenes; without one, the caller draws a plain line
// instead (see gradientStops returning an empty list). That is the same invariant FieldMapCard
// states where it parses `rescale` — a second hard-coded copy of _raster_style would let the chart
// and the pixels disagree the day a family range changes.

export type RampFamily = "veg" | "water";

type Stop = { p: number; rgb: [number, number, number] };

// Same three colours, same order, as LEGEND_GRAD's two gradients. Interpolating the vegetation trio
// in sRGB already reads red → orange → yellow → green, which is why there is no fourth stop.
const RAMP: Record<RampFamily, Stop[]> = {
  veg: [
    { p: 0, rgb: [0xd7, 0x30, 0x27] },
    { p: 0.5, rgb: [0xfe, 0xe0, 0x8b] },
    { p: 1, rgb: [0x1a, 0x98, 0x50] },
  ],
  water: [
    { p: 0, rgb: [0xb2, 0x18, 0x2b] },
    { p: 0.5, rgb: [0xf7, 0xf7, 0xf7] },
    { p: 1, rgb: [0x21, 0x66, 0xac] },
  ],
};

/** Mirrors legendFor()'s split in lib/indexStatus.ts. The two must move together. */
export function rampFamily(index: string): RampFamily {
  return index === "NDMI" || index === "NDWI" ? "water" : "veg";
}

function hex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: Stop, b: Stop, p: number): string {
  const span = b.p - a.p;
  const k = span <= 0 ? 0 : (p - a.p) / span;
  return hex([
    a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k,
    a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k,
    a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k,
  ]);
}

function colorAt(family: RampFamily, p: number): string {
  const stops = RAMP[family];
  const q = Math.max(0, Math.min(1, p));
  for (let i = 1; i < stops.length; i += 1) {
    if (q <= stops[i].p) return mix(stops[i - 1], stops[i], q);
  }
  return hex(stops[stops.length - 1].rgb);
}

/**
 * The colour a measured value gets, ABSOLUTELY: position inside the map's own rescale domain, never
 * inside the series' own min/max. A field that never leaves 0.75–0.80 must draw a green line, not a
 * red-to-green sweep of its own noise.
 */
export function valueColor(
  value: number,
  domain: [number, number] | null,
  family: RampFamily,
): string | null {
  if (!domain || !Number.isFinite(value)) return null;
  const [lo, hi] = domain;
  if (!(hi > lo)) return null;
  return colorAt(family, (value - lo) / (hi - lo));
}

export interface GradientStop {
  offset: number;
  color: string;
}

/**
 * Stops for a VERTICAL userSpaceOnUse gradient spanning the plot rect, top (axisHi) to bottom
 * (axisLo).
 *
 * Computed in DATA space and projected through the axis domain the caller controls, so the ramp
 * keeps meaning the same thing when the y-axis is unlocked and refitted. An objectBoundingBox
 * gradient would instead stretch red→green across whatever the series happens to span, and paint a
 * perfectly healthy field crimson — the same class of lie the fixed-vs-contrast rescale rule
 * already forbids on the map.
 *
 * Returns [] when there is no honest domain to project; the caller then draws a plain stroke.
 */
export function gradientStops(
  axisDomain: [number, number],
  rampDomain: [number, number] | null,
  family: RampFamily,
): GradientStop[] {
  if (!rampDomain) return [];
  const [aLo, aHi] = axisDomain;
  const [rLo, rHi] = rampDomain;
  if (!(aHi > aLo) || !(rHi > rLo)) return [];

  const out: GradientStop[] = RAMP[family]
    .map((s) => {
      const value = rLo + s.p * (rHi - rLo);
      // 0 at the top of the plot rect (axis maximum), 1 at the bottom.
      const offset = Math.max(0, Math.min(1, (aHi - value) / (aHi - aLo)));
      return { offset, color: hex(s.rgb) };
    })
    .sort((a, b) => a.offset - b.offset);

  // Clamped stops leave the ends of the rect uncoloured; hold the extreme colour flat instead of
  // letting the browser fade to nothing.
  if (out[0].offset > 0) out.unshift({ offset: 0, color: out[0].color });
  if (out[out.length - 1].offset < 1) out.push({ offset: 1, color: out[out.length - 1].color });
  return out;
}
