// The country choices offered on /account, identical to the ones the registration wizard offers.
//
// The stored VALUE stays the canonical Azerbaijani name: users.country is plain text and the
// provider-catalog filters compare it as such, so rewriting it to an ISO code here would quietly
// unmatch existing rows. Only the LABEL is localized, via the shared countryName() + Intl.
//
// app/src/app/signup/page.tsx holds the identical literal as a module-local `COUNTRIES` that it does
// not export, and that file is outside this change. The two lists must move together — adding a
// country to one and not the other leaves a signup value the account page cannot display.
export const ACCOUNT_COUNTRIES: { value: string; code: string }[] = [
  { value: "Azərbaycan", code: "AZ" },
  { value: "Türkiyə", code: "TR" },
  { value: "Gürcüstan", code: "GE" },
  { value: "Rusiya", code: "RU" },
  { value: "Qazaxıstan", code: "KZ" },
  { value: "Digər", code: "" },
];

/**
 * The stored country, rendered in the reader's language.
 *
 * The picker on /account already did this (Intl.DisplayNames over the code), but the summary card
 * above it printed users.country RAW — so a Turkish account read "Ülke & bölge: Türkiyə" and a
 * Russian one "Страна и регион: Türkiyə", in Azerbaijani, on a screen that was otherwise fully
 * translated. Both observed live on 2026-07-31.
 *
 * An unlisted value (a legacy row, or something the landing quiz wrote) falls back to itself: the
 * farmer's own words beat a blank.
 */
export function countryLabel(stored: string | null | undefined, locale: string): string {
  const v = (stored || "").trim();
  if (!v) return "";
  const hit = ACCOUNT_COUNTRIES.find((c) => c.value === v);
  if (!hit || !hit.code) return v;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(hit.code) || v;
  } catch {
    return v;
  }
}
