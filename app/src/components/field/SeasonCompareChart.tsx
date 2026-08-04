"use client";

// A5 — Mövsüm müqayisəsi: one NDVI line per season on a shared day-of-year axis, plus the same-DOY
// verdict against last season ("Keçən ilin bu vaxtından 12% geridəsiniz"). Cloud gaps stay gaps —
// the backend bins weekly and never zero-fills, and the chart connects across missing weeks only
// visually.
//
// This file is also what MOUNTS the AI season summary above the chart. The field page renders this
// component first in the season section, and the page belongs to a different slice, so the summary
// is composed here rather than by editing that page — a component nobody renders is a feature that
// ships dead. The two are siblings, not nested: the chart keeps its own card and its own fetch.
//
// The metric switch (NDVI curve / total growth) is gone. It changed the same lines between a value
// a farmer reads and an accumulated NDVI-day integral that needs explaining, and the integral is
// still on screen — as a column in the table below, and as the thing the AI summary reasons over.
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
import { t, tf } from "@/lib/i18n";
import { seasonCompareSentence } from "@/lib/wellnessText";
import SeasonSummaryCard from "@/components/field/SeasonSummaryCard";

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
  sentence_code?: string | null;
  sentence_params?: Record<string, unknown> | null;
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

// Short month names live in the dictionary (one comma-joined key), so the axis labels follow the
// reader's locale instead of being Azerbaijani for everyone.
const monthsShort = (): string[] => tf("app.date.monthsShort").split(",").map((s) => s.trim());

// Day-of-year → "12 iyul" (2001 is a non-leap reference year, matching the backend's DOY binning).
function doyLabel(doy: number): string {
  const d = new Date(Date.UTC(2001, 0, 1));
  d.setUTCDate(doy);
  return `${d.getUTCDate()} ${monthsShort()[d.getUTCMonth()] ?? ""}`;
}

// Current season first (emerald), then older seasons in cooler/dimmer colours.
const COLORS = ["#15803D", "#0EA5E9", "#F59E0B", "#A855F7", "#EF4444", "#64748B"];

export default function SeasonCompareChart({ fieldId }: { fieldId: string }) {
  return (
    <div className="space-y-6">
      <SeasonSummaryCard fieldId={fieldId} />
      <CompareChart fieldId={fieldId} />
    </div>
  );
}

function CompareChart({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      // Five seasons, matching ai/season_summary.YEARS_BACK. One window for both: a summary that
      // cites a year the chart above it does not draw reads as a contradiction, not as depth.
      setData(await api.get<CompareResponse>(`/api/fields/${fieldId}/season-compare?years=5`));
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
      s.curve.forEach(([doy, val]) => {
        const cur: Record<string, number> = byDoy.get(doy) ?? { doy };
        cur[`y${s.season_year}`] = val;
        byDoy.set(doy, cur);
      });
    });
    return Array.from(byDoy.values()).sort((a, b) => a.doy - b.doy);
  }, [withData]);

  if (loading) {
    return (
      <div className="card">
        <Spinner label={t("app.field.seasonCompareChart.loading")} />
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
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <CalendarRange className="h-4 w-4 text-emerald-700" /> {t("app.field.seasonCompareChart.title")}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {t("app.field.seasonCompareChart.subtitle")}
        </p>
      </div>

      <ErrorNote message={error} />

      {v && (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${verdictTone}`}>
          <VerdictIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {/* The backend's AZ sentence is only the fallback — a localized client renders the
                code+params twin instead. */}
            <p className="font-medium">
              {seasonCompareSentence(v.sentence_code, v.sentence_params, v.sentence)}
            </p>
            {v.available && v.doy !== null && (
              <p className="mt-0.5 text-xs opacity-80">
                {t("app.field.seasonCompareChart.compareDateLabel")}{doyLabel(v.doy)} · {v.current_year}{t("app.field.seasonCompareChart.vsSeparator")}{v.prior_year} ·{" "}
                {v.basis === "integral" ? t("app.field.seasonCompareChart.basisIntegral") : t("app.field.seasonCompareChart.basisNdvi")}
              </p>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <Placeholder>{t("app.field.seasonCompareChart.noData")}</Placeholder>
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
                  domain={[0, 1]}
                  tickFormatter={(y: number) => Number(y).toFixed(1)}
                />
                <Tooltip
                  labelFormatter={(d) => doyLabel(Number(d))}
                  formatter={(value, name) => [
                    Number(value).toFixed(2),
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
                  <th className="py-2 text-left font-semibold">{t("app.field.seasonCompareChart.colSeason")}</th>
                  <th className="py-2 text-right font-semibold">{t("app.field.seasonCompareChart.colPeakNdvi")}</th>
                  <th className="py-2 text-right font-semibold">{t("app.field.seasonCompareChart.colPeakDate")}</th>
                  <th className="py-2 text-right font-semibold">{t("app.field.seasonCompareChart.totalGrowth")}</th>
                  <th className="py-2 text-right font-semibold">{t("app.field.seasonCompareChart.colScenes")}</th>
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
