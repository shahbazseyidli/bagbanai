"use client";

// VarietyChips — chips of known sorts/varieties for the chosen crop
// (VARIETY_OPTIONS_BY_CROP, which may be empty), plus "Digər" free text and a
// "Bilmirəm" escape. When the crop has no known varieties, only Digər/Bilmirəm
// are shown.

import { VARIETY_OPTIONS_BY_CROP } from "@/lib/metadataOptions";
import ChoiceChips from "./ChoiceChips";

export interface VarietyChipsProps {
  /** The selected crop value; drives which varieties are offered. */
  crop: string | null;
  /** Current variety value (known value or free-text) or null. */
  value: string | null;
  /** Fired with the picked variety, a typed value, or null for "Bilmirəm". */
  onChange: (value: string | null) => void;
}

export default function VarietyChips({ crop, value, onChange }: VarietyChipsProps) {
  const options = VARIETY_OPTIONS_BY_CROP[crop ?? ""] ?? [];
  return (
    <ChoiceChips
      options={options}
      value={value}
      onChange={onChange}
      allowOther
      allowUnknown
    />
  );
}
