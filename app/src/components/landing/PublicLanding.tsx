"use client";

// D3.1 — public landing map. Value BEFORE account: an anonymous visitor searches their village,
// taps their field, and sees its boundary + area on live satellite imagery — no signup required.
// A single strong CTA carries the drawn field into signup (localStorage draft → onboarding prefill).
// Reuses DrawMap (satellite basemap + Nominatim search + geolocate + tap-to-detect); the tap hits
// the public, read-only /api/geo/segment-public (nothing is written).
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, Sparkles, Loader2, ArrowRight, Hand, Thermometer } from "lucide-react";
import { area as turfArea } from "@turf/turf";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Polygon } from "@/lib/types";

// Lazy-load the map (MapLibre is heavy) so it stays out of the landing's initial bundle (D4.5).
const DrawMap = dynamic(() => import("@/components/FieldMap").then((m) => m.DrawMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200" />,
});

const DRAFT_KEY = "bagban_draft_field";

/** WMO weather code → short localized description. */
function wmoDesc(code: number): string {
  if (code === 0) return t("wmo.clear");
  if (code <= 3) return t("wmo.partly");
  if (code <= 48) return t("wmo.fog");
  if (code <= 67) return t("wmo.rain");
  if (code <= 77) return t("wmo.snow");
  if (code <= 82) return t("wmo.shower");
  return t("wmo.storm");
}

export default function PublicLanding() {
  const router = useRouter();
  const [polygon, setPolygon] = useState<Polygon | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [importSeq, setImportSeq] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [hint, setHint] = useState<string>("");
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);

  // Live current weather at the field centroid — keyless Open-Meteo, best-effort (D3.2 instant value).
  async function loadWeather(p: Polygon) {
    try {
      const ring = p.coordinates[0] ?? [];
      if (!ring.length) return;
      const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
      );
      const d = await r.json();
      const t = d?.current?.temperature_2m;
      if (typeof t === "number") setWeather({ temp: Math.round(t), desc: wmoDesc(d.current.weather_code) });
    } catch {
      /* weather is a bonus, never blocks */
    }
  }

  function onPolygon(p: Polygon | null) {
    setPolygon(p);
    if (p) {
      const m2 = turfArea({ type: "Feature", geometry: p, properties: {} } as GeoJSON.Feature);
      setAreaHa(m2 / 10000);
      loadWeather(p);
    } else {
      setAreaHa(null);
      setWeather(null);
    }
  }

  async function onDetect(lng: number, lat: number) {
    setDetecting(true);
    setHint("");
    try {
      const d = await api.post<{ ok: boolean; polygon?: Polygon; reason?: string }>(
        "/api/geo/segment-public",
        { lon: lng, lat: lat },
      );
      if (d.ok && d.polygon) {
        onPolygon(d.polygon);
        setImportSeq((s) => s + 1);
      } else {
        setHint(t("landing.detectFail"));
      }
    } catch {
      setHint(t("landing.detectFail2"));
    } finally {
      setDetecting(false);
    }
  }

  function startTracking() {
    if (polygon) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ polygon, area_ha: areaHa }));
      } catch {
        /* private mode — draft is a nicety, not required */
      }
    }
    router.push("/signup");
  }

  const detected = polygon != null;

  return (
    <section className="relative -mx-4 -mt-6 h-[82vh] min-h-[560px] overflow-hidden md:mx-0 md:mt-0 md:rounded-2xl md:border-[1.5px] md:border-slate-200">
      <div className="absolute inset-0">
        <DrawMap
          onPolygon={onPolygon}
          importedPolygon={polygon}
          importSeq={importSeq}
          detectMode
          onDetect={onDetect}
        />
      </div>

      {/* Headline chip — top, non-blocking */}
      {!detected && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[5] flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-2xl bg-white/95 px-4 py-3 text-center shadow-lg ring-1 ring-slate-200 backdrop-blur">
            <p className="flex items-center justify-center gap-2 text-base font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-emerald-600" /> {t("landing.map.title")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {t("landing.map.sub")}
            </p>
          </div>
        </div>
      )}

      {/* Detecting overlay */}
      {detecting && (
        <div className="absolute inset-0 z-[6] flex items-center justify-center bg-slate-900/20">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> {t("landing.detecting")}
          </div>
        </div>
      )}

      {/* Value + CTA — bottom sheet card */}
      <div className="absolute inset-x-0 bottom-0 z-[7] p-3 sm:p-4">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-[0_-6px_24px_rgba(0,0,0,0.14)] ring-1 ring-slate-200">
          {detected ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("landing.yourField")}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {areaHa != null ? areaHa.toFixed(2) : "—"} <span className="text-base font-semibold text-slate-500">ha</span>
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
              {weather && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
                    <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                    {weather.temp}°C · {weather.desc}
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-600">
                {t("landing.ctaValue")}
              </p>
              <button
                onClick={startTracking}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
              >
                {t("landing.ctaStart")} <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => { onPolygon(null); setImportSeq((s) => s + 1); }}
                className="mt-2 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                {t("landing.otherField")}
              </button>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Hand className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{t("landing.tapTitle")}</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {hint || t("landing.tapHint")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
