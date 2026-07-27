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
// This header used to claim "85×80 slots" and the code did not have them. LEFT held two items and
// RIGHT one, each side wrapped in an equal `flex-1` group, so a group's share was split among ITS
// children and the real widths on a 375px screen were 72.75 / 72.75 / 76 / 145.5: "Daha çox" got a
// slot twice as wide as "Bu gün" and its icon sat at x≈298 (79% of the screen) rather than at the
// centre of a uniform slot, with the empty half of its own slot reading as a gap beside the +.
// Balancing the destinations 2 | + | 2 fixes the CENTRING; flattening the groups into one row of
// five identical children is what makes the SLOTS uniform — both were needed. The + is centred
// because it is the third of an ODD five; a sixth destination breaks that, which is the real
// constraint on adding one.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, Plus, LayoutGrid, Settings, type LucideIcon } from "lucide-react";
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
  // wrong tab (e.g. "/fields" against "/fields-something").
  const isActive = (href: string) => (href === "/" ? p === "/" : p === href || p.startsWith(`${href}/`));

  // Four destinations around the add-field button: Bu gün · Sahələr · [+] · Daha çox · Hesab.
  //
  // WHY /account IS THE FIFTH AND NOT /notifications. Both are one tap away inside /more, so the
  // question is which one earns a permanent slot. Notifications ALREADY has a second affordance on
  // this exact screen: Nav.tsx renders `{user && <NotificationBell />}` in its md:hidden block, so
  // on every mobile app screen the badge and its poller are visible in the top bar. A slot here
  // would duplicate a control the farmer can already see — and mean a second poller mounted on
  // every screen. /account has no mobile entry point at all except a row inside /more.
  //
  // Both halves of that were read, not assumed: components/Nav.tsx (the mobile bell) and
  // app/more/page.tsx (which lists /notifications AND /account, so nothing becomes unreachable).
  const LEFT = [
    { href: "/", label: t("bnav.today"), Icon: Home },
    { href: "/fields", label: t("bnav.fields"), Icon: Sprout },
  ];
  // Settings (not UserCog) so the icon matches AppRail's /account entry — the same destination
  // should not change glyph between the phone bar and the desktop rail. Reuses the rail's label key
  // rather than inventing a bnav.* twin that seven locale files would have to be taught.
  const RIGHT = [
    { href: "/more", label: t("bnav.more"), Icon: LayoutGrid },
    { href: "/account", label: t("app.shell.appRail.account"), Icon: Settings },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-slate-300 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("bnav.mainNav")}
    >
      {/* ONE flex row, five equal `flex-1` siblings — no group wrappers. Wrapping the sides in
          equal-weight groups is what made the slots unequal (a group's flex-1 share is split among
          ITS children, so the 1-item side got a double-width slot), and the + drifted off centre
          with it. As the third of five identical children the + is exactly centred. */}
      <div className="mx-auto flex max-w-lg items-stretch px-1">
        {LEFT.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
        {/* Add-field: it used to hang 20px ABOVE the bar (-mt-5) because a 56px circle did not fit a
            56px bar. An 80px bar holds it, so it is a normal full-height slot — the touch target is
            the whole ~73×80 slot, the 48px circle is only its icon treatment, and the bar no longer
            steals taps from the content above it. flex-1 like its neighbours, so it can never be
            the one odd width in the row. */}
        <Link
          href="/onboarding"
          aria-label={t("bnav.addField")}
          className="flex h-20 min-w-0 flex-1 select-none touch-manipulation flex-col items-center justify-center gap-1"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_4px_12px_rgba(21,128,61,0.30)]">
            <Plus className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="max-w-full truncate px-1 text-[12px] font-semibold leading-4 text-brand-dark">
            {t("bnav.add")}
          </span>
        </Link>
        {RIGHT.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>
    </nav>
  );
}
