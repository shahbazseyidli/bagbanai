"use client";

// D3.6 — onboarding activation checklist with "endowed" progress (starts at 2/6, goal-gradient) so
// the farmer feels close to done. Auto-derives what it can from server state (has a field, crop set,
// satellite data ready); action steps (AI advice opened, Telegram connected) are stamped locally via
// lib/track. Self-contained (fetches once), dismissible, and hides itself once fully activated.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, ChevronRight, X, PartyPopper } from "lucide-react";
import { api } from "@/lib/api";
import { track } from "@/lib/track";
import type { Farm, Field, Org } from "@/lib/types";

interface Step {
  key: string;
  label: string;
  done: boolean;
  href?: string;
  hint?: string;
}

const DONE_KEY = "bagban_checklist_done";

export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DONE_KEY) === "1") { setDismissed(true); return; }
    } catch { /* noop */ }

    let active = true;
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        if (orgs.length === 0) return;
        const farms = await api.get<Farm[]>(`/api/farms?org_id=${orgs[0].id}`);
        const lists = await Promise.all(
          farms.map((f) => api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [])),
        );
        const fields = lists.flat();
        const first = fields[0] ?? null;

        let hasCrop = false;
        let hasData = false;
        if (first) {
          const [meta, ds] = await Promise.all([
            api.get<{ crop_type?: string }>(`/api/fields/${first.id}/metadata`).catch(() => null),
            api.get<{ status: string }>(`/api/fields/${first.id}/data-status`).catch(() => null),
          ]);
          hasCrop = !!meta?.crop_type;
          hasData = !!ds && ["ready", "partial", "processing"].includes(ds.status);
        }
        const flag = (k: string) => {
          try { return localStorage.getItem(`bagban_done_${k}`) === "1"; } catch { return false; }
        };

        const s: Step[] = [
          { key: "account", label: "Hesab yaradıldı", done: true },
          { key: "field", label: "İlk tarlanı əlavə et", done: fields.length > 0, href: "/onboarding" },
          { key: "crop", label: "Məhsul növünü təyin et", done: hasCrop,
            href: first ? `/fields/${first.id}?tab=metadata` : "/onboarding" },
          { key: "data", label: "İlk peyk məlumatını gör", done: hasData,
            href: first ? `/fields/${first.id}` : undefined, hint: first && !hasData ? "hazırlanır" : undefined },
          { key: "advice", label: "AI aqronom məsləhətini aç", done: flag("advice"),
            href: first ? `/fields/${first.id}?tab=ai` : undefined },
          { key: "telegram", label: "Bildirişləri Telegram-a bağla", done: flag("telegram"), href: "/" },
        ];
        if (!active) return;
        setSteps(s);
        if (s.every((x) => x.done)) {
          try { localStorage.setItem(DONE_KEY, "1"); } catch { /* noop */ }
          track("checklist_complete");
        }
      } catch { /* ignore — the checklist is a nicety */ }
    })();
    return () => { active = false; };
  }, []);

  if (dismissed || !steps) return null;
  const done = steps.filter((s) => s.done).length;
  if (done >= steps.length) return null;

  function close() {
    setDismissed(true);
    try { localStorage.setItem(DONE_KEY, "1"); } catch { /* noop */ }
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <PartyPopper className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Başlanğıc — {done}/{steps.length}
        </h2>
        <button onClick={close} aria-label="Bağla" className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ul className="mt-3 space-y-1">
        {steps.map((s) => {
          const inner = (
            <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${s.href && !s.done ? "hover:bg-white" : ""}`}>
              {s.done
                ? <Check className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                : <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />}
              <span className={`flex-1 text-sm ${s.done ? "text-slate-400 line-through" : "font-medium text-slate-800"}`}>
                {s.label}
              </span>
              {s.hint && !s.done && <span className="text-[11px] font-medium text-amber-600">{s.hint}</span>}
              {s.href && !s.done && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
            </div>
          );
          return (
            <li key={s.key}>{s.href && !s.done ? <Link href={s.href}>{inner}</Link> : inner}</li>
          );
        })}
      </ul>
    </div>
  );
}
