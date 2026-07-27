"use client";

// One page-scroll lock for the whole app, REF-COUNTED.
//
// Save-the-previous-value-and-restore-it is only correct while releases are LIFO, and on this
// screen they are not. The field map card's fullscreen frame is tied to ?map=full, which the
// ANDROID BACK GESTURE pops at any moment, while the layer sheet's effect does not depend on
// `fullscreen` at all. The sequence that froze the page for the rest of the session:
//
//   fullscreen opens   → saves ""        sets hidden
//   layer sheet opens  → saves "hidden"  sets hidden
//   back gesture       → fullscreen restores ""        (page scrollable again, sheet still open)
//   sheet closes       → restores "hidden"             ← nobody left to undo this
//
// <html> stays overflow:hidden and the field page can no longer be scrolled. Back-to-dismiss is the
// first thing an Android user tries, so this was not a corner case.
//
// A counter makes the order irrelevant: the ORIGINAL value is captured on the 0→1 transition and
// put back on 1→0, and everything in between is a no-op. Closing the sheet when fullscreen changes
// would NOT have fixed it — React runs the parent's cleanup first, so the sheet's stale "hidden"
// would still land last.
//
// documentElement, NOT body: globals.css sets `html, body { overflow-x: hidden }` (load-bearing —
// it swallows AppShell's full-bleed overhang), which makes html's computed overflow-y `auto`, and
// body's overflow only propagates to the viewport while html's is `visible`. Locking body here
// clipped nothing and the page scrolled behind the overlay.

let depth = 0;
let original = "";

/**
 * Lock page scrolling. Returns the matching release, which is idempotent — calling it twice
 * releases once, so a React cleanup that runs again (StrictMode, a remount race) cannot unbalance
 * the counter and leave the page locked or unlock it under somebody else.
 */
export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (depth === 0) {
    original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }
  depth += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth -= 1;
    if (depth <= 0) {
      depth = 0;
      document.documentElement.style.overflow = original;
    }
  };
}
