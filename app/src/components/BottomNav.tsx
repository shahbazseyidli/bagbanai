"use client";

// D2.1 / W3 — mobile bottom navigation (replaces the hamburger for signed-in users). Follows the
// OneSoil geometry (docs/ONESOIL_DESIGN_SYSTEM.md §2.2): an 80dp bar, 24px icons, a 64×32 active
// indicator pill, and a label that is ALWAYS visible. Desktop keeps the top nav (Nav.tsx) and the
// left rail; this is md:hidden.
//
// SLOT GEOMETRY — measured off THIS markup, not copied from the reference. Five equal `flex-1`
// children of one `px-1` row, so on a 375px phone each slot is (375 − 8) / 5 = 73.4 × 80px; 62.4px
// wide at 320px, 100.8px at the max-w-lg (512px) cap. Every slot clears var(--tap) = 48px on both
// axes, and the border-box height stays 81.5px (h-20 + border-t-[1.5px]) = globals.css --nav-h.
//
// FIVE TRUE DESTINATIONS, NO CENTRE BUTTON — Xəritə · Sahələr · Hava · Qeydlər · Hesab, the same
// five tabs the measured teardown found (docs/ONESOIL_MOBILE_TEARDOWN.md §3: "Map · Fields ·
// Weather · Notes · Profile", and "Xəritə default tab-dır və evdir"). The bar used to be 2 | + | 2
// with a raised add-field cell in the middle; that cell is gone because OneSoil puts add-field on
// the MAP as a 48×48 control (teardown §2, `add_field_button`), which is where components/home/
// MapHome.tsx now renders it, and /fields keeps its own add button. "Bu gün" also leaves the bar:
// on a phone the map IS the home, and the dashboard it named is a desktop layout.
//
// The geometry argument that survives all of that: the slots are uniform ONLY because this is one
// flat row of five identical `flex-1` children. Wrapping any of them in a group splits that group's
// share among ITS children and one slot silently becomes double-width — the bug this markup was
// flattened to fix. A SIXTH destination breaks the 5×flex-1 uniformity and the ~73px label budget
// with it, so the real constraint on adding one is width, not taste.
//
// /more lost its slot to /weather and /notes. It is NOT unreachable: app/account/page.tsx carries a
// labelled row to it (grep `more.title` there), and the desktop rail still lists it. Losing that
// route would strand Kataloq, İcma, Bələdçi, Qiymətlər and Komanda on a phone.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map as MapIcon, Sprout, CloudSun, NotebookPen, Settings, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsAppHost } from "@/lib/host";
import { t } from "@/lib/i18n";
import { stripLocale } from "@/lib/stripLocale";

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      // h-20 = the measured 80dp slot, and the WHOLE slot is the touch target — not just the icon.
      // select-none / touch-manipulation kill long-press text selection and the ~300ms double-tap
      // zoom delay on the most-tapped control in the product. min-w-0 because a flex item defaults
      // to min-width:auto: without it the label's nowrap min-content width (the German and Russian
      // ones are the long ones) sets a floor on the slot and widens the bar past the viewport,
      // which truncate alone cannot prevent.
      className={`flex h-20 min-w-0 flex-1 select-none touch-manipulation flex-col items-center justify-center gap-1 ${
        active ? "text-brand-dark" : "text-ink-soft"
      }`}
    >
      {/* 64×32 active indicator, measured off OneSoil (Material 3 pill). max-w-full so a 320px
          screen clamps it instead of pushing the bar wider than the viewport. */}
      <span
        className={`flex h-8 w-16 max-w-full items-center justify-center rounded-full transition-colors motion-reduce:transition-none ${
          active ? "bg-brand-light" : ""
        }`}
      >
        <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.8} aria-hidden="true" />
      </span>
      <span className="max-w-full truncate px-1 text-[12px] font-semibold leading-4">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const appHost = useIsAppHost();
  const pathname = usePathname();
  // No app chrome on the apex marketing host (agradex.com) — only on app.agradex.com.
  if (!user || !appHost) return null;

  const p = stripLocale(pathname || "/");
  // Match on a path SEGMENT boundary, not a raw prefix: a plain startsWith would light up the
  // wrong tab (e.g. "/fields" against "/fields-something"). "/" stays an exact match so the map tab
  // does not stay lit on every other screen.
  const isActive = (href: string) => (href === "/" ? p === "/" : p === href || p.startsWith(`${href}/`));

  // WHY /account IS THE FIFTH AND NOT /notifications. Both are one tap away inside /more, so the
  // question is which one earns a permanent slot. Notifications ALREADY has a second affordance on
  // this exact screen: Nav.tsx renders `{user && <NotificationBell />}` in its md:hidden block, so
  // on every mobile app screen the badge and its poller are visible in the top bar. A slot here
  // would duplicate a control the farmer can already see — and mean a second poller mounted on
  // every screen. /account has no other mobile entry point, and it is now also the door to /more.
  //
  // Settings (not UserCog) so the icon matches AppRail's /account entry — the same destination
  // should not change glyph between the phone bar and the desktop rail. It reuses the rail's label
  // key rather than inventing a bnav.* twin that eight dictionaries would have to be taught.
  const ITEMS = [
    { href: "/", label: t("bnav.map"), Icon: MapIcon },
    { href: "/fields", label: t("bnav.fields"), Icon: Sprout },
    { href: "/weather", label: t("bnav.weather"), Icon: CloudSun },
    { href: "/notes", label: t("bnav.notes"), Icon: NotebookPen },
    { href: "/account", label: t("app.shell.appRail.account"), Icon: Settings },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-slate-300 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("bnav.mainNav")}
    >
      {/* ONE flex row, five equal `flex-1` siblings — no group wrappers, no odd child. */}
      <div className="mx-auto flex max-w-lg items-stretch px-1">
        {ITEMS.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>
    </nav>
  );
}
