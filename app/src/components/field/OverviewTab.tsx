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
import type {
  FieldDetail,
  IndexPoint,
  IndexSeries,
  IndexBenchmark,
  RasterScene,
  RasterScenes,
  FieldDataStatus,
} from "@/lib/types";

const INDICES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI"];

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
          : "NASA peyk arxivindən oxunur. "}
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
  const [series, setSeries] = useState<IndexPoint[] | null>(null);
  const [benchmark, setBenchmark] = useState<Record<string, number>>({});
  const [scenes, setScenes] = useState<RasterScene[]>([]);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [maxCloud, setMaxCloud] = useState(100);
  const [compare, setCompare] = useState(false);
  const [cmpA, setCmpA] = useState(0);
  const [cmpB, setCmpB] = useState(1);
  const [status, setStatus] = useState<FieldDataStatus | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch time-series + raster scenes + regional benchmark for the selected index.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [ser, sc, bm] = await Promise.all([
          api.get<IndexSeries>(`/api/fields/${field.id}/indices?index=${index}`),
          api.get<RasterScenes>(`/api/fields/${field.id}/scenes?index=${index}`),
          api
            .get<IndexBenchmark>(`/api/fields/${field.id}/indices/benchmark?index=${index}`)
            .catch(() => null),
        ]);
        if (!active) return;
        setSeries(ser?.series ?? []);
        setScenes(sc?.scenes ?? []);
        setSceneIdx(0);
        const bench: Record<string, number> = {};
        for (const p of bm?.series ?? []) bench[weekKey(p.date)] = p.mean;
        setBenchmark(bench);
      } catch {
        if (!active) return;
        setSeries([]);
        setScenes([]);
        setBenchmark({});
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id, index, ready]);

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
  }, [visibleScenes.length]);

  const activeScene: RasterScene | null = visibleScenes[sceneIdx] ?? visibleScenes[0] ?? null;
  const rasterUrl = activeScene?.tile_url ?? null;

  // Merge the field mean series with the aligned regional benchmark (weekly).
  const chartData = useMemo(() => {
    if (!series) return [];
    const hasBench = Object.keys(benchmark).length > 0;
    return series.map((p) => ({
      ...p,
      benchmark: hasBench ? (benchmark[weekKey(p.date)] ?? null) : null,
    }));
  }, [series, benchmark]);
  const hasBenchmark = Object.keys(benchmark).length > 0;

  const sceneA = visibleScenes[cmpA] ?? null;
  const sceneB = visibleScenes[cmpB] ?? null;

  return (
    <div className="space-y-6">
      {preparing && status && <PreparingBanner status={status} />}
      {effectiveStatus === "failed" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Peyk məlumatının hazırlanmasında problem oldu. Komanda avtomatik yenidən cəhd edəcək.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left — index selector + time series */}
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-800">{t("idx.title")}</h3>
          <label className="label">{t("idx.select")}</label>
          <select className="input" value={index} onChange={(e) => setIndex(e.target.value)}>
            {INDICES.map((ix) => (
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
                  <Line type="monotone" dataKey="p90" name="p90" stroke="#a7f3d0" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="p10" name="p10" stroke="#a7f3d0" strokeWidth={1} dot={false} />
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
                  <Line type="monotone" dataKey="mean" name={index} stroke="#059669" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 bg-emerald-600" /> Sahə ortası
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4" style={{ background: "#a7f3d0" }} /> Sahədaxili min–maks
                </span>
                {hasBenchmark && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4" style={{ background: "#f59e0b" }} /> Digər sahələrin ortası
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — map with raster overlay + scene timeline / compare */}
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
                    Bu indeks üçün hələ raster yoxdur.
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
