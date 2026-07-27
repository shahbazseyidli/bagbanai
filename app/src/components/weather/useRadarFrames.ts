"use client";

// The RainViewer frame index, fetched and re-fetched.
//
// One hook, one request, one parse. It exists as its own file because THREE components need the
// same list — the map paints a frame, the scrubber lays the frames out in time, and the screen
// decides whether there is a radar at all — and three copies of "what came back from RainViewer"
// is three chances to disagree about which frame is on screen.
//
// WHAT IT REFUSES TO DO: invent a future. RainViewer's `nowcast` array came back EMPTY on every
// probe (see the note beside RAINVIEWER_INDEX in lib/basemaps), and an empty forecast track is a
// legitimate answer, not a failure. Nothing here pads, extrapolates or back-fills; a frame exists
// in this list only because RainViewer sent it, and it carries the kind RainViewer gave it.
import { useEffect, useRef, useState } from "react";
import { RAINVIEWER_INDEX } from "@/lib/basemaps";

/** One radar frame exactly as RainViewer describes it, plus which half of the index it came from. */
export interface RadarFrame {
  /** RainViewer's own stamp: UNIX SECONDS, UTC. Rendered through Intl in the viewer's zone. */
  time: number;
  /** Path segment for the tile template — see rainviewerTiles(). */
  path: string;
  /** "past" = radar OBSERVATION, "nowcast" = radar FORECAST. Never conflate the two. */
  kind: "past" | "nowcast";
}

export interface RadarIndex {
  host: string;
  /** past frames first, then nowcast — both already in ascending time order. */
  frames: RadarFrame[];
  /** Index of the newest OBSERVED frame, or -1 when RainViewer sent no past frames at all. */
  lastPastIdx: number;
}

export type RadarState = "idle" | "loading" | "ready" | "failed";

/**
 * How often the index is re-fetched.
 *
 * RainViewer publishes a new frame every 600 s, so five minutes guarantees the newest observation
 * is on screen within half a step without polling a free service harder than it publishes.
 */
const REFRESH_MS = 5 * 60 * 1000;

/** A frame survives parsing only with BOTH a finite time and a non-empty path — a half-formed entry
 *  would build a tile URL that 404s on every tile and read as "no rain". */
function parseList(raw: unknown, kind: "past" | "nowcast"): RadarFrame[] {
  if (!Array.isArray(raw)) return [];
  const out: RadarFrame[] = [];
  for (const e of raw) {
    const time = (e as { time?: unknown } | null)?.time;
    const path = (e as { path?: unknown } | null)?.path;
    if (typeof time === "number" && Number.isFinite(time) && typeof path === "string" && path) {
      out.push({ time, path, kind });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

/**
 * @param enabled false keeps this hook completely silent — no fetch, no timer. The weather screen
 *   passes false while the data saver is on and the farmer has not asked for the radar yet, so
 *   declining the radar declines its index too, not just its tiles.
 */
export function useRadarFrames(enabled: boolean): { index: RadarIndex | null; state: RadarState } {
  const [index, setIndex] = useState<RadarIndex | null>(null);
  const [state, setState] = useState<RadarState>("idle");
  // Held across refreshes so a failed refresh does not blank a radar that is already on screen:
  // the previous frames stay painted and only go away if there were never any.
  const hasRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setState("idle");
      return;
    }
    let active = true;

    const load = async () => {
      if (!hasRef.current) setState("loading");
      try {
        const res = await fetch(RAINVIEWER_INDEX, { cache: "no-store" });
        const d: unknown = await res.json();
        const host = (d as { host?: unknown } | null)?.host;
        const radar = (d as { radar?: unknown } | null)?.radar;
        const past = parseList((radar as { past?: unknown } | null)?.past, "past");
        const nowcast = parseList((radar as { nowcast?: unknown } | null)?.nowcast, "nowcast");
        const frames = [...past, ...nowcast];
        if (!active) return;
        // A response with no host or no frames is not an error to shout about — it is simply no
        // radar. The map keeps showing the fields either way.
        if (typeof host !== "string" || !host || frames.length === 0) {
          if (!hasRef.current) {
            setIndex(null);
            setState("failed");
          }
          return;
        }
        hasRef.current = true;
        setIndex({ host, frames, lastPastIdx: past.length - 1 });
        setState("ready");
      } catch {
        if (active && !hasRef.current) {
          setIndex(null);
          setState("failed");
        }
      }
    };

    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled]);

  return { index, state };
}
