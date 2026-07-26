// Navigation visibility flags. One constant per surface that is BUILT but not yet worth showing.
//
// SHOW_MARKETPLACE_NAV gates /catalog (Kataloq — supplier marketplace) and /chat (İcma — farmer
// community) in the app's navigation. Both are fully implemented and both are currently EMPTY:
// there are no seeded providers and no messages. A marketplace with no suppliers and a community
// with no conversations advertise emptiness exactly where the farmer is looking for value, so they
// are hidden from the rail, the bottom nav and the /more list until they have content.
//
// This is NOT a kill switch: the routes, the API and every component stay live, a direct link or a
// deep link from a field still opens them, and the landing page still links to /catalog. Seeding
// providers/messages is the only precondition — then flip this one constant to true.
// Annotated `: boolean` on purpose — without it TypeScript infers the literal type `false`, narrows
// every `SHOW_MARKETPLACE_NAV ? … : …` to its else branch and starts reporting the enabled branch
// as dead code. The annotation keeps both branches real, so flipping the value is genuinely one
// character and the compiler has already checked what happens when it is true.
export const SHOW_MARKETPLACE_NAV: boolean = false;
