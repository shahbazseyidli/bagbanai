"use client";

// Phase 4 — language picker. Switches locale by navigating to the prefixed URL (/en, /tr, /de; az has
// no prefix) so the middleware sets the cookie + the server re-renders in the new language. A full
// navigation (not client-side) guarantees every string re-renders.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_NAMES, getLocale, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [cur, setCur] = useState<Locale>("az");
  useEffect(() => setCur(getLocale()), []);

  function switchTo(l: Locale) {
    const base = pathname.replace(/^\/(en|tr|de)(?=\/|$)/, "") || "/";
    try {
      localStorage.setItem("bagban_locale", l);
      document.cookie = `bagban_locale=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* private mode */ }
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
