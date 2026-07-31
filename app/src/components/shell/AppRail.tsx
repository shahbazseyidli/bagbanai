"use client";

// THE LEFT SIDEBAR — full window height, flush to the window's left edge, square corners.
//
// It replaces the 78px rounded floating rail this file used to export. The rail was
// `sticky top-[76px] max-h-[calc(100vh-92px)] w-[78px] rounded-xl2 bg-teal`, and both of those magic
// numbers encoded components/Nav.tsx's height: a column that starts BELOW the top bar has to know
// how tall the top bar is. A column that runs the FULL height of the window does not, so the
// coupling is deleted rather than carried — Nav.tsx can change height without touching this file.
//
// WHY position:fixed AND WHY IT IS SAFE HERE. AppShell is mounted inside app/layout.tsx's
// `<main class="mx-auto max-w-6xl px-4 py-6">`, and layout.tsx is not ours to restructure, so a
// body-level flex row [sidebar | content] is unreachable. `position: fixed` is the only mechanism
// that reaches the window's top-left corner from in there. It works because nothing between <body>
// and this element carries transform / filter / backdrop-filter / contain / perspective /
// will-change — each of those would make an ancestor the containing block and inset this sidebar
// into the content column instead of the window. AppShell's own comment block forbids exactly that
// list for the same reason, and two existing `fixed` descendants of the same subtree (grep
// `fixed inset-0 z-50` in app/admin/page.tsx, `fixed inset-x-0 bottom-` in app/fields/[id]/page.tsx)
// are the standing proof that it holds today.
//
// z-40 is deliberate and paired with Nav's z-30: the sidebar paints OVER the top bar's left strip,
// which is what makes the bar read as spanning only the content area (the reference shape). It is
// not a defence against the full-window overlays and must not be raised to become one — FieldMapCard's
// ?map=full, the layer bottom sheet and the admin modal are all z-50/z-60 (two of them portalled to
// document.body) and are SUPPOSED to cover the sidebar.
//
// MOBILE IS UNTOUCHED: this is `hidden md:flex`, BottomNav is `md:hidden`, so the two never coexist
// and the phone renders exactly what it rendered before.
import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CloudSun,
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

// ── Collapse state ──────────────────────────────────────────────────────────────────────────────
// THREE files have to agree on one number (the sidebar's width): this one draws it, AppShell insets
// the content by it, Nav insets the top bar by it. Nav is a SIBLING of AppShell in layout.tsx, so
// there is no common provider we own to hang React state on — hence a module-level external store,
// read through useSyncExternalStore.
//
// The server snapshot and the first client snapshot are both `false` (expanded) and localStorage is
// adopted in an effect afterwards. That is the same deliberate one-frame pattern the old field-list
// panel used: reading localStorage during render would throw on the server and risk a hydration
// mismatch, so a single un-persisted frame is the honest cost.
const COLLAPSE_KEY = "bagban_sidebar_collapsed"; // "bagban_" — the convention every other pref uses

let collapsedState = false;
let adopted = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Must return a STABLE value for an unchanged store — a boolean read from a module variable is.
function getSnapshot(): boolean {
  return collapsedState;
}

function getServerSnapshot(): boolean {
  return false;
}

/** Collapse/expand the sidebar. Persisted, so the choice survives navigation and reload. */
export function setSidebarCollapsed(next: boolean): void {
  if (collapsedState === next) return;
  collapsedState = next;
  try {
    localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  } catch {
    /* private mode / storage disabled — the toggle still works for this session */
  }
  emit();
}

/** Read the collapsed flag. Safe in any of the three files; they all see the same value. */
export function useSidebarCollapsed(): boolean {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Runs in every consumer but does work only once (`adopted`); the emit reaches all of them,
  // including a consumer whose useSyncExternalStore has not subscribed yet — React re-checks the
  // snapshot when it subscribes, so nobody is left on the stale value.
  useEffect(() => {
    if (adopted) return;
    adopted = true;
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") {
        collapsedState = true;
        emit();
      }
    } catch {
      /* stay expanded */
    }
  }, []);
  return collapsed;
}

