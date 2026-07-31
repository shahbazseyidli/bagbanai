// /sitemap.xml — every marketing page, in every language, each entry carrying the full hreflang set.
//
// There was no sitemap at all: /sitemap.xml answered 404 while the site shipped canonical + eight
// hreflang alternates on every page. That is the wrong way round — the alternates tell a crawler
// how the versions relate ONCE IT HAS FOUND THEM, and nothing was telling it they existed. Eight
// languages of thirteen pages is 104 URLs, most of them reachable only by guessing a prefix.
import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITEMAP_LOCALES, urlFor } from "@/lib/publicRoutes";

// Marketing lives on the apex regardless of which host renders this — same derivation as
// app/layout.tsx, for the same reason: a sitemap pointing at app.agradex.com would list URLs that
// bounce every signed-out crawler to /login.
const SITE = `https://${(process.env.NEXT_PUBLIC_PANEL_HOST || "agradex.com").replace(/^(app|panel)\./, "")}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.flatMap((route) =>
    SITEMAP_LOCALES.map((locale) => ({
      url: urlFor(SITE, locale, route),
      // The `languages` map is what makes this a MULTILINGUAL sitemap rather than 104 unrelated
      // pages: it repeats, per entry, the same alternates the page itself emits.
      alternates: {
        languages: Object.fromEntries(
          SITEMAP_LOCALES.map((l) => [l, urlFor(SITE, l, route)]),
        ),
      },
      // No lastModified and no priority, deliberately. Both would be invented — nothing here
      // tracks when a marketing page last changed, and a made-up date teaches a crawler to ignore
      // the field. Absent is honest; wrong is worse than missing.
      changeFrequency: "weekly" as const,
    })),
  );
}
