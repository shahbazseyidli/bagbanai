// /sitemap.xml — every marketing page, in every language, each entry carrying the full hreflang set.
//
// There was no sitemap at all: /sitemap.xml answered 404 while the site shipped canonical + eight
// hreflang alternates on every page. That is the wrong way round — the alternates tell a crawler
// how the versions relate ONCE IT HAS FOUND THEM, and nothing was telling it they existed. Eight
// languages of thirteen pages is 104 URLs, most of them reachable only by guessing a prefix.
import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITEMAP_LOCALES, urlFor } from "@/lib/publicRoutes";
import { GUIDE_ORDER } from "@/components/guide/content";
import { BLOG_SLUGS, availableLocales } from "@/components/blog";

// Marketing lives on the apex regardless of which host renders this — same derivation as
// app/layout.tsx, for the same reason: a sitemap pointing at app.agradex.com would list URLs that
// bounce every signed-out crawler to /login.
const SITE = `https://${(process.env.NEXT_PUBLIC_PANEL_HOST || "agradex.com").replace(/^(app|panel)\./, "")}`;

export default function sitemap(): MetadataRoute.Sitemap {
  // Blog posts exist in a SUBSET of locales (see blog/types.ts), so their entries advertise only
  // the variants that are real — an hreflang link to a nonexistent variant poisons the cluster.
  const blogEntries: MetadataRoute.Sitemap = BLOG_SLUGS.flatMap((slug) => {
    const locales = availableLocales(slug);
    const route = `/blog/${slug}`;
    const languages = {
      ...Object.fromEntries(locales.map((l) => [l, urlFor(SITE, l, route)])),
      "x-default": urlFor(SITE, locales.includes("az") ? "az" : locales[0], route),
    };
    return locales.map((locale) => ({
      url: urlFor(SITE, locale, route),
      alternates: { languages },
      changeFrequency: "weekly" as const,
    }));
  });
  // Static marketing routes + the guide articles (from the same registry the pages render from, so
  // a new article can never be published and missing from the sitemap at the same time).
  const routes: string[] = [...PUBLIC_ROUTES, ...GUIDE_ORDER.map((slug) => `/guide/${slug}`)];
  return blogEntries.concat(routes.flatMap((route) =>
    SITEMAP_LOCALES.map((locale) => ({
      url: urlFor(SITE, locale, route),
      // The `languages` map is what makes this a MULTILINGUAL sitemap rather than unrelated pages:
      // it repeats, per entry, the same alternates the page itself emits — x-default included,
      // matching layout.tsx/pageAlternates exactly.
      alternates: {
        languages: {
          ...Object.fromEntries(SITEMAP_LOCALES.map((l) => [l, urlFor(SITE, l, route)])),
          "x-default": urlFor(SITE, "az", route),
        },
      },
      // No lastModified and no priority, deliberately. Both would be invented — nothing here
      // tracks when a marketing page last changed, and a made-up date teaches a crawler to ignore
      // the field. Absent is honest; wrong is worse than missing.
      changeFrequency: "weekly" as const,
    })),
  ));
}
