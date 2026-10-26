// Blog content model (SEO wave 2, 2026-08-02). Pure data, no React — same philosophy as
// guide/content.ts: the pages import it for metadata and rendering.
//
// Posts are written per LANGUAGE, not translated: the five variants of a slug share a skeleton but
// carry their own market's crops, numbers and examples (that is what keeps 35 pages from reading
// as scaled machine output — see SEO_PLAN.md §4-S2 "Dil qaydası"). Slugs are English and identical
// across locales so the variants form one hreflang cluster, like /solutions/farmer.

// hu, it and pl joined on 2026-10-26. They were full UI locales with full dictionary parity and
// ZERO blog posts — the hub simply served them the English article, which is the worst of both
// worlds: an English page ranking for nothing in Hungarian, Italian or Polish, and a reader who
// has to switch languages to read it. Adding a locale here only widens what a slug MAY have;
// `availableLocales()` still reports what a slug actually has, so hreflang stays honest.
export const BLOG_LOCALES = ["az", "en", "ru", "de", "es", "tr", "hu", "it", "pl"] as const;
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
