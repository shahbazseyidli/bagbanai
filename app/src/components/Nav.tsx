"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APEX_HOST, PANEL_HOST, useIsAppHost } from "@/lib/host";
import { t, type I18nKey } from "@/lib/i18n";
import { stripLocale } from "@/lib/stripLocale";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  SHELL_BLEED,
  SHELL_TRACK,
  SIDEBAR_INSET_COLLAPSED,
  SIDEBAR_INSET_OPEN,
  isPublicPath,
} from "@/components/shell/AppShell";
import { setSidebarCollapsed, useSidebarCollapsed } from "@/components/shell/AppRail";

// Phase 2 host split: when app.agradex.com is the app host, the brand/logo points at the marketing
// apex (so "clicking home takes me to agradex.com"), and signed-in users get a "Panelə keç" link
// into the app host. Empty until NEXT_PUBLIC_PANEL_HOST is set → logo is the normal "/".
const HOME_HREF = APEX_HOST ? `https://${APEX_HOST}/` : "/";
const APP_HREF = PANEL_HOST ? `https://${PANEL_HOST}/` : "/";
// The guide is a marketing-apex route: middleware redirects /guide off the app host, so linking to
// a bare "/guide" from in here would cost the reader a redirect hop. Built from the module constant
// rather than publicUrl() on purpose — publicUrl falls back to window.location, which differs
// between the server and the first client render and would make this href a hydration mismatch.
const HELP_HREF = APEX_HOST ? `https://${APEX_HOST}/guide` : "/guide";

// ── PAGE TITLE ──────────────────────────────────────────────────────────────────────────────────
// The reference top bar names the page in bold beside the sidebar toggle. The title has to come
// from the ROUTE, and every entry below reuses an EXISTING key — a destination that already has a
// name in eight dictionaries. Nothing here invents a label, and an unknown route gets NO title at
// all rather than a guessed one.
//
// Rendered as a <span>: pages own their own <h1>, and a second one up here would give every app
// screen two competing document headings.
const TITLE_BASES: ReadonlyArray<readonly [string, I18nKey]> = [
  ["/fields", "app.shell.appRail.fields"],
  ["/catalog", "app.catalog.title"],
  ["/chat", "app.chat.heading"],
  ["/more", "more.title"],
  ["/notifications", "app.notifications.heading"],
  ["/account", "app.account.title"],
  ["/team", "team.title"],
  ["/admin", "app.admin.title"],
  ["/provider", "app.provider.title"],
  ["/onboarding", "bnav.addField"],
];

function pageTitleKey(pathname: string): I18nKey | null {
  const p = stripLocale(pathname || "/");
  if (p === "/") return "app.shell.appRail.today";
  // The add-field wizard also lives under a farm; it is the same destination as /onboarding.
  if (p.startsWith("/farms/") && p.endsWith("/fields/new")) return "bnav.addField";
  for (const [base, key] of TITLE_BASES) {
    if (p === base || p.startsWith(`${base}/`)) return key;
  }
  return null;
}

