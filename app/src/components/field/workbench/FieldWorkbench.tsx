"use client";

// Feature D — the desktop workbench frame for the field's status section: map stage on the left,
// the same status cards as a scrolling rail on the right.
//
// Never sticky and never fixed. A sticky ancestor leaves the MapLibre canvas blank until something
// forces a resize, which is the failure this codebase has hit more than once.
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import FieldPulse from "@/components/field/overview/FieldPulse";
import SignalsActions from "@/components/field/overview/SignalsActions";
import ShareButton from "@/components/field/ShareButton";
import GrantAccess from "@/components/field/GrantAccess";
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
  // Three steps, because the workbench now starts at a 778px stage (a 1440px laptop with the field
  // list open) rather than at 920: give the map its share back at the bottom end, and let the rail
  // grow once there is room for FieldPulse's score ring and component bars to breathe.
  const cols =
    stageW >= 1280
      ? "grid-cols-[minmax(0,1fr)_400px]"
      : stageW >= 1000
        ? "grid-cols-[minmax(0,1fr)_360px]"
        : "grid-cols-[minmax(0,1fr)_340px]";

  // The height has to be MEASURED, not budgeted from a constant. AppRail and FieldListPanel can use
  // a flat `100vh - 92px` because they are sticky at 76px from the viewport top. The workbench is
  // not: it sits below the field header, the section nav and the rain nowcast — 270-400px of
  // chrome, varying with the breakpoint and with whether the nowcast has data. Subtracting 92px
  // therefore always overshot, and what fell below the fold was the scene timeline: the one control
  // this layout exists to put in reach.
  const rootRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    measure();
    // document.body, not the element: the offset changes when something ABOVE grows (a wrapped
    // header, the nowcast arriving), which never resizes the workbench itself.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    // dvh, not vh: this branch turns on from ~1050px viewport width, which includes iPads in
    // landscape, where the browser chrome collapses on scroll and vh would be measured against the
    // taller, wrong viewport. 16px of bottom breathing room matches the shell columns.
    <div
      ref={rootRef}
      style={top != null ? { height: `calc(100dvh - ${top}px - 16px)` } : undefined}
      className={`grid ${cols} min-h-[560px] gap-4 ${top == null ? "h-[calc(100dvh_-_320px)]" : ""}`}
    >
      {/* min-h-0 / min-w-0 are load-bearing: grid items default to min-height:auto, so without them
          the rail refuses to shrink and pushes the row past the viewport instead of scrolling. */}
      <section aria-label={t("app.field.workbench.mapAria")} className="h-full min-h-0 min-w-0">
        <SatelliteStage field={field} onOpenSatellite={onOpenSatellite} />
      </section>

      <aside
        aria-label={t("app.field.workbench.railAria")}
        className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-0.5"
      >
        <FieldPulse field={field} />
        <SignalsActions fieldId={field.id} onOpenAnalysis={onOpenAnalysis} />
        <ShareButton fieldId={field.id} />
        <GrantAccess fieldId={field.id} />
      </aside>
    </div>
  );
}
