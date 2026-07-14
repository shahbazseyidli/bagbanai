"use client";

// ChoiceChips — a generic single-select chip grid built from an Opt[] list.
// Reused for irrigation method, soil type, growth stage, tillage, previous crop.
// Optionally exposes a "Digər" (Other) free-text chip and a "Bilmirəm" escape.

import { useEffect, useState } from "react";
import type { Opt } from "@/lib/metadataOptions";
import { Chip, UnknownChip } from "./chip";

export interface ChoiceChipsProps {
  /** Selectable options. */
  options: Opt[];
  /** Current value (may be a value from `options` or a free-text "Digər" value) or null. */
  value: string | null;
  /** Fired with the picked value, a typed "Digər" value, or null for "Bilmirəm". */
  onChange: (value: string | null) => void;
  /** Show a "Digər" chip that reveals a small text input. */
  allowOther?: boolean;
  /** Show a "Bilmirəm" chip that sets the value to null. */
  allowUnknown?: boolean;
  /** Fixed number of grid columns; when omitted the chips wrap freely. */
  columns?: number;
}

export default function ChoiceChips({
  options,
  value,
  onChange,
  allowOther = false,
  allowUnknown = false,
  columns,
}: ChoiceChipsProps) {
  const known = !!value && options.some((o) => o.value === value);
  const isCustom = !!value && !known;
  const [otherOpen, setOtherOpen] = useState<boolean>(isCustom);

  // If a known value arrives (e.g. an upstream reset), leave "Digər" mode.
  useEffect(() => {
    if (known) setOtherOpen(false);
  }, [known]);

  const wrapCls = columns ? "grid gap-2" : "flex flex-wrap gap-2";
  const wrapStyle = columns
    ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
    : undefined;

  return (
    <div className="space-y-2">
      <div className={wrapCls} style={wrapStyle}>
        {options.map((o) => (
          <Chip
            key={o.value}
            active={value === o.value}
            onClick={() => {
              setOtherOpen(false);
              onChange(o.value);
            }}
          >
            {o.label}
          </Chip>
        ))}
        {allowOther && (
          <Chip
            active={otherOpen || isCustom}
            onClick={() => {
              setOtherOpen(true);
              if (!isCustom) onChange("");
            }}
          >
            Digər
          </Chip>
        )}
        {allowUnknown && (
          <UnknownChip
            active={value === null}
            onClick={() => {
              setOtherOpen(false);
              onChange(null);
            }}
          />
        )}
      </div>
      {(otherOpen || isCustom) && (
        <input
          className="input"
          placeholder="Daxil edin"
          value={isCustom ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
