// B-legal — the single entry point for both legal documents. /privacy and /terms import only from
// here, so the folder can be moved (to app/src/components/legal/, say) by changing two specifiers.
//
// THE TEXT IS DERIVED FROM THE CODE. If you change any of the files below, the documents very
// likely became false and have to be edited too — in all eight locales:
//   services/app/routers/auth.py .......... signup fields, OTP, profile edit, account closure
//   db/migrations/0044 0045 0046 0047 0048 0051 0052 ... users columns, email ledger, closure
//   db/migrations/0053, services/app/routers/push.py ... web-push subscriptions per device
//   services/app/ai/llm.py, ai/context.py . what is sent to the model provider
//   services/app/ai/advice.py ............. the disclaimer quoted verbatim in terms."ai-limits"
//   services/app/ai/diagnose.py ........... the "never name a pesticide brand or dose" rule
//   services/app/ai/sources/* ............. SoilGrids / FAOSTAT / EPPO / Open-Meteo processors
//   services/app/ai/emails/weekly.py ...... the single weekly digest, its schedule and opt-out
//   services/app/tiers.py, lib/pricing.ts . package limits and the 1-month Pro trial
//   services/app/notify_prefs.py .......... the notification matrix named under "rights" (its
//                                           CHANNELS tuple is what "category × channel" means)
//   app/src/lib/basemaps.ts ............... the tile hosts the browser talks to directly
//   app/src/middleware.ts, lib/api.ts ..... the two cookies (bagban_session, bagban_locale)
import type { Locale } from "@/lib/i18n";
import type { PrivacyDoc, TermsDoc } from "./types";
import { privacyAz } from "./privacy.az";
import { privacyEn } from "./privacy.en";
import { privacyRu } from "./privacy.ru";
import { privacyTr } from "./privacy.tr";
import { privacyDe } from "./privacy.de";
import { privacyHu } from "./privacy.hu";
import { privacyIt } from "./privacy.it";
import { privacyPl } from "./privacy.pl";
import { termsAz } from "./terms.az";
import { termsEn } from "./terms.en";
import { termsRu } from "./terms.ru";
import { termsTr } from "./terms.tr";
import { termsDe } from "./terms.de";
import { termsHu } from "./terms.hu";
import { termsIt } from "./terms.it";
import { termsPl } from "./terms.pl";

const PRIVACY: Record<Locale, PrivacyDoc> = {
  az: privacyAz,
  en: privacyEn,
  ru: privacyRu,
  tr: privacyTr,
  de: privacyDe,
  hu: privacyHu,
  it: privacyIt,
  pl: privacyPl,
  // es is a marketing-first partial locale (SEO wave 2): a Spanish visitor reads the ENGLISH legal
  // documents until privacy.es/terms.es are written. Deliberate — legal text must never be a
  // half-translated overlay, and English is the least-bad complete document for that audience.
  es: privacyEn,
};

const TERMS: Record<Locale, TermsDoc> = {
  az: termsAz,
  en: termsEn,
  ru: termsRu,
  tr: termsTr,
  de: termsDe,
  hu: termsHu,
  it: termsIt,
  pl: termsPl,
  es: termsEn,
};

// The ?? az fallback is for a locale string that slipped past the Locale type (a hand-edited cookie,
// a future locale added to LOCALES before its document exists) — never for a missing translation:
// every locale in LOCALES has a complete document above, and that is the point of the two Records.
export function getPrivacyDoc(locale: Locale): PrivacyDoc {
  return PRIVACY[locale] ?? privacyAz;
}

export function getTermsDoc(locale: Locale): TermsDoc {
  return TERMS[locale] ?? termsAz;
}

export { PRIVACY_IDS, TERMS_IDS, LEGAL_UPDATED } from "./types";
export type { LegalBlock, LegalSection, LegalDoc, PrivacyDoc, TermsDoc, PrivacyId, TermsId } from "./types";
export { default as LegalArticle } from "./LegalArticle";
