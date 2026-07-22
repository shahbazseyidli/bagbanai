"use client";

// MetadataTab — the "Sahə haqqında məlumat" panel for an existing field.
// DEFAULT = a clean read-only summary of the selected values (label + AZ value,
// "—" when empty). A "Redaktə et" button switches to EDIT mode, where the
// controlled-vocabulary fields become compact <select> dropdowns (each with a
// "— seçin —" first option, a "Digər" free-text fallback and a "Bilmirəm" option
// that maps to null), dates use ClickDate, soil pH uses PhPicker, densities use
// NumberSlider, terrain uses AutoField and the array sub-forms use RepeatableRows.
// It loads via GET /api/fields/{id}/metadata and saves via PUT. Existing/unknown
// values are preserved on load and round-trip through both modes.

import { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField } from "@/components/ui";
import type { FieldMetadata } from "@/lib/types";
import {
  type Opt,
  CYCLE_OPTIONS,
  CROP_OPTIONS,
  VARIETY_OPTIONS_BY_CROP,
  SOIL_TYPE_OPTIONS,
  IRRIGATION_METHOD_OPTIONS,
  GROWTH_STAGE_OPTIONS,
  TILLAGE_OPTIONS,
} from "@/lib/metadataOptions";
import ClickDate from "./info/ClickDate";
import PhPicker from "./info/PhPicker";
import NumberSlider from "./info/NumberSlider";
import AutoField from "./info/AutoField";
import { AZ_RAYONS } from "@/lib/regions";
import YesNo from "./info/YesNo";
import { ARRAY_DEFS, RepeatableRows, type Row, toRows, fromRows } from "./repeatableRows";

/** Coerce a stored numeric-or-string metadata value into a number|null. */
function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Return an option's AZ label, the raw value when unknown, or null when empty. */
function labelOf(options: Opt[], value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

const OTHER = "__other__";
const UNKNOWN = "__unknown__";

// Compact controlled-vocabulary dropdown for edit mode. First option is
// "— seçin —" (emits undefined = unset), "Digər" reveals a free-text box that
// preserves values outside the list, and "Bilmirəm" emits null.
function VocabSelect({
  options,
  value,
  onChange,
}: {
  options: Opt[];
  value: string | null | undefined;
  onChange: (v: string | null | undefined) => void;
}) {
  const hasVal = typeof value === "string" && value !== "";
  const isKnown = hasVal && options.some((o) => o.value === value);
  const isCustom = hasVal && !isKnown;
  const [other, setOther] = useState(isCustom);
  const showOther = other || isCustom;
  const selectVal = showOther ? OTHER : isKnown ? (value as string) : "";
  return (
    <div className="space-y-2">
      <select
        className="input"
        value={selectVal}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setOther(true);
            onChange(isCustom ? value : "");
          } else if (v === UNKNOWN) {
            setOther(false);
            onChange(null);
          } else if (v === "") {
            setOther(false);
            onChange(undefined);
          } else {
            setOther(false);
            onChange(v);
          }
        }}
      >
        <option value="">— seçin —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={OTHER}>Digər</option>
        <option value={UNKNOWN}>Bilmirəm</option>
      </select>
      {showOther && (
        <input
          className="input"
          placeholder="Digər (əl ilə)"
          value={isCustom ? (value as string) : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      )}
    </div>
  );
}

/** One read-only label/value line; shows "—" when the value is empty. */
function DisplayRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

/** A titled card grouping several DisplayRow lines. */
function DisplayGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 px-4">
        {children}
      </div>
    </div>
  );
}

