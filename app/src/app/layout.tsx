import type { Metadata, Viewport } from "next";
import { Inter, Geologica } from "next/font/google";
import { headers, cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";
import PwaRegister from "@/components/PwaRegister";
import OfflineIndicator from "@/components/OfflineIndicator";
import LocaleProvider from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

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

export const metadata: Metadata = {
  title: "Bağban AI",
  description:
    "Peyk, hava və süni intellekt ilə Azərbaycan fermerləri üçün məhsul monitorinqi platforması.",
  appleWebApp: { capable: true, title: "Bağban", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale resolved by middleware (prefix → x-locale header; else the cookie). SSR + client match.
  const [h, c] = await Promise.all([headers(), cookies()]);
  const locale = ((h.get("x-locale") || c.get("bagban_locale")?.value || "az")) as Locale;
  return (
    <html lang={locale} className={`${inter.variable} ${geologica.variable}`}>
      <body className="font-sans text-ink antialiased">
        <LocaleProvider initialLocale={locale}>
          <AuthProvider>
            <PwaRegister />
            <OfflineIndicator />
            <Nav />
            <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
            <BottomNav />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
