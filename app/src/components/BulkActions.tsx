"use client";

// B14 — bulk actions across multi-selected fields (HYBRID_PLAN W7). Renders nothing until at least
// one field is selected; then a compact sticky bar offers the ONE write that still makes sense for
// a whole selection: an operation-log row per field. `POST /api/bulk/operations` verifies every
// field belongs to the org and writes them in one transaction.
//
// There used to be a second half here that created a task per field. The ERP strip (81660df)
// deleted tasks, including `POST /api/bulk/tasks` — routers/bulk.py now declares that one route and
// nothing else — so the button survived as a guaranteed 404 behind a form that looked fine.
// Operations stayed because they are an AI input, not bookkeeping: ai/context.py reads them so the
// advice can say "irrigation was logged 10 days ago and NDMI is still falling".
//
// The chrome is fully translated; what is still inline AZ is exactly OP_TYPES below, which renders
// as <option> labels — extracting it needs new keys in i18n.ts + all 7 locale files.
import { useState } from "react";
import { CalendarCheck, Sprout, X } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Spinner } from "@/components/ui";
import CropGrid from "@/components/field/info/CropGrid";
import { CROP_CYCLE } from "@/lib/metadataOptions";

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

const OP_TYPES = ["Suvarma", "Gübrələmə", "Çiləmə", "Şumlama", "Əkin", "Yığım", "Budama", "Alaqotu"];
const CURRENCIES = ["AZN", "USD", "EUR"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BulkActions({ orgId, fieldIds, onDone }: BulkActionsProps) {
  const [mode, setMode] = useState<"" | "op" | "crop">("");
  const [bulkCrop, setBulkCrop] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

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

  function resetOp() {
    setOpType(OP_TYPES[0]);
    setPerformedOn(today());
    setCost("");
    setCurrency("AZN");
    setOpNotes("");
  }

  async function submitOp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    if (!opType.trim()) {
      setError(t("app.bulkActions.opTypeRequired"));
      return;
    }
    if (!performedOn) {
      setError(t("app.bulkActions.dateRequired"));
      return;
    }
    const c = cost.trim() ? Number(cost) : undefined;
    if (c !== undefined && (!Number.isFinite(c) || c < 0)) {
      setError(t("app.bulkActions.costInvalid"));
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
      setDone(`${res.created}${t("app.bulkActions.opsAddedSuffix")}`);
      resetOp();
      setMode("");
      onDone?.();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  // The mobile offset clears the bottom nav via --nav-clear (globals.css = the bar's real
  // border-box height + the safe-area inset), plus 12px of breathing room. It used to hard-code
  // `env(safe-area-inset-bottom) + 5rem`, i.e. 80px for a bar that is 81.5px tall — so the bar's
  // bottom edge sat 1.5px INSIDE the nav and the nav (z-40) painted over it. Never re-guess the
  // height here; the token is the one place that knows it. md:bottom-4 because the nav is
  // md:hidden and this bar is not.
  return (
    <div className="sticky bottom-[calc(var(--nav-clear)_+_0.75rem)] z-30 md:bottom-4">
      <div className="rounded-xl border-[1.5px] border-emerald-300 bg-white p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{count}{t("app.bulkActions.fieldsSelectedSuffix")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setDone("");
                setError("");
                setMode(mode === "op" ? "" : "op");
              }}
            >
              <CalendarCheck className="h-4 w-4" /> {t("app.bulkActions.addOperation")}
            </button>
            {/* Setting this year's crop on forty fields used to be forty page visits. */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setDone("");
                setError("");
                setMode(mode === "crop" ? "" : "crop");
              }}
            >
              <Sprout className="h-4 w-4" /> {t("app.bulkActions.setCrop")}
            </button>
          </div>
        </div>

        {mode === "crop" && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <CropGrid cycle={null} value={bulkCrop || null} onChange={(v) => setBulkCrop(v ?? "")} />
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !bulkCrop.trim()}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api.post("/api/bulk/crop", {
                    org_id: orgId,
                    field_ids: fieldIds,
                    crop_type: bulkCrop.trim(),
                    crop_cycle: CROP_CYCLE[bulkCrop.trim()] ?? null,
                  });
                  setDone(`${fieldIds.length}${t("app.bulkActions.cropSetSuffix")}`);
                  setMode("");
                  setBulkCrop("");
                  onDone?.();
                } catch (err) {
                  setError(azError(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Spinner /> : null}
              {fieldIds.length}{t("app.bulkActions.writeToFieldsSuffix")}
            </button>
          </div>
        )}

        {done && !mode && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>
        )}

        {mode !== "" && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{t("app.bulkActions.opFormHeading")}</h3>
              <button
                type="button"
                className="inline-flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={closeForm}
                aria-label={t("app.bulkActions.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ErrorNote message={error} />

            <form onSubmit={submitOp} className="mt-2 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={t("app.bulkActions.operationLabel")} required>
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
                  <FormField label={t("app.bulkActions.dateLabel")} required>
                    <input
                      className="input"
                      type="date"
                      value={performedOn}
                      onChange={(e) => setPerformedOn(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={t("app.bulkActions.costLabel")}>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label={t("app.bulkActions.currencyLabel")}>
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
                <FormField label={t("app.bulkActions.note")}>
                  <textarea
                    className="input"
                    rows={2}
                    value={opNotes}
                    onChange={(e) => setOpNotes(e.target.value)}
                  />
                </FormField>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? t("app.bulkActions.saving") : `${count}${t("app.bulkActions.writeToFieldsSuffix")}`}
                </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
