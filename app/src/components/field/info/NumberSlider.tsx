"use client";

// NumberSlider — a labelled slider with a live read-out and a "Bilmirəm"
// escape. Used for target yield, seeding density, tree spacing, orchard age, …
// When the value is null the slider parks at the midpoint but stays null until
// the farmer actually moves it.

import { chipCls } from "./chip";

export interface NumberSliderProps {
  /** Current numeric value or null. */
  value: number | null;
  /** Fired with the chosen number, or null for "Bilmirəm". */
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step: number;
  /** Unit suffix shown after the value (e.g. "kg/ha", "m", "il"). */
  unit: string;
  /** Optional caption shown above the slider. */
  label?: string;
}

export default function NumberSlider({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  label,
}: NumberSliderProps) {
  const mid = Math.round(((min + max) / 2) * 100) / 100;
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? mid}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
        <span className="w-24 shrink-0 text-right text-sm font-medium text-slate-700">
          {value != null ? `${value} ${unit}` : "—"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={chipCls(value === null)}
      >
        Bilmirəm
      </button>
    </div>
  );
}