export default function MetadataTab({ fieldId }: { fieldId: string }) {
  const [meta, setMeta] = useState<FieldMetadata | null>(null);
  const [rowsMap, setRowsMap] = useState<Record<string, Row[]>>({});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // Snapshot taken on entering edit mode so "Ləğv et" can discard changes.
  const snapshot = useRef<{ meta: FieldMetadata; rowsMap: Record<string, Row[]> } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadFailed(false);
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
        setLoadFailed(true);
        setMeta({ crop_type: "" } as FieldMetadata);
      }
    })();
  }, [fieldId]);

  function set<K extends keyof FieldMetadata>(key: K, value: FieldMetadata[K]) {
    setMeta((prev) => ({ ...(prev as FieldMetadata), [key]: value }));
    setSaved(false);
  }

  function enterEdit() {
    if (!meta || loadFailed) return;
    snapshot.current = {
      meta: JSON.parse(JSON.stringify(meta)) as FieldMetadata,
      rowsMap: JSON.parse(JSON.stringify(rowsMap)) as Record<string, Row[]>,
    };
    setError("");
    setSaved(false);
    setEditing(true);
  }

  function cancelEdit() {
    if (snapshot.current) {
      setMeta(snapshot.current.meta);
      setRowsMap(snapshot.current.rowsMap);
    }
    setError("");
    setEditing(false);
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
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (!meta) return null;

  const cycle = meta.crop_cycle ?? null;
  const varietyOptions = VARIETY_OPTIONS_BY_CROP[meta.crop_type ?? ""] ?? [];

  // ---- DISPLAY MODE -------------------------------------------------------
  if (!editing) {
    const bool = (b?: boolean | null): string | null => (b == null ? null : b ? "Bəli" : "Xeyr");
    const str = (v?: string | null): string | null => (v == null || v === "" ? null : v);
    const num = (v: number | string | null | undefined, unit: string): string | null => {
      const n = toNum(v);
      return n == null ? null : `${n} ${unit}`;
    };
    const deg = (v: number | string | null | undefined): string | null => {
      const n = toNum(v);
      return n == null ? null : `${n}°`;
    };
    const count = (def: (typeof ARRAY_DEFS)[number]): string =>
      String(fromRows(rowsMap[def.key as string] ?? [], def).length);

    return (
      <div className="card space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-slate-800">{t("meta.title")}</h3>
          {!loadFailed && (
            <button type="button" className="btn-secondary" onClick={enterEdit}>
              Redaktə et
            </button>
          )}
        </div>
        {loadFailed && (
          <p className="text-sm text-red-600">
            Məlumat yüklənmədi{error ? `: ${error}` : ""}. Redaktə mövcud məlumatı silə bilər — səhifəni yeniləyin.
          </p>
        )}
        {saved && <p className="text-sm text-emerald-700">{t("meta.saved")}</p>}

        <div className="grid gap-6 sm:grid-cols-2">
          <DisplayGroup title="Əkin">
            <DisplayRow label="Əkin növü" value={labelOf(CYCLE_OPTIONS, meta.crop_cycle)} />
            <DisplayRow label={t("meta.crop_type")} value={labelOf(CROP_OPTIONS, meta.crop_type)} />
            <DisplayRow label={t("meta.variety")} value={labelOf(varietyOptions, meta.variety)} />
            <DisplayRow label={t("meta.planting_date")} value={str(meta.planting_date)} />
            <DisplayRow label={t("meta.expected_harvest")} value={str(meta.expected_harvest)} />
            <DisplayRow label={t("meta.previous_crop")} value={labelOf(CROP_OPTIONS, meta.previous_crop)} />
            <DisplayRow label={t("meta.growth_stage")} value={labelOf(GROWTH_STAGE_OPTIONS, meta.growth_stage)} />
          </DisplayGroup>

          <DisplayGroup title="Torpaq">
            <DisplayRow label={t("meta.soil_type")} value={labelOf(SOIL_TYPE_OPTIONS, meta.soil_type)} />
            <DisplayRow label={t("meta.soil_ph")} value={num(meta.soil_ph, "")} />
            <DisplayRow label={t("meta.tillage_practice")} value={labelOf(TILLAGE_OPTIONS, meta.tillage_practice)} />
          </DisplayGroup>

          <DisplayGroup title="Suvarma">
            <DisplayRow
              label={t("meta.irrigation_method")}
              value={labelOf(IRRIGATION_METHOD_OPTIONS, meta.irrigation_method)}
            />
            <DisplayRow label={t("meta.irrigation_available")} value={bool(meta.irrigation_available)} />
          </DisplayGroup>

          <DisplayGroup title="Məhsuldarlıq">
            <DisplayRow label={t("meta.seeding_density")} value={num(meta.seeding_density, "kg/ha")} />
            <DisplayRow label={t("meta.target_yield")} value={num(meta.target_yield, "t/ha")} />
          </DisplayGroup>

          <DisplayGroup title="Relyef">
            <DisplayRow label="Rayon" value={str(meta.region)} />
            <DisplayRow label={t("meta.elevation_m")} value={num(meta.elevation_m, "m")} />
            <DisplayRow label={t("meta.slope_deg")} value={deg(meta.slope_deg)} />
            <DisplayRow label={t("meta.aspect_deg")} value={deg(meta.aspect_deg)} />
          </DisplayGroup>

          <DisplayGroup title="Əlavə tarixçə">
            {ARRAY_DEFS.map((def) => (
              <DisplayRow key={def.key as string} label={def.label} value={count(def)} />
            ))}
          </DisplayGroup>
        </div>

        {str(meta.notes) && (
          <DisplayGroup title={t("meta.notes")}>
            <p className="whitespace-pre-wrap py-2 text-sm text-slate-700">{meta.notes}</p>
          </DisplayGroup>
        )}
      </div>
    );
  }

  // ---- EDIT MODE ----------------------------------------------------------
  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-slate-800">{t("meta.title")}</h3>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <FormField label="Əkin növü">
          <VocabSelect
            options={CYCLE_OPTIONS}
            value={meta.crop_cycle ?? undefined}
            onChange={(v) => set("crop_cycle", v ?? null)}
          />
        </FormField>

        <FormField label={t("meta.crop_type")} required>
          <VocabSelect
            options={CROP_OPTIONS}
            value={meta.crop_type || undefined}
            onChange={(v) => {
              const nv = v ?? "";
              if (nv !== meta.crop_type) set("variety", undefined);
              set("crop_type", nv);
            }}
          />
        </FormField>

        <FormField label={t("meta.variety")}>
          <VocabSelect
            key={meta.crop_type ?? ""}
            options={varietyOptions}
            value={meta.variety}
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
          <VocabSelect
            options={SOIL_TYPE_OPTIONS}
            value={meta.soil_type}
            onChange={(v) => set("soil_type", v ?? undefined)}
          />
        </FormField>

        <FormField label={t("meta.soil_ph")}>
          <PhPicker value={toNum(meta.soil_ph)} onChange={(v) => set("soil_ph", v ?? undefined)} />
        </FormField>

        <FormField label={t("meta.irrigation_method")}>
          <VocabSelect
            options={IRRIGATION_METHOD_OPTIONS}
            value={meta.irrigation_method}
            onChange={(v) => set("irrigation_method", v ?? undefined)}
          />
        </FormField>

        <FormField label={t("meta.irrigation_available")}>
          <YesNo
            value={meta.irrigation_available ?? null}
            onChange={(v) => set("irrigation_available", v ?? undefined)}
          />
        </FormField>

        <FormField label={t("meta.previous_crop")}>
          <VocabSelect
            options={CROP_OPTIONS}
            value={meta.previous_crop}
            onChange={(v) => set("previous_crop", v ?? undefined)}
          />
        </FormField>

        <FormField label={t("meta.growth_stage")}>
          <VocabSelect
            options={GROWTH_STAGE_OPTIONS}
            value={meta.growth_stage}
            onChange={(v) => set("growth_stage", v ?? undefined)}
          />
        </FormField>

        <FormField label={t("meta.tillage_practice")}>
          <VocabSelect
            options={TILLAGE_OPTIONS}
            value={meta.tillage_practice}
            onChange={(v) => set("tillage_practice", v ?? undefined)}
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
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">Rayon</p>
            <select
              className="input"
              value={AZ_RAYONS.find((r) => (meta.region ?? "").includes(r)) ?? ""}
              onChange={(e) => set("region", e.target.value || null)}
            >
              <option value="">Rayon seçin</option>
              {AZ_RAYONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
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
            readOnly
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

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? t("common.saving") : t("common.save")}
          </button>
          <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={busy}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
