// The public author identity for editorial content (guide articles, future blog posts).
// E-E-A-T: Google's "who wrote this" test wants a named person, not a brand. The founder chose to
// sign content personally (SEO_PLAN.md Q1, 2026-08-02).
//
// `url` is the public profile the byline links to; empty string = render the name without a link
// (fill in the LinkedIn URL once the founder confirms it — do not invent one).
export const AUTHOR = {
  name: "Mirşahbaz Seyidli",
  url: "",
} as const;

// Guide articles are file-based and share one editorial history (created b9a1d33, translated
// 23d9fd9). Real dates from git — not invented; update GUIDES_MODIFIED when guide copy changes.
export const GUIDES_PUBLISHED = "2026-07-24";
export const GUIDES_MODIFIED = "2026-07-25";
