"use client";

// Shown above an AI analysis whose language does not line up with the reader's.
//
// Advice prose is generated ONCE, in one language, and stored as text — it is not translated on
// read. The generator now follows the field owner's language, but a farmer who switches languages
// (or a co-worker in the same org who reads in another one) still meets analysis in the language it
// was written in.
//
// Two situations, one action:
//   • no `stale` — the prose on screen IS the foreign one, because the reader's language has no
//     analysis at all for this field. Say so rather than showing it silently.
//   • with `stale` — the prose is readable, but an analysis in another language is newer and the
//     read path deliberately did not serve it. The farmer is entitled to know a newer one exists,
//     and to see the date of the one they are actually reading.
// Both offer the same regeneration: the generate endpoint already writes in the caller's locale,
// so one tap produces a current analysis in the reader's language.
import { useState } from "react";
import { Clock, Languages, RefreshCw, type LucideIcon } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, tf } from "@/lib/i18n";

/** What the note needs when a readable-but-older analysis is being served. */
export interface AdviceStale {
  /** Date of the analysis on screen, YYYY-MM-DD. */
  servedDate: string;
  /** Date of the newer analysis we did not serve, YYYY-MM-DD. */
  newerDate: string;
  /** Locale code of that newer analysis, uppercased. A bare code is used on purpose: naming the
   * language would mean declining eight endonyms inside eight grammars, and "PL" is unambiguous
   * in all of them. */
  newerLang: string;
}

/**
 * Build the `stale` prop from an advice payload, or undefined when there is nothing to disclose.
 * Shared so the analysis section and the status-section summary word this identically.
 */
export function staleFrom(
  advice: {
    generated_at?: string;
    newer_other?: { lang: string; generated_at: string } | null;
  } | null | undefined,
): AdviceStale | undefined {
  if (!advice?.newer_other || !advice.generated_at) return undefined;
  return {
    servedDate: advice.generated_at.slice(0, 10),
    newerDate: advice.newer_other.generated_at.slice(0, 10),
    newerLang: advice.newer_other.lang.toUpperCase(),
  };
}

export default function AdviceLangNote({
  fieldId,
  onDone,
  stale,
}: {
  fieldId: string;
  /** Re-fetch the advice once the new one is stored. */
  onDone: () => void;
  /** Set only in the readable-but-older case; see the comment at the top of this file. */
  stale?: AdviceStale;
}) {
  const [busy, setBusy] = useState(false);
  // The real reason, not a generic "failed" — the common one is the monthly AI quota, and a farmer
  // who is told "try again shortly" for a limit that resets next month will just keep clicking.
  const [error, setError] = useState("");

  async function regenerate() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/fields/${fieldId}/advice/generate`);
      onDone();
    } catch (err) {
      setError(azError(err) || t("app.advice.regenFailed"));
    } finally {
      setBusy(false);
    }
  }

  // The stale case is about age, not about unreadable prose — the icon should not promise a
  // translation problem the reader cannot see on screen.
  const Icon: LucideIcon = stale ? Clock : Languages;
  const message = stale
    ? tf("app.advice.staleMatch", {
        date: stale.servedDate,
        newerDate: stale.newerDate,
        newerLang: stale.newerLang,
      })
    : t("app.advice.otherLang");

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-dashed border-line bg-black/[.02] px-3 py-2 text-[12.5px] text-ink-soft">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className={error ? "text-amber-800" : undefined}>{error || message}</span>
      <button
        onClick={() => void regenerate()}
        disabled={busy}
        className="ml-auto inline-flex min-h-9 items-center gap-1.5 font-semibold text-grass hover:text-grass-deep disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
        {busy ? t("app.advice.regenerating") : t("app.advice.regenerate")}
      </button>
    </div>
  );
}
