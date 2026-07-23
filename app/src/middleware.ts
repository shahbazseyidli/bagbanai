import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Phase 2 — panel/marketing split via host routing (single app).
//   agradex.com        → marketing (landing, pricing, login, signup)
//   panel.agradex.com  → the app (dashboard, fields, …)
// DORMANT until NEXT_PUBLIC_PANEL_HOST is set (e.g. "panel.agradex.com"): with it empty the
// middleware is a no-op, so everything is served from the apex exactly as today. Activated once
// the panel DNS/nginx/cert are in place.
const PANEL_HOST = (process.env.NEXT_PUBLIC_PANEL_HOST || "").toLowerCase();
const COOKIE = "bagban_session";

// App routes belong on the panel; everything else on the apex is marketing.
const APP_PREFIXES = ["/fields", "/farms", "/more", "/notifications", "/onboarding", "/team", "/admin"];

function isAppPath(path: string): boolean {
  return path === "/" || APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  if (!PANEL_HOST) return NextResponse.next(); // split disabled → serve as-is

  const host = (req.headers.get("host") || "").toLowerCase();
  const apexHost = PANEL_HOST.replace(/^panel\./, "");
  const isPanel = host === PANEL_HOST || host.startsWith("panel.");
  const path = req.nextUrl.pathname;
  const hasAuth = req.cookies.has(COOKIE);

  if (isPanel) {
    // Panel = the app. Logged-out visitors → marketing login (remember where they were going).
    if (!hasAuth) {
      const url = new URL(`https://${apexHost}/login`);
      if (path !== "/") url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    // Marketing-only pages requested on the panel → send to the apex.
    if (path === "/pricing") return NextResponse.redirect(new URL(`https://${apexHost}${path}`));
    return NextResponse.next();
  }

  // Apex = marketing. Logged-in users at an app path (incl. "/") → the panel app.
  if (hasAuth && isAppPath(path)) {
    return NextResponse.redirect(new URL(`https://${PANEL_HOST}${path}`));
  }
  // App routes hit on the apex (even logged-out) belong on the panel.
  if (path !== "/" && isAppPath(path)) {
    return NextResponse.redirect(new URL(`https://${PANEL_HOST}${path}`));
  }
  return NextResponse.next();
}

export const config = {
  // Skip API, Next internals, service worker, and static assets.
  matcher: ["/((?!api|_next|sw.js|manifest.webmanifest|icon.svg|favicon.ico|.*\\..*).*)"],
};
