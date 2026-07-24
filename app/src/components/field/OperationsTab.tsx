"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";
import type { Operation, SpraySafety } from "@/lib/types";

// D5.4 — click-first: the common field operations + currencies as tap chips.
const OP_TYPES = ["Suvarma", "Gübrələmə", "Çiləmə", "Şumlama", "Əkin", "Yığım", "Budama", "Alaqotu"].map(
  (v) => ({ value: v, label: v }),
);
const CURRENCIES = ["AZN", "USD", "EUR"].map((v) => ({ value: v, label: v }));

// B6 — spray operations (pesticide) carry a pre-harvest interval; show a PHI field for these.
const SPRAY_TYPES = new Set(["Çiləmə", "spraying", "Dərmanlama"]);

interface InputRow {
  product: string;
  amount: string;
}

export default function OperationsTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Operation[]>([]);
  const [safety, setSafety] = useState<SpraySafety | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState("");
  const [performedOn, setPerformedOn] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("AZN");
  const [phi, setPhi] = useState("");
  const [notes, setNotes] = useState("");
  const [inputs, setInputs] = useState<InputRow[]>([]);

  const isSpray = SPRAY_TYPES.has(type);

  async function load() {
    try {
      setItems(await api.get<Operation[]>(`/api/operations?field_id=${fieldId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
    try {
      setSafety(await api.get<SpraySafety>(`/api/fields/${fieldId}/spray-safety`));
    } catch {
      // spray-safety is best-effort; ignore (e.g. pre-migration servers).
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
        phi_days: isSpray && phi ? Number(phi) : undefined,
        notes: notes || undefined,
      });
      setType("");
      setPerformedOn("");
      setCost("");
      setPhi("");
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
      {/* B6 — pre-harvest interval (PHI) safety banner. */}
      {safety?.active ? (
        <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-amber-300 bg-amber-50 p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              Yığım hələ təhlükəsiz deyil — {safety.active.days_left} gün qalıb
            </p>
            <p className="mt-0.5 text-amber-800">
              Son çiləmə {safety.active.performed_on}
              {safety.active.products.length > 0 && ` (${safety.active.products.join(", ")})`} ·
              gözləmə müddəti {safety.active.phi_days} gün · təhlükəsiz tarix{" "}
              <span className="font-medium">{safety.active.safe_date}</span>.
            </p>
          </div>
        </div>
      ) : safety && safety.sprays.length > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="font-medium">Yığım təhlükəsizdir — bütün çiləmə gözləmə müddətləri bitib.</p>
        </div>
      ) : null}

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
          {isSpray && (
            <FormField label="Gözləmə müddəti — PHI (gün)">
              <input
                className="input"
                type="number"
                min="0"
                value={phi}
                onChange={(e) => setPhi(e.target.value)}
                placeholder="Dərman etiketindəki yığıma qədər gün"
              />
            </FormField>
          )}
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
                {op.phi_days != null && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                    <ShieldAlert className="h-3 w-3" /> PHI {op.phi_days} gün
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
