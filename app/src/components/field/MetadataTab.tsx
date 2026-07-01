"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField } from "@/components/ui";
import type { FieldMetadata } from "@/lib/types";

type Row = Record<string, string>;

// Definition of a repeatable array sub-form: its label and column fields.
interface ArrayDef {
  key: keyof FieldMetadata;
  label: string;
  cols: { name: string; label: string; type?: "text" | "number" }[];
}

const ARRAY_DEFS: ArrayDef[] = [
  {
    key: "difficulties",
    label: t("meta.difficulties"),
    cols: [{ name: "type", label: t("meta.f.type") }, { name: "note", label: t("meta.f.note") }],
  },
  {
    key: "rotation_history",
    label: t("meta.rotation_history"),
    cols: [
      { name: "year", label: t("meta.f.year"), type: "number" },
      { name: "crop", label: t("meta.f.crop") },
    ],
  },
  {
    key: "fertilizer_history",
    label: t("meta.fertilizer_history"),
    cols: [
      { name: "date", label: t("meta.f.date") },
      { name: "product", label: t("meta.f.product") },
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
      { name: "type", label: t("meta.f.type") },
      { name: "severity", label: t("meta.f.severity"), type: "number" },
      { name: "note", label: t("meta.f.note") },
    ],
  },
];

