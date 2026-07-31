"use client";

// "Your satellite data is being prepared" — with the ACTUAL progress and the ACTUAL time left.
//
// EVERY PART OF THIS ALREADY EXISTED EXCEPT THE RENDERING. The pipeline writes done/total on each
// scene and a real per-scene ETA (geo_pipeline/pipeline.py update_field_progress);
// GET /api/fields/{id}/data-status returns {status, done, total, eta_seconds, ready_at};
// useFieldDataStatus polls it every 6 s; lib/types.ts declares all five fields; and the strings
// below are translated into all eight languages. A grep for `eta_seconds` across app/src returned
// ZERO hits: the number was computed, sent, polled and thrown away, and the farmer got a bare
// "Peyk məlumatı hazırlanır…" with no idea whether that meant two minutes or two days.
//
// That matters more than it looks. The research corpus is emphatic that the first five minutes
// decide activation, and that the one thing a farmer will not tolerate is being told to wait
// without being told for how long — the competitor's most-repeated question was literally "when
// will the images appear?".
//
// FAILURE IS SHOWN TOO, and separately. `failed` used to fall through to "no data yet", which is
// indistinguishable from "not started" — the field looked idle while it was actually broken, with
// no way to ask for a retry.
import { AlertTriangle, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import type { FieldDataStatus } from "@/lib/types";

/** Whole minutes once it is worth talking in minutes, seconds while it is nearly done. */
function eta(seconds: number): string {
  if (seconds >= 90) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `~${mins} ${t("app.field.overviewTab.minutesUnit")} ${t("app.field.overviewTab.remaining")}`;
  }
  const secs = Math.max(5, Math.round(seconds / 5) * 5);
  return `~${secs} ${t("app.field.overviewTab.secondsUnit")} ${t("app.field.overviewTab.remaining")}`;
}

export default function DataPreparing({ status }: { status: FieldDataStatus | null }) {
  if (!status) return null;
  const s = status.status;

  if (s === "failed") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-bad/30 bg-bad-tint/40 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
        <p className="text-sm text-slate-800">{t("app.field.satelliteTab.processingFailed")}</p>
      </div>
    );
  }

  if (s !== "queued" && s !== "processing" && s !== "partial") return null;

  const total = status.total ?? 0;
  const done = status.done ?? 0;
  // Only claim a percentage when there is a denominator to claim it from. A queued field has no
  // scene count yet, and inventing 0% would be a number where we have none.
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null;
  const secs = status.eta_seconds;

  return (
    <div className="space-y-2 rounded-xl border border-line-2 bg-panel-2 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" aria-hidden="true" />
        {t("app.field.overviewTab.preparingTitle")}
      </p>

      {pct !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-2" role="progressbar"
             aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
               style={{ width: `${pct}%` }} />
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-600">
        {total > 0 && (
          <>
            {done}/{total} {t("app.field.overviewTab.scenesReady")}
          </>
        )}
        {typeof secs === "number" && secs > 0 && <>{eta(secs)}. </>}
        {t("app.field.overviewTab.firstDataNote")}
      </p>
    </div>
  );
}
