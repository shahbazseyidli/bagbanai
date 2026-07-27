"use client";

// The index chart panel — the piece under the satellite map on the desktop field screen.
//
// It answers one question in four controls: WHICH date am I looking at (the big date + the
// stepper), OVER WHAT SPAN (the range strip + the resolved range), IN WHICH LAYER (the Layers
// button, which is the caller's picker trigger — this panel plots whatever index the map is on),
// and HOW MUCH of a change is that really (the lock toggle).
//
// Everything is by prop. The panel fetches nothing: SatelliteTab is the single read model for this
// section, and a chart with its own /indices call would drift from the map beside it within one tap.
//
// PURE PRESENTATION EXCEPT FOR THE Y AXIS, which is a claim about magnitude and therefore has a
// rule of its own — see `locked` below.

import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Lock, LockOpen, Maximize2, X } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { indexLabel } from "@/lib/indexStatus";
import { lockScroll } from "@/lib/scrollLock";
import { Placeholder } from "@/components/ui";
import ChartTooltip, { type ChartRow } from "./ChartTooltip";
import {
  RANGES, RANGE_LABEL_KEY, fmtDate, fmtTick, ticksFor, todayTs, tsOf, windowOf,
  type RangeKey,
} from "./chartRange";
import { gradientStops, rampFamily, valueColor } from "./valueRamp";

// The projection's palette, ported unchanged from the stacked chart: a washed-out tint of the
// measured line's blue, never the colour itself, so the dashes plus the pallor make it impossible to
// mistake for a scene that exists.
const FORECAST_LINE = "#93c5fd"; // blue-300
const FORECAST_BAND = "#dbeafe"; // blue-100
const BENCH_LINE = "#f59e0b";    // amber-500 — the district median
const BENCH_BAND = "#fef3c7";    // amber-100 — its p10–p90 spread
const SPREAD_LINE = "#a7f3d0";   // emerald-200 — the field's OWN p10/p90

// Plot geometry. Fixed numbers, because the gradient below is arithmetic ON them: the vertical
// colour ramp is a userSpaceOnUse gradient spanning the plot rect, and the plot rect is exactly
// [CHART_TOP, height − X_AXIS_H]. A responsive height would have to be measured to keep the two in
// step, and a mismatch does not throw — it silently shifts every colour.
const CHART_TOP = 8;
const CHART_RIGHT = 12;
const X_AXIS_H = 24;
const Y_AXIS_W = 46;
const CHART_H = 300;
const CHART_H_FULL = 560;

export interface MeasuredPoint {
  date: string;
  mean: number | null;
  p10?: number | null;
  p90?: number | null;
}

export interface BenchPoint {
  date: string;
  mean: number;
  p10?: number;
  p90?: number;
}

export interface ForecastPoint {
  date: string;
  value: number;
  lo: number;
  hi: number;
}

/** The slice of a /scenes row the chart needs. Structural on purpose — the panel must not depend
 *  on the section's own Scene type. */
export interface ChartScene {
  scene_id: string;
  date: string;
  cloud_pct: number | null;
  value?: number | null;
}

interface Props {
  index: string;
  /** This sensor's measured series, ascending by date. */
  measured: MeasuredPoint[];
  /** District/peer weekly benchmark; [] when the tier or the k-anonymity threshold withholds it. */
  bench: BenchPoint[];
  /** The projection's points; [] unless the caller already vetted method + sensor. */
  forecastPoints: ForecastPoint[];
  /** The named method, or null — null means nothing dashed is drawn at all. */
  forecastLabel: string | null;
  /** The cloud-filtered scene list, NEWEST FIRST — the same list the map's date strip walks. */
  scenes: ChartScene[];
  sceneIdx: number;
  onSelectScene: (i: number) => void;
  /** The map's own rescale domain, parsed from /scenes. null ⇒ no ramp and no lock toggle. */
  rampDomain: [number, number] | null;
  /** Stroke used when there is no ramp domain to colour by. */
  lineColor: string;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
  axisLocked: boolean;
  onToggleLock: () => void;
  fullscreen: boolean;
  onOpenFullscreen: () => void;
  onCloseFullscreen: () => void;
  /** The caller's ONE LayerButton for this position (see SatelliteWorkbench: one picker, two seats). */
  layerControl: ReactNode;
  /** The picker itself, when it is currently seated under this panel's header. */
  layerPanel?: ReactNode;
  loading?: boolean;
}

