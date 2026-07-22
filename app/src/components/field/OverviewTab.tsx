"use client";

// İcmal — the field's at-a-glance insight page. This is the "wow" summary: a single plain-language
// health verdict for the crop, then crop-aware "what changed and what it means for YOU" cards
// (e.g. "NDVI fell 15% → for hazelnut this can signal water stress → check irrigation"), a compact
// NDVI trend + latest satellite snapshot. The two raster explorers live in their own tabs
// (Sentinel-2 / NASA); the AI reasons over Sentinel-2 only. Everything here is deterministic, so
// it renders instantly and works even without the LLM. Shows whichever sensor arrived first and
// tells the user the rest is still loading.

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import {
  TrendingDown, TrendingUp, Minus, ArrowRight, Satellite, Sparkles, Leaf,
} from "lucide-react";
import { api } from "@/lib/api";
import { DisplayMap } from "@/components/FieldMap";
import { Spinner } from "@/components/ui";
import ClarificationBlock from "@/components/field/ClarificationBlock";
import { SENSOR_PARAM, sensorFamily } from "@/lib/sensors";
import { TONE, INDEX_LABELS, interpret, type IndexNorms, type Tone } from "@/lib/indexStatus";
import {
  buildInsights, cropLabelOf, type InsightsResponse, type ChangeCard, type Direction,
} from "@/lib/insights";
import type { FieldDetail, IndexPoint, IndexSeries, RasterScenes, FieldDataStatus } from "@/lib/types";

type TabTarget = "sentinel2" | "nasa" | "ai";

function etaText(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "az qaldı";
  if (seconds < 90) return `~${Math.max(1, Math.round(seconds))} saniyə`;
  return `~${Math.round(seconds / 60)} dəqiqə`;
}

function PreparingBanner({ status }: { status: FieldDataStatus }) {
  const pct = status.total > 0 ? Math.min(100, Math.round((status.done / status.total) * 100)) : 8;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-emerald-800">Peyk məlumatı hazırlanır…</p>
        <p className="text-sm text-emerald-700">{etaText(status.eta_seconds)} qalıb</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-emerald-700">
        {status.total > 0 ? `${status.done} / ${status.total} səhnə hazırdır. ` : "NASA və Sentinel-2 arxivindən oxunur. "}
        İlk məlumat gələn kimi burada görünəcək — hazır olanda sizə bildiriş göndərəcəyik.
      </p>
    </div>
  );
}

