"use client";

// D4.5 — data-saver switch (lives in "Daha çox"). When on, heavy satellite raster tiles aren't
// auto-loaded on the map; the farmer taps to load them. Defaults to the browser's Save-Data hint.
import { Gauge } from "lucide-react";
import { useDataSaver, setDataSaver } from "@/lib/dataSaver";
import { t } from "@/lib/i18n";

export default function DataSaverToggle() {
  const on = useDataSaver();
  return (
    <button
      type="button"
      onClick={() => setDataSaver(!on)}
      role="switch"
      aria-checked={on}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-left"
    >
      <Gauge className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-base font-medium text-slate-900">{t("dataSaver.title")}</span>
        <span className="block text-xs text-slate-500">{t("dataSaver.body")}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
