"use client";

// The precipitation-intensity legend down the LEFT edge of the radar — ONESOIL_MOBILE_TEARDOWN §4.7
// measures OneSoil's weather tab as exactly this: a full-screen radar with the intensity scale on
// the left and the time scrubber at the bottom.
//
// NUMBERLESS, like the field card's vertical ramp: dBZ is a radar-reflectivity unit and printing it
// beside a farmer's field would be a number nobody on this screen can act on. Three words —
// weak / moderate / heavy — say what the colours mean, and the ramp itself is the real palette
// (RAINVIEWER_LEGEND_GRAD, read out of RainViewer's published colour table for the very scheme
// rainviewerTiles() requests). Legend and pixels are therefore one decision, not two.
//
// pointer-events-none is not decoration: a strip sitting over the map would otherwise swallow pan
// gestures started near the left bezel. That also rules out a `title` tooltip here — a tooltip
// needs the pointer.
import { RAINVIEWER_LEGEND_GRAD } from "@/lib/basemaps";
import { t } from "@/lib/i18n";

export default function RadarLegend() {
  return (
    <div
      className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2 select-none"
      aria-hidden="true"
    >
      {/* 120px is the measured height of OneSoil's vertical map legend (ONESOIL_DESIGN_SYSTEM §2.4,
          24 × 120 dp). Explicit, because the gradient bar is a flex child with no content of its
          own and would otherwise collapse to zero height. */}
      <div className="flex h-[120px] items-stretch gap-1.5 rounded-lg bg-white/85 px-1.5 py-2 shadow-soft">
        <div
          className="w-2.5 rounded-full ring-1 ring-black/15"
          style={{ background: RAINVIEWER_LEGEND_GRAD }}
        />
        {/* Top = strongest, matching the gradient's 0deg (up) direction. */}
        <div className="flex flex-col justify-between text-[10px] font-semibold leading-none text-ink-soft">
          <span>{t("app.weather.radar.legendHeavy")}</span>
          <span>{t("app.weather.radar.legendModerate")}</span>
          <span>{t("app.weather.radar.legendLight")}</span>
        </div>
      </div>
      <p className="mt-1 max-w-[7rem] text-[9.5px] font-bold uppercase leading-tight tracking-[0.08em] text-ink-soft">
        {t("app.weather.radar.legendTitle")}
      </p>
    </div>
  );
}
