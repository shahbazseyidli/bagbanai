"use client";

// Phase 4 — language picker. Switches locale by navigating to the prefixed URL (/en, /ru, /tr, …; az
// has no prefix) so the middleware sets the cookie + the server re-renders in the new language. A
// full navigation (not client-side) guarantees every string re-renders.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { SHARED_COOKIE_DOMAIN } from "@/lib/host";
import { LOCALES, LOCALE_NAMES, getLocale, type Locale } from "@/lib/i18n";

// Strip ANY existing locale prefix (all of en/ru/tr/de/hu/it/pl — az has none) so switching between
// two prefixed locales replaces the prefix instead of stacking it (which produced /pl/it → 404).
const PREFIX_RE = new RegExp(`^/(${LOCALES.filter((l) => l !== "az").join("|")})(?=/|$)`);

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [cur, setCur] = useState<Locale>("az");
  useEffect(() => setCur(getLocale()), []);

  function switchTo(l: Locale) {
    const base = pathname.replace(PREFIX_RE, "") || "/";
    try {
      localStorage.setItem("bagban_locale", l);
      // Scoped to the shared parent domain so the language chosen on agradex.com survives the jump
      // to app.agradex.com (a host-only cookie left the app falling back to browser detection).
      const dom = SHARED_COOKIE_DOMAIN ? `; domain=${SHARED_COOKIE_DOMAIN}` : "";
      document.cookie = `bagban_locale=${l}; path=/${dom}; max-age=31536000; samesite=lax`;
    } catch { /* private mode */ }
    // Persist it on the account too. The cookie only reaches code that runs inside a request;
    // the weekly digest and the advice generated after each satellite scene have no request to
    // read it from and go by users.locale. `keepalive` so the navigation below cannot cancel it;
    // a 401 (signed out) is the normal case on marketing and is ignored.
    try {
      void fetch("/api/auth/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: l }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    } catch { /* offline */ }
    window.location.href = l === "az" ? base : `/${l}${base === "/" ? "" : base}`;
  }

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select
        value={cur}
        onChange={(e) => switchTo(e.target.value as Locale)}
        aria-label="Dil / Language"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
    </label>
  );
}
