"use client";

// D1.3 — status is ALWAYS triple-encoded: color + solid icon + Azerbaijani word + aria-label.
// Replaces color-only dots (fails in glare + for red-green colorblindness). `label` is the exact
// status text (e.g. "Zəif" / "Orta nəmlik"); `tone` picks the icon + color.
import { Check, AlertTriangle, OctagonAlert } from "lucide-react";
import type { Tone } from "@/lib/indexStatus";

const CFG: Record<Tone, { cls: string; Icon: typeof Check }> = {
  good: { cls: "bg-good-tint text-good", Icon: Check },
  warn: { cls: "bg-warn-tint text-warn", Icon: AlertTriangle },
  bad: { cls: "bg-bad-tint text-bad", Icon: OctagonAlert },
};

export default function StatusChip({
  tone,
  label,
  className = "",
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  const c = CFG[tone];
  const Icon = c.Icon;
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${c.cls} ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
