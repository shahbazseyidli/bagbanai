"use client";

// The single name→hex table for scouting pins (6.5).
//
// The database stores the NAME (migration 0054's scouting_color_chk keeps the seven honest); the
// hex is a design decision and lives here, so a palette tweak is an edit to this file rather than
// a data migration.
//
// Seven hues, originally chosen to stay legible over satellite imagery — dark green, brown and
// grey, often with an NDVI ramp painted over it — which is why there is no white and no pale grey
// here. The map is gone (2026-08-04); the palette is kept as it is because the names are what the
// database stores and the dots in the note list read perfectly well on paper-white too.
import { t, type I18nKey } from "@/lib/i18n";
import type { Scouting } from "@/lib/types";

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

// toMapPins() lived here and turned scouting rows into MapPin markers. The scouting map was removed
// on 2026-08-04 and it had no other caller, so it went with the map. The colour table above did
// NOT: the note list draws the same hex as a dot, and 0054's scouting_color_chk still keeps the
// seven names honest in the database.
