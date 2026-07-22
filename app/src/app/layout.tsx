import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import PwaRegister from "@/components/PwaRegister";

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
    <html lang="az">
      <body>
        <AuthProvider>
          <PwaRegister />
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
