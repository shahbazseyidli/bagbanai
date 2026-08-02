"use client";

// MESSAGES (/chat) — the one screen where a farmer talks to somebody: Agradex AI, a lab, an
// agronomist, a supplier, or another grower.
//
// WHY THIS SCREEN IS BUILT AROUND ITS EMPTY STATE. A bare conversation list is a blank page for
// almost everyone who opens it, because the normal state of this product today is "no threads yet".
// So the list is not the screen — the PEOPLE DIRECTORY is (GET /api/chat/directory), and it is what
// the right pane shows whenever nothing is selected. Nobody has to already know a name to start.
//
// THREE URL PARAMS, ONE SELECTION. `?c=<uuid>` is a human thread (unchanged, so old links and the
// PeerSuggest strip keep working), `?ai=<fieldId>` is the Agradex AI thread, `?people=1` forces the
// directory on a phone, where "nothing selected" shows the list instead. Reading useSearchParams is
// what makes the Suspense boundary below mandatory, not optional.
//
// AGRADEX AI IS NOT A USER. It has no user_id and no conversations row (see the docstring of
// services/app/routers/chat.py), so its sentinel id "agradex-ai" is NEVER sent to /api/chat/start
// and never reaches any code path here that expects a participant. It is pinned above the real
// threads, drawn with its own badge, and every one of its answers is preceded by a line saying a
// machine wrote it — a farmer must not mistake an LLM for a hired agronomist.
//
// THE AI IS FIELD-SCOPED BY CONSTRUCTION. ai/context.py builds the answer out of one field's
// satellite, weather and record data, so "which field?" is not a setting, it is the subject of the
// question — hence the picker in the thread header and the honest empty state when the caller owns
// no fields at all.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Search, Send, Sparkles, Sprout, Star, UserPlus } from "lucide-react";
import { api, azError } from "@/lib/api";
import { getLocale, t, tf } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useFormatArea } from "@/lib/units";
import { cropName } from "@/lib/wellnessText";
import { Spinner, ErrorNote } from "@/components/ui";

/* ------------------------------------------------------------------ API shapes */

// Fields the backend added after this screen shipped are optional here on purpose: during a deploy
// the browser can hold new JS against an older API build, and a missing `unread` must render as
// "no badge", not as NaN.
interface Conv {
  id: string;
  other_user_id: string;
  other_name?: string | null;
  other_role?: string | null;
  other_company?: string | null;
  other_deleted?: boolean;
  kind: string;
  last_text?: string | null;
  last_at?: string | null;
  unread?: number;
}

interface Msg { id: string; sender_id: string; body: string; created_at: string; mine: boolean }

interface Person {
  user_id: string;
  name: string;              // ALWAYS non-empty and already privacy-filtered — render verbatim.
  role: string;              // farmer | lab | consultant | supplier
  company?: string | null;
  bio?: string | null;
  specializations?: string[];
  country?: string | null;
  region?: string | null;
  crop?: string | null;
  rating?: number | null;
  featured?: boolean;
  provider_id?: string | null;
  match: string;             // provider | crop | region — WHY this person is on the list
  conversation_id?: string | null;
}

interface Directory {
  providers: Person[];
  farmers: Person[];
  scope: { crops: string[]; regions: string[] };
}

interface AssistantField {
  field_id: string;
  org_id: string;
  name: string;
  crop?: string | null;
  area_ha?: number | null;   // HECTARES — everything is stored in ha, formatted at the edge.
  message_count?: number;
  last_text?: string | null;
  last_at?: string | null;
  chat_limit: number;
  chat_used: number;
  chat_enabled: boolean;
}

interface Assistant {
  id: string;
  name: string;              // "Agradex AI" — a brand name, identical in all 8 locales.
  role: string;
  configured: boolean;
  default_field_id?: string | null;
  last_text?: string | null;
  last_at?: string | null;
  fields: AssistantField[];
}

interface AiTurn {
  id: string;
  sender_id: string;
  sender_name?: string | null;
  body: string;
  created_at: string;
  mine: boolean;
  role: "assistant" | "user";
}

