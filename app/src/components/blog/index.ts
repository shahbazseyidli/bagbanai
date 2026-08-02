// Post registry — the ONE place a post variant is registered. sitemap.ts derives blog URLs from
// this map, so a variant can never be published and missing from the sitemap at the same time
// (same invariant as GUIDE_ORDER).
import type { BlogLocale, BlogPost } from "./types";

import { post as whatIsNdviAz } from "./posts/what-is-ndvi.az";
import { post as satellitePassAz } from "./posts/satellite-pass-frequency.az";
import { post as whyNoImageAz } from "./posts/why-no-satellite-image.az";
import { post as ndviNdmiNdreAz } from "./posts/ndvi-ndmi-ndre.az";
import { post as irrigateWheatAz } from "./posts/when-to-irrigate-wheat.az";
import { post as freeNdviMapAz } from "./posts/free-ndvi-map.az";
import { post as ndviDiseaseAz } from "./posts/ndvi-crop-disease.az";

/** Publication order of the hub page (newest editorial priority first). */
export const BLOG_SLUGS = [
  "what-is-ndvi",
  "ndvi-ndmi-ndre",
  "satellite-pass-frequency",
  "why-no-satellite-image",
  "when-to-irrigate-wheat",
  "free-ndvi-map",
  "ndvi-crop-disease",
] as const;

const POSTS: Record<string, Partial<Record<BlogLocale, BlogPost>>> = {
  "what-is-ndvi": { az: whatIsNdviAz },
  "satellite-pass-frequency": { az: satellitePassAz },
  "why-no-satellite-image": { az: whyNoImageAz },
  "ndvi-ndmi-ndre": { az: ndviNdmiNdreAz },
  "when-to-irrigate-wheat": { az: irrigateWheatAz },
  "free-ndvi-map": { az: freeNdviMapAz },
  "ndvi-crop-disease": { az: ndviDiseaseAz },
};

/** Locales a slug actually exists in (drives hreflang + the sitemap). */
export function availableLocales(slug: string): BlogLocale[] {
  const p = POSTS[slug];
  return p ? (Object.keys(p) as BlogLocale[]) : [];
}

/** Resolve a post for the reader's locale: exact → en → az. Returns the post together with the
 *  locale actually served, so the page can set an honest canonical + inLanguage. */
export function getPost(
  slug: string,
  locale: string,
): { post: BlogPost; served: BlogLocale } | null {
  const p = POSTS[slug];
  if (!p) return null;
  const exact = p[locale as BlogLocale];
  if (exact) return { post: exact, served: locale as BlogLocale };
  if (p.en) return { post: p.en, served: "en" };
  if (p.az) return { post: p.az, served: "az" };
  const first = Object.values(p)[0];
  return first ? { post: first, served: first.locale } : null;
}

export function getPostList(locale: string): { post: BlogPost; served: BlogLocale }[] {
  return BLOG_SLUGS.map((s) => getPost(s, locale)).filter(
    (x): x is { post: BlogPost; served: BlogLocale } => x !== null,
  );
}
