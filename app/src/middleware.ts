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
const PREFIXED = ["en", "tr", "de"]; // az is the default (no prefix)
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
  const m = path.match(/^\/(en|tr|de)(\/.*)?$/);
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

  // --- Panel/marketing host split (dormant unless PANEL_HOST set); operates on the stripped path ---
  if (PANEL_HOST) {
    const host = (req.headers.get("host") || "").toLowerCase();
    const apexHost = PANEL_HOST.replace(/^panel\./, "");
    const isPanel = host === PANEL_HOST || host.startsWith("panel.");
    const hasAuth = req.cookies.has(AUTH_COOKIE);
    if (isPanel) {
      if (!hasAuth) {
        const u = new URL(`https://${apexHost}/login`);
        if (path !== "/") u.searchParams.set("next", path);
        return NextResponse.redirect(u);
      }
      if (path === "/pricing") return NextResponse.redirect(new URL(`https://${apexHost}${path}`));
    } else if ((hasAuth && isAppPath(path)) || (path !== "/" && isAppPath(path))) {
      return NextResponse.redirect(new URL(`https://${PANEL_HOST}${path}${search}`));
    }
  }

  // Pass the resolved locale to the server layout via a request header.
  const headers = new Headers(req.headers);
  headers.set("x-locale", locale || "az");

  const res = m
    ? NextResponse.rewrite(new URL(`${path}${search}`, req.url), { request: { headers } })
    : NextResponse.next({ request: { headers } });
  if (locale && req.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|sw.js|manifest.webmanifest|icon.svg|favicon.ico|.*\\..*).*)"],
};
