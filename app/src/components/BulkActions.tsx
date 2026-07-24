"use client";

// B14 — bulk actions across multi-selected fields (HYBRID_PLAN W7). Renders nothing until at
// least one field is selected; then a compact sticky bar offers the two writes that make sense
// for a whole selection: one task per field, or one operation-log row per field. The backend
// (/api/bulk/*) verifies every field belongs to the org and writes them in one transaction.
// Inline AZ copy (T18 extracts later).
import { useState } from "react";
import { CalendarCheck, ClipboardList, X } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Field as FormField } from "@/components/ui";

interface BulkActionsProps {
  orgId: string;
  fieldIds: string[];
  onDone?: () => void;
}

interface BulkResult {
  ok: boolean;
  created: number;
  ids: string[];
}

const TASK_TYPES = ["Suvarma", "Gübrələmə", "Çiləmə", "Müşahidə", "Yığım", "Şumlama"];
const OP_TYPES = ["Suvarma", "Gübrələmə", "Çiləmə", "Şumlama", "Əkin", "Yığım", "Budama", "Alaqotu"];
const PRIORITIES = [
  { value: "low", label: "Aşağı" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksək" },
];
const CURRENCIES = ["AZN", "USD", "EUR"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BulkActions({ orgId, fieldIds, onDone }: BulkActionsProps) {
  const [mode, setMode] = useState<"" | "task" | "op">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  // task form
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [taskNotes, setTaskNotes] = useState("");

  // operation form
  const [opType, setOpType] = useState(OP_TYPES[0]);
  const [performedOn, setPerformedOn] = useState(today());
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("AZN");
  const [opNotes, setOpNotes] = useState("");

  const count = fieldIds.length;
  if (count === 0) return null;

  function closeForm() {
    setMode("");
    setError("");
  }

  function resetTask() {
    setTitle("");
    setTaskType("");
    setDue("");
    setPriority("medium");
    setTaskNotes("");
  }

  function resetOp() {
    setOpType(OP_TYPES[0]);
    setPerformedOn(today());
    setCost("");
    setCurrency("AZN");
    setOpNotes("");
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    if (!title.trim()) {
      setError("Tapşırığın adını yazın.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<BulkResult>("/api/bulk/tasks", {
        org_id: orgId,
        field_ids: fieldIds,
        title: title.trim(),
        type: taskType.trim() || undefined,
        due_date: due || undefined,
        priority,
        notes: taskNotes.trim() || undefined,
      });
      setDone(`${res.created} sahəyə tapşırıq əlavə edildi.`);
      resetTask();
      setMode("");
      onDone?.();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitOp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    if (!opType.trim()) {
      setError("Əməliyyat növünü seçin.");
      return;
    }
    if (!performedOn) {
      setError("Tarixi seçin.");
      return;
    }
    const c = cost.trim() ? Number(cost) : undefined;
    if (c !== undefined && (!Number.isFinite(c) || c < 0)) {
      setError("Xərc düzgün deyil.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<BulkResult>("/api/bulk/operations", {
        org_id: orgId,
        field_ids: fieldIds,
        type: opType.trim(),
        performed_on: performedOn,
        cost: c,
        currency,
        notes: opNotes.trim() || undefined,
      });
      setDone(`${res.created} sahəyə əməliyyat yazıldı.`);
      resetOp();
      setMode("");
      onDone?.();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-20 z-30 md:bottom-4">
      <div className="rounded-xl border-[1.5px] border-emerald-300 bg-white p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{count} sahə seçildi</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setDone("");
                setError("");
                setMode(mode === "task" ? "" : "task");
              }}
            >
              <ClipboardList className="h-4 w-4" /> Tapşırıq əlavə et
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setDone("");
                setError("");
                setMode(mode === "op" ? "" : "op");
              }}
            >
              <CalendarCheck className="h-4 w-4" /> Əməliyyat əlavə et
            </button>
          </div>
        </div>

        {done && !mode && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>
        )}

        {mode !== "" && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {mode === "task" ? "Seçilmiş sahələrə tapşırıq" : "Seçilmiş sahələrə əməliyyat"}
              </h3>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={closeForm}
                aria-label="Bağla"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ErrorNote message={error} />

            {mode === "task" ? (
              <form onSubmit={submitTask} className="mt-2 space-y-3">
                <FormField label="Başlıq" required>
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Məsələn: Suvarma yoxlaması"
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Növ">
                    <select
                      className="input"
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                    >
                      <option value="">Seçilməyib</option>
                      {TASK_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Son tarix">
                    <input
                      className="input"
                      type="date"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Prioritet">
                    <select
                      className="input"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Qeyd">
                  <textarea
                    className="input"
                    rows={2}
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                  />
                </FormField>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Yazılır…" : `${count} sahəyə əlavə et`}
                </button>
              </form>
            ) : (
              <form onSubmit={submitOp} className="mt-2 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Əməliyyat" required>
                    <select
                      className="input"
                      value={opType}
                      onChange={(e) => setOpType(e.target.value)}
                    >
                      {OP_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Tarix" required>
                    <input
                      className="input"
                      type="date"
                      value={performedOn}
                      onChange={(e) => setPerformedOn(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Xərc (hər sahə üçün)">
                    <input
                      className="input"
                      inputMode="decimal"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Valyuta">
                    <select
                      className="input"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {CURRENCIES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Qeyd">
                  <textarea
                    className="input"
                    rows={2}
                    value={opNotes}
                    onChange={(e) => setOpNotes(e.target.value)}
                  />
                </FormField>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Yazılır…" : `${count} sahəyə yaz`}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
