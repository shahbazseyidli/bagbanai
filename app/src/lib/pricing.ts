// Public pricing model (marketing). Mirrors services/app/tiers.py; keep in sync.
// Feature rows carry i18n KEYS (not az text) so PricingTable renders them in the visitor's locale;
// they reuse the mkt.compare.* keys the comparison table already defines (same info, one source).
import type { I18nKey } from "@/lib/i18n";

// The package name and the price unit are i18n KEYS, not text: hard-coded "Paket 2" / "AZN/ay"
// rendered literally on the English, German, Italian… pricing page ("ay" is Azerbaijani for month).
// The amount stays in AZN because that is the currency actually billed.
export interface Package {
  id: "free" | "pro" | "business";
  nameKey: I18nKey;
  emoji: string;
  price: string;
  periodKey: I18nKey;
  highlight?: boolean; // the recommended package
}

export const PACKAGES: Package[] = [
  { id: "free", nameKey: "mkt.pkg.name1", emoji: "🆓", price: "0", periodKey: "mkt.pkg.priceUnit" },
  { id: "pro", nameKey: "mkt.pkg.name2", emoji: "💚", price: "10", periodKey: "mkt.pkg.priceUnitMonth", highlight: true },
  { id: "business", nameKey: "mkt.pkg.name3", emoji: "💎", price: "25", periodKey: "mkt.pkg.priceUnitMonth" },
];

// A tier either excludes a feature (off) or includes it, optionally with a short detail (noteKey).
export type FeatureCell = { on: false } | { on: true; note?: I18nKey };
export interface FeatureRow {
  labelKey: I18nKey;
  tiers: [FeatureCell, FeatureCell, FeatureCell]; // free, pro, business
  soon?: boolean; // feature is rolling out
}

const ON: FeatureCell = { on: true };
const OFF: FeatureCell = { on: false };

// Order matches the agreed comparison table; keys are shared with PricingCompare's ROWS.
export const FEATURES: FeatureRow[] = [
  { labelKey: "mkt.compare.rowFields", tiers: [{ on: true, note: "mkt.compare.noteFields1" }, { on: true, note: "mkt.compare.noteFields2" }, { on: true, note: "mkt.compare.noteFields3" }] },
  { labelKey: "mkt.compare.rowMonitoring", tiers: [{ on: true, note: "mkt.compare.noteMon1" }, { on: true, note: "mkt.compare.noteMon2" }, { on: true, note: "mkt.compare.noteMon2" }] },
  { labelKey: "mkt.compare.rowIndices", tiers: [ON, { on: true, note: "mkt.compare.noteIdx2" }, { on: true, note: "mkt.compare.noteIdx2" }] },
  { labelKey: "mkt.compare.rowRaster", tiers: [ON, ON, ON] },
  { labelKey: "mkt.compare.rowWeather", tiers: [ON, ON, ON] },
  { labelKey: "mkt.compare.rowFieldMgmt", tiers: [ON, ON, ON] },
  { labelKey: "mkt.compare.rowAdvice", tiers: [{ on: true, note: "mkt.compare.perMonth1Gift" }, { on: true, note: "mkt.compare.perMonth8" }, { on: true, note: "mkt.compare.perMonth30" }] },
  { labelKey: "mkt.compare.rowChat", tiers: [OFF, { on: true, note: "mkt.compare.perMonth50" }, { on: true, note: "mkt.compare.perMonth300" }] },
  { labelKey: "mkt.compare.rowPassport", tiers: [OFF, ON, ON] },
  { labelKey: "mkt.compare.rowSpray", tiers: [OFF, ON, ON] },
  { labelKey: "mkt.compare.rowIrrigation", tiers: [OFF, ON, ON] },
  { labelKey: "mkt.pkg.notifLabel", tiers: [{ on: true, note: "mkt.pkg.notifInapp" }, { on: true, note: "mkt.pkg.notifEmail" }, { on: true, note: "mkt.pkg.notifWhatsapp" }] },
  { labelKey: "mkt.compare.rowPest", tiers: [OFF, OFF, ON], soon: true },
  { labelKey: "mkt.compare.rowPhoto", tiers: [OFF, OFF, { on: true, note: "mkt.compare.perMonth30" }], soon: true },
  { labelKey: "mkt.compare.rowFertilizer", tiers: [OFF, OFF, ON], soon: true },
  { labelKey: "mkt.compare.rowBenchmark", tiers: [OFF, OFF, ON], soon: true },
  { labelKey: "mkt.compare.rowResearch", tiers: [{ on: true, note: "mkt.compare.noteResearchGlobalReg" }, { on: true, note: "mkt.compare.noteResearchGlobalReg" }, { on: true, note: "mkt.compare.noteResearchLocal" }] },
];
