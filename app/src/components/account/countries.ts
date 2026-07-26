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
