"use client";

// B18 — regional frost climatology (Open-Meteo archive, cached per rayon). Types are declared
// locally on purpose (lib/types.ts is shared and owned elsewhere).
//
// Two blocks were removed from this section on 2026-08-04 by owner decision: the manual rain log
// ("Yağış yağdı → neçə mm?") and the year-over-year precipitation chart. Their endpoints
// (/api/fields/{id}/rain, /api/fields/{id}/weather/yearly, .../weather/backfill) were removed from
// routers/weather_history.py in the same wave once nothing called them; /frost-dates stays. The
// TABLES were not dropped, so any rain a farmer already logged is still in the database.

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Snowflake } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, tf, tp } from "@/lib/i18n";
import { frostSentence } from "@/lib/wellnessText";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";

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

// Short month names come from the dictionary (one comma-joined key) so a Turkish or Russian reader
// does not get Azerbaijani abbreviations glued onto a localized date.
const monthsShort = (): string[] => tf("app.date.monthsShort").split(",").map((s) => s.trim());

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

  useEffect(() => {
    void loadFrost();
  }, [loadFrost]);

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
                  frost.frost_free_days?.p50 != null
                    ? `${frost.frost_free_days.p50} ${tp("app.plural.days", frost.frost_free_days.p50)}`
                    : "—"
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
                  {frost.planting_window.days} {tp("app.plural.days", frost.planting_window.days ?? 0)}{" "}
                  {t("app.field.weatherHistoryTab.frostFreePeriod")}
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
    </div>
  );
}
