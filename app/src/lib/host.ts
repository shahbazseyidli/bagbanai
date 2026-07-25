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
export const PANEL_HOST = (process.env.NEXT_PUBLIC_PANEL_HOST || "").toLowerCase();
/** Marketing apex derived from the app host: app.agradex.com → agradex.com. Empty when split off. */
export const APEX_HOST = PANEL_HOST ? PANEL_HOST.replace(/^(app|panel)\./, "") : "";
/** Cookie domain that both hosts share, so a preference set on one is visible on the other.
 *  Derived — no extra env var to keep in sync. Empty when the split is off (host-only cookie). */
export const SHARED_COOKIE_DOMAIN = APEX_HOST ? `.${APEX_HOST}` : "";

export function useIsAppHost(): boolean {
  const [appHost, setAppHost] = useState(false);
  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    setAppHost(PANEL_HOST ? host === PANEL_HOST || host.startsWith("app.") : true);
  }, []);
  return appHost;
}

/** Absolute URL for a link that must work for a SIGNED-OUT recipient (share links, invites).
 *  Those paths are served by the marketing apex; building them from window.location.origin while
 *  the farmer is on app.agradex.com produced links that bounced every recipient to /login. */
export function publicUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (APEX_HOST) return `https://${APEX_HOST}${p}`;
  if (typeof window !== "undefined" && window.location?.origin) return `${window.location.origin}${p}`;
  return p;
}
