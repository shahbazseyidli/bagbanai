// Shared vegetation/water index interpretation — plain-language status labels + tones.
// Used by the Overview ("İcmal") insight page, the per-sensor SatelliteTab, and the
// crop-aware narrative helper (insights.ts) so all three agree on what a value "means".

export type Tone = "good" | "warn" | "bad";

// Tone → colored dot + status-text Tailwind classes.
export const TONE: Record<Tone, { dot: string; text: string; bg: string; border: string }> = {
  good: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  bad: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

// Farmer-facing Azerbaijani index labels (FarmerApp-style names).
export const INDEX_LABELS: Record<string, string> = {
  NDVI: "Bitki sağlamlığı (NDVI)",
  EVI: "Gücləndirilmiş bitki (EVI)",
  SAVI: "Torpaq-düzəlişli (SAVI)",
  MSAVI: "Modifikasiyalı SAVI",
  NDMI: "Bitki nəmliyi (NDMI)",
  NDWI: "Su indeksi (NDWI)",
  NBR: "Yanğın indeksi (NBR)",
  NBR2: "Yanğın indeksi 2 (NBR2)",
  TVI: "Bitki örtüyü (TVI)",
  NDRE: "Red-edge sağlamlıq (NDRE)",
  CIre: "Xlorofil indeksi (CIre)",
};

// One-line plain-language explanation shown under a selector.
export const INDEX_INFO: Record<string, string> = {
  NDVI: "Bitkinin yaşıllığı və ümumi sağlamlığı. Yüksək = sağlam, sıx bitki örtüyü.",
  EVI: "NDVI-yə bənzər, sıx örtükdə daha həssas. Yüksək = güclü bitki.",
  SAVI: "Seyrək örtükdə torpağın təsirini azaldır. Cavan/seyrək əkin üçün yaxşıdır.",
  MSAVI: "Torpaq-düzəlişli indeksin təkmilləşdirilmiş variantı (çox seyrək örtük).",
  NDMI: "Bitkidəki su miqdarı. Yüksək = nəm, aşağı = su stresi (susuzluq).",
  NDWI: "Səthdə su/rütubət. Yüksək = su var (sulanma, gölməçə).",
  NBR: "Yanğın/quru sahə göstəricisi. Aşağı dəyər yanmış və ya quru ərazini göstərir.",
  NBR2: "Yanğın göstəricisinin ikinci variantı (bitki quruluğuna həssas).",
  TVI: "Bitki örtüyünün sıxlığı (transformasiya olunmuş NDVI).",
  NDRE: "Red-edge indeksi (yalnız Sentinel-2). Sıx çətirdə NDVI doyanda belə fərqi göstərir; azot statusuna həssasdır.",
  CIre: "Xlorofil indeksi (red-edge, yalnız Sentinel-2). Azot/xlorofil qiymətləndirməsi üçün daha həssas.",
};

// Legend gradient + labels per index family (must match the TiTiler colormap on the map).
export const INDEX_LEGEND: Record<string, { grad: string; low: string; mid: string; high: string }> = {
  veg: { grad: "linear-gradient(90deg,#d73027,#fee08b,#1a9850)", low: "Zəif", mid: "Orta", high: "Sağlam" },
  water: { grad: "linear-gradient(90deg,#b2182b,#f7f7f7,#2166ac)", low: "Quru", mid: "Orta", high: "Nəm" },
};

export function legendFor(index: string) {
  return index === "NDMI" || index === "NDWI" ? INDEX_LEGEND.water : INDEX_LEGEND.veg;
}

// Per-crop calibration bands for the vegetation indices (M5), fetched from /norms:
// { NDVI: [e1,e2,e3,e4], EVI: [...], ... } — edges split the 5 status tiers.
export type IndexNorms = Record<string, number[]>;

const VEG_TIERS: { status: string; note: string; tone: Tone }[] = [
  { status: "Çox zəif", note: "Çılpaq və ya çox seyrək örtük.", tone: "bad" },
  { status: "Zəif", note: "Seyrək bitki örtüyü.", tone: "warn" },
  { status: "Orta", note: "İnkişaf edən örtük.", tone: "warn" },
  { status: "Sağlam", note: "Sıx, sağlam bitki.", tone: "good" },
  { status: "Çox sağlam", note: "Çox sıx örtük.", tone: "good" },
];

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
    return VEG_TIERS[Math.min(tier, VEG_TIERS.length - 1)];
  }
  if (index === "NDMI") {
    if (value < 0) return { status: "Çox quru", note: "Su stresi.", tone: "bad" };
    if (value < 0.2) return { status: "Quraqlıq riski", note: "Nəmlik aşağı.", tone: "warn" };
    if (value <= 0.4) return { status: "Orta nəmlik", note: "Qənaətbəxş nəmlik.", tone: "good" };
    return { status: "Yaxşı nəmlik", note: "Kifayət qədər su.", tone: "good" };
  }
  if (index === "NDWI") {
    if (value < 0) return { status: "Quru", note: "Səthdə su yoxdur.", tone: "good" };
    return { status: "Nəm/su", note: "Səthdə su/rütubət var.", tone: "warn" };
  }
  // NBR (fire / dryness)
  if (value < 0.1) return { status: "Quru/yanıq riski", note: "Quru və ya yanmış ola bilər.", tone: "bad" };
  return { status: "Normal", note: "Normal vəziyyət.", tone: "good" };
}
