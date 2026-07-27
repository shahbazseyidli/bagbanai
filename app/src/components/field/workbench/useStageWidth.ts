"use client";

// The workbench cannot key off a viewport breakpoint. AppShell's content stage is the viewport
// minus the 78px rail, minus a field list that is 336px or 48px depending on a PERSISTED user
// preference (bagban_fieldlist_collapsed), plus an xl/2xl full-bleed step — which makes the stage
// NARROWER at xl (~778px) than at lg (~894px). No media query can express that inversion, so the
// only honest answer is to measure the box we are actually going to lay out in.
import { useCallback, useEffect, useRef, useState } from "react";

// The stage width at which the field screen stops being a stack of cards and becomes a workbench:
// a rail beside a map still worth looking at.
//
// This was 920, which sounded reasonable and meant the workbench never appeared: the real stage on
// a 1440px laptop with the field list expanded — the single most common desktop setup — is 778px.
// The feature shipped unreachable. 760 is the honest floor: it leaves the map ~420px next to a
// 340px rail, which is a usable field map, and it is what the layout was actually being asked to
// handle. The rail steps up again as soon as there is room (see FieldWorkbench).
export const WORKBENCH_MIN = 760;

/**
 * What the measured stage can afford. THREE values, not a boolean, because "not measured yet" is a
 * real state with its own answer: the first frame must build neither tree, or a MapLibre map is
 * constructed in the narrow branch and torn straight down when the measurement lands one tick
 * later. Everything on the field screen — the workbench, the persistent map card, the layer-picker
 * variant, the satellite section's own two bodies — is derived from this ONE classification, so a
 * shell change that moves the stage moves all of them together.
 */
export type FieldLayout = "unknown" | "narrow" | "wide";

export function fieldLayout(stageW: number | null): FieldLayout {
  if (stageW == null) return "unknown";
  return stageW >= WORKBENCH_MIN ? "wide" : "narrow";
}

export function useStageWidth(): [(node: HTMLDivElement | null) => void, number | null] {
  // null means "not measured yet". Callers render a skeleton for that one frame rather than
  // guessing, because guessing wrong constructs a MapLibre map and tears it straight down again.
  const [width, setWidth] = useState<number | null>(null);
  const obsRef = useRef<ResizeObserver | null>(null);

  // A CALLBACK ref, not a RefObject: the field page returns a spinner until the field loads, so an
  // effect that runs once on mount would find no node and never observe anything. This fires
  // whenever the target actually attaches or detaches.
  const ref = useCallback((node: HTMLDivElement | null) => {
    obsRef.current?.disconnect();
    obsRef.current = null;
    if (!node) return;

    // MEASURE SYNCHRONOUSLY, FIRST. ResizeObserver callbacks are delivered in the frame lifecycle,
    // exactly like requestAnimationFrame — and a hidden tab produces no frames. Waiting for the
    // observer therefore left `width` null forever whenever the field was opened in a background
    // tab (middle-click, restored session, unfocused window), and the caller sat on its skeleton
    // with the entire status section missing. Verified live: in a hidden tab a freshly attached
    // observer on a laid-out 1066x460 div never fired at all.
    //
    // getBoundingClientRect does not need a frame — it forces layout and returns synchronously —
    // so the first value is always available. The observer below only refines it.
    // Same failure family as lib/useMapReady.ts; see docs and the maplibre-background-tab note.
    setWidth(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w != null) setWidth(w);
    });
    ro.observe(node);
    obsRef.current = ro;
  }, []);

  useEffect(() => {
    return () => {
      obsRef.current?.disconnect();
      obsRef.current = null;
    };
  }, []);

  return [ref, width];
}
