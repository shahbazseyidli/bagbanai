"use client";

// Feature D — the workbench centre: the satellite raster as a stage, not a card.
//
// The fetch/index-trio/date-strip logic is a deliberate copy of SatelliteGlance's rather than an
// extraction: SatelliteGlance is the mobile/narrow presentation and is not ours to refactor. Same
// endpoint, same three indices, same data-saver gate, same fixed colour ramp — only the frame
// differs. If the /scenes contract changes, both files change.
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CloudSun, ImageOff } from "lucide-react";
import { api } from "@/lib/api";
import { Placeholder } from "@/components/ui";
import { t } from "@/lib/i18n";
import { indexLabel, legendFor } from "@/lib/indexStatus";
import { DisplayMap } from "@/components/FieldMap";
import { useDataSaver } from "@/lib/dataSaver";
import type { FieldDetail, RasterScene, RasterScenes } from "@/lib/types";

// Cover, moisture, nitrogen — the three a farmer acts on. All nine live in the satellite section.
const STAGE_INDICES = ["NDVI", "NDMI", "NDRE"];

type Scene = RasterScene & { value?: number | null };
type ScenesResponse = Omit<RasterScenes, "scenes"> & { scenes: Scene[] };

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(2);
}

export default function SatelliteStage({
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
  // What the loaded scenes actually MEASURE. `index` is what the farmer just clicked; until the
  // response lands the two differ, and labelling last index's numbers with the new index's name
  // (and colour ramp) is simply wrong — NDMI's water ramp over NDVI values inverts the meaning.
  const [shownIndex, setShownIndex] = useState("NDVI");
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
        setShownIndex(index);
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
  // Ported from SatelliteGlance: scenes are newest-first, so "four weeks ago" is simply four
  // entries further down. A farmer promoted from a phone to a laptop was losing the trend read —
  // the wide layout showed strictly LESS than the stacked one it replaces.
  const olderIdx = Math.min(scenes.length - 1, sceneIdx + 4);
  const older = scenes[olderIdx];
  const delta =
    active?.value != null && older?.value != null && olderIdx !== sceneIdx
      ? active.value - older.value
      : null;
  const legend = legendFor(shownIndex);
  const rasterVisible = !dataSaver || showRaster;
  const scrollHintId = `stage-scroll-hint-${field.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* MAP — grows, never scrolls. Never sticky: a sticky ancestor leaves the MapLibre canvas
          blank until something forces a resize (see FieldMapSheet's history). */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
        {failed || (!loading && scenes.length === 0) ? (
          // pt-14 keeps the message clear of the chip pill, which floats at top-3 in every state so
          // the farmer can still switch to an index that does have scenes.
          <div className="flex h-full items-center justify-center px-6 pt-14">
            <Placeholder>
              {failed ? t("app.field.glance.failed") : t("app.field.glance.preparing")}
            </Placeholder>
          </div>
        ) : rasterVisible && scenes.length > 0 ? (
          <DisplayMap polygon={field.geom} rasterUrl={active?.tile_url ?? null} fill />
        ) : (
          <button
            onClick={() => setShowRaster(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line bg-paper-2 text-[13px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep"
          >
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            {t("app.field.glance.loadRaster")}
          </button>
        )}

        {loading && (
          <div
            className="absolute inset-0 z-10 animate-pulse rounded-xl bg-paper-2/85"
            aria-hidden="true"
          />
        )}

        {/* Index chips OVER the map, top-CENTRE: DisplayMap already owns left-2 top-2 (the measure
            toolbar) and the top-right corner (NavigationControl). */}
        <div
          role="group"
          aria-label={t("app.field.workbench.indexGroupAria")}
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-line bg-panel/95 p-1 shadow-soft backdrop-blur"
        >
          {STAGE_INDICES.map((ix) => (
            <button
              key={ix}
              onClick={() => setIndex(ix)}
              aria-pressed={index === ix}
              className={`min-h-9 rounded-full px-3 text-[12.5px] font-semibold ${
                index === ix
                  ? "bg-mint-soft text-grass-deep"
                  : "text-ink-soft hover:text-grass-deep"
              }`}
            >
              {indexLabel(ix)}
            </button>
          ))}
        </div>
      </div>

      {/* TIMELINE — a flush strip below the map, deliberately NOT an overlay: a bar across the
          map's bottom would cover BasemapControl (bottom-3 left-3) and CoordBar (bottom-2 right-2),
          making the basemap/hillshade picker unreachable. */}
      <div className="shrink-0 rounded-xl border border-line bg-panel px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-[14px] font-bold text-ink">
            {t("app.field.section.satellite")}
          </h3>
          {active && (
            <span className="text-[11.5px] text-ink-soft">
              {active.date}
              {active.cloud_pct != null
                ? ` · ${t("app.field.glance.cloud")} ${Math.round(active.cloud_pct)}%`
                : ""}
            </span>
          )}
          <span className="text-[11.5px] tabular-nums text-ink-soft">
            {indexLabel(shownIndex)} {fmt(active?.value)}
          </span>
          {delta != null && (
            <span
              className={`text-[11.5px] font-semibold tabular-nums ${
                delta >= 0 ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(2)} · {t("app.field.glance.fourWeeks")}
            </span>
          )}
          <button
            onClick={onOpenSatellite}
            className="ml-auto inline-flex min-h-9 items-center gap-1 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
          >
            {t("app.field.glance.openFull")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* aria-description is not in React's typed ARIA set, so the scroll hint below is
            referenced by id instead — same announcement, no cast. */}
        {scenes.length > 0 && (
          <div
            className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1"
            aria-describedby={scenes.length > 6 ? scrollHintId : undefined}
          >
            {scenes.slice(0, 16).map((s, i) => (
              <button
                key={s.scene_id}
                onClick={() => setSceneIdx(i)}
                aria-pressed={i === sceneIdx}
                className={`min-w-[74px] shrink-0 rounded-[10px] border-[1.5px] px-2 py-1 text-center ${
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
        )}

        {/* Fixed ramp — the same value means the same colour on every date. */}
        <div className="mt-1 h-2 rounded" style={{ background: legend.grad }} aria-hidden="true" />
        <div className="mt-1 flex items-baseline justify-between text-[10.5px] text-ink-soft">
          <span>{legend.low}</span>
          <span>{legend.mid}</span>
          <span>{legend.high}</span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="text-[10.5px] text-ink-soft">{t("app.field.glance.attribution")}</p>
          {scenes.length > 6 && (
            <p id={scrollHintId} className="shrink-0 text-[10.5px] text-ink-soft">
              {t("app.field.workbench.scrollDates")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
