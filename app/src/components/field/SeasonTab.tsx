"use client";

// B3 — mövsüm (əkin) kartoteksi. Hər əkinin öz ili, məhsulu, tarixləri və həyat dövrü statusu var
// (public.field_seasons / 0034). Inline AZ copy (T18 sonra çıxarır).
import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Plus, Sprout, Star, Trash2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";

type SeasonStatus = "preparation" | "planted" | "vegetation" | "harvest" | "fallow" | "closed";

interface Season {
  id: string;
  field_id: string;
  season_year: number;
  crop_type: string;
  variety: string | null;
  crop_cycle: string | null;
  status: SeasonStatus;
  planting_date: string | null;
  emergence_date: string | null;
  expected_harvest: string | null;
  actual_harvest_date: string | null;
  growth_stage: string | null;
  seeding_density: number | null;
  target_yield: number | null;
  area_ha: number | null;
  is_current: boolean;
  source: string;
  notes: string | null;
  days_since_planting: number | null;
  days_to_harvest: number | null;
}

interface StatusMeta {
  label: string;
  chip: string;
  active: string;
}

const STATUS_ORDER: SeasonStatus[] = [
  "preparation",
  "planted",
  "vegetation",
  "harvest",
  "fallow",
  "closed",
];

const STATUS: Record<string, StatusMeta> = {
  preparation: {
    label: "Hazırlıq",
    chip: "border-slate-300 bg-slate-100 text-slate-700",
    active: "border-slate-500 bg-slate-700 text-white",
  },
  planted: {
    label: "Səpin",
    chip: "border-sky-300 bg-sky-50 text-sky-800",
    active: "border-sky-600 bg-sky-600 text-white",
  },
  vegetation: {
    label: "Vegetasiya",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
    active: "border-emerald-600 bg-emerald-600 text-white",
  },
  harvest: {
    label: "Yığım",
    chip: "border-amber-300 bg-amber-50 text-amber-800",
    active: "border-amber-600 bg-amber-600 text-white",
  },
  fallow: {
    label: "Herik",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
    active: "border-stone-600 bg-stone-600 text-white",
  },
  closed: {
    label: "Bağlanıb",
    chip: "border-slate-300 bg-white text-slate-500",
    active: "border-slate-600 bg-slate-600 text-white",
  },
};

const CYCLES = [
  { value: "annual", label: "İllik" },
  { value: "perennial", label: "Çoxillik" },
  { value: "biennial", label: "İkiillik" },
];

function statusMeta(s: string): StatusMeta {
  return STATUS[s] ?? { label: s, chip: "border-slate-300 bg-slate-100 text-slate-700", active: "border-slate-600 bg-slate-600 text-white" };
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return d ? `${d}.${m}.${y}` : v;
}

