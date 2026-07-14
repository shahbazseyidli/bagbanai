"use client";

// PhPicker — pick soil pH without typing. A row of category bands (Çox turş …
// Çox qələvi) sets a representative pH; a fine slider (4.0–9.0) sets an exact
// value; "Bilmirəm" clears it.

import { PH_BANDS } from "@/lib/metadataOptions";
import { chipCls, UnknownChip } from "./chip";

export interface PhPickerProps {
  /** Current pH value or null. */
  value: number | null;
  /** Fired with the chosen pH number or null for "Bilmirəm". */
  onChange: (value: number | null) => void;
}

export default function PhPicker({ value, onChange }: PhPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PH_BANDS.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onChange(b.ph)}
            className={chipCls(value != null && Math.abs(value - b.ph) < 0.5)}
          >
            <span className="flex flex-col items-start leading-tight">
              <span>{b.label}</span>
              <span className="text-[11px] text-slate-400">{b.hint}</span>
            </span>
          </button>
        ))}
        <UnknownChip active={value === null} onClick={() => onChange(null)} />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={4.0}
          max={9.0}
          step={0.1}
          value={value ?? 7.0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
        <span className="w-14 shrink-0 text-right text-sm font-medium text-slate-700">
          {value != null ? `pH ${value.toFixed(1)}` : "—"}
        </span>
      </div>
    </div>
  );
}
