"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GitCompareArrows, Cloud } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { DisplayMap, CompareMap } from "@/components/FieldMap";
import { Placeholder, Spinner } from "@/components/ui";
import ClarificationBlock from "@/components/field/ClarificationBlock";
import {
  type Sensor,
  SENSOR_META,
  SENSOR_PARAM,
  sensorFamily,
  indexAvailable,
  AREA_MIN_S2,
  AREA_MIN_HLS,
} from "@/lib/sensors";
import type {
  FieldDetail,
  IndexPoint,
  IndexSeries,
  IndexBenchmark,
  RasterScene,
  RasterScenes,
  FieldDataStatus,
} from "@/lib/types";

const INDICES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI", "NDRE", "CIre"];

// Farmer-facing Azerbaijani labels (FarmerApp-style names).
const INDEX_LABELS: Record<string, string> = {
  NDVI: "Bitki sağlamlığı (NDVI)",
  EVI: "Gücləndirilmiş bitki (EVI)",
  SAVI: "Torpaq-düzəlişli (SAVI)",
  MSAVI: "Modifikasiyalı SAVI",
  NDMI: "Bitki nəmliyi (NDMI)",
  NDWI: "Su indeksi (NDWI)",
  NBR: "Yanğın indeksi (NBR)",
  NBR2: "Yanğın indeksi 2 (NBR2)",
  TVI: "Bitki örtüyü (TVI)",
  NDRE: "Red-edge sağlamlıq (NDRE)",
  CIre: "Xlorofil indeksi (CIre)",
};

// One-line plain-language explanation shown under the selector.
const INDEX_INFO: Record<string, string> = {
  NDVI: "Bitkinin yaşıllığı və ümumi sağlamlığı. Yüksək = sağlam, sıx bitki örtüyü.",
  EVI: "NDVI-yə bənzər, sıx örtükdə daha həssas. Yüksək = güclü bitki.",
  SAVI: "Seyrək örtükdə torpağın təsirini azaldır. Cavan/seyrək əkin üçün yaxşıdır.",
  MSAVI: "Torpaq-düzəlişli indeksin təkmilləşdirilmiş variantı (çox seyrək örtük).",
  NDMI: "Bitkidəki su miqdarı. Yüksək = nəm, aşağı = su stresi (susuzluq).",
  NDWI: "Səthdə su/rütubət. Yüksək = su var (sulanma, gölməçə).",
  NBR: "Yanğın/quru sahə göstəricisi. Aşağı dəyər yanmış və ya quru ərazini göstərir.",
  NBR2: "Yanğın göstəricisinin ikinci variantı (bitki quruluğuna həssas).",
  TVI: "Bitki örtüyünün sıxlığı (transformasiya olunmuş NDVI).",
  NDRE: "Red-edge indeksi (yalnız Sentinel-2). Sıx çətirdə NDVI doyanda belə fərqi göstərir; azot statusuna həssasdır.",
  CIre: "Xlorofil indeksi (red-edge, yalnız Sentinel-2). Azot/xlorofil qiymətləndirməsi üçün daha həssas.",
};

// Legend gradient + labels per index family (must match the TiTiler colormap on the map).
const INDEX_LEGEND: Record<string, { grad: string; low: string; mid: string; high: string }> = {
  veg: {
    grad: "linear-gradient(90deg,#d73027,#fee08b,#1a9850)",
    low: "Zəif",
    mid: "Orta",
    high: "Sağlam",
  },
  water: {
    grad: "linear-gradient(90deg,#b2182b,#f7f7f7,#2166ac)",
    low: "Quru",
    mid: "Orta",
    high: "Nəm",
  },
};

function legendFor(index: string) {
  return index === "NDMI" || index === "NDWI" ? INDEX_LEGEND.water : INDEX_LEGEND.veg;
}

// Latest-value summary (GET /api/fields/{id}/indices/summary).
interface IndexSummaryEntry {
  index: string;
  latest: number | null;
  date: string | null;
}
interface IndexSummary {
  sensor?: string;
  indices: IndexSummaryEntry[];
}

// Indices shown in the "Cari göstəricilər" card, in display order.
// NDRE surfaced in the at-a-glance card (E0) — S2-only; absent for HLS (no data → filtered out).
const SUMMARY_INDICES = ["NDVI", "NDRE", "NDMI", "NDWI", "EVI", "SAVI", "NBR"];

