"use client";

// W2 app shell — the left icon rail of the approved redesign (mockup: .rail / .rlogo / .ri).
// Teal column, rounded gradient logo tile, one 56x48 button per destination with a micro-label
// under the icon, mint-tinted active state. Desktop only: on mobile the app keeps BottomNav, so
// this component renders nothing below the md breakpoint.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Bell,
  BookOpen,
  FileText,
  Home,
  LayoutGrid,
  Leaf,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  Sprout,
  Tractor,
  type LucideIcon,
} from "lucide-react";

type RailItem = { href: string; label: string; Icon: LucideIcon };

// Every href below is an existing route under app/src/app/.
const PRIMARY: RailItem[] = [
  { href: "/", label: "Bu gün", Icon: Home },
  { href: "/fields", label: "Sahələr", Icon: Sprout },
  { href: "/ledger", label: "Dəftər", Icon: BookOpen },
  { href: "/sales", label: "Satış", Icon: Banknote },
  { href: "/inventory", label: "Anbar", Icon: Package },
  { href: "/equipment", label: "Texnika", Icon: Tractor },
  { href: "/reports", label: "Hesabat", Icon: FileText },
  { href: "/places", label: "Yerlər", Icon: MapPin },
  { href: "/catalog", label: "Kataloq", Icon: ShoppingBag },
  { href: "/chat", label: "İcma", Icon: MessageCircle },
  { href: "/more", label: "Daha çox", Icon: LayoutGrid },
];

// Mockup keeps a flexible gap and then the utility group pinned to the bottom of the rail.
const SECONDARY: RailItem[] = [
  { href: "/notifications", label: "Bildiriş", Icon: Bell },
  { href: "/account", label: "Hesab", Icon: Settings },
];

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

  return (
    // z-30 keeps the rail above full-bleed page content that paints itself with `fixed inset-0`
    // (the map-first field view does exactly that), so navigation never disappears under a map.
    <nav
      aria-label="Əsas naviqasiya"
      className="sticky top-[76px] z-30 hidden max-h-[calc(100vh_-_92px)] w-[78px] shrink-0 flex-col items-center gap-[3px] overflow-y-auto rounded-xl2 bg-teal px-2.5 py-3 shadow-soft md:flex"
    >
      <Link
        href="/"
        aria-label="Bağban AI — ana səhifə"
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