function RepeatableRows({
  def,
  rows,
  onChange,
}: {
  def: ArrayDef;
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  return (
    <div>
      <label className="label">{def.label}</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {def.cols.map((col) => (
              <input
                key={col.name}
                className="input flex-1"
                type={col.type ?? "text"}
                placeholder={col.label}
                value={row[col.name] ?? ""}
                onChange={(e) => {
                  const next = rows.slice();
                  next[i] = { ...next[i], [col.name]: e.target.value };
                  onChange(next);
                }}
              />
            ))}
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
function toRows(arr: Array<Record<string, unknown>> | undefined): Row[] {
  if (!arr) return [];
  return arr.map((o) => {
    const r: Row = {};
    for (const [k, v] of Object.entries(o)) r[k] = v == null ? "" : String(v);
    return r;
  });
}

// Convert rows back to arrays, dropping empty rows and coercing number columns.
function fromRows(rows: Row[], def: ArrayDef): Array<Record<string, unknown>> {
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

export default function MetadataTab({ fieldId }: { fieldId: string }) {
  const [meta, setMeta] = useState<FieldMetadata | null>(null);
  const [rowsMap, setRowsMap] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<FieldMetadata | null>(`/api/fields/${fieldId}/metadata`);
        const m = data ?? ({ crop_type: "" } as FieldMetadata);
        setMeta(m);
        const rm: Record<string, Row[]> = {};
        for (const def of ARRAY_DEFS) {
          rm[def.key as string] = toRows(m[def.key] as Array<Record<string, unknown>> | undefined);
        }
        setRowsMap(rm);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
        setMeta({ crop_type: "" } as FieldMetadata);
      }
    })();
  }, [fieldId]);

  function set<K extends keyof FieldMetadata>(key: K, value: FieldMetadata[K]) {
    setMeta((prev) => ({ ...(prev as FieldMetadata), [key]: value }));
    setSaved(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!meta) return;
    setError("");
    setSaved(false);
    if (!meta.crop_type || !meta.crop_type.trim()) {
      setError(t("meta.cropRequired"));
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...meta };
      for (const def of ARRAY_DEFS) {
        payload[def.key as string] = fromRows(rowsMap[def.key as string] ?? [], def);
      }
      await api.put(`/api/fields/${fieldId}/metadata`, payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (!meta) return null;

  return (
    <form onSubmit={onSave} className="card space-y-4">
      <h3 className="font-semibold text-slate-800">{t("meta.title")}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("meta.crop_type")} required>
          <input className="input" value={meta.crop_type ?? ""} required onChange={(e) => set("crop_type", e.target.value)} />
        </FormField>
        <FormField label={t("meta.variety")}>
          <input className="input" value={meta.variety ?? ""} onChange={(e) => set("variety", e.target.value)} />
        </FormField>
        <FormField label={t("meta.planting_date")}>
          <input className="input" type="date" value={meta.planting_date ?? ""} onChange={(e) => set("planting_date", e.target.value)} />
        </FormField>
        <FormField label={t("meta.expected_harvest")}>
          <input className="input" type="date" value={meta.expected_harvest ?? ""} onChange={(e) => set("expected_harvest", e.target.value)} />
        </FormField>
        <FormField label={t("meta.soil_type")}>
          <input className="input" value={meta.soil_type ?? ""} onChange={(e) => set("soil_type", e.target.value)} />
        </FormField>
        <FormField label={t("meta.soil_ph")}>
          <input className="input" type="number" step="0.1" value={meta.soil_ph ?? ""} onChange={(e) => set("soil_ph", e.target.value)} />
        </FormField>
        <FormField label={t("meta.irrigation_method")}>
          <input className="input" value={meta.irrigation_method ?? ""} onChange={(e) => set("irrigation_method", e.target.value)} />
        </FormField>
        <FormField label={t("meta.irrigation_available")}>
          <select
            className="input"
            value={meta.irrigation_available === undefined ? "" : meta.irrigation_available ? "yes" : "no"}
            onChange={(e) => set("irrigation_available", e.target.value === "" ? undefined : e.target.value === "yes")}
          >
            <option value="">{t("common.select")}</option>
            <option value="yes">{t("common.yes")}</option>
            <option value="no">{t("common.no")}</option>
          </select>
        </FormField>
        <FormField label={t("meta.previous_crop")}>
          <input className="input" value={meta.previous_crop ?? ""} onChange={(e) => set("previous_crop", e.target.value)} />
        </FormField>
        <FormField label={t("meta.seeding_density")}>
          <input className="input" type="number" step="any" value={meta.seeding_density ?? ""} onChange={(e) => set("seeding_density", e.target.value)} />
        </FormField>
        <FormField label={t("meta.growth_stage")}>
          <input className="input" value={meta.growth_stage ?? ""} onChange={(e) => set("growth_stage", e.target.value)} />
        </FormField>
        <FormField label={t("meta.elevation_m")}>
          <input className="input" type="number" step="any" value={meta.elevation_m ?? ""} onChange={(e) => set("elevation_m", e.target.value)} />
        </FormField>
        <FormField label={t("meta.slope_deg")}>
          <input className="input" type="number" step="any" value={meta.slope_deg ?? ""} onChange={(e) => set("slope_deg", e.target.value)} />
        </FormField>
        <FormField label={t("meta.aspect_deg")}>
          <input className="input" type="number" step="any" value={meta.aspect_deg ?? ""} onChange={(e) => set("aspect_deg", e.target.value)} />
        </FormField>
        <FormField label={t("meta.tillage_practice")}>
          <input className="input" value={meta.tillage_practice ?? ""} onChange={(e) => set("tillage_practice", e.target.value)} />
        </FormField>
        <FormField label={t("meta.target_yield")}>
          <input className="input" type="number" step="any" value={meta.target_yield ?? ""} onChange={(e) => set("target_yield", e.target.value)} />
        </FormField>
      </div>

      <FormField label={t("meta.notes")}>
        <textarea className="input h-24" value={meta.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </FormField>

      <div className="space-y-4 border-t border-slate-100 pt-4">
        {ARRAY_DEFS.map((def) => (
          <RepeatableRows
            key={def.key as string}
            def={def}
            rows={rowsMap[def.key as string] ?? []}
            onChange={(rows) => {
              setRowsMap((prev) => ({ ...prev, [def.key as string]: rows }));
              setSaved(false);
            }}
          />
        ))}
      </div>

      <ErrorNote message={error} />
      {saved && <p className="text-sm text-emerald-700">{t("meta.saved")}</p>}

      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}
