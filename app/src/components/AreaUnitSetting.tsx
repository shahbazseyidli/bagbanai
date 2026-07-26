"use client";

// P1.2 — the farmer picks the unit their land is measured in. Sits with the other account
// preferences (data-saver, email digest, name visibility) on /more and /account.
//
// Display only: everything the platform stores and computes stays in hectares. Switching the unit
// re-renders every mounted useAreaUnit() immediately (setAreaUnit fires AREA_UNIT_EVENT), so the
// field list behind the settings page is already in the new unit when the farmer navigates back.
//
// "Avtomatik" (null) means "follow my country" — Turkey → dönüm, everywhere else → hectares. It is
// the default and stays selectable, so a farmer can undo an explicit choice without guessing which
// unit their country uses.
import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import {
  AREA_UNITS,
  areaUnitHint,
  areaUnitName,
  isAreaUnit,
  setAreaUnit,
  useAreaUnit,
  type AreaUnit,
} from "@/lib/units";

export default function AreaUnitSetting() {
  // `null` = auto. Read from the account so the radio reflects the stored choice, not the
  // effective unit — otherwise "Avtomatik" would never look selected for a hectare country.
  const [choice, setChoice] = useState<AreaUnit | null | undefined>(undefined);
  const effective = useAreaUnit();

  useEffect(() => {
    let alive = true;
    api
      .get<{ unit: AreaUnit | null }>("/api/auth/area-unit")
      .then((r) => {
        if (alive) setChoice(isAreaUnit(r?.unit) ? r.unit : null);
      })
      .catch(() => {
        // Signed out or offline — hide the control rather than show a wrong selection.
        if (alive) setChoice(undefined);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (choice === undefined) return null;

  async function pick(unit: AreaUnit | null) {
    setChoice(unit); // optimistic; setAreaUnit reconciles and notifies every mounted hook
    await setAreaUnit(unit);
  }

  const options: { key: string; unit: AreaUnit | null; name: string; hint: string }[] = [
    { key: "auto", unit: null, name: t("areaUnit.auto"), hint: t("areaUnit.autoHint") },
    ...AREA_UNITS.map((u) => ({ key: u, unit: u, name: areaUnitName(u), hint: areaUnitHint(u) })),
  ];

  return (
    <div className="rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <Ruler className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-slate-900">{t("areaUnit.title")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("areaUnit.body")}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5" role="radiogroup" aria-label={t("areaUnit.title")}>
        {options.map((o) => {
          const active = o.unit === choice;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void pick(o.unit)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg border-[1.5px] px-3 py-2 text-left transition-colors ${
                active ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${
                  active ? "border-emerald-600" : "border-slate-300"
                }`}
                aria-hidden="true"
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  {o.name}
                  {/* Which unit "Avtomatik" actually resolves to, so the choice is never a guess. */}
                  {o.unit === null && choice === null ? ` · ${areaUnitName(effective)}` : ""}
                </span>
                <span className="block text-xs text-slate-500">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
