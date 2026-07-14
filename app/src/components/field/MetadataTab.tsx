"use client";

// MetadataTab — the click-first "Sahə haqqında məlumat" editor for an existing
// field. It loads via GET /api/fields/{id}/metadata and saves via PUT. Essential
// fields use the shared click-first primitives (info/*); the long-tail array
// sub-forms reuse RepeatableRows. Existing/unknown values are preserved on load.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField } from "@/components/ui";
import type { FieldMetadata } from "@/lib/types";
import {
  SOIL_TYPE_OPTIONS,
  IRRIGATION_METHOD_OPTIONS,
  GROWTH_STAGE_OPTIONS,
  TILLAGE_OPTIONS,
} from "@/lib/metadataOptions";
import CycleCards from "./info/CycleCards";
import CropGrid from "./info/CropGrid";
import VarietyChips from "./info/VarietyChips";
import ChoiceChips from "./info/ChoiceChips";
import ClickDate from "./info/ClickDate";
import PhPicker from "./info/PhPicker";
import NumberSlider from "./info/NumberSlider";
import AutoField from "./info/AutoField";
import YesNo from "./info/YesNo";
import { ARRAY_DEFS, RepeatableRows, type Row, toRows, fromRows } from "./repeatableRows";

/** Coerce a stored numeric-or-string metadata value into a number|null. */
function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
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
      // Normalize before PUT: blank strings → null; numeric fields → number|null
      // (AutoField/edit inputs emit raw strings; Pydantic rejects "" for Optional[float]).
      const NUMERIC_KEYS = [
        "soil_ph", "seeding_density", "elevation_m", "slope_deg", "aspect_deg", "target_yield",
      ];
      for (const k of Object.keys(payload)) {
        if (payload[k] === "") payload[k] = null;
      }
      for (const k of NUMERIC_KEYS) {
        const v = payload[k];
        if (v === null || v === undefined || v === "") payload[k] = null;
        else {
          const n = Number(v);
          payload[k] = Number.isNaN(n) ? null : n;
        }
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

  const cycle = meta.crop_cycle ?? null;

  return (
    <form onSubmit={onSave} className="card space-y-6">
      <h3 className="font-semibold text-slate-800">{t("meta.title")}</h3>

      <FormField label="Əkin növü">
        <CycleCards value={cycle} onChange={(v) => set("crop_cycle", v)} />
      </FormField>

      <FormField label={t("meta.crop_type")} required>
        <CropGrid
          cycle={cycle}
          value={meta.crop_type || null}
          onChange={(v) => {
            set("crop_type", v ?? "");
            set("variety", undefined);
          }}
        />
      </FormField>

      <FormField label={t("meta.variety")}>
        <VarietyChips
          crop={meta.crop_type || null}
          value={meta.variety ?? null}
          onChange={(v) => set("variety", v ?? undefined)}
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label={t("meta.planting_date")}>
          <ClickDate
            mode={cycle === "perennial" ? "year" : "date"}
            value={meta.planting_date ?? null}
            onChange={(v) => set("planting_date", v ?? undefined)}
          />
        </FormField>
        <FormField label={t("meta.expected_harvest")}>
          <ClickDate
            mode="date"
            value={meta.expected_harvest ?? null}
            onChange={(v) => set("expected_harvest", v ?? undefined)}
          />
        </FormField>
      </div>

      <FormField label={t("meta.soil_type")}>
        <ChoiceChips
          options={SOIL_TYPE_OPTIONS}
          value={meta.soil_type ?? null}
          onChange={(v) => set("soil_type", v ?? undefined)}
          allowOther
          allowUnknown
        />
      </FormField>

      <FormField label={t("meta.soil_ph")}>
        <PhPicker value={toNum(meta.soil_ph)} onChange={(v) => set("soil_ph", v ?? undefined)} />
      </FormField>

      <FormField label={t("meta.irrigation_method")}>
        <ChoiceChips
          options={IRRIGATION_METHOD_OPTIONS}
          value={meta.irrigation_method ?? null}
          onChange={(v) => set("irrigation_method", v ?? undefined)}
          allowOther
          allowUnknown
        />
      </FormField>

      <FormField label={t("meta.irrigation_available")}>
        <YesNo
          value={meta.irrigation_available ?? null}
          onChange={(v) => set("irrigation_available", v ?? undefined)}
        />
      </FormField>

      <FormField label={t("meta.previous_crop")}>
        <CropGrid
          cycle={null}
          value={meta.previous_crop ?? null}
          onChange={(v) => set("previous_crop", v ?? undefined)}
        />
      </FormField>

      <FormField label={t("meta.growth_stage")}>
        <ChoiceChips
          options={GROWTH_STAGE_OPTIONS}
          value={meta.growth_stage ?? null}
          onChange={(v) => set("growth_stage", v ?? undefined)}
          allowUnknown
        />
      </FormField>

      <FormField label={t("meta.tillage_practice")}>
        <ChoiceChips
          options={TILLAGE_OPTIONS}
          value={meta.tillage_practice ?? null}
          onChange={(v) => set("tillage_practice", v ?? undefined)}
          allowUnknown
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label={t("meta.seeding_density")}>
          <NumberSlider
            value={toNum(meta.seeding_density)}
            onChange={(v) => set("seeding_density", v ?? undefined)}
            min={0}
            max={500}
            step={1}
            unit="kg/ha"
          />
        </FormField>
        <FormField label={t("meta.target_yield")}>
          <NumberSlider
            value={toNum(meta.target_yield)}
            onChange={(v) => set("target_yield", v ?? undefined)}
            min={0}
            max={100}
            step={0.5}
            unit="t/ha"
          />
        </FormField>
      </div>

      <div className="grid gap-6 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
        <AutoField
          label="Rayon"
          value={meta.region ?? null}
          loading={false}
          onChange={(v) => set("region", v)}
        />
        <AutoField
          label={t("meta.elevation_m")}
          value={toNum(meta.elevation_m)}
          unit="m"
          loading={false}
          onChange={(v) => set("elevation_m", v)}
        />
        <AutoField
          label={t("meta.slope_deg")}
          value={toNum(meta.slope_deg)}
          unit="°"
          loading={false}
          onChange={(v) => set("slope_deg", v)}
        />
        <AutoField
          label={t("meta.aspect_deg")}
          value={toNum(meta.aspect_deg)}
          unit="°"
          loading={false}
          onChange={(v) => set("aspect_deg", v)}
        />
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