export default function SeasonTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Season[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [confirmId, setConfirmId] = useState("");

  // Yeni mövsüm formu — default bağlı.
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [crop, setCrop] = useState("");
  const [variety, setVariety] = useState("");
  const [cycle, setCycle] = useState("annual");
  const [plantingDate, setPlantingDate] = useState("");
  const [expectedHarvest, setExpectedHarvest] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [density, setDensity] = useState("");
  const [targetYield, setTargetYield] = useState("");
  const [notes, setNotes] = useState("");
  const [makeCurrent, setMakeCurrent] = useState(true);

  async function load() {
    try {
      setItems(await api.get<Season[]>(`/api/fields/${fieldId}/seasons`));
    } catch (err) {
      setItems([]);
      setError(azError(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/fields/${fieldId}/seasons`, {
        season_year: Number(year),
        crop_type: crop.trim() || undefined,
        variety: variety.trim() || undefined,
        crop_cycle: cycle || undefined,
        planting_date: plantingDate || undefined,
        expected_harvest: expectedHarvest || undefined,
        growth_stage: growthStage.trim() || undefined,
        seeding_density: density ? Number(density) : undefined,
        target_yield: targetYield ? Number(targetYield) : undefined,
        notes: notes.trim() || undefined,
        is_current: makeCurrent,
        status: plantingDate ? "planted" : "preparation",
      });
      setCrop("");
      setVariety("");
      setPlantingDate("");
      setExpectedHarvest("");
      setGrowthStage("");
      setDensity("");
      setTargetYield("");
      setNotes("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(season: Season, status: SeasonStatus) {
    if (season.status === status) return;
    setError("");
    setBusyId(season.id);
    try {
      await api.post(`/api/seasons/${season.id}/status`, { status });
      await load();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusyId("");
    }
  }

  async function onMakeCurrent(season: Season) {
    setError("");
    setBusyId(season.id);
    try {
      await api.post(`/api/seasons/${season.id}/current`);
      await load();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusyId("");
    }
  }

  async function onDelete(season: Season) {
    setError("");
    setBusyId(season.id);
    try {
      await api.del(`/api/seasons/${season.id}`);
      setConfirmId("");
      await load();
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusyId("");
    }
  }

  if (items === null) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">Mövsümlər</h3>
          <p className="text-sm text-slate-500">
            Hər mövsümün öz məhsulu, tarixləri və nəticəsi olur — köhnə illər silinmir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="btn-secondary min-h-11"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Yeni mövsüm
        </button>
      </div>

      <ErrorNote message={error} />

      {open && (
        <form onSubmit={onCreate} className="card space-y-3">
          <h4 className="font-semibold text-slate-800">Yeni mövsüm əlavə et</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mövsüm ili" required>
              <input
                className="input"
                type="number"
                min="1990"
                max="2100"
                value={year}
                required
                onChange={(e) => setYear(e.target.value)}
              />
            </FormField>
            <FormField label="Məhsul">
              <input
                className="input"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="məs. fındıq, buğda"
              />
            </FormField>
            <FormField label="Sort">
              <input className="input" value={variety} onChange={(e) => setVariety(e.target.value)} />
            </FormField>
            <FormField label="Bitki dövrü">
              <ChoiceChips value={cycle} onChange={setCycle} options={CYCLES} />
            </FormField>
            <FormField label="Əkin tarixi">
              <input
                className="input"
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
              />
            </FormField>
            <FormField label="Gözlənilən yığım">
              <input
                className="input"
                type="date"
                value={expectedHarvest}
                onChange={(e) => setExpectedHarvest(e.target.value)}
              />
            </FormField>
            <FormField label="İnkişaf mərhələsi">
              <input
                className="input"
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value)}
                placeholder="məs. çiçəkləmə"
              />
            </FormField>
            <FormField label="Səpin norması">
              <input
                className="input"
                type="number"
                step="any"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
              />
            </FormField>
            <FormField label="Hədəf məhsuldarlıq">
              <input
                className="input"
                type="number"
                step="any"
                value={targetYield}
                onChange={(e) => setTargetYield(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Qeyd">
            <textarea className="input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300"
              checked={makeCurrent}
              onChange={(e) => setMakeCurrent(e.target.checked)}
            />
            Cari mövsüm kimi təyin et
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            <Plus className="h-4 w-4" /> {busy ? "Saxlanır…" : "Mövsümü yarat"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <Placeholder>
          Hələ mövsüm qeydi yoxdur. Hər mövsümün öz məhsulu, tarixləri və nəticəsi olur — mövsüm
          açsanız, növbəti il əkin dəyişəndə bu ilin məlumatı itmir və növbə (rotasiya) tarixçəsi
          yaranır.
        </Placeholder>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => {
            const meta = statusMeta(s.status);
            const rowBusy = busyId === s.id;
            return (
              <li
                key={s.id}
                className={`card ${s.is_current ? "border-[1.5px] border-emerald-400 bg-emerald-50/30" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{s.season_year}</span>
                      <span className="text-sm font-medium text-slate-700">
                        {s.crop_type || "Məhsul göstərilməyib"}
                      </span>
                      {s.variety && <span className="text-xs text-slate-500">({s.variety})</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border-[1.5px] px-2 py-0.5 text-xs font-semibold ${meta.chip}`}>
                        {meta.label}
                      </span>
                      {s.is_current && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                          <Star className="h-3 w-3" /> Cari mövsüm
                        </span>
                      )}
                      {s.area_ha != null && (
                        <span className="text-xs text-slate-500">{s.area_ha.toFixed(2)} ha</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!s.is_current && (
                      <button
                        type="button"
                        onClick={() => onMakeCurrent(s)}
                        disabled={rowBusy}
                        className="min-h-11 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                      >
                        Cari et
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmId(confirmId === s.id ? "" : s.id)}
                      disabled={rowBusy}
                      aria-label="Mövsümü sil"
                      className="min-h-11 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Sprout className="h-4 w-4 text-emerald-600" /> Əkin: {fmtDate(s.planting_date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-amber-600" /> Yığım:{" "}
                    {fmtDate(s.actual_harvest_date ?? s.expected_harvest)}
                    {s.actual_harvest_date ? " (faktiki)" : ""}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {s.days_since_planting != null && (
                    <span>
                      {s.days_since_planting >= 0
                        ? `Əkindən ${s.days_since_planting} gün keçib`
                        : `Əkinə ${Math.abs(s.days_since_planting)} gün qalıb`}
                    </span>
                  )}
                  {s.days_to_harvest != null && (
                    <span>
                      {s.days_to_harvest >= 0
                        ? `Yığıma ${s.days_to_harvest} gün qalıb`
                        : `Gözlənilən yığım ${Math.abs(s.days_to_harvest)} gün gecikib`}
                    </span>
                  )}
                  {s.growth_stage && <span>Mərhələ: {s.growth_stage}</span>}
                  {s.target_yield != null && <span>Hədəf: {s.target_yield}</span>}
                </div>

                {s.notes && <p className="mt-2 text-sm text-slate-700">{s.notes}</p>}

                {confirmId === s.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <span className="text-sm text-red-700">
                      Bu mövsüm silinsin? Qeydlər (tapşırıq, əməliyyat, məhsuldarlıq) silinmir.
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(s)}
                      disabled={rowBusy}
                      className="min-h-11 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {rowBusy ? "Silinir…" : "Bəli, sil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId("")}
                      className="min-h-11 rounded px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
                    >
                      Ləğv et
                    </button>
                  </div>
                )}

                {s.is_current && (
                  <div className="mt-3 border-t border-emerald-200 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">Mövsümün mərhələsi</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_ORDER.map((st) => {
                        const m = statusMeta(st);
                        const on = s.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            aria-pressed={on}
                            disabled={rowBusy}
                            onClick={() => onStatus(s, st)}
                            className={`min-h-11 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                              on ? m.active : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300"
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
