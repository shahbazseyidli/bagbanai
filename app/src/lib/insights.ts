// Crop-aware narrative for the Overview ("İcmal") insight page. Turns raw index trends
// (from GET /api/fields/{id}/insights) into plain-language "what changed and what it means
// for YOUR crop" cards + a single headline health verdict. Fully deterministic (no LLM) so
// the page is instant and always available; the AI advice tab adds the deeper reasoning.

import { CROP_OPTIONS } from "@/lib/metadataOptions";
import { interpret, type IndexNorms, type Tone } from "@/lib/indexStatus";

export interface InsightTrend {
  index: string;
  latest: number;
  latest_date: string | null;
  prior: number | null;
  prior_date: string | null;
  delta: number | null;
  pct: number | null;
  days: number | null;
  trend: "yüksəlir" | "düşür" | "sabit" | null;
  min_90d: number | null;
  max_90d: number | null;
}

export interface InsightsResponse {
  s2: InsightTrend[];
  hls: InsightTrend[];
  crop_type: string | null;
  calibrated: boolean;
  data_status: string;
}

export type Direction = "up" | "down" | "flat";

export interface ChangeCard {
  index: string;
  latest: number;
  prior: number | null;
  pct: number | null;
  days: number | null;
  direction: Direction;
  tone: Tone;
  headline: string;
  meaning: string;
  action: string;
}

export interface Verdict {
  title: string;
  sub: string;
  tone: Tone;
  index: string;
  latest: number;
  date: string | null;
}

/** crop_type value → Azerbaijani label (falls back to the raw value or a generic word). */
export function cropLabelOf(crop: string | null | undefined): string {
  if (!crop) return "əkininiz";
  return CROP_OPTIONS.find((o) => o.value === crop)?.label ?? crop;
}

// Minimum |Δ| for a move to be worth a card (below this it's noise / normal variation).
const MOVE_THRESH: Record<string, number> = {
  NDVI: 0.05, EVI: 0.05, SAVI: 0.05, NDRE: 0.04, CIre: 0.3, NDMI: 0.04, NDWI: 0.05,
};

const VEG = new Set(["NDVI", "EVI", "SAVI", "NDRE", "CIre"]);

function fmt(v: number): string {
  return v.toFixed(3);
}
function pctStr(pct: number | null): string {
  if (pct == null) return "";
  const s = pct > 0 ? `+${pct}` : `${pct}`;
  return `${s}%`;
}
function overSpan(t: InsightTrend): string {
  return t.days && t.days > 0 ? `son ${t.days} gündə` : "son həftələrdə";
}

// Build one narrative card for a meaningfully-moved index. `crop` is the AZ label.
function cardFor(t: InsightTrend, crop: string): ChangeCard | null {
  if (t.prior == null || t.delta == null) return null;
  const dir: Direction = t.delta > 0 ? "up" : t.delta < 0 ? "down" : "flat";
  const span = overSpan(t);
  const move = `${span} ${fmt(t.prior)} → ${fmt(t.latest)} (${pctStr(t.pct)})`;
  const base = { index: t.index, latest: t.latest, prior: t.prior, pct: t.pct, days: t.days, direction: dir };

  if (VEG.has(t.index)) {
    if (dir === "down") {
      const severe = (t.pct != null && t.pct <= -15) || t.delta <= -0.12;
      return {
        ...base,
        tone: severe ? "bad" : "warn",
        headline: `Bitki sağlamlığı düşür`,
        meaning: `${labelShort(t.index)} ${move} düşüb. ${crop} üçün bu — çətir stresi, su çatışmazlığı, azot çatışmazlığı və ya zərərverici/xəstəlik təsirinin ilkin əlaməti ola bilər.`,
        action: severe
          ? `Sahəni tez bir zamanda yoxlayın, suvarmanı və zərərverici izlərini nəzərdən keçirin. Lazım olsa aqronom məsləhəti alın.`
          : `Növbəti səhnələri izləyin və sahəni vizual yoxlayın; enmə davam edərsə suvarma/qidalanmanı gözdən keçirin.`,
      };
    }
    if (dir === "up") {
      return {
        ...base,
        tone: "good",
        headline: `Bitki sağlamlığı yaxşılaşır`,
        meaning: `${labelShort(t.index)} ${move} yüksəlib. ${crop} inkişaf edir — bitki örtüyü güclənir.`,
        action: `Cari qulluq rejimi işləyir — davam etdirin.`,
      };
    }
  }

  if (t.index === "NDMI") {
    if (dir === "down") {
      const severe = t.latest < 0.2;
      return {
        ...base,
        tone: severe ? "bad" : "warn",
        headline: `Bitki nəmliyi azalır`,
        meaning: `Bitki nəmliyi (NDMI) ${move} azalıb. ${crop} su stresi yaşaya bilər — torpaqda/bitkidə nəmlik düşür.`,
        action: severe ? `Suvarmanı planlaşdırın — nəmlik kritik həddə yaxındır.` : `Suvarma ehtiyacını yoxlayın və hava proqnozunu nəzərə alın.`,
      };
    }
    if (dir === "up") {
      return {
        ...base, tone: "good", headline: `Nəmlik bərpa olunur`,
        meaning: `Bitki nəmliyi (NDMI) ${move} artıb — su rejimi yaxşılaşıb.`,
        action: `Suvarma/yağış təsir edib; nəmliyi izləməyə davam edin.`,
      };
    }
  }

  if (t.index === "NDWI") {
    if (dir === "up") {
      return {
        ...base, tone: "warn", headline: `Səthdə su artıb`,
        meaning: `Su indeksi (NDWI) ${move} artıb — sahədə həddindən artıq sulanma, gölməçələr və ya drenaj problemi ola bilər.`,
        action: `Drenaji və sulanma normasını yoxlayın — köklərin batması riskini azaldın.`,
      };
    }
    return {
      ...base, tone: "good", headline: `Səth quruyub`,
      meaning: `Su indeksi (NDWI) ${move} azalıb — səthdəki artıq su çəkilib.`,
      action: `Xüsusi tədbir tələb olunmur.`,
    };
  }

  return null;
}

