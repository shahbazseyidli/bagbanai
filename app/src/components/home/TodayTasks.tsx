"use client";

// MOCK-app-today-tasks — the approved mockup's "Bu günün işləri" .tasklist: checkable rows with the
// task title, an [avto] badge for the generated season chain, the field it belongs to, and a
// right-aligned due/priority meta column.
//
// REAL TASKS ONLY: GET /api/tasks?org_id=… (services/app/routers/mgmt.py), filtered client-side to
// what is actually due today or already overdue and still open. The checkbox posts the existing
// POST /api/tasks/{id}/status {status:"done"} — the same endpoint the field İŞLƏR tab uses.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
import type { Task } from "@/lib/types";

// Statuses that mean "no longer on the list". Both 'todo' (generated chain) and 'open' (manual
// form) are live, so filter by what is finished rather than by what is open.
const CLOSED = new Set(["done", "cancelled"]);

// services/app/routers/mgmt.py `_AUTO_MARK` — the generated season chain stamps this into notes.
const AUTO_MARK = "[auto] mövsüm zənciri";

// Optional value types on purpose: the column is free text, so an unknown priority must fall back
// rather than produce `undefined` in the UI or NaN in the sort.
const PRI_AZ: Record<string, string | undefined> = { high: "yüksək", medium: "orta", low: "aşağı" };
const PRI_RANK: Record<string, number | undefined> = { high: 0, medium: 1, low: 2 };

/** Local calendar day as YYYY-MM-DD (due_date is a plain date, so compare in local time). */
function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days between two YYYY-MM-DD strings; 0 when either is unparseable. */
function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export default function TodayTasks({
  orgId,
  fieldNames,
}: {
  orgId: string;
  fieldNames: Record<string, string>;
}) {
  const [items, setItems] = useState<Task[] | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    setItems(null);
    setDone([]);
    setError("");
    api
      .get<Task[]>(`/api/tasks?org_id=${orgId}`)
      .then((r) => { if (active) setItems(Array.isArray(r) ? r : []); })
      .catch((err) => { if (active) { setItems([]); setError(azError(err)); } });
    return () => { active = false; };
  }, [orgId]);

  async function complete(task: Task) {
    if (busy || done.includes(task.id)) return;
    setBusy(task.id);
    setError("");
    try {
      await api.post(`/api/tasks/${task.id}/status`, { status: "done" });
      setDone((prev) => [...prev, task.id]);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy("");
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 rounded-xl2 border-[1.5px] border-line bg-white p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden="true" />
        İşlər yüklənir…
      </div>
    );
  }

  const today = todayIso();
  // Due today or already overdue, still open. A task with no due date is a backlog item, not a
  // "today" item, so it is deliberately not listed here.
  const due = items
    .filter((x) => !CLOSED.has(x.status) && !!x.due_date && (x.due_date as string) <= today)
    .sort((a, b) => {
      const d = String(a.due_date).localeCompare(String(b.due_date));
      if (d !== 0) return d;
      return (PRI_RANK[a.priority ?? "medium"] ?? 1) - (PRI_RANK[b.priority ?? "medium"] ?? 1);
    });

  return (
    <div className="rounded-xl2 border-[1.5px] border-line bg-white p-4 shadow-soft">
      <ErrorNote message={error} />

      {due.length === 0 ? (
        <p className="text-sm text-slate-500">
          Bu gün üçün planlaşdırılmış iş yoxdur. Yeni işi sahənin <b>İşlər</b> bölməsindən əlavə edin.
        </p>
      ) : (
        <ul>
          {due.map((x) => {
            const isDone = done.includes(x.id);
            const late = daysBetween(String(x.due_date), today);
            const fieldName = x.field_id ? fieldNames[x.field_id] : undefined;
            const meta = [fieldName, x.priority ? PRI_AZ[x.priority] ?? x.priority : null]
              .filter(Boolean)
              .join(" · ");
            const title = (
              <div className="flex min-w-0 items-center gap-2">
                <p
                  className={`truncate text-[15px] font-bold ${
                    isDone ? "text-slate-400 line-through" : "text-slate-900"
                  }`}
                >
                  {x.title}
                </p>
                {x.notes === AUTO_MARK && (
                  <span className="shrink-0 rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    avto
                  </span>
                )}
              </div>
            );
            return (
              <li
                key={x.id}
                className="flex items-center gap-2 border-b border-line py-2 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => complete(x)}
                  disabled={isDone || busy === x.id}
                  aria-pressed={isDone}
                  aria-label={`"${x.title}" işini tamamlandı kimi işarələ`}
                  className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-[1.7px] ${
                      isDone ? "border-emerald-600 bg-emerald-600 text-white" : "border-line-2 bg-white"
                    }`}
                  >
                    {busy === x.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" aria-hidden="true" />
                    ) : isDone ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  {x.field_id ? (
                    <Link href={`/fields/${x.field_id}?tab=tasks`}>{title}</Link>
                  ) : (
                    title
                  )}
                  {meta && <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>}
                </div>

                <span className="shrink-0 text-right text-xs">
                  {late > 0 ? (
                    <b className="text-warn">{late} gün gecikib</b>
                  ) : (
                    <span className="text-slate-500">Bu gün</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
