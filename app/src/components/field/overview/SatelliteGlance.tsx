"use client";

// E14 — the satellite block on the status section: a glance, not the workbench.
//
// The owner asked for the small map (the one from the satellite section), not the full-bleed hero
// that used to sit at the top of the field page. So this keeps exactly what answers "how does my
// field look right now": three indices, the clipped raster at a readable size, the colour ramp, and
// a scrollable strip of recent dates. Everything else — all nine indices, the cloud slider, contrast,
// two-date compare, the trend chart — stays in the satellite section, one button away.
//
// Sensor is always Sentinel-2. HLS still feeds the benchmark, backfill and zones in the data layer,
// but it is no longer something the farmer is asked to think about.
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CloudSun, ImageOff } from "lucide-react";
import { api } from "@/lib/api";
import { Placeholder, Spinner } from "@/components/ui";
import { t } from "@/lib/i18n";
import { indexLabel, legendFor } from "@/lib/indexStatus";
import { DisplayMap } from "@/components/FieldMap";
import { useDataSaver } from "@/lib/dataSaver";
import type { FieldDetail, RasterScene, RasterScenes } from "@/lib/types";

// The three a farmer actually acts on: cover, moisture, nitrogen. The rest live in the satellite
// section — offering nine here would rebuild the workbench we just simplified away.
const GLANCE_INDICES = ["NDVI", "NDMI", "NDRE"];

type Scene = RasterScene & { value?: number | null };
type ScenesResponse = Omit<RasterScenes, "scenes"> & { scenes: Scene[] };

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(2);
}

export default function SatelliteGlance({
  field,
  onOpenSatellite,
}: {
  field: FieldDetail;
  onOpenSatellite: () => void;
}) {
  const [index, setIndex] = useState("NDVI");
  const [data, setData] = useState<ScenesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const dataSaver = useDataSaver();
  // On a metered connection the raster is not fetched until the farmer asks for it (D4.5).
  const [showRaster, setShowRaster] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    api
      .get<ScenesResponse>(`/api/fields/${field.id}/scenes?index=${index}&sensor=s2`)
      .then((r) => {
        if (!active) return;
        setData(r ?? null);
        setSceneIdx(0);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [field.id, index]);

  const scenes = useMemo(() => data?.scenes ?? [], [data]);
  const active: Scene | null = scenes[sceneIdx] ?? scenes[0] ?? null;
  // Scenes come newest-first, so the "4 weeks ago" comparison is simply further down the list.
  const olderIdx = Math.min(scenes.length - 1, sceneIdx + 4);
  const older = scenes[olderIdx];
  const delta =
    active?.value != null && older?.value != null && olderIdx !== sceneIdx
      ? active.value - older.value
      : null;

  const legend = legendFor(index);
  const rasterVisible = !dataSaver || showRaster;

  return (
    <section className="card">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-display text-[15px] font-bold text-ink">{t("app.field.section.satellite")}</h3>
        {active && (
          <span className="text-[11.5px] text-ink-soft">
            {active.date}
            {active.cloud_pct != null ? ` · ${t("app.field.glance.cloud")} ${Math.round(active.cloud_pct)}%` : ""}
          </span>
        )}
        <button
          onClick={onOpenSatellite}
          className="ml-auto inline-flex min-h-9 items-center gap-1 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
        >
          {t("app.field.glance.openFull")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Index switcher — three chips, not the nine-item select of the full section. */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {GLANCE_INDICES.map((ix) => (
          <button
            key={ix}
            onClick={() => setIndex(ix)}
            aria-pressed={index === ix}
            className={`min-h-9 rounded-full border-[1.5px] px-3 text-[12.5px] font-semibold ${
              index === ix
                ? "border-grass bg-mint-soft text-grass-deep"
                : "border-line bg-panel text-ink-soft hover:border-mint"
            }`}
          >
            {indexLabel(ix)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-paper-2" aria-hidden="true" />
      ) : failed ? (
        <Placeholder>{t("app.field.glance.failed")}</Placeholder>
      ) : scenes.length === 0 ? (
        <Placeholder>{t("app.field.glance.preparing")}</Placeholder>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            {rasterVisible ? (
              <DisplayMap polygon={field.geom} rasterUrl={active?.tile_url ?? null} />
            ) : (
              <button
                onClick={() => setShowRaster(true)}
                className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line bg-paper-2 text-[13px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep"
              >
                <ImageOff className="h-5 w-5" aria-hidden="true" />
                {t("app.field.glance.loadRaster")}
              </button>
            )}

            {/* Fixed ramp — the same value means the same colour on every date. */}
            <div className="mt-2.5 h-2 rounded" style={{ background: legend.grad }} aria-hidden="true" />
            <div className="mt-1 flex justify-between text-[10.5px] text-ink-soft">
              <span>{legend.low}</span>
              <span>{legend.mid}</span>
              <span>{legend.high}</span>
            </div>
            <p className="mt-2 text-[10.5px] text-ink-soft">{t("app.field.glance.attribution")}</p>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <b className="font-display text-[26px] font-extrabold tracking-tight tabular-nums text-ink">
                {fmt(active?.value)}
              </b>
              {delta != null && (
                <span
                  className={`text-[12.5px] font-bold tabular-nums ${
                    delta >= 0 ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(2)} · {t("app.field.glance.fourWeeks")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-ink-soft">{indexLabel(index)}</p>

            {/* Date strip — tapping a date repaints the map above. */}
            <p className="mb-1.5 mt-3 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
              {t("app.field.glance.dates")}
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {scenes.slice(0, 8).map((s, i) => (
                <button
                  key={s.scene_id}
                  onClick={() => setSceneIdx(i)}
                  aria-pressed={i === sceneIdx}
                  className={`min-w-[74px] shrink-0 rounded-[10px] border-[1.5px] px-2 py-1.5 text-center ${
                    i === sceneIdx ? "border-grass bg-mint-soft" : "border-line bg-panel hover:border-mint"
                  }`}
                >
                  <b className="block text-[11.5px] font-bold text-ink">{s.date.slice(5)}</b>
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
      )}
    </section>
  );
}
