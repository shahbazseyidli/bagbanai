"use client";

// VarietyChips — chips of known sorts/varieties for the chosen crop, in the reader's market where
// we have a list for it and the Azerbaijani registry otherwise (varietiesFor), plus "Digər" free
// text and a "Bilmirəm" escape. When the crop has no known varieties, only Digər/Bilmirəm show.

import { varietiesFor } from "@/lib/metadataOptions";
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
  // Suggestions for the reader's market, not only the Azerbaijani registry — a Turkish
  // hazelnut grower gets Tombul and Palaz. Free text is still always available below.
  const options = varietiesFor(crop);
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
