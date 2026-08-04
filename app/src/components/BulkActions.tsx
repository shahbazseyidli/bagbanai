"use client";

// B14 — bulk action across multi-selected fields (HYBRID_PLAN W7). Renders nothing until at least
// one field is selected; then a compact sticky bar offers the ONE write that makes sense for a
// whole selection: this season's crop. `POST /api/bulk/crop` verifies every field belongs to the
// org and writes them in one transaction.
//
// This bar has now outlived two of its three actions. The ERP strip (81660df) deleted tasks along
// with `POST /api/bulk/tasks`, and the operation half went on 2026-08-04 with the "Əməliyyatlar"
// section — the owner's call was that Operations should not exist at all, and a bulk writer is
// still a writer. `POST /api/bulk/operations` was deleted with it, so there is no route left to
// call. Existing public.field_operations rows are untouched and ai/context.py still reads them as
// history; only the ability to ADD one is gone.
//
// With a single action the bar is deliberately shaped as one statement instead of a menu: the count
// on the left, one PRIMARY button on the right, and the crop grid opening underneath it. A lone
// secondary button floating where a row of them used to be is what a leftover looks like.
import { useState } from "react";
import { Sprout, X } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Spinner } from "@/components/ui";
import CropGrid from "@/components/field/info/CropGrid";
import { CROP_CYCLE } from "@/lib/metadataOptions";

interface BulkActionsProps {
  orgId: string;
  fieldIds: string[];
  onDone?: () => void;
}

export default function BulkActions({ orgId, fieldIds, onDone }: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [bulkCrop, setBulkCrop] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const count = fieldIds.length;
  if (count === 0) return null;

  async function submitCrop() {
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
      setOpen(false);
      setBulkCrop("");
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
          {/* Setting this year's crop on forty fields used to be forty page visits. */}
          <button
            type="button"
            className="btn-primary"
            aria-expanded={open}
            onClick={() => {
              setDone("");
              setError("");
              setOpen((o) => !o);
            }}
          >
            <Sprout className="h-4 w-4" /> {t("app.bulkActions.setCrop")}
          </button>
        </div>

        {done && !open && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>
        )}

        {open && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{t("app.bulkActions.setCrop")}</h3>
              <button
                type="button"
                className="inline-flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                aria-label={t("app.bulkActions.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ErrorNote message={error} />

            <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <CropGrid cycle={null} value={bulkCrop || null} onChange={(v) => setBulkCrop(v ?? "")} />
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !bulkCrop.trim()}
                onClick={() => void submitCrop()}
              >
                {busy ? <Spinner /> : null}
                {busy
                  ? t("app.bulkActions.saving")
                  : `${count}${t("app.bulkActions.writeToFieldsSuffix")}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
