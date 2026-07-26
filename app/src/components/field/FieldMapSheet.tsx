"use client";

// Field detail — MAP ON TOP, DETAIL CONTENT BELOW (stacked, full width) on BOTH mobile and desktop.
// This used to be a full-bleed map with a draggable bottom sheet (mobile) / fixed right sidebar
// (desktop). The narrow ~440px column made the tab labels + controls cramped and hard to read, so
// the detail content now flows in a normal, full-width column UNDERNEATH the map — the 3 intent
// groups, the secondary tab row, and every tab's content get the whole page width.
//
// The map is a plain container in normal document flow at a comfortable height (~50vh). It is NOT
// position:sticky on purpose: a WebGL (MapLibre) map inside a sticky element renders blank until a
// resize, so we keep it in normal flow where DisplayMap paints on first mount.
//
// Ships behind ?ui=v2 (now the default UI). A camera FAB (D2.6) jumps to photo diagnosis.
import { Camera } from "lucide-react";
import { t } from "@/lib/i18n";
import type { FieldDetail } from "@/lib/types";

export default function FieldMapSheet({
  header,
  tabNav,
  onCamera,
  children,
}: {
  // Still accepted from the field page, but this wrapper no longer reads it: the map (and its
  // raster fetch) moved into SatelliteGlance, so nothing here needs the field data.
  field: FieldDetail;
  header: React.ReactNode;
  tabNav: React.ReactNode;
  onCamera?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {/* Field title / score / edit — above the map so the farmer knows the field first. */}
      {header}

      {/* E14 — the full-bleed hero map was removed on purpose: the status section now carries a
          right-sized map inside SatelliteGlance, so the page opens on the verdict instead of on
          scenery. This wrapper stays because it owns the camera FAB and the page layout. */}

      {/* Detail content — full width, below the map. The tab bar (3 intent groups + secondary row)
          and every tab's content get the whole page width. */}
      <div>{tabNav}</div>
      <div>{children}</div>

      {/* Camera FAB (D2.6) — jumps to photo diagnosis. Mobile only; sits above the bottom nav.
          The 5rem offset clears that nav, which grew by the safe-area inset under viewport-fit=
          cover — so this offset grows with it, or the FAB lands on top of the nav row. */}
      {onCamera && (
        <button
          type="button"
          onClick={() => onCamera()}
          aria-label={t("app.field.fieldMapSheet.photoDiagnosisAria")}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)_+_5rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg md:hidden"
        >
          <Camera className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
