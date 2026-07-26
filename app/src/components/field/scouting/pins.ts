"use client";

// The single name→hex table for scouting pins (6.5).
//
// The database stores the NAME (migration 0054's scouting_color_chk keeps the seven honest); the
// hex is a design decision and lives here, so a palette tweak is an edit to this file rather than
// a data migration.
//
// Seven hues chosen to stay legible on what is underneath them — satellite imagery, which is dark
// green, brown and grey, often with an NDVI ramp painted over it. No white and no pale grey: both
// vanish into cloud, into bare soil and into the top of the vegetation ramp. Every one of these
// carries a white 2px stroke on the map, which is what actually separates them from the basemap.
import { t, type I18nKey } from "@/lib/i18n";
import type { MapPin, Scouting } from "@/lib/types";

export const PIN_COLORS = [
  { name: "red", hex: "#dc2626" },
  { name: "orange", hex: "#ea580c" },
  { name: "yellow", hex: "#eab308" },
  { name: "green", hex: "#16a34a" },
  { name: "blue", hex: "#2563eb" },
  { name: "violet", hex: "#9333ea" },
  { name: "pink", hex: "#db2777" },
] as const;

export type PinColorName = (typeof PIN_COLORS)[number]["name"];

export const DEFAULT_PIN_COLOR: PinColorName = "red";

/** Unknown name → the first entry. A colour this build has never heard of (an older row, a newer
 *  server) must still draw a pin; throwing here would take the whole map down over a swatch. */
export function pinHex(name: string | null | undefined): string {
  return PIN_COLORS.find((c) => c.name === name)?.hex ?? PIN_COLORS[0].hex;
}

/** Localised colour name, for the picker's labels and the note sheet's aria text. */
export function pinColorLabel(name: string): string {
  return t(`app.field.scouting.color.${name}` as I18nKey);
}

export function isResolved(s: Scouting): boolean {
  return s.status === "resolved";
}

/**
 * Scouting rows → map pins.
 *
 * `showResolved` governs the MAP and the LIST from one flag on purpose (ScoutingTab owns it): two
 * independent filters would let the map and the list disagree about what is on screen, and the
 * farmer has no way to tell which one is lying. Resolved notes are faded here, never dropped —
 * they are still tappable, because "resolved" is a record, not a deletion.
 */
export function toMapPins(items: Scouting[], showResolved: boolean): MapPin[] {
  const out: MapPin[] = [];
  for (const s of items) {
    if (s.lat == null || s.lon == null) continue;
    const resolved = isResolved(s);
    if (resolved && !showResolved) continue;
    out.push({ id: s.id, lng: s.lon, lat: s.lat, color: pinHex(s.color), dim: resolved });
  }
  return out;
}
