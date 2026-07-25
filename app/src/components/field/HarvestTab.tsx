"use client";

// Yığım — harvest lots for one field (HYBRID_PLAN W7, B7). Every lot carries a server-generated
// trace code (AGX-2026-3F9A2C71) which is the farmer's proof-of-origin: it is shown big, is
// copyable, and travels into the sale record. "Satış qeyd et" jumps to /sales with the lot
// preselected. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Package, Plus, Receipt, Trash2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";

interface Lot {
  id: string;
  field_id: string;
  season_year: number;
  crop_type?: string | null;
  trace_code: string;
  harvested_on: string;
  quantity: number | null;
  unit: string;
  quality_grade?: string | null;
  moisture_pct?: number | null;
  storage?: string | null;
  notes?: string | null;
  sold_quantity?: number;
}

const UNITS = ["kq", "ton"].map((v) => ({ value: v, label: v }));
const GRADES = ["1-ci sort", "2-ci sort", "3-cü sort", "Standart"].map((v) => ({ value: v, label: v }));

const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("az"));

// orgId is carried into the /sales links: a user can belong to several orgs (an invited
// agronomist in a co-op), and the sales page would otherwise default to their FIRST org and
// POST a foreign field/lot, which the backend rejects with 404.
export default function HarvestTab({ fieldId, orgId }: { fieldId: string; orgId: string }) {
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const [harvestedOn, setHarvestedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kq");
  const [grade, setGrade] = useState("");
  const [moisture, setMoisture] = useState("");
  const [storage, setStorage] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      setLots(await api.get<Lot[]>(`/api/fields/${fieldId}/harvest-lots`));
    } catch (err) {
      setError(azError(err));
      setLots([]);
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
      await api.post(`/api/fields/${fieldId}/harvest-lots`, {
        harvested_on: harvestedOn,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        quality_grade: grade || undefined,
        moisture_pct: moisture ? Number(moisture) : undefined,
        storage: storage || undefined,
        notes: notes || undefined,
      });
      setQuantity("");
      setGrade("");
      setMoisture("");
      setStorage("");
      setNotes("");
      await load();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("app.field.harvestTab.deleteConfirm"))) return;
    setError("");
    try {
      await api.del(`/api/harvest-lots/${id}`);
      await load();
    } catch (err) {
      setError(azError(err));
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      // Clipboard can be blocked (insecure context) — the code stays visible on screen anyway.
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-3">
        <h3 className="font-semibold text-slate-800">{t("app.field.harvestTab.formTitle")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("app.field.harvestTab.dateLabel")} required>
            <input
              className="input"
              type="date"
              required
              value={harvestedOn}
              onChange={(e) => setHarvestedOn(e.target.value)}
            />
          </FormField>
          <FormField label={t("app.field.harvestTab.quantityLabel")}>
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("app.field.harvestTab.quantityPlaceholder")}
            />
          </FormField>
          <FormField label={t("app.field.harvestTab.unitLabel")}>
            <ChoiceChips value={unit} onChange={setUnit} options={UNITS} />
          </FormField>
          <FormField label={t("app.field.harvestTab.gradeLabel")}>
            <ChoiceChips value={grade} onChange={setGrade} options={GRADES} other={{ placeholder: t("app.field.harvestTab.gradeOtherPlaceholder") }} />
          </FormField>
          <FormField label={t("app.field.harvestTab.moistureLabel")}>
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              max="100"
              value={moisture}
              onChange={(e) => setMoisture(e.target.value)}
            />
          </FormField>
          <FormField label={t("app.field.harvestTab.storageFieldLabel")}>
            <input className="input" value={storage} onChange={(e) => setStorage(e.target.value)} />
          </FormField>
        </div>
        <FormField label={t("app.field.harvestTab.notesLabel")}>
          <textarea className="input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? t("app.field.harvestTab.savingBtn") : t("app.field.harvestTab.submitBtn")}
        </button>
        <p className="text-xs text-slate-500">
          {t("app.field.harvestTab.traceHelp")}
        </p>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-800">{t("app.field.harvestTab.lotsTitle")}</h3>
          <Link href={`/sales?field=${fieldId}&org=${orgId}`} className="btn-secondary">
            <Receipt className="h-4 w-4" /> {t("app.field.harvestTab.salesLink")}
          </Link>
        </div>

        {lots === null ? (
          <Spinner />
        ) : lots.length === 0 ? (
          <Placeholder>{t("app.field.harvestTab.emptyState")}</Placeholder>
        ) : (
          <ul className="space-y-3">
            {lots.map((l) => {
              const sold = l.sold_quantity ?? 0;
              const left = l.quantity != null ? l.quantity - sold : null;
              return (
                <li key={l.id} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">{t("app.field.harvestTab.traceCodeLabel")}</div>
                      <button
                        type="button"
                        onClick={() => copyCode(l.trace_code)}
                        className="mt-0.5 inline-flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-emerald-200 bg-emerald-50 px-3 font-mono text-base font-bold tracking-wide text-emerald-800"
                        aria-label={t("app.field.harvestTab.copyTraceAria")}
                      >
                        {l.trace_code}
                        {copied === l.trace_code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost min-h-11 text-red-600"
                      aria-label={t("app.field.harvestTab.deleteAria")}
                      onClick={() => remove(l.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-slate-400" />
                      {num(l.quantity)} {l.unit}
                    </span>
                    <span>{l.harvested_on}</span>
                    <span className="text-slate-500">{t("app.field.harvestTab.seasonLabel")} {l.season_year}</span>
                    {l.crop_type && <span className="capitalize text-slate-500">{l.crop_type}</span>}
                    {l.quality_grade && <span className="text-slate-500">{l.quality_grade}</span>}
                    {l.moisture_pct != null && <span className="text-slate-500">{t("app.field.harvestTab.moistureInline")} {l.moisture_pct}%</span>}
                    {l.storage && <span className="text-slate-500">{t("app.field.harvestTab.storageInline")} {l.storage}</span>}
                  </div>

                  {sold > 0 && (
                    <p className="text-xs text-slate-500">
                      {t("app.field.harvestTab.soldInline")} {num(sold)} {l.unit}
                      {left != null && left > 0 ? ` · ${t("app.field.harvestTab.remainingInline")}${num(left)} ${l.unit}` : ""}
                    </p>
                  )}
                  {l.notes && <p className="text-sm text-slate-700">{l.notes}</p>}

                  <Link href={`/sales?field=${l.field_id}&lot=${l.id}&org=${orgId}`} className="btn-primary">
                    <Receipt className="h-4 w-4" /> {t("app.field.harvestTab.recordSaleLink")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
