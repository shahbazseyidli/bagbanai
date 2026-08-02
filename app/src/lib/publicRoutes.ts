// The marketing pages a search engine should know about — ONE list, used by both sitemap.ts and
// robots.ts so the two can never disagree about what is public.
//
// App routes are deliberately absent. /fields, /account, /notes and the rest sit behind the auth
// gate in middleware.ts, so a crawler following them gets a redirect to /login: listing them would
// spend crawl budget on a wall and put a login page in the index.
// /login and /signup are deliberately NOT here: they are real pages but thin ones, and a sitemap
// entry is a recommendation to index — 16 near-empty auth URLs dilute what the sitemap says matters.
// Guide ARTICLES are appended by sitemap.ts from GUIDE_ORDER (single source in guide/content.ts).
export const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/how-it-works",
  "/solutions",
  "/solutions/farmer",
  "/solutions/lab",
  "/solutions/consultant",
  "/solutions/supplier",
  "/guide",
  "/demo",
  "/privacy",
  "/terms",
] as const;

/** Locales that carry a URL prefix. `az` is the unprefixed default. */
export const SITEMAP_LOCALES = ["az", "en", "ru", "tr", "de", "hu", "it", "pl"] as const;

/** Absolute URL for a route in a locale. Mirrors alternatesFor() in app/layout.tsx exactly — if
 *  the two ever disagree, the sitemap advertises a URL whose own hreflang points elsewhere. */
export function urlFor(site: string, locale: string, route: string): string {
  const clean = route === "/" ? "" : route;
  return locale === "az" ? `${site}${clean || "/"}` : `${site}/${locale}${clean}`;
}