interface AiThread {
  assistant: Assistant;
  field: AssistantField;
  messages: AiTurn[];
  configured: boolean;
  chat_limit: number;
  chat_used: number;
  chat_enabled: boolean;
}

interface AiReply {
  reply: string;
  persisted: boolean;
  messages: AiTurn[];
  chat_limit: number;
  chat_used: number;
  chat_enabled: boolean;
}

/* ------------------------------------------------------------------ helpers */

// The sentinel the pinned row uses when the caller owns no field yet. A field id is a uuid, so this
// can never collide with one; it exists so tapping the AI row always opens the AI pane — which then
// explains why it needs a field — instead of doing nothing.
const NO_FIELD = "none";

// Role code → localized label. Resolved at render time (not module load) so the active locale
// applies; t() reads a module-level locale that LocaleProvider sets after this file is imported.
function roleLabel(role?: string | null): string | undefined {
  switch (role) {
    case "farmer": return t("app.chat.roleFarmer");
    case "lab": return t("app.chat.roleLab");
    case "consultant": return t("app.chat.roleConsultant");
    case "supplier": return t("app.chat.roleSupplier");
    default: return undefined;
  }
}

/** The name a conversation row is titled with. A provider's company beats the person behind it. */
function convTitle(c: Conv): string {
  return c.other_company || c.other_name || t("app.chat.defaultUser");
}

function initial(s: string): string {
  return (s || "?").trim().slice(0, 1).toUpperCase();
}

