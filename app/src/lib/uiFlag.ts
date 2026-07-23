"use client";

// D2.3 feature flag — the redesigned "v2" surfaces (Bu gün home + full-bleed map-sheet field view)
// ship behind `?ui=v2` so they can be browser-tested on production without flipping the new UI on
// for every farmer. `?ui=v2` opts in and is sticky (localStorage); `?ui=v1` opts back out.
// Components that call this must sit under a <Suspense> boundary (useSearchParams requirement).
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const KEY = "bagban_ui_v2";

// v2 (Bu gün home + map-first field sheet) is now the DEFAULT product UI. `?ui=v1` opts back out
// (sticky), `?ui=v2` returns to the default. Kept as an escape hatch, not a rollout gate.
export function useUiV2(): boolean {
  const sp = useSearchParams();
  const param = sp.get("ui");
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      if (param === "v1") {
        localStorage.setItem(KEY, "v1");
        setOn(false);
        return;
      }
      if (param === "v2") {
        localStorage.removeItem(KEY);
        setOn(true);
        return;
      }
      setOn(localStorage.getItem(KEY) !== "v1");
    } catch {
      setOn(param !== "v1");
    }
  }, [param]);
  return on;
}
