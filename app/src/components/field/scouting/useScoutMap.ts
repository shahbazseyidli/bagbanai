"use client";

// The bridge between the scouting section and the ONE field map (6.5).
//
// The map is not inside the section. FieldMapCard is mounted by the page, above the section nav,
// precisely so it survives a section change — so the pins have to travel UP from ScoutingTab to
// the page and back DOWN into the card. This hook is that lift: the page calls it once, spreads
// `card` onto FieldMapCard and hands the rest to ScoutingTab.
//
// A context provider was the obvious alternative and does not work here: the page would have to
// both provide the value and consume it in the same render to fill the card's props. A module-
// level store would have worked, but this is state with exactly one owner and one lifetime — the
// field page — and useState says that plainly.
import { useCallback, useMemo, useRef, useState } from "react";
import type { MapPin } from "@/lib/types";

export interface ScoutMapCardProps {
  pins: MapPin[];
  onPinClick: (id: string) => void;
  reticle: boolean;
  onCenterChange: (lng: number, lat: number) => void;
  flyTo: { lng: number; lat: number; seq: number } | null;
}

export interface ScoutMap {
  /** Spread onto FieldMapCard. */
  card: ScoutMapCardProps;
  /** Whether a map is actually on screen. The tab hides "pick the spot on the map" and "show on
   *  the map" when it is false — an affordance pointing at nothing is worse than its absence. */
  present: boolean;
  setPins: (pins: MapPin[]) => void;
  placing: boolean;
  setPlacing: (v: boolean) => void;
  /** The map's centre while placing — null until the map reports it. */
  center: { lng: number; lat: number } | null;
  /** Recentre the map on a point. Repeating the same point still flies (the seq changes). */
  focus: (lng: number, lat: number) => void;
  /** The last pin tapped. `seq` is what makes a second tap on the SAME pin a new event. */
  tapped: { id: string; seq: number } | null;
  clearTapped: () => void;
}

export function useScoutMap(present: boolean): ScoutMap {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [placing, setPlacing] = useState(false);
  const [center, setCenter] = useState<{ lng: number; lat: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; seq: number } | null>(null);
  const [tapped, setTapped] = useState<{ id: string; seq: number } | null>(null);

  const onCenterChange = useCallback((lng: number, lat: number) => {
    setCenter({ lng, lat });
  }, []);

  // The counters live in refs, NOT derived from the previous state, because clearTapped() sets
  // `tapped` back to null: deriving from it would restart at 1 every time, so tapping the same pin
  // again after closing the panel would produce an identical {id, seq} and the consumer's effect
  // — which is watching exactly those two values — would never fire.
  const tapSeq = useRef(0);
  const flySeq = useRef(0);

  const onPinClick = useCallback((id: string) => {
    tapSeq.current += 1;
    setTapped({ id, seq: tapSeq.current });
  }, []);

  const clearTapped = useCallback(() => setTapped(null), []);

  const focus = useCallback((lng: number, lat: number) => {
    flySeq.current += 1;
    setFlyTo({ lng, lat, seq: flySeq.current });
  }, []);

  const card = useMemo<ScoutMapCardProps>(
    // Placement is meaningless with no map on screen, so the reticle is gated on `present` here
    // rather than trusted to every caller.
    () => ({ pins, onPinClick, reticle: placing && present, onCenterChange, flyTo }),
    [pins, onPinClick, placing, present, onCenterChange, flyTo],
  );

  return {
    card,
    present,
    setPins,
    placing,
    setPlacing,
    center,
    focus,
    tapped,
    clearTapped,
  };
}