// ── Geometry ────────────────────────────────────────────────────────────────────────────────────
// WHOLE class literals, selected by ternary — never assembled from fragments, because Tailwind's
// scanner only sees complete class names in the source text.
//
// WHY THE LABELLED 256px STATE IS 2xl-GATED AND NOT md — and why NOT xl either.
//
// Two surfaces measure the stage they are given (grep `useStageWidth` in
// components/home/TodayHome.tsx and app/fields/[id]/page.tsx) and switch layout at 760px. At a
// 1024px window a 256px sidebar would leave a 728px stage — under that threshold — so a 1024 laptop
// would silently drop to the narrow single-column layout.
//
// xl (1280) is ALSO wrong, and this was measured rather than guessed: FieldListPanel appears at
// exactly the same breakpoint (grep `xl:flex` there), and it takes 224px plus a 20px gap. Widening
// the sidebar on that same step meant a 1280px window paid for BOTH at once —
// 1280 − 256 − 40 − 244 = 740px — putting the field page under WORKBENCH_MIN and losing the
// workbench for the whole 1280–1299 band, which it has today at 778px. At 2xl the two steps are on
// different breakpoints: 1280 keeps a 72px sidebar (924px stage) and 1536 can afford the labels
// (996px stage). The panel's gate must NOT move instead — its `xl:flex` is paired with the field
// page's `xl:hidden` chip row, and separating them leaves a width band with no section navigation.
// Keep this in lockstep with SIDEBAR_INSET_OPEN in AppShell.
const SIDEBAR_EXPANDED = "w-[72px] 2xl:w-64";
const SIDEBAR_COLLAPSED = "w-[72px]";

const SIDEBAR_BASE =
  "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-panel pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] md:flex";

// min-h-[var(--tap)] rather than the reference's 44px row: this codebase has a hard 48px touch floor
// (--tap in globals.css) and the last shipped commit was about enforcing it on the controls that had
// missed it. A desktop-only control is still a control.
const ROW_COMPACT =
  "flex min-h-[var(--tap)] w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[13px] px-1 text-[10px] font-semibold leading-none transition-colors motion-reduce:transition-none";
const ROW_EXPANDED =
  "flex min-h-[var(--tap)] w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[13px] px-1 text-[10px] font-semibold leading-none transition-colors motion-reduce:transition-none xl:w-full xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-[13.5px] xl:leading-5";

// The active vocabulary is FieldSectionMenu's, verbatim (grep `bg-mint-soft text-grass-deep` in
// components/shell/FieldSectionMenu.tsx) — the two menus sit side by side on a field page and an
// "active row" must not mean two different colours 224px apart.
const ROW_ACTIVE = "bg-mint-soft text-grass-deep";
const ROW_IDLE = "text-ink-soft hover:bg-paper-2 hover:text-ink";

// TWO LINES, not one truncated one. The collapsed rail is 56px wide, which fits the Azerbaijani
// labels and clips almost every other language: Russian rendered "Сообщ…" and "Уведо…", Hungarian
// "Kataló…" and "Közös…". Wrapping costs nothing — the row is already min-h-[var(--tap)] and an
// icon plus two 10px lines fits inside it — and it keeps overflow:hidden, which is what let the
// label shrink inside the flex row in the first place. The title attribute still carries the full
// name for the rare word that needs three lines.
const LABEL_COMPACT = "w-full line-clamp-2 px-0.5 text-center leading-[1.15]";
// xl:w-auto matters: at xl the row is a flex ROW, and a `width:100%` label beside the icon would
// only fit by shrinking — which works (the clamp's overflow:hidden zeroes the automatic minimum)
// but reads as an accident. Auto width is what the layout actually wants there, and at that size
// the label is on one line anyway.
const LABEL_EXPANDED = "w-full line-clamp-2 px-0.5 text-center leading-[1.15] xl:w-auto xl:truncate xl:px-0 xl:text-left xl:leading-5";

const LIST_COMPACT = "flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-3";
const LIST_EXPANDED =
  "flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-3 xl:items-stretch xl:px-3";

const FOOT_COMPACT = "flex shrink-0 flex-col items-center gap-1 border-t border-line px-2 py-3";
const FOOT_EXPANDED =
  "flex shrink-0 flex-col items-center gap-1 border-t border-line px-2 py-3 xl:items-stretch xl:px-3";

// The wordmark band is 73px so its hairline lands on the top bar's: Nav's aligned bar is a
// 48px control (--tap) inside py-3, plus its 1px border-b. Measured off that markup, not guessed.
const BRAND_COMPACT =
  "flex h-[73px] shrink-0 items-center justify-center gap-2.5 border-b border-line px-2";
const BRAND_EXPANDED =
  "flex h-[73px] shrink-0 items-center justify-center gap-2.5 border-b border-line px-2 xl:justify-start xl:px-4";

// Every href below is unprefixed — the locale cookie carries the language, so links never gain a
// /ru; only the pathname we MATCH against has to be stripped (same convention as BottomNav).
export function isRailActive(pathname: string, href: string): boolean {
  const p = stripLocale(pathname || "/");
  if (href === "/") return p === "/";
  return p === href || p.startsWith(`${href}/`);
}