type Tone = "good" | "warn" | "bad";

// Tone → colored dot + status text classes.
const TONE: Record<Tone, { dot: string; text: string }> = {
  good: { dot: "bg-emerald-500", text: "text-emerald-700" },
  warn: { dot: "bg-amber-500", text: "text-amber-700" },
  bad: { dot: "bg-red-500", text: "text-red-700" },
};

// Per-crop calibration bands for the vegetation indices (M5), fetched from /norms.
// { NDVI: [e1,e2,e3,e4], EVI: [...], SAVI: [...] } — edges split the 5 status tiers.
type IndexNorms = Record<string, number[]>;

// Vegetation status from 4 band edges [e1,e2,e3,e4]: <e1 çox zəif, <e2 zəif, <e3 orta,
// <e4 sağlam, ≥e4 çox sağlam. Universal default [0.2,0.4,0.6,0.8] reproduces the old thresholds.
const VEG_TIERS: { status: string; note: string; tone: Tone }[] = [
  { status: "Çox zəif", note: "Çılpaq və ya çox seyrək örtük.", tone: "bad" },
  { status: "Zəif", note: "Seyrək bitki örtüyü.", tone: "warn" },
  { status: "Orta", note: "İnkişaf edən örtük.", tone: "warn" },
  { status: "Sağlam", note: "Sıx, sağlam bitki.", tone: "good" },
  { status: "Çox sağlam", note: "Çox sıx örtük.", tone: "good" },
];

// Plain-language status + one-line note for a raw index value. `norms` (per-crop, from the
// API) calibrates the vegetation indices; without it the universal edges are used.
function interpret(
  index: string,
  value: number,
  norms?: IndexNorms | null,
): { status: string; note: string; tone: Tone } {
  // Vegetation-family indices use the tiered band edges. NDRE shares NDVI-like scaling; CIre is a
  // larger ratio, so it needs its own crop norms (falls back to a red-edge default when absent).
  if (index === "NDVI" || index === "EVI" || index === "SAVI" || index === "NDRE" || index === "CIre") {
    const fallback = index === "CIre" ? [0.5, 1.0, 1.8, 2.8] : [0.2, 0.4, 0.6, 0.8];
    const edges = norms?.[index] ?? fallback;
    let tier = 0;
    while (tier < edges.length && value >= edges[tier]) tier += 1;
    return VEG_TIERS[Math.min(tier, VEG_TIERS.length - 1)];
  }
  if (index === "NDMI") {
    if (value < 0) return { status: "Çox quru", note: "Su stresi.", tone: "bad" };
    if (value < 0.2) return { status: "Quraqlıq riski", note: "Nəmlik aşağı.", tone: "warn" };
    if (value <= 0.4) return { status: "Orta nəmlik", note: "Qənaətbəxş nəmlik.", tone: "good" };
    return { status: "Yaxşı nəmlik", note: "Kifayət qədər su.", tone: "good" };
  }
  if (index === "NDWI") {
    if (value < 0) return { status: "Quru", note: "Səthdə su yoxdur.", tone: "good" };
    return { status: "Nəm/su", note: "Səthdə su/rütubət var.", tone: "warn" };
  }
  // NBR (fire / dryness)
  if (value < 0.1) return { status: "Quru/yanıq riski", note: "Quru və ya yanmış ola bilər.", tone: "bad" };
  return { status: "Normal", note: "Normal vəziyyət.", tone: "good" };
}

// Monday-start week key (matches Postgres date_trunc('week')) for benchmark alignment.
function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function etaText(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "az qaldı";
  if (seconds < 90) return `~${Math.max(1, Math.round(seconds))} saniyə`;
  return `~${Math.round(seconds / 60)} dəqiqə`;
}

// "Preparing…" banner with progress + ETA while the satellite pipeline runs.
function PreparingBanner({ status }: { status: FieldDataStatus }) {
  const pct =
    status.total > 0 ? Math.min(100, Math.round((status.done / status.total) * 100)) : 8;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-emerald-800">Peyk məlumatı hazırlanır…</p>
        <p className="text-sm text-emerald-700">{etaText(status.eta_seconds)} qalıb</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-emerald-700">
        {status.total > 0
          ? `${status.done} / ${status.total} səhnə hazırdır. `
          : "NASA və Sentinel-2 arxivindən oxunur. "}
        Hazır olanda sizə bildiriş göndərəcəyik — bu səhifədən çıxa bilərsiniz.
      </p>
    </div>
  );
}

