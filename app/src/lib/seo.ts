// One place for canonical + hreflang truth. Every marketing page's generateMetadata must build its
// `alternates` through pageAlternates() — a page-level `alternates` object REPLACES the root
// layout's entirely (Next merges metadata shallowly), so a page that sets only a relative canonical
// silently wipes all nine hreflang links and, with no metadataBase, declares every locale a
// duplicate of the bare az path. That was live on /how-it-works, /demo, /solutions/* and /guide/*
// until 2026-08 (SEO_PLAN.md K2).
import { LOCALES, type Locale } from "@/lib/i18n";

// Marketing lives on the apex; alternates must point there regardless of which host served us.
export const SITE = `https://${(process.env.NEXT_PUBLIC_PANEL_HOST || "agradex.com").replace(/^(app|panel)\./, "")}`;

/** Absolute URL of `path` in `locale`. az is the unprefixed default. */
export function localeUrl(path: string, locale: Locale): string {
  const clean = path === "/" ? "" : path;
  return locale === "az" ? `${SITE}${clean || "/"}` : `${SITE}/${locale}${clean}`;
}

/** Canonical (same-language — Google ignores hreflang clusters whose canonical crosses languages)
 *  plus the full 8-locale + x-default hreflang set for `path`. */
export function pageAlternates(path: string, locale: Locale) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localeUrl(path, l);
  languages["x-default"] = localeUrl(path, "az");
  return { canonical: localeUrl(path, locale), languages };
}
