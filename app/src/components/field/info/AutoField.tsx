"use client";

// AutoField — displays a value that was auto-filled from the map/terrain
// service (elevation, slope, aspect, region) as a chip. Shows a spinner while
// loading, and a small "dəyişdir" affordance to switch to an editable input so
// the farmer can correct it.

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";

export interface AutoFieldProps {
  /** Field caption (e.g. "Rayon", "Yüksəklik"). */
  label: string;
  /** The auto-filled value (string or number) or null when unknown. */
  value: string | number | null;
  /** Optional unit suffix shown after the value. */
  unit?: string;
  /** True while the value is being fetched. */
  loading: boolean;
  /** Fired with the edited string when the farmer overrides the value. Omit for read-only. */
  onChange?: (value: string) => void;
  /** Display-only (no "dəyişdir" affordance) — for derived values like aspect. */
  readOnly?: boolean;
}

export default function AutoField({ label, value, unit, loading, onChange, readOnly }: AutoFieldProps) {
  const [editing, setEditing] = useState(false);
  const canEdit = !readOnly && !!onChange;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {loading ? (
        <span className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Hesablanır…
        </span>
      ) : editing && canEdit ? (
        <input
          className="input"
          autoFocus
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
            {value == null || value === "" ? "—" : `${value}${unit ? ` ${unit}` : ""}`}
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
            >
              <Pencil className="h-3 w-3" /> dəyişdir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
