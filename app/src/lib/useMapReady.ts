"use client";

import { useEffect, useState } from "react";

// Every MapLibre map in the app is gated on this hook.
//
// MapLibre's Style.loadJSON does not parse the style immediately — it waits for one
// requestAnimationFrame first (`browser.frameAsync`), and swallows the rejection if that frame
// never arrives. A background tab produces no frames at all, so a map constructed there gets stuck
// with `style._loaded === false`, `style.stylesheet === null` and its frame request still pending:
// `load` never fires, the basemap is never applied, no tiles are ever requested, no polygons are
// drawn — and MapLibre does NOT retry when the tab is finally brought to the front. The result is a
// permanently empty grey box with a correctly sized canvas, a live WebGL context, working zoom
// controls and not a single error anywhere. Diagnosed live on app.agradex.com 2026-07-26.
//
// Users hit this whenever the app is opened without being looked at first: a middle-click / "open
// in new tab", a session restored on browser start, a PWA warm start, or a link opened behind the
// current window.
//
// So: wait for a real frame before building the map. requestAnimationFrame is the exact signal —
// it fires precisely when the browser is producing the frames MapLibre needs, which is stricter and
// more portable than `document.visibilityState` (a minimised or fully occluded window can report
// "visible" while still being throttled).
export function useMapReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let handle = 0;

    const arm = () => {
      cancelAnimationFrame(handle);
      handle = requestAnimationFrame(() => {
        if (!cancelled) setReady(true);
      });
    };
    arm();

    // A pending frame callback does fire once the tab is shown, but re-arming is free insurance for
    // the cases where the browser drops it instead (bfcache restore, occluded window).
    const onVisible = () => {
      if (document.visibilityState === "visible") arm();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return ready;
}
