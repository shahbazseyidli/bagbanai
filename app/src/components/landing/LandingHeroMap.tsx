"use client";

// W2 / E12 — the landing hero visual, re-skinned to the approved redesign (artifact c5e155e7).
//
// The mockup fakes a map with CSS. The real product has a much better one, so the FRAME is the
// only thing that changed: an anonymous visitor still searches their village, taps their field and
// gets (1) the detected boundary, (2) its area, (3) a REAL NDVI reading from the latest scene
// (A11) and (4) live weather — all before any account exists. The drawn field is stashed in
// localStorage and carried into /signup → onboarding prefill. Do not remove that flow: it is the
// product's strongest hook.
//
// Map-corner note: DrawMap already owns all four corners (draw toolbar top-left, zoom/geolocate
// top-right, basemap picker bottom-left, coordinate bar bottom-right), so the mockup's floating
// legend / AI chip live in the panel strip UNDER the map instead of on top of it.
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowRight, Hand, Layers, Leaf, Loader2, Sparkles, Thermometer } from "lucide-react";
import { area as turfArea } from "@turf/turf";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Polygon } from "@/lib/types";

// Lazy-load the map (MapLibre is heavy) so it stays out of the landing's initial bundle (D4.5).
const DrawMap = dynamic(() => import("@/components/FieldMap").then((m) => m.DrawMap), {
  ssr: false,
  loading: () => <div className="h-[368px] w-full animate-pulse rounded-lg bg-panel-2" />,
});

const DRAFT_KEY = "bagban_draft_field";

/** A11 — plain-Azerbaijani verdict for a raw NDVI reading (same bands as the in-app labels). */
function ndviVerdict(v: number): string {
  if (v < 0.2) return "çılpaq/zəif";
  if (v < 0.4) return "seyrək";
  if (v < 0.6) return "orta";
  return "sağlam bitki";
}

/** The mockup's "AI chip" — here it is a real sentence derived from the real reading. */
function ndviAdvice(v: number): string {
  if (v < 0.2)
    return "Bitki örtüyü çox zəifdir — torpaq açıq və ya əkin yenidir. İzləməyə başla, AI aqronom səbəbi araşdırsın.";
  if (v < 0.4)
    return "Seyrək örtük — su və ya qida çatışmazlığı ola bilər. İzləməyə başla ki, hər 2-3 gündə dəyişimi görəsən.";
  if (v < 0.6)
    return "Orta sağlamlıq — sahə daxilində zəif zonalar ola bilər. AI aqronom zonaları ayırıb tövsiyə verir.";
  return "Bitki örtüyü sağlamdır. İzləməyə başla ki, stress yayılmadan xəbərdarlıq alasan.";
}

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

