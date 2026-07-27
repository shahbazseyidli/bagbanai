"use client";

// W2 app shell — the left icon rail of the approved redesign (mockup: .rail / .rlogo / .ri).
// Teal column, rounded gradient logo tile, one 56x48 button per destination with a micro-label
// under the icon, mint-tinted active state. Desktop only: on mobile the app keeps BottomNav, so
// this component renders nothing below the md breakpoint.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  LayoutGrid,
  Leaf,
  MessageCircle,
  Settings,
  ShoppingBag,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { SHOW_MARKETPLACE_NAV } from "@/lib/navFlags";
import { stripLocale } from "@/lib/stripLocale";

type RailItem = { href: string; label: string; Icon: LucideIcon };

// stripLocale used to be DEFINED here, and the comment above it claimed "one helper now, so locale
// nine cannot repeat it" — while BottomNav kept a second, differently-built copy. It now lives in
// lib/stripLocale.ts, which is where a path helper belongs. Re-exported only because
// FieldListPanel still imports it from this module; when that import moves to "@/lib/stripLocale"
// this line can go, and nothing else in src/ reads it from here.
export { stripLocale };

// Every href below is unprefixed — the locale cookie carries the language, so links never gain a
// /ru; only the pathname we MATCH against has to be stripped (same convention as BottomNav).
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

  // Every href below is an existing route under app/src/app/ — verified, not assumed. Labels are
  // read on each render (t() is module-level state set by LocaleProvider) so a locale switch
  // re-labels the rail.
  //
  // FIVE destinations, and the list below IS all five: Bu gün (/) · Sahələr (/fields) ·
  // Daha çox (/more) in PRIMARY, then Bildirişlər (/notifications) · Hesab (/account) pinned to the
  // bottom in SECONDARY. The rail is deliberately this short: the product is satellite imagery, AI
  // analysis, weather, scouting and the field record, and all of that hangs off /fields.
  //
  // This comment used to describe eleven destinations collapsing into a "Təsərrüfat" entry at
  // /farm. That entry is GONE — the ERP strip deleted the route (there is no app/farm/page.tsx) and
  // the four bookkeeping modules with it, so pointing a reader at /farm sent them looking for a
  // 404. Do not restore the sentence without restoring the route.
  //
  // Kataloq / İcma are the only conditional entries: built and routable, hidden behind
  // SHOW_MARKETPLACE_NAV until they have suppliers/messages (see lib/navFlags.ts).
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
    // z-30 keeps the rail above ordinary page content — a MapLibre canvas and its controls create
    // their own stacking contexts, and without it the rail could be painted over by whatever sits
    // next to it. It matches FieldListPanel's z-30 so the two never fight.
    //
    // It is NOT a defence against the fullscreen overlays, and must not be raised to try: both of
    // them (FieldMapCard's ?map=full and the layer bottom sheet) portal to document.body at z-50 /
    // z-60 and are SUPPOSED to cover the rail. The earlier claim here — that the map-first field
    // view paints `fixed inset-0` under the rail — is not what FieldMapSheet does; its only fixed
    // element is the md:hidden camera FAB, which never coexists with this md:flex rail.
    //
    // W1 deliberately left the rail's own geometry alone: it is still a 78px sticky rounded column
    // that starts under the top bar. Flushing it to the window edge full-height with square corners
    // (the Terra Oracle read) is a real option, but top-[76px] and max-h-[calc(100vh-92px)] both
    // encode components/Nav.tsx's height — so it is a W2 visual decision that has to move Nav too,
    // not a W1 layout one. The shell around the rail now widens with the window; the rail does not
    // need to change for that, because it is shrink-0 and the stage takes every extra pixel.
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
