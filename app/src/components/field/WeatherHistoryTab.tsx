"use client";

// B18 + B19 — regional frost climatology (Open-Meteo archive, cached per rayon) and the farmer's
// own rain log next to the observed year-over-year precipitation. Types are declared locally on
// purpose (lib/types.ts is shared and owned elsewhere).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudRain, Download, RefreshCw, Snowflake, Trash2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { frostSentence } from "@/lib/wellnessText";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";

interface FrostStat {
  p50_doy: number | null;
  p50_mmdd: string | null;
  safe_doy: number | null;
  safe_mmdd: string | null;
  percentile: number;
  years: number;
  earliest_mmdd: string | null;
  latest_mmdd: string | null;
}

interface PlantingWindow {
  start_mmdd: string | null;
  end_mmdd: string | null;
  days: number | null;
}

interface FrostDates {
  ok: boolean;
  zone_id?: string | null;
  cached?: boolean;
  threshold_c?: number;
  years_used?: number;
  year_from?: number;
  year_to?: number;
  last_spring_frost?: FrostStat;
  first_autumn_frost?: FrostStat;
  frost_free_days?: { p50: number | null; min: number | null; max: number | null; years: number };
  planting_window?: PlantingWindow;
  gdd_start_mmdd?: string | null;
  annual_precip_mm_mean?: number | null;
  coldest_t_min_mean?: number | null;
  sentence_az?: string;
  sentence_code?: string | null;
  sentence_params?: Record<string, unknown> | null;
}

interface MonthRow {
  year: number;
  month: number;
  precip_mm: number;
  t_min_mean: number | null;
  t_max_mean: number | null;
  days: number;
}

interface RainMonthRow {
  year: number;
  month: number;
  amount_mm: number;
  entries: number;
}

interface YearlyResp {
  years: number[];
  rain_years: number[];
  months: MonthRow[];
  rain_log: RainMonthRow[];
  has_archive: boolean;
  last_date: string | null;
}

interface RainEntry {
  id: string;
  observed_on: string;
  amount_mm: number;
  note: string | null;
  created_at: string;
}

// Short month names come from the dictionary (one comma-joined key) so a Turkish or Russian reader
// does not get Azerbaijani abbreviations glued onto a localized date.
const monthsShort = (): string[] => tf("app.date.monthsShort").split(",").map((s) => s.trim());
/** Same list, capitalised for chart axis ticks. */
const monthsAxis = (): string[] =>
  monthsShort().map((m) => (m ? m.charAt(0).toLocaleUpperCase() + m.slice(1) : m));
const LINE_COLORS = ["#15803D", "#0EA5E9", "#F59E0B", "#8B5CF6", "#EF4444", "#0F766E", "#DB2777"];
const YEAR_CHOICES = [3, 5, 10];

