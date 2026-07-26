"use client";

// The workbench cannot key off a viewport breakpoint. AppShell's content stage is the viewport
// minus the 78px rail, minus a field list that is 336px or 48px depending on a PERSISTED user
// preference (bagban_fieldlist_collapsed), plus an xl/2xl full-bleed step — which makes the stage
// NARROWER at xl (~778px) than at lg (~894px). No media query can express that inversion, so the
// only honest answer is to measure the box we are actually going to lay out in.
import { useCallback, useEffect, useRef, useState } from "react";

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

    // No ResizeObserver (very old browsers) must not leave the section on the skeleton forever —
    // measure once and stay there.
    if (typeof ResizeObserver === "undefined") {
      setWidth(node.clientWidth);
      return;
    }

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
