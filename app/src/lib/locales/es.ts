import type { Dict } from "@/lib/i18n";

// Spanish (LatAm-neutral) — MARKETING-FIRST PARTIAL locale (2026-08-02, SEO wave 2).
// Coverage: the crawler-facing marketing surface (mkt.*, nav, landing meta, blog chrome) plus the
// app.plural.* forms. Everything else deliberately falls back to ENGLISH (t()/getT resolve
// locale → en → az since this wave), never to Azerbaijani — a Spanish reader who hits an
// untranslated corner of the app gets English, which they can at least read.
// Extend toward full app coverage before any serious es-market push inside the panel.
export const es: Dict = {};
