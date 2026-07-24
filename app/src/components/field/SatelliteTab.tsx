"use client";

// Per-sensor satellite view — one instance for Sentinel-2 (10m) and one for NASA HLS (30m),
// each its OWN top-level tab (no in-tab sensor toggle anymore). Shows that sensor's raster map
// + scene timeline + two-date compare + time series + current-indicator card. If the sensor has
// no data yet it shows a focused "still preparing / see the other tab" note instead of silently
// falling back to the other sensor (that fallback is suppressed here on purpose).

import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { GitCompareArrows, Cloud, Contrast } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { DisplayMap, CompareMap } from "@/components/FieldMap";
import { Placeholder, Spinner } from "@/components/ui";
import {
  type Sensor, SENSOR_META, SENSOR_PARAM, sensorFamily, indexAvailable, SENSOR_INDICES,
  AREA_MIN_S2, AREA_MIN_HLS,
} from "@/lib/sensors";
import {
  INDEX_LABELS, INDEX_INFO, legendFor, interpret,
  type IndexNorms,
} from "@/lib/indexStatus";
import StatusChip from "@/components/StatusChip";
import { useFieldDataStatus } from "@/lib/useFieldDataStatus";
import type {
  FieldDetail, IndexPoint, IndexSeries, IndexBenchmark, RasterScene, RasterScenes,
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

const SUMMARY_INDICES = ["NDVI", "NDRE", "NDMI", "NDWI", "EVI", "SAVI", "NBR"];

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
          ? "Kontrast açıq: rənglər bu tarixin öz aralığına görə gərilib — fərqlər daha aydın, amma tarixlər arasında rəng müqayisə edilə bilməz."
          : "Sabit aralıq: rənglər bütün tarixlərdə eyni mənanı verir."}
      </p>
    </div>
  );
}