// ── ACCOUNT MENU ────────────────────────────────────────────────────────────────────────────────
// The reference bar ends in a round avatar. The two controls the bar loses by adopting that shape —
// the email readout and Logout — move in here, so nothing becomes unreachable.
function AccountMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Same outside-click dismissal NotificationBell uses, so the two dropdowns behave identically.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initial = (email.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("app.shell.topbar.accountMenu")}
        aria-expanded={open}
        title={email}
        className="inline-flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-full text-slate-600 hover:bg-emerald-50"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          {initial}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="truncate border-b border-slate-100 px-4 py-2.5 text-sm text-slate-500" title={email}>
            {email}
          </p>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex min-h-[var(--tap)] items-center px-4 text-sm font-medium text-slate-700 hover:bg-emerald-50"
          >
            {t("app.account.title")}
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex min-h-[var(--tap)] w-full items-center px-4 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50"
          >
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const appHost = useIsAppHost();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  // The desktop left sidebar (AppShell/AppRail) owns app navigation, and /more carries Team/Admin,
  // so repeating those up here only crowded the bar until it wrapped. Signed IN on the app host: the
  // top bar is the page title plus account controls. Signed OUT / on the marketing apex: the
  // marketing links. The mobile drawer (signed-out only) and BottomNav (signed-in) are unchanged.
  const marketingLinks = [
    { href: "/solutions", label: t("nav.solutions") },
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/blog", label: t("nav.blog") },
  ];
  // While auth is still resolving (and we have no cached user) we don't yet know whether to show the
  // signed-in account controls, so we hold those back instead of flashing signed-out chrome.
  const resolved = !loading || !!user;
  // The marketing links belong to the MARKETING APEX and stay there whether or not the visitor is
  // signed in — hiding them for signed-in users left agradex.com with a bare logo bar and no way to
  // reach Solutions / How it works / Pricing. On the APP host the sidebar + /more own navigation,
  // so the top bar there is account controls only.
  const links = appHost ? [] : marketingLinks;
  // "Panelə keç" only belongs on the marketing apex — never on the app host itself.
  const showToApp = !!user && !!PANEL_HOST && !appHost;

  // ── Alignment with the shell ──────────────────────────────────────────────────────────────────
  // AppShell exports SHELL_BLEED / SHELL_TRACK / the sidebar inset so the header and the content can
  // share one left edge. Skipping them shipped a visible defect once already: the shell went
  // full-bleed and the header did not, so at 1920 the rail started at x≈24 while this logo was still
  // centred in a 1152px container at x≈400 — two horizontal rules, 376px apart, reading as two
  // products.
  //
  // GATED ON EXACTLY AppShell's OWN CONDITIONS (app host · signed in · not a public path), because
  // the same header also renders on the MARKETING APEX, where AppShell early-returns and content
  // keeps layout.tsx's centred `max-w-6xl` reading container. Full-bleeding the header there would
  // orphan it in the other direction. Marketing is byte-for-byte unchanged: `aligned` is false for
  // every apex request, and false on the app host until auth resolves — the same frame in which the
  // sidebar itself appears, so the two move together rather than one jumping ahead of the other.
  const aligned = appHost && !!user && !isPublicPath(pathname);
  const titleKey = aligned ? pageTitleKey(pathname) : null;

  // `mx-auto max-w-6xl md:max-w-none` is NOT belt-and-braces. SHELL_BLEED is md-gated, so below md
  // the shell has no bleed and is bounded by layout.tsx's `<main class="mx-auto max-w-6xl px-4">`.
  // The header is NOT inside that main — its parent is the full-width <header> — so SHELL_TRACK's
  // `max-w-[2200px]` alone would let the bar span the whole window while the content below it was
  // still in main's box. Re-imposing main's cap on this wrapper reproduces the shell's sub-md
  // geometry exactly, and `md:max-w-none` gets out of the way the moment the bleed takes over.
  // The cap lives HERE and not on the track because a second max-width beside SHELL_TRACK's own
  // would be a coin-flip on stylesheet order; as a variant override on a different element it is
  // deterministic.
  //
  // WHOLE class literals, never assembled from fragments — Tailwind's scanner cannot see a class
  // built at runtime. SHELL_BLEED, SHELL_TRACK and both inset strings are literals in AppShell.tsx
  // so the scanner has already emitted them; everything appended here is a literal in this file.
  // px-4 stays on the track because SHELL_TRACK only starts padding at md.
  const inset = collapsed ? SIDEBAR_INSET_COLLAPSED : SIDEBAR_INSET_OPEN;
  const barOuter = aligned ? `${SHELL_BLEED} ${inset} mx-auto max-w-6xl md:max-w-none` : "";
  const barTrack = aligned
    ? `${SHELL_TRACK} flex items-center justify-between px-4 py-3 md:gap-3`
    : "mx-auto flex max-w-6xl items-center justify-between px-4 py-3";

  // pt-[env(safe-area-inset-top)]: under viewport-fit=cover the layout extends under the status bar
  // wherever the platform reports a top inset (Android 15 edge-to-edge; 0 on iOS standalone with the
  // default status-bar style), and the bar's own background then fills it instead of the content
  // sliding underneath. OfflineIndicator offsets itself by the same inset to stay clear of this bar.
  //
  // z-30, one layer BELOW the sidebar's z-40 — deliberately. The sidebar paints over this bar's left
  // strip, which is what makes the bar read as spanning only the content area (the reference shape).
  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      {/* Two boxes, not one: SHELL_BLEED is a margin and SHELL_TRACK carries `mx-auto`, so they
          cannot share an element — the same split AppShell uses. On marketing `barOuter` is "" and
          this wrapper is an inert block, leaving the track's own `mx-auto max-w-6xl` untouched. */}
      <div className={barOuter}>
      <div className={barTrack}>
        {aligned ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {/* The sidebar carries the wordmark from md up; below md there is no sidebar, so the
                phone keeps the brand exactly where it has always been. */}
            <a href={HOME_HREF} className="flex shrink-0 items-center md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG, no optimization needed */}
              <img src="/brand/agradex-logo-light.svg" alt="Agradex" className="h-7 w-auto" />
            </a>
            {/* xl only: below xl the sidebar is already the 72px icon column, so collapsing it would
                change nothing and the control would be a lie. */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!collapsed)}
              aria-label={collapsed ? t("app.shell.sidebar.expand") : t("app.shell.sidebar.collapse")}
              aria-expanded={!collapsed}
              title={collapsed ? t("app.shell.sidebar.expand") : t("app.shell.sidebar.collapse")}
              className="hidden h-[var(--tap)] w-[var(--tap)] shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 xl:inline-flex"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            {titleKey && (
              <span className="hidden truncate font-display text-[19px] font-bold text-ink md:inline">
                {t(titleKey)}
              </span>
            )}
          </div>
        ) : (
          <a href={HOME_HREF} className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG, no optimization needed */}
            <img src="/brand/agradex-logo-light.svg" alt="Agradex" className="h-7 w-auto" />
          </a>
        )}

        {aligned ? (
          <div className="hidden shrink-0 items-center gap-1 md:flex">
            <NotificationBell />
            <a
              href={HELP_HREF}
              aria-label={t("app.shell.topbar.help")}
              title={t("app.shell.topbar.help")}
              className="inline-flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-full text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </a>
            <AccountMenu email={user?.email ?? ""} onLogout={onLogout} />
          </div>
        ) : (
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {l.label}
              </Link>
            ))}
            {/* On the app host the language lives in Settings only (Account / More); the marketing
                apex keeps it in the header since signed-out visitors have no settings page. */}
            {!appHost && <LanguageSwitcher className="ml-2" />}
            {user ? (
              <div className="ml-2 flex items-center gap-2">
                {/* On the marketing apex a signed-in visitor needs a way into the app host. */}
                {showToApp && (
                  <a href={APP_HREF} className="btn-primary whitespace-nowrap">
                    {t("nav.toApp")}
                  </a>
                )}
                <NotificationBell />
                <span className="max-w-[168px] truncate text-sm text-slate-500" title={user.email}>
                  {user.email}
                </span>
                <button className="btn-ghost whitespace-nowrap" onClick={onLogout}>
                  {t("nav.logout")}
                </button>
              </div>
            ) : resolved ? (
              <div className="ml-2 flex items-center gap-2">
                <Link href="/login" className="btn-ghost">
                  {t("nav.login")}
                </Link>
                <Link href="/signup" className="btn-primary">
                  {t("nav.signup")}
                </Link>
              </div>
            ) : null}
          </nav>
        )}

        {/* Mobile: on the APP host signed-in users navigate via the bottom nav (D2.1), so only the
            bell stays up top. On the marketing apex EVERY visitor gets the hamburger — a signed-in
            visitor on agradex.com otherwise had no way to open Solutions / Pricing / the language
            picker on a phone. Unchanged by the desktop redesign, and it must stay that way. */}
        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          {resolved && (!appHost || !user) && (
            <button
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-emerald-50"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t("app.nav.menuClose") : t("app.nav.menuOpen")}
              aria-expanded={open}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>
      </div>

      {/* The mobile drawer keeps its own px-4 and is NOT aligned: it only ever opens where the
          hamburger renders (marketing apex, or signed out), i.e. exactly where `aligned` is false —
          and it is md:hidden, while the bleed starts at md. */}
      {open && (
        <div className="border-t border-emerald-100 bg-white px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {/* The language picker lives in the desktop bar only; without it here a phone visitor on
              the marketing site had no way to change language at all. */}
          {!appHost && (
            <div className="border-t border-emerald-100 py-2">
              <LanguageSwitcher />
            </div>
          )}
          {user ? (
            <div className="mt-1 flex flex-col gap-1">
              {showToApp && (
                <a href={APP_HREF} className="btn-primary text-center" onClick={() => setOpen(false)}>
                  {t("nav.toApp")}
                </a>
              )}
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-emerald-50" onClick={onLogout}>
                {t("nav.logout")} ({user.email})
              </button>
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-1">
              <Link href="/login" className="btn-secondary" onClick={() => setOpen(false)}>
                {t("nav.login")}
              </Link>
              <Link href="/signup" className="btn-primary" onClick={() => setOpen(false)}>
                {t("nav.signup")}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
