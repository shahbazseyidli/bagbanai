"use client";

// A8 — retrospective backfill of past seasons. HLS reaches back to 2015, but a new field only
// gets the last ~60 days, so the season comparison and the AI season summary have nothing to chew
// on until the farmer asks for history. This card is that ask, and the AI summary above links
// straight to it (BACKFILL_ANCHOR) when a field has only one season.
//
// SIMPLIFIED (2026-08-04): the two year inputs are gone. A farmer thinks "the last few years", not
// "2021 to 2026", and the pair of number fields could be typed into an invalid range that the API
// then rejected — a 400 for a question the UI should never have asked. Three chips resolve to a
// range here, always inside [min_year, max_year] and never longer than the server's max_span, so
// the invalid state cannot be expressed. The resolved years are printed next to the chips: the
// farmer still sees exactly what will be loaded.
import { useCallback, useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import { BACKFILL_ANCHOR } from "@/components/field/SeasonSummaryCard";

interface Job {
  id: string;
  year_from: number;
  year_to: number;
  sensor: string;
  status: string;
  years_done: number;
  years_total: number;
  scenes_written: number;
  message?: string | null;
  active?: boolean;
}
interface Coverage { year: number; scenes: number }
interface Resp {
  current: Job | null;
  jobs: Job[];
  min_year: number;
  max_year: number;
  max_span: number;
  covered_years: Coverage[];
}

type Span = "3" | "5" | "all";

// status codes ("queued"/"running"/"done"/"failed") are API enum values — kept as-is; only the
// human labels are translated, and at render time so the active locale is honored.
function statusLabel(status: string): string {
  switch (status) {
    case "queued": return t("app.field.backfillCard.statusQueued");
    case "running": return t("app.field.backfillCard.statusRunning");
    case "done": return t("app.field.backfillCard.statusDone");
    case "failed": return t("app.field.backfillCard.statusFailed");
    default: return status;
  }
}

/** Chip → concrete year range, clamped by the archive floor and the server's span cap. */
function resolveRange(span: Span, d: Resp): { from: number; to: number } {
  const years = span === "all" ? d.max_span : Number(span);
  const capped = Math.min(years, d.max_span);
  return { from: Math.max(d.min_year, d.max_year - capped + 1), to: d.max_year };
}

export default function BackfillCard({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [span, setSpan] = useState<Span>("3");

  const load = useCallback(async () => {
    try {
      setData(await api.get<Resp>(`/api/fields/${fieldId}/backfill`));
    } catch (err) {
      setError(azError(err));
    }
  }, [fieldId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll only while a job is actually moving, so an idle field costs nothing.
  useEffect(() => {
    const st = data?.current?.status;
    if (st !== "queued" && st !== "running") return;
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [data?.current?.status, load]);

  async function start() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const { from, to } = resolveRange(span, data);
      await api.post(`/api/fields/${fieldId}/backfill`, {
        year_from: from,
        year_to: to,
        sensor: "hls",
      });
      await load();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const cur = data.current;
  const running = cur?.status === "queued" || cur?.status === "running";
  const pct = cur && cur.years_total > 0 ? Math.round((cur.years_done / cur.years_total) * 100) : 0;
  const range = resolveRange(span, data);

  const spanOptions: { value: Span; label: string }[] = [
    { value: "3", label: t("app.field.backfillCard.range3") },
    { value: "5", label: t("app.field.backfillCard.range5") },
    { value: "all", label: t("app.field.backfillCard.rangeAll") },
  ];

  return (
    // The id the single-season summary above links to; scroll-mt keeps the heading off the top edge.
    <div id={BACKFILL_ANCHOR} className="card scroll-mt-4">
      <div className="mb-2 flex items-center gap-2">
        <History className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">{t("app.field.backfillCard.title")}</h3>
      </div>
      <p className="text-sm text-slate-500">
        {t("app.field.backfillCard.archivePre")}{data.min_year}{t("app.field.backfillCard.archivePost")}
      </p>

      {data.covered_years.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.covered_years.map((c) => (
            <span key={c.year} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {c.year} · {c.scenes} {t("app.field.backfillCard.sceneWord")}
            </span>
          ))}
        </div>
      )}

      {running ? (
        <div className="mt-3 rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Loader2 className="h-4 w-4 animate-spin" />
            {cur!.year_from}–{cur!.year_to} {t("app.field.backfillCard.loadingWord")} · {cur!.years_done}/{cur!.years_total} {t("app.field.backfillCard.yearWord")}
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          {cur!.message && <p className="mt-1.5 text-xs text-emerald-800">{cur!.message}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {cur && (
            <p className="text-xs text-slate-500">
              {t("app.field.backfillCard.lastLabel")} {cur.year_from}–{cur.year_to} · {statusLabel(cur.status)}
              {cur.scenes_written > 0 && ` · ${cur.scenes_written} ${t("app.field.backfillCard.sceneWord")}`}
            </p>
          )}
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              {t("app.field.backfillCard.rangeLabel")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {spanOptions.map((o) => {
                const on = span === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSpan(o.value)}
                    className={`min-h-[var(--tap)] rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium ${
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
              <span className="text-sm tabular-nums text-slate-500">{range.from}–{range.to}</span>
            </div>
          </div>
          <button className="btn-primary" onClick={start} disabled={busy}>
            {busy ? t("app.field.backfillCard.sending") : t("app.field.backfillCard.loadButton")}
          </button>
          <p className="text-xs text-slate-400">{t("app.field.backfillCard.backgroundNote")}</p>
        </div>
      )}
      <ErrorNote message={error} />
    </div>
  );
}
