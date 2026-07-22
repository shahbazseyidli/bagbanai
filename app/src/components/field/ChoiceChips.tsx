"use client";

// D5.4 — click-first field kit. Replaces free-text category inputs (operation type, currency, unit,
// task type) with tap-to-pick chips so a farmer in a field rarely types. An optional "Digər" chip
// reveals a text input for the long tail. Value is a plain string (kept compatible with the existing
// stored free-text columns).
import { useState } from "react";

function chipCls(active: boolean): string {
  return `min-h-9 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium ${
    active
      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
      : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300"
  }`;
}

export default function ChoiceChips({
  value,
  onChange,
  options,
  other,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  other?: { placeholder?: string };
  className?: string;
}) {
  const isKnown = options.some((o) => o.value === value);
  const [otherMode, setOtherMode] = useState(!!value && !isKnown);
  const showOther = !!other && (otherMode || (!!value && !isKnown));

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value && !otherMode;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => { setOtherMode(false); onChange(o.value); }}
              className={chipCls(active)}
            >
              {o.label}
            </button>
          );
        })}
        {other && (
          <button
            type="button"
            aria-pressed={otherMode}
            onClick={() => { setOtherMode(true); onChange(""); }}
            className={chipCls(otherMode)}
          >
            Digər
          </button>
        )}
      </div>
      {showOther && (
        <input
          className="input mt-2"
          placeholder={other?.placeholder ?? "Yazın…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
