"use client";

// The "risks + what to do" card on /demo — a read-only twin of
// components/field/overview/SignalsActions.
//
// The one behavioural difference is deliberate: where the signed-in card offers AdviceLangNote (a
// one-tap POST /advice/generate in the reader's language), this one states the language and stops.
// An anonymous visitor has no org and no quota, so a regenerate button here would spend somebody
// else's AI budget for a stranger. Pre-generating the demo field's advice per locale is the
// operational fix; a button is not.
import { Sparkles } from "lucide-react";
import { mdInline } from "@/lib/mdLite";
import { Placeholder } from "@/components/ui";
import { getLocale, t, tf, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { severityLabel } from "@/lib/wellnessText";
import { pkgFull } from "./DemoPlanNote";

interface Risk {
  title: string;
  severity: string;
  detail?: string | null;
}
interface Rec {
  title: string;
  detail?: string | null;
}

export interface DemoAdvice {
  summary?: string | null;
  risks?: Risk[] | null;
  recommendations?: Rec[] | null;
  next_steps?: string[] | null;
  disclaimer?: string | null;
  /** Language the prose was actually written in — stored per row, not guessed. */
  lang?: string | null;
}

const MAX_RISKS = 3;
const MAX_ACTIONS = 4;

// Severity arrives as one of three fixed Azerbaijani words — they are CODES, not prose. Anything
// unexpected falls back to a neutral chip rather than dropping the risk.
const SEV: Record<string, string> = {
  "yüksək": "bg-red-100 text-red-700",
  "orta": "bg-amber-100 text-amber-800",
  "aşağı": "bg-emerald-100 text-emerald-800",
};

export default function DemoSignals({
  advice,
  demoTier,
}: {
  advice: DemoAdvice | null;
  /** Package the demo field runs on — named under the prose, never used to filter it (see below). */
  demoTier?: string | null;
}) {
  if (!advice) {
    return (
      <section className="card">
        <h3 className="mb-3 font-display text-[15px] font-bold text-ink">{t("app.field.signals.title")}</h3>
        <Placeholder>{t("app.field.signals.empty")}</Placeholder>
      </section>
    );
  }

  // Actions come from next_steps when the model produced them, otherwise from the recommendation
  // titles — never a list of risks next to an empty "what to do".
  const actions: string[] = (advice.next_steps?.length
    ? advice.next_steps
    : (advice.recommendations ?? []).map((r) => r.title)
  ).slice(0, MAX_ACTIONS);
  const risks = (advice.risks ?? []).slice(0, MAX_RISKS);
  const lang = advice.lang || "az";
  const langName = LOCALE_NAMES[lang as Locale] ?? lang;
  const pkg = pkgFull(demoTier);

  return (
    <section className="card">
      <h3 className="mb-3 font-display text-[15px] font-bold text-ink">{t("app.field.signals.title")}</h3>

      {lang !== getLocale() && (
        <p className="mb-3 rounded-xl bg-black/[.03] px-3 py-2 text-[12px] leading-snug text-ink-soft">
          {tf("mkt.demo.adviceLangNote", { lang: langName })}
        </p>
      )}

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
                  <b className="block text-[13.5px] font-bold text-ink">{mdInline(r.title)}</b>
                  {r.detail && (
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{mdInline(r.detail)}</span>
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

      <p className="mt-3 text-[12px] leading-snug text-ink-soft">{t("mkt.demo.signalsCaption")}</p>

      {/* A fertilizer dose or a district comparison can sit INSIDE this stored LLM prose, and those
          are Business-only inside the app. The page cannot parse the text to strip them, so it says
          which package the text was written for instead of quietly implying it is free. */}
      {pkg && (
        <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
          {tf("mkt.demo.plan.adviceNote", { pkg })}
        </p>
      )}
    </section>
  );
}
