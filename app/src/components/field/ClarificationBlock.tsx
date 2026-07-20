"use client";

import { useEffect, useState } from "react";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

// One open clarification (knowledge layer M7). Farmer data is authoritative, but the AI does
// not stay silent on a clear norm deviation — it asks, with structured options (spec §10).
interface Clarification {
  id: string;
  severity: "critical" | "normal";
  topic: string;
  question_text: string;
  evidence: { observed?: number; expected_min?: number; index?: string; date?: string };
  options: { value: string; label: string }[];
}

export default function ClarificationBlock({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Clarification[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<{ clarifications: Clarification[] }>(
        `/api/fields/${fieldId}/clarifications`,
      );
      setItems(r?.clarifications ?? []);
    } catch {
      /* leave empty on transient error */
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  async function answer(clarId: string, value: string, label: string) {
    setBusy(clarId);
    // Optimistic removal — resolved clarifications don't come back (spec §10.4).
    setItems((prev) => prev.filter((c) => c.id !== clarId));
    try {
      await api.post(`/api/fields/${fieldId}/clarifications/${clarId}/answer`, { value, label });
    } catch {
      load(); // restore on failure
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return null;

  const hasCritical = items.some((c) => c.severity === "critical");

  return (
    <div
      className={`card border ${
        hasCritical ? "border-amber-300 bg-amber-50/50" : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        {hasCritical ? (
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        ) : (
          <HelpCircle className="h-5 w-5 text-emerald-600" />
        )}
        <h3 className="font-semibold text-slate-800">Dəqiqləşdirilməli məsələlər</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {items.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Cavabların analizi dəqiqləşdirir. Bu suallar bir dəfə verilir — cavab verdikdən sonra
        təkrarlanmır.
      </p>

      <div className="flex flex-col gap-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm text-slate-800">{c.question_text}</p>
            {c.evidence?.index && (
              <p className="mt-1 text-[11px] text-slate-400">
                {c.evidence.index} = {c.evidence.observed} · gözlənilən ≥ {c.evidence.expected_min}
                {c.evidence.date ? ` · ${c.evidence.date}` : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {c.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={busy === c.id}
                  onClick={() => answer(c.id, o.value, o.label)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
