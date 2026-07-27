"use client";

// W2 app shell — the left icon rail of the approved redesign (mockup: .rail / .rlogo / .ri).
// Teal column, rounded gradient logo tile, one 56x48 button per destination with a micro-label
// under the icon, mint-tinted active state. Desktop only: on mobile the app keeps BottomNav, so
// this component renders nothing below the md breakpoint.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  Home,
  LayoutGrid,
  Leaf,
  MessageCircle,
  Settings,
  ShoppingBag,
  Sprout,
  Tractor,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { SHOW_MARKETPLACE_NAV } from "@/lib/navFlags";

type RailItem = { href: string; label: string; Icon: LucideIcon };

// The locale path prefix (/en, /tr, /de) is rewritten away by middleware but the browser URL —
// and therefore usePathname() — still carries it. Strip it before matching. Links stay unprefixed
// because the locale cookie carries the choice (same convention as BottomNav).
function stripLocale(path: string): string {
  const m = path.match(/^\/(en|tr|de)(\/.*)?$/);
  return m ? m[2] || "/" : path;
}

export function isRailActive(pathname: string, href: string): boolean {
  const p = stripLocale(pathname || "/");
  if (href === "/") return p === "/";
  return p === href || p.startsWith(`${href}/`);
}

function RailLink({ item, active }: { item: RailItem; active: boolean }) {
  const { Icon, href, label } = item;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex h-12 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[13px] text-[10px] font-semibold leading-none transition-colors motion-reduce:transition-none ${
        active
          ? "bg-[rgba(141,224,169,0.16)] text-[#EAFFF2]"
          : "text-[#8FBBA7] hover:bg-white/[0.07] hover:text-[#D7ECE1]"
      }`}
    >
      <Icon
        className={`h-[21px] w-[21px] ${active ? "text-mint" : ""}`}
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="w-full truncate px-0.5 text-center">{label}</span>
    </Link>
  );
}

export default function AppRail() {
  const pathname = usePathname() || "/";

  // Every href below is an existing route under app/src/app/. Labels are read on each render (t() is
  // module-level state set by LocaleProvider) so a locale switch re-labels the rail.
  //
  // Five destinations, down from eleven. What moved and why:
  //   * Dəftər / Satış / Anbar / Texnika → the ONE "Təsərrüfat" entry (/farm), which renders them as
  //     ?tab= sections. Four of eleven rail slots for weekly bookkeeping was a disproportionate
  //     share of a rail the farmer reads on every visit;
  //   * Kataloq / İcma → hidden behind SHOW_MARKETPLACE_NAV until they have suppliers/messages;
  //   * Yerlər → /more, which already lists it.
  // Everything removed is still reachable: /farm for the four modules, /more for the rest.
  const PRIMARY: RailItem[] = [
    { href: "/", label: t("app.shell.appRail.today"), Icon: Home },
    { href: "/fields", label: t("app.shell.appRail.fields"), Icon: Sprout },
    ...(SHOW_MARKETPLACE_NAV
      ? [
          { href: "/catalog", label: t("app.shell.appRail.catalog"), Icon: ShoppingBag },
          { href: "/chat", label: t("app.shell.appRail.community"), Icon: MessageCircle },
        ]
      : []),
    { href: "/more", label: t("app.shell.appRail.more"), Icon: LayoutGrid },
  ];

  // Mockup keeps a flexible gap and then the utility group pinned to the bottom of the rail.
  const SECONDARY: RailItem[] = [
    { href: "/notifications", label: t("app.shell.appRail.notifications"), Icon: Bell },
    { href: "/account", label: t("app.shell.appRail.account"), Icon: Settings },
  ];

  return (
    // z-30 keeps the rail above full-bleed page content that paints itself with `fixed inset-0`
    // (the map-first field view does exactly that), so navigation never disappears under a map.
    <nav
      aria-label={t("app.shell.appRail.mainNav")}
      className="sticky top-[76px] z-30 hidden max-h-[calc(100vh_-_92px)] w-[78px] shrink-0 flex-col items-center gap-[3px] overflow-y-auto rounded-xl2 bg-teal px-2.5 py-3 shadow-soft md:flex"
    >
      <Link
        href="/"
        aria-label={`Agradex — ${t("app.shell.appRail.homeAria")}`}
        className="mb-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#08331F]"
        style={{ background: "linear-gradient(160deg, var(--mint), var(--green))" }}
      >
        <Leaf className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
      </Link>

      {PRIMARY.map((item) => (
        <RailLink key={item.href} item={item} active={isRailActive(pathname, item.href)} />
      ))}

      <span aria-hidden="true" className="min-h-[8px] w-full flex-1" />

      <span aria-hidden="true" className="my-1 h-px w-8 shrink-0 bg-white/10" />

      {SECONDARY.map((item) => (
        <RailLink key={item.href} item={item} active={isRailActive(pathname, item.href)} />
      ))}
    </nav>
  );
}
