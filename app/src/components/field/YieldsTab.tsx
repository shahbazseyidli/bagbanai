"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";

// D5.4 — click-first yield units.
const YIELD_UNITS = ["ton", "kq", "ton/ha", "kq/ha", "sentner/ha"].map((v) => ({ value: v, label: v }));
import type { Yield } from "@/lib/types";

export default function YieldsTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Yield[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [crop, setCrop] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("t/ha");
  const [area, setArea] = useState("");
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      setItems(await api.get<Yield[]>(`/api/yields?field_id=${fieldId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  const chartData = useMemo(
    () =>
      items
        .filter((y) => y.yield_value != null)
        .map((y) => ({ year: String(y.season_year), value: y.yield_value as number }))
        .sort((a, b) => Number(a.year) - Number(b.year)),
    [items],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/api/yields", {
        field_id: fieldId,
        season_year: Number(season),
        crop_type: crop || undefined,
        yield_value: value ? Number(value) : undefined,
        yield_unit: unit || undefined,
        area_ha: area ? Number(area) : undefined,
        revenue: revenue ? Number(revenue) : undefined,
        notes: notes || undefined,
      });
      setCrop("");
      setValue("");
      setArea("");
      setRevenue("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-800">{t("yield.chartTitle")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-3">
        <h3 className="font-semibold text-slate-800">{t("yield.add")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("yield.season")}>
            <input className="input" type="number" value={season} required onChange={(e) => setSeason(e.target.value)} />
          </FormField>
          <FormField label={t("yield.crop")}>
            <input className="input" value={crop} onChange={(e) => setCrop(e.target.value)} />
          </FormField>
          <FormField label={t("yield.value")}>
            <input className="input" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </FormField>
          <FormField label={t("yield.unit")}>
            <ChoiceChips value={unit} onChange={setUnit} options={YIELD_UNITS} other={{ placeholder: "Digər vahid" }} />
          </FormField>
          <FormField label={t("yield.area")}>
            <input className="input" type="number" step="any" value={area} onChange={(e) => setArea(e.target.value)} />
          </FormField>
          <FormField label="Gəlir (₼)">
            <input className="input" type="number" step="any" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="Satışdan ümumi gəlir" />
          </FormField>
        </div>
        <FormField label={t("yield.notes")}>
          <textarea className="input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? t("common.saving") : t("common.add")}
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-semibold text-slate-800">{t("yield.title")}</h3>
        {items.length === 0 ? (
          <Placeholder>{t("yield.empty")}</Placeholder>
        ) : (
          <ul className="space-y-2">
            {items.map((y) => (
              <li key={y.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{y.season_year}</p>
                  {y.crop_type && <p className="text-xs text-slate-500">{y.crop_type}</p>}
                </div>
                <span className="text-sm text-slate-700">
                  {y.yield_value != null ? `${y.yield_value} ${y.yield_unit ?? ""}` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
