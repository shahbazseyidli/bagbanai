// Post registry — the ONE place a post variant is registered. sitemap.ts derives blog URLs from
// this map, so a variant can never be published and missing from the sitemap at the same time
// (same invariant as GUIDE_ORDER).
import type { BlogLocale, BlogPost } from "./types";

import { post as whatIsNdviAz } from "./posts/what-is-ndvi.az";
import { post as whatIsNdviEn } from "./posts/what-is-ndvi.en";
import { post as whatIsNdviRu } from "./posts/what-is-ndvi.ru";
import { post as whatIsNdviDe } from "./posts/what-is-ndvi.de";
import { post as whatIsNdviEs } from "./posts/what-is-ndvi.es";
import { post as satellitePassAz } from "./posts/satellite-pass-frequency.az";
import { post as satellitePassEn } from "./posts/satellite-pass-frequency.en";
import { post as satellitePassRu } from "./posts/satellite-pass-frequency.ru";
import { post as satellitePassDe } from "./posts/satellite-pass-frequency.de";
import { post as satellitePassEs } from "./posts/satellite-pass-frequency.es";
import { post as whyNoImageAz } from "./posts/why-no-satellite-image.az";
import { post as whyNoImageEn } from "./posts/why-no-satellite-image.en";
import { post as whyNoImageRu } from "./posts/why-no-satellite-image.ru";
import { post as whyNoImageDe } from "./posts/why-no-satellite-image.de";
import { post as whyNoImageEs } from "./posts/why-no-satellite-image.es";
import { post as ndviNdmiNdreAz } from "./posts/ndvi-ndmi-ndre.az";
import { post as ndviNdmiNdreEn } from "./posts/ndvi-ndmi-ndre.en";
import { post as ndviNdmiNdreRu } from "./posts/ndvi-ndmi-ndre.ru";
import { post as ndviNdmiNdreDe } from "./posts/ndvi-ndmi-ndre.de";
import { post as ndviNdmiNdreEs } from "./posts/ndvi-ndmi-ndre.es";
import { post as irrigateWheatAz } from "./posts/when-to-irrigate-wheat.az";
import { post as irrigateWheatEn } from "./posts/when-to-irrigate-wheat.en";
import { post as irrigateWheatRu } from "./posts/when-to-irrigate-wheat.ru";
import { post as irrigateWheatDe } from "./posts/when-to-irrigate-wheat.de";
import { post as irrigateWheatEs } from "./posts/when-to-irrigate-wheat.es";
import { post as freeNdviMapAz } from "./posts/free-ndvi-map.az";
import { post as freeNdviMapEn } from "./posts/free-ndvi-map.en";
import { post as freeNdviMapRu } from "./posts/free-ndvi-map.ru";
import { post as freeNdviMapDe } from "./posts/free-ndvi-map.de";
import { post as freeNdviMapEs } from "./posts/free-ndvi-map.es";
import { post as ndviDiseaseAz } from "./posts/ndvi-crop-disease.az";
import { post as ndviDiseaseEn } from "./posts/ndvi-crop-disease.en";
import { post as ndviDiseaseRu } from "./posts/ndvi-crop-disease.ru";
import { post as ndviDiseaseDe } from "./posts/ndvi-crop-disease.de";
import { post as ndviDiseaseEs } from "./posts/ndvi-crop-disease.es";

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
  "what-is-ndvi": {
    az: whatIsNdviAz, en: whatIsNdviEn, ru: whatIsNdviRu, de: whatIsNdviDe, es: whatIsNdviEs,
  },
  "satellite-pass-frequency": {
    az: satellitePassAz, en: satellitePassEn, ru: satellitePassRu, de: satellitePassDe, es: satellitePassEs,
  },
  "why-no-satellite-image": {
    az: whyNoImageAz, en: whyNoImageEn, ru: whyNoImageRu, de: whyNoImageDe, es: whyNoImageEs,
  },
  "ndvi-ndmi-ndre": {
    az: ndviNdmiNdreAz, en: ndviNdmiNdreEn, ru: ndviNdmiNdreRu, de: ndviNdmiNdreDe, es: ndviNdmiNdreEs,
  },
  "when-to-irrigate-wheat": {
    az: irrigateWheatAz, en: irrigateWheatEn, ru: irrigateWheatRu, de: irrigateWheatDe, es: irrigateWheatEs,
  },
  "free-ndvi-map": {
    az: freeNdviMapAz, en: freeNdviMapEn, ru: freeNdviMapRu, de: freeNdviMapDe, es: freeNdviMapEs,
  },
  "ndvi-crop-disease": {
    az: ndviDiseaseAz, en: ndviDiseaseEn, ru: ndviDiseaseRu, de: ndviDiseaseDe, es: ndviDiseaseEs,
  },
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