function fmtValue(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(3);
}

export default function IndexChartPanel({
  index,
  measured,
  bench,
  forecastPoints,
  forecastLabel,
  scenes,
  sceneIdx,
  onSelectScene,
  rampDomain,
  lineColor,
  range,
  onRange,
  axisLocked,
  onToggleLock,
  fullscreen,
  onOpenFullscreen,
  onCloseFullscreen,
  layerControl,
  layerPanel,
  loading = false,
}: Props) {
  const family = rampFamily(index);
  const indexName = indexLabel(index);
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const gradId = `idx-line-${uid}`;

  // document does not exist on the server, and the fullscreen frame is a portal into document.body.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The caller rebuilds its close handler every render (it reads searchParams), so the key listener
  // below holds it through a ref rather than reinstalling itself on every keystroke elsewhere.
  // Same shape as FieldMapCard's.
  const closeRef = useRef(onCloseFullscreen);
  closeRef.current = onCloseFullscreen;

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    // The SHARED ref-counted lock, never a private save/restore: a LayerPicker sheet can be opened
    // from inside this frame, and the Android back gesture can pop ?chart=full first — release order
    // is not LIFO, which is the case save/restore gets permanently wrong. See lib/scrollLock.ts.
    const release = lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      release();
    };
  }, [fullscreen]);

  // Today is read once per mount: a value that changes mid-render would move the marker and the
  // window under the reader for no reason.
  const today = useMemo(() => todayTs(), []);

  const measuredPts = useMemo(() => {
    const out: { ts: number; mean: number | null; p10: number | null; p90: number | null }[] = [];
    for (const p of measured) {
      const ts = tsOf(p.date);
      if (ts == null) continue;
      out.push({ ts, mean: p.mean, p10: p.p10 ?? null, p90: p.p90 ?? null });
    }
    return out.sort((a, b) => a.ts - b.ts);
  }, [measured]);

  // ONE row per timestamp — the union of measured dates, benchmark week-Mondays and forecast dates.
  // A join on ISO-week keys (what the stacked chart does) would put the district line on the week's
  // first scene rather than on the week itself; on a true time axis the week's own Monday is a real
  // position, so it gets one.
  const rowsAll = useMemo(() => {
    const map = new Map<number, ChartRow>();
    const at = (ts: number): ChartRow => {
      let r = map.get(ts);
      if (!r) {
        r = {
          ts, mean: null, p10: null, p90: null,
          bench: null, benchBand: null, forecast: null, forecastBand: null, cloud: null,
        };
        map.set(ts, r);
      }
      return r;
    };
    for (const p of measuredPts) {
      const r = at(p.ts);
      r.mean = p.mean;
      r.p10 = p.p10;
      r.p90 = p.p90;
    }
    for (const b of bench) {
      const ts = tsOf(b.date);
      if (ts == null) continue;
      const r = at(ts);
      r.bench = b.mean;
      r.benchBand = b.p10 != null && b.p90 != null ? [b.p10, b.p90] : null;
    }
    for (const f of forecastPoints) {
      const ts = tsOf(f.date);
      if (ts == null || f.value == null) continue;
      const r = at(ts);
      r.forecast = f.value;
      r.forecastBand = f.lo != null && f.hi != null ? [f.lo, f.hi] : null;
    }
    // Cloud is attached only to rows that ALREADY exist: a scene whose stats never landed has no
    // measurement to hang a cloud percentage on, and inventing a row for it would put an empty
    // marker on the axis.
    for (const s of scenes) {
      const ts = tsOf(s.date);
      if (ts == null) continue;
      const r = map.get(ts);
      if (r) r.cloud = s.cloud_pct;
    }
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [measuredPts, bench, forecastPoints, scenes]);

  const hasMeasured = measuredPts.length > 0;
  // "All" starts at the oldest MEASUREMENT, not at the oldest row: the peer benchmark can reach
  // further back than this field's own record, and stretching the axis to cover other people's
  // history would shrink the farmer's own season to a corner.
  const minTs = measuredPts[0]?.ts ?? rowsAll[0]?.ts ?? today;
  const maxTs = rowsAll.length > 0 ? rowsAll[rowsAll.length - 1].ts : today;
  // The last REAL observation. `maxTs` includes the forecast, and every bounded range has to be
  // measured back from data rather than from a projection — see windowOf.
  const maxMeasuredTs = measuredPts.length > 0 ? measuredPts[measuredPts.length - 1].ts : undefined;

  const rangeCounts = useMemo(() => {
    const out = {} as Record<RangeKey, number>;
    for (const key of RANGES) {
      const [from, to] = windowOf(key, minTs, maxTs, today, maxMeasuredTs);
      out[key] = measuredPts.filter((p) => p.ts >= from && p.ts <= to).length;
    }
    return out;
  }, [measuredPts, minTs, maxTs, today, maxMeasuredTs]);

  // A stored range can go empty under the reader — switching to a layer with fewer scenes is enough
  // — so the EFFECTIVE range falls back to "all" rather than drawing a blank plot. Buttons whose own
  // window is empty are disabled, so this fallback is the only way to land here.
  const effRange: RangeKey = rangeCounts[range] > 0 ? range : "all";
  const [fromMs, toMs] = windowOf(effRange, minTs, maxTs, today, maxMeasuredTs);

  const rows = useMemo(
    () => rowsAll.filter((r) => r.ts >= fromMs && r.ts <= toMs),
    [rowsAll, fromMs, toMs],
  );
  const rowByTs = useMemo(() => new Map(rows.map((r) => [r.ts, r])), [rows]);
  const rowOf = useCallback((ts: number) => rowByTs.get(ts), [rowByTs]);

  const dataExtent = useMemo((): [number, number] | null => {
    let lo = Infinity;
    let hi = -Infinity;
    const see = (v: number | null) => {
      if (v == null || !Number.isFinite(v)) return;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    };
    for (const r of rows) {
      see(r.mean); see(r.p10); see(r.p90); see(r.bench); see(r.forecast);
      if (r.benchBand) { see(r.benchBand[0]); see(r.benchBand[1]); }
      if (r.forecastBand) { see(r.forecastBand[0]); see(r.forecastBand[1]); }
    }
    return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
  }, [rows]);

  // The lock has a real job.
  //
  // LOCKED (the default): the y-axis covers the map's own rescale domain, so a step on the chart is
  // the same size as the colour step on the picture above it. UNLOCKED: the axis fits this window,
  // so a quiet season becomes readable — at the cost of magnifying noise, which is exactly what the
  // two hint strings warn about.
  //
  // Without a rescale from /scenes there is nothing to lock TO, so the button is ABSENT rather than
  // disabled: never offer a choice we cannot honour (the same rule the layer picker applies to its
  // contrast mode). The domain is always unioned with the data, so a genuine 0.93 NDVI is never
  // clipped off the top of a locked axis.
  const lockAvailable = rampDomain != null;
  const locked = lockAvailable && axisLocked;

  const yDomain = useMemo((): [number, number] => {
    const ext = dataExtent ?? rampDomain ?? [0, 1];
    if (locked && rampDomain) {
      return [Math.min(rampDomain[0], ext[0]), Math.max(rampDomain[1], ext[1])];
    }
    const pad = Math.max((ext[1] - ext[0]) * 0.05, 0.01);
    return [ext[0] - pad, ext[1] + pad];
  }, [dataExtent, rampDomain, locked]);

  const axis = useMemo(() => ticksFor(fromMs, toMs), [fromMs, toMs]);
  const gradStops = useMemo(
    () => gradientStops(yDomain, rampDomain, family),
    [yDomain, rampDomain, family],
  );
  const strokeUrl = gradStops.length > 0 ? `url(#${gradId})` : lineColor;

  const selectedScene = scenes[sceneIdx] ?? scenes[0] ?? null;
  const selectedTs = tsOf(selectedScene?.date);

  const hasBench = rows.some((r) => r.bench != null);
  const hasForecast = forecastLabel != null && forecastPoints.length > 0;
  // Above ~90 points a dot per sample stops being a mark and becomes the line; the active dot on
  // hover still names every single one.
  const showDots = rows.filter((r) => r.mean != null).length <= 90;

  // Click anywhere on the plot → the NEAREST scene date, so a click can never be a dead no-op on a
  // week with no pass. Walks `scenes` (the cloud-filtered list) for the same reason the stepper
  // does: the selection the map honours is an index into that list.
  const snapToNearest = useCallback(
    (x: number) => {
      let best = -1;
      let bestGap = Infinity;
      for (let i = 0; i < scenes.length; i += 1) {
        const ts = tsOf(scenes[i].date);
        if (ts == null) continue;
        const gap = Math.abs(ts - x);
        if (gap < bestGap) { bestGap = gap; best = i; }
      }
      if (best >= 0) onSelectScene(best);
    },
    [scenes, onSelectScene],
  );

  // recharts calls this per point with a plain object (not a React element), so reading props.key
  // here is an ordinary property read, not the deprecated element-key access. It must return an
  // element for EVERY point — LineDot forbids null — hence the empty <g/> for a gap.
  // DELIBERATELY UNANNOTATED return type. Writing `: ReactElement` here fails the production build:
  // @types/react 19 changed the default type parameter from `any` to `unknown`
  // (`interface ReactElement<P = unknown>`), and `ReactElement<unknown>` is not assignable to
  // recharts' `LineDot`. The inferred `React.JSX.Element` is — `interface Element extends
  // ReactElement<any, any>` — so letting inference do it is both correct and the safer choice.
  // This Mac has no node, so the error only surfaces in the server `docker build web`.
  const dotRender = (p: {
    key?: string;
    cx?: number;
    cy?: number;
    value?: number;
    payload?: ChartRow;
  }) => {
    const v = p.payload?.mean ?? null;
    if (v == null || p.cx == null || p.cy == null) return <g key={p.key} />;
    const fill = valueColor(v, rampDomain, family) ?? lineColor;
    return (
      <circle
        key={p.key}
        cx={p.cx}
        cy={p.cy}
        r={2.6}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={0.8}
      />
    );
  };

  function chart(height: number) {
    const plotTop = CHART_TOP;
    const plotBottom = height - X_AXIS_H;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={rows}
          margin={{ top: CHART_TOP, right: CHART_RIGHT, bottom: 0, left: 0 }}
          onClick={(state) => {
            const x = Number(state?.activeLabel);
            if (Number.isFinite(x)) snapToNearest(x);
          }}
        >
          <defs>
            {/* userSpaceOnUse, spanning the plot rect — NOT objectBoundingBox. A bounding-box
                gradient would rescale red→green onto whatever this series happens to span and paint
                a field that never leaves 0.75–0.80 crimson. The stops are computed in data space
                against the map's own domain, so the colour is absolute. */}
            <linearGradient
              id={gradId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={plotTop}
              x2={0}
              y2={plotBottom}
            >
              {gradStops.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="ts"
            domain={[fromMs, toMs]}
            ticks={axis.ticks}
            height={X_AXIS_H}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => fmtTick(v, axis.mode)}
          />
          <YAxis
            domain={yDomain}
            width={Y_AXIS_W}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2))}
          />
          <Tooltip
            content={
              <ChartTooltip
                indexName={indexName}
                rowOf={rowOf}
                measuredColor={lineColor}
                forecastColor={FORECAST_LINE}
                benchColor={BENCH_LINE}
                bandColor={FORECAST_BAND}
              />
            }
          />

          {/* Bands first, so they sit behind every line. */}
          {hasBench && (
            <Area type="monotone" dataKey="benchBand" fill={BENCH_BAND} stroke="none"
              connectNulls isAnimationActive={false} />
          )}
          {hasForecast && (
            <Area type="monotone" dataKey="forecastBand" fill={FORECAST_BAND} stroke="none"
              connectNulls isAnimationActive={false} />
          )}

          {/* The field's OWN p10/p90 — the spread inside the boundary, not across fields. */}
          <Line type="monotone" dataKey="p90" stroke={SPREAD_LINE} strokeWidth={1} dot={false}
            connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="p10" stroke={SPREAD_LINE} strokeWidth={1} dot={false}
            connectNulls isAnimationActive={false} />
          {hasBench && (
            <Line type="monotone" dataKey="bench" stroke={BENCH_LINE} strokeWidth={1.5}
              strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />
          )}

          <Line
            type="monotone"
            dataKey="mean"
            stroke={strokeUrl}
            strokeWidth={2.2}
            dot={showDots ? dotRender : false}
            activeDot={{ r: 4, strokeWidth: 1.5, stroke: "#ffffff" }}
            connectNulls
            isAnimationActive={false}
          />

          {/* Dashed, dotless and pale — everything about it says "not a measurement". */}
          {hasForecast && (
            <Line type="monotone" dataKey="forecast" stroke={FORECAST_LINE} strokeWidth={2}
              strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />
          )}

          {today >= fromMs && today <= toMs && (
            <ReferenceLine
              x={today}
              stroke="#64748b"
              strokeDasharray="4 4"
              label={{ value: t("app.field.chart.today"), position: "insideTopRight", fontSize: 10, fill: "#64748b" }}
            />
          )}
          {selectedTs != null && selectedTs >= fromMs && selectedTs <= toMs && (
            <ReferenceLine x={selectedTs} stroke="#15803D" strokeWidth={1.5} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Plain functions, not nested components: a component declared during render is a new type on
  // every render, and React would unmount and rebuild the whole subtree underneath it.
  function header() {
    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
              {t("app.field.chart.selectedDate")}
            </p>
            <p className="font-display text-[26px] font-extrabold leading-tight tabular-nums text-ink">
              {fmtDate(selectedTs)}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {indexName}
              {selectedScene?.value != null && (
                <span className="ml-1.5 tabular-nums font-semibold text-ink">
                  {fmtValue(selectedScene.value)}
                </span>
              )}
              {selectedScene?.cloud_pct != null && (
                <span className="ml-1.5 tabular-nums">
                  · {t("app.field.glance.cloud")} {Math.round(selectedScene.cloud_pct)}%
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="tabular-nums text-[12px] text-ink-soft">
              {tf("app.field.chart.rangeLabel", { from: fmtDate(fromMs), to: fmtDate(toMs) })}
            </span>
            {layerControl}
            {lockAvailable && (
              <button
                type="button"
                onClick={onToggleLock}
                aria-pressed={locked}
                title={locked ? t("app.field.chart.lockedHint") : t("app.field.chart.unlockedHint")}
                aria-label={locked ? t("app.field.chart.unlockScale") : t("app.field.chart.lockScale")}
                className={`flex min-h-[var(--tap)] min-w-[var(--tap)] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                  locked ? "border-grass bg-mint-soft text-grass-deep" : "border-line bg-panel text-ink-soft hover:border-mint"
                }`}
              >
                {locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <LockOpen className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
            {!fullscreen && (
              <button
                type="button"
                onClick={onOpenFullscreen}
                aria-label={t("app.field.card.fullscreen")}
                title={t("app.field.card.fullscreen")}
                className="flex min-h-[var(--tap)] min-w-[var(--tap)] shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink-soft hover:border-mint hover:text-grass-deep"
              >
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div
            role="group"
            aria-label={t("app.field.chart.rangeAria")}
            className="flex gap-1 rounded-full border border-line bg-paper-2 p-1"
          >
            {RANGES.map((key) => {
              const empty = rangeCounts[key] === 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onRange(key)}
                  disabled={empty}
                  aria-pressed={effRange === key}
                  title={empty ? t("app.field.chart.rangeEmpty") : undefined}
                  className={`min-h-[var(--tap)] rounded-full px-2.5 text-[12px] font-bold ${
                    effRange === key
                      // grass-deep, not grass: white on #1E9852 is 3.6:1, below the floor D1 set
                      // for this product's sunlight-readability target. #14663A clears it at ~8:1.
                      ? "bg-grass-deep text-white"
                      : empty
                        ? "text-ink-soft opacity-40"
                        : "text-ink-soft hover:text-grass-deep"
                  }`}
                >
                  {tf(RANGE_LABEL_KEY[key])}
                </button>
              );
            })}
          </div>

          {/* Stepper. ◀/▶ are inverted against the array on purpose: `scenes` is newest-first, so
              "previous image" is one further DOWN the list. The middle button says "Son görüntü",
              never "Bu gün" — the newest pass is usually several days old, and only the chart's
              vertical marker is allowed to claim today. */}
          <div
            role="group"
            aria-label={t("app.field.chart.stepperAria")}
            className="flex items-center gap-1 rounded-full border border-line bg-panel p-1"
          >
            <button
              type="button"
              onClick={() => onSelectScene(sceneIdx + 1)}
              disabled={sceneIdx >= scenes.length - 1}
              aria-label={t("app.field.chart.prevScene")}
              title={t("app.field.chart.prevScene")}
              className="flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full text-ink-soft hover:text-grass-deep disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onSelectScene(0)}
              disabled={sceneIdx === 0 || scenes.length === 0}
              className="min-h-[var(--tap)] rounded-full px-2.5 text-[12px] font-bold text-ink-soft hover:text-grass-deep disabled:opacity-35"
            >
              {t("app.field.chart.latestScene")}
            </button>
            <button
              type="button"
              onClick={() => onSelectScene(sceneIdx - 1)}
              disabled={sceneIdx <= 0}
              aria-label={t("app.field.chart.nextScene")}
              title={t("app.field.chart.nextScene")}
              className="flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full text-ink-soft hover:text-grass-deep disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {layerPanel}
      </>
    );
  }

  function legend() {
    // Our own DOM, not recharts' <Legend>: a recharts legend is laid out INSIDE the chart height,
    // which would move the plot rect and silently break the gradient arithmetic above.
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-4" style={{ background: lineColor }} />
          {t("app.field.chart.measured")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-4" style={{ background: SPREAD_LINE }} />
          {t("app.field.satelliteTab.inFieldMinMax")}
        </span>
        {hasBench && (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: BENCH_LINE }} />
              {t("app.field.satelliteTab.otherFieldsMean")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: BENCH_BAND }} />
              {t("app.field.satelliteTab.regionSpread")}
            </span>
          </>
        )}
        {hasForecast && (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: FORECAST_LINE }} />
              {forecastLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: FORECAST_BAND }} />
              {t("app.field.forecast.band")}
            </span>
          </>
        )}
      </div>
    );
  }

  function body(height: number) {
    if (loading) {
      return (
        <div className="animate-pulse rounded-xl bg-paper-2" style={{ height }} aria-hidden="true" />
      );
    }
    if (!hasMeasured) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <Placeholder>{t("idx.noData")}</Placeholder>
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <Placeholder>{t("app.field.chart.rangeEmpty")}</Placeholder>
        </div>
      );
    }
    return (
      <>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {indexName}
          </span>
          <span className="text-[10.5px] text-ink-soft">{t("app.field.chart.clickHint")}</span>
        </div>
        {chart(height)}
        {legend()}
        {hasForecast && (
          <p className="mt-1 text-[10.5px] text-ink-soft">{t("app.field.forecast.disclaimer")}</p>
        )}
      </>
    );
  }

  const overlay =
    fullscreen && mounted
      ? createPortal(
          // Portalled to document.body for the same structural reason FieldMapCard's is: the field
          // page sits on AppShell's full-bleed track (grep `SHELL_BLEED` in AppShell.tsx — a
          // negative-margin calc whose breakpoint has moved before), and a `transform` / `filter` /
          // `backdrop-filter` ancestor turns position:fixed into an ordinary containing block, so
          // inset-0 would size to THAT ancestor instead. z-50 clears BottomNav
          // (z-40), Nav (z-30) and the rail/list panel (z-30); a LayerPicker sheet opened from in
          // here renders at z-[60], above this frame, by its own design.
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("app.field.chart.fullscreenAria")}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper"
          >
            <div className="flex items-start gap-2 border-b border-line bg-panel px-3 py-2 pt-[calc(env(safe-area-inset-top)_+_0.5rem)]">
              <div className="min-w-0 flex-1">{header()}</div>
              <button
                type="button"
                onClick={() => closeRef.current()}
                aria-label={t("app.field.card.exitFullscreen")}
                title={t("app.field.card.exitFullscreen")}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink hover:border-mint"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 px-3 pb-[calc(env(safe-area-inset-bottom)_+_1rem)] pt-2">
              {body(CHART_H_FULL)}
              <p className="mt-1 hidden text-[10.5px] text-ink-soft sm:block">
                {t("app.field.card.escHint")}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section
        aria-label={t("app.field.chart.panelAria")}
        className="rounded-xl border-[1.5px] border-line bg-panel p-3"
      >
        {fullscreen ? (
          // The overlay owns the chart; this box keeps its height so nothing below jumps when it
          // closes. Mount/unmount, never `hidden` — two live ResponsiveContainers measuring the same
          // data is work nobody sees.
          <div
            className="animate-pulse rounded-xl bg-paper-2"
            style={{ height: CHART_H }}
            aria-hidden="true"
          />
        ) : (
          <>
            {header()}
            {body(CHART_H)}
          </>
        )}
      </section>
      {overlay}
    </>
  );
}
