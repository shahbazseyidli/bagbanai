// Navigation visibility flags. One constant per surface that is BUILT but not yet worth showing.
//
// SHOW_MARKETPLACE_NAV gates /catalog (Kataloq — supplier marketplace) and /chat (İcma — farmer
// community) in the app's navigation.
//
// ON since 2026-07-27, at the owner's decision. They were hidden while both were empty — a
// marketplace with no suppliers and a community with no conversations advertise emptiness exactly
// where the farmer is looking for value. The owner chose to surface them anyway: they survived the
// ERP strip deliberately, and a route nobody can reach never acquires the content that would
// justify it. Expect both to look sparse until providers and messages are seeded.
//
// Annotated `: boolean` on purpose — without it TypeScript infers a literal type, narrows every
// `SHOW_MARKETPLACE_NAV ? … : …` to one branch and starts reporting the other as dead code. The
// annotation keeps both branches real in either direction.
export const SHOW_MARKETPLACE_NAV: boolean = true;