function labelShort(index: string): string {
  const m: Record<string, string> = {
    NDVI: "Bitki sağlamlığı (NDVI)", EVI: "Gücləndirilmiş bitki (EVI)", SAVI: "Torpaq-düzəlişli (SAVI)",
    NDRE: "Red-edge sağlamlıq (NDRE)", CIre: "Xlorofil (CIre)",
  };
  return m[index] ?? index;
}

// Overall one-line health verdict, driven by the best available vegetation index.
function buildVerdict(trends: InsightTrend[], crop: string, norms: IndexNorms | null): Verdict | null {
  const order = ["NDVI", "EVI", "SAVI", "NDRE"];
  const veg = order.map((ix) => trends.find((t) => t.index === ix)).find(Boolean);
  if (!veg) return null;
  const st = interpret(veg.index, veg.latest, norms);
  const falling = veg.trend === "düşür";
  let tone: Tone = st.tone;
  let title: string;
  if (st.tone === "good" && !falling) {
    title = `${cap(crop)} sağlam vəziyyətdədir`;
  } else if (st.tone === "good" && falling) {
    tone = "warn";
    title = `${cap(crop)} hələ sağlamdır, lakin son həftələrdə enmə müşahidə olunur`;
  } else if (st.tone === "warn") {
    title = `${cap(crop)} orta vəziyyətdədir — diqqət tələb olunur`;
  } else {
    title = `${cap(crop)} zəif vəziyyətdədir — yaxından baxış tövsiyə olunur`;
  }
  const trendWord = veg.trend === "yüksəlir" ? "yüksəlir ↑" : veg.trend === "düşür" ? "düşür ↓" : "sabit →";
  const sub = `Ən son ${labelShort(veg.index)}: ${fmt(veg.latest)} · ${st.status} · trend: ${trendWord}` +
    (veg.latest_date ? ` · ${veg.latest_date}` : "");
  return { title, sub, tone, index: veg.index, latest: veg.latest, date: veg.latest_date };
}

function cap(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("az") + s.slice(1) : s;
}

export interface BuiltInsights {
  verdict: Verdict | null;
  changes: ChangeCard[];
  usedSensor: "s2" | "hls" | null;
}

/** Prefer Sentinel-2 (10m); fall back to NASA HLS (30m) so the page shows whatever arrived
 * first. Returns a headline verdict + up to 4 change cards, most significant move first. */
export function buildInsights(resp: InsightsResponse | null, norms: IndexNorms | null): BuiltInsights {
  if (!resp) return { verdict: null, changes: [], usedSensor: null };
  const crop = cropLabelOf(resp.crop_type);
  const trends = resp.s2.length > 0 ? resp.s2 : resp.hls;
  const usedSensor: "s2" | "hls" | null = resp.s2.length > 0 ? "s2" : resp.hls.length > 0 ? "hls" : null;
  const verdict = buildVerdict(trends, crop, norms);

  const changes = trends
    .filter((t) => t.delta != null && Math.abs(t.delta) >= (MOVE_THRESH[t.index] ?? 0.05))
    .map((t) => cardFor(t, crop))
    .filter((c): c is ChangeCard => c != null)
    .sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0))
    .slice(0, 4);

  return { verdict, changes, usedSensor };
}
