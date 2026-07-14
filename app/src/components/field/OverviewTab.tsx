"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { DisplayMap } from "@/components/FieldMap";
import { Placeholder, Spinner } from "@/components/ui";
import type {
  FieldDetail,
  IndexPoint,
  IndexSeries,
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

// Simple color legend for the active index (red→yellow→green ⇒ zəif→orta→yüksək).
function IndexLegend() {
  return (
    <div className="mt-3">
      <div className="h-3 w-full rounded" style={{ background: "linear-gradient(90deg,#d73027,#fee08b,#1a9850)" }} />
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>Zəif</span>
        <span>Orta</span>
        <span>Yüksək</span>
      </div>
    </div>
  );
}

export default function OverviewTab({ field }: { field: FieldDetail }) {
  const [index, setIndex] = useState("NDVI");
  const [series, setSeries] = useState<IndexPoint[] | null>(null);
  const [scenes, setScenes] = useState<RasterScene[]>([]);
  const [sceneIdx, setSceneIdx] = useState(0);
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

  // Fetch time-series + raster scenes for the selected index (re-run when data becomes ready).
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [ser, sc] = await Promise.all([
          api.get<IndexSeries>(`/api/fields/${field.id}/indices?index=${index}`),
          api.get<RasterScenes>(`/api/fields/${field.id}/scenes?index=${index}`),
        ]);
        if (!active) return;
        setSeries(ser?.series ?? []);
        setScenes(sc?.scenes ?? []);
        setSceneIdx(0);
      } catch {
        if (!active) return;
        setSeries([]);
        setScenes([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id, index, ready]);

  const activeScene: RasterScene | null = scenes[sceneIdx] ?? null;
  const rasterUrl = activeScene?.tile_url ?? null;

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
          <select className="input mb-4" value={index} onChange={(e) => setIndex(e.target.value)}>
            {INDICES.map((ix) => (
              <option key={ix} value={ix}>
                {INDEX_LABELS[ix] ?? ix}
              </option>
            ))}
          </select>

          {loading ? (
            <Spinner />
          ) : !series || series.length === 0 ? (
            <Placeholder>{t("idx.noData")}</Placeholder>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 8, bottom: 5, left: -12 }}>
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
                  <Line type="monotone" dataKey="mean" name={index} stroke="#059669" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right — map with raster overlay + scene timeline */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{field.name}</h3>
            {activeScene && (
              <span className="text-xs text-slate-500">
                {activeScene.date}
                {activeScene.cloud_pct != null && ` · ☁ ${activeScene.cloud_pct.toFixed(0)}%`}
              </span>
            )}
          </div>

          <DisplayMap polygon={field.geom} rasterUrl={rasterUrl} />

          {scenes.length > 0 ? (
            <>
              <IndexLegend />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {scenes.map((s, i) => (
                  <button
                    key={s.scene_id}
                    type="button"
                    onClick={() => setSceneIdx(i)}
                    className={`shrink-0 rounded-md border px-2 py-1 text-xs ${
                      i === sceneIdx
                        ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s.date.slice(5)}
                    {s.cloud_pct != null && (
                      <span className="ml-1 text-slate-400">☁{s.cloud_pct.toFixed(0)}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            !preparing && (
              <p className="mt-3 text-xs text-slate-400">
                Bu indeks üçün hələ raster yoxdur.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
