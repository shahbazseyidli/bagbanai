"use client";

// Feature D — the desktop workbench frame for the field's status section: map stage on the left,
// the same status cards as a scrolling rail on the right.
//
// Never sticky and never fixed. A sticky ancestor leaves the MapLibre canvas blank until something
// forces a resize, which is the failure this codebase has hit more than once.
import { t } from "@/lib/i18n";
import FieldPulse from "@/components/field/overview/FieldPulse";
import SignalsActions from "@/components/field/overview/SignalsActions";
import ShareButton from "@/components/field/ShareButton";
import SatelliteStage from "@/components/field/workbench/SatelliteStage";
import type { FieldDetail } from "@/lib/types";

export default function FieldWorkbench({
  field,
  stageW,
  onOpenSatellite,
  onOpenAnalysis,
}: {
  field: FieldDetail;
  /** Measured stage width in px — already known to be >= the workbench threshold. */
  stageW: number;
  onOpenSatellite: () => void;
  onOpenAnalysis: () => void;
}) {
  // Written as COMPLETE literals: Tailwind's content scanner cannot see a class name assembled
  // from a template string, and a missing grid-cols silently collapses this to one column.
  // 400px only once the stage can spare it; below that FieldPulse still gets >= 320px of content.
  const cols =
    stageW >= 1280 ? "grid-cols-[minmax(0,1fr)_400px]" : "grid-cols-[minmax(0,1fr)_360px]";

  return (
    // 92px = the exact budget AppRail and FieldListPanel already use (76px sticky offset + 16px
    // bottom breathing room), so the workbench ends flush with both shell columns. 100vh, not dvh:
    // this path is desktop-only and matches the shell. min-h keeps it usable on a short window at
    // the cost of body scroll — deliberate, since body scroll is never taken away.
    <div className={`grid ${cols} h-[calc(100vh_-_92px)] min-h-[560px] gap-4`}>
      {/* min-h-0 / min-w-0 are load-bearing: grid items default to min-height:auto, so without them
          the rail refuses to shrink and pushes the row past the viewport instead of scrolling. */}
      <section aria-label={t("app.field.workbench.mapAria")} className="min-h-0 min-w-0">
        <SatelliteStage field={field} stageW={stageW} onOpenSatellite={onOpenSatellite} />
      </section>

      <aside
        aria-label={t("app.field.workbench.railAria")}
        className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-0.5"
      >
        <FieldPulse field={field} />
        <SignalsActions fieldId={field.id} onOpenAnalysis={onOpenAnalysis} />
        <ShareButton fieldId={field.id} />
      </aside>
    </div>
  );
}
