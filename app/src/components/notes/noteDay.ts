"use client";

// Grouping the log into days.
//
// observed_at is `timestamptz` (db/migrations, grep "scouting_observations"), i.e. a real instant
// serialised with its offset — so the DAY a note belongs to has to be taken in the farmer's own
// zone. Slicing the first ten characters off "2026-07-27T22:10:00+00:00" would file a note written
// at 02:10 Baku under the previous day, which is the one thing a date header must never do.
//
// The month names come from the dictionary through formatShortDate, imported from the home slice.
// That import is confined to THIS file so a move by another owner is a one-line fix here.
import { t } from "@/lib/i18n";
import { formatShortDate } from "@/components/home/homeDate";
import type { OrgScoutingNote } from "./noteTypes";

export interface DayGroup {
  key: string;
  label: string;
  items: OrgScoutingNote[];
}

/** Bucket for a timestamp that cannot be parsed. Never a guessed date; it gets its own header. */
export const UNKNOWN_DAY = "unknown";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** A Date → its LOCAL calendar day, "YYYY-MM-DD". Not toISOString(), which is UTC. */
function localKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local calendar day of an API timestamp, or null when it will not parse. */
export function dayKeyOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localKey(d);
}

/** "14:05", local. 24-hour on purpose: every locale this app ships reads it unambiguously, and it
 *  needs no ICU data that a runtime might be built without. */
export function timeOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Day key → header text. Today and yesterday are named; everything else is a short date. */
export function dayLabel(key: string, now: Date = new Date()): string {
  if (key === UNKNOWN_DAY) return t("app.notes.day.unknown");
  if (key === localKey(now)) return t("app.notes.day.today");
  // Arithmetic on a local Date, not "minus 86400000": that crosses a DST boundary correctly and
  // lands on the calendar day the farmer would call yesterday.
  const y = new Date(now.getTime());
  y.setDate(y.getDate() - 1);
  if (key === localKey(y)) return t("app.notes.day.yesterday");
  return formatShortDate(key, now);
}

/**
 * Notes (newest first, as the endpoint orders them) → day groups, newest day first.
 *
 * Item order inside a bucket is the order received. The day keys are sorted descending as well —
 * a string sort on YYYY-MM-DD is chronological, it costs nothing, and it means a future change to
 * the endpoint's ORDER BY cannot silently scramble the headers. The unknown bucket always ends the
 * list: it has no place on a timeline.
 */
export function groupByDay(items: OrgScoutingNote[], now: Date = new Date()): DayGroup[] {
  const buckets = new Map<string, OrgScoutingNote[]>();
  for (const it of items) {
    const key = dayKeyOf(it.observed_at) ?? UNKNOWN_DAY;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(it);
    else buckets.set(key, [it]);
  }
  const keys = Array.from(buckets.keys())
    .filter((k) => k !== UNKNOWN_DAY)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  if (buckets.has(UNKNOWN_DAY)) keys.push(UNKNOWN_DAY);
  return keys.map((k) => ({ key: k, label: dayLabel(k, now), items: buckets.get(k) ?? [] }));
}