// Color legend matching the map raster colormap for the active index.
function IndexLegend({ index }: { index: string }) {
  const lg = legendFor(index);
  return (
    <div className="mt-3">
      <div className="h-3 w-full rounded" style={{ background: lg.grad }} />
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>{lg.low}</span>
        <span>{lg.mid}</span>
        <span>{lg.high}</span>
      </div>
    </div>
  );
}

export default function OverviewTab({ field }: { field: FieldDetail }) {
  const [index, setIndex] = useState("NDVI");
  const [sensor, setSensor] = useState<Sensor>("S2"); // default 10m; localStorage read on mount
  const [series, setSeries] = useState<IndexPoint[] | null>(null);
  const [benchmark, setBenchmark] = useState<Record<string, number>>({});
  const [scenes, setScenes] = useState<RasterScene[]>([]);
  const [sceneSensor, setSceneSensor] = useState<Sensor | null>(null); // sensor actually shown
  const [sceneIdx, setSceneIdx] = useState(0);
  const [maxCloud, setMaxCloud] = useState(100);
  const [compare, setCompare] = useState(false);
  const [cmpA, setCmpA] = useState(0);
  const [cmpB, setCmpB] = useState(1);
  const [status, setStatus] = useState<FieldDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<IndexSummaryEntry[] | null>(null);
  const [summarySensor, setSummarySensor] = useState<Sensor | null>(null);
  const [norms, setNorms] = useState<IndexNorms | null>(null);
  const [normsCrop, setNormsCrop] = useState<{ crop_type: string | null; calibrated: boolean } | null>(null);

  // Read the persisted sensor on mount (not in useState init → avoids an SSR hydration mismatch).
  useEffect(() => {
    const s = typeof window !== "undefined" ? window.localStorage.getItem("bagban.sensor") : null;
    if (s === "S2" || s === "HLS") setSensor(s);
  }, []);
  // Reset the index if the current one isn't available for the selected sensor (E0: NDRE/CIre are
  // S2-only, TVI is HLS-only) so switching sensors never leaves an impossible selection.
  useEffect(() => {
    if (!indexAvailable(sensor, index)) setIndex("NDVI");
  }, [sensor, index]);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("bagban.sensor", sensor);
  }, [sensor]);

  // Poll processing status until ready (drives the preparing banner + auto-refresh).
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const s = await api.get<FieldDataStatus>(`/api/fields/${field.id}/data-status`);
        if (!active) return;
        setStatus(s);
        if (s.status === "queued" || s.status === "processing") {
          timer = setTimeout(poll, 6000);
        }
      } catch {
        /* ignore transient errors; keep last status */
      }
    }
    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [field.id]);

  const effectiveStatus = status?.status ?? field.data_status ?? "ready";
  const preparing = effectiveStatus === "queued" || effectiveStatus === "processing";
  const ready = status?.status === "ready";

  // Time series (BOTH sensors, tagged) + regional benchmark — NOT re-fetched on the sensor toggle.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [ser, bm] = await Promise.all([
          api.get<IndexSeries>(`/api/fields/${field.id}/indices?index=${index}`),
          api
            .get<IndexBenchmark>(`/api/fields/${field.id}/indices/benchmark?index=${index}`)
            .catch(() => null),
        ]);
        if (!active) return;
        setSeries(ser?.series ?? []);
        const bench: Record<string, number> = {};
        for (const p of bm?.series ?? []) bench[weekKey(p.date)] = p.mean;
        setBenchmark(bench);
      } catch {
        if (!active) return;
        setSeries([]);
        setBenchmark({});
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id, index, ready]);

  // Map raster scenes for the active index + sensor (re-fetched on the sensor toggle).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sc = await api.get<RasterScenes>(
          `/api/fields/${field.id}/scenes?index=${index}&sensor=${SENSOR_PARAM[sensor]}`,
        );
        if (!active) return;
        setScenes(sc?.scenes ?? []);
        setSceneSensor(sc?.sensor ? sensorFamily(sc.sensor) : null);
        setSceneIdx(0);
      } catch {
        if (!active) return;
        setScenes([]);
        setSceneSensor(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id, index, sensor, ready]);

  // Latest per-index values for the "Cari göstəricilər" card (matches the active sensor).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await api.get<IndexSummary>(
          `/api/fields/${field.id}/indices/summary?sensor=${SENSOR_PARAM[sensor]}`,
        );
        if (!active) return;
        setSummary(s?.indices ?? []);
        setSummarySensor(s?.sensor ? sensorFamily(s.sensor) : null);
      } catch {
        if (active) setSummary([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id, sensor, ready]);

  // Crop-specific index norms (M5) — calibrates the status labels; falls back to universal.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api.get<{ crop_type: string | null; calibrated: boolean; norms: IndexNorms }>(
          `/api/fields/${field.id}/norms`,
        );
        if (!active) return;
        setNorms(r?.norms ?? null);
        setNormsCrop(r ? { crop_type: r.crop_type, calibrated: r.calibrated } : null);
      } catch {
        /* no norms → universal thresholds */
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id]);

  // Interpreted rows for the summary card (only present indices with a value, in order).
  const summaryRows = useMemo(() => {
    const byIndex = new Map((summary ?? []).map((e) => [e.index, e]));
    return SUMMARY_INDICES.map((ix) => byIndex.get(ix))
      .filter((e): e is IndexSummaryEntry => e != null && e.latest != null)
      .map((e) => ({ entry: e, value: e.latest as number, ...interpret(e.index, e.latest as number, norms) }));
  }, [summary, norms]);

  // Scenes visible after the cloud-cover filter (used by timeline + compare pickers).
  const visibleScenes = useMemo(
    () => scenes.filter((s) => s.cloud_pct == null || s.cloud_pct <= maxCloud),
    [scenes, maxCloud],
  );

  // Reset selections when the visible set changes.
  useEffect(() => {
    setSceneIdx(0);
    setCmpA(0);
    setCmpB(Math.min(1, Math.max(0, visibleScenes.length - 1)));
    if (visibleScenes.length < 2) setCompare(false); // compare needs ≥2 scenes — never trap the user
  }, [visibleScenes.length]);

  const activeScene: RasterScene | null = visibleScenes[sceneIdx] ?? visibleScenes[0] ?? null;
  const rasterUrl = activeScene?.tile_url ?? null;

  // Pivot the two-sensor series by date into HLS/S2 lines + the aligned weekly benchmark.
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, unknown>>();
    for (const p of series ?? []) {
      const row = byDate.get(p.date) ?? { date: p.date };
      if (sensorFamily(p.sensor) === "S2") {
        row.s2_mean = p.mean;
      } else {
        row.hls_mean = p.mean;
        row.hls_p10 = p.p10 ?? null;
        row.hls_p90 = p.p90 ?? null;
      }
      byDate.set(p.date, row);
    }
    const hasBench = Object.keys(benchmark).length > 0;
    return Array.from(byDate.values())
      .sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1))
      .map((r) => ({ ...r, benchmark: hasBench ? (benchmark[weekKey(String(r.date))] ?? null) : null }));
  }, [series, benchmark]);
  const hasBenchmark = Object.keys(benchmark).length > 0;
  const hasHls = (series ?? []).some((p) => sensorFamily(p.sensor) === "HLS");
  const hasS2 = (series ?? []).some((p) => sensorFamily(p.sensor) === "S2");

  const sceneA = visibleScenes[cmpA] ?? null;
  const sceneB = visibleScenes[cmpB] ?? null;

  // Small-field warning (info-only). NO-OP when area is unknown.
  const smallField = field.area_ha != null && field.area_ha < AREA_MIN_S2;
  const smallForHls = field.area_ha != null && field.area_ha < AREA_MIN_HLS;
  // Show the warning for a truly tiny field (either sensor) OR a field that is small specifically
  // for HLS 30m (0.15–0.5 ha) while HLS is the active sensor.
  const showSmallBanner = smallField || (sensor === "HLS" && smallForHls);
  // The map is showing a different sensor than the toggle (fell back because none was available).
  const fellBack = !preparing && scenes.length > 0 && sceneSensor != null && sceneSensor !== sensor;
  // Which sensor the map actually shows (for the fallback note).
  const sensorSceneOrHls = (): Sensor => sceneSensor ?? (sensor === "S2" ? "HLS" : "S2");

  return (
    <div className="space-y-6">
      {preparing && status && <PreparingBanner status={status} />}
      <ClarificationBlock fieldId={field.id} />
      {effectiveStatus === "failed" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Peyk məlumatının hazırlanmasında problem oldu. Komanda avtomatik yenidən cəhd edəcək.
        </div>
      )}
      {showSmallBanner && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {smallField
            ? `Sahə çox kiçikdir (${field.area_ha} ha). Piksel-səviyyəli analiz üçün nəticələr yalnız bir neçə peyk pikselinə əsaslanır və təxminidir.`
            : `Bu sahə (${field.area_ha} ha) HLS 30m üçün kiçikdir — sahəyə cəmi bir neçə piksel düşür.`}
          {sensor === "HLS" && smallForHls &&
            " HLS (30m) bu ölçüdə daha az dəqiqdir — Sentinel-2 (10m) seçin."}
        </div>
      )}

      {summaryRows.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800">Cari göstəricilər</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {normsCrop?.calibrated && (
                <span
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                  title="Status etiketləri bu bitki növü üçün kalibrlənib (universal həddlər yox)."
                >
                  🎯 Bitkiyə uyğun
                </span>
              )}
              {summarySensor && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {SENSOR_META[summarySensor].short}
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaryRows.map(({ entry, value, status: st, note, tone }) => (
              <div key={entry.index} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-700">
                    {INDEX_LABELS[entry.index] ?? entry.index}
                  </span>
                  <span className="shrink-0 font-mono text-sm text-slate-800">{value.toFixed(3)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${TONE[tone].dot}`} />
                  <span className={`text-sm font-semibold ${TONE[tone].text}`}>{st}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{note}</p>
                {entry.date && <p className="mt-1 text-[11px] text-slate-400">{entry.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left — index selector + two-sensor time series */}
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-800">{t("idx.title")}</h3>
          <label className="label">{t("idx.select")}</label>
          <select className="input" value={index} onChange={(e) => setIndex(e.target.value)}>
            {INDICES.filter((ix) => indexAvailable(sensor, ix)).map((ix) => (
              <option key={ix} value={ix}>
                {INDEX_LABELS[ix] ?? ix}
              </option>
            ))}
          </select>
          {INDEX_INFO[index] && (
            <p className="mb-4 mt-2 text-xs text-slate-500">{INDEX_INFO[index]}</p>
          )}

          {loading ? (
            <Spinner />
          ) : !series || series.length === 0 ? (
            <Placeholder>{t("idx.noData")}</Placeholder>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) => (typeof d === "string" ? d.slice(5) : d)}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={44} />
                  <Tooltip
                    formatter={(v: number | string, name: string) => [
                      typeof v === "number" ? v.toFixed(3) : v,
                      name,
                    ]}
                  />
                  {/* HLS intra-field min–max band */}
                  <Line type="monotone" dataKey="hls_p90" name="p90" stroke="#a7f3d0" strokeWidth={1} dot={false} connectNulls />
                  <Line type="monotone" dataKey="hls_p10" name="p10" stroke="#a7f3d0" strokeWidth={1} dot={false} connectNulls />
                  {hasBenchmark && (
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      name="Bölgə ortası"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      connectNulls
                    />
                  )}
                  {hasHls && (
                    <Line type="monotone" dataKey="hls_mean" name="HLS 30m"
                      stroke="#059669" strokeWidth={2} dot={{ r: 2, fill: "#059669" }} connectNulls />
                  )}
                  {hasS2 && (
                    <Line type="monotone" dataKey="s2_mean" name="Sentinel-2 10m"
                      stroke="#2563eb" strokeWidth={2} dot={{ r: 2, fill: "#2563eb" }} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                {hasS2 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4" style={{ background: "#2563eb" }} /> Sentinel-2 10m
                  </span>
                )}
                {hasHls && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4 bg-emerald-600" /> HLS 30m
                  </span>
                )}
                {hasHls && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4" style={{ background: "#a7f3d0" }} /> Sahədaxili min–maks
                  </span>
                )}
                {hasBenchmark && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4" style={{ background: "#f59e0b" }} /> Digər sahələrin ortası
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — map with raster overlay + sensor toggle + scene timeline / compare */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-800">{field.name}</h3>
            <div className="flex items-center gap-2">
              {!compare && activeScene && (
                <span className="text-xs text-slate-500">
                  {activeScene.date}
                  {activeScene.cloud_pct != null && ` · ☁ ${activeScene.cloud_pct.toFixed(0)}%`}
                </span>
              )}
              {visibleScenes.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setCompare((c) => !c)}
                  title="İki tarixi müqayisə et"
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                    compare
                      ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" /> Müqayisə
                </button>
              )}
            </div>
          </div>

          {/* Sensor toggle — S2 (10m, sharp) vs HLS (30m, dense) */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 p-0.5">
              {(["S2", "HLS"] as Sensor[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sensor === s}
                  onClick={() => setSensor(s)}
                  className={`rounded px-2.5 py-1 text-xs ${
                    sensor === s
                      ? "bg-emerald-600 font-semibold text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {SENSOR_META[s].short}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">{SENSOR_META[sensor].note}</span>
          </div>

          {compare && sceneA && sceneB ? (
            <>
              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-500">Sol tarix</span>
                  <select className="input" value={cmpA} onChange={(e) => setCmpA(Number(e.target.value))}>
                    {visibleScenes.map((s, i) => (
                      <option key={s.scene_id} value={i}>
                        {s.date}
                        {s.cloud_pct != null ? ` (☁${s.cloud_pct.toFixed(0)}%)` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-500">Sağ tarix</span>
                  <select className="input" value={cmpB} onChange={(e) => setCmpB(Number(e.target.value))}>
                    {visibleScenes.map((s, i) => (
                      <option key={s.scene_id} value={i}>
                        {s.date}
                        {s.cloud_pct != null ? ` (☁${s.cloud_pct.toFixed(0)}%)` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <CompareMap
                key={`${sceneA.scene_id}|${sceneB.scene_id}`}
                polygon={field.geom}
                leftUrl={sceneA.tile_url}
                rightUrl={sceneB.tile_url}
                leftLabel={sceneA.date}
                rightLabel={sceneB.date}
              />
              <IndexLegend index={index} />
              <p className="mt-2 text-xs text-slate-400">Ortadakı dəstəyi sürüşdürün — sol/sağ tarixi tutuşdurun.</p>
            </>
          ) : (
            <>
              <DisplayMap polygon={field.geom} rasterUrl={rasterUrl} />

              {fellBack && (
                <p className="mt-2 text-xs text-amber-600">
                  {sensor === "S2" && !indexAvailable("S2", index)
                    ? `${index} Sentinel-2 (10m) üçün hələ yoxdur — ${SENSOR_META[sensorSceneOrHls()].short} göstərilir.`
                    : `Seçilmiş mənbə (${SENSOR_META[sensor].short}) üçün bu indeksin rasteri hələ yoxdur — ${SENSOR_META[sensorSceneOrHls()].short} göstərilir.`}
                </p>
              )}

              {scenes.length > 0 ? (
                <>
                  <IndexLegend index={index} />

                  {/* Cloud-cover filter */}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Cloud className="h-3.5 w-3.5 shrink-0" />
                    <span className="shrink-0">Maks. bulud: {maxCloud}%</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={maxCloud}
                      onChange={(e) => setMaxCloud(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">Peyk tarixi seçin:</p>
                  {visibleScenes.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-600">Bu bulud həddində təmiz səhnə yoxdur — həddi artırın.</p>
                  ) : (
                    <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                      {visibleScenes.map((s, i) => (
                        <button
                          key={s.scene_id}
                          type="button"
                          title={s.cloud_pct != null ? `${s.date} · bulud ${s.cloud_pct.toFixed(0)}%` : s.date}
                          onClick={() => setSceneIdx(i)}
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs ${
                            i === sceneIdx
                              ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {s.date.slice(5)}
                          {s.cloud_pct != null && (
                            <span className="ml-1 text-slate-400">☁{s.cloud_pct.toFixed(0)}%</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                !preparing && (
                  <p className="mt-3 text-xs text-slate-400">
                    {sensor === "S2" && !indexAvailable("S2", index)
                      ? `${index} Sentinel-2 (10m) üçün mövcud deyil — HLS 30m seçin.`
                      : "Bu indeks üçün hələ raster yoxdur."}
                  </p>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
