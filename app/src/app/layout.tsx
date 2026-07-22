import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import PwaRegister from "@/components/PwaRegister";

// D1.2 — Inter Variable, self-hosted by Next; latin-ext covers Azerbaijani ə/ğ/ı/İ/ş/ç/ö/ü.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Bağban AI",
  description:
    "Peyk, hava və süni intellekt ilə Azərbaycan fermerləri üçün məhsul monitorinqi platforması.",
  appleWebApp: { capable: true, title: "Bağban", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="az" className={inter.variable}>
      <body className="font-sans text-ink antialiased">
        <AuthProvider>
          <PwaRegister />
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
