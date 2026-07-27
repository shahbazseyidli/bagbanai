"use client";

// The index chart's hover card.
//
// It reads the panel's OWN row, looked up by timestamp, rather than recharts' payload array. The
// payload would give the same numbers in the order the series happen to be declared, with recharts'
// own name/colour metadata attached; what a reader needs is the opposite — one date, and under it
// the measurement plainly separated from the estimate. Keeping the lookup on our side also means
// this file never has to track recharts' generic Payload shape across a version bump.

import { t, tf } from "@/lib/i18n";
import { fmtDate } from "./chartRange";

export interface ChartRow {
  ts: number;
  /** The field mean actually measured on this date; null on a row that exists for another series. */
  mean: number | null;
  /** In-field p10/p90 for that same scene — the spread WITHIN the field, not across fields. */
  p10: number | null;
  p90: number | null;
  /** District/peer weekly median and its p10–p90 spread (benchmark endpoint), when there is one. */
  bench: number | null;
  benchBand: [number, number] | null;
  /** Projection — never a measurement. Drawn dashed, labelled separately, and stated as such here. */
  forecast: number | null;
  forecastBand: [number, number] | null;
  /** Scene cloud cover, when this timestamp is a scene we hold a raster for. */
  cloud: number | null;
}

function fmt(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(3);
}

function Line({ swatch, label, value, dashed = false }: {
  swatch: string;
  label: string;
  value: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      {dashed ? (
        <span
          className="inline-block w-3 shrink-0 border-t-2 border-dashed"
          style={{ borderColor: swatch }}
          aria-hidden="true"
        />
      ) : (
        <span
          className="inline-block h-0.5 w-3 shrink-0"
          style={{ background: swatch }}
          aria-hidden="true"
        />
      )}
      <span className="text-ink-soft">{label}</span>
      <span className="ml-auto tabular-nums font-semibold text-ink">{value}</span>
    </div>
  );
}

export default function ChartTooltip({
  active,
  label,
  indexName,
  rowOf,
  measuredColor,
  forecastColor,
  benchColor,
  bandColor,
}: {
  /** Injected by recharts on the cloned element; optional because it is not ours to guarantee. */
  active?: boolean;
  label?: number | string;
  indexName: string;
  rowOf: (ts: number) => ChartRow | undefined;
  measuredColor: string;
  forecastColor: string;
  benchColor: string;
  bandColor: string;
}) {
  if (!active) return null;
  const ts = Number(label);
  if (!Number.isFinite(ts)) return null;
  const row = rowOf(ts);
  if (!row) return null;

  return (
    <div className="min-w-[190px] rounded-lg border border-line bg-panel px-2.5 py-2 text-[11.5px] shadow-soft">
      <p className="mb-1 font-bold text-ink">{fmtDate(ts)}</p>

      {row.mean != null && (
        <Line
          swatch={measuredColor}
          label={`${t("app.field.chart.measured")} · ${indexName}`}
          value={fmt(row.mean)}
        />
      )}
      {row.cloud != null && (
        <p className="mt-0.5 text-ink-soft">
          {t("app.field.glance.cloud")} {Math.round(row.cloud)}%
        </p>
      )}
      {row.p10 != null && row.p90 != null && (
        <p className="mt-0.5 text-ink-soft">
          {t("app.field.satelliteTab.inFieldMinMax")}:{" "}
          {tf("app.field.chart.tipRange", { lo: fmt(row.p10), hi: fmt(row.p90) })}
        </p>
      )}

      {row.bench != null && (
        <div className="mt-1 border-t border-line pt-1">
          <Line
            swatch={benchColor}
            label={t("app.field.satelliteTab.otherFieldsMean")}
            value={fmt(row.bench)}
            dashed
          />
          {row.benchBand && (
            <p className="mt-0.5 text-ink-soft">
              {t("app.field.satelliteTab.regionSpread")}:{" "}
              {tf("app.field.chart.tipRange", {
                lo: fmt(row.benchBand[0]),
                hi: fmt(row.benchBand[1]),
              })}
            </p>
          )}
        </div>
      )}

      {row.forecast != null && (
        <div className="mt-1 border-t border-line pt-1">
          <Line
            swatch={forecastColor}
            label={t("app.field.forecast.line")}
            value={fmt(row.forecast)}
            dashed
          />
          {row.forecastBand && (
            <p className="mt-0.5 text-ink-soft">
              <span
                className="mr-1 inline-block h-2 w-3 rounded-sm align-[-1px]"
                style={{ background: bandColor }}
                aria-hidden="true"
              />
              {tf("app.field.chart.tipRange", {
                lo: fmt(row.forecastBand[0]),
                hi: fmt(row.forecastBand[1]),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
