"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";
import type { Operation } from "@/lib/types";

// D5.4 — click-first: the common field operations + currencies as tap chips.
const OP_TYPES = ["Suvarma", "Gübrələmə", "Çiləmə", "Şumlama", "Əkin", "Yığım", "Budama", "Alaqotu"].map(
  (v) => ({ value: v, label: v }),
);
const CURRENCIES = ["AZN", "USD", "EUR"].map((v) => ({ value: v, label: v }));

interface InputRow {
  product: string;
  amount: string;
}

export default function OperationsTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Operation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState("");
  const [performedOn, setPerformedOn] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("AZN");
  const [notes, setNotes] = useState("");
  const [inputs, setInputs] = useState<InputRow[]>([]);

  async function load() {
    try {
      setItems(await api.get<Operation[]>(`/api/operations?field_id=${fieldId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cleanInputs = inputs
        .filter((r) => r.product.trim() !== "")
        .map((r) => ({ product: r.product, amount: r.amount ? Number(r.amount) : undefined }));
      await api.post("/api/operations", {
        field_id: fieldId,
        type,
        performed_on: performedOn,
        inputs: cleanInputs,
        cost: cost ? Number(cost) : undefined,
        currency,
        notes: notes || undefined,
      });
      setType("");
      setPerformedOn("");
      setCost("");
      setNotes("");
      setInputs([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-3">
        <h3 className="font-semibold text-slate-800">{t("op.add")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("op.type")}>
            <ChoiceChips value={type} onChange={setType} options={OP_TYPES} other={{ placeholder: "Digər əməliyyat" }} />
          </FormField>
          <FormField label={t("op.performed_on")}>
            <input className="input" type="date" value={performedOn} required onChange={(e) => setPerformedOn(e.target.value)} />
          </FormField>
          <FormField label={t("op.cost")}>
            <input className="input" type="number" step="any" value={cost} onChange={(e) => setCost(e.target.value)} />
          </FormField>
          <FormField label={t("op.currency")}>
            <ChoiceChips value={currency} onChange={setCurrency} options={CURRENCIES} />
          </FormField>
        </div>

        <div>
          <label className="label">{t("op.inputs")}</label>
          <div className="space-y-2">
            {inputs.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder={t("meta.f.product")}
                  value={row.product}
                  onChange={(e) => {
                    const next = inputs.slice();
                    next[i] = { ...next[i], product: e.target.value };
                    setInputs(next);
                  }}
                />
                <input
                  className="input flex-1"
                  type="number"
                  step="any"
                  placeholder={t("meta.f.amount")}
                  value={row.amount}
                  onChange={(e) => {
                    const next = inputs.slice();
                    next[i] = { ...next[i], amount: e.target.value };
                    setInputs(next);
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => setInputs(inputs.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setInputs([...inputs, { product: "", amount: "" }])}>
              <Plus className="h-4 w-4" /> {t("common.add")}
            </button>
          </div>
        </div>

        <FormField label={t("op.notes")}>
          <textarea className="input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? t("common.saving") : t("common.add")}
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-semibold text-slate-800">{t("op.title")}</h3>
        {items.length === 0 ? (
          <Placeholder>{t("op.empty")}</Placeholder>
        ) : (
          <ul className="space-y-2">
            {items.map((op) => (
              <li key={op.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{op.type}</p>
                  <span className="text-sm text-slate-500">{op.performed_on}</span>
                </div>
                {op.cost != null && (
                  <p className="text-sm text-slate-600">
                    {op.cost} {op.currency ?? ""}
                  </p>
                )}
                {op.inputs && op.inputs.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {op.inputs
                      .map((r) => `${(r as { product?: string }).product ?? ""} ${(r as { amount?: number }).amount ?? ""}`.trim())
                      .join(", ")}
                  </p>
                )}
                {op.notes && <p className="mt-1 text-sm text-slate-700">{op.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