export default function SatelliteTab({ field, sensor }: { field: FieldDetail; sensor: Sensor }) {
  const firstIndex = SENSOR_INDICES[sensor][0] ?? "NDVI";
  const [index, setIndex] = useState("NDVI");
  const [series, setSeries] = useState<IndexPoint[] | null>(null);
  const [benchmark, setBenchmark] = useState<Record<string, { p50: number; p10?: number; p90?: number }>>({});
  const [scenes, setScenes] = useState<Scene[]>([]);
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

  // Time series (both sensors, tagged) + regional benchmark.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [ser, bm] = await Promise.all([
          api.get<IndexSeries>(`/api/fields/${field.id}/indices?index=${index}`),
          api.get<IndexBenchmark>(`/api/fields/${field.id}/indices/benchmark?index=${index}`).catch(() => null),
        ]);
        if (!active) return;
        setSeries(ser?.series ?? []);
        const bench: Record<string, { p50: number; p10?: number; p90?: number }> = {};
        for (const p of bm?.series ?? []) bench[weekKey(p.date)] = { p50: p.mean, p10: p.p10, p90: p.p90 };
        setBenchmark(bench);
      } catch {
        if (!active) return;
        setSeries([]); setBenchmark({});
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [field.id, index, ready]);

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
        setSceneIdx(0);
      } catch {
        if (!active) return;
        setScenes([]); setNoData(true); setFixedRescale(null);
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

  // A2 — per-scene delta vs the previous (older) scene IN THE VISIBLE list, so the number
  // matches what the farmer actually sees after the cloud filter. Scenes are newest-first.
  const sceneDeltas = useMemo(
    () => visibleScenes.map((s, i) => {
      const prev = visibleScenes[i + 1];
      if (s.value == null || prev?.value == null) return null;
      return s.value - prev.value;
    }),
    [visibleScenes]);

  // Pivot the two-sensor series → this sensor's line + weekly benchmark.
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, unknown>>();
    for (const p of series ?? []) {
      if (sensorFamily(p.sensor) !== sensor) continue;
      const row = byDate.get(p.date) ?? { date: p.date };
      row.mean = p.mean;
      if (sensor === "HLS") { row.p10 = p.p10 ?? null; row.p90 = p.p90 ?? null; }
      byDate.set(p.date, row);
    }
    const hasBench = Object.keys(benchmark).length > 0;
    return Array.from(byDate.values())
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
  }, [series, benchmark, sensor]);

  const hasBenchmark = Object.keys(benchmark).length > 0;
  const hasSeries = chartData.length > 0;

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
  const meta = SENSOR_META[sensor];
  const otherTab = sensor === "S2" ? "NASA (30m)" : "Sentinel-2 (10m)";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <span className="text-xs text-slate-500">{meta.note}</span>
      </div>

      {showSmallBanner && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {smallField
            ? `Sahə çox kiçikdir (${field.area_ha} ha). Piksel-səviyyəli analiz üçün nəticələr yalnız bir neçə peyk pikselinə əsaslanır və təxminidir.`
            : `Bu sahə (${field.area_ha} ha) HLS 30m üçün kiçikdir — sahəyə cəmi bir neçə piksel düşür. Sentinel-2 (10m) tabına baxın.`}
        </div>
      )}

      {summaryRows.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800">Cari göstəricilər</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {normsCrop?.calibrated && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                  title="Status etiketləri bu bitki növü üçün kalibrlənib.">🎯 Bitkiyə uyğun</span>
              )}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{meta.short}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaryRows.map(({ entry, value, status: st, note, tone }) => (
              <div key={entry.index} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-700">{INDEX_LABELS[entry.index] ?? entry.index}</span>
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
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left — index selector + time series (this sensor) */}
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-800">{t("idx.title")}</h3>
          <label className="label">{t("idx.select")}</label>
          <select className="input" value={index} onChange={(e) => setIndex(e.target.value)}>
            {SENSOR_INDICES[sensor].map((ix) => (
              <option key={ix} value={ix}>{INDEX_LABELS[ix] ?? ix}</option>
            ))}
          </select>
          {INDEX_INFO[index] && <p className="mb-4 mt-2 text-xs text-slate-500">{INDEX_INFO[index]}</p>}

          {loading ? (
            <Spinner />
          ) : !hasSeries ? (
            <Placeholder>{t("idx.noData")}</Placeholder>
          ) : (
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
                    <Area type="monotone" dataKey="benchBand" name="Bölgə yayılması (p10–p90)"
                      fill="#fef3c7" stroke="none" connectNulls isAnimationActive={false} />
                  )}
                  {sensor === "HLS" && (
                    <>
                      <Line type="monotone" dataKey="p90" name="p90" stroke="#a7f3d0" strokeWidth={1} dot={false} connectNulls />
                      <Line type="monotone" dataKey="p10" name="p10" stroke="#a7f3d0" strokeWidth={1} dot={false} connectNulls />
                    </>
                  )}
                  {hasBenchmark && (
                    <Line type="monotone" dataKey="benchmark" name="Bölgə ortası" stroke="#f59e0b"
                      strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                  )}
                  <Line type="monotone" dataKey="mean" name={meta.short}
                    stroke={meta.color} strokeWidth={2} dot={{ r: 2, fill: meta.color }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4" style={{ background: meta.color }} /> {meta.short}
                </span>
                {sensor === "HLS" && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4" style={{ background: "#a7f3d0" }} /> Sahədaxili min–maks
                  </span>
                )}
                {hasBenchmark && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-0.5 w-4" style={{ background: "#f59e0b" }} /> Digər sahələrin ortası
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "#fef3c7" }} /> Bölgə yayılması (p10–p90)
                    </span>
                  </>
                )}
              </div>
            </div>
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
              {contrastAvailable && (
                <button type="button" onClick={() => setContrast((c) => !c)}
                  title={contrast
                    ? "Sabit rəng aralığına qayıt (tarixlər müqayisə edilə bilsin)"
                    : "Kontrastı artır — rənglər bu tarixin öz aralığına görə gərilir"}
                  className={`inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                    contrast ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Contrast className="h-3.5 w-3.5 shrink-0" /> Kontrast
                </button>
              )}
              {visibleScenes.length >= 2 && (
                <button type="button" onClick={() => setCompare((c) => !c)} title="İki tarixi müqayisə et"
                  className={`inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                    compare ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <GitCompareArrows className="h-3.5 w-3.5 shrink-0" /> Müqayisə
                </button>
              )}
            </div>
          </div>

          {compare && sceneA && sceneB ? (
            <>
              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-500">Sol tarix</span>
                  <select className="input" value={cmpA} onChange={(e) => setCmpA(Number(e.target.value))}>
                    {visibleScenes.map((s, i) => (
                      <option key={s.scene_id} value={i}>{sceneOptionLabel(s)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-500">Sağ tarix</span>
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
                leftLabel={sceneA.date} rightLabel={sceneB.date} />
              <IndexLegend index={index} range={cmpRange} auto={cmpRescale != null} />
              <p className="mt-2 text-xs text-slate-400">Ortadakı dəstəyi sürüşdürün — sol/sağ tarixi tutuşdurun.</p>
            </>
          ) : (
            <>
              <DisplayMap polygon={field.geom} rasterUrl={rasterUrl} />

              {noData ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="font-medium text-emerald-800">
                    {preparing ? `${meta.label} hazırlanır…` : `${meta.label} üçün hələ məlumat yoxdur`}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {sensor === "S2"
                      ? `Yüksək dəqiqlikli Sentinel-2 səhnəsi bu sahə üçün hələ hazırlanır. Hazır olan məlumatı görmək üçün “${otherTab}” tabına keçin.`
                      : `Bu indeks üçün NASA (30m) rasteri hələ yoxdur. “${otherTab}” tabına baxın.`}
                  </p>
                </div>
              ) : scenes.length > 0 ? (
                <>
                  <IndexLegend index={index} range={activeRange} auto={contrastOnActive} />
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Cloud className="h-3.5 w-3.5 shrink-0" />
                    <span className="shrink-0">Maks. bulud: {maxCloud}%</span>
                    <input type="range" min={10} max={100} step={5} value={maxCloud}
                      onChange={(e) => setMaxCloud(Number(e.target.value))} className="w-full accent-emerald-600" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Peyk tarixi seçin:</p>
                  {visibleScenes.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-600">Bu bulud həddində təmiz səhnə yoxdur — həddi artırın.</p>
                  ) : (
                    <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                      {visibleScenes.map((s, i) => {
                        const d = sceneDeltas[i];
                        return (
                          <button key={s.scene_id} type="button"
                            title={`${s.date}`
                              + (s.value != null ? ` · ${INDEX_LABELS[index] ?? index}: ${s.value.toFixed(3)}` : "")
                              + (d != null ? ` · əvvəlki tarixə görə ${fmtDelta(d)}` : "")
                              + (s.cloud_pct != null ? ` · bulud ${s.cloud_pct.toFixed(0)}%` : "")}
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
              ) : (
                <p className="mt-3 text-xs text-slate-400">Bu indeks üçün hələ raster yoxdur.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
