"use client";

// A4 — Yağış nowcast-ı: növbəti ~2 saatın 15 dəqiqəlik yağıntı proqnozu (Open-Meteo minutely_15).
// Nazik zolaq: bir cümləlik hökm + kiçik sütun sparkline. Məlumat yoxdursa (Open-Meteo əlçatmazdır,
// sahənin koordinatı yoxdur, cavab boşdur) komponent NULL qaytarır — heç vaxt yer tutmur, heç vaxt
// xəta göstərmir. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import { CloudRain, CloudSun } from "lucide-react";
import { api } from "@/lib/api";

interface Step {
  ts: string;
  minutes_from_now: number;
  precip_mm: number | null;
}

interface Nowcast {
  available: boolean;
  reason?: string | null;
  verdict?: string;
  tone?: "ok" | "warn";
  rain_expected?: boolean;
  spray_safe?: boolean;
  minutes_to_rain?: number | null;
  total_mm?: number;
  max_mm?: number;
  threshold_mm?: number;
  window_minutes?: number;
  interval_minutes?: number;
  steps?: Step[];
}

// A drizzle must still be visible next to a downpour, so the bars are scaled against at least
// this much rain instead of against the peak alone.
const MIN_SCALE_MM = 0.5;

function windowLabel(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60} saat` : `${minutes} dəq`;
}

export default function RainNowcast({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<Nowcast | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .get<Nowcast>(`/api/fields/${fieldId}/rain-nowcast`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // Decorative strip: a failure means "no strip", never an error banner.
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const steps = data?.steps ?? [];
  if (!data || !data.available || steps.length === 0) return null;

  const warn = data.tone === "warn";
  const threshold = data.threshold_mm ?? 0.1;
  const peak = Math.max(MIN_SCALE_MM, ...steps.map((s) => s.precip_mm ?? 0));
  const windowMin = data.window_minutes ?? 120;

  const Icon = warn ? CloudRain : CloudSun;
  const tone = warn
    ? { border: "border-sky-200", bg: "bg-sky-50", text: "text-sky-800", icon: "text-sky-600", bar: "bg-sky-500" }
    : { border: "border-slate-200", bg: "bg-white", text: "text-slate-700", icon: "text-slate-400", bar: "bg-slate-300" };

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border ${tone.border} ${tone.bg} px-3 py-2.5`}
      role="group"
      aria-label="Yağış proqnozu"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        {/* Never truncate: the actionable half of the verdict ("çiləməyi təxirə salın") sits at the
            end of the sentence and must survive a narrow phone. */}
        <p className={`text-sm font-medium leading-snug ${tone.text}`}>{data.verdict}</p>

        <div className="mt-1.5 flex h-6 items-end gap-[2px]" aria-hidden="true">
          {steps.map((s) => {
            const mm = s.precip_mm ?? 0;
            const wet = mm >= threshold;
            const pct = Math.max(6, Math.min(100, (mm / peak) * 100));
            return (
              <div
                key={s.ts}
                title={`+${s.minutes_from_now} dəq · ${mm.toFixed(1)} mm`}
                className={`flex-1 rounded-sm ${wet ? tone.bar : "bg-slate-200/70"}`}
                style={{ height: `${wet ? pct : 6}%` }}
              />
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>indi</span>
          <span>
            {data.total_mm != null && data.total_mm > 0 ? `cəmi ${data.total_mm.toFixed(1)} mm · ` : ""}
            15 dəqiqəlik addımlar
          </span>
          <span>+{windowLabel(windowMin)}</span>
        </div>
      </div>
    </div>
  );
}
