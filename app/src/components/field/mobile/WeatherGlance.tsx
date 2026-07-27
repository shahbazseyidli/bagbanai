"use client";

// Five-day forecast over THIS field — the phone feed's weather block (teardown §3: "Weather
// Forecast → horizontal strip", between the advice and the spraying window).
//
// SOURCE: Open-Meteo's keyless daily endpoint, called from the browser at the field centroid. That
// is the pattern components/home/WeatherBar.tsx already ships for the same reason — our own API has
// no per-field FORECAST endpoint (GET /api/fields/{id}/weather is history, and
// /api/fields/{id}/rain-nowcast is the next two hours, minute by minute). If one is ever added,
// this component should read it instead; nothing else here would change.
//
// NEVER INVENTS A NUMBER. Every figure is a value the response actually carried; anything missing
// renders an em-dash, including inside the screen-reader sentence, and a response with no usable
// day at all renders the "unavailable" line rather than an empty strip under a title. A field whose
// geometry has no usable centroid says so in its own words — that is a different problem with a
// different fix (draw the boundary), so it must not be reported as a weather outage.
import { useEffect, useState } from "react";
import {
  Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Thermometer,
} from "lucide-react";
import { getLocale, t, tf } from "@/lib/i18n";
import type { FieldDetail } from "@/lib/types";

const DAYS = 5;
/** The one stand-in this file allows itself. Never a 0, never a blank. */
const DASH = "—";

interface Day {
  /** ISO date as Open-Meteo returned it; also the React key. */
  date: string;
  code: number | null;
  max: number | null;
  min: number | null;
  mm: number | null;
}

/** Only the shape we read, and every member `unknown`: the guards below do the narrowing. */
interface DailyBlock {
  time?: unknown;
  weather_code?: unknown;
  temperature_2m_max?: unknown;
  temperature_2m_min?: unknown;
  precipitation_sum?: unknown;
}

function numAt(arr: unknown, i: number): number | null {
  if (!Array.isArray(arr)) return null;
  const v: unknown = arr[i];
  // Open-Meteo sends null for a variable it could not model for that day — that is a real answer
  // ("we do not know"), and it must stay distinguishable from 0 mm of rain.
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function strAt(arr: unknown, i: number): string | null {
  if (!Array.isArray(arr)) return null;
  const v: unknown = arr[i];
  return typeof v === "string" && v ? v : null;
}

/** WMO weather code → short localized description. Same mapping as home/WeatherBar (see below). */
function wmoDesc(code: number): string {
  if (code === 0) return t("wmo.clear");
  if (code <= 3) return t("wmo.partly");
  if (code <= 48) return t("wmo.fog");
  if (code <= 67) return t("wmo.rain");
  if (code <= 77) return t("wmo.snow");
  if (code <= 82) return t("wmo.shower");
  return t("wmo.storm");
}

// Duplicated from components/home/WeatherBar.tsx (grep `function WmoIcon` there), which this pass
// does not own. The i18n keys are shared, so there is no translation debt — only two copies of a
// nine-line ladder. Worth extracting to lib/ the moment a third caller appears.
function WmoIcon({ code }: { code: number | null }) {
  const cls = "mx-auto h-5 w-5";
  if (code == null) return <Thermometer className={`${cls} text-ink-soft`} aria-hidden="true" />;
  if (code === 0) return <Sun className={`${cls} text-amber-500`} aria-hidden="true" />;
  if (code <= 3) return <CloudSun className={`${cls} text-amber-500`} aria-hidden="true" />;
  if (code <= 48) return <CloudFog className={`${cls} text-slate-400`} aria-hidden="true" />;
  if (code <= 67) return <CloudRain className={`${cls} text-sky-600`} aria-hidden="true" />;
  if (code <= 77) return <CloudSnow className={`${cls} text-sky-400`} aria-hidden="true" />;
  if (code <= 82) return <CloudRain className={`${cls} text-sky-600`} aria-hidden="true" />;
  if (code <= 99) return <CloudLightning className={`${cls} text-violet-500`} aria-hidden="true" />;
  return <Cloud className={`${cls} text-slate-400`} aria-hidden="true" />;
}

/**
 * Where to ask about the weather. Centroid first (PostGIS computed it), then the mean of the outer
 * ring — good enough to ask "what is the sky doing over there", and the same fallback ladder
 * home/TodayHome uses (grep `function pointOf`).
 */
function pointOf(field: FieldDetail): { lat: number; lon: number } | null {
  const c = field.centroid?.coordinates;
  if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
    return { lon: c[0], lat: c[1] };
  }
  const ring = field.geom?.coordinates?.[0];
  if (Array.isArray(ring) && ring.length > 0) {
    let lon = 0;
    let lat = 0;
    let n = 0;
    for (const p of ring) {
      if (typeof p?.[0] === "number" && typeof p?.[1] === "number") {
        lon += p[0];
        lat += p[1];
        n += 1;
      }
    }
    if (n > 0) return { lon: lon / n, lat: lat / n };
  }
  return null;
}

