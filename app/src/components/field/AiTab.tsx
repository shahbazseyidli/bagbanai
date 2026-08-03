"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { api } from "@/lib/api";
import { getLocale, t, tf } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import KnowledgePassport from "@/components/field/KnowledgePassport";
import AdviceLangNote, { staleFrom } from "@/components/field/AdviceLangNote";
import { MdText, mdInline } from "@/lib/mdLite";
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
interface ChatMsg { role: string; content: string; created_at?: string }
/** A ready-made question: a short label to draw, a full question to send. */
interface Chip { id: string; label: string; ask: string }

const SEV_CLASS: Record<string, string> = {
  yüksək: "bg-red-100 text-red-700",
  orta: "bg-amber-100 text-amber-700",
  aşağı: "bg-emerald-100 text-emerald-700",
};

const SEV_RANK: Record<string, number> = { yüksək: 3, orta: 2, aşağı: 1 };

/** The most severe risk title from the advice already on screen, or null when there is nothing
 * worth quoting. Suppressed on lang_mismatch: the title is then in the owner's language, and a chip
 * that mixes two languages in one sentence reads broken. */
function topRiskTitle(a: Advice | null): string | null {
  if (!a || a.lang_mismatch) return null;
  let best: Risk | null = null;
  for (const r of a.risks ?? []) {
    if (!r?.title?.trim()) continue;
    if (!best || (SEV_RANK[r.severity] ?? 0) > (SEV_RANK[best.severity] ?? 0)) best = r;
  }
  return best ? best.title.trim().replace(/[.!?,;:]+$/, "") : null;
}

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

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          api.get<{ advice: Advice | null; configured: boolean }>(`/api/fields/${fieldId}/advice`),
          api.get<{ messages: ChatMsg[]; configured: boolean; chat_enabled?: boolean }>(`/api/fields/${fieldId}/chat`),
        ]);
        setAdvice(a?.advice ?? null);
        setConfigured(a?.configured ?? true);
        setMsgs(c?.messages ?? []);
        // Absent on an API build that predates the field (mid-deploy) — treat as "can chat", which
        // is exactly how the tab behaved before the chips existed.
        setChatEnabled(c?.chat_enabled !== false);
        if (a?.advice) { markDone("advice"); track("advice_viewed"); } // D3.6 activation
      } catch {
        // Asked and got no answer — session expired, 500, offline. The `true` default above is for
        // the mid-deploy case (an older API build has no chat_enabled), NOT for this one: leaving
        // it true here would show a free-tier farmer five inviting chips whose reply is the upgrade
        // sentence from ai/chat.py. Never invite a tap we cannot honour.
        setChatEnabled(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [fieldId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Re-read just the advice after it has been regenerated in another language; the chat history is
  // untouched by that, so there is no reason to refetch it.
  const reloadAdvice = useCallback(async () => {
    try {
      const a = await api.get<{ advice: Advice | null }>(`/api/fields/${fieldId}/advice`);
      setAdvice(a?.advice ?? null);
    } catch {
      /* keep what is on screen */
    }
  }, [fieldId]);

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const r = await api.post<{ reply: string }>(`/api/fields/${fieldId}/chat`, { message: text, locale: getLocale() });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: t("app.field.aiTab.chatError") }]);
    } finally {
      setSending(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    void sendText(text);
  }

  // Cold-start affordance: ready-made questions the field context can actually answer. The adaptive
  // first chip quotes the worst risk of the advice already in state, so the follow-up is guaranteed
  // to be about something the model itself raised.
  const riskTitle = topRiskTitle(advice);
  // Present only when the advice on screen is readable but something newer exists in another
  // language — the two notes are mutually exclusive by construction in the API.
  const staleNote = staleFrom(advice);
  const chips: Chip[] = [
    ...(riskTitle
      ? [{
          id: "risk",
          label: tf("app.field.aiTab.chipRiskLabel", {
            risk: riskTitle.length > 24 ? `${riskTitle.slice(0, 24).trimEnd()}…` : riskTitle,
          }),
          ask: tf("app.field.aiTab.chipRiskAsk", { risk: riskTitle }),
        }]
      : []),
    { id: "week", label: t("app.field.aiTab.chipWeekLabel"), ask: t("app.field.aiTab.chipWeekAsk") },
    { id: "irrigate", label: t("app.field.aiTab.chipIrrigateLabel"), ask: t("app.field.aiTab.chipIrrigateAsk") },
    { id: "compare", label: t("app.field.aiTab.chipCompareLabel"), ask: t("app.field.aiTab.chipCompareAsk") },
    { id: "growth", label: t("app.field.aiTab.chipGrowthLabel"), ask: t("app.field.aiTab.chipGrowthAsk") },
  ];
  // Never invite a tap the org cannot spend: a tier-gated chat answers with the upgrade sentence.
  const showChips = chatEnabled && !loading && msgs.length === 0 && !sending;

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
      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      {/* Chat */}
      <div className="card flex h-[32rem] flex-col">
        <h3 className="mb-3 font-semibold text-slate-800">{t("app.field.aiTab.chatHeading")}</h3>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {/* The empty-state sentence lists example questions; with the chips on screen it would
              sit directly above tappable versions of the same ones. */}
          {msgs.length === 0 && !showChips && (
            <p className="text-sm text-slate-400">
              {t("app.field.aiTab.chatEmpty")}
            </p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                {m.role === "assistant" ? <MdText text={m.content} /> : m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-400">…</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {showChips && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-slate-400">{t("app.field.aiTab.chipsPrompt")}</p>
            {/* -mx-1/px-1 so the focus ring of the first and last chip is not clipped by the
                scroll container. */}
            <div
              role="group"
              aria-label={t("app.field.aiTab.chipsAria")}
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {/* No `disabled` on the chips: the row unmounts the moment one is tapped, because
                  sendText pushes the optimistic user bubble in the same update that flips
                  `sending` — and showChips requires msgs to be empty. A disabled style could
                  never render. */}
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void sendText(c.ask)}
                  className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border-[1.5px] border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder={t("app.field.aiTab.inputPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            disabled={sending}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary shrink-0 px-3"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
