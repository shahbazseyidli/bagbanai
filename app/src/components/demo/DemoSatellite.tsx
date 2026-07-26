"use client";

// The satellite block on /demo: the clipped NDVI raster over the field boundary plus a strip of
// recent dates. A read-only twin of components/field/overview/SatelliteGlance, minus everything
// that would need an authenticated call — the nine-index switcher, the sensor toggle and the
// data-saver refetch all hit /api/fields/{id}/scenes, which requires membership.
//
// NDVI only, because that is what GET /api/public/demo's timeline contains; there is no parameter
// an anonymous visitor could use to pivot the payload to another index.
import { useEffect, useState } from "react";
import { CloudSun, ImageOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useDataSaver } from "@/lib/dataSaver";
import { t } from "@/lib/i18n";
import { indexLabel, legendFor } from "@/lib/indexStatus";
import type { Polygon } from "@/lib/types";
import { tourAnchor } from "./DemoTour";

// MapLibre is heavy — keep it out of the first paint of a marketing page opened on village 3G.
const DisplayMap = dynamic(() => import("@/components/FieldMap").then((m) => m.DisplayMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-paper-2" />,
});

export interface DemoScene {
  date: string | null;
  value: number | null;
  cloud_pct: number | null;
  tile_url: string | null;
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(2);
}

export default function DemoSatellite({
  polygon,
  timeline,
  activeIdx,
  onPick,
}: {
  polygon: Polygon | null;
  timeline: DemoScene[];
  activeIdx: number;
  onPick: (i: number) => void;
}) {
  const active: DemoScene | null = timeline[activeIdx] ?? timeline[0] ?? null;
  const legend = legendFor("NDVI");

  // Data saver, one notch stricter than SatelliteGlance's. There DisplayMap is a static import that
  // has already been paid for, so it can render optimistically and let the effect take it away.
  // Here it is a dynamic() chunk: rendering it for one frame would fetch MapLibre over exactly the
  // metered connection this is meant to spare. useDataSaver() only answers after mount (a lazy
  // useState initialiser reading localStorage would hydrate differently from the server), so hold
  // the decision until `decided` and show the loader skeleton in the meantime.
  const dataSaver = useDataSaver();
  const [decided, setDecided] = useState(false);
  const [showRaster, setShowRaster] = useState(false);
  useEffect(() => setDecided(true), []);
  const rasterVisible = showRaster || (decided && !dataSaver);

  return (
    <section className="card">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-display text-[15px] font-bold text-ink">{t("app.field.section.satellite")}</h3>
        {active?.date && (
          <span className="text-[11.5px] text-ink-soft">
            {active.date.slice(0, 10)}
            {active.cloud_pct != null ? ` · ${t("app.field.glance.cloud")} ${Math.round(active.cloud_pct)}%` : ""}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div {...tourAnchor("map")}>
          {!decided ? (
            // Identical to the dynamic() loader below it, so the extra frame is invisible.
            <div className="h-72 w-full animate-pulse rounded-xl bg-paper-2" aria-hidden="true" />
          ) : rasterVisible ? (
            <DisplayMap polygon={polygon} rasterUrl={active?.tile_url ?? null} heightClass="h-72" />
          ) : (
            <button
              type="button"
              onClick={() => setShowRaster(true)}
              className="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line bg-paper-2 px-4 text-center text-[13px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep"
            >
              <ImageOff className="h-5 w-5" aria-hidden="true" />
              {t("app.field.glance.loadRaster")}
              <span className="max-w-[36ch] text-[11.5px] font-normal leading-snug text-ink-soft">
                {t("mkt.demo.saverHint")}
              </span>
            </button>
          )}

          {/* Fixed ramp — the same value means the same colour on every date. */}
          <div className="mt-2.5 h-2 rounded" style={{ background: legend.grad }} aria-hidden="true" />
          <div className="mt-1 flex justify-between text-[10.5px] text-ink-soft">
            <span>{legend.low}</span>
            <span>{legend.mid}</span>
            <span>{legend.high}</span>
          </div>
          {!active?.tile_url && (
            <p className="mt-2 text-[11.5px] text-ink-soft">{t("mkt.demo.noRaster")}</p>
          )}
          <p className="mt-2 text-[10.5px] text-ink-soft">{t("app.field.glance.attribution")}</p>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <b className="font-display text-[26px] font-extrabold tracking-tight tabular-nums text-ink">
              {fmt(active?.value)}
            </b>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-soft">{indexLabel("NDVI")}</p>
          <p className="mt-2 text-[12px] leading-snug text-ink-soft">{t("mkt.demo.satCaption")}</p>

          <p className="mb-1.5 mt-3 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t("app.field.glance.dates")}
          </p>
          {/* Tapping a date repaints the map above — the tour's second step. */}
          <div {...tourAnchor("timeline")} className="flex gap-1.5 overflow-x-auto pb-1">
            {timeline.map((s, i) => (
              <button
                key={s.date ?? i}
                type="button"
                onClick={() => onPick(i)}
                aria-pressed={i === activeIdx}
                className={`min-w-[74px] shrink-0 rounded-[10px] border-[1.5px] px-2 py-1.5 text-center ${
                  i === activeIdx ? "border-grass bg-mint-soft" : "border-line bg-panel hover:border-mint"
                }`}
              >
                <b className="block text-[11.5px] font-bold text-ink">{(s.date ?? "").slice(5, 10)}</b>
                <span className="block text-[10.5px] tabular-nums text-ink-soft">{fmt(s.value)}</span>
                {s.cloud_pct != null && (
                  <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[9.5px] text-ink-soft">
                    <CloudSun className="h-2.5 w-2.5" aria-hidden="true" />
                    {Math.round(s.cloud_pct)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
