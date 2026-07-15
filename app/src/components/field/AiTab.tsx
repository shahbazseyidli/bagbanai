"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

interface Risk { title: string; severity: string; detail: string }
interface Rec { title: string; detail: string }
interface Advice {
  summary: string;
  risks: Risk[];
  recommendations: Rec[];
  next_steps: string[];
  disclaimer: string;
  generated_at: string;
}
interface ChatMsg { role: string; content: string; created_at?: string }

const SEV_CLASS: Record<string, string> = {
  yüksək: "bg-red-100 text-red-700",
  orta: "bg-amber-100 text-amber-700",
  aşağı: "bg-emerald-100 text-emerald-700",
};

function NotConfigured() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      AI hələ qoşulmayıb. Aktivləşdikdən sonra sahə üçün avtomatik məsləhətlər və söhbət
      burada görünəcək.
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          api.get<{ advice: Advice | null; configured: boolean }>(`/api/fields/${fieldId}/advice`),
          api.get<{ messages: ChatMsg[]; configured: boolean }>(`/api/fields/${fieldId}/chat`),
        ]);
        setAdvice(a?.advice ?? null);
        setConfigured(a?.configured ?? true);
        setMsgs(c?.messages ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [fieldId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const r = await api.post<{ reply: string }>(`/api/fields/${fieldId}/chat`, { message: text });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Bağışlayın, cavab alınmadı. Sonra yenidən yoxlayın." }]);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Spinner />;
  if (!configured) return <NotConfigured />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Advice */}
      <div className="card">
        <div className="mb-3 flex items-center">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-emerald-600" /> AI məsləhəti
          </h3>
        </div>

        {!advice ? (
          <p className="text-sm text-slate-500">
            Hələ məsləhət yoxdur. Peyk məlumatı hazır olanda avtomatik yaranır.
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-slate-700">{advice.summary}</p>

            {advice.risks?.length > 0 && (
              <div>
                <h4 className="mb-1 font-medium text-slate-800">Risklər</h4>
                <ul className="space-y-1.5">
                  {advice.risks.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={`h-fit rounded px-1.5 py-0.5 text-[11px] ${SEV_CLASS[r.severity] ?? "bg-slate-100 text-slate-600"}`}>
                        {r.severity}
                      </span>
                      <span className="text-slate-700"><b>{r.title}.</b> {r.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advice.recommendations?.length > 0 && (
              <div>
                <h4 className="mb-1 font-medium text-slate-800">Məsləhətlər</h4>
                <ul className="list-disc space-y-1 pl-5 text-slate-700">
                  {advice.recommendations.map((r, i) => (
                    <li key={i}><b>{r.title}.</b> {r.detail}</li>
                  ))}
                </ul>
              </div>
            )}

            {advice.next_steps?.length > 0 && (
              <div>
                <h4 className="mb-1 font-medium text-slate-800">Növbəti addımlar</h4>
                <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                  {advice.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            <p className="border-t border-slate-100 pt-2 text-xs text-slate-400">
              {advice.disclaimer} · {advice.generated_at.slice(0, 10)}
            </p>
            <p className="text-xs text-slate-400">
              AI təhlili avtomatik yenilənir (15 gündə bir, son peyk məlumatı əsasında)
              {advice.generated_at ? ` · son yenilənmə: ${advice.generated_at.slice(0, 10)}` : ""}.
            </p>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="card flex h-[32rem] flex-col">
        <h3 className="mb-3 font-semibold text-slate-800">Bağban AI ilə söhbət</h3>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {msgs.length === 0 && (
            <p className="text-sm text-slate-400">
              Sahəniz haqqında sual verin — məs. “NDVI niyə düşür?”, “Nə vaxt suvarım?”.
            </p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                {m.content}
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
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Sualınızı yazın…"
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
  );
}
