"use client";

// D2.3 feature flag — the redesigned "v2" surfaces (Bu gün home + full-bleed map-sheet field view)
// ship behind `?ui=v2` so they can be browser-tested on production without flipping the new UI on
// for every farmer. `?ui=v2` opts in and is sticky (localStorage); `?ui=v1` opts back out.
// Components that call this must sit under a <Suspense> boundary (useSearchParams requirement).
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const KEY = "bagban_ui_v2";

export function useUiV2(): boolean {
  const sp = useSearchParams();
  const param = sp.get("ui");
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (param === "v2") {
        localStorage.setItem(KEY, "1");
        setOn(true);
        return;
      }
      if (param === "v1") {
        localStorage.removeItem(KEY);
        setOn(false);
        return;
      }
      setOn(localStorage.getItem(KEY) === "1");
    } catch {
      setOn(param === "v2");
    }
  }, [param]);
  return on;
}
