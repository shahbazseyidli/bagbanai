"use client";

// MOCK-app-today-weatherbar — the approved mockup's .weatherbar at the top of "Bu gün".
//
// REAL DATA ONLY, from the two sources the product already ships:
//   • temperature + condition — keyless Open-Meteo `current` at the FIELD CENTROID (exactly the
//     source the public landing hero already uses, so no new dependency/secret).
//   • spray chip — GET /api/fields/{id}/rain-nowcast (A4, routers/nowcast.py). That endpoint is the
//     one that already answers "can I spray right now" and returns {available:false} whenever
//     Open-Meteo is unreachable or the block is empty.
//
// Anything that does not arrive is OMITTED: no placeholder temperature, no invented condition, no
// spray verdict without a nowcast. If nothing arrives, the whole bar renders nothing.
import { useEffect, useState } from "react";
import {
  Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, SprayCan, Sun, Thermometer,
} from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

interface Current {
  temp: number;
  code: number | null;
}

/** Subset of GET /api/fields/{id}/rain-nowcast we render (see routers/nowcast.py). */
interface Nowcast {
  available: boolean;
  verdict?: string;
  rain_expected?: boolean;
  spray_safe?: boolean;
  minutes_to_rain?: number | null;
  window_minutes?: number;
}

/** WMO weather code → short localized description (same mapping as the landing hero). */
function wmoDesc(code: number): string {
  if (code === 0) return t("wmo.clear");
  if (code <= 3) return t("wmo.partly");
  if (code <= 48) return t("wmo.fog");
  if (code <= 67) return t("wmo.rain");
  if (code <= 77) return t("wmo.snow");
  if (code <= 82) return t("wmo.shower");
  return t("wmo.storm");
}

function WmoIcon({ code }: { code: number | null }) {
  const cls = "h-7 w-7 shrink-0";
  if (code == null) return <Thermometer className={`${cls} text-sky-600`} aria-hidden="true" />;
  if (code === 0) return <Sun className={`${cls} text-amber-500`} aria-hidden="true" />;
  if (code <= 3) return <CloudSun className={`${cls} text-amber-500`} aria-hidden="true" />;
  if (code <= 48) return <CloudFog className={`${cls} text-slate-400`} aria-hidden="true" />;
  if (code <= 67) return <CloudRain className={`${cls} text-sky-600`} aria-hidden="true" />;
  if (code <= 77) return <CloudSnow className={`${cls} text-sky-400`} aria-hidden="true" />;
  if (code <= 82) return <CloudRain className={`${cls} text-sky-600`} aria-hidden="true" />;
  if (code <= 99) return <CloudLightning className={`${cls} text-violet-500`} aria-hidden="true" />;
  return <Cloud className={`${cls} text-slate-400`} aria-hidden="true" />;
}

/** Chip copy straight off the nowcast's own numbers — never a guess about wind/temperature. */
function sprayChip(n: Nowcast): { label: string; warn: boolean } {
  if (n.rain_expected) {
    const m = n.minutes_to_rain;
    if (m == null || m <= 0) return { label: "Çiləmə: hazırda yağış var", warn: true };
    return { label: `Çiləmə: ${m} dəqiqəyə yağış`, warn: true };
  }
  const mins = n.window_minutes ?? 120;
  const span = mins % 60 === 0 ? `${mins / 60} saat` : `${mins} dəqiqə`;
  return { label: `Çiləmə: yaxın ${span} yağışsız`, warn: false };
}

export default function WeatherBar({
  lat,
  lon,
  placeLabel,
  fieldId,
}: {
  lat: number;
  lon: number;
  placeLabel: string;
  fieldId?: string;
}) {
  const [cur, setCur] = useState<Current | null>(null);
  const [now, setNow] = useState<Nowcast | null>(null);

  // Current conditions at the field centroid (third-party, keyless, best-effort).
  useEffect(() => {
    let active = true;
    setCur(null);
    (async () => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
        );
        const d = await r.json();
        const temp = d?.current?.temperature_2m;
        const code = d?.current?.weather_code;
        if (active && typeof temp === "number") {
          setCur({ temp: Math.round(temp), code: typeof code === "number" ? code : null });
        }
      } catch {
        /* weather is a bonus — the screen never depends on it */
      }
    })();
    return () => { active = false; };
  }, [lat, lon]);

  // Spray window for the same field (same-origin, org-gated, degrades to available:false).
  useEffect(() => {
    if (!fieldId) { setNow(null); return; }
    let active = true;
    setNow(null);
    api
      .get<Nowcast>(`/api/fields/${fieldId}/rain-nowcast?window=120`)
      .then((n) => { if (active && n && n.available) setNow(n); })
      .catch(() => { /* the chip simply does not render */ });
    return () => { active = false; };
  }, [fieldId]);

  if (!cur && !now) return null;
  const chip = now ? sprayChip(now) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl2 border border-sky-100 bg-gradient-to-r from-sky-50 to-white px-4 py-3">
      {cur && (
        <>
          <WmoIcon code={cur.code} />
          <span className="text-[26px] font-bold leading-none text-slate-900 tabular-nums">
            {cur.temp}°
          </span>
          <span className="min-w-0 truncate text-sm text-slate-500">
            {placeLabel}
            {cur.code != null ? ` · ${wmoDesc(cur.code)}` : ""}
          </span>
        </>
      )}
      {chip && (
        <span
          title={now?.verdict}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${
            chip.warn ? "bg-warn-tint text-warn" : "bg-good-tint text-good"
          }`}
        >
          <SprayCan className="h-4 w-4 shrink-0" aria-hidden="true" />
          {chip.label}
        </span>
      )}
    </div>
  );
}
