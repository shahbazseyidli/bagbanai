"use client";

// The selected field's own forecast: now, the next 24 hours, the next 7 days.
//
// SOURCE — the keyless Open-Meteo `forecast` endpoint at the FIELD CENTROID, which is exactly the
// call components/home/WeatherBar and the public landing hero already make, widened to hourly and
// daily. No new dependency, no new secret, no backend change: I read every router first and there is
// no hourly/daily endpoint of ours to use instead — only rain-nowcast, frost-dates, weather/yearly
// and rain exist, and none of them answers "what is the temperature this afternoon".
//
// NOTHING HERE IS INVENTED. A variable Open-Meteo omits renders an em-dash carrying the reason as a
// tooltip; a block whose whole array is missing is omitted rather than zero-filled; and if the
// request fails outright the component says so in one line instead of drawing an empty chart.
//
// TIMEZONES. The request asks for timezone=auto, so every timestamp comes back as the FIELD's local
// wall clock with no offset attached ("2026-07-28T14:00"). Building a Date from that string would
// reinterpret it in the VIEWER's zone — a farmer checking his Lənkəran field from Berlin would be
// told the rain arrives two hours early. So hours are read straight out of the string, and "now" is
// found by comparing against `current.time`, which is in the very same clock. The only Date built
// here is for a DAY name, from three integers, which no timezone can shift.
import { useEffect, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { getLocale, t } from "@/lib/i18n";

/** The subset of the Open-Meteo response this panel reads. Everything is optional because a partial
 *  response is normal and must degrade per-block, not blank the panel. */
interface Forecast {
  current?: {
    time?: string;
    temperature_2m?: number | null;
    weather_code?: number | null;
    precipitation?: number | null;
    wind_speed_10m?: number | null;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation?: (number | null)[];
    precipitation_probability?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    weather_code?: (number | null)[];
  };
  daily?: {
    time?: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
  };
}

/** How many hourly steps the strip shows. One day, which is the horizon a spraying or irrigation
 *  decision is actually made over. */
const HOURS = 24;

/** WMO weather code → short localized description. Identical mapping to WeatherBar's, deliberately:
 *  two screens in one product must not describe the same sky in two vocabularies. */
function wmoDesc(code: number): string {
  if (code === 0) return t("wmo.clear");
  if (code <= 3) return t("wmo.partly");
  if (code <= 48) return t("wmo.fog");
  if (code <= 67) return t("wmo.rain");
  if (code <= 77) return t("wmo.snow");
  if (code <= 82) return t("wmo.shower");
  return t("wmo.storm");
}

function WmoIcon({ code, className }: { code: number | null; className: string }) {
  if (code == null) return <Thermometer className={className} aria-hidden="true" />;
  if (code === 0) return <Sun className={className} aria-hidden="true" />;
  if (code <= 3) return <CloudSun className={className} aria-hidden="true" />;
  if (code <= 48) return <CloudFog className={className} aria-hidden="true" />;
  if (code <= 67) return <CloudRain className={className} aria-hidden="true" />;
  if (code <= 77) return <CloudSnow className={className} aria-hidden="true" />;
  if (code <= 82) return <CloudRain className={className} aria-hidden="true" />;
  if (code <= 99) return <CloudLightning className={className} aria-hidden="true" />;
  return <Cloud className={className} aria-hidden="true" />;
}

/** The one place a missing reading is rendered — an em-dash that explains itself on hover, never a
 *  zero and never a blank cell that could be mistaken for "nothing happening". */
function Dash() {
  return (
    <span className="text-ink-soft" title={t("app.weather.field.noReading")}>
      —
    </span>
  );
}

function num(v: number | null | undefined, digits: number, suffix: string) {
  if (typeof v !== "number" || !Number.isFinite(v)) return <Dash />;
  return (
    <>
      {v.toFixed(digits)}
      {suffix}
    </>
  );
}

/** "2026-07-28T14:00" → "14:00", read out of the string. See the timezone note in the file header. */
function hourOf(ts: string | undefined): string {
  return ts && ts.length >= 16 ? ts.slice(11, 16) : "—";
}

/** "2026-07-28" → the localized short weekday. Built from three integers so no timezone can move
 *  the calendar day (the same trap components/home/homeDate documents). */
function dayName(ts: string | undefined, todayIso: string | undefined): string {
  if (!ts || ts.length < 10) return "—";
  if (todayIso && ts.slice(0, 10) === todayIso.slice(0, 10)) return t("app.notes.day.today");
  const y = Number(ts.slice(0, 4));
  const m = Number(ts.slice(5, 7));
  const d = Number(ts.slice(8, 10));
  if (!Number.isFinite(y) || !m || !d) return "—";
  try {
    return new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(new Date(y, m - 1, d));
  } catch {
    return `${d}.${m}`;
  }
}

export default function FieldForecast({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<Forecast | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setFailed(false);
    (async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code,precipitation,wind_speed_10m` +
          `&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
          `&timezone=auto&forecast_days=7`;
        const r = await fetch(url);
        const d: Forecast = await r.json();
        if (active) setData(d);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [lat, lon]);

  if (failed) {
    return <p className="text-[13px] text-ink-soft">{t("app.weather.field.unavailable")}</p>;
  }
  if (!data) return null;

  const cur = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  // The first hourly step at or after the current hour. Both strings are the field's own clock, so
  // a plain lexicographic comparison of two identically-shaped ISO strings is exact.
  const times = hourly?.time ?? [];
  const nowTs = cur?.time ?? "";
  let start = times.findIndex((x) => typeof x === "string" && x >= nowTs);
  if (start < 0) start = 0;
  const hourIdx: number[] = [];
  for (let i = start; i < Math.min(times.length, start + HOURS); i += 1) hourIdx.push(i);

  const dayTimes = daily?.time ?? [];

  const hasCurrent = cur != null && typeof cur.temperature_2m === "number";
  const hasHourly = hourIdx.length > 0;
  const hasDaily = dayTimes.length > 0;
  // Every block empty means Open-Meteo answered with nothing usable — say that once rather than
  // stacking three empty headings.
  if (!hasCurrent && !hasHourly && !hasDaily) {
    return <p className="text-[13px] text-ink-soft">{t("app.weather.field.unavailable")}</p>;
  }

  return (
    <div className="space-y-4">
      {hasCurrent && cur && (
        <div>
          <h3 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t("app.weather.field.currentHeading")}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <WmoIcon code={cur.weather_code ?? null} className="h-8 w-8 shrink-0 text-grass-deep" />
            <span className="font-display text-[26px] font-extrabold leading-none tabular-nums text-ink">
              {num(cur.temperature_2m, 0, "°")}
            </span>
            {cur.weather_code != null && (
              <span className="text-[13px] text-ink-soft">{wmoDesc(cur.weather_code)}</span>
            )}
            <span className="ml-auto flex items-center gap-1 text-[12.5px] tabular-nums text-ink-soft">
              <Wind className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{t("app.weather.field.windLabel")}</span>
              {num(cur.wind_speed_10m, 0, ` ${t("app.weather.unit.windSpeed")}`)}
            </span>
            <span className="flex items-center gap-1 text-[12.5px] tabular-nums text-ink-soft">
              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{t("app.weather.field.precipLabel")}</span>
              {num(cur.precipitation, 1, " mm")}
            </span>
          </div>
        </div>
      )}

      {hasHourly && (
        <div>
          <h3 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t("app.weather.field.hourlyHeading")}
          </h3>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {hourIdx.map((i) => (
              <div
                key={times[i]}
                className="min-w-[62px] shrink-0 rounded-[10px] border-[1.5px] border-line bg-panel px-1.5 py-1.5 text-center"
              >
                <b className="block text-[11.5px] font-bold tabular-nums text-ink">
                  {hourOf(times[i])}
                </b>
                <WmoIcon
                  code={hourly?.weather_code?.[i] ?? null}
                  className="mx-auto my-1 h-4 w-4 text-ink-soft"
                />
                <span className="block text-[12px] font-semibold tabular-nums text-ink">
                  {num(hourly?.temperature_2m?.[i], 0, "°")}
                </span>
                <span
                  className="block text-[10.5px] tabular-nums text-ink-soft"
                  title={t("app.weather.field.probLabel")}
                >
                  {num(hourly?.precipitation_probability?.[i], 0, "%")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDaily && (
        <div>
          <h3 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t("app.weather.field.dailyHeading")}
          </h3>
          <ul className="divide-y divide-line">
            {dayTimes.map((d, i) => (
              <li key={d} className="flex items-center gap-2 py-1.5 text-[12.5px]">
                <span className="w-14 shrink-0 font-semibold text-ink">
                  {dayName(d, dayTimes[0])}
                </span>
                <WmoIcon
                  code={daily?.weather_code?.[i] ?? null}
                  className="h-4 w-4 shrink-0 text-ink-soft"
                />
                <span className="tabular-nums text-ink">
                  {num(daily?.temperature_2m_max?.[i], 0, "°")}
                </span>
                <span className="tabular-nums text-ink-soft">
                  {num(daily?.temperature_2m_min?.[i], 0, "°")}
                </span>
                <span
                  className="ml-auto flex items-center gap-1 tabular-nums text-ink-soft"
                  title={t("app.weather.field.precipLabel")}
                >
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                  {num(daily?.precipitation_sum?.[i], 1, " mm")}
                </span>
                <span
                  className="w-10 shrink-0 text-right tabular-nums text-ink-soft"
                  title={t("app.weather.field.probLabel")}
                >
                  {num(daily?.precipitation_probability_max?.[i], 0, "%")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Source credit, same house pattern as the map's. */}
      <p className="text-[10.5px] text-ink-soft">{t("app.weather.field.attribution")}</p>
    </div>
  );
}