function Avatar({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white ${className}`}
    >
      {initial(label)}
    </span>
  );
}

/** The AI's avatar is deliberately NOT a letter disc like a person's — it must not read as human. */
function AiAvatar({ size = "h-10 w-10" }: { size?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${size} grid shrink-0 place-items-center rounded-full text-[#08331F]`}
      style={{ background: "linear-gradient(160deg, var(--mint), var(--green))" }}
    >
      <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
    </span>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ page */

export default function ChatPage() {
  return <Suspense fallback={<Spinner />}><ChatInner /></Suspense>;
}

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const convId = params.get("c");
  const aiField = params.get("ai");
  const peopleParam = params.get("people");

  // ai wins over c: both cannot be selected, and a stale ?c on an AI link would draw two threads.
  const mode: "ai" | "conv" | "people" | "none" =
    aiField ? "ai" : convId ? "conv" : peopleParam ? "people" : "none";

  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  // Three states, not two: null means "not answered yet" and true means "asked and failed".
  // Collapsing them left the AI pane on a spinner forever whenever the call errored.
  const [assistantFailed, setAssistantFailed] = useState(false);
  const [error, setError] = useState("");

  const reloadConvs = useCallback(async () => {
    try {
      setConvs(await api.get<Conv[]>("/api/chat"));
    } catch (e) {
      setError(azError(e));
      setConvs([]);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    void reloadConvs();
    // The assistant description is a separate, cheap call and must NOT block the list: if the LLM
    // is unconfigured or this API build predates the route, the human threads still render.
    api.get<Assistant>("/api/chat/assistant")
      .then((a) => { setAssistant(a); setAssistantFailed(false); })
      .catch(() => { setAssistant(null); setAssistantFailed(true); });
  }, [user, loading, router, reloadConvs]);

  // A ?ai= id that is not one of the caller's fields (bookmark of a deleted field, hand-typed URL)
  // is corrected here rather than fetched — the API would answer 403/404 and the farmer would see
  // an error for a link that simply went stale.
  useEffect(() => {
    if (mode !== "ai" || !assistant) return;
    if (assistant.fields.some((f) => f.field_id === aiField)) return;
    const fallback = assistant.default_field_id || assistant.fields[0]?.field_id || NO_FIELD;
    // Equal means NO_FIELD → NO_FIELD: the caller genuinely owns nothing, the pane already says so,
    // and replacing the URL with itself would spin.
    if (fallback === aiField) return;
    router.replace(`/chat?ai=${fallback}`);
  }, [mode, aiField, assistant, router]);

  const openAssistant = useCallback(() => {
    const fid = assistant?.default_field_id || assistant?.fields[0]?.field_id || NO_FIELD;
    router.push(`/chat?ai=${fid}`);
  }, [assistant, router]);

  const current = convs?.find((c) => c.id === convId) || null;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-slate-900">{t("app.chat.heading")}</h1>
      <ErrorNote message={error} />

      <div
        className="grid gap-0 overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white md:grid-cols-[320px_1fr]"
        style={{ minHeight: "60vh" }}
      >
        {/* ── left: pinned AI + conversations. Hidden on a phone while something is selected. ──
            WHOLE class literals, picked by ternary — `flex` and `hidden` are both display
            utilities, so mixing them in one string leaves the winner to Tailwind's emit order
            rather than to this file. */}
        <div
          className={
            mode === "none"
              ? "flex flex-col border-slate-200 md:border-r"
              : "hidden flex-col border-slate-200 md:flex md:border-r"
          }
        >
          <div className="border-b border-slate-100 p-2">
            <button
              type="button"
              onClick={() => router.push("/chat?people=1")}
              className="btn-secondary w-full"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {t("app.chat.newConversation")}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AssistantRow assistant={assistant} active={mode === "ai"} onOpen={openAssistant} />

            {convs === null ? (
              <div className="p-4"><Spinner /></div>
            ) : convs.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">{t("app.chat.emptyConversations")}</p>
            ) : (
              convs.map((c) => (
                <ConversationRow
                  key={c.id}
                  conv={c}
                  active={convId === c.id}
                  onOpen={() => router.push(`/chat?c=${c.id}`)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── right: the AI thread, a human thread, or the people directory ── */}
        <div className={mode === "none" ? "hidden min-w-0 flex-col md:flex" : "flex min-w-0 flex-col"}>
          {mode === "ai" ? (
            <AssistantPane fieldId={aiField || NO_FIELD} assistant={assistant} onBack={() => router.push("/chat")} />
          ) : mode === "conv" && convId ? (
            <ConversationPane
              convId={convId}
              conv={current}
              onBack={() => router.push("/chat")}
              onOpened={reloadConvs}
            />
          ) : (
            <DirectoryPane onOpened={reloadConvs} onBack={() => router.push("/chat")} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ list rows */

function AssistantRow({
  assistant, active, onOpen,
}: { assistant: Assistant | null; active: boolean; onOpen: () => void }) {
  // Drawn even while the description is still loading, so the pinned row does not pop in after the
  // human threads and shift the list under a finger that was already reaching for it.
  const name = assistant?.name || "Agradex AI";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
        active ? "bg-emerald-50" : ""
      }`}
    >
      <AiAvatar />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          {name}
          {/* The badge is the honesty line, not decoration: it says a machine is answering. */}
          <Chip>{t("app.chat.ai.badge")}</Chip>
        </span>
        <span className="block truncate text-xs text-slate-500">
          {assistant?.last_text || t("app.chat.ai.subtitle")}
        </span>
      </span>
      {/* No unread badge here, ever: the assistant never writes unprompted, so there is nothing
          for the farmer to have missed. */}
    </button>
  );
}

function ConversationRow({
  conv, active, onOpen,
}: { conv: Conv; active: boolean; onOpen: () => void }) {
  const title = convTitle(conv);
  const unread = conv.unread || 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
        active ? "bg-emerald-50" : ""
      }`}
    >
      <Avatar label={title} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{title}</span>
          {conv.other_role && <Chip>{roleLabel(conv.other_role) || conv.other_role}</Chip>}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {conv.other_deleted ? t("app.chat.accountClosed") : conv.last_text || "…"}
        </span>
      </span>
      {unread > 0 && (
        <>
          <span
            aria-hidden="true"
            className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold leading-none text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
          <span className="sr-only">{tf("app.chat.unreadAria", { n: unread })}</span>
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ human thread */

function ConversationPane({
  convId, conv, onBack, onOpened,
}: { convId: string; conv: Conv | null; onBack: () => void; onOpened: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let first = true;
    const load = () =>
      api.get<Msg[]>(`/api/chat/${convId}/messages`)
        .then((m) => {
          if (!active) return;
          setMsgs(m);
          // GET marks the counterpart's messages read server-side, so the list's unread badge is
          // stale the instant this resolves. Refresh it once, not on every poll tick.
          if (first) { first = false; onOpened(); }
        })
        .catch(() => { /* transient — keep what is on screen */ });
    void load();
    const timer = setInterval(load, 5000); // light polling; there is no socket layer
    return () => { active = false; clearInterval(timer); };
  }, [convId, onOpened]);

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [msgs]);

  const closed = conv?.other_deleted === true;
  const title = conv ? convTitle(conv) : t("app.chat.defaultUser");

  async function send() {
    const body = draft.trim();
    if (!body || closed) return;
    setDraft("");
    try {
      const m = await api.post<Msg>(`/api/chat/${convId}/messages`, { body });
      setMsgs((cur) => [...cur, m]);
      onOpened();
    } catch (err) {
      setError(azError(err));
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <button type="button" className="md:hidden" onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </button>
        <Avatar label={title} className="h-9 w-9" />
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900">{title}</div>
          {conv?.other_role && (
            <div className="text-xs text-slate-500">{roleLabel(conv.other_role) || conv.other_role}</div>
          )}
        </div>
      </div>

      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4" style={{ maxHeight: "50vh" }}>
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
              m.mine ? "self-end rounded-br-sm bg-emerald-50" : "self-start rounded-bl-sm border border-slate-200 bg-white"
            }`}
          >
            {m.body}
          </div>
        ))}
        {msgs.length === 0 && (
          <p className="text-center text-xs text-slate-400">{t("app.chat.writeFirstMessage")}</p>
        )}
      </div>

      <ErrorNote message={error} />

      {/* A closed account (0052 anonymises rather than deletes) keeps the transcript but can never
          read a new message — say so instead of offering an input nobody is behind. */}
      {closed ? (
        <p className="border-t border-slate-200 p-3 text-sm text-slate-500">{t("app.chat.accountClosedNote")}</p>
      ) : (
        <div className="flex gap-2 border-t border-slate-200 p-3">
          <input
            className="input flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            placeholder={t("app.chat.messagePlaceholder")}
          />
          <button type="button" className="btn-primary" onClick={() => void send()} aria-label={t("app.chat.sendAria")}>
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Agradex AI thread */

// A bubble that exists only in this browser tab: the question we optimistically drew, or a refusal
// the server explicitly did NOT store (persisted=false). Kept separate from thread.messages so a
// reload can never resurrect something that was never written.
interface LocalTurn { id: string; kind: "user" | "system"; body: string }

function AssistantPane({
  fieldId, assistant, onBack,
}: { fieldId: string; assistant: Assistant | null; onBack: () => void }) {
  const fmtArea = useFormatArea();
  const router = useRouter();
  const [thread, setThread] = useState<AiThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [local, setLocal] = useState<LocalTurn[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  const known = !!assistant && assistant.fields.some((f) => f.field_id === fieldId);

  useEffect(() => {
    if (!known) return;
    let active = true;
    setLoading(true);
    setLocal([]);
    api.get<AiThread>(`/api/chat/assistant/${fieldId}/messages`)
      .then((r) => { if (active) setThread(r); })
      .catch(() => { if (active) setThread(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fieldId, known]);

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [thread, local, sending]);

  // No field, no question: ai/context.py has nothing to reason over. Say that plainly rather than
  // showing an input whose every answer would be a refusal.
  if (assistant && assistant.fields.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <AiAvatar size="h-12 w-12" />
        <h2 className="font-semibold text-slate-900">{t("app.chat.ai.noFieldsTitle")}</h2>
        <p className="max-w-sm text-sm text-slate-600">{t("app.chat.ai.noFieldsBody")}</p>
        <Link href="/onboarding" className="btn-primary">{t("app.chat.ai.noFieldsAction")}</Link>
      </div>
    );
  }

  // A spinner is a promise that something is coming. When the description call has already
  // failed, nothing is coming, and an endless spinner is the least useful thing on the screen.
  if (assistantFailed && !assistant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <AiAvatar size="h-12 w-12" />
        <p className="max-w-sm text-sm text-slate-600">{t("app.chat.ai.unavailable")}</p>
      </div>
    );
  }
  if (!assistant || !known || loading) return <div className="p-6"><Spinner /></div>;

  // A const alias, not the prop: TypeScript drops a narrowing of a PARAMETER inside a nested
  // closure (the message .map below is one), and it keeps a narrowing of a const. Without this the
  // list callback would see `Assistant | null` again.
  const info: Assistant = assistant;
  const configured = thread?.configured !== false && info.configured !== false;
  const canSend = configured && thread?.chat_enabled !== false;
  const fields = thread?.assistant.fields || info.fields;

  async function send() {
    const text = draft.trim();
    if (!text || sending || !canSend) return;
    setDraft("");
    const tempId = `local-${Date.now()}`;
    setLocal((x) => [...x, { id: tempId, kind: "user", body: text }]);
    setSending(true);
    try {
      const r = await api.post<AiReply>(`/api/chat/assistant/${fieldId}/messages`, {
        body: text,
        // X-Locale carries this too; sending it explicitly matches the field page's AI chat so the
        // two entry points into the same transcript cannot answer in two different languages.
        locale: getLocale(),
      });
      if (r.persisted) {
        // The server returns BOTH turns it wrote. Drop the optimistic copy or the question doubles.
        setLocal((x) => x.filter((m) => m.id !== tempId));
        setThread((cur) => (cur ? {
          ...cur, messages: [...cur.messages, ...r.messages],
          chat_limit: r.chat_limit, chat_used: r.chat_used, chat_enabled: r.chat_enabled,
        } : cur));
      } else {
        // The tier refused the turn: nothing was stored, so the optimistic question is the only
        // copy there is, and the reply is the localized upgrade sentence — transient by contract.
        setLocal((x) => [...x, { id: `${tempId}-sys`, kind: "system", body: r.reply }]);
        setThread((cur) => (cur ? {
          ...cur, chat_limit: r.chat_limit, chat_used: r.chat_used, chat_enabled: r.chat_enabled,
        } : cur));
      }
    } catch (err) {
      setLocal((x) => [...x, { id: `${tempId}-err`, kind: "system", body: azError(err) }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" className="md:hidden" onClick={onBack} aria-label={t("common.back")}>
            <ArrowLeft className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </button>
          <AiAvatar size="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-slate-900">{info.name}</span>
              <Chip>{t("app.chat.ai.badge")}</Chip>
            </div>
            {thread && (
              <div className="text-xs text-slate-500" title={t("app.chat.ai.quotaHint")}>
                {tf("app.chat.ai.quota", { used: thread.chat_used, limit: thread.chat_limit })}
              </div>
            )}
          </div>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{t("app.chat.ai.fieldLabel")}</span>
          <select
            className="input"
            value={fieldId}
            aria-label={t("app.chat.ai.fieldAria")}
            onChange={(e) => router.push(`/chat?ai=${e.target.value}`)}
          >
            {fields.map((f) => (
              <option key={f.field_id} value={f.field_id}>
                {[f.name, f.crop ? cropName(f.crop) : null, f.area_ha != null ? fmtArea(f.area_ha) : null]
                  .filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4" style={{ maxHeight: "46vh" }}>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{t("app.chat.ai.disclaimer")}</p>

        {(thread?.messages || []).map((m) => (
          <div key={m.id} className={`flex max-w-[80%] flex-col gap-0.5 ${m.mine ? "self-end items-end" : "self-start"}`}>
            {/* A user turn that is not MINE is an org teammate asking about the same field — name
                it, or the reader reads someone else's question as their own. */}
            {!m.mine && (
              <span className="px-1 text-[11px] font-medium text-slate-500">
                {m.role === "assistant" ? info.name : m.sender_name || t("app.chat.defaultUser")}
              </span>
            )}
            <span
              className={`rounded-2xl px-3 py-2 text-sm ${
                m.mine
                  ? "rounded-br-sm bg-emerald-50"
                  : m.role === "assistant"
                    ? "rounded-bl-sm border border-emerald-200 bg-white"
                    : "rounded-bl-sm border border-slate-200 bg-white"
              }`}
            >
              {m.body}
            </span>
          </div>
        ))}

        {local.map((m) =>
          m.kind === "user" ? (
            <span key={m.id} className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-emerald-50 px-3 py-2 text-sm">
              {m.body}
            </span>
          ) : (
            <div key={m.id} className="max-w-[80%] self-start">
              <span className="block rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {m.body}
              </span>
              <span className="px-1 text-[11px] text-amber-700">{t("app.chat.ai.notSaved")}</span>
            </div>
          ),
        )}

        {sending && <span className="self-start px-1 text-xs text-slate-500">{t("app.chat.ai.thinking")}</span>}

        {!sending && !local.length && !(thread?.messages || []).length && (
          <p className="pt-2 text-center text-xs text-slate-400">{t("app.chat.ai.empty")}</p>
        )}
      </div>

      {/* Never a dead input box: an unconfigured key and a spent quota are two different sentences
          and each says what the farmer can do next. */}
      {!configured ? (
        <p className="border-t border-slate-200 p-3 text-sm text-slate-500">{t("app.chat.ai.notConfigured")}</p>
      ) : !canSend ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-3">
          <p className="flex-1 text-sm text-slate-600">{t("app.chat.ai.quotaSpent")}</p>
          <Link href="/pricing" className="btn-secondary">{t("app.chat.ai.quotaAction")}</Link>
        </div>
      ) : (
        <div className="flex gap-2 border-t border-slate-200 p-3">
          <input
            className="input flex-1"
            value={draft}
            disabled={sending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            placeholder={t("app.chat.ai.placeholder")}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => void send()}
            disabled={sending}
            aria-label={t("app.chat.sendAria")}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ people directory */

type DirKind = "all" | "farmer" | "lab" | "consultant" | "supplier";

const DIR_KINDS: DirKind[] = ["all", "consultant", "lab", "supplier", "farmer"];

function DirectoryPane({ onOpened, onBack }: { onOpened: () => void; onBack: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<DirKind>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dir, setDir] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  // Typing must not fire a request per keystroke; 300ms is the same feel as the catalog search.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let active = true;
    const qs = new URLSearchParams();
    if (kind !== "all") qs.set("kind", kind);
    if (debounced) qs.set("q", debounced);
    const suffix = qs.toString();
    setLoading(true);
    api.get<Directory>(`/api/chat/directory${suffix ? `?${suffix}` : ""}`)
      .then((d) => { if (active) { setDir(d); setError(""); } })
      .catch(() => { if (active) { setDir(null); setError(t("app.chat.directoryFailed")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, debounced]);

  // Not named `open`: that shadows window.open inside this module, which is the kind of name a
  // future reader has to double-check instead of read.
  async function openPerson(p: Person) {
    // A person we already have a thread with must reopen THAT thread. /start is get-or-create so
    // calling it would also be correct, but it is a needless round-trip on every tap.
    if (p.conversation_id) { router.push(`/chat?c=${p.conversation_id}`); return; }
    setStarting(p.user_id);
    try {
      const r = await api.post<{ id: string }>("/api/chat/start", {
        other_user_id: p.user_id,
        kind: p.role === "farmer" ? "peer" : "provider",
      });
      onOpened();
      router.push(`/chat?c=${r.id}`);
    } catch (err) {
      setError(azError(err));
    } finally {
      setStarting(null);
    }
  }

  const scope = dir?.scope;
  const scopeText = useMemo(
    () => [...(scope?.crops || []).map(cropName), ...(scope?.regions || [])].filter(Boolean).join(", "),
    [scope],
  );
  // Both lists empty AND nothing to match on is a different message from "nobody matched": one is
  // about us not knowing the farmer yet, the other about the platform genuinely having no peer.
  const hasScope = !!(scope && (scope.crops.length || scope.regions.length));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-slate-200 p-4">
        {/* Only ever visible on a phone in ?people=1, where this pane REPLACES the list; on desktop
            both panes are on screen and there is nothing to go back from. */}
        <div className="flex items-center gap-2">
          <button type="button" className="md:hidden" onClick={onBack} aria-label={t("common.back")}>
            <ArrowLeft className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </button>
          <h2 className="font-semibold text-slate-900">{t("app.chat.peopleHeading")}</h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            className="input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("app.chat.searchPlaceholder")}
            aria-label={t("app.chat.searchAria")}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DIR_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`min-h-[var(--tap)] rounded-full border px-3 text-sm font-medium ${
                kind === k
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {k === "all" ? t("app.chat.filterAll") : roleLabel(k)}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote message={error} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {loading && !dir ? (
          <Spinner />
        ) : (
          <>
            {kind !== "farmer" && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("app.chat.providersHeading")}
                </h3>
                {dir?.providers.length ? (
                  dir.providers.map((p) => (
                    <PersonCard key={p.user_id} person={p} busy={starting === p.user_id} onOpen={() => void openPerson(p)} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">{t("app.chat.noProviders")}</p>
                )}
              </section>
            )}

            {(kind === "all" || kind === "farmer") && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("app.chat.farmersHeading")}
                </h3>
                {!hasScope ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4">
                    <p className="font-medium text-slate-800">{t("app.chat.noScopeTitle")}</p>
                    <p className="mt-1 text-sm text-slate-600">{t("app.chat.noScopeBody")}</p>
                    <Link href="/onboarding" className="btn-secondary mt-3">{t("app.chat.noScopeAction")}</Link>
                  </div>
                ) : dir?.farmers.length ? (
                  <>
                    {dir.farmers.map((p) => (
                      <PersonCard key={p.user_id} person={p} busy={starting === p.user_id} onOpen={() => void openPerson(p)} />
                    ))}
                    {scopeText && (
                      <p className="text-xs text-slate-500">{tf("app.chat.scopeNote", { scope: scopeText })}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">{t("app.chat.noFarmers")}</p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PersonCard({ person, busy, onOpen }: { person: Person; busy: boolean; onOpen: () => void }) {
  const role = roleLabel(person.role);
  return (
    <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-slate-200 bg-white p-3">
      <Avatar label={person.name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{person.name}</span>
          {/* Rating drawn exactly as /catalog draws it — the same provider should not look like two
              different companies on two screens. */}
          {person.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {person.rating.toFixed(1)}
            </span>
          )}
          {role && <Chip>{role}</Chip>}
          {person.featured && <Chip>{t("app.chat.featured")}</Chip>}
          {/* The API says WHY a farmer is on the list; the chip repeats its answer, never a guess. */}
          {person.match === "crop" && <Chip>{t("app.chat.matchCrop")}</Chip>}
          {person.match === "region" && <Chip>{t("app.chat.matchRegion")}</Chip>}
        </div>

        {person.bio && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{person.bio}</p>}

        {/* Free text the provider typed on their own profile, rendered verbatim — the same as
            /catalog does. There is no code list to translate against. */}
        {!!person.specializations?.length && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {person.specializations.slice(0, 3).map((s) => <Chip key={s}>{s}</Chip>)}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {person.crop && (
            <span className="flex items-center gap-1">
              <Sprout className="h-3.5 w-3.5" aria-hidden="true" />{cropName(person.crop)}
            </span>
          )}
          {person.region && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />{person.region}
            </span>
          )}
        </div>
      </div>

      <button type="button" className="btn-secondary shrink-0" onClick={onOpen} disabled={busy}>
        {person.conversation_id ? t("app.chat.openAction") : t("app.chat.messageAction")}
      </button>
    </div>
  );
}
