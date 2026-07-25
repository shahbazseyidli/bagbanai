// Shared vegetation/water index interpretation — plain-language status labels + tones.
// Used by the Overview ("İcmal") insight page, the per-sensor SatelliteTab, and the
// crop-aware narrative helper (insights.ts) so all three agree on what a value "means".
//
// All farmer-facing strings are routed through t() at CALL TIME (never frozen at import),
// so the active locale set by LocaleProvider on the client is honoured.

import { t, type I18nKey } from "@/lib/i18n";

export type Tone = "good" | "warn" | "bad";

// Tone → colored dot + status-text Tailwind classes.
export const TONE: Record<Tone, { dot: string; text: string; bg: string; border: string }> = {
  good: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  bad: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

// The indices we carry farmer-facing labels/descriptions for. Consumers that iterate the
// index list can import this; accessors below fall back to the raw code for anything else.
export const INDEX_KEYS = [
  "NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI", "NDRE", "CIre",
] as const;

/** Farmer-facing localized index label (FarmerApp-style name); falls back to the raw code. */
export function indexLabel(index: string): string {
  return (INDEX_KEYS as readonly string[]).includes(index)
    ? t(`app.idx.label.${index}` as I18nKey)
    : index;
}

/** One-line plain-language explanation shown under a selector; "" when unknown (so the
 * caller's `indexInfo(x) && …` guard still works for indices without a description). */
export function indexInfo(index: string): string {
  return (INDEX_KEYS as readonly string[]).includes(index)
    ? t(`app.idx.info.${index}` as I18nKey)
    : "";
}

// Legend gradient per index family (must match the TiTiler colormap on the map). Labels are
// localized at call time via legendFor().
const LEGEND_GRAD: Record<"veg" | "water", string> = {
  veg: "linear-gradient(90deg,#d73027,#fee08b,#1a9850)",
  water: "linear-gradient(90deg,#b2182b,#f7f7f7,#2166ac)",
};

export function legendFor(index: string): { grad: string; low: string; mid: string; high: string } {
  const fam: "veg" | "water" = index === "NDMI" || index === "NDWI" ? "water" : "veg";
  return {
    grad: LEGEND_GRAD[fam],
    low: t(`app.idx.legend.${fam}.low` as I18nKey),
    mid: t(`app.idx.legend.${fam}.mid` as I18nKey),
    high: t(`app.idx.legend.${fam}.high` as I18nKey),
  };
}

// Per-crop calibration bands for the vegetation indices (M5), fetched from /norms:
// { NDVI: [e1,e2,e3,e4], EVI: [...], ... } — edges split the 5 status tiers.
export type IndexNorms = Record<string, number[]>;

// Tone per vegetation tier index (0..4). Status/note text is localized in vegTier().
const VEG_TIER_TONES: Tone[] = ["bad", "warn", "warn", "good", "good"];

function vegTier(tier: number): { status: string; note: string; tone: Tone } {
  const i = Math.min(Math.max(tier, 0), VEG_TIER_TONES.length - 1);
  return {
    status: t(`app.idx.tier.${i}.status` as I18nKey),
    note: t(`app.idx.tier.${i}.note` as I18nKey),
    tone: VEG_TIER_TONES[i],
  };
}

// Vegetation-family indices (NDVI/EVI/SAVI/NDRE/CIre) share the tiered band edges; NDMI/NDWI/NBR
// have their own fixed thresholds. `norms` (per-crop) calibrates the vegetation edges; absent →
// universal fallback edges are used.
export function interpret(
  index: string,
  value: number,
  norms?: IndexNorms | null,
): { status: string; note: string; tone: Tone } {
  if (index === "NDVI" || index === "EVI" || index === "SAVI" || index === "NDRE" || index === "CIre") {
    const fallback = index === "CIre" ? [0.5, 1.0, 1.8, 2.8] : [0.2, 0.4, 0.6, 0.8];
    const edges = norms?.[index] ?? fallback;
    let tier = 0;
    while (tier < edges.length && value >= edges[tier]) tier += 1;
    return vegTier(tier);
  }
  if (index === "NDMI") {
    if (value < 0) return { status: t("app.idx.ndmi.veryDry.status"), note: t("app.idx.ndmi.veryDry.note"), tone: "bad" };
    if (value < 0.2) return { status: t("app.idx.ndmi.droughtRisk.status"), note: t("app.idx.ndmi.droughtRisk.note"), tone: "warn" };
    if (value <= 0.4) return { status: t("app.idx.ndmi.moderate.status"), note: t("app.idx.ndmi.moderate.note"), tone: "good" };
    return { status: t("app.idx.ndmi.good.status"), note: t("app.idx.ndmi.good.note"), tone: "good" };
  }
  if (index === "NDWI") {
    if (value < 0) return { status: t("app.idx.ndwi.dry.status"), note: t("app.idx.ndwi.dry.note"), tone: "good" };
    return { status: t("app.idx.ndwi.wet.status"), note: t("app.idx.ndwi.wet.note"), tone: "warn" };
  }
  // NBR (fire / dryness)
  if (value < 0.1) return { status: t("app.idx.nbr.dryBurn.status"), note: t("app.idx.nbr.dryBurn.note"), tone: "bad" };
  return { status: t("app.idx.nbr.normal.status"), note: t("app.idx.nbr.normal.note"), tone: "good" };
}
