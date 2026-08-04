"use client";

// The AI season summary: this field's seasons read against each other, in prose.
//
// THE ONE-SEASON CASE IS THE DESIGN, not an edge case. A new field is ingested ~60 days back, so
// until the farmer runs a backfill there is exactly one, unfinished, season on record — and asking
// for a comparison with "previous years" over one season produces a paragraph that sounds like a
// trend and is not one. So the button that spends an LLM call does not exist in that state at all:
// the card names the single season it has, says plainly that at least two are needed, and points at
// the ONE action that changes the answer (the backfill card further down this same section).
//
// Reading never costs a call. GET returns the facts and whatever prose is cached; generating is
// always an explicit tap. When the model has nothing configured, the section still renders — the
// numbers live in the season chart directly below.
import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, Sparkles } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Spinner } from "@/components/ui";
import { t, tf } from "@/lib/i18n";
import { mdInline, MdText } from "@/lib/mdLite";

/** The id BackfillCard carries, so the single-season call to action can reach it in one tap. */
export const BACKFILL_ANCHOR = "season-backfill";

type Mode = "none" | "single" | "pair" | "multi";

interface SeasonFact {
  season_year: number;
  n_scenes: number;
  partial: boolean;
  thin: boolean;
}

interface Summary {
  headline: string;
  comparison: string;
  watch: string[];
  disclaimer: string;
  years: number[];
  lang: string;
  lang_mismatch: boolean;
  generated_at: string | null;
  stale: boolean;
}

interface Resp {
  mode: Mode;
  current_year: number;
  seasons: SeasonFact[];
  comparable_years: number[];
  thin_years: number[];
  summary: Summary | null;
  configured: boolean;
  can_generate: boolean;
  quota: { used: number; limit: number };
}

export default function SeasonSummaryCard({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.get<Resp>(`/api/fields/${fieldId}/season-summary`));
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

  async function generate() {
    setBusy(true);
    setError("");
    try {
      // The POST returns the same payload the GET does, so one round trip both writes and refreshes
      // the card — no second fetch that could race the first.
      setData(await api.post<Resp>(`/api/fields/${fieldId}/season-summary/generate`));
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <Spinner label={t("app.field.seasonSummary.loading")} />
      </div>
    );
  }
  if (!data) return <ErrorNote message={error} />;

  const { mode, summary, quota } = data;
  const comparable = mode === "pair" || mode === "multi";
  const quotaSpent = quota.limit <= quota.used;
  const partialYear = data.seasons.find((s) => s.partial && !s.thin)?.season_year;
  // Length check rather than `?? data.current_year`: with the array typed number[], TS 5.6 rejects
  // a ?? whose left operand can never be nullish (TS2869), and this must compile on the server.
  const onlyYear = data.comparable_years.length > 0
    ? data.comparable_years[0]
    : data.current_year;

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <Sparkles className="h-4 w-4 text-emerald-600" /> {t("app.field.seasonSummary.title")}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{t("app.field.seasonSummary.subtitle")}</p>
      </div>

      <ErrorNote message={error} />

      {mode === "none" && (
        <p className="text-sm text-slate-600">{t("app.field.seasonSummary.noneBody")}</p>
      )}

      {mode === "single" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {tf("app.field.seasonSummary.singleBody", { year: onlyYear ?? data.current_year })}
          </p>
          {/* Not a generic "learn more": the backfill IS the fix, and it is on this very screen. */}
          <a href={`#${BACKFILL_ANCHOR}`} className="btn-secondary w-fit">
            <History className="h-4 w-4" /> {t("app.field.seasonSummary.singleAction")}
          </a>
        </div>
      )}

      {comparable && (
        <div className="space-y-3">
          {summary ? (
            <div className="space-y-3 text-sm">
              {summary.lang_mismatch && (
                <p className="rounded-lg border border-dashed border-slate-300 bg-black/[.02] px-3 py-2 text-xs text-slate-600">
                  {t("app.field.seasonSummary.langNote")}
                </p>
              )}
              {summary.stale && (
                <p className="rounded-lg border border-dashed border-slate-300 bg-black/[.02] px-3 py-2 text-xs text-slate-600">
                  {t("app.field.seasonSummary.staleNote")}
                </p>
              )}
              <p className="font-medium text-slate-800">{mdInline(summary.headline)}</p>
              <MdText text={summary.comparison} className="text-slate-700" />
              {summary.watch.length > 0 && (
                <div>
                  <h4 className="mb-1 font-medium text-slate-800">
                    {t("app.field.seasonSummary.watchHeading")}
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {summary.watch.map((w, i) => <li key={i}>{mdInline(w)}</li>)}
                  </ul>
                </div>
              )}
              <p className="border-t border-slate-100 pt-2 text-xs text-slate-400">
                {summary.disclaimer}
                {summary.generated_at ? ` · ${summary.generated_at.slice(0, 10)}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {data.configured
                ? t("app.field.seasonSummary.readyBody")
                : t("app.field.seasonSummary.notConfigured")}
            </p>
          )}

          {/* Which seasons the comparison actually rests on, and what it deliberately left out —
              stated whether or not prose exists, because it is the same claim either way. */}
          <p className="text-xs text-slate-500">
            {tf("app.field.seasonSummary.yearsLabel", { years: data.comparable_years.join(", ") })}
          </p>
          {mode === "pair" && (
            <p className="text-xs text-slate-500">{t("app.field.seasonSummary.pairNote")}</p>
          )}
          {partialYear !== undefined && (
            <p className="text-xs text-slate-500">
              {tf("app.field.seasonSummary.partialNote", { year: partialYear })}
            </p>
          )}

          {data.can_generate && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void generate()}
                disabled={busy || quotaSpent}
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                {busy
                  ? t("app.field.seasonSummary.generating")
                  : summary
                    ? t("app.field.seasonSummary.regenerate")
                    : t("app.field.seasonSummary.generate")}
              </button>
              <span className="text-xs text-slate-500">
                {quotaSpent
                  ? t("app.field.seasonSummary.quotaSpent")
                  : tf("app.field.seasonSummary.quota", { used: quota.used, limit: quota.limit })}
              </span>
            </div>
          )}
        </div>
      )}

      {data.thin_years.length > 0 && (
        <p className="text-xs text-slate-400">
          {tf("app.field.seasonSummary.thinNote", { years: data.thin_years.join(", ") })}
        </p>
      )}
    </div>
  );
}
