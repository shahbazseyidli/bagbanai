"use client";

// CycleCards — three big clickable cards to pick the crop cycle
// (perennial / annual / biennial). This is the first choice in the wizard and
// soft-filters the crop grid downstream (see CROP_CYCLE + CropGrid).

import { TreePine, Sprout, Leaf } from "lucide-react";
import { CYCLE_OPTIONS } from "@/lib/metadataOptions";

export interface CycleCardsProps {
  /** Selected cycle value ("perennial" | "annual" | "biennial") or null. */
  value: string | null;
  /** Fired with the picked cycle value. */
  onChange: (value: string) => void;
}

const ICONS: Record<string, typeof TreePine> = {
  perennial: TreePine,
  annual: Sprout,
  biennial: Leaf,
};

const HINTS: Record<string, string> = {
  perennial: "Bir dəfə əkilir, illərlə məhsul verir",
  annual: "Hər il yenidən əkilir",
  biennial: "İki mövsümdə tamamlanır",
};

export default function CycleCards({ value, onChange }: CycleCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CYCLE_OPTIONS.map((opt) => {
        const Icon = ICONS[opt.value] ?? Leaf;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "flex flex-col items-start gap-2 rounded-xl border border-emerald-600 bg-emerald-50 p-4 text-left"
                : "flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
            }
          >
            <Icon className={active ? "h-6 w-6 text-emerald-600" : "h-6 w-6 text-slate-500"} />
            <span
              className={active ? "font-semibold text-emerald-700" : "font-semibold text-slate-800"}
            >
              {opt.label}
            </span>
            <span className="text-xs text-slate-500">{HINTS[opt.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
