"use client";

import { useEffect, useState } from "react";
import { Plus, CalendarPlus } from "lucide-react";
import { api } from "@/lib/api";
import { t, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";
import type { Task } from "@/lib/types";

const STATUSES = ["open", "in_progress", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

// D5.4 — click-first task types.
const TASK_TYPES = ["Suvarma", "Gübrələmə", "Çiləmə", "Müşahidə", "Yığım", "Şumlama"].map(
  (v) => ({ value: v, label: v }),
);

export default function TasksTab({ fieldId, orgId }: { fieldId: string; orgId: string }) {
  const [items, setItems] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      setItems(await api.get<Task[]>(`/api/tasks?org_id=${orgId}&field_id=${fieldId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId, orgId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/api/tasks", {
        org_id: orgId,
        field_id: fieldId,
        title,
        type: type || undefined,
        due_date: due || undefined,
        priority,
        notes: notes || undefined,
      });
      setTitle("");
      setType("");
      setDue("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await api.post(`/api/tasks/${id}/status`, { status });
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function generateChain() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/fields/${fieldId}/tasks/generate`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* B5 — auto season task chain from crop + planting date */}
      <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 p-3">
        <p className="flex-1 text-sm text-emerald-900">Əkin tarixi və məhsula görə mövsüm tapşırıq zəncirini avtomatik yarat.</p>
        <button className="btn-primary" onClick={generateChain} disabled={busy}>{busy ? "…" : "Zəncir yarat"}</button>
      </div>
      <form onSubmit={onSubmit} className="card space-y-3">
        <h3 className="font-semibold text-slate-800">{t("task.add")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("task.name")}>
            <input className="input" value={title} required onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label={t("task.type")}>
            <ChoiceChips value={type} onChange={setType} options={TASK_TYPES} other={{ placeholder: "Digər növ" }} />
          </FormField>
          <FormField label={t("task.due")}>
            <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </FormField>
          <FormField label={t("task.priority")}>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`task.pri.${p}` as I18nKey)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label={t("task.notes")}>
          <textarea className="input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? t("common.saving") : t("common.add")}
        </button>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-800">{t("task.title")}</h3>
          {items.some((x) => x.due_date) && (
            <a
              href={`/api/fields/${fieldId}/tasks.ics`}
              className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"
            >
              <CalendarPlus className="h-4 w-4" /> Təqvimə əlavə et (.ics)
            </a>
          )}
        </div>
        {items.length === 0 ? (
          <Placeholder>{t("task.empty")}</Placeholder>
        ) : (
          <ul className="space-y-2">
            {items.map((task) => (
              <li key={task.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    {task.priority && `${t("task.priority")}: ${t(`task.pri.${task.priority}` as I18nKey)}`}
                    {task.due_date && ` · ${task.due_date}`}
                  </p>
                </div>
                <select
                  className="input w-40"
                  value={task.status}
                  onChange={(e) => setStatus(task.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`task.status.${s}` as I18nKey)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
