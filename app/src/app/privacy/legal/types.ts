// B-legal — shape of the two long-form legal documents (/privacy, /terms).
//
// Pure data, no React: the pages are Server Components and import a finished document object for
// the request's locale. Same idea as components/guide/content.ts, but WITHOUT lib/contentI18n's
// localize() overlay: that resolver falls back path-by-path to Azerbaijani, which is acceptable for
// a marketing article and unacceptable here — a half-translated privacy policy is worse than none.
// So each locale ships a complete document instead.
//
// This folder sits under app/privacy/ and not under components/ because this wave owns only the two
// route folders. A folder with no page.tsx / route.ts creates no route, so /privacy/legal is a 404;
// terms/page.tsx imports across from ../privacy/legal. Everything is re-exported from ./index, so
// if a shared app/src/components/legal/ is ever authorised the folder moves as-is and only the two
// import specifiers change.

/** Shown in the "last updated" line and inside the not-reviewed-by-a-lawyer banner. Bump it
 *  whenever a fact in either document changes — a stale date makes the banner's claim ("accurate as
 *  of …") a lie, which is worse than having no date at all.
 *
 *  It lives here rather than in ./index so LegalArticle can read it without importing the barrel
 *  that re-exports LegalArticle — that would be an import cycle. */
export const LEGAL_UPDATED = "2026-08-01";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  /** Two-column list — used for the processor table (who receives data → what and why). */
  | { kind: "kv"; rows: Array<{ k: string; v: string }> };

export interface LegalSection {
  heading: string;
  body: LegalBlock[];
}

// Anchor ids AND the table-of-contents order live here, never in a locale file: eight translations
// that each carried their own ordering would drift the moment one of them was edited alone.
export const PRIVACY_IDS = [
  "scope",
  "account-data",
  "field-data",
  "storage",
  "processors",
  "ai",
  "email",
  "cookies",
  "visibility",
  "retention",
  "rights",
  "changes",
] as const;

export const TERMS_IDS = [
  "service",
  "account",
  "ai-limits",
  "acceptable-use",
  "packages",
  "quotas",
  "ownership",
  "availability",
  "liability",
  "changes",
  "contact",
] as const;

export type PrivacyId = (typeof PRIVACY_IDS)[number];
export type TermsId = (typeof TERMS_IDS)[number];

export interface LegalDoc<Id extends string> {
  /** <h1> of the page. */
  title: string;
  /** One paragraph under the title, before the summary box. */
  lead: string;
  /** 3–5 bullets for the "Qısaca" box. */
  summary: string[];
  /** Record, not an array: a section forgotten in one translation is a build error, not a page
   *  that silently renders eleven of twelve headings in that one language. */
  sections: Record<Id, LegalSection>;
}

export type PrivacyDoc = LegalDoc<PrivacyId>;
export type TermsDoc = LegalDoc<TermsId>;
