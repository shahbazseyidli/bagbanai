"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Table2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  t,
  subsidyTypeLabels,
  regionCategoryLabels,
  irrigationLabels,
  plantingPeriodLabels,
  intensityLabels,
  cropGroupLabels,
  cropLabels,
  labelFor,
} from "@/lib/i18n";
import { ErrorNote, Spinner } from "@/components/ui";
import type {
  Farm,
  Field,
  Org,
  SubsidyCalcResult,
  SubsidyDimensions,
  SubsidyOptions,
  SubsidyRate,
} from "@/lib/types";

const YEAR = 2026;
const SOURCE_URL = "https://agro.gov.az/az/news/010920254";

// Tap-to-select button grid.
function OptionGrid({
  options,
  labels,
  value,
  onSelect,
}: {
  options: string[];
  labels: Record<string, string>;
  value: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(o)}
          className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
            value === o
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
          }`}
        >
          {labelFor(labels, o)}
        </button>
      ))}
    </div>
  );
}

export default function SubsidyPage() {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Calculator className="h-6 w-6 text-emerald-600" />
            {t("sub.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("sub.subtitle")}</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowTable((v) => !v)}>
          <Table2 className="h-4 w-4" />
          {showTable ? t("sub.hideTable") : t("sub.fullTable")}
        </button>
      </div>

      {showTable ? <RatesTable /> : <Wizard />}
    </div>
  );
}

interface CalcBody {
  year: number;
  subsidy_type: string;
  crop_group: string;
  crop: string;
  intensity?: string;
  region_category?: string;
  region_rayon?: string;
  irrigation?: string;
  planting_period?: string;
  quantity_ha?: number;
  tons?: number;
  modifiers: {
    boyuk_qayidis?: boolean;
    certified_seed?: boolean;
    soil_analysis?: boolean;
  };
}

function Wizard() {
  const { user } = useAuth();

  const [type, setType] = useState<string | null>(null);
  const [typeOpts, setTypeOpts] = useState<string[]>([]);

  const [group, setGroup] = useState<string | null>(null);
  const [groupOpts, setGroupOpts] = useState<string[]>([]);

  const [crop, setCrop] = useState<string | null>(null);
  const [cropOpts, setCropOpts] = useState<string[]>([]);

  const [dims, setDims] = useState<SubsidyDimensions | null>(null);
  const [intensity, setIntensity] = useState<string | null>(null);
  const [regionCategory, setRegionCategory] = useState<string | null>(null);
  const [regionRayon, setRegionRayon] = useState<string>("");
  const [irrigation, setIrrigation] = useState<string | null>(null);
  const [plantingPeriod, setPlantingPeriod] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("");
  const [mods, setMods] = useState({ boyuk_qayidis: false, certified_seed: false, soil_analysis: false });

  const [result, setResult] = useState<SubsidyCalcResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Field prefill affordance.
  const [fields, setFields] = useState<Field[]>([]);

  // Load top-level subsidy types.
  useEffect(() => {
    (async () => {
      try {
        const opts = await api.get<SubsidyOptions>("/api/subsidy/options");
        setTypeOpts(opts.subsidy_types ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
      }
    })();
  }, []);

  // Best-effort load of the user's fields for "Sahədən doldur".
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        const all: Field[] = [];
        for (const org of orgs) {
          const farms = await api.get<Farm[]>(`/api/farms?org_id=${org.id}`);
          for (const farm of farms) {
            const fs = await api.get<Field[]>(`/api/fields?farm_id=${farm.id}`);
            all.push(...fs);
          }
        }
        setFields(all);
      } catch {
        // ignore — prefill is optional
      }
    })();
  }, [user]);

  const isTon = type === "product";

  const selectType = useCallback(async (value: string) => {
    setType(value);
    setGroup(null);
    setCrop(null);
    setDims(null);
    setResult(null);
    try {
      const opts = await api.get<SubsidyOptions>(`/api/subsidy/options?type=${value}`);
      setGroupOpts(opts.crop_groups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }, []);

  const selectGroup = useCallback(
    async (value: string) => {
      setGroup(value);
      setCrop(null);
      setDims(null);
      setResult(null);
      try {
        const opts = await api.get<SubsidyOptions>(`/api/subsidy/options?type=${type}&group=${value}`);
        setCropOpts(opts.crops ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
      }
    },
    [type],
  );

  const selectCrop = useCallback(
    async (value: string) => {
      setCrop(value);
      setDims(null);
      setResult(null);
      setIntensity(null);
      setRegionCategory(null);
      setIrrigation(null);
      setPlantingPeriod(null);
      try {
        const opts = await api.get<SubsidyOptions>(
          `/api/subsidy/options?type=${type}&group=${group}&crop=${value}`,
        );
        setDims(opts.dimensions ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
      }
    },
    [type, group],
  );

  function prefillFromField(fieldId: string) {
    const f = fields.find((x) => x.id === fieldId);
    if (!f) return;
    if (f.area_ha) setQuantity(String(f.area_ha.toFixed(2)));
    // Crop is stored in metadata; fetch best-effort.
    (async () => {
      try {
        const meta = await api.get<{ crop_type?: string } | null>(`/api/fields/${fieldId}/metadata`);
        const cropCode = meta?.crop_type;
        if (cropCode && cropOpts.includes(cropCode)) {
          await selectCrop(cropCode);
        }
      } catch {
        // ignore
      }
    })();
  }

  async function calculate() {
    if (!type || !group || !crop) return;
    setError("");
    setResult(null);
    setSaved(false);
    setBusy(true);
    const body: CalcBody = {
      year: YEAR,
      subsidy_type: type,
      crop_group: group,
      crop,
      intensity: intensity ?? undefined,
      region_category: regionCategory ?? undefined,
      region_rayon: dims?.needs_region_rayon && regionRayon ? regionRayon : undefined,
      irrigation: irrigation ?? undefined,
      planting_period: plantingPeriod ?? undefined,
      quantity_ha: !isTon && quantity ? Number(quantity) : undefined,
      tons: isTon && quantity ? Number(quantity) : undefined,
      modifiers: mods,
    };
    try {
      const res = await api.post<SubsidyCalcResult>("/api/subsidy/calculate", body);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!type || !group || !crop) return;
    try {
      await api.post("/api/subsidy/save", {
        year: YEAR,
        subsidy_type: type,
        crop_group: group,
        crop,
        intensity: intensity ?? undefined,
        region_category: regionCategory ?? undefined,
        region_rayon: regionRayon || undefined,
        irrigation: irrigation ?? undefined,
        planting_period: plantingPeriod ?? undefined,
        quantity_ha: !isTon && quantity ? Number(quantity) : undefined,
        tons: isTon && quantity ? Number(quantity) : undefined,
        modifiers: mods,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const canCalculate = type && group && crop && quantity;

  return (
    <div className="space-y-5">
      {/* Field prefill */}
      {user && fields.length > 0 && (
        <div className="card">
          <label className="label">{t("sub.fromField")}</label>
          <select className="input" defaultValue="" onChange={(e) => e.target.value && prefillFromField(e.target.value)}>
            <option value="">{t("common.select")}</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.area_ha?.toFixed(2)} ha)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 1: type */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-800">{t("sub.step.type")}</h3>
        {typeOpts.length === 0 ? (
          <Spinner />
        ) : (
          <OptionGrid options={typeOpts} labels={subsidyTypeLabels} value={type} onSelect={selectType} />
        )}
      </div>

      {/* Step 2: group */}
      {type && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800">{t("sub.step.group")}</h3>
          <OptionGrid options={groupOpts} labels={cropGroupLabels} value={group} onSelect={selectGroup} />
        </div>
      )}

      {/* Step 3: crop */}
      {group && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800">{t("sub.step.crop")}</h3>
          <OptionGrid options={cropOpts} labels={cropLabels} value={crop} onSelect={selectCrop} />
        </div>
      )}

      {/* Step 4: dimensions */}
      {dims && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-800">{t("sub.step.dims")}</h3>
          {dims.intensities && dims.intensities.length > 0 && (
            <Dim label={t("sub.intensity")}>
              <OptionGrid options={dims.intensities} labels={intensityLabels} value={intensity} onSelect={setIntensity} />
            </Dim>
          )}
          {dims.region_categories && dims.region_categories.length > 0 && (
            <Dim label={t("sub.region_category")}>
              <OptionGrid
                options={dims.region_categories}
                labels={regionCategoryLabels}
                value={regionCategory}
                onSelect={setRegionCategory}
              />
            </Dim>
          )}
          {dims.needs_region_rayon && (
            <Dim label={t("sub.region_rayon")}>
              {dims.eligible_regions && dims.eligible_regions.length > 0 ? (
                <select className="input" value={regionRayon} onChange={(e) => setRegionRayon(e.target.value)}>
                  <option value="">{t("common.select")}</option>
                  {dims.eligible_regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="input" value={regionRayon} onChange={(e) => setRegionRayon(e.target.value)} />
              )}
            </Dim>
          )}
          {dims.irrigations && dims.irrigations.length > 0 && (
            <Dim label={t("sub.irrigation")}>
              <OptionGrid options={dims.irrigations} labels={irrigationLabels} value={irrigation} onSelect={setIrrigation} />
            </Dim>
          )}
          {dims.planting_periods && dims.planting_periods.length > 0 && (
            <Dim label={t("sub.planting_period")}>
              <OptionGrid
                options={dims.planting_periods}
                labels={plantingPeriodLabels}
                value={plantingPeriod}
                onSelect={setPlantingPeriod}
              />
            </Dim>
          )}
        </div>
      )}

      {/* Step 5: quantity + modifiers */}
      {crop && (
        <div className="card space-y-4">
          <div>
            <label className="label">{isTon ? t("sub.qtyTon") : t("sub.qtyHa")}</label>
            <input
              className="input"
              type="number"
              step="any"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("sub.step.mods")}</label>
            <div className="flex flex-col gap-2">
              {(["boyuk_qayidis", "certified_seed", "soil_analysis"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={mods[m]}
                    onChange={(e) => setMods((prev) => ({ ...prev, [m]: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  {t(`sub.mod.${m}` as const)}
                </label>
              ))}
            </div>
          </div>

          <ErrorNote message={error} />

          <button className="btn-primary w-full" onClick={calculate} disabled={!canCalculate || busy}>
            {busy ? t("sub.calculating") : t("sub.calc")}
          </button>
        </div>
      )}

      {result && (
        <ResultCard result={result} isTon={isTon} onSave={user ? save : undefined} saved={saved} />
      )}
    </div>
  );
}

function Dim({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ResultCard({
  result,
  isTon,
  onSave,
  saved,
}: {
  result: SubsidyCalcResult;
  isTon: boolean;
  onSave?: () => void;
  saved: boolean;
}) {
  const unitLabel = isTon ? "AZN/ton" : "AZN/ha";
  return (
    <div className="card space-y-4 border-emerald-200">
      <h3 className="font-semibold text-slate-800">{t("sub.result")}</h3>

      {result.matched_rate === null ? (
        <ErrorNote message={t("sub.noRate")} />
      ) : (
        <>
          <div className="rounded-xl bg-emerald-600 px-5 py-6 text-center text-white">
            <div className="text-sm opacity-90">{t("sub.total")}</div>
            <div className="text-4xl font-bold">
              {result.total_amount.toLocaleString("az-AZ")} {result.currency}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label={t("sub.coefficient")} value={String(result.matched_rate.coefficient)} />
            <Stat
              label={t("sub.perUnit")}
              value={`${result.matched_rate.amount_per_unit} ${unitLabel}`}
            />
            <Stat label={t("sub.quantity")} value={`${result.quantity} ${result.matched_rate.unit}`} />
            <Stat
              label={result.eligibility_ok ? t("sub.eligible") : t("sub.notEligible")}
              value={result.eligibility_ok ? "✓" : "✕"}
            />
          </dl>

          {result.matched_rate.label_az && (
            <p className="text-sm text-slate-600">{result.matched_rate.label_az}</p>
          )}

          {result.modifiers_applied.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700">{t("sub.modsApplied")}</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {result.modifiers_applied.map((m) => (
                  <li key={m} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">{t("sub.warnings")}</p>
          <ul className="mt-1 list-inside list-disc">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {result.notes_az && <p className="text-xs text-slate-500">{result.notes_az}</p>}

      <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>
          {t("sub.source")}:{" "}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
            {SOURCE_URL}
          </a>
        </p>
        <p className="italic">{t("sub.disclaimer")}</p>
      </div>

      {onSave && (
        <button className="btn-secondary" onClick={onSave} disabled={saved}>
          {saved ? t("sub.saved") : t("sub.save")}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function RatesTable() {
  const [rates, setRates] = useState<SubsidyRate[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<SubsidyRate[] | { rates?: SubsidyRate[] }>(
          `/api/subsidy/rates?year=${YEAR}`,
        );
        setRates(Array.isArray(data) ? data : (data?.rates ?? []));
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
        setRates([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rates) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rates;
    return rates.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rates, query]);

  if (error) return <ErrorNote message={error} />;
  if (!rates) return <Spinner />;

  const columns = ["subsidy_type", "crop_group", "crop", "intensity", "region_category", "irrigation", "planting_period", "coefficient", "amount_per_unit", "unit"];

  return (
    <div className="space-y-3">
      <input
        className="input"
        placeholder={t("sub.tableSearch")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r, i) => (
              <tr key={r.id ?? i} className="hover:bg-emerald-50/40">
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2 text-slate-700">
                    {r[c] != null ? String(r[c]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
