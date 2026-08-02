// Blog content model (SEO wave 2, 2026-08-02). Pure data, no React — same philosophy as
// guide/content.ts: the pages import it for metadata and rendering.
//
// Posts are written per LANGUAGE, not translated: the five variants of a slug share a skeleton but
// carry their own market's crops, numbers and examples (that is what keeps 35 pages from reading
// as scaled machine output — see SEO_PLAN.md §4-S2 "Dil qaydası"). Slugs are English and identical
// across locales so the variants form one hreflang cluster, like /solutions/farmer.

export const BLOG_LOCALES = ["az", "en", "ru", "de", "es", "tr"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

export interface BlogTable {
  headers: string[];
  rows: string[][];
}

export interface BlogSection {
  /** h2. Omit for a continuation block. */
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: BlogTable;
}

export interface BlogPost {
  slug: string;
  locale: BlogLocale;
  /** h1 + <title> (— Agradex is appended by the page). Keyword-bearing, ≤60 chars where possible. */
  title: string;
  /** Meta description, ~140-160 chars. */
  description: string;
  /** Answer-first opening paragraph — the direct answer to the query, before any wind-up. */
  lead: string;
  minutes: number;
  datePublished: string;
  dateModified: string;
  sections: BlogSection[];
  /** Other post slugs to cross-link at the bottom. */
  related: string[];
}
