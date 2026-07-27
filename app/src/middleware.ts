import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Two concerns in one middleware:
//   (Phase 4) Locale path-prefix: /en, /tr, /de → strip the prefix, remember the locale (cookie +
//     x-locale request header the server layout reads), serve the underlying route. First-time
//     visitors with a non-az browser language are redirected once to their prefixed URL.
//   (Phase 2) App/marketing host split: agradex.com=marketing, app.agradex.com=app. DORMANT
//     until NEXT_PUBLIC_PANEL_HOST is set to app.agradex.com (no-op when empty). The env var keeps
//     its legacy name; only its value is app.agradex.com. See deploy/APP_ACTIVATION.md.
const PANEL_HOST = (process.env.NEXT_PUBLIC_PANEL_HOST || "").toLowerCase();
const AUTH_COOKIE = "bagban_session";
const LOCALE_COOKIE = "bagban_locale";
const PREFIXED = ["en", "ru", "tr", "de", "hu", "it", "pl"]; // az is the default (no prefix)
const APP_PREFIXES = ["/fields", "/farms", "/more", "/notifications", "/onboarding", "/team", "/admin",
  "/catalog", "/chat", "/account", "/provider"];

function isAppPath(path: string): boolean {
  return path === "/" || APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const search = url.search;
  let path = url.pathname;

  // --- Resolve the locale (prefix > cookie > browser) ---
  let locale = req.cookies.get(LOCALE_COOKIE)?.value || "";
  // Built from PREFIXED so adding a locale needs one edit, not two (this regex used to be a
  // hardcoded en|tr|de and silently ignored hu/it/pl).
  const m = path.match(new RegExp(`^/(${PREFIXED.join("|")})(/.*)?$`));
  if (m) {
    locale = m[1];
    path = m[2] || "/"; // strip the prefix for internal routing
  } else if (!locale) {
    const al = (req.headers.get("accept-language") || "").slice(0, 2).toLowerCase();
    if (PREFIXED.includes(al)) {
      return NextResponse.redirect(new URL(`/${al}${url.pathname}${search}`, req.url));
    }
    locale = "az";
  }

  // Locale prefix to re-attach when we bounce between hosts, so /en/... does not silently become az.
  const prefix = m ? `/${locale}` : "";

  // Is this request on the APP host? Resolved here and handed to the server layer as a header, so
  // Server Components and generateMetadata know it WITHOUT waiting for a client effect. Before this,
  // the home page could not decide what it was until the browser mounted, so the server rendered a
  // spinner and the entire marketing landing was missing from the HTML crawlers see.
  const reqHost = (req.headers.get("host") || "").toLowerCase();
  const onAppHost = PANEL_HOST
    ? reqHost === PANEL_HOST || reqHost.startsWith("app.") || reqHost.startsWith("panel.")
    : true; // split off → every host is the app host (pre-split behaviour)

  // --- Panel/marketing host split (dormant unless PANEL_HOST set); operates on the stripped path ---
  if (PANEL_HOST) {
    // The panel host is app.agradex.com (or legacy panel.*). Strip that leading label to get the
    // marketing apex — a `/^panel\./` regex would NOT strip "app." and apexHost would equal the
    // panel host, sending the login redirect to itself → infinite loop.
    const apexHost = PANEL_HOST.replace(/^(app|panel)\./, "");
    const isPanel = onAppHost;
    const hasAuth = req.cookies.has(AUTH_COOKIE);
    if (isPanel) {
      // Public/marketing pages live on the apex even when reached through the app host — and this
      // check runs BEFORE the auth gate on purpose. `/s/` share links are public by design; behind
      // the gate, a farmer who copied a link out of the app was handing every recipient a login
      // page instead of the field.
      if (path === "/pricing" || path === "/solutions" || path.startsWith("/solutions/") ||
          path === "/how-it-works" || path === "/guide" || path.startsWith("/guide/") ||
          path === "/privacy" || path === "/terms" ||
          path === "/demo" ||
          path.startsWith("/s/")) {
        return NextResponse.redirect(new URL(`https://${apexHost}${prefix}${path}${search}`));
      }
      // On the app host: anything but a real signed-in session goes to the marketing login.
      if (!hasAuth) {
        const u = new URL(`https://${apexHost}${prefix}/login`);
        if (path !== "/") u.searchParams.set("next", path);
        return NextResponse.redirect(u);
      }
    } else if (path !== "/" && isAppPath(path)) {
      // On the apex: real app paths jump to the app host. The home "/" ALWAYS stays marketing
      // (even for signed-in users) so the brand/logo can point here — clicking it shows marketing,
      // exactly as requested, and a signed-in visitor gets a "Panelə keç" link into the app.
      // The locale prefix is carried across so /en/fields does not land in Azerbaijani.
      return NextResponse.redirect(new URL(`https://${PANEL_HOST}${prefix}${path}${search}`));
    }
  }

  // Pass the resolved locale to the server layout via a request header.
  const headers = new Headers(req.headers);
  headers.set("x-locale", locale || "az");
  headers.set("x-app-host", onAppHost ? "1" : "0");
  // The locale-stripped path, so the layout can emit hreflang alternates for every language of THIS
  // page without each page having to build them itself.
  headers.set("x-pathname", path);

  const res = m
    ? NextResponse.rewrite(new URL(`${path}${search}`, req.url), { request: { headers } })
    : NextResponse.next({ request: { headers } });
  if (locale && req.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    // Scoped to the shared parent domain (.agradex.com) so the language survives the marketing→app
    // hop; a host-only cookie made app.agradex.com fall back to browser detection every time.
    const domain = PANEL_HOST ? `.${PANEL_HOST.replace(/^(app|panel)\./, "")}` : undefined;
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax", domain });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|sw.js|manifest.webmanifest|icon.svg|favicon.ico|.*\\..*).*)"],
};
