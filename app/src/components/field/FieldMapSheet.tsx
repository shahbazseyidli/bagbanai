"use client";

// Field detail page frame — header, then the section nav, then the section's content, full width.
//
// This file is a shell now, and its name is historical. It began as a full-bleed map with a
// draggable bottom sheet (mobile) / fixed right sidebar (desktop); the narrow ~440px column made
// the labels and controls cramped, so the content moved into a normal full-width column. Then E14
// removed the hero map from the top of it as well — the status section carries a right-sized map
// inside SatelliteGlance, so the page opens on the verdict rather than on scenery. Nothing here
// renders a map any more, and nothing here reads the field.
//
// What is left, and the only reason the component still exists: it owns the page's vertical rhythm
// and the camera FAB (D2.6) that jumps to photo diagnosis.
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

      {/* The section nav (3 intent groups + the secondary row) and the section content, each given
          the whole page width — the reason the old sheet layout was abandoned. */}
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
