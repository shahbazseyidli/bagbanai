"use client";

// Shared repeatable array sub-forms (the "long tail" of the field-info form):
// difficulties / rotation_history / fertilizer_history / prior_yields /
// pest_history. Extracted from MetadataTab so both the onboarding wizard and the
// MetadataTab reuse the exact same array editors + (de)serialisation helpers.

import { Plus, Trash2 } from "lucide-react";
import { t } from "@/lib/i18n";
import type { FieldMetadata } from "@/lib/types";
import {
  type Opt,
  CROP_OPTIONS,
  DIFFICULTY_TYPE_OPTIONS,
  PEST_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  FERTILIZER_OPTIONS,
} from "@/lib/metadataOptions";

export type Row = Record<string, string>;

// Compact dropdown for a repeatable-row cell. Any unknown existing value is
// injected as an option so it is preserved (no free-text box here — 1 click).
function CellSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  const known = options.some((o) => o.value === value);
  return (
    <select className="input flex-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("common.select")}</option>
      {!known && value ? <option value={value}>{value}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Definition of a repeatable array sub-form: its label and column fields.
export interface ArrayDef {
  key: keyof FieldMetadata;
  label: string;
  cols: { name: string; label: string; type?: "text" | "number"; options?: Opt[] }[];
}

export const ARRAY_DEFS: ArrayDef[] = [
  {
    key: "difficulties",
    label: t("meta.difficulties"),
    cols: [
      { name: "type", label: t("meta.f.type"), options: DIFFICULTY_TYPE_OPTIONS },
      { name: "note", label: t("meta.f.note") },
    ],
  },
  {
    key: "rotation_history",
    label: t("meta.rotation_history"),
    cols: [
      { name: "year", label: t("meta.f.year"), type: "number" },
      { name: "crop", label: t("meta.f.crop"), options: CROP_OPTIONS },
    ],
  },
  {
    key: "fertilizer_history",
    label: t("meta.fertilizer_history"),
    cols: [
      { name: "date", label: t("meta.f.date") },
      { name: "product", label: t("meta.f.product"), options: FERTILIZER_OPTIONS },
      { name: "amount", label: t("meta.f.amount"), type: "number" },
    ],
  },
  {
    key: "prior_yields",
    label: t("meta.prior_yields"),
    cols: [
      { name: "year", label: t("meta.f.year"), type: "number" },
      { name: "value", label: t("meta.f.value"), type: "number" },
    ],
  },
  {
    key: "pest_history",
    label: t("meta.pest_history"),
    cols: [
      { name: "type", label: t("meta.f.type"), options: PEST_TYPE_OPTIONS },
      { name: "severity", label: t("meta.f.severity"), type: "number", options: SEVERITY_OPTIONS },
      { name: "note", label: t("meta.f.note") },
    ],
  },
];

export function RepeatableRows({
  def,
  rows,
  onChange,
}: {
  def: ArrayDef;
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  function setCell(i: number, name: string, v: string) {
    const next = rows.slice();
    next[i] = { ...next[i], [name]: v };
    onChange(next);
  }
  return (
    <div>
      <label className="label">{def.label}</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {def.cols.map((col) =>
              col.options ? (
                <CellSelect
                  key={col.name}
                  value={row[col.name] ?? ""}
                  options={col.options}
                  onChange={(v) => setCell(i, col.name, v)}
                />
              ) : (
                <input
                  key={col.name}
                  className="input flex-1"
                  type={col.type ?? "text"}
                  placeholder={col.label}
                  value={row[col.name] ?? ""}
                  onChange={(e) => setCell(i, col.name, e.target.value)}
                />
              ),
            )}
            <button
              type="button"
              className="btn-ghost text-red-600"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => onChange([...rows, {}])}>
          <Plus className="h-4 w-4" /> {t("common.add")}
        </button>
      </div>
    </div>
  );
}

// Convert stored array objects into string-valued rows for the inputs.
export function toRows(arr: Array<Record<string, unknown>> | undefined): Row[] {
  if (!arr) return [];
  return arr.map((o) => {
    const r: Row = {};
    for (const [k, v] of Object.entries(o)) r[k] = v == null ? "" : String(v);
    return r;
  });
}

// Convert rows back to arrays, dropping empty rows and coercing number columns.
export function fromRows(rows: Row[], def: ArrayDef): Array<Record<string, unknown>> {
  return rows
    .filter((r) => def.cols.some((c) => (r[c.name] ?? "").trim() !== ""))
    .map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of def.cols) {
        const raw = (r[c.name] ?? "").trim();
        if (raw === "") continue;
        o[c.name] = c.type === "number" ? Number(raw) : raw;
      }
      return o;
    });
}
