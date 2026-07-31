"use client";

// The satellite section. Only Sentinel-2 is exposed to the farmer (E14); HLS still feeds the
// regional benchmark, A8 backfill and A6 zones in the data layer, invisibly. There is no sensor
// toggle and no second tab to send anyone to — the `sensor` prop stays because every read below is
// per-family and the data layer is still two sensors deep.
//
// Shows that sensor's raster map + scene timeline + two-date compare + time series + the
// current-indicator card. When the sensor has no rasters yet it says "still preparing" rather than
// silently painting the other family: /scenes falls back across families on its own, and that
// fallback is suppressed here on purpose — a 30m picture under a 10m promise is a wrong answer, not
// a graceful one.
//
// ONE BRAIN, TWO BODIES. Every fetch, every guard and every piece of state lives in this file; the
// only thing the layout decides is which body renders them. `narrow` is the stacked phone/tablet
// tree this section has always had. `wide` is SatelliteWorkbench — map as a stage, the chart panel
// under it. The pieces that both bodies show (the legend, the cloud filter, the date strip, the
// compare view, the summary card) are built ONCE by the small functions below and handed to
// whichever body is rendering, so the two can never drift apart.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { GitCompareArrows, Cloud, Download } from "lucide-react";
import { api } from "@/lib/api";
import { downloadText, seriesToCSV } from "@/lib/geoio";
import { t, tf } from "@/lib/i18n";
import { formatArea, useAreaUnit } from "@/lib/units";
import { DisplayMap, CompareMap } from "@/components/FieldMap";
import { Placeholder, Spinner } from "@/components/ui";
import {
  type Sensor, sensorMeta, SENSOR_PARAM, sensorFamily, indexAvailable, SENSOR_INDICES,
  AREA_MIN_S2, AREA_MIN_HLS,
} from "@/lib/sensors";
import {
  indexLabel, indexInfo, legendFor, interpret,
  type IndexNorms,
} from "@/lib/indexStatus";
import StatusChip from "@/components/StatusChip";
import LayerPicker, { LayerButton, type PickerVariant } from "./layers/LayerPicker";
import { scenePreviewUrl } from "./layers/previewUrl";
import type { LayerPreview } from "./layers/useLayerPreviews";
import { forecastMethodLabel } from "@/lib/wellnessText";
import { useFieldDataStatus } from "@/lib/useFieldDataStatus";
import CoverageNote from "./CoverageNote";
import SatelliteWorkbench from "./workbench/SatelliteWorkbench";
import type { FieldLayout } from "./workbench/useStageWidth";
import type { RangeKey } from "./chart/chartRange";
import type {
  FieldDetail, IndexPoint, IndexSeries, IndexBenchmark, IndexBenchmarkPoint,
  RasterScene, RasterScenes,
} from "@/lib/types";

interface IndexSummaryEntry { index: string; latest: number | null; date: string | null; }
interface IndexSummary { sensor?: string; indices: IndexSummaryEntry[]; }

// /scenes also returns per-scene contrast fields (A1) and the selected index's field mean (A2).
// types.ts is shared/frozen, so the extra (optional) fields are declared locally.
type Scene = RasterScene & {
  value?: number | null;
  rescale_auto?: string | null;
  tile_url_auto?: string | null;
};
type ScenesResponse = Omit<RasterScenes, "scenes"> & { scenes: Scene[] };

// GET /api/fields/{id}/forecast — the dotted continuation of the series (services/app/ai/
// forecast.py). Declared here rather than in types.ts for the same reason as Scene above.
// `method: null` with `points: []` is the normal answer on a field the ladder cannot serve.
interface ForecastPoint { date: string; value: number; lo: number; hi: number; }
interface ForecastResponse {
  index?: string;
  method: "own_history" | "peers" | "trend" | null;
  method_params?: Record<string, unknown> | null;
  horizon_days?: number;
  anchor?: { date: string; value: number } | null;
  points?: ForecastPoint[] | null;
}

const SUMMARY_INDICES = ["NDVI", "NDRE", "NDMI", "NDWI", "EVI", "SAVI", "NBR"];

// The projection is drawn in a WASHED-OUT tint of the measured line's colour, never in the colour
// itself: the eye should read it as the same quantity, and the dashes plus the pallor should make
// it impossible to mistake for a scene that actually exists.
const FORECAST_LINE = "#93c5fd"; // blue-300 against the S2 line's blue-600
const FORECAST_BAND = "#dbeafe"; // blue-100

function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

