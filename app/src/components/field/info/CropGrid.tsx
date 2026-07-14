"use client";

// CropGrid — chip grid of crops, soft-filtered by the chosen cycle. A
// "Hamısını göstər" toggle reveals every crop, and "Digər" allows free text.
// The currently selected crop is always shown even when filtered out.

import { useEffect, useState } from "react";
import { CROP_OPTIONS, CROP_CYCLE } from "@/lib/metadataOptions";
import { Chip } from "./chip";

export interface CropGridProps {
  /** Selected cycle used to soft-filter crops; null shows all. */
  cycle: string | null;
  /** Current crop value (canonical value or a free-text "Digər" value) or null. */
  value: string | null;
  /** Fired with the picked crop value or a typed "Digər" value. */
  onChange: (value: string | null) => void;
}

export default function CropGrid({ cycle, value, onChange }: CropGridProps) {
  const known = !!value && CROP_OPTIONS.some((o) => o.value === value);
  const isCustom = !!value && !known;
  const [showAll, setShowAll] = useState(false);
  const [otherOpen, setOtherOpen] = useState<boolean>(isCustom);

  useEffect(() => {
    if (known) setOtherOpen(false);
  }, [known]);

  // Filter by cycle when one is set and we have any matches; otherwise show all.
  const matches =
    cycle && !showAll ? CROP_OPTIONS.filter((o) => CROP_CYCLE[o.value] === cycle) : CROP_OPTIONS;
  const base = matches.length > 0 ? matches : CROP_OPTIONS;
  // Ensure the selected crop is visible even if it falls outside the filter.
  const visible =
    known && !base.some((o) => o.value === value)
      ? [...base, CROP_OPTIONS.find((o) => o.value === value)!]
      : base;

  const canToggle = Boolean(cycle) && matches.length > 0 && matches.length < CROP_OPTIONS.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((o) => (
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
        <Chip
          active={otherOpen || isCustom}
          onClick={() => {
            setOtherOpen(true);
            if (!isCustom) onChange("");
          }}
        >
          Digər
        </Chip>
      </div>
      {canToggle && (
        <button
          type="button"
          className="text-sm font-medium text-emerald-700 hover:underline"
          onClick={() => setShowAll((s) => !s)}
        >
          {showAll ? "Yalnız uyğun olanlar" : "Hamısını göstər"}
        </button>
      )}
      {(otherOpen || isCustom) && (
        <input
          className="input"
          placeholder="Bitki adını daxil edin"
          value={isCustom ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
