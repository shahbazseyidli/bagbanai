"use client";

// Date rendering for the "Bu gün" home. Lifted out of TodayHome unchanged (azDate/formatToday) so
// the KPI tiles can format a scene date without importing the whole screen, plus one addition:
// formatShortDate, for the "son peyk görüntüsü" tile.
//
// NO Date IS CONSTRUCTED FROM AN API DATE STRING HERE. `new Date("2026-07-11")` is parsed as UTC
// midnight and then rendered in the viewer's zone, so anywhere west of Greenwich the tile would say
// the 10th — a satellite scene dated one day earlier than the satellite actually flew. The API sends
// a PostgreSQL `date` column through .isoformat() (services/app/ai/context.py, grep "latest_date"),
// i.e. a plain calendar day with no time and no zone, so the honest thing is to read the three
// numbers out of the string and never let a timezone touch them.
//
// Client-only, like every other t() caller: the month names come from the active dictionary.
import { tf, type Locale } from "@/lib/i18n";

const AZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
];
const AZ_WEEKDAYS = [
  "bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə",
];

export function azDate(d: Date): string {
  const s = `${AZ_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${AZ_MONTHS[d.getMonth()]}`;
  return s.charAt(0).toLocaleUpperCase("az") + s.slice(1);
}

/** Localized "weekday, day month" — manual AZ arrays (reliable), Intl for the other locales. */
export function formatToday(d: Date, locale: Locale): string {
  if (locale === "az") return azDate(d);
  try {
    const s = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return azDate(d);
  }
}

/**
 * "2026-07-11" → "11 iyl" (or "11 iyl 2025" when the year is not the current one).
 *
 * The month names are the dictionary's own short list, the same source lib/wellnessText.ts uses for
 * frost dates (grep "app.date.monthsShort") — NOT Intl, because Intl's Azerbaijani short months are
 * not guaranteed to be present in every runtime's ICU build and would silently fall back to English
 * on exactly the default locale.
 *
 * The year is appended only when it differs from today's: a scene from this season needs no year,
 * but an org whose newest scene is from last summer must not read as if it arrived last week.
 * Returns the input untouched when it is not a YYYY-MM-DD string, so a format change upstream shows
 * up as a visibly raw date rather than as a wrong one.
 */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return iso;
  const name = (tf("app.date.monthsShort").split(",")[month - 1] ?? "").trim();
  if (!name) return iso;
  return year === now.getFullYear() ? `${day} ${name}` : `${day} ${name} ${year}`;
}
