"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";

export default function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  const links = [
    { href: "/", label: t("nav.dashboard"), authOnly: true },
    { href: "/pricing", label: "Qiymətlər", authOnly: false },
    { href: "/team", label: t("nav.team"), authOnly: true },
    ...(user?.is_admin ? [{ href: "/admin", label: "Admin", authOnly: true }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-emerald-700">
          <Leaf className="h-6 w-6" />
          <span className="text-lg font-bold">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links
            .filter((l) => !l.authOnly || user)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {l.label}
              </Link>
            ))}
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <NotificationBell />
              <span className="text-sm text-slate-500">{user.email}</span>
              <button className="btn-ghost" onClick={onLogout}>
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link href="/login" className="btn-ghost">
                {t("nav.login")}
              </Link>
              <Link href="/signup" className="btn-primary">
                {t("nav.signup")}
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile: signed-in users navigate via the bottom nav (D2.1) — only the bell stays up top.
            Signed-out visitors still get the hamburger for login/signup/pricing. */}
        <div className="flex items-center gap-1 md:hidden">
          {user ? (
            <NotificationBell />
          ) : (
            <button
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-emerald-50"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Menyunu bağla" : "Menyu"}
              aria-expanded={open}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-emerald-100 bg-white px-4 py-2 md:hidden">
          {links
            .filter((l) => !l.authOnly || user)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          {user ? (
            <button className="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-50" onClick={onLogout}>
              {t("nav.logout")} ({user.email})
            </button>
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
