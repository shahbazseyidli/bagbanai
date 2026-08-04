"use client";

// B3 — mövsüm (əkin) kartoteksi. Hər əkinin öz ili, məhsulu, tarixləri və həyat dövrü statusu var
// (public.field_seasons / 0034). Bütün istifadəçi mətni t() ilə həll olunur — T18 çıxarışı bitib,
// burada inline AZ sətir qalmayıb (statusLabel/cycleOptions render vaxtı, modul yüklənəndə yox).
//
// SIMPLIFIED (2026-08-04, owner: "mövsüm hissəsini sadələşdir"). Recording a season is untouched —
// what left is the bookkeeping that lived beside it:
//
//   • THREE FORM INPUTS REMOVED — growth stage, seeding density, target yield. All three already
//     exist at FIELD level in "Sahə pasportu" (field_metadata), which is where the rest of the
//     product reads them from: ai/fertilizer.py takes target_yield from field_metadata, and
//     ai/knowledge.py's dependency map keys off the field-level seeding_density and growth_stage.
//     The season-level copies were written by this form and read by this form. Asking a farmer the
//     same three questions twice, in two places, with only one of the answers connected to
//     anything, is the bookkeeping feel the season model is accused of.
//     The COLUMNS STAY (same precedent as the subsidy and ERP removals — no migration, nothing
//     dropped): rows created before today keep their values, PUT /api/seasons/{id} still accepts
//     them, and the printable report still prints target_yield for the seasons that have one.
//   • The per-season "N gün keçib / N gün qalıb" counters are down to ONE — the harvest countdown.
//     Days since planting is the planting date minus today, already on the line above it.
//   • The status picker offers the four states a farmer distinguishes in the field. 'preparation'
//     and 'fallow' are still rendered as chips on any season that holds them (and the API still
//     accepts all six) — they are just not offered as taps.
import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Plus, Sprout, Star, Trash2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";
import { t } from "@/lib/i18n";
import { useFormatArea } from "@/lib/units";

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
  area_ha: number | null;
  is_current: boolean;
  source: string;
  notes: string | null;
  days_to_harvest: number | null;
}

interface StatusMeta {
  chip: string;
  active: string;
}

/** What the picker offers. NOT the full vocabulary: the API and the chips below still know
 *  'preparation' and 'fallow', they are simply not worth a tap target each. */
const STATUS_CHOICES: SeasonStatus[] = ["planted", "vegetation", "harvest", "closed"];

const STATUS: Record<string, StatusMeta> = {
  preparation: {
    chip: "border-slate-300 bg-slate-100 text-slate-700",
    active: "border-slate-500 bg-slate-700 text-white",
  },
  planted: {
    chip: "border-sky-300 bg-sky-50 text-sky-800",
    active: "border-sky-600 bg-sky-600 text-white",
  },
  vegetation: {
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
    active: "border-emerald-600 bg-emerald-600 text-white",
  },
  harvest: {
    chip: "border-amber-300 bg-amber-50 text-amber-800",
    active: "border-amber-600 bg-amber-600 text-white",
  },
  fallow: {
    chip: "border-stone-300 bg-stone-100 text-stone-700",
    active: "border-stone-600 bg-stone-600 text-white",
  },
  closed: {
    chip: "border-slate-300 bg-white text-slate-500",
    active: "border-slate-600 bg-slate-600 text-white",
  },
};

function statusMeta(s: string): StatusMeta {
  return STATUS[s] ?? { chip: "border-slate-300 bg-slate-100 text-slate-700", active: "border-slate-600 bg-slate-600 text-white" };
}

