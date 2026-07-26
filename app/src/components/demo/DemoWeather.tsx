"use client";

// Five-day forecast strip for /demo. Numbers only — max/min °C and mm — so there is no prose to
// localize and no backend-invented sentence to render. Nothing existing fits: the app's weather
// surfaces all carry recommendations, spray windows and alerts, which are per-field advice a public
// page has no business handing to a stranger.
import { CloudRain, Thermometer } from "lucide-react";
import { Placeholder } from "@/components/ui";
import { t } from "@/lib/i18n";

export interface DemoDay {
  date: string | null;
  t_min: number | null;
  t_max: number | null;
  precip_mm: number | null;
  precip_prob: number | null;
}

function num(v: number | null | undefined, digits = 0): string {
  return v == null ? "—" : v.toFixed(digits);
}

export default function DemoWeather({ days }: { days: DemoDay[] }) {
  return (
    <section className="card">
      <h3 className="mb-3 font-display text-[15px] font-bold text-ink">{t("mkt.demo.weatherTitle")}</h3>

      {days.length === 0 ? (
        <Placeholder>{t("mkt.demo.weatherEmpty")}</Placeholder>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, i) => (
            <div
              key={d.date ?? i}
              className="min-w-[92px] shrink-0 rounded-xl border-[1.5px] border-line bg-panel px-2.5 py-2 text-center"
            >
              <b className="block text-[11.5px] font-bold text-ink">{(d.date ?? "").slice(5, 10)}</b>
              <span className="mt-1 flex items-center justify-center gap-1 text-[12.5px] tabular-nums text-ink">
                <Thermometer className="h-3 w-3 shrink-0 text-ink-soft" aria-hidden="true" />
                <span aria-label={t("mkt.demo.weatherTemp")}>
                  {num(d.t_max)}° / {num(d.t_min)}°
                </span>
              </span>
              <span className="mt-0.5 flex items-center justify-center gap-1 text-[11.5px] tabular-nums text-ink-soft">
                <CloudRain className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span aria-label={t("mkt.demo.weatherPrecip")}>{num(d.precip_mm, 1)} mm</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[12px] leading-snug text-ink-soft">{t("mkt.demo.weatherCaption")}</p>
    </section>
  );
}
