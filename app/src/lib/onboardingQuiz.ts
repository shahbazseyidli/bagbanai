"use client";

// Landing onboarding quiz (E13) — the four questions a visitor answers on the home page before
// they sign up. The answers are the farmer's own profile data, so they are kept in canonical form:
//   crop      → the same snake_case value the field wizard and crop_thresholds use (so it can be
//               written straight into field_metadata.crop_type and already has an app.meta.crop.*
//               translation in all 7 languages — no new crop vocabulary)
//   country   → ISO 3166-1 alpha-2, rendered with Intl.DisplayNames in the visitor's language
//   challenge → one id, or "" when skipped
//   needs     → several ids
// They live in localStorage until the visitor signs up, then move to users.onboarding.
import type { I18nKey } from "@/lib/i18n";

export const QUIZ_KEY = "agradex.onboarding.v1";

export interface QuizAnswers {
  crop: string;
  country: string;
  region: string;
  challenge: string;
  needs: string[];
  /** What they typed when the shortlist did not contain their crop. Carried into the account
   *  with the rest of the quiz — picking "other" used to store the literal string and the
   *  field wizard then discarded it, so the answer was collected and thrown away. */
  crop_other?: string;
  completed_at?: string;
  /** The boundary the visitor traced on the landing map before they had an account.
   *  It rides in THIS blob, not in its own localStorage key, for one reason: this blob is carried
   *  to the server by carryQuiz() the moment a session exists, and localStorage is per-ORIGIN.
   *  The landing runs on agradex.com and the field wizard on app.agradex.com, so anything left in
   *  localStorage by the landing is unreadable by the wizard in production — see the comment on
   *  saveDraftField below. */
  draft_field?: { polygon: unknown; area_ha?: number | null };
}

export const EMPTY_ANSWERS: QuizAnswers = { crop: "", country: "", region: "", challenge: "", needs: [] };

/** A shortlist for the grid — the full crop list stays in the field wizard. `other` keeps anyone
 *  we did not list from bouncing off the first question. */
export const QUIZ_CROPS: { value: string; emoji: string; labelKey: I18nKey }[] = [
  { value: "wheat", emoji: "🌾", labelKey: "app.meta.crop.wheat" },
  { value: "barley", emoji: "🌾", labelKey: "app.meta.crop.barley" },
  { value: "corn", emoji: "🌽", labelKey: "app.meta.crop.corn" },
  { value: "grape", emoji: "🍇", labelKey: "app.meta.crop.grape" },
  { value: "apple", emoji: "🍎", labelKey: "app.meta.crop.apple" },
  { value: "hazelnut", emoji: "🌰", labelKey: "app.meta.crop.hazelnut" },
  { value: "pomegranate", emoji: "🔴", labelKey: "app.meta.crop.pomegranate" },
  { value: "tomato", emoji: "🍅", labelKey: "app.meta.crop.tomato" },
  { value: "potato", emoji: "🥔", labelKey: "app.meta.crop.potato" },
  { value: "vegetable", emoji: "🥬", labelKey: "app.meta.crop.vegetable" },
  { value: "cotton", emoji: "☁️", labelKey: "app.meta.crop.cotton" },
  { value: "olive", emoji: "🫒", labelKey: "app.meta.crop.olive" },
];

export const QUIZ_CHALLENGES: { value: string; emoji: string; labelKey: I18nKey }[] = [
  { value: "water", emoji: "💧", labelKey: "mkt.quiz.ch.water" },
  { value: "disease", emoji: "🐛", labelKey: "mkt.quiz.ch.disease" },
  { value: "fertilizer", emoji: "🧪", labelKey: "mkt.quiz.ch.fertilizer" },
  { value: "frost", emoji: "❄️", labelKey: "mkt.quiz.ch.frost" },
  { value: "yield", emoji: "📉", labelKey: "mkt.quiz.ch.yield" },
  // "cost" ("Xərci izləyə bilmirəm") was dropped with the ledger module (81660df) — offering it
  // would promise the visitor a problem the product no longer addresses.
  { value: "market", emoji: "🤝", labelKey: "mkt.quiz.ch.market" },
  { value: "unsure", emoji: "🤔", labelKey: "mkt.quiz.ch.unsure" },
];

export const QUIZ_NEEDS: { value: string; emoji: string; labelKey: I18nKey }[] = [
  { value: "satellite", emoji: "🛰️", labelKey: "mkt.quiz.need.satellite" },
  { value: "ai", emoji: "🤖", labelKey: "mkt.quiz.need.ai" },
  { value: "weather", emoji: "🌦️", labelKey: "mkt.quiz.need.weather" },
  { value: "soil", emoji: "🧫", labelKey: "mkt.quiz.need.soil" },
  { value: "agronomist", emoji: "👨‍🌾", labelKey: "mkt.quiz.need.agronomist" },
  { value: "supplier", emoji: "📦", labelKey: "mkt.quiz.need.supplier" },
  // "ledger" and "reports" were dropped with the modules behind them (81660df). Old answers stored
  // in localStorage or users.onboarding may still carry those ids; nothing reads them back into a
  // label, so a stale id is simply ignored rather than rendered.
];

/** Countries the platform realistically serves today, plus the languages it speaks. Rendered with
 *  Intl.DisplayNames so a Polish visitor reads "Azerbejdżan", not "Azərbaycan". */
export const QUIZ_COUNTRY_CODES = [
  "AZ", "TR", "GE", "RU", "KZ", "UZ", "UA", "MD", "IR",
  "DE", "PL", "HU", "IT", "RO", "BG", "RS", "GR", "ES", "FR", "NL", "PT", "GB", "US",
];

/** Localized country name, falling back to the code when Intl has no data for it. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

export function loadAnswers(): QuizAnswers | null {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<QuizAnswers>;
    return { ...EMPTY_ANSWERS, ...p, needs: Array.isArray(p.needs) ? p.needs : [] };
  } catch {
    return null;
  }
}

export function saveAnswers(a: QuizAnswers): void {
  try {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(a));
  } catch {
    /* private mode — the quiz still works, it just isn't carried into signup */
  }
}

export function clearAnswers(): void {
  try {
    localStorage.removeItem(QUIZ_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Remember the boundary a signed-out visitor traced on the landing map.
 *
 * THE BUG THIS FIXES. The landing used to stash the polygon under its own localStorage key and the
 * field wizard read that key back. In local dev everything is one origin, so it worked and was
 * documented as working in three separate comments. In PRODUCTION the landing is agradex.com and
 * the wizard is app.agradex.com — different origins, therefore different localStorage — so the
 * read was `null` on EVERY real signup. The visitor traced their field, signed up, and was handed
 * a blank map to trace it again. That is the single worst onboarding loss in the OneSoil corpus,
 * and we had it.
 *
 * The quiz answers already survived that hop, because they take a server round-trip
 * (carryQuiz → POST /api/auth/onboarding → users.onboarding). The polygon now travels in the same
 * blob rather than inventing a second mechanism.
 *
 * `completed_at` is stamped here as well as by the quiz's finish(). carryQuiz() refuses to carry a
 * blob without it (an unfinished quiz is not an answer), and tracing a field is every bit as
 * deliberate an act as finishing the quiz — without this stamp, a visitor who drew a field but
 * skipped the quiz would still lose it.
 */
export function saveDraftField(polygon: unknown, areaHa: number | null): void {
  const a = loadAnswers() ?? { ...EMPTY_ANSWERS };
  a.draft_field = { polygon, area_ha: areaHa };
  a.completed_at = a.completed_at || new Date().toISOString();
  saveAnswers(a);
}
