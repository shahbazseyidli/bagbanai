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
// is computed from THIS box) and the phone's floating control row: the camera FAB (D2.6) that jumps
// to photo diagnosis, and the "AI aqronom" pill (teardown §4.10).
import { Camera, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";

export default function FieldMapSheet({
  stageRef,
  header,
  mapCard,
  tabNav,
  onCamera,
  onOpenAi,
  children,
}: {
  /** useStageWidth's callback ref. It lives on the root because the workbench/card decision has to
   *  exist on EVERY section, not only the one that used to carry the measured div. */
  stageRef: (node: HTMLDivElement | null) => void;
  header: React.ReactNode;
  /** The persistent field map (6.6). Undefined when another map owns the screen. */
  mapCard?: React.ReactNode;
  /**
   * The section chip rows. OPTIONAL since the tabless phone feed: on a narrow measured stage there
   * is no chip row at all (the feed's own blocks and its "Daha çox" list carry navigation), and an
   * empty wrapper would still take a `space-y-4` gap.
   */
  tabNav?: React.ReactNode;
  onCamera?: () => void;
  /**
   * Opens the AI analysis section. Passed ONLY in feed mode — the pill is the feed's floating
   * shortcut, not chrome that follows the farmer into every section.
   */
  onOpenAi?: () => void;
  children: React.ReactNode;
}) {
  const floating = Boolean(onCamera || onOpenAi);
  return (
    <div ref={stageRef} className="space-y-4">
      {/* Field title / score / edit — above the map so the farmer knows the field first. */}
      {header}

      {mapCard}

      {/* The section nav (3 intent groups + the secondary row) and the section content, each given
          the whole page width — the reason the old sheet layout was abandoned. */}
      {tabNav && <div>{tabNav}</div>}
      <div>{children}</div>

      {/* Clears the floating row below so the last card is not parked under it. `main` already pads
          by --nav-clear + 1rem (app/layout.tsx), which covers the bar but not the 56px row sitting
          12px above it — this box plus the space-y-4 gap covers the rest. md:hidden, exactly like
          the row it is clearing. */}
      {floating && <div className="h-14 md:hidden" aria-hidden="true" />}

      {/* ONE fixed row for BOTH phone controls (teardown §4.10 puts the AI pill at the bottom of the
          field scroll; D2.6 already put the camera there). Composed rather than stacked: two
          independently-positioned fixed circles at the same offset would fight for the same corner.
          `pointer-events-none` on the full-width row is load-bearing — without it this strip would
          swallow taps meant for the card underneath — so every child re-enables its own.
          The offset is --nav-clear (globals.css: the nav's real border-box height plus the
          safe-area inset it carries under viewport-fit=cover) + 12px. It used to hard-code
          `env(safe-area-inset-bottom) + 5rem` = 80px against an 81.5px bar, so the bottom 1.5px of
          the 56px circle was clipped behind the nav and the FAB read as welded to it. Take the
          height from the token, never from a literal.
          z-30 keeps it under the map/chart fullscreen portals (z-50) and the undo bar (z-50). */}
      {floating && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-clear)_+_0.75rem)] z-30 flex items-center gap-3 px-4 md:hidden">
          {onOpenAi && (
            <button
              type="button"
              onClick={() => onOpenAi()}
              aria-label={t("app.field.feed.aiPillAria")}
              className="pointer-events-auto mr-auto inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full bg-emerald-600 px-4 text-[14px] font-bold text-white shadow-lg"
            >
              <Sparkles className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {t("app.field.feed.aiPill")}
            </button>
          )}
          {onCamera && (
            <button
              type="button"
              onClick={() => onCamera()}
              aria-label={t("app.field.fieldMapSheet.photoDiagnosisAria")}
              className="pointer-events-auto ml-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg"
            >
              <Camera className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
