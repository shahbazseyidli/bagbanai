"use client";

// The bar under the map while a note's location is being placed (6.5).
//
// It owns no map. The reticle is a graphic pinned to the centre of the canvas (DisplayMap) and is
// aria-hidden; THIS is where the coordinates it represents become text, in an aria-live="polite"
// region. That pairing is the whole accessibility story of the interaction: MapLibre's canvas pans
// with the arrow keys once focused, so a farmer using a keyboard and a screen reader hears the
// coordinates change as they pan, and can confirm — without ever seeing the crosshair.
//
// "polite", never "assertive": the readout updates on every moveend, and an assertive region would
// interrupt whatever else is being announced each time the map settles.
import { Check, X } from "lucide-react";
import { t, tf } from "@/lib/i18n";

export default function ScoutPlacementBar({
  center,
  onConfirm,
  onCancel,
}: {
  center: { lng: number; lat: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border-[1.5px] border-amber-300 bg-amber-50 px-3 py-2.5">
      <p className="text-sm font-medium text-amber-900">{t("app.field.scouting.placeHint")}</p>
      <p className="mt-1 text-xs tabular-nums text-amber-800" aria-live="polite">
        {center
          ? tf("app.field.scouting.coords", {
              lat: center.lat.toFixed(5),
              lon: center.lng.toFixed(5),
            })
          : t("app.field.scouting.noCoords")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!center}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {t("app.field.scouting.placeConfirm")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
