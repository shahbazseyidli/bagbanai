"use client";

// ClickDate — keyboard-free date entry. In "year" mode it shows a grid of the
// last 40 years (stored as YYYY-01-01). In "date" mode it shows a click-only
// month calendar popover (stored as YYYY-MM-DD). "Bilmirəm" clears the value.

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { chipCls, UnknownChip } from "./chip";

export interface ClickDateProps {
  /** Current ISO date string (YYYY-MM-DD; year mode uses YYYY-01-01) or null. */
  value: string | null;
  /** Fired with a new ISO date string or null for "Bilmirəm". */
  onChange: (value: string | null) => void;
  /** "year" = year grid, "date" = calendar popover. */
  mode: "year" | "date";
}

const MONTHS_AZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "İyun",
  "İyul",
  "Avqust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];
const WEEKDAYS_AZ = ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"]; // Monday-start

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function YearGrid({ value, onChange }: Omit<ClickDateProps, "mode">) {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 40 }, (_, i) => now - i);
  const selected = value ? Number(value.slice(0, 4)) : null;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => onChange(`${y}-01-01`)}
            className={chipCls(selected === y)}
          >
            {y}
          </button>
        ))}
      </div>
      <UnknownChip active={value === null} onClick={() => onChange(null)} />
    </div>
  );
}

function DatePopover({ value, onChange }: Omit<ClickDateProps, "mode">) {
  const [open, setOpen] = useState(false);
  const init = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-start
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const selISO = value ?? "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={chipCls(!!value)}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {value ?? "Tarix seçin"}
          </span>
        </button>
        <UnknownChip active={value === null} onClick={() => onChange(null)} />
      </div>

      {open && (
        <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn-ghost px-2 py-1" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              {MONTHS_AZ[view.m]} {view.y}
            </span>
            <button type="button" className="btn-ghost px-2 py-1" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
            {WEEKDAYS_AZ.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const iso = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
              const active = iso === selISO;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={
                    active
                      ? "rounded-md border border-emerald-600 bg-emerald-50 py-1 text-sm font-medium text-emerald-700"
                      : "rounded-md border border-transparent py-1 text-sm text-slate-600 hover:bg-slate-50"
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClickDate({ value, onChange, mode }: ClickDateProps) {
  return mode === "year" ? (
    <YearGrid value={value} onChange={onChange} />
  ) : (
    <DatePopover value={value} onChange={onChange} />
  );
}
