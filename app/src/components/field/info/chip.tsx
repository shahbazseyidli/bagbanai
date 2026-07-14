"use client";

// Shared chip styling for the click-first field-info primitives. Active chips
// use the same emerald treatment as OverviewTab's scene buttons; inactive chips
// are neutral slate with a hover. Keep these in one place so every primitive
// (ChoiceChips, CropGrid, VarietyChips, PhPicker, YesNo, …) looks identical.

import type { ReactNode } from "react";

/** Tailwind class string for a selectable chip button. */
export function chipCls(active: boolean): string {
  return active
    ? "rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"
    : "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50";
}

export interface ChipProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}

/** A single selectable chip button. */
export function Chip({ active = false, onClick, children, title }: ChipProps) {
  return (
    <button type="button" title={title} onClick={onClick} className={chipCls(active)}>
      {children}
    </button>
  );
}

/** The recurring "Bilmirəm" (I don't know) escape chip → clears the value. */
export function UnknownChip({ active = false, onClick }: { active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg border border-slate-400 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
          : "rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
      }
    >
      Bilmirəm
    </button>
  );
}
