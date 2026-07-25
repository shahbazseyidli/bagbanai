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
  completed_at?: string;
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
  { value: "cost", emoji: "🧾", labelKey: "mkt.quiz.ch.cost" },
  { value: "market", emoji: "🤝", labelKey: "mkt.quiz.ch.market" },
  { value: "unsure", emoji: "🤔", labelKey: "mkt.quiz.ch.unsure" },
];

export const QUIZ_NEEDS: { value: string; emoji: string; labelKey: I18nKey }[] = [
  { value: "satellite", emoji: "🛰️", labelKey: "mkt.quiz.need.satellite" },
  { value: "ai", emoji: "🤖", labelKey: "mkt.quiz.need.ai" },
  { value: "weather", emoji: "🌦️", labelKey: "mkt.quiz.need.weather" },
  { value: "ledger", emoji: "📊", labelKey: "mkt.quiz.need.ledger" },
  { value: "soil", emoji: "🧫", labelKey: "mkt.quiz.need.soil" },
  { value: "agronomist", emoji: "👨‍🌾", labelKey: "mkt.quiz.need.agronomist" },
  { value: "supplier", emoji: "📦", labelKey: "mkt.quiz.need.supplier" },
  { value: "reports", emoji: "📄", labelKey: "mkt.quiz.need.reports" },
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
