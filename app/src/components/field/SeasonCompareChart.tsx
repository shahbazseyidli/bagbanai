"use client";

// A5 — Mövsüm müqayisəsi: one NDVI line per season on a shared day-of-year axis, plus the same-DOY
// verdict against last season ("Keçən ilin bu vaxtından 12% geridəsiniz"). Cloud gaps stay gaps —
// the backend bins weekly and never zero-fills, and the chart connects across missing weeks only
// visually. Inline AZ copy (T18 extracts later).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";

interface SeasonRow {
  season_year: number;
  sensor: string | null;
  n_scenes: number;
  ndvi_peak: number | null;
  ndvi_peak_doy: number | null;
  ndvi_integral: number | null;
  curve: [number, number][];
  integral: [number, number][];
  has_data: boolean;
}

interface Verdict {
  available: boolean;
  reason?: string | null;
  sentence: string;
  pct_diff: number | null;
  basis: string | null;
  doy: number | null;
  current_year: number | null;
  prior_year: number | null;
}

interface CompareResponse {
  field_id: string;
  years: number[];
  current_year: number;
  seasons: SeasonRow[];
  verdict: Verdict;
}

type Metric = "ndvi" | "integral";

const MONTHS_AZ = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];

// Day-of-year → "12 iyul" (2001 is a non-leap reference year, matching the backend's DOY binning).
function doyLabel(doy: number): string {
  const d = new Date(Date.UTC(2001, 0, 1));
  d.setUTCDate(doy);
  return `${d.getUTCDate()} ${MONTHS_AZ[d.getUTCMonth()]}`;
}

// Current season first (emerald), then older seasons in cooler/dimmer colours.
const COLORS = ["#15803D", "#0EA5E9", "#F59E0B", "#A855F7", "#EF4444", "#64748B"];

export default function SeasonCompareChart({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<Metric>("ndvi");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api.get<CompareResponse>(`/api/fields/${fieldId}/season-compare?years=3`));
    } catch (err) {
      setError(azError(err));
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const withData = useMemo(() => (data?.seasons ?? []).filter((s) => s.has_data), [data]);

  const rows = useMemo(() => {
    const byDoy = new Map<number, Record<string, number>>();
    withData.forEach((s) => {
      const pairs = metric === "ndvi" ? s.curve : s.integral;
      pairs.forEach(([doy, val]) => {
        const cur: Record<string, number> = byDoy.get(doy) ?? { doy };
        cur[`y${s.season_year}`] = val;
        byDoy.set(doy, cur);
      });
    });
    return Array.from(byDoy.values()).sort((a, b) => a.doy - b.doy);
  }, [withData, metric]);

  if (loading) {
    return (
      <div className="card">
        <Spinner label="Mövsüm müqayisəsi yüklənir…" />
      </div>
    );
  }

  const v = data?.verdict;
  const pct = v?.pct_diff ?? null;
  const VerdictIcon = pct === null ? Minus : pct <= -5 ? TrendingDown : pct >= 5 ? TrendingUp : Minus;
  const verdictTone =
    !v?.available || pct === null
      ? "border-slate-200 bg-slate-50 text-slate-600"
      : pct <= -5
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : pct >= 5
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <CalendarRange className="h-4 w-4 text-emerald-700" /> Mövsüm müqayisəsi
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Hər mövsümün bitki inkişafı eyni təqvim günü üzrə üst-üstə qoyulur.
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              ["ndvi", "NDVI əyrisi"],
              ["integral", "Toplam artım"],
            ] as [Metric, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`h-11 rounded-lg border px-3 text-sm ${
                metric === key
                  ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote message={error} />

      {v && (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${verdictTone}`}>
          <VerdictIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{v.sentence}</p>
            {v.available && v.doy !== null && (
              <p className="mt-0.5 text-xs opacity-80">
                Müqayisə tarixi: {doyLabel(v.doy)} · {v.current_year} vs {v.prior_year} ·{" "}
                {v.basis === "integral" ? "toplam artım (NDVI-gün)" : "NDVI dəyəri"}
              </p>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <Placeholder>Müqayisə üçün hələ peyk məlumatı yoxdur.</Placeholder>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="doy"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: number) => doyLabel(Number(d))}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={52}
                  domain={metric === "ndvi" ? [0, 1] : ["auto", "auto"]}
                  tickFormatter={(y: number) => (metric === "ndvi" ? Number(y).toFixed(1) : String(Math.round(Number(y))))}
                />
                <Tooltip
                  labelFormatter={(d) => doyLabel(Number(d))}
                  formatter={(value, name) => [
                    metric === "ndvi" ? Number(value).toFixed(2) : Number(value).toFixed(1),
                    String(name).replace(/^y/, ""),
                  ]}
                />
                <Legend formatter={(name) => String(name).replace(/^y/, "")} />
                {withData.map((s, i) => (
                  <Line
                    key={s.season_year}
                    type="monotone"
                    dataKey={`y${s.season_year}`}
                    name={`y${s.season_year}`}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={s.season_year === data?.current_year ? 2.5 : 1.6}
                    strokeDasharray={s.season_year === data?.current_year ? undefined : "5 4"}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 text-left font-semibold">Mövsüm</th>
                  <th className="py-2 text-right font-semibold">Zirvə NDVI</th>
                  <th className="py-2 text-right font-semibold">Zirvə tarixi</th>
                  <th className="py-2 text-right font-semibold">Toplam artım</th>
                  <th className="py-2 text-right font-semibold">Səhnə</th>
                </tr>
              </thead>
              <tbody>
                {withData.map((s) => (
                  <tr key={s.season_year} className="border-t border-slate-100">
                    <td className="py-2.5 font-medium text-slate-800">{s.season_year}</td>
                    <td className="py-2.5 text-right tabular-nums">{s.ndvi_peak != null ? s.ndvi_peak.toFixed(2) : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">
                      {s.ndvi_peak_doy != null ? doyLabel(s.ndvi_peak_doy) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {s.ndvi_integral != null ? Math.round(s.ndvi_integral) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{s.n_scenes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