// Hero band tints per tone (a touch stronger than the small dots — this is the headline).
const HERO: Record<Tone, { bg: string; ring: string; text: string; icon: string }> = {
  good: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-900", icon: "text-emerald-600" },
  warn: { bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-900", icon: "text-amber-600" },
  bad: { bg: "bg-red-50", ring: "ring-red-200", text: "text-red-900", icon: "text-red-600" },
};

function DirIcon({ dir, className }: { dir: Direction; className?: string }) {
  if (dir === "up") return <TrendingUp className={className} />;
  if (dir === "down") return <TrendingDown className={className} />;
  return <Minus className={className} />;
}

function ChangeCardView({ c }: { c: ChangeCard }) {
  const tn = TONE[c.tone];
  return (
    <div className={`rounded-xl border ${tn.border} ${tn.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ${tn.text}`}>
          <DirIcon dir={c.direction} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold ${tn.text}`}>{c.headline}</h4>
            {c.pct != null && (
              <span className={`shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-xs ${tn.text}`}>
                {c.pct > 0 ? "+" : ""}{c.pct}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-700">{c.meaning}</p>
          <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-slate-800">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{c.action}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OverviewTab({
  field,
  onNavigate,
  compact = false,
}: {
  field: FieldDetail;
  onNavigate?: (tab: TabTarget) => void;
  // In the v2 map-sheet the field's raster already fills the full-bleed map behind the sheet, so
  // the hero snapshot map here would be redundant — hide it and let the verdict lead.
  compact?: boolean;
}) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [norms, setNorms] = useState<IndexNorms | null>(null);
  const [status, setStatus] = useState<FieldDataStatus | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [spark, setSpark] = useState<{ date: string; v: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll processing status until ready.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const s = await api.get<FieldDataStatus>(`/api/fields/${field.id}/data-status`);
        if (!active) return;
        setStatus(s);
        // Keep polling through 'partial' too (HLS shown, S2 still processing) so the page
        // auto-upgrades to full when Sentinel-2 finishes.
        if (s.status === "queued" || s.status === "processing" || s.status === "partial")
          timer = setTimeout(poll, 6000);
      } catch { /* keep last */ }
    }
    poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [field.id]);

  const ready = status?.status === "ready";

  // Insights (both sensors) + crop norms.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [ins, nm] = await Promise.all([
          api.get<InsightsResponse>(`/api/fields/${field.id}/insights`),
          api.get<{ norms: IndexNorms }>(`/api/fields/${field.id}/norms`).catch(() => null),
        ]);
        if (!active) return;
        setInsights(ins);
        setNorms(nm?.norms ?? null);
      } catch {
        if (active) setInsights(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [field.id, ready]);

  // Latest NDVI raster snapshot for the hero (S2 preferred, HLS fallback via the endpoint).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sc = await api.get<RasterScenes>(`/api/fields/${field.id}/scenes?index=NDVI&sensor=${SENSOR_PARAM.S2}`);
        if (!active) return;
        setHeroUrl(sc?.scenes?.[0]?.tile_url ?? null);
      } catch { /* no snapshot */ }
    })();
    return () => { active = false; };
  }, [field.id, ready]);

  // Compact NDVI sparkline (prefer S2 line, else HLS).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ser = await api.get<IndexSeries>(`/api/fields/${field.id}/indices?index=NDVI`);
        if (!active) return;
        const pts = ser?.series ?? [];
        const s2 = pts.filter((p: IndexPoint) => sensorFamily(p.sensor) === "S2");
        const use = (s2.length > 0 ? s2 : pts).filter((p) => p.mean != null);
        setSpark(use.slice(-24).map((p) => ({ date: p.date, v: p.mean as number })));
      } catch { /* no sparkline */ }
    })();
    return () => { active = false; };
  }, [field.id, ready]);

  const built = useMemo(() => buildInsights(insights, norms), [insights, norms]);
  const cropLabel = cropLabelOf(insights?.crop_type);

  // Latest-value chips from insights trends (NDVI / NDMI / NDRE), status-colored.
  const chips = useMemo(() => {
    const trends = insights ? (insights.s2.length > 0 ? insights.s2 : insights.hls) : [];
    return ["NDVI", "NDRE", "NDMI"]
      .map((ix) => trends.find((t) => t.index === ix))
      .filter((t): t is NonNullable<typeof t> => t != null)
      .map((t) => ({ index: t.index, value: t.latest, ...interpret(t.index, t.latest, norms) }));
  }, [insights, norms]);

  const preparing = status?.status === "queued" || status?.status === "processing";
  const s2Ready = (insights?.s2.length ?? 0) > 0;
  const hlsReady = (insights?.hls.length ?? 0) > 0;

  if (loading && !insights) return <Spinner />;

  const verdict = built.verdict;
  const heroTone: Tone = verdict?.tone ?? "good";
  const hero = HERO[heroTone];

  return (
    <div className="space-y-6">
      {preparing && status && <PreparingBanner status={status} />}

      {/* First-data-arrived note (item 1): one sensor ready, the other still loading. */}
      {!preparing && hlsReady && !s2Ready && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          Bu təhlil <b>NASA (30m)</b> məlumatı əsasındadır. Daha dəqiq <b>Sentinel-2 (10m)</b> hazırlanır —
          hazır olanda bu səhifə avtomatik yenilənəcək.
        </div>
      )}
      {!preparing && s2Ready && !hlsReady && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          <b>Sentinel-2 (10m)</b> hazırdır. NASA (30m) tarixçəsi hələ yüklənir.
        </div>
      )}

      <ClarificationBlock fieldId={field.id} />

      {verdict ? (
        <>
          {/* HERO — headline verdict + NDVI sparkline + latest snapshot */}
          <div className={`overflow-hidden rounded-2xl ring-1 ${hero.ring} ${hero.bg}`}>
            <div className={`grid gap-0 ${compact ? "" : "md:grid-cols-[1.4fr_1fr]"}`}>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Leaf className={`h-4 w-4 ${hero.icon}`} />
                  Sahənin vəziyyəti
                  {insights?.calibrated && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      🎯 {cropLabel}-a uyğun
                    </span>
                  )}
                </div>
                <h2 className={`mt-2 text-xl font-bold leading-snug sm:text-2xl ${hero.text}`}>{verdict.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{verdict.sub}</p>

                {spark.length >= 2 && (
                  <div className="mt-4">
                    <div className="mb-1 text-[11px] font-medium text-slate-500">NDVI trendi (son səhnələr)</div>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={spark} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <YAxis hide domain={["dataMin - 0.05", "dataMax + 0.05"]} />
                          <Tooltip
                            formatter={(v: number | string) => [typeof v === "number" ? v.toFixed(3) : v, "NDVI"]}
                            labelFormatter={(l) => String(l)}
                          />
                          <Area type="monotone" dataKey="v" stroke="#059669" strokeWidth={2}
                            fill="url(#sparkFill)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {chips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {chips.map((c) => (
                      <span key={c.index}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/70 px-2.5 py-1 text-xs">
                        <span className={`h-2 w-2 rounded-full ${TONE[c.tone].dot}`} />
                        <span className="font-medium text-slate-700">{(INDEX_LABELS[c.index] ?? c.index).replace(/\s*\(.*\)/, "")}</span>
                        <span className="font-mono text-slate-500">{c.value.toFixed(2)}</span>
                        <span className={TONE[c.tone].text}>· {c.status}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {heroUrl && !compact && (
                <div className="relative border-t border-white/60 p-3 md:border-l md:border-t-0">
                  <DisplayMap polygon={field.geom} rasterUrl={heroUrl} heightClass="h-52 sm:h-60" />
                </div>
              )}
            </div>
          </div>

          {/* WHAT CHANGED — crop-aware narrative cards */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Nə dəyişdi?
            </h3>
            {built.changes.length > 0 ? (
              <div className="grid gap-3">
                {built.changes.map((c) => <ChangeCardView key={c.index} c={c} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Son həftələrdə mühüm dəyişiklik yoxdur — göstəricilər sabitdir. Detallı baxış üçün peyk tablarına keçin.
              </div>
            )}
          </div>

          {/* Deep-dive CTAs */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate?.("sentinel2")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50">
              <Satellite className="h-4 w-4 text-blue-600" /> Sentinel-2 detalları
            </button>
            <button type="button" onClick={() => onNavigate?.("nasa")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50">
              <Satellite className="h-4 w-4 text-emerald-600" /> NASA detalları
            </button>
            <button type="button" onClick={() => onNavigate?.("ai")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <Sparkles className="h-4 w-4" /> AI aqronom məsləhəti
            </button>
          </div>
        </>
      ) : (
        !preparing && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            Bu sahə üçün hələ peyk təhlili yoxdur. Məlumat hazır olan kimi sahənin vəziyyəti burada görünəcək.
          </div>
        )
      )}
    </div>
  );
}
