"use client";

// A8 — retrospective backfill of past seasons. HLS reaches back to 2015, but a new field only
// gets the last ~60 days, so multi-season features (A5 compare) and productivity zones (A6)
// have nothing to chew on until the farmer asks for history. This card is that ask.
import { useCallback, useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField } from "@/components/ui";

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

/** `forZones` also requests peak-season NDVI rasters, which productivity zones (A6) need —
 *  a plain stats-only backfill can never unblock them. */
export default function BackfillCard({ fieldId, forZones = false }:
  { fieldId: string; forZones?: boolean }) {
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get<Resp>(`/api/fields/${fieldId}/backfill`);
      setData(d);
      setFrom((prev) => prev || String(Math.max(d.min_year, d.max_year - 4)));
      setTo((prev) => prev || String(d.max_year));
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
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/fields/${fieldId}/backfill`, {
        year_from: Number(from),
        year_to: Number(to),
        sensor: "hls",
        for_zones: forZones,
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

  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2">
        <History className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">{t("app.field.backfillCard.title")}</h3>
      </div>
      <p className="text-sm text-slate-500">
        {t("app.field.backfillCard.archivePre")}{data.min_year}{t("app.field.backfillCard.archivePost")}
        {forZones && t("app.field.backfillCard.forZonesNote")}
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("app.field.backfillCard.startYearLabel")}>
              <input
                className="input"
                type="number"
                min={data.min_year}
                max={data.max_year}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </FormField>
            <FormField label={t("app.field.backfillCard.endYearLabel")}>
              <input
                className="input"
                type="number"
                min={data.min_year}
                max={data.max_year}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </FormField>
          </div>
          <button className="btn-primary" onClick={start} disabled={busy}>
            {busy ? t("app.field.backfillCard.sending") : t("app.field.backfillCard.loadButton")}
          </button>
          <p className="text-xs text-slate-400">
            {t("app.field.backfillCard.maxSpanPre")}{data.max_span}{t("app.field.backfillCard.maxSpanPost")}
          </p>
        </div>
      )}
      <ErrorNote message={error} />
    </div>
  );
}
