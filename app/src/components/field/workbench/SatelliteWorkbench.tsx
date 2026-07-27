"use client";

// The WIDE body of the satellite section — the desktop field screen.
//
// It owns no data and no fetching: SatelliteTab is the single read model for this section (a second
// /scenes call beside the first is how a map ends up on 11 July while the number under it says 23
// July). What arrives here is either a plain value or a finished node built by that brain, so the
// two bodies can never disagree about what they are showing.
//
// Order, top-down: the map as a STAGE (not a card in a column), a flush strip under it carrying
// everything that describes the picture, then the chart panel, then the summary. The reference
// screen puts the chart directly beneath the map for a reason — the map answers "where", the chart
// answers "since when", and the reader moves between them without scrolling past anything else.

import type { ComponentProps, ReactNode } from "react";
import { GitCompareArrows } from "lucide-react";
import { t } from "@/lib/i18n";
import { indexLabel } from "@/lib/indexStatus";
import { DisplayMap } from "@/components/FieldMap";
import type { SensorMeta } from "@/lib/sensors";
import type { Polygon } from "@/lib/types";
import IndexChartPanel from "@/components/field/chart/IndexChartPanel";

// ONE height for the stage. DisplayMap in `fill` mode builds itself once, at the size of its parent,
// and exposes no resize() — so a responsive height class would leave the canvas at whichever size
// happened to apply on the frame it was constructed in.
const STAGE_H = "h-[520px]";

// Cover, moisture, nitrogen — the three a farmer acts on, promoted out of the ten-layer picker so
// the common switch is one click on the map. The picker beside them still reaches all ten.
const FAST_INDICES = ["NDVI", "NDMI", "NDRE"];

export default function SatelliteWorkbench({
  meta,
  banner,
  polygon,
  rasterUrl,
  index,
  onIndex,
  layerIndices,
  compare,
  canCompare,
  onToggleCompare,
  compareNode,
  legendNode,
  cloudNode,
  sceneStripNode,
  emptyNode,
  attribution,
  mapLayerButton,
  mapLayerPanel,
  chart,
  summaryNode,
}: {
  meta: SensorMeta;
  /** Small-field warning, already formatted in the farmer's area unit; null when it does not apply. */
  banner: ReactNode;
  polygon: Polygon | null | undefined;
  rasterUrl: string | null;
  index: string;
  onIndex: (ix: string) => void;
  /** Everything the sensor offers — used only to hide a fast chip the sensor does not have. */
  layerIndices: string[];
  compare: boolean;
  canCompare: boolean;
  onToggleCompare: () => void;
  /** The whole two-date compare body, built by the brain at this stage's height. */
  compareNode: ReactNode;
  legendNode: ReactNode;
  cloudNode: ReactNode;
  sceneStripNode: ReactNode;
  /** "Still preparing" / "nothing yet" block, or null when there are scenes. */
  emptyNode: ReactNode;
  attribution: string;
  /** The LayerButton seated over the MAP. The picker itself has two possible seats — see below. */
  mapLayerButton: ReactNode;
  mapLayerPanel: ReactNode;
  chart: ComponentProps<typeof IndexChartPanel>;
  summaryNode: ReactNode;
}) {
  const fast = FAST_INDICES.filter((ix) => layerIndices.includes(ix));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <span className="text-xs text-slate-500">{meta.note}</span>
      </div>

      {banner}

      {compare ? (
        <div className="rounded-xl border-[1.5px] border-line bg-panel p-3">
          <div className="mb-2 flex justify-end">
            <CompareToggle on={compare} onToggle={onToggleCompare} />
          </div>
          {compareNode}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border-[1.5px] border-line bg-panel">
          {/* The stage. Sized and `relative`, in normal flow — never sticky, never transformed:
              either one leaves the MapLibre canvas blank with no error at all (lib/useMapReady). */}
          <div className={`relative ${STAGE_H} bg-paper-2`}>
            <DisplayMap polygon={polygon} rasterUrl={rasterUrl} fill />

            {/* TOP-CENTRE is the only free corner. DisplayMap owns top-left (the measure/ruler
                toolbar at left-2 top-2), top-right (MapLibre's NavigationControl), bottom-left
                (ScaleControl + BasemapControl) and bottom-right (CoordBar). SatelliteStage had to
                make the same move for the same reason. */}
            <div
              role="group"
              aria-label={t("app.field.satelliteTab.mapToolsAria")}
              className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%_-_7rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-line bg-panel/95 p-1 shadow-soft backdrop-blur"
            >
              {fast.map((ix) => (
                <button
                  key={ix}
                  type="button"
                  onClick={() => onIndex(ix)}
                  aria-pressed={index === ix}
                  className={`min-h-[var(--tap)] rounded-full px-3 text-[12.5px] font-semibold ${
                    index === ix ? "bg-mint-soft text-grass-deep" : "text-ink-soft hover:text-grass-deep"
                  }`}
                >
                  {indexLabel(ix)}
                </button>
              ))}
              {mapLayerButton}
              {canCompare && <CompareToggle on={compare} onToggle={onToggleCompare} />}
            </div>
          </div>

          {/* Flush strip: everything that describes the picture above it, inside the same frame, so
              the legend can never scroll away from the map it explains. */}
          <div className="border-t border-line px-3 pb-3 pt-2">
            {mapLayerPanel}
            {emptyNode}
            {legendNode}
            {cloudNode}
            {sceneStripNode}
            {/* Licence obligation, not a caption. */}
            <p className="mt-2 text-[10.5px] text-ink-soft">{attribution}</p>
          </div>
        </div>
      )}

      <IndexChartPanel {...chart} />

      {summaryNode}
    </div>
  );
}

function CompareToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={t("app.field.satelliteTab.compareTitle")}
      className={`inline-flex min-h-[var(--tap)] items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold ${
        on ? "bg-mint-soft text-grass-deep" : "text-ink-soft hover:text-grass-deep"
      }`}
    >
      <GitCompareArrows className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {t("app.field.satelliteTab.compareBtn")}
    </button>
  );
}