function SidebarLink({
  item,
  active,
  expanded,
}: {
  item: RailItem;
  active: boolean;
  expanded: boolean;
}) {
  const { Icon, href, label } = item;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      // Still a title: below xl (and whenever collapsed) the label is a 10px micro-caption that
      // truncates, so the hover text is the only full name available.
      title={label}
      className={`${expanded ? ROW_EXPANDED : ROW_COMPACT} ${active ? ROW_ACTIVE : ROW_IDLE}`}
    >
      <Icon
        className="h-[21px] w-[21px] shrink-0"
        strokeWidth={active ? 2 : 1.8}
        aria-hidden="true"
      />
      <span className={expanded ? LABEL_EXPANDED : LABEL_COMPACT}>{label}</span>
    </Link>
  );
}

export default function AppRail() {
  const pathname = usePathname() || "/";
  const collapsed = useSidebarCollapsed();
  const expanded = !collapsed;

  // Every href below is an existing route under app/src/app/ — verified against the directory, not
  // assumed. Labels are read on each render (t() is module-level state set by LocaleProvider) so a
  // locale switch re-labels the sidebar.
  //
  // FIVE primary destinations: Bu gün (/) · Sahələr (/fields) · Kataloq (/catalog) · İcma (/chat) ·
  // Daha çox (/more), then Bildirişlər (/notifications) · Hesab (/account) pinned to the bottom.
  //
  // Kataloq / İcma stay behind SHOW_MARKETPLACE_NAV rather than being inlined: the flag is the
  // record of WHY they can be hidden again (both are built and routable but sparse), and inlining
  // them would delete that record. It is `true` as of 2026-07-27 — see lib/navFlags.ts.
  const PRIMARY: RailItem[] = [
    { href: "/", label: t("app.shell.appRail.today"), Icon: Home },
    { href: "/fields", label: t("app.shell.appRail.fields"), Icon: Sprout },
    // /weather is a bottom-nav destination on the phone AND has a purpose-built two-column desktop
    // layout (grep twoCol in components/weather/WeatherScreen.tsx). Without a rail entry that
    // layout was reachable only by typing the URL. Same key the bottom bar uses, so the two bars
    // cannot end up calling one destination two different things.
    { href: "/weather", label: t("bnav.weather"), Icon: CloudSun },
    ...(SHOW_MARKETPLACE_NAV
      ? [
          { href: "/catalog", label: t("app.shell.appRail.catalog"), Icon: ShoppingBag },
          { href: "/chat", label: t("app.shell.appRail.community"), Icon: MessageCircle },
        ]
      : []),
    { href: "/more", label: t("app.shell.appRail.more"), Icon: LayoutGrid },
  ];

  // Utility group, pinned to the bottom of the sidebar above the safe-area inset.
  const SECONDARY: RailItem[] = [
    { href: "/notifications", label: t("app.shell.appRail.notifications"), Icon: Bell },
    { href: "/account", label: t("app.shell.appRail.account"), Icon: Settings },
  ];

  return (
    <nav
      aria-label={t("app.shell.appRail.mainNav")}
      className={`${SIDEBAR_BASE} ${expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED}`}
    >
      <div className={expanded ? BRAND_EXPANDED : BRAND_COMPACT}>
        <Link
          href="/"
          aria-label={`Agradex — ${t("app.shell.appRail.homeAria")}`}
          className="flex items-center gap-2.5 text-ink"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#08331F]"
            style={{ background: "linear-gradient(160deg, var(--mint), var(--green))" }}
          >
            <Leaf className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
          </span>
          {/* The wordmark only fits the 256px state; at 72px the tile alone is the brand. */}
          {expanded && (
            <span className="hidden font-display text-[19px] font-bold tracking-tight xl:inline">
              {t("brand")}
            </span>
          )}
        </Link>
      </div>

      {/* min-h-0 is load-bearing on a flex child that scrolls: without it the list keeps its
          automatic content minimum and pushes the pinned group off the bottom of the window. */}
      <div className={expanded ? LIST_EXPANDED : LIST_COMPACT}>
        {PRIMARY.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isRailActive(pathname, item.href)}
            expanded={expanded}
          />
        ))}
      </div>

      <div className={expanded ? FOOT_EXPANDED : FOOT_COMPACT}>
        {SECONDARY.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isRailActive(pathname, item.href)}
            expanded={expanded}
          />
        ))}
      </div>
    </nav>
  );
}