/** "04-12" → "12 apr" in the active locale. */
function mmddAz(v: string | null | undefined): string {
  if (!v || v.length < 5) return "—";
  const m = Number(v.slice(0, 2));
  const d = Number(v.slice(3, 5));
  if (!m || !d || m < 1 || m > 12) return "—";
  return `${d} ${monthsShort()[m - 1] ?? ""}`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function WeatherHistoryTab({ fieldId }: { fieldId: string }) {
  const [frost, setFrost] = useState<FrostDates | null>(null);
  const [frostErr, setFrostErr] = useState("");
  const [frostBusy, setFrostBusy] = useState(false);

  const [yearly, setYearly] = useState<YearlyResp | null>(null);
  const [rain, setRain] = useState<RainEntry[]>([]);
  const [years, setYears] = useState(5);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");        // rain-log form
  const [chartErr, setChartErr] = useState("");  // archive / backfill

  const [observedOn, setObservedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");

  const loadFrost = useCallback(
    async (refresh = false) => {
      setFrostErr("");
      setFrostBusy(true);
      try {
        setFrost(await api.get<FrostDates>(`/api/fields/${fieldId}/frost-dates${refresh ? "?refresh=1" : ""}`));
      } catch (err) {
        setFrostErr(azError(err));
      } finally {
        setFrostBusy(false);
      }
    },
    [fieldId],
  );

  const loadYearly = useCallback(async () => {
    setYearly(await api.get<YearlyResp>(`/api/fields/${fieldId}/weather/yearly?years=${years}`));
  }, [fieldId, years]);

  const loadRain = useCallback(async () => {
    setRain(await api.get<RainEntry[]>(`/api/fields/${fieldId}/rain?limit=60`));
  }, [fieldId]);

  useEffect(() => {
    void loadFrost();
  }, [loadFrost]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([loadYearly(), loadRain()])
      .catch((err) => {
        if (alive) setChartErr(azError(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadYearly, loadRain]);

  const logYear = useMemo(() => {
    if (!yearly || yearly.rain_years.length === 0) return null;
    return yearly.rain_years[yearly.rain_years.length - 1];
  }, [yearly]);

  const chartData = useMemo(() => {
    if (!yearly) return [];
    return monthsAxis().map((label, i) => {
      const row: Record<string, string | number | null> = { month: label };
      yearly.years.forEach((y) => {
        const m = yearly.months.find((x) => x.year === y && x.month === i + 1);
        row[`y${y}`] = m ? m.precip_mm : null;
      });
      const log = logYear
        ? yearly.rain_log.find((r) => r.year === logYear && r.month === i + 1)
        : undefined;
      row.log = log ? log.amount_mm : null;
      return row;
    });
  }, [yearly, logYear]);

  async function runBackfill() {
    setChartErr("");
    setBusy(true);
    try {
      await api.post(`/api/fields/${fieldId}/weather/backfill`, { years: Math.max(years, 5) });
      await loadYearly();
    } catch (err) {
      setChartErr(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveRain(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/fields/${fieldId}/rain`, {
        observed_on: observedOn,
        amount_mm: Number(amount),
      });
      setAmount("");
      await Promise.all([loadRain(), loadYearly()]);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeRain(id: string) {
    setError("");
    try {
      await api.del(`/api/fields/${fieldId}/rain/${id}`);
      await Promise.all([loadRain(), loadYearly()]);
    } catch (err) {
      setError(azError(err));
    }
  }

  const rainTotal = useMemo(
    () => Math.round(rain.reduce((s, r) => s + r.amount_mm, 0) * 10) / 10,
    [rain],
  );

  return (
    <div className="space-y-6">
      {/* ===== B18 — regional frost dates ===== */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Snowflake className="h-4 w-4 text-sky-600" /> {t("app.field.weatherHistoryTab.frostDatesHeading")}
          </h3>
          <button
            type="button"
            className="btn-secondary min-h-[44px]"
            onClick={() => void loadFrost(true)}
            disabled={frostBusy}
          >
            <RefreshCw className={`h-4 w-4 ${frostBusy ? "animate-spin" : ""}`} /> {t("app.field.weatherHistoryTab.refresh")}
          </button>
        </div>

        {frostBusy && !frost ? (
          <Spinner label={t("app.field.weatherHistoryTab.frostCalculating")} />
        ) : frostErr ? (
          <ErrorNote message={frostErr} />
        ) : frost?.ok ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Stat
                label={t("app.field.weatherHistoryTab.lastSpringFrost")}
                value={mmddAz(frost.last_spring_frost?.p50_mmdd)}
                sub={`${t("app.field.weatherHistoryTab.cautiousPrefix")}${mmddAz(frost.last_spring_frost?.safe_mmdd)}${t("app.field.weatherHistoryTab.nineOfTenYears")}`}
              />
              <Stat
                label={t("app.field.weatherHistoryTab.firstAutumnFrost")}
                value={mmddAz(frost.first_autumn_frost?.p50_mmdd)}
                sub={`${t("app.field.weatherHistoryTab.cautiousPrefix")}${mmddAz(frost.first_autumn_frost?.safe_mmdd)}${t("app.field.weatherHistoryTab.nineOfTenYears")}`}
              />
              <Stat
                label={t("app.field.weatherHistoryTab.frostFreeDays")}
                value={
                  frost.frost_free_days?.p50 != null ? `${frost.frost_free_days.p50} ${t("app.field.weatherHistoryTab.dayUnit")}` : "—"
                }
                sub={
                  frost.frost_free_days?.min != null && frost.frost_free_days?.max != null
                    ? `${frost.frost_free_days.min}–${frost.frost_free_days.max}${t("app.field.weatherHistoryTab.dayRangeSuffix")}`
                    : undefined
                }
              />
            </div>

            {frost.planting_window?.start_mmdd && frost.planting_window?.end_mmdd && (
              <div className="rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">
                  {t("app.field.weatherHistoryTab.safePlantingWindow")} {mmddAz(frost.planting_window.start_mmdd)} –{" "}
                  {mmddAz(frost.planting_window.end_mmdd)}
                </p>
                <p className="mt-0.5 text-emerald-800">
                  {frost.planting_window.days} {t("app.field.weatherHistoryTab.frostFreePeriodDays")}
                  {frost.gdd_start_mmdd
                    ? `${t("app.field.weatherHistoryTab.gddStartPrefix")}${mmddAz(frost.gdd_start_mmdd)}`
                    : ""}
                  .
                </p>
              </div>
            )}

            {/* A zone_knowledge row cached before the code+params twin existed still only carries
                sentence_az — frostSentence falls back to it rather than rendering nothing. */}
            {(frost.sentence_code || frost.sentence_az) && (
              <p className="text-sm text-slate-700">
                {frostSentence(frost.sentence_code, frost.sentence_params, frost.sentence_az)}
              </p>
            )}

            <p className="text-xs text-slate-500">
              {t("app.field.weatherHistoryTab.sourceOpenMeteo")}
              {frost.year_from && frost.year_to ? `, ${frost.year_from}–${frost.year_to}` : ""}
              {frost.threshold_c != null ? `${t("app.field.weatherHistoryTab.thresholdPrefix")}${frost.threshold_c}°C` : ""}
              {frost.annual_precip_mm_mean != null
                ? `${t("app.field.weatherHistoryTab.annualPrecipPrefix")}${frost.annual_precip_mm_mean} mm`
                : ""}
              . {t("app.field.weatherHistoryTab.climateAverageNote")}
            </p>
          </>
        ) : (
          <Placeholder>{t("app.field.weatherHistoryTab.frostNotCalculated")}</Placeholder>
        )}
      </div>

      {/* ===== B19 — quick rain log ===== */}
      <form onSubmit={saveRain} className="card space-y-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <CloudRain className="h-4 w-4 text-sky-600" /> {t("app.field.weatherHistoryTab.rainLogHeading")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("app.field.weatherHistoryTab.dateLabel")}>
            <input
              className="input"
              type="date"
              value={observedOn}
              required
              onChange={(e) => setObservedOn(e.target.value)}
            />
          </FormField>
          <FormField label={t("app.field.weatherHistoryTab.amountLabel")}>
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={amount}
              required
              placeholder={t("app.field.weatherHistoryTab.amountPlaceholder")}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
        </div>
        <button className="btn-primary min-h-[44px]" type="submit" disabled={busy || amount === ""}>
          <CloudRain className="h-4 w-4" /> {busy ? t("app.field.weatherHistoryTab.saving") : t("app.field.weatherHistoryTab.saveRain")}
        </button>
        <ErrorNote message={error} />

        {rain.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-slate-500">
              {t("app.field.weatherHistoryTab.recentEntriesPrefix")}{rainTotal}{t("app.field.weatherHistoryTab.mmParenOpen")}{rain.length}{t("app.field.weatherHistoryTab.daysParenClose")}
            </p>
            <ul className="space-y-2">
              {rain.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{r.observed_on}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-900">{r.amount_mm} mm</span>
                    <button
                      type="button"
                      className="btn-ghost min-h-[44px] text-red-600"
                      aria-label={t("app.field.weatherHistoryTab.delete")}
                      onClick={() => void removeRain(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* ===== B19 — year-over-year precipitation ===== */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">{t("app.field.weatherHistoryTab.yearlyPrecipHeading")}</h3>
          <div className="flex gap-2">
            {YEAR_CHOICES.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className={`min-h-[44px] rounded-lg border px-3 text-sm ${
                  years === y
                    ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {y} {t("app.field.weatherHistoryTab.yearUnit")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spinner label={t("app.field.weatherHistoryTab.weatherHistoryLoading")} />
        ) : yearly?.has_archive ? (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip formatter={(v) => `${v} mm`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {logYear && (
                    <Bar
                      dataKey="log"
                      name={`${t("app.field.weatherHistoryTab.yourMeasurement")}${logYear})`}
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  {yearly.years.map((y, i) => (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={`y${y}`}
                      name={String(y)}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500">
              {t("app.field.weatherHistoryTab.monthlyPrecipNoteStart")}
              {yearly.last_date ? `${t("app.field.weatherHistoryTab.lastDayPrefix")}${yearly.last_date}` : ""}). {t("app.field.weatherHistoryTab.monthlyPrecipNoteEnd")}
            </p>
            <button type="button" className="btn-secondary min-h-[44px]" onClick={() => void runBackfill()} disabled={busy}>
              <Download className="h-4 w-4" /> {busy ? t("app.field.weatherHistoryTab.loading") : t("app.field.weatherHistoryTab.refreshArchive")}
            </button>
          </>
        ) : (
          <>
            <Placeholder>
              {t("app.field.weatherHistoryTab.archiveNotLoaded")}
            </Placeholder>
            <button type="button" className="btn-primary min-h-[44px]" onClick={() => void runBackfill()} disabled={busy}>
              <Download className="h-4 w-4" /> {busy ? t("app.field.weatherHistoryTab.loading") : t("app.field.weatherHistoryTab.loadWeatherArchive")}
            </button>
          </>
        )}
        <ErrorNote message={chartErr} />
      </div>
    </div>
  );
}
