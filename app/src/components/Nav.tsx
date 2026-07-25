"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APEX_HOST, PANEL_HOST, useIsAppHost } from "@/lib/host";
import { t } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Phase 2 host split: when app.agradex.com is the app host, the brand/logo points at the marketing
// apex (so "clicking home takes me to agradex.com"), and signed-in users get a "Panelə keç" link
// into the app host. Empty until NEXT_PUBLIC_PANEL_HOST is set → logo is the normal "/".
const HOME_HREF = APEX_HOST ? `https://${APEX_HOST}/` : "/";
const APP_HREF = PANEL_HOST ? `https://${PANEL_HOST}/` : "/";

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const appHost = useIsAppHost();
  const router = useRouter();
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

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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
