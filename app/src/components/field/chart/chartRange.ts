"use client";

// Time arithmetic for the index chart panel.
//
// EVERY date in this file is handled in UTC. The API returns bare `YYYY-MM-DD` (a Postgres date
// column through .isoformat()), and `new Date("2026-07-27")` is parsed as UTC midnight but read
// back with LOCAL getters — so west of Greenwich every scene would be printed as the day before.
// Parsing the string by hand and formatting with the UTC accessors removes the whole class of bug.
//
// "Today" is the exception, and deliberately so: it is taken from the farmer's LOCAL calendar day
// and then expressed on the same UTC-midnight grid as the scene dates, so the vertical marker lands
// where the reader's own date would.

import { t, tf } from "@/lib/i18n";

export const DAY_MS = 86_400_000;

export type RangeKey = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

/** Left-to-right order of the segmented control. */
export const RANGES: RangeKey[] = ["1w", "1m", "3m", "6m", "1y", "all"];

// Calendar months are not fixed-length, so the windows are stated in days on purpose: the control
// is a zoom level, not a calendar query, and "3 months back" only has to be the same width every
// time it is pressed.
const RANGE_DAYS: Record<Exclude<RangeKey, "all">, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 91,
  "6m": 182,
  "1y": 365,
};

export const RANGE_LABEL_KEY: Record<RangeKey, string> = {
  "1w": "app.field.chart.range.1w",
  "1m": "app.field.chart.range.1m",
  "3m": "app.field.chart.range.3m",
  "6m": "app.field.chart.range.6m",
  "1y": "app.field.chart.range.1y",
  all: "app.field.chart.range.all",
};

/** `YYYY-MM-DD…` → UTC-midnight epoch ms, or null for anything that is not a date. */
export function tsOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : null;
}

/** The farmer's local calendar day, expressed on the scenes' UTC-midnight grid. */
export function todayTs(): number {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * How much of the FUTURE a bounded range is willing to spend on the forecast: a quarter of its own
 * span. The forecast reaches up to 60 days out (services/app/ai/forecast.py, OWN_HORIZON_DAYS), and
 * a fixed tail would swallow the short ranges whole — 60 days of projection beside 7 days of data
 * is not a week view. A proportional tail keeps "1Y" looking like a season with a projection on the
 * end, and keeps "1W" about the week.
 */
const FORECAST_SHARE = 0.25;

/**
 * The window a range key resolves to, given the data actually present.
 *
 * `maxMeasuredTs` is the last REAL observation; `maxTs` is the last row of any kind, which includes
 * the forecast. The distinction is load-bearing and was a live bug: anchoring the window on `maxTs`
 * measured every range back from the forecast HORIZON, so with a projection on screen the "1W"
 * window covered seven days that were entirely in the future, contained no measurement, and the
 * button disabled itself. The anchor is therefore the last measurement (or today, whichever is
 * later — a six-week-old scene must not let the axis stop six weeks ago and hide the gap).
 *
 * The START of "all" is the oldest measurement — that is what "all" means.
 */
export function windowOf(
  range: RangeKey,
  minTs: number,
  maxTs: number,
  today: number,
  maxMeasuredTs?: number,
): [number, number] {
  // "All" means all, forecast included.
  if (range === "all") {
    const end = Math.max(maxTs, today);
    return [Math.min(minTs, end - DAY_MS), end];
  }
  const span = RANGE_DAYS[range] * DAY_MS;
  const anchor = Math.max(maxMeasuredTs ?? maxTs, today);
  // Never past the data: with no forecast, `maxTs` is the anchor and the window ends at "now".
  const end = Math.min(Math.max(maxTs, today), anchor + span * FORECAST_SHARE);
  return [anchor - span, end];
}

export type TickMode = "day" | "month";

export interface Axis {
  ticks: number[];
  mode: TickMode;
}

function stepTicks(fromMs: number, toMs: number, step: number): number[] {
  const out: number[] = [];
  // Anchored at the RIGHT edge and walked backwards: the newest date is the one the reader is
  // looking for, so it gets a label even when the span is not a whole number of steps.
  for (let ts = toMs; ts >= fromMs && out.length < 9; ts -= step) out.push(ts);
  return out.reverse();
}

function monthTicks(fromMs: number, toMs: number, everyN: number): number[] {
  const out: number[] = [];
  const start = new Date(fromMs);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  // First month boundary at or after `from`.
  if (start.getUTCDate() > 1) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  while (out.length < 9) {
    const ts = Date.UTC(y, m, 1);
    if (ts > toMs) break;
    out.push(ts);
    m += everyN;
    while (m > 11) { m -= 12; y += 1; }
  }
  return out;
}

/**
 * Up to ~8 labels, at a granularity the span can carry.
 *
 * The 14-day rung exists for the 3-month window, which is the default: month boundaries would give
 * it three labels for ninety days of data, and weekly would give it thirteen.
 */
export function ticksFor(fromMs: number, toMs: number): Axis {
  const days = Math.max(1, (toMs - fromMs) / DAY_MS);
  if (days <= 16) return { ticks: stepTicks(fromMs, toMs, 2 * DAY_MS), mode: "day" };
  if (days <= 63) return { ticks: stepTicks(fromMs, toMs, 7 * DAY_MS), mode: "day" };
  if (days <= 120) return { ticks: stepTicks(fromMs, toMs, 14 * DAY_MS), mode: "day" };
  if (days <= 200) return { ticks: monthTicks(fromMs, toMs, 1), mode: "month" };
  if (days <= 400) return { ticks: monthTicks(fromMs, toMs, 2), mode: "month" };
  return { ticks: monthTicks(fromMs, toMs, 3), mode: "month" };
}

/**
 * The locale's short month names. Read at CALL time, never frozen at module level: a const would
 * capture whichever locale happened to load first (the sensorMeta() rule). Falls back to the month
 * number rather than to another language when a locale's list is short or malformed.
 */
function monthName(monthIdx: number): string {
  const parts = t("app.date.monthsShort").split(",");
  return (parts[monthIdx] || "").trim() || String(monthIdx + 1);
}

/** "27 iyl 2026" — the template and the token order belong to the locale (app.field.chart.dateLong). */
export function fmtDate(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  return tf("app.field.chart.dateLong", {
    d: d.getUTCDate(),
    mon: monthName(d.getUTCMonth()),
    y: d.getUTCFullYear(),
  });
}

/** Axis tick text. Month mode drops the day AND the year — the resolved range above the chart
 *  carries the years, exactly once, instead of repeating them across eight ticks. */
export function fmtTick(ms: number, mode: TickMode): string {
  const d = new Date(ms);
  const mon = monthName(d.getUTCMonth());
  return mode === "month" ? mon : `${d.getUTCDate()} ${mon}`;
}
