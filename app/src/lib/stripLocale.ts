// Strip the locale path prefix (/en, /ru, /pl, …) from a pathname.
//
// WHY THIS EXISTS AT ALL: middleware REWRITES the prefix away for routing, but the browser URL —
// and therefore usePathname() — still carries it. Any code that compares a pathname against a
// route literal ("/fields", "/") must strip it first, or every language except az silently matches
// nothing. That has shipped broken twice: a hardcoded /^\/(en|tr|de)/ predated ru/hu/it/pl and cost
// those four users the active rail item, the active bottom-nav tab, the selected field card, its
// scroll-into-view AND the whole FieldSectionMenu.
//
// WHY ONE MODULE: the logic had four independent implementations, and they did not agree.
//   1. components/shell/AppRail.tsx — built from the UNFILTERED LOCALES, so it also stripped a
//      leading "/az" that middleware can never produce. Its own comment claimed "one helper now, so
//      locale nine cannot repeat it" while (2) sat in the tree.
//   2. components/BottomNav.tsx — the same idea built from LOCALES minus az. Correct, and different.
//   3. middleware.ts's PREFIXED — the ORIGIN of the truth; see below.
//   4. components/LanguageSwitcher.tsx's PREFIX_RE — a lookahead variant used to REWRITE the prefix
//      rather than match on it. Still separate; it is a different operation, not a fourth copy of
//      this one.
// (1) and (2) are what this module replaces. A path helper exported from a nav component was always
// the wrong home; lib/ is the right one, and a ninth language is now one edit in i18n.ts.
//
// THE PREFIX SET MUST AGREE WITH middleware.ts's PREFIXED, which is the list this app actually
// serves: ["en","ru","tr","de","hu","it","pl"] — LOCALES minus az, because az is the unprefixed
// default. It is deliberately NOT imported from here: middleware runs in the edge runtime, and
// pulling in i18n.ts (the full az dictionary) to read one array would ship the whole thing there.
// The consequence of the two drifting apart is silent, so it is worth restating: "/az/fields" is
// not a URL this app can produce, and stripping it would turn a hypothetical /az/... route into a
// different one.
import { LOCALES } from "@/lib/i18n";

// Module-level, built once. `Set<string>` (not Set<Locale>) on purpose: the regex hands us a plain
// string, and with no local typechecker a Set<Locale>.has(string) type error would only surface in
// the server `docker build web`.
const PREFIXES = new Set<string>(LOCALES.filter((l) => l !== "az"));

/** "/ru/fields/abc" → "/fields/abc"; "/fields" → "/fields"; "/ru" → "/". */
export function stripLocale(path: string): string {
  const p = path || "/";
  const m = p.match(/^\/([a-z]{2})(\/.*)?$/);
  return m && PREFIXES.has(m[1]) ? m[2] || "/" : p;
}
