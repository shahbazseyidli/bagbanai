"use client";

// D2.1 — mobile bottom navigation (replaces the hamburger for signed-in users). Labels always
// visible, thumb-reachable, raised "+" FAB in the centre for the most common action (add a field).
// Desktop keeps the top nav (Nav.tsx); this is md:hidden.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, Plus, Tractor, LayoutGrid } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsAppHost } from "@/lib/host";
import { t } from "@/lib/i18n";

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: typeof Home; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
        active ? "text-emerald-700" : "text-slate-500"
      }`}
    >
      <span className={`flex h-7 items-center rounded-full px-3 ${active ? "bg-emerald-50" : ""}`}>
        <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
      </span>
      {label}
    </Link>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const appHost = useIsAppHost();
  const pathname = usePathname();
  // No app chrome on the apex marketing host (agradex.com) — only on app.agradex.com.
  if (!user || !appHost) return null;
  // Match on a path SEGMENT boundary, not a raw prefix: "/farms" (the farms screen) starts with
  // "/farm" (the farm-modules container) and a plain startsWith would light up the wrong tab.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  // Four slots plus the FAB, mirroring the desktop rail: Bu gün · Sahələr · [+] · Təsərrüfat ·
  // Daha çox. "Təsərrüfat" (/farm) is the container for Dəftər/Satış/Anbar/Texnika, which used to
  // be four separate destinations. It takes the slot Bildirişlər had: the top Nav already renders
  // NotificationBell on mobile, so notifications stayed one tap away on every screen, while the
  // farm books had no entry point here at all.
  const LEFT = [
    { href: "/", label: t("bnav.today"), Icon: Home },
    { href: "/fields", label: t("bnav.fields"), Icon: Sprout },
  ];
  const RIGHT = [
    { href: "/farm", label: t("bnav.farm"), Icon: Tractor },
    { href: "/more", label: t("bnav.more"), Icon: LayoutGrid },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-slate-300 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("bnav.mainNav")}
    >
      <div className="mx-auto flex max-w-lg items-center px-1">
        {LEFT.map((it) => <NavItem key={it.href} {...it} active={isActive(it.href)} />)}
        <Link
          href="/onboarding"
          aria-label={t("bnav.addField")}
          className="mx-1 -mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg"
        >
          <Plus className="h-7 w-7" aria-hidden="true" />
        </Link>
        {RIGHT.map((it) => <NavItem key={it.href} {...it} active={isActive(it.href)} />)}
      </div>
    </nav>
  );
}
