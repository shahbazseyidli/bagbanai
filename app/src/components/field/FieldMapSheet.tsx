"use client";

// Field detail page frame — header, then the persistent map card, then the section nav, then the
// section's content, full width.
//
// The name is historical: this began as a full-bleed map with a draggable bottom sheet (mobile) /
// fixed right sidebar (desktop); the narrow ~440px column made the labels and controls cramped, so
// the content moved into a normal full-width column, and E14 then removed the hero map entirely.
//
// 6.6 brings a map back, and it is deliberately NOT that hero: it is a bounded, rounded CARD in
// normal flow (FieldMapCard), not a full-bleed background and not a sidebar. It is mounted HERE,
// above the nav, so it survives a section change — that is what makes it persistent, and it is the
// only reason it cannot live inside the status section. Two rules travel with it:
//   * The card must never sit under a `position: sticky` ancestor. A sticky ancestor leaves the
//     MapLibre canvas blank until something forces a resize (this file's own history).
//   * `mapCard` must be omitted whenever another map owns the screen — the workbench's centre map
//     on a wide stage, or a section that builds its own (satellite, zones). The page decides; this
//     frame just renders what it is handed.
//
// Beyond that it owns the page's vertical rhythm, the measured-stage ref (the workbench threshold
// is computed from THIS box) and the camera FAB (D2.6) that jumps to photo diagnosis.
import { Camera } from "lucide-react";
import { t } from "@/lib/i18n";

export default function FieldMapSheet({
  stageRef,
  header,
  mapCard,
  tabNav,
  onCamera,
  children,
}: {
  /** useStageWidth's callback ref. It lives on the root because the workbench/card decision has to
   *  exist on EVERY section, not only the one that used to carry the measured div. */
  stageRef: (node: HTMLDivElement | null) => void;
  header: React.ReactNode;
  /** The persistent field map (6.6). Undefined when another map owns the screen. */
  mapCard?: React.ReactNode;
  tabNav: React.ReactNode;
  onCamera?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div ref={stageRef} className="space-y-4">
      {/* Field title / score / edit — above the map so the farmer knows the field first. */}
      {header}

      {mapCard}

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