// "lo,hi" (as TiTiler wants it) → numbers, or null when malformed/degenerate.
function parseRescale(s?: string | null): [number, number] | null {
  if (!s) return null;
  const parts = s.split(",");
  if (parts.length !== 2) return null;
  const lo = Number(parts[0]);
  const hi = Number(parts[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  return [lo, hi];
}

// Swap the rescale= value of a TiTiler tile template. Only used for the two-date compare,
// where BOTH panes must share one range or the comparison lies. The value is inserted raw
// (URL-safe characters only, exactly the form the API emits) and anything else is rejected,
// so a malformed range leaves the original URL untouched instead of breaking the tiles.
const RESCALE_RE = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

function withRescale(url: string, rescale: string): string {
  if (!RESCALE_RE.test(rescale)) return url;
  return url.replace(/([?&]rescale=)[^&]*/, `$1${rescale}`);
}

// Higher is better for the vegetation family and for canopy moisture (NDMI); for NDWI/NBR a
// rise is not automatically good news, so those deltas stay neutral grey instead of lying.
const HIGHER_IS_BETTER = new Set(["NDVI", "EVI", "SAVI", "MSAVI", "TVI", "NDRE", "CIre", "NDMI"]);
const DELTA_EPS = 0.005; // rounds to 0.00 → show as flat, not as a direction

function deltaClass(index: string, d: number): string {
  if (Math.abs(d) < DELTA_EPS || !HIGHER_IS_BETTER.has(index)) return "text-slate-400";
  return d > 0 ? "text-emerald-600" : "text-red-600";
}

function fmtDelta(d: number): string {
  if (Math.abs(d) < DELTA_EPS) return "±0.00";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}`;
}

// Compare-mode <option> label — "2026-07-12 · 0.71 (☁12%)".
function sceneOptionLabel(s: Scene): string {
  return `${s.date}${s.value != null ? ` · ${s.value.toFixed(2)}` : ""}`
    + `${s.cloud_pct != null ? ` (☁${s.cloud_pct.toFixed(0)}%)` : ""}`;
}

// The mode buttons carry title= tooltips, but the device a field is walked with has no hover.
// This is the version a farmer actually reads, and it answers "why would I tap this", not
// "what does this do".
function ModeHint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
      {icon}<span>{text}</span>
    </p>
  );
}

// Legend must describe the range ACTUALLY on the map: `range` is the rescale in use (fixed or
// per-scene contrast), so the words keep their numbers instead of implying a fixed scale.
function IndexLegend({ index, range, auto }: {
  index: string;
  range?: [number, number] | null;
  auto?: boolean;
}) {
  const lg = legendFor(index);
  const fmt = (v: number) => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
  return (
    <div className="mt-3">
      <div className="h-3 w-full rounded" style={{ background: lg.grad }} />
      <div className="mt-1 flex justify-between gap-2 text-[11px] text-slate-500">
        <span>{lg.low}{range && <span className="ml-1 tabular-nums text-slate-400">{fmt(range[0])}</span>}</span>
        <span>{lg.mid}{range && <span className="ml-1 tabular-nums text-slate-400">{fmt((range[0] + range[1]) / 2)}</span>}</span>
        <span>{lg.high}{range && <span className="ml-1 tabular-nums text-slate-400">{fmt(range[1])}</span>}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {auto
          ? t("app.field.satelliteTab.contrastOnHint")
          : t("app.field.satelliteTab.fixedRangeHint")}
      </p>
    </div>
  );
}

export default function SatelliteTab({
  field,
  sensor,
  pickerVariant = "sheet",
  layout = "narrow",
  chartFullscreen = false,
  onOpenChartFullscreen,
  onCloseChartFullscreen,
}: {
  field: FieldDetail;
  sensor: Sensor;
  /**
   * How the layer picker opens, decided by the PAGE from the stage width it already measures. This
   * section must not answer it with a breakpoint: the panel variant is ~1250px of in-flow tiles,
   * which on a phone shoves the time series off screen with no dismiss affordance but scrolling
   * back up. Default "sheet" = the safe answer for any caller that has not measured.
   */
  pickerVariant?: PickerVariant;
  /**
   * Which body to render, from the SAME measurement that decided pickerVariant. Not a breakpoint,
   * and not a second measurement of the same box — see workbench/useStageWidth. Default "narrow" is
   * the safe answer: it is what this section has always rendered.
   */
  layout?: FieldLayout;
  /** Driven by ?chart=full on the field URL, so the Android back gesture closes it for free. */
  chartFullscreen?: boolean;
  onOpenChartFullscreen?: () => void;
  onCloseChartFullscreen?: () => void;
}) {
  const firstIndex = SENSOR_INDICES[sensor][0] ?? "NDVI";
  const areaUnit = useAreaUnit();
  const [index, setIndex] = useState("NDVI");
  const [series, setSeries] = useState<IndexPoint[] | null>(null);
  // The benchmark is kept as the API returned it (week Mondays) rather than only as the week-key
  // map: the chart panel plots those Mondays on a real time axis, while the stacked chart below
  // still joins them onto scene dates by ISO week. One state, two derivations, no second fetch.
  const [benchSeries, setBenchSeries] = useState<IndexBenchmarkPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  // Which index the loaded `scenes` actually MEASURE. `index` is what the farmer just picked; until
  // the response lands the two differ, and attributing the previous index's picture to the new
  // index's name would cache a wrong thumbnail for the rest of the session.
  const [scenesIndex, setScenesIndex] = useState("NDVI");
  const [noData, setNoData] = useState(false); // this sensor has no rasters (ignoring fallback)
  const [sceneIdx, setSceneIdx] = useState(0);
  const [maxCloud, setMaxCloud] = useState(100);
  const [compare, setCompare] = useState(false);
  const [contrast, setContrast] = useState(false);   // A1 — per-scene stretch instead of fixed range
  const [fixedRescale, setFixedRescale] = useState<string | null>(null); // index family range from /scenes
  const [cmpA, setCmpA] = useState(0);
  const [cmpB, setCmpB] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<IndexSummaryEntry[] | null>(null);
  const [norms, setNorms] = useState<IndexNorms | null>(null);
  const [normsCrop, setNormsCrop] = useState<{ crop_type: string | null; calibrated: boolean } | null>(null);
  // Chart panel controls (wide body only). They live here rather than inside the panel because this
  // file is the section's single source of state; the panel is presentation.
  const [range, setRange] = useState<RangeKey>("3m");
  const [axisLocked, setAxisLocked] = useState(true);
  // W4 — the layer picker replaces the <select>. Which surface it opens as is `pickerVariant`,
  // decided by the page (see the prop): in flow under its button on a desktop stage, a bottom sheet
  // on a phone. WHERE it is seated is this: the wide body has two triggers (one over the map, one in
  // the chart header) and exactly ONE picker instance, so opening either closes the other.
  const [openPicker, setOpenPicker] = useState<"map" | "chart" | null>(null);
  const layerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const chartTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pickerId = `satellite-layer-picker-${field.id}`;

  // Shared processing-status poller (D0.9) — drives the "preparing" note.
  const status = useFieldDataStatus(field.id);

  // Keep the index valid for this sensor (NDRE/CIre are S2-only, TVI is HLS-only).
  useEffect(() => {
    if (!indexAvailable(sensor, index)) setIndex(firstIndex === "TVI" ? "NDVI" : firstIndex);
  }, [sensor, index, firstIndex]);

  const effectiveStatus = status?.status ?? field.data_status ?? "ready";
  // 'partial' = HLS ready, S2 still coming → for a sensor with no data yet the wait card should
  // say "hazırlanır" (not "hələ yoxdur").
  const preparing =
    effectiveStatus === "queued" || effectiveStatus === "processing" || effectiveStatus === "partial";
  const ready = status?.status === "ready";

  // Time series (both sensors, tagged) + regional benchmark + short-horizon projection. All three
  // feed the one chart below, so they are fetched together and the chart is drawn once.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [ser, bm, fc] = await Promise.all([
          api.get<IndexSeries>(`/api/fields/${field.id}/indices?index=${index}`),
          api.get<IndexBenchmark>(`/api/fields/${field.id}/indices/benchmark?index=${index}`).catch(() => null),
          // Optional: a failed/absent forecast must cost the chart nothing.
          api.get<ForecastResponse>(
            `/api/fields/${field.id}/forecast?index=${index}&sensor=${SENSOR_PARAM[sensor]}`,
          ).catch(() => null),
        ]);
        if (!active) return;
        setSeries(ser?.series ?? []);
        setBenchSeries(bm?.series ?? []);
        // Only a NAMED method is kept. A projection whose provenance we cannot put on a chip is
        // not drawn at all — see forecastMethodLabel().
        setForecast(fc?.method ? fc : null);
      } catch {
        if (!active) return;
        setSeries([]); setBenchSeries([]); setForecast(null);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [field.id, index, sensor, ready]);

  // Map raster scenes for THIS sensor only — fallback to the other family is suppressed so a
  // dedicated sensor tab never shows the wrong sensor's raster.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sc = await api.get<ScenesResponse>(
          `/api/fields/${field.id}/scenes?index=${index}&sensor=${SENSOR_PARAM[sensor]}`,
        );
        if (!active) return;
        const returned = sc?.sensor ? sensorFamily(sc.sensor) : null;
        setFixedRescale(sc?.rescale ?? null);
        if (returned && returned !== sensor) { setScenes([]); setNoData(true); }
        else { setScenes(sc?.scenes ?? []); setNoData((sc?.scenes ?? []).length === 0); }
        setScenesIndex(index);
        setSceneIdx(0);
      } catch {
        if (!active) return;
        setScenes([]); setNoData(true); setFixedRescale(null); setScenesIndex(index);
      }
    })();
    return () => { active = false; };
  }, [field.id, index, sensor, ready]);

  // Latest per-index values for the "Cari göstəricilər" card (this sensor only).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await api.get<IndexSummary>(`/api/fields/${field.id}/indices/summary?sensor=${SENSOR_PARAM[sensor]}`);
        if (!active) return;
        const returned = s?.sensor ? sensorFamily(s.sensor) : null;
        setSummary(returned && returned !== sensor ? [] : s?.indices ?? []);
      } catch { if (active) setSummary([]); }
    })();
    return () => { active = false; };
  }, [field.id, sensor, ready]);

  // Crop-specific norms (M5) — calibrates status labels.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api.get<{ crop_type: string | null; calibrated: boolean; norms: IndexNorms }>(
          `/api/fields/${field.id}/norms`);
        if (!active) return;
        setNorms(r?.norms ?? null);
        setNormsCrop(r ? { crop_type: r.crop_type, calibrated: r.calibrated } : null);
      } catch { /* universal thresholds */ }
    })();
    return () => { active = false; };
  }, [field.id]);

  // The stacked chart joins the district median onto whichever scene falls in the same ISO week.
  const benchmark = useMemo(() => {
    const bench: Record<string, { p50: number; p10?: number; p90?: number }> = {};
    for (const p of benchSeries) bench[weekKey(p.date)] = { p50: p.mean, p10: p.p10, p90: p.p90 };
    return bench;
  }, [benchSeries]);

  const summaryRows = useMemo(() => {
    const byIndex = new Map((summary ?? []).map((e) => [e.index, e]));
    return SUMMARY_INDICES.map((ix) => byIndex.get(ix))
      .filter((e): e is IndexSummaryEntry => e != null && e.latest != null)
      .map((e) => ({ entry: e, value: e.latest as number, ...interpret(e.index, e.latest as number, norms) }));
  }, [summary, norms]);

  const visibleScenes = useMemo(
    () => scenes.filter((s) => s.cloud_pct == null || s.cloud_pct <= maxCloud), [scenes, maxCloud]);

  useEffect(() => {
    setSceneIdx(0); setCmpA(0);
    setCmpB(Math.min(1, Math.max(0, visibleScenes.length - 1)));
    if (visibleScenes.length < 2) setCompare(false);
  }, [visibleScenes.length]);

  const activeScene: Scene | null = visibleScenes[sceneIdx] ?? visibleScenes[0] ?? null;
  // A1 — with contrast on, the map uses the scene's own p10–p90 stretch (server-built URL).
  const rasterUrl = (contrast
    ? (activeScene?.tile_url_auto ?? activeScene?.tile_url)
    : activeScene?.tile_url) ?? null;
  // The stretch only exists when the scene had usable stats; otherwise it equals the fixed one.
  const contrastAvailable = visibleScenes.some(
    (s) => s.rescale_auto != null && s.rescale_auto !== fixedRescale);
  const activeRange = parseRescale(
    contrast ? (activeScene?.rescale_auto ?? fixedRescale) : fixedRescale);
  const contrastOnActive = contrast && activeScene?.rescale_auto != null
    && activeScene?.rescale_auto !== fixedRescale;

  // Same shape and same reason as the compare reset above: a mode whose CONTROL is no longer on
  // screen must not stay engaged. contrastAvailable is computed from the CLOUD-FILTERED list, so
  // dragging the cloud slider can take the mode block out of the picker while `contrast` is still
  // true — and then the trigger kept printing " · Kontrast" over a map that is on the fixed range,
  // with the legend six inches below correctly saying so, and no control left to turn it off.
  useEffect(() => {
    if (!contrastAvailable) setContrast(false);
  }, [contrastAvailable]);

  // W4 — the picker's free seed and the trigger's swatch. The UNFILTERED newest scene and
  // `tile_url` (the fixed family rescale), never the cloud-filtered list and never tile_url_auto:
  // the ten tiles in the grid are compared with EACH OTHER, so they must all sit on the same
  // domain and all show their own layer's newest pass.
  const newestScene: Scene | null = scenes[0] ?? null;
  const layerPreview: LayerPreview = {
    url: scenePreviewUrl(newestScene?.tile_url),
    date: newestScene?.date ?? null,
    value: newestScene?.value ?? null,
    state: newestScene ? "ready" : "empty",
  };
  // Only once the loaded scenes belong to the index the button is naming.
  const layerPreviewFresh = scenesIndex === index;

  // A2 — per-scene delta vs the previous (older) scene IN THE VISIBLE list, so the number
  // matches what the farmer actually sees after the cloud filter. Scenes are newest-first.
  const sceneDeltas = useMemo(
    () => visibleScenes.map((s, i) => {
      const prev = visibleScenes[i + 1];
      if (s.value == null || prev?.value == null) return null;
      return s.value - prev.value;
    }),
    [visibleScenes]);

  // The projection is only allowed onto the chart when it actually continues THE LINE ON SCREEN.
  //
  // The backend treats ?sensor= as a PREFERENCE: if S2 has too few usable scenes it fits on HLS
  // instead and says so in method_params.sensor. The chart, meanwhile, filters the measured series
  // to one family. Drawing an HLS fit under an S2 line would float the dotted line free of the solid
  // one and re-introduce, at the presentation layer, exactly the 10m/30m mixing the fit itself
  // forbids. A method this build cannot name is dropped for the same reason it is never drawn: a
  // projection whose provenance we cannot state is what a farmer mistakes for a measurement.
  const activeForecast = useMemo(() => {
    if (!forecast?.method || !(forecast.points?.length)) return null;
    if (forecastMethodLabel(forecast.method, forecast.method_params) == null) return null;
    if (forecast.method_params?.sensor !== SENSOR_PARAM[sensor]) return null;
    return forecast;
  }, [forecast, sensor]);

  // Pivot the two-sensor series → this sensor's line + weekly benchmark.
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, unknown>>();
    for (const p of series ?? []) {
      if (sensorFamily(p.sensor) !== sensor) continue;
      const row = byDate.get(p.date) ?? { date: p.date };
      row.mean = p.mean;
      row.p10 = p.p10 ?? null;
      row.p90 = p.p90 ?? null;
      byDate.set(p.date, row);
    }
    const hasBench = Object.keys(benchmark).length > 0;
    const rows: Record<string, unknown>[] = Array.from(byDate.values())
      .sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1))
      .map((r) => {
        const b = benchmark[weekKey(String(r.date))];
        return {
          ...r,
          benchmark: hasBench ? (b?.p50 ?? null) : null,
          // D4.1 — district p10–p90 spread as a shaded band (Recharts range Area).
          benchBand: hasBench && b?.p10 != null && b?.p90 != null ? [b.p10, b.p90] : null,
        };
      });

    // The projection rides on its OWN keys, so `mean` still stops at the last scene and nothing
    // measured is ever synthesised. points[0] IS the anchor — the same date and value as the last
    // usable measurement — so that first projected point lands on an EXISTING row and the dotted
    // line starts on the solid one instead of floating beside it.
    const points = activeForecast?.points ?? [];
    if (points.length > 0) {
      const byKey = new Map<string, Record<string, unknown>>(
        rows.map((r) => [String(r.date), r] as [string, Record<string, unknown>]));
      for (const p of points) {
        if (p?.date == null || p.value == null) continue;
        const patch = {
          forecast: p.value,
          forecastBand: p.lo != null && p.hi != null ? [p.lo, p.hi] : null,
        };
        const row = byKey.get(p.date);
        if (row) { Object.assign(row, patch); continue; }
        const added: Record<string, unknown> = { date: p.date, benchmark: null, benchBand: null, ...patch };
        rows.push(added);
        byKey.set(p.date, added);
      }
      // A cloudy scene AFTER the anchor stays in the measured series, so the appended future dates
      // are not guaranteed to be the largest. Re-sort rather than assume.
      rows.sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1));
    }
    return rows;
  }, [series, benchmark, sensor, activeForecast]);

  // The same measurements, as rows the time-axis chart can plot. Same filter, same family rule —
  // the wide body must never be able to show a series the stacked one would not.
  const measuredPoints = useMemo(
    () => (series ?? [])
      .filter((p) => sensorFamily(p.sensor) === sensor)
      .map((p) => ({ date: p.date, mean: p.mean, p10: p.p10 ?? null, p90: p.p90 ?? null })),
    [series, sensor],
  );

  const hasBenchmark = Object.keys(benchmark).length > 0;
  // Measurements, not rows: chartData can contain projected rows, and a chart made of nothing but
  // a dotted line must still fall through to the "no data yet" placeholder.
  const hasSeries = (series ?? []).some((p) => sensorFamily(p.sensor) === sensor);

  // The chip names the method that produced the projection; without a name, nothing is drawn.
  const forecastLabel = forecastMethodLabel(activeForecast?.method, activeForecast?.method_params);
  const hasForecast = activeForecast != null;

  // The pixel-count thresholds themselves stay in hectares (they come from the sensor's ground
  // resolution); only the number shown to the farmer is converted.
  const smallField = field.area_ha != null && field.area_ha < AREA_MIN_S2;
  const smallForHls = field.area_ha != null && field.area_ha < AREA_MIN_HLS;
  const showSmallBanner = smallField || (sensor === "HLS" && smallForHls);

  const sceneA = visibleScenes[cmpA] ?? null;
  const sceneB = visibleScenes[cmpB] ?? null;

  // Contrast + compare: both panes must share ONE range (the union of the two scenes'
  // stretches). Two different stretches side by side would fake a change that isn't there.
  const cmpRescale = useMemo(() => {
    if (!contrast) return null;
    const a = parseRescale(sceneA?.rescale_auto);
    const b = parseRescale(sceneB?.rescale_auto);
    if (!a || !b) return null;
    const lo = Math.min(a[0], b[0]);
    const hi = Math.max(a[1], b[1]);
    return hi > lo ? `${lo.toFixed(3)},${hi.toFixed(3)}` : null;
  }, [contrast, sceneA, sceneB]);
  const cmpRange = parseRescale(cmpRescale ?? fixedRescale);
  const meta = sensorMeta(sensor);

  // Compare only renders when there are two scenes to render; both bodies ask the same question.
  const compareReady = compare && sceneA != null && sceneB != null;
  const canCompare = visibleScenes.length >= 2;
  // The strip under the map (legend + cloud filter + dates) only exists once there is a picture.
  const stripAvailable = !noData && scenes.length > 0;

  // --- shared pieces ---------------------------------------------------------
  // Plain functions and nodes, never components declared during render: a component declared inside
  // a render is a NEW type on every render, so React would unmount and rebuild its subtree —
  // including the MapLibre canvas.

  // ONE picker element for the whole section, rendered in ONE seat at a time (never two — the id and
  // the ten /scenes reads must not be duplicated). `sheet` portals to body, so where it sits in the
  // tree is irrelevant; `panel` is in flow and belongs under the button that opened it.
  const picker = (
    <LayerPicker
      fieldId={field.id}
      indices={SENSOR_INDICES[sensor]}
      index={index}
      onSelect={setIndex}
      open={openPicker !== null}
      onClose={() => setOpenPicker(null)}
      variant={pickerVariant}
      seed={layerPreviewFresh ? {
        index,
        tileUrl: newestScene?.tile_url ?? null,
        date: newestScene?.date ?? null,
        value: newestScene?.value ?? null,
      } : null}
      // Contrast is a render MODE of the chosen layer, not a separate thing to find in the
      // map header. `contrast` never touches the seed — the tiles stay on the fixed range.
      mode={contrast ? "contrast" : "fixed"}
      onModeChange={(m) => setContrast(m === "contrast")}
      contrastAvailable={contrastAvailable}
      // Focus returns to the control that was actually pressed, not to whichever ref was declared
      // first: two triggers are live at once in the wide body.
      triggerRef={openPicker === "chart" ? chartTriggerRef : layerTriggerRef}
      id={pickerId}
    />
  );

  function layerTrigger(seat: "map" | "chart", className = "") {
    return (
      <LayerButton
        index={index}
        mode={contrast ? "contrast" : "fixed"}
        preview={layerPreviewFresh ? layerPreview : undefined}
        open={openPicker === seat}
        controlsId={pickerId}
        onClick={() => setOpenPicker((o) => (o === seat ? null : seat))}
        buttonRef={seat === "chart" ? chartTriggerRef : layerTriggerRef}
        className={className}
      />
    );
  }

  function cloudRow() {
    return (
      <>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Cloud className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0">{t("app.field.satelliteTab.maxCloud")}{maxCloud}%</span>
          <input type="range" min={10} max={100} step={5} value={maxCloud}
            onChange={(e) => setMaxCloud(Number(e.target.value))} className="w-full accent-emerald-600" />
        </div>
        {/* No icon: the Cloud icon already opens the row above and this line sits directly
            under it, so repeating it would be noise rather than a binding. */}
        <p className="mt-1 text-[11px] leading-snug text-slate-500">{t("app.field.satelliteTab.cloudWhy")}</p>
      </>
    );
  }

  function sceneStrip() {
    return (
      <>
        <p className="mt-2 text-xs text-slate-500">{t("app.field.satelliteTab.selectSceneDate")}</p>
        {visibleScenes.length === 0 ? (
          <p className="mt-1 text-xs text-amber-600">{t("app.field.satelliteTab.noCleanScene")}</p>
        ) : (
          <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
            {visibleScenes.map((s, i) => {
              const d = sceneDeltas[i];
              return (
                <button key={s.scene_id} type="button"
                  title={`${s.date}`
                    + (s.value != null ? ` · ${indexLabel(index)}: ${s.value.toFixed(3)}` : "")
                    + (d != null ? ` · ${t("app.field.satelliteTab.vsPrevDate")} ${fmtDelta(d)}` : "")
                    + (s.cloud_pct != null ? ` · ${t("app.field.satelliteTab.cloud")} ${s.cloud_pct.toFixed(0)}%` : "")}
                  onClick={() => setSceneIdx(i)}
                  className={`flex min-h-[44px] shrink-0 flex-col items-start justify-center gap-0.5 rounded-md border px-2.5 py-1 text-xs leading-tight ${
                    i === sceneIdx ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    {s.date.slice(5)}
                    {s.cloud_pct != null && <span className="text-slate-400">☁{s.cloud_pct.toFixed(0)}%</span>}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                    <span>{s.value != null ? s.value.toFixed(2) : "—"}</span>
                    {d != null && <span className={deltaClass(index, d)}>{fmtDelta(d)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // "This sensor is still preparing" / "nothing yet" — or, once scenes exist but none rendered,
  // the quieter one-liner. Null when there is a picture to look at.
  function emptyBlock() {
    if (noData) {
      return (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="font-medium text-emerald-800">
            {preparing ? `${meta.label} ${t("app.field.satelliteTab.preparing")}` : `${meta.label} ${t("app.field.satelliteTab.noDataYet")}`}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            {t("app.field.glance.preparing")}
          </p>
        </div>
      );
    }
    if (scenes.length === 0) {
      return <p className="mt-3 text-xs text-slate-400">{t("app.field.satelliteTab.noRasterYet")}</p>;
    }
    return null;
  }

  // The two-date compare, at whichever height the body it lands in can afford. CompareMap builds
  // itself once at that size, so the class is passed in rather than chosen here.
  function compareBody(heightClass: string) {
    if (!sceneA || !sceneB) return null;
    return (
      <>
        <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">{t("app.field.satelliteTab.leftDate")}</span>
            <select className="input" value={cmpA} onChange={(e) => setCmpA(Number(e.target.value))}>
              {visibleScenes.map((s, i) => (
                <option key={s.scene_id} value={i}>{sceneOptionLabel(s)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">{t("app.field.satelliteTab.rightDate")}</span>
            <select className="input" value={cmpB} onChange={(e) => setCmpB(Number(e.target.value))}>
              {visibleScenes.map((s, i) => (
                <option key={s.scene_id} value={i}>{sceneOptionLabel(s)}</option>
              ))}
            </select>
          </label>
        </div>
        <CompareMap key={`${sceneA.scene_id}|${sceneB.scene_id}`} polygon={field.geom}
          leftUrl={cmpRescale ? withRescale(sceneA.tile_url, cmpRescale) : sceneA.tile_url}
          rightUrl={cmpRescale ? withRescale(sceneB.tile_url, cmpRescale) : sceneB.tile_url}
          leftLabel={sceneA.date} rightLabel={sceneB.date} heightClass={heightClass} />
        <IndexLegend index={index} range={cmpRange} auto={cmpRescale != null} />
        <p className="mt-2 text-xs text-slate-400">{t("app.field.satelliteTab.compareHint")}</p>
      </>
    );
  }

  const summaryNode = summaryRows.length > 0 ? (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{t("app.field.satelliteTab.currentIndicators")}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {normsCrop?.calibrated && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
              title={t("app.field.satelliteTab.calibratedTitle")}>🎯 {t("app.field.satelliteTab.cropCalibrated")}</span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{meta.short}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaryRows.map(({ entry, value, status: st, note, tone }) => (
          <div key={entry.index} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-slate-700">{indexLabel(entry.index)}</span>
              <span className="shrink-0 font-mono text-sm text-slate-800">{value.toFixed(3)}</span>
            </div>
            <div className="mt-1.5">
              <StatusChip tone={tone} label={st} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
            {entry.date && <p className="mt-1 text-[11px] text-slate-400">{entry.date}</p>}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // SAY HOW MANY PIXELS, not just "small". The banner told a farmer their field was "very small"
  // and the result "approximate" — true, but unfalsifiable, and it named no limit they could
  // reason about. At 10 m a hectare is 100 pixels, so the honest version is arithmetic the farmer
  // can check against their own map. This is the whole reason the research document lists small
  // parcels as existential for Azerbaijan: the average holding here is well under the 3 ha where
  // 10 m imagery is comfortable.
  const nominalPixels = field.area_ha != null ? Math.round(field.area_ha * 100) : null;
  // "Why hasn't my field updated?" belongs beside the date strip, in BOTH bodies — so it rides the
  // banner slot the two layouts already share rather than being placed twice. CoverageNote renders
  // nothing when it has nothing to say, so the slot stays empty exactly as often as before.
  const coverageNode = <CoverageNote fieldId={field.id} />;

  const smallBannerInner = showSmallBanner ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {smallField
        ? `${t("app.field.satelliteTab.smallFieldPre")}${formatArea(field.area_ha, areaUnit)}${t("app.field.satelliteTab.smallFieldPost")}`
        : `${t("app.field.satelliteTab.smallHlsPre")}${formatArea(field.area_ha, areaUnit)}${t("app.field.satelliteTab.smallHlsPost")}`}
      {nominalPixels != null && (
        <span className="mt-1 block text-[12.5px] opacity-90">
          {tf("app.field.satelliteTab.pixelCount", { n: nominalPixels })}
        </span>
      )}
    </div>
  ) : null;

  const smallBannerNode = (
    <>
      {smallBannerInner}
      {coverageNode}
    </>
  );

  // --- bodies ----------------------------------------------------------------

  if (layout === "unknown") {
    // ONE frame. Building the narrow tree here would construct a MapLibre map on a wide screen and
    // tear it straight down the moment the measurement lands — see workbench/useStageWidth.
    return <div className="h-[560px] animate-pulse rounded-xl bg-paper-2" aria-hidden="true" />;
  }

  if (layout === "wide") {
    return (
      <SatelliteWorkbench
        meta={meta}
        banner={smallBannerNode}
        polygon={field.geom}
        rasterUrl={rasterUrl}
        index={index}
        onIndex={setIndex}
        layerIndices={SENSOR_INDICES[sensor]}
        compare={compareReady}
        canCompare={canCompare}
        // Compare replaces the whole map stage, and the picker's "map" seat lives inside it — so the
        // seat disappears while the state still says open, and the next press of the map trigger
        // (which is also gone) is not available to close it. Close it here instead.
        onToggleCompare={() => { setOpenPicker(null); setCompare((c) => !c); }}
        compareNode={compareReady ? compareBody("h-[520px]") : null}
        legendNode={
          stripAvailable ? <IndexLegend index={index} range={activeRange} auto={contrastOnActive} /> : null
        }
        cloudNode={stripAvailable ? cloudRow() : null}
        sceneStripNode={stripAvailable ? sceneStrip() : null}
        emptyNode={emptyBlock()}
        attribution={t("app.field.glance.attribution")}
        mapLayerButton={layerTrigger("map")}
        mapLayerPanel={openPicker === "map" ? picker : null}
        chart={{
          index,
          measured: measuredPoints,
          bench: benchSeries,
          forecastPoints: activeForecast?.points ?? [],
          forecastLabel: hasForecast ? forecastLabel : null,
          scenes: visibleScenes,
          sceneIdx,
          onSelectScene: setSceneIdx,
          // The FIXED family range, never the per-scene contrast stretch: a time series must have
          // ONE colour domain across every date on it, or the same value changes colour as the
          // reader steps through the season. The legend under the map still reports whichever
          // stretch the pixels are actually on.
          rampDomain: parseRescale(fixedRescale),
          lineColor: meta.color,
          range,
          onRange: setRange,
          axisLocked,
          onToggleLock: () => setAxisLocked((v) => !v),
          fullscreen: chartFullscreen,
          // Close the picker on the way in. Its "map" seat is in flow under the map, which the
          // fullscreen frame covers completely — leaving it open would strand an open disclosure
          // behind an overlay, reachable only by guessing at Escape.
          onOpenFullscreen: () => {
            setOpenPicker(null);
            onOpenChartFullscreen?.();
          },
          onCloseFullscreen: onCloseChartFullscreen ?? (() => {}),
          layerControl: layerTrigger("chart"),
          layerPanel: openPicker === "chart" ? picker : undefined,
          loading,
        }}
        summaryNode={summaryNode}
      />
    );
  }

  // NARROW — the stacked tree this section has always rendered. Unchanged in structure and in
  // behaviour; only the repeated blocks now come from the shared builders above.
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <span className="text-xs text-slate-500">{meta.note}</span>
      </div>

      {smallBannerNode}

      {summaryNode}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left — index selector + time series (this sensor) */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800">{t("idx.title")}</h3>
            {/* The farmer's own numbers, downloadable. Free by decision, and client-side because
                `series` below IS the file — a backend route would re-fetch what we already hold. */}
            {series && series.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    `${field.name || "field"}-${index}.csv`,
                    seriesToCSV(series, {
                      date: t("idx.csvColDate"),
                      sensor: t("idx.csvColSensor"),
                      mean: t("idx.csvColMean"),
                    }),
                    "text/csv;charset=utf-8",
                  )
                }
                className="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t("idx.csvDownload")}
              </button>
            )}
          </div>
          {/* W4 — a <select> of ten codes told a farmer nothing; the picker shows the field itself
              in each layer. Not a <label>, because the control it opens is a button, not a form
              field. */}
          <div className="mb-4">
            <p className="label">{t("idx.select")}</p>
            {layerTrigger("map", "w-full")}
            {picker}
            {/* The explanation of the CURRENT choice stays on screen while the picker is closed —
                every tile inside the picker carries its own copy, so repeating it there would be
                the same sentence twice. */}
            {openPicker === null && indexInfo(index) && (
              <p className="mt-2 text-xs text-slate-500">{indexInfo(index)}</p>
            )}
          </div>

          {loading ? (
            <Spinner />
          ) : !hasSeries ? (
            <Placeholder>{t("idx.noData")}</Placeholder>
          ) : (
            <>
            {hasForecast && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: FORECAST_LINE }} />
                  {forecastLabel}
                </span>
                <p className="mt-1 text-[11px] text-slate-400">{t("app.field.forecast.disclaimer")}</p>
              </div>
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) => (typeof d === "string" ? d.slice(5) : d)} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={44} />
                  <Tooltip formatter={(v: number | string, name: string) => [typeof v === "number" ? v.toFixed(3) : v, name]} />
                  {/* District p10–p90 spread (drawn first so it sits behind the lines). */}
                  {hasBenchmark && (
                    <Area type="monotone" dataKey="benchBand" name={t("app.field.satelliteTab.regionSpread")}
                      fill="#fef3c7" stroke="none" connectNulls isAnimationActive={false} />
                  )}
                  {/* Projection uncertainty, drawn behind the lines like the district spread. It
                      widens with horizon on purpose — the further out, the less the method knows. */}
                  {hasForecast && (
                    <Area type="monotone" dataKey="forecastBand" name={t("app.field.forecast.band")}
                      fill={FORECAST_BAND} stroke="none" connectNulls isAnimationActive={false} />
                  )}
                  {/* In-field p10–p90 spread. Written for every sensor by persist_scene, so this is
                      no longer gated on HLS — that gate would have deleted the band from the UI the
                      moment NASA stopped being shown. */}
                  <Line type="monotone" dataKey="p90" name="p90" stroke="#a7f3d0" strokeWidth={1} dot={false} connectNulls />
                  <Line type="monotone" dataKey="p10" name="p10" stroke="#a7f3d0" strokeWidth={1} dot={false} connectNulls />
                  {hasBenchmark && (
                    <Line type="monotone" dataKey="benchmark" name={t("app.field.satelliteTab.regionMean")} stroke="#f59e0b"
                      strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                  )}
                  <Line type="monotone" dataKey="mean" name={meta.short}
                    stroke={meta.color} strokeWidth={2} dot={{ r: 2, fill: meta.color }} connectNulls />
                  {/* Dashed, dotless and pale — everything about it says "not a measurement". */}
                  {hasForecast && (
                    <Line type="monotone" dataKey="forecast" name={t("app.field.forecast.line")}
                      stroke={FORECAST_LINE} strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4" style={{ background: meta.color }} /> {meta.short}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4" style={{ background: "#a7f3d0" }} /> {t("app.field.satelliteTab.inFieldMinMax")}
                </span>
                {hasBenchmark && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-0.5 w-4" style={{ background: "#f59e0b" }} /> {t("app.field.satelliteTab.otherFieldsMean")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "#fef3c7" }} /> {t("app.field.satelliteTab.regionSpread")}
                    </span>
                  </>
                )}
                {hasForecast && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: FORECAST_LINE }} /> {t("app.field.forecast.line")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: FORECAST_BAND }} /> {t("app.field.forecast.band")}
                    </span>
                  </>
                )}
              </div>
            </div>
            </>
          )}
        </div>

        {/* Right — map with raster overlay + scene timeline / compare */}
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-800">{field.name}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {!compare && activeScene && (
                <span className="text-xs text-slate-500">
                  {activeScene.date}
                  {activeScene.value != null && ` · ${activeScene.value.toFixed(2)}`}
                  {activeScene.cloud_pct != null && ` · ☁ ${activeScene.cloud_pct.toFixed(0)}%`}
                </span>
              )}
              {/* Contrast used to be a button here. It is now a render mode INSIDE the layer
                  picker, where the layer it re-stretches is chosen — and it is not hidden by the
                  move: LayerButton prints " · Kontrast" while it is on. */}
              {canCompare && (
                <button type="button" onClick={() => setCompare((c) => !c)} title={t("app.field.satelliteTab.compareTitle")}
                  className={`inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                    compare ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <GitCompareArrows className="h-3.5 w-3.5 shrink-0" /> {t("app.field.satelliteTab.compareBtn")}
                </button>
              )}
            </div>
          </div>

          {/* Compare is the only mode left in this row, so the guard is now just its own render
              guard — a hint can never appear without the control it explains. The line repeats the
              button's icon so the eye binds line → button across the wrapping row. Once compare is
              engaged, compareHint below takes over and says how to USE it; never both.
              The contrast hint split when the control moved: contrastWhy (why you would turn it on)
              sits under the mode buttons inside the layer picker, while what the map is ACTUALLY
              stretched to — contrastOnHint / fixedRangeHint — is printed once, by IndexLegend,
              directly under the picture it describes. Printing both in both places put the same two
              sentences on screen twice whenever the picker was open beside the map. */}
          {canCompare && !compare && (
            <div className="mb-3 space-y-1">
              <ModeHint icon={<GitCompareArrows className="mt-0.5 h-3 w-3 shrink-0" />}
                text={t("app.field.satelliteTab.compareWhy")} />
            </div>
          )}

          {compareReady ? (
            compareBody("h-72")
          ) : (
            <>
              <DisplayMap polygon={field.geom} rasterUrl={rasterUrl} />

              {emptyBlock()}
              {stripAvailable && (
                <>
                  <IndexLegend index={index} range={activeRange} auto={contrastOnActive} />
                  {cloudRow()}
                  {sceneStrip()}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