export default function LandingHeroMap() {
  const router = useRouter();
  const [polygon, setPolygon] = useState<Polygon | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [importSeq, setImportSeq] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [hint, setHint] = useState<string>("");
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);
  // A11 — a REAL satellite reading for the polygon the visitor just drew, before signup.
  const [ndvi, setNdvi] = useState<{ ndvi: number; acquired_at?: string | null } | null>(null);
  const [ndviBusy, setNdviBusy] = useState(false);

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
      const temp = d?.current?.temperature_2m;
      if (typeof temp === "number")
        setWeather({ temp: Math.round(temp), desc: wmoDesc(d.current.weather_code) });
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
      void loadNdvi(p);
    } else {
      setAreaHa(null);
      setWeather(null);
      setNdvi(null);
    }
  }

  async function loadNdvi(p: Polygon) {
    setNdvi(null);
    setNdviBusy(true);
    try {
      const d = await api.post<{ ok: boolean; ndvi?: number; acquired_at?: string | null }>(
        "/api/geo/ndvi-public",
        { polygon: p },
      );
      if (d.ok && typeof d.ndvi === "number") setNdvi({ ndvi: d.ndvi, acquired_at: d.acquired_at });
    } catch {
      /* the real reading is a bonus — never block the landing flow */
    } finally {
      setNdviBusy(false);
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
  // Where the reading sits on the -0.1 … 0.9 NDVI ramp used by the legend.
  const ndviPct = ndvi ? Math.min(100, Math.max(0, ((ndvi.ndvi + 0.1) / 1.0) * 100)) : 0;

  return (
    <div className="lp-frame mx-auto w-full max-w-[980px] overflow-hidden rounded-[24px] border border-line-2 bg-panel">
      {/* browser chrome — the mockup's framing device */}
      <div className="flex h-[34px] items-center gap-1.5 bg-[#0e2a22] px-3">
        <i className="block h-[9px] w-[9px] rounded-full bg-[#3d5a4d]" />
        <i className="block h-[9px] w-[9px] rounded-full bg-[#3d5a4d]" />
        <i className="block h-[9px] w-[9px] rounded-full bg-[#3d5a4d]" />
        <span className="ml-2 rounded-md bg-[#0a201a] px-3 py-[3px] text-[11px] text-[#7fae98]">
          app.agradex.com
        </span>
      </div>

      {/* map stage — real MapLibre, real tap-to-detect */}
      <div className="relative bg-panel-2 p-3">
        <DrawMap
          onPolygon={onPolygon}
          importedPolygon={polygon}
          importSeq={importSeq}
          detectMode
          onDetect={onDetect}
        />

        {detecting && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(11,64,64,0.28)]">
            <span className="lp-ink flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin text-grass" aria-hidden="true" />
              {t("landing.detecting")}
            </span>
          </div>
        )}
      </div>

      {/* result strip — everything the mockup floats over the map lives here, so nothing collides
          with MapLibre's own controls. */}
      <div className="border-t border-line bg-panel p-4 sm:p-5">
        <div className="lp-chip mb-3 inline-flex">
          <Layers className="h-4 w-4" aria-hidden="true" />
          {ndvi?.acquired_at ? `NDVI · ${ndvi.acquired_at}` : "Peyk təsviri · canlı"}
        </div>

        {detected ? (
          <div className="grid gap-4 min-[720px]:grid-cols-[1.15fr_1fr] min-[720px]:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-grass-deep">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="lp-muted text-xs font-bold uppercase tracking-wider">
                    {t("landing.yourField")}
                  </p>
                  <p className="lp-ink font-display text-[28px] font-bold leading-none">
                    {areaHa != null ? areaHa.toFixed(2) : "—"}{" "}
                    <span className="lp-muted text-base font-semibold">ha</span>
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {weather && (
                  <span className="lp-pill lp-pill-blue">
                    <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                    {weather.temp}°C · {weather.desc}
                  </span>
                )}
                {ndviBusy && !ndvi && (
                  <span className="lp-pill lp-pill-neutral">Peykdən oxunur…</span>
                )}
                {ndvi && (
                  <span className="lp-pill lp-pill-good">
                    <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                    NDVI {ndvi.ndvi.toFixed(2)} · {ndviVerdict(ndvi.ndvi)}
                  </span>
                )}
              </div>

              {/* the mockup's legend box — honest version: only shown with a real reading */}
              {ndvi && (
                <div className="mt-3 max-w-[280px]">
                  <div className="lp-ink2 text-[11.5px] font-bold">Bitki sağlamlığı (NDVI)</div>
                  <div className="lp-ramp relative mt-1.5">
                    <span
                      className="absolute -top-1 h-[16px] w-[3px] rounded bg-white shadow"
                      style={{ left: `calc(${ndviPct}% - 1.5px)` }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="lp-muted mt-1 flex justify-between text-[11px] font-semibold">
                    <span>Zəif</span>
                    <span>Orta</span>
                    <span>Sağlam</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              {ndvi && (
                <div className="lp-aichip mb-3">
                  <div className="lp-aichip-h">
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> AI Aqronom
                  </div>
                  {ndviAdvice(ndvi.ndvi)}
                </div>
              )}
              <p className="lp-ink2 text-sm">{t("landing.ctaValue")}</p>
              <button
                type="button"
                onClick={startTracking}
                className="lp-btn lp-btn-pri mt-3 w-full"
              >
                {t("landing.ctaStart")} <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onPolygon(null);
                  setImportSeq((s) => s + 1);
                }}
                className="lp-muted mt-2 min-h-11 w-full text-center text-sm font-semibold hover:text-[color:var(--brand-ink)]"
              >
                {t("landing.otherField")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-grass-deep">
              <Hand className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="lp-ink text-[15px] font-bold">{t("landing.tapTitle")}</p>
              <p className="lp-ink2 mt-0.5 text-sm">{hint || t("landing.tapHint")}</p>
              <p className="lp-muted mt-1.5 text-xs">
                Qeydiyyat tələb olunmur — sahəni gör, sonra qərar ver.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
