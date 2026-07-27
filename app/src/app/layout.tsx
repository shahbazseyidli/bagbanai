import type { Metadata, Viewport } from "next";
import { Inter, Geologica } from "next/font/google";
import { headers, cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";
import AppShell from "@/components/shell/AppShell";
import PwaRegister from "@/components/PwaRegister";
import OfflineIndicator from "@/components/OfflineIndicator";
import LocaleProvider from "@/components/LocaleProvider";
import { AppHostProvider } from "@/lib/host";
import { getT } from "@/lib/i18n-server";
import { LOCALES, type Locale } from "@/lib/i18n";

// D1.2 — Inter Variable, self-hosted by Next; latin-ext covers Azerbaijani ə/ğ/ı/İ/ş/ç/ö/ü.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
// W2 — Geologica is the display face of the approved redesign; self-hosted by next/font so no
// external request is made (the CSP and offline-first PWA both require that).
const geologica = Geologica({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Marketing lives on the apex; alternates must point there regardless of which host served us.
const SITE = `https://${(process.env.NEXT_PUBLIC_PANEL_HOST || "agradex.com").replace(/^(app|panel)\./, "")}`;

/** hreflang for every locale of the CURRENT path. Without these, seven language versions of the
 *  same page compete with each other and Google picks for us. az is the unprefixed default. */
function alternatesFor(path: string) {
  const clean = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = l === "az" ? `${SITE}${clean || "/"}` : `${SITE}/${l}${clean}`;
  languages["x-default"] = `${SITE}${clean || "/"}`;
  return languages;
}

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const t = await getT();
  const locale = (h.get("x-locale") || "az") as Locale;
  const path = h.get("x-pathname") || "/";
  const canonical = locale === "az"
    ? `${SITE}${path}`
    : `${SITE}/${locale}${path === "/" ? "" : path}`;
  return {
    title: "Agradex",
    description: t("landing.metaDescription"),
    alternates: { canonical, languages: alternatesFor(path) },
    appleWebApp: { capable: true, title: "Agradex", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  // W3 — was #059669, the pre-D1 green. The address bar and the installed PWA's chrome were
  // painting a colour the product no longer contains anywhere else.
  themeColor: "#15803D",
  // Without viewport-fit=cover every env(safe-area-inset-*) resolves to 0, so the bottom nav's
  // pb-[env(safe-area-inset-bottom)] was a no-op and its rows sat under the iPhone home indicator /
  // Android gesture bar. Opting in makes those insets real — every viewport-anchored element below
  // (top Nav, OfflineIndicator, BottomNav, the camera FAB, BulkActions, the undo bar) now pads
  // itself by the inset, which stays a no-op on devices that report 0.
  viewportFit: "cover",
  // W3 — Android Chrome defaults to "resizes-visual": the LAYOUT viewport does not shrink when the
  // on-screen keyboard opens, so anything position:fixed to the bottom (this nav, the AI-chat
  // composer) ends up underneath the keyboard while the user types. resizes-content shrinks the
  // layout viewport instead, so those elements ride above the keyboard.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale resolved by middleware (prefix → x-locale header; else the cookie). SSR + client match.
  const [h, c] = await Promise.all([headers(), cookies()]);
  const locale = ((h.get("x-locale") || c.get("bagban_locale")?.value || "az")) as Locale;
  // Known from the request, not from a client effect — see lib/host.
  const appHost = h.get("x-app-host") !== "0";
  return (
    <html lang={locale} className={`${inter.variable} ${geologica.variable}`}>
      <body className="font-sans text-ink antialiased">
        <LocaleProvider initialLocale={locale}>
          <AppHostProvider value={appHost}>
          <AuthProvider>
            <PwaRegister />
            <OfflineIndicator />
            <Nav />
            {/* pb clears the fixed BottomNav. --nav-clear (globals.css) is the bar height plus the
                safe-area inset, and it collapses to the inset alone at md+ where the bar is hidden,
                so this padding and the nav's own height can no longer drift apart. Same 96px as the
                literal it replaces — but the add button no longer overhangs the bar, so the extra
                16px is honest breathing room rather than clearance for the raised FAB. */}
            <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(var(--nav-clear)_+_1rem)] md:pb-6">
              <AppShell>{children}</AppShell>
            </main>
            <BottomNav />
          </AuthProvider>
          </AppHostProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
