"use client";

// Types for the farm-wide notes log (/notes).
//
// The org-scoped read returns the SAME row the field-scoped one does — services/app/routers/
// scouting.py, grep "_row_out": one serialiser for both scopes, so a note read through the org list
// and the same note read through its field can never disagree about a type — plus `field_name`,
// which only the org statement selects. The client type is therefore the shared `Scouting` plus
// that one field, and it lives here rather than in lib/types.ts because nothing outside this screen
// reads it.
import { t, type I18nKey } from "@/lib/i18n";
import type { Scouting } from "@/lib/types";

export interface OrgScoutingNote extends Scouting {
  /** Org-scoped read only. Missing renders app.notes.fieldUnknown — never a guessed name. */
  field_name?: string | null;
}

/** GET /api/scouting?org_id=…&limit=… — an object, not a bare array, unlike the field-scoped read. */
export interface OrgScoutingResponse {
  items?: OrgScoutingNote[] | null;
  /** The server read one row PAST `limit` and there was one. An OBSERVED fact, not inferred
   *  from the row count — a response of exactly `limit` rows is otherwise indistinguishable from
   *  a farm that happens to have exactly that many notes. */
  has_more?: boolean;
}

/**
 * One row of GET /api/orgs/{id}/thumbs — the latest NDVI raster per field, already rendered by
 * TiTiler as a finished PNG. Same shape /fields types for the same endpoint.
 */
export interface FieldThumb {
  field_id: string;
  url: string;
  date: string;
  sensor: string;
}

// The seven the add-form offers (ScoutingTab's CATEGORIES). Kept as a list rather than a union
// because the wire type is a plain string — see categoryLabel.
const KNOWN_CATEGORIES = ["pest", "disease", "weed", "nutrient", "water", "damage", "other"];

/**
 * Localised category name, or the raw code for anything this build has not heard of.
 *
 * services/app/schemas.py types `category: str` with NO enum, so an unknown code can arrive (an
 * older row, a newer server). t() would then render the literal key "scout.cat.xyz" into the row;
 * the raw code is at least true.
 */
export function categoryLabel(c: string): string {
  return KNOWN_CATEGORIES.includes(c) ? t(`scout.cat.${c}` as I18nKey) : c;
}
