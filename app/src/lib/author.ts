// The public author identity for editorial content (guide articles, future blog posts).
// E-E-A-T: Google's "who wrote this" test wants a named person, not a brand. The owner designated
// their researcher as the public author (2026-08-02); the name below is spelled exactly as the
// linked LinkedIn profile spells it, so the byline and the profile it points to always agree.
//
// `url` is the public profile the byline links to; empty string = render the name without a link.
export const AUTHOR = {
  name: "Sabir Ismayilbayli",
  url: "https://www.linkedin.com/in/sabirismayilbayli/",
} as const;

// Guide articles are file-based and share one editorial history (created b9a1d33, translated
// 23d9fd9). Real dates from git — not invented; update GUIDES_MODIFIED when guide copy changes.
export const GUIDES_PUBLISHED = "2026-07-24";
export const GUIDES_MODIFIED = "2026-07-25";
