"use client";

// E14 — "Siqnallar və görülməli tədbirlər": the actionable half of the field analysis, surfaced on
// the status section so the farmer sees what to DO without opening the analysis section.
//
// It is a summary, not a second copy of AiTab: the risks are capped at three, the actions at four,
// there is no chat, and the "Tam sahə analizi" button hands off to the real section. Reads the same
// GET /api/fields/{id}/advice, so no new endpoint and no extra load.
import { useCallback, useEffect, useState } from "react";
import { mdInline } from "@/lib/mdLite";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Placeholder, Spinner } from "@/components/ui";
import { t } from "@/lib/i18n";
import { severityLabel } from "@/lib/wellnessText";
import AdviceLangNote, { staleFrom } from "@/components/field/AdviceLangNote";

interface Risk { title: string; severity: string; detail: string }
interface Rec { title: string; detail: string }
interface Advice {
  summary: string;
  risks: Risk[];
  recommendations: Rec[];
  next_steps: string[];
  disclaimer: string;
  generated_at: string;
  /** Language the prose was written in, and whether it differs from the reader's. */
  lang?: string;
  lang_mismatch?: boolean;
  /** Whole days since this analysis was written. */
  age_days?: number;
  /** Set when a newer analysis exists in another language and the read path served this readable
   * one instead. Null/absent means what is on screen is also the newest there is. */
  newer_other?: { lang: string; generated_at: string } | null;
}

const MAX_RISKS = 3;
const MAX_ACTIONS = 4;

// The backend emits Azerbaijani severity words as codes; anything unexpected falls back to neutral
// rather than dropping the chip, so a new severity value can never hide a risk.
const SEV: Record<string, string> = {
  "yüksək": "bg-red-100 text-red-700",
  "orta": "bg-amber-100 text-amber-800",
  "aşağı": "bg-emerald-100 text-emerald-800",
};

export default function SignalsActions({
  fieldId,
  onOpenAnalysis,
}: {
  fieldId: string;
  onOpenAnalysis: () => void;
}) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ advice: Advice | null }>(`/api/fields/${fieldId}/advice`);
      setAdvice(r?.advice ?? null);
    } catch {
      /* the section is a summary — a failure here must not break the status page */
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Actions come from next_steps when the model produced them, otherwise from the recommendation
  // titles — never show an empty "what to do" list next to a list of risks.
  const actions: string[] = advice
    ? (advice.next_steps?.length
        ? advice.next_steps
        : (advice.recommendations ?? []).map((r) => r.title)
      ).slice(0, MAX_ACTIONS)
    : [];
  const risks = (advice?.risks ?? []).slice(0, MAX_RISKS);
  // Present only when the advice on screen is readable but something newer exists in another
  // language — the two notes are mutually exclusive by construction in the API.
  const staleNote = staleFrom(advice);

  return (
    <section className="card">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-display text-[15px] font-bold text-ink">{t("app.field.signals.title")}</h3>
        {advice?.generated_at && (
          <span className="text-[11.5px] text-ink-soft">{advice.generated_at.slice(0, 10)}</span>
        )}
        <button
          onClick={onOpenAnalysis}
          className="ml-auto inline-flex min-h-9 items-center gap-1 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
        >
          {t("app.field.signals.openAnalysis")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : !advice ? (
        <Placeholder>{t("app.field.signals.empty")}</Placeholder>
      ) : (
        <>
          {advice.lang_mismatch ? (
            <AdviceLangNote fieldId={fieldId} onDone={() => void load()} />
          ) : staleNote ? (
            <AdviceLangNote fieldId={fieldId} onDone={() => void load()} stale={staleNote} />
          ) : null}

          {advice.summary && (
            <p className="mb-3 text-[13.5px] leading-relaxed text-ink-soft">{mdInline(advice.summary)}</p>
          )}

          {risks.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
                {t("app.field.signals.risks")}
              </p>
              <ul className="space-y-2.5">
                {risks.map((r, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      className={`h-fit shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase ${
                        SEV[r.severity] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {severityLabel(r.severity)}
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[13.5px] font-bold text-ink">{r.title}</b>
                      {r.detail && (
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{r.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {actions.length > 0 && (
            <div className="border-t border-dashed border-line pt-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
                {t("app.field.signals.actions")}
              </p>
              <ol className="space-y-2">
                {actions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]">
                    <span className="mt-px grid h-[19px] w-[19px] shrink-0 place-items-center rounded-md border-[1.5px] border-grass text-[11px] font-extrabold text-grass">
                      {i + 1}
                    </span>
                    <span className="text-ink">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {advice.disclaimer && (
            <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-soft">
              <Sparkles className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
              {advice.disclaimer}
            </p>
          )}
        </>
      )}
    </section>
  );
}
