"use client";

// In-app messaging + farmer community (HYBRID_PLAN §E W5). Conversation list + thread. Uses
// ?c=<conversationId> so it needs a Suspense boundary (useSearchParams). Inline AZ copy.
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Spinner, ErrorNote } from "@/components/ui";

interface Conv { id: string; other_user_id: string; other_name?: string | null; other_role?: string | null; kind: string; last_text?: string | null; last_at?: string | null; }
interface Msg { id: string; sender_id: string; body: string; created_at: string; mine: boolean; }

const ROLE_AZ: Record<string, string> = { farmer: "Fermer", lab: "Laboratoriya", consultant: "Konsultant", supplier: "Təchizatçı" };

export default function ChatPage() {
  return <Suspense fallback={<Spinner />}><ChatInner /></Suspense>;
}

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const selected = params.get("c");
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    api.get<Conv[]>("/api/chat").then(setConvs).catch((e) => { setError(azError(e)); setConvs([]); });
  }, [user, loading, router]);

  useEffect(() => {
    if (!selected) { setMsgs([]); return; }
    let active = true;
    const load = () => api.get<Msg[]>(`/api/chat/${selected}/messages`).then((m) => { if (active) setMsgs(m); }).catch(() => {});
    load();
    const t = setInterval(load, 5000); // light polling
    return () => { active = false; clearInterval(t); };
  }, [selected]);

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [msgs]);

  async function send() {
    if (!draft.trim() || !selected) return;
    const body = draft.trim();
    setDraft("");
    try {
      const m = await api.post<Msg>(`/api/chat/${selected}/messages`, { body });
      setMsgs((cur) => [...cur, m]);
    } catch (err) { setError(azError(err)); }
  }

  const cur = convs?.find((c) => c.id === selected) || null;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-slate-900">İcma & mesajlar</h1>
      <ErrorNote message={error} />
      <div className="grid gap-0 overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white md:grid-cols-[300px_1fr]" style={{ minHeight: "60vh" }}>
        {/* conversation list */}
        <div className={`border-slate-200 md:border-r ${selected ? "hidden md:block" : ""}`}>
          {convs === null ? <div className="p-4"><Spinner /></div> : convs.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Hələ söhbət yoxdur. Kataloqdan provayderə yazın və ya sahə analizindən yaxın fermerlə əlaqə saxlayın.</div>
          ) : convs.map((c) => (
            <button key={c.id} onClick={() => router.push(`/chat?c=${c.id}`)}
              className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${selected === c.id ? "bg-emerald-50" : ""}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{(c.other_name || "?").slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold text-slate-900">{c.other_name || "İstifadəçi"}
                  {c.other_role && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{ROLE_AZ[c.other_role] || c.other_role}</span>}</span>
                <span className="block truncate text-xs text-slate-500">{c.last_text || "…"}</span>
              </span>
            </button>
          ))}
        </div>

        {/* thread */}
        <div className={`flex flex-col ${selected ? "" : "hidden md:flex"}`}>
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">Söhbət seçin</div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <button className="md:hidden" onClick={() => router.push("/chat")}><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{(cur?.other_name || "?").slice(0, 1).toUpperCase()}</span>
                <div><div className="font-semibold text-slate-900">{cur?.other_name || "İstifadəçi"}</div>
                  {cur?.other_role && <div className="text-xs text-slate-500">{ROLE_AZ[cur.other_role] || cur.other_role}</div>}</div>
              </div>
              <div ref={bodyRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" style={{ maxHeight: "50vh" }}>
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "self-end rounded-br-sm bg-emerald-50" : "self-start rounded-bl-sm border border-slate-200 bg-white"}`}>{m.body}</div>
                ))}
                {msgs.length === 0 && <div className="text-center text-xs text-slate-400">İlk mesajı yazın.</div>}
              </div>
              <div className="flex gap-2 border-t border-slate-200 p-3">
                <input className="input flex-1" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Mesaj yaz…" />
                <button className="btn-primary" onClick={send}><Send className="h-4 w-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
