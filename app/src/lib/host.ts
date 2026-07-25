"use client";

import { useEffect, useState } from "react";

// Single source of truth for the panel split (agradex.com = marketing · app.agradex.com = the app).
// `true` when the current browser host is the APP host, so app chrome (AppRail, FieldListPanel,
// BottomNav) may render. On the apex marketing host it is `false` and only marketing renders.
//
// SSR default is `false` (marketing) and corrected on mount — same as HomeInner. There is no flash
// on the app host: the app chrome is also gated on auth `loading`, which resolves via a network
// /me call strictly after this synchronous mount effect, so `appHost` is already correct by then.
//
// When the split is off (NEXT_PUBLIC_PANEL_HOST empty) every host is the app host — the pre-split
// behavior, unchanged.
export function useIsAppHost(): boolean {
  const [appHost, setAppHost] = useState(false);
  useEffect(() => {
    const panel = (process.env.NEXT_PUBLIC_PANEL_HOST || "").toLowerCase();
    const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    setAppHost(panel ? host === panel || host.startsWith("app.") : true);
  }, []);
  return appHost;
}