/** "Bu gün" for index 0, otherwise the locale's short weekday. Falls back to the raw ISO date. */
function dayLabel(iso: string, i: number): string {
  if (i === 0) return t("app.field.weatherGlance.today");
  try {
    // Midday, not midnight: a date-only string parsed as UTC can land on the previous day west of
    // Greenwich, and this product's users are east of it — but the same class of bug either way.
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(d);
  } catch {
    return iso;
  }
}

function temp(v: number | null): string {
  return v == null ? DASH : `${Math.round(v)}°`;
}

function mmText(v: number | null): string {
  return v == null ? DASH : `${v.toFixed(1)} mm`;
}

/**
 * The BARE figure for the screen-reader sentence. app.field.weatherGlance.dayAria already carries
 * the "°" and the " mm" in its own template — feeding it temp()/mmText() would read "24°°".
 */
function ariaNum(v: number | null, digits = 0): string {
  return v == null ? DASH : v.toFixed(digits);
}

export default function WeatherGlance({ field }: { field: FieldDetail }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [failed, setFailed] = useState(false);

  const point = pointOf(field);
  const lat = point?.lat ?? null;
  const lon = point?.lon ?? null;

  useEffect(() => {
    if (lat == null || lon == null) return;
    let active = true;
    setDays(null);
    setFailed(false);
    (async () => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
            `&timezone=auto&forecast_days=${DAYS}`,
        );
        const body = (await r.json()) as { daily?: DailyBlock } | null;
        const d: DailyBlock = body?.daily ?? {};
        const times: unknown[] = Array.isArray(d.time) ? d.time : [];
        const out: Day[] = [];
        for (let i = 0; i < times.length && out.length < DAYS; i += 1) {
          const date = strAt(d.time, i);
          // A row with no date cannot be labelled or keyed, so it is dropped rather than guessed at.
          if (!date) continue;
          out.push({
            date,
            code: numAt(d.weather_code, i),
            max: numAt(d.temperature_2m_max, i),
            min: numAt(d.temperature_2m_min, i),
            mm: numAt(d.precipitation_sum, i),
          });
        }
        if (!active) return;
        if (out.length === 0) setFailed(true);
        else setDays(out);
      } catch {
        // Third-party, keyless, no retry: the block says so instead of pretending to load forever.
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [lat, lon]);

  if (lat == null || lon == null) {
    return (
      <p className="rounded-xl border border-line bg-panel px-3 py-2.5 text-[13px] text-ink-soft">
        {t("app.field.weatherGlance.noCoords")}
      </p>
    );
  }

  if (failed) {
    return (
      <p className="rounded-xl border border-line bg-panel px-3 py-2.5 text-[13px] text-ink-soft">
        {t("app.field.weatherGlance.unavailable")}
      </p>
    );
  }

  if (!days) {
    return <div className="h-[104px] animate-pulse rounded-xl bg-paper-2" aria-hidden="true" />;
  }

  return (
    <div className="rounded-xl border border-line bg-panel px-2 py-2.5">
      <ul className="grid grid-cols-5 gap-1">
        {days.map((day, i) => (
          <li key={day.date} className="rounded-[10px] bg-paper-2/70 px-1 py-2">
            {/* The card's visible text is four fragments; the sentence a screen reader needs is
                assembled once, here, with the same em-dashes the eye sees. */}
            <span className="sr-only">
              {tf("app.field.weatherGlance.dayAria", {
                day: dayLabel(day.date, i),
                max: ariaNum(day.max),
                min: ariaNum(day.min),
                mm: ariaNum(day.mm, 1),
              })}
            </span>
            <div aria-hidden="true" className="text-center">
              <span className="block truncate text-[11px] font-bold text-ink-soft">
                {dayLabel(day.date, i)}
              </span>
              <span className="mt-1 block" title={day.code == null ? undefined : wmoDesc(day.code)}>
                <WmoIcon code={day.code} />
              </span>
              <span className="mt-1 block text-[13.5px] font-extrabold leading-none tabular-nums text-ink">
                {temp(day.max)}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-none tabular-nums text-ink-soft">
                {temp(day.min)}
              </span>
              <span className="mt-1.5 block text-[10.5px] leading-none tabular-nums text-sky-700">
                {mmText(day.mm)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {/* Names the bottom row (mm) and credits the third party the figures came from — neither is
          decoration: without the first the number is unlabelled, without the second the reader
          cannot tell our model from someone else's. */}
      <p className="mt-2 px-1 text-[10.5px] text-ink-soft">
        {t("app.field.weatherGlance.precip")} · {t("app.field.weatherGlance.source")}
      </p>
    </div>
  );
}