// Localized status label (resolved at render time, not module load, so locale switches apply).
// Still covers all six stored values — an older season sitting in 'preparation' must not render
// its raw code just because the picker no longer offers it.
function statusLabel(s: string): string {
  switch (s) {
    case "preparation": return t("app.field.seasonTab.statusPreparation");
    case "planted": return t("app.field.seasonTab.statusPlanted");
    case "vegetation": return t("app.field.seasonTab.statusVegetation");
    case "harvest": return t("app.field.seasonTab.statusHarvest");
    case "fallow": return t("app.field.seasonTab.statusFallow");
    case "closed": return t("app.field.seasonTab.statusClosed");
    default: return s;
  }
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return d ? `${d}.${m}.${y}` : v;
}

export default function SeasonTab({ fieldId }: { fieldId: string }) {
  const fmtArea = useFormatArea();
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
  const [notes, setNotes] = useState("");
  const [makeCurrent, setMakeCurrent] = useState(true);

  /** Open the new-season form already filled in from the season above it.
   *
   *  The form used to open completely blank while last year's crop, variety and cycle sat on screen
   *  one card below — so "start next season" meant re-typing what the product already knew. The
   *  season model is the concept farmers understand least (the research document calls it out by
   *  name), and an empty form is what makes it feel like bookkeeping rather than carrying the field
   *  forward.
   *
   *  Only ever a PREFILL: every value stays editable, and anything already typed wins because
   *  this runs on open, not on every render. The year is bumped past the newest season rather
   *  than copied — the whole point is the next one. Dates are deliberately NOT carried: a planting
   *  date from last year is wrong by construction, where a crop usually is not. */
  function prefillFromLast() {
    const last = (items ?? [])[0];
    if (!last) return;
    const nextYear = Math.max(last.season_year + 1, new Date().getFullYear());
    setYear(String(nextYear));
    if (!crop) setCrop(last.crop_type || "");
    if (!variety) setVariety(last.variety || "");
    if (last.crop_cycle) setCycle(last.crop_cycle);
  }

  const cycleOptions = [
    { value: "annual", label: t("app.field.seasonTab.cycleAnnual") },
    { value: "perennial", label: t("app.field.seasonTab.cyclePerennial") },
    { value: "biennial", label: t("app.field.seasonTab.cycleBiennial") },
  ];

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
        notes: notes.trim() || undefined,
        is_current: makeCurrent,
        status: plantingDate ? "planted" : "preparation",
      });
      setCrop("");
      setVariety("");
      setPlantingDate("");
      setExpectedHarvest("");
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
          <h3 className="font-semibold text-slate-800">{t("app.field.seasonTab.heading")}</h3>
          <p className="text-sm text-slate-500">
            {t("app.field.seasonTab.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { if (!open) prefillFromLast(); setOpen(!open); }}
          className="btn-secondary"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {t("app.field.seasonTab.newSeasonBtn")}
        </button>
      </div>

      <ErrorNote message={error} />

      {open && (
        <form onSubmit={onCreate} className="card space-y-3">
          <h4 className="font-semibold text-slate-800">{t("app.field.seasonTab.addSeasonHeading")}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("app.field.seasonTab.yearLabel")} required>
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
            <FormField label={t("app.field.seasonTab.cropLabel")}>
              <input
                className="input"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder={t("app.field.seasonTab.cropPlaceholder")}
              />
            </FormField>
            <FormField label={t("app.field.seasonTab.varietyLabel")}>
              <input className="input" value={variety} onChange={(e) => setVariety(e.target.value)} />
            </FormField>
            {/* Kept while density/target/stage went: 'perennial' changes how the AI reads this
                field's NDVI (an orchard's mean averages canopy with bare inter-row soil), so it is
                an input to the analysis rather than a record of it. */}
            <FormField label={t("app.field.seasonTab.cycleLabel")}>
              <ChoiceChips value={cycle} onChange={setCycle} options={cycleOptions} />
            </FormField>
            <FormField label={t("app.field.seasonTab.plantingDateLabel")}>
              <input
                className="input"
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
              />
            </FormField>
            <FormField label={t("app.field.seasonTab.expectedHarvestLabel")}>
              <input
                className="input"
                type="date"
                value={expectedHarvest}
                onChange={(e) => setExpectedHarvest(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label={t("app.field.seasonTab.notesLabel")}>
            <textarea className="input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <label className="flex min-h-[var(--tap)] items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300"
              checked={makeCurrent}
              onChange={(e) => setMakeCurrent(e.target.checked)}
            />
            {t("app.field.seasonTab.makeCurrentCheckbox")}
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            <Plus className="h-4 w-4" /> {busy ? t("app.field.seasonTab.savingBtn") : t("app.field.seasonTab.createSeasonBtn")}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <Placeholder>
          {t("app.field.seasonTab.emptyState")}
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
                        {s.crop_type || t("app.field.seasonTab.noCropGiven")}
                      </span>
                      {s.variety && <span className="text-xs text-slate-500">({s.variety})</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border-[1.5px] px-2 py-0.5 text-xs font-semibold ${meta.chip}`}>
                        {statusLabel(s.status)}
                      </span>
                      {s.is_current && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                          <Star className="h-3 w-3" /> {t("app.field.seasonTab.currentBadge")}
                        </span>
                      )}
                      {s.area_ha != null && (
                        <span className="text-xs text-slate-500">{fmtArea(s.area_ha)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!s.is_current && (
                      <button
                        type="button"
                        onClick={() => onMakeCurrent(s)}
                        disabled={rowBusy}
                        className="min-h-[var(--tap)] rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                      >
                        {t("app.field.seasonTab.makeCurrentBtn")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmId(confirmId === s.id ? "" : s.id)}
                      disabled={rowBusy}
                      aria-label={t("app.field.seasonTab.deleteAriaLabel")}
                      className="min-h-[var(--tap)] min-w-[var(--tap)] rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Sprout className="h-4 w-4 text-emerald-600" /> {t("app.field.seasonTab.plantingRowLabel")} {fmtDate(s.planting_date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-amber-600" /> {t("app.field.seasonTab.harvestRowLabel")}{" "}
                    {fmtDate(s.actual_harvest_date ?? s.expected_harvest)}
                    {s.actual_harvest_date ? t("app.field.seasonTab.actualSuffix") : ""}
                  </span>
                  {/* The one counter left: how long until (or how far past) the harvest. */}
                  {s.days_to_harvest != null && (
                    <span className="text-xs text-slate-500">
                      {s.days_to_harvest >= 0
                        ? `${t("app.field.seasonTab.daysToHarvestPre")}${s.days_to_harvest}${t("app.field.seasonTab.daysToHarvestPost")}`
                        : `${t("app.field.seasonTab.harvestLatePre")}${Math.abs(s.days_to_harvest)}${t("app.field.seasonTab.harvestLatePost")}`}
                    </span>
                  )}
                </div>

                {s.notes && <p className="mt-2 text-sm text-slate-700">{s.notes}</p>}

                {confirmId === s.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <span className="text-sm text-red-700">
                      {t("app.field.seasonTab.deleteConfirm")}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(s)}
                      disabled={rowBusy}
                      className="min-h-[var(--tap)] rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {rowBusy ? t("app.field.seasonTab.deletingBtn") : t("app.field.seasonTab.confirmDeleteBtn")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId("")}
                      className="min-h-[var(--tap)] rounded px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
                    >
                      {t("app.field.seasonTab.cancelBtn")}
                    </button>
                  </div>
                )}

                {s.is_current && (
                  <div className="mt-3 border-t border-emerald-200 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">{t("app.field.seasonTab.stagePickerLabel")}</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_CHOICES.map((st) => {
                        const m = statusMeta(st);
                        const on = s.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            aria-pressed={on}
                            disabled={rowBusy}
                            onClick={() => onStatus(s, st)}
                            className={`min-h-[var(--tap)] rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                              on ? m.active : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300"
                            }`}
                          >
                            {statusLabel(st)}
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
