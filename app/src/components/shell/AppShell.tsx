"use client";

// W2 app shell — puts the navigation on the left ("sol tərəfdə menyular") for signed-in users on
// desktop. Deliberately conservative:
//   * mobile (< md) is untouched — BottomNav already covers it, so children render unchanged;
//   * signed-out visitors and the marketing/public routes get NO rail at all;
//   * while auth is still resolving nothing is rendered either, so the rail never flashes.
// It is mounted INSIDE the root layout's centred <main> container, so the rail is a sticky column
// in a flex row (never position:fixed) and can not overlap page content.
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AppRail from "@/components/shell/AppRail";

// Marketing / public surfaces. "/" is intentionally NOT here: signed-out visitors already get the
// bare tree (the landing page), while for a signed-in user "/" is the app home ("Bu gün") — which
// is the rail's own first destination, so the rail must survive navigating to it.
const PUBLIC_PATHS = ["/login", "/signup", "/pricing", "/solutions", "/s", "/invite"];

function stripLocale(path: string): string {
  const m = path.match(/^\/(en|tr|de)(\/.*)?$/);
  return m ? m[2] || "/" : path;
}

export function isPublicPath(pathname: string): boolean {
  const p = stripLocale(pathname || "/");
  return PUBLIC_PATHS.some((base) => p === base || p.startsWith(`${base}/`));
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "/";

  // Hooks above, branching below — never the other way round.
  if (loading || !user || isPublicPath(pathname)) return <>{children}</>;

  return (
    <div className="md:flex md:items-start md:gap-5">
      <AppRail />
      <div className="min-w-0 md:flex-1">{children}</div>
    </div>
  );
}
