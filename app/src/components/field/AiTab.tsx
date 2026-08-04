"use client";

// The field's AI analysis card: the stored advice, and nothing else.
//
// The chat half of this component was removed on 2026-08-04. The same conversation now lives on the
// Messages screen (/chat), which pins an "Agradex AI" thread with a field picker over the SAME
// public.ai_chat_messages rows — so keeping a second composer here offered one conversation in two
// places, with two transcripts that had to be kept in step by hand and two quota readouts that
// could disagree. What is left in its place is a link, not a deletion: the affordance still exists
// on this screen, it just points at the one screen that owns it, with this field preselected
// (/chat?ai=<fieldId>, the param AssistantPane reads).
//
// The advice half is unchanged — summary, risks, recommendations, next steps, the language note and
// the regenerate hand-off it carries.
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import KnowledgePassport from "@/components/field/KnowledgePassport";
import AdviceLangNote, { staleFrom } from "@/components/field/AdviceLangNote";
import { mdInline } from "@/lib/mdLite";
import { severityLabel } from "@/lib/wellnessText";
import { track, markDone } from "@/lib/track";

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

const SEV_CLASS: Record<string, string> = {
  yüksək: "bg-red-100 text-red-700",
  orta: "bg-amber-100 text-amber-700",
  aşağı: "bg-emerald-100 text-emerald-700",
};

function NotConfigured() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      {t("app.field.aiTab.notConfigured")}
    </div>
  );
}

export default function AiTab({ fieldId }: { fieldId: string }) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const a = await api.get<{ advice: Advice | null; configured: boolean }>(
          `/api/fields/${fieldId}/advice`,
        );
        setAdvice(a?.advice ?? null);
        setConfigured(a?.configured ?? true);
        if (a?.advice) { markDone("advice"); track("advice_viewed"); } // D3.6 activation
      } catch {
        /* session expired, 500, offline — leave the card empty rather than guessing */
      } finally {
        setLoading(false);
      }
    })();
  }, [fieldId]);

  // Re-read just the advice after it has been regenerated in another language.
  const reloadAdvice = useCallback(async () => {
    try {
      const a = await api.get<{ advice: Advice | null }>(`/api/fields/${fieldId}/advice`);
      setAdvice(a?.advice ?? null);
    } catch {
      /* keep what is on screen */
    }
  }, [fieldId]);

  // Present only when the advice on screen is readable but something newer exists in another
  // language — the two notes are mutually exclusive by construction in the API.
  const staleNote = staleFrom(advice);

  // The hand-off to the Messages screen. The label is app.chat.ai.subtitle ("ask about your field")
  // — the AI thread's own subtitle over there, reused deliberately so the link and its destination
  // say the same words in all nine locales rather than drifting apart as two keys.
  const askLink = (
    <Link
      href={`/chat?ai=${fieldId}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {t("app.chat.ai.subtitle")}
    </Link>
  );

  if (loading) return <Spinner />;
  // The Knowledge Passport (soil/water/pests/phenology) shows even when the LLM isn't
  // configured — structured-API research produces it without a key.
  if (!configured)
    return (
      <div className="space-y-6">
        <KnowledgePassport fieldId={fieldId} />
        <NotConfigured />
      </div>
    );

  return (
    <div className="space-y-6">
      <KnowledgePassport fieldId={fieldId} />
      {/* Advice */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-emerald-600" /> {t("app.field.aiTab.adviceHeading")}
          </h3>
        </div>

        {!advice ? (
          <p className="text-sm text-slate-500">
            {t("app.field.aiTab.noAdvice")}
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            {advice.lang_mismatch ? (
              <AdviceLangNote fieldId={fieldId} onDone={() => void reloadAdvice()} />
            ) : staleNote ? (
              <AdviceLangNote fieldId={fieldId} onDone={() => void reloadAdvice()} stale={staleNote} />
            ) : null}
            <p className="text-slate-700">{mdInline(advice.summary)}</p>

            {advice.risks?.length > 0 && (
              <div>
                <h4 className="mb-1 font-medium text-slate-800">{t("app.field.aiTab.risksHeading")}</h4>
                <ul className="space-y-1.5">
                  {advice.risks.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={`h-fit rounded px-1.5 py-0.5 text-[11px] ${SEV_CLASS[r.severity] ?? "bg-slate-100 text-slate-600"}`}>
                        {severityLabel(r.severity)}
                      </span>
                      <span className="text-slate-700"><b>{mdInline(r.title)}.</b> {mdInline(r.detail)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advice.recommendations?.length > 0 && (
              <div>
                <h4 className="mb-1 font-medium text-slate-800">{t("app.field.aiTab.recommendationsHeading")}</h4>
                <ul className="list-disc space-y-1 pl-5 text-slate-700">
                  {advice.recommendations.map((r, i) => (
                    <li key={i}><b>{mdInline(r.title)}.</b> {mdInline(r.detail)}</li>
                  ))}
                </ul>
              </div>
            )}

            {advice.next_steps?.length > 0 && (
              <div>
                <h4 className="mb-1 font-medium text-slate-800">{t("app.field.aiTab.nextStepsHeading")}</h4>
                <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                  {advice.next_steps.map((s, i) => <li key={i}>{mdInline(s)}</li>)}
                </ol>
              </div>
            )}

            <p className="border-t border-slate-100 pt-2 text-xs text-slate-400">
              {advice.disclaimer} · {advice.generated_at.slice(0, 10)}
            </p>
            <p className="text-xs text-slate-400">
              {t("app.field.aiTab.autoRefresh")}
              {advice.generated_at ? ` · ${t("app.field.aiTab.lastUpdateLabel")} ${advice.generated_at.slice(0, 10)}` : ""}.
            </p>
          </div>
        )}

        {/* Below the advice on purpose: a follow-up question is what a farmer has AFTER reading it,
            and it is offered whether or not an analysis exists yet. */}
        <div className="mt-4 border-t border-slate-100 pt-3">{askLink}</div>
      </div>
    </div>
  );
}
