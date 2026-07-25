// Server-side translation for React Server Components. The client t() reads a module-level locale
// set by LocaleProvider — that never runs for pure Server Components, so they used to render in az
// regardless of the chosen language (the documented "Server-Component t() gotcha"). Here we read the
// x-locale request header (set by middleware) and resolve against the same dictionaries.
//
// Usage in an async Server Component:
//   import { getT } from "@/lib/i18n-server";
//   export default async function Page() { const t = await getT(); return <h1>{t("landing.title")}</h1>; }
import { headers } from "next/headers";
import { az, LOCALES, type I18nKey, type Locale, type Dict } from "@/lib/i18n";
import { en } from "@/lib/locales/en";
import { tr } from "@/lib/locales/tr";
import { de } from "@/lib/locales/de";
import { hu } from "@/lib/locales/hu";
import { it } from "@/lib/locales/it";
import { pl } from "@/lib/locales/pl";

const DICTS: Record<Locale, Dict> = { az, en, tr, de, hu, it, pl };

/** Resolve the active locale from the middleware-set x-locale header (falls back to the cookie, az). */
export async function getServerLocale(): Promise<Locale> {
  const h = await headers();
  const raw = (h.get("x-locale") || "").toLowerCase();
  if (LOCALES.includes(raw as Locale)) return raw as Locale;
  return "az";
}

/** A t() bound to the request's locale, for Server Components. Missing keys fall back to az. */
export async function getT(): Promise<(key: I18nKey) => string> {
  const locale = await getServerLocale();
  const d = DICTS[locale];
  return (key: I18nKey) => (d && d[key]) || az[key] || (key as string);
}
