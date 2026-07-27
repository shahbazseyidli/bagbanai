"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APEX_HOST, PANEL_HOST, useIsAppHost } from "@/lib/host";
import { t } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { SHELL_BLEED, SHELL_TRACK, isPublicPath } from "@/components/shell/AppShell";

// Phase 2 host split: when app.agradex.com is the app host, the brand/logo points at the marketing
// apex (so "clicking home takes me to agradex.com"), and signed-in users get a "Panelə keç" link
// into the app host. Empty until NEXT_PUBLIC_PANEL_HOST is set → logo is the normal "/".
const HOME_HREF = APEX_HOST ? `https://${APEX_HOST}/` : "/";
const APP_HREF = PANEL_HOST ? `https://${PANEL_HOST}/` : "/";

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const appHost = useIsAppHost();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  // W2 — the desktop left rail (AppShell) now owns app navigation, and /more carries Team/Admin,
  // so repeating those up here only crowded the bar until it wrapped. Signed IN: the top bar is
  // just account controls. Signed OUT: the marketing links. The mobile drawer (signed-out only)
  // and BottomNav (signed-in) are unchanged.
  const marketingLinks = [
    { href: "/solutions", label: t("nav.solutions") },
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/pricing", label: t("nav.pricing") },
  ];
  // While auth is still resolving (and we have no cached user) we don't yet know whether to show the
  // signed-in account controls, so we hold those back instead of flashing signed-out chrome.
  const resolved = !loading || !!user;
  // The marketing links belong to the MARKETING APEX and stay there whether or not the visitor is
  // signed in — hiding them for signed-in users left agradex.com with a bare logo bar and no way to
  // reach Solutions / How it works / Pricing. On the APP host the left rail + /more own navigation,
  // so the top bar there is account controls only.
  const links = appHost ? [] : marketingLinks;
  // "Panelə keç" only belongs on the marketing apex — never on the app host itself.
  const showToApp = !!user && !!PANEL_HOST && !appHost;

  // W1 — align the top bar with AppShell's full-bleed track.
  //
  // AppShell exported SHELL_BLEED/SHELL_TRACK "so whoever owns Nav.tsx can align the top bar", and
  // for one wave nobody imported them: the shell went full-bleed and the header did not. At 1920 the
  // rail started at x≈24 while this logo was still centred in a 1152px container at x≈400 — on every
  // app route at every width ≥ 1280. Two horizontal rules, 376px apart, reading as two products.
  //
  // GATED ON EXACTLY AppShell's OWN CONDITIONS (app host · signed in · not a public path), because
  // the same header also renders on the MARKETING APEX, where AppShell early-returns and content
  // keeps layout.tsx's centred `max-w-6xl` reading container. Full-bleeding the header there would
  // orphan it in the other direction. Marketing is byte-for-byte unchanged: `aligned` is false for
  // every apex request, and false on the app host until auth resolves — the same frame in which the
  // rail itself appears, so the two move together rather than one jumping ahead of the other.
  //
  // Only the geometry is conditional; the bar's contents are decided by `appHost`/`user` as before.
  const aligned = appHost && !!user && !isPublicPath(pathname);

  // `mx-auto max-w-6xl xl:max-w-none` is NOT belt-and-braces — without it this fix would trade one
  // misalignment for another between 1152 and 1279px. SHELL_BLEED is xl-gated, so below xl the shell
  // has no bleed and is bounded by layout.tsx's `<main class="mx-auto max-w-6xl px-4">` at 1152.
  // The header is NOT inside that main — its parent is the full-width <header> — so SHELL_TRACK's
  // `max-w-[2200px]` alone would let the bar span the whole window while the content below it was
  // still capped at 1152. Re-imposing main's cap on this wrapper reproduces the shell's sub-xl
  // geometry exactly (1152 box → px-4 → 1120 of content, same left edge), and `xl:max-w-none` gets
  // out of the way the moment the bleed takes over. The cap lives HERE and not on the track because
  // a second max-width beside SHELL_TRACK's own would be a coin-flip on stylesheet order; as an
  // xl-variant override on a different element it is deterministic.
  //
  // WHOLE class literals, never assembled from fragments — Tailwind's scanner cannot see a class
  // built at runtime. SHELL_BLEED and SHELL_TRACK are literals in AppShell.tsx so the scanner has
  // already emitted them, and everything appended here is a literal in this file. px-4 stays on the
  // track because SHELL_TRACK only starts padding at xl.
  const barOuter = aligned ? `${SHELL_BLEED} mx-auto max-w-6xl xl:max-w-none` : "";
  const barTrack = aligned
    ? `${SHELL_TRACK} flex items-center justify-between px-4 py-3`
    : "mx-auto flex max-w-6xl items-center justify-between px-4 py-3";

  // pt-[env(safe-area-inset-top)]: under viewport-fit=cover the layout extends under the status bar
  // wherever the platform reports a top inset (Android 15 edge-to-edge; 0 on iOS standalone with the
  // default status-bar style), and the bar's own background then fills it instead of the content
  // sliding underneath. OfflineIndicator offsets itself by the same inset to stay clear of this bar.
  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      {/* Two boxes, not one: SHELL_BLEED is a margin and SHELL_TRACK carries `mx-auto`, so they
          cannot share an element — the same split AppShell uses. On marketing `barOuter` is "" and
          this wrapper is an inert block, leaving the track's own `mx-auto max-w-6xl` untouched. */}
      <div className={barOuter}>
      <div className={barTrack}>
        <a href={HOME_HREF} className="flex shrink-0 items-center gap-2 text-emerald-700">
          <Leaf className="h-6 w-6 shrink-0" />
          <span className="whitespace-nowrap text-lg font-bold">{t("brand")}</span>
        </a>

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

        {/* Mobile: on the APP host signed-in users navigate via the bottom nav (D2.1), so only the
            bell stays up top. On the marketing apex EVERY visitor gets the hamburger — a signed-in
            visitor on agradex.com otherwise had no way to open Solutions / Pricing / the language
            picker on a phone. */}
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
          and it is md:hidden, while the bleed starts at xl. */}
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
