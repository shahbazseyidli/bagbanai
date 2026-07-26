"use client";

// Shown above an AI analysis that was written in a language other than the one being read.
//
// Advice prose is generated ONCE, in one language, and stored as text — it is not translated on
// read. The generator now follows the field owner's language, but a farmer who switches languages
// (or a co-worker in the same org who reads in another one) still meets analysis in the language it
// was written in. Rather than silently showing foreign prose, this says so and offers to write it
// again — the regenerate endpoint already takes the caller's locale.
import { useState } from "react";
import { Languages, RefreshCw } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";

export default function AdviceLangNote({
  fieldId,
  onDone,
}: {
  fieldId: string;
  /** Re-fetch the advice once the new one is stored. */
  onDone: () => void;
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

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-dashed border-line bg-black/[.02] px-3 py-2 text-[12.5px] text-ink-soft">
      <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className={error ? "text-amber-800" : undefined}>{error || t("app.advice.otherLang")}</span>
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
