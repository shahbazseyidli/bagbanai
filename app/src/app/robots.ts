// /robots.txt
//
// The site had none of its own. What was being served was Cloudflare's managed placeholder — the
// content-signals comment block with ZERO directives: no User-agent, no Allow, no Disallow, and
// no Sitemap line. So nothing pointed a crawler at the sitemap, and nothing kept it out of the
// authenticated app.
import type { MetadataRoute } from "next";

const SITE = `https://${(process.env.NEXT_PUBLIC_PANEL_HOST || "agradex.com").replace(/^(app|panel)\./, "")}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated surfaces. Every one of these redirects a signed-out visitor to /login, so
        // crawling them costs budget and can only ever index a login page. /api is excluded for
        // the same reason plus a stronger one: /api/public/share/<token> would put working share
        // tokens into a search index.
        disallow: [
          "/api/",
          "/fields",
          "/account",
          "/notes",
          "/notifications",
          "/more",
          "/onboarding",
          "/farms/",
          "/admin",
          "/provider",
          "/team",
          "/catalog",
          "/chat",
          "/auth/",
          "/invite/",
          // A share link is meant to be handed to ONE person by the farmer who minted it. It needs
          // no login by design, which is exactly why it must not be indexed.
          "/s/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
