"use client";

// W2 app shell — puts the navigation on the left ("sol tərəfdə menyular") for signed-in users on
// desktop. Deliberately conservative:
//   * mobile (< md) is untouched — BottomNav already covers it, so children render unchanged;
//   * signed-out visitors and the marketing/public routes get NO rail at all;
//   * while auth is still resolving nothing is rendered either, so the rail never flashes.
// It is mounted INSIDE the root layout's centred <main> container, so the rail is a sticky column
// in a flex row (never position:fixed) and can not overlap page content.
//
// MOCK-app-shell-3col — on wide screens the shell becomes the mockup's three columns
// (78px rail · 336px field list · stage). See FIELD_LIST_XL below for the width bookkeeping.
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AppRail from "@/components/shell/AppRail";
import FieldListPanel from "@/components/shell/FieldListPanel";

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

// Routes where a list of the farmer's fields is contextually useful: the app home ("Bu gün"), the
// field list itself and an open field. Everywhere else (ledger, sales, catalog, account, …) the
// shell stays exactly as it shipped — rail + content.
export function showsFieldList(pathname: string): boolean {
  const p = stripLocale(pathname || "/");
  return p === "/" || p === "/fields" || p.startsWith("/fields/");
}

// Width bookkeeping for the third column. AppShell lives inside
// `<main class="mx-auto max-w-6xl px-4">` → at most 1152px outer / 1120px of content. Rail (78) +
// gap (20) + list (336) + gap (20) = 454px of chrome, which would leave the stage only ~666px on
// a laptop. So on xl+ the shell takes a CONTROLLED full-bleed step outside the container:
//
//   * a media query only matches when the viewport EXCLUDING the scrollbar is ≥ the breakpoint,
//     so `xl:` ⇒ documentElement.clientWidth ≥ 1280 ⇒ each side margin of the 1152px container is
//     ≥ (1280-1152)/2 = 64px. -mx-14 (56px) spends 40px of that (16px is main's own padding) and
//     keeps 8px of slack → the body can never scroll sideways;
//   * `2xl:` ⇒ ≥1536 ⇒ ≥192px per side, of which -mx-44 (176px) spends 160px.
//
// Result: 1232px of shell at xl (stage ≈778px) and 1472px at 2xl (stage ≈1018px), with zero
// change below xl where the panel is hidden anyway.
const FIELD_LIST_XL = "xl:-mx-14 2xl:-mx-44";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "/";

  // Hooks above, branching below — never the other way round.
  if (loading || !user || isPublicPath(pathname)) return <>{children}</>;

  const withList = showsFieldList(pathname);

  return (
    <div className={`md:flex md:items-start md:gap-5 ${withList ? FIELD_LIST_XL : ""}`}>
      <AppRail />
      {withList && <FieldListPanel />}
      <div className="min-w-0 md:flex-1">{children}</div>
    </div>
  );
}
