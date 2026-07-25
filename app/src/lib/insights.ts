// Crop-aware narrative for the Overview ("İcmal") insight page. Turns raw index trends
// (from GET /api/fields/{id}/insights) into plain-language "what changed and what it means
// for YOUR crop" cards + a single headline health verdict. Fully deterministic (no LLM) so
// the page is instant and always available; the AI advice tab adds the deeper reasoning.

import { CROP_OPTIONS, optLabel } from "@/lib/metadataOptions";
import { indexLabel, interpret, type IndexNorms, type Tone } from "@/lib/indexStatus";
import { t } from "@/lib/i18n";

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
  if (!crop) return t("app.insights.yourCrop");
  const o = CROP_OPTIONS.find((c) => c.value === crop);
  return o ? optLabel(o) : crop;
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
function overSpan(tr: InsightTrend): string {
  return tr.days && tr.days > 0
    ? `${t("app.insights.overSpanDaysPre")}${tr.days}${t("app.insights.overSpanDaysPost")}`
    : t("app.insights.overSpanWeeks");
}

// Build one narrative card for a meaningfully-moved index. `crop` is the AZ label.
function cardFor(tr: InsightTrend, crop: string): ChangeCard | null {
  if (tr.prior == null || tr.delta == null) return null;
  const dir: Direction = tr.delta > 0 ? "up" : tr.delta < 0 ? "down" : "flat";
  const span = overSpan(tr);
  const move = `${span} ${fmt(tr.prior)} → ${fmt(tr.latest)} (${pctStr(tr.pct)})`;
  const base = { index: tr.index, latest: tr.latest, prior: tr.prior, pct: tr.pct, days: tr.days, direction: dir };

  if (VEG.has(tr.index)) {
    if (dir === "down") {
      const severe = (tr.pct != null && tr.pct <= -15) || tr.delta <= -0.12;
      return {
        ...base,
        tone: severe ? "bad" : "warn",
        headline: t("app.insights.veg.down.headline"),
        meaning: `${labelShort(tr.index)} ${move} ${t("app.insights.veg.down.meaningMid")} ${crop} ${t("app.insights.veg.down.meaningTail")}`,
        action: severe
          ? t("app.insights.veg.down.actionSevere")
          : t("app.insights.veg.down.actionMild"),
      };
    }
    if (dir === "up") {
      return {
        ...base,
        tone: "good",
        headline: t("app.insights.veg.up.headline"),
        meaning: `${labelShort(tr.index)} ${move} ${t("app.insights.veg.up.meaningMid")} ${crop} ${t("app.insights.veg.up.meaningTail")}`,
        action: t("app.insights.veg.up.action"),
      };
    }
  }

  if (tr.index === "NDMI") {
    if (dir === "down") {
      const severe = tr.latest < 0.2;
      return {
        ...base,
        tone: severe ? "bad" : "warn",
        headline: t("app.insights.ndmi.down.headline"),
        meaning: `${t("app.insights.ndmi.label")} ${move} ${t("app.insights.ndmi.down.meaningMid")} ${crop} ${t("app.insights.ndmi.down.meaningTail")}`,
        action: severe ? t("app.insights.ndmi.down.actionSevere") : t("app.insights.ndmi.down.actionMild"),
      };
    }
    if (dir === "up") {
      return {
        ...base, tone: "good", headline: t("app.insights.ndmi.up.headline"),
        meaning: `${t("app.insights.ndmi.label")} ${move} ${t("app.insights.ndmi.up.meaningTail")}`,
        action: t("app.insights.ndmi.up.action"),
      };
    }
  }

  if (tr.index === "NDWI") {
    if (dir === "up") {
      return {
        ...base, tone: "warn", headline: t("app.insights.ndwi.up.headline"),
        meaning: `${t("app.insights.ndwi.label")} ${move} ${t("app.insights.ndwi.up.meaningTail")}`,
        action: t("app.insights.ndwi.up.action"),
      };
    }
    return {
      ...base, tone: "good", headline: t("app.insights.ndwi.down.headline"),
      meaning: `${t("app.insights.ndwi.label")} ${move} ${t("app.insights.ndwi.down.meaningTail")}`,
      action: t("app.insights.ndwi.down.action"),
    };
  }

  return null;
}

function labelShort(index: string): string {
  // Only CIre uses a shorter form than its full label; the rest reuse indexLabel().
  return index === "CIre" ? t("app.idx.short.CIre") : indexLabel(index);
}

// Overall one-line health verdict, driven by the best available vegetation index.
function buildVerdict(trends: InsightTrend[], crop: string, norms: IndexNorms | null): Verdict | null {
  const order = ["NDVI", "EVI", "SAVI", "NDRE"];
  const veg = order.map((ix) => trends.find((tr) => tr.index === ix)).find(Boolean);
  if (!veg) return null;
  const st = interpret(veg.index, veg.latest, norms);
  const falling = veg.trend === "düşür";
  let tone: Tone = st.tone;
  let title: string;
  if (st.tone === "good" && !falling) {
    title = `${cap(crop)} ${t("app.insights.verdict.healthy")}`;
  } else if (st.tone === "good" && falling) {
    tone = "warn";
    title = `${cap(crop)} ${t("app.insights.verdict.healthyFalling")}`;
  } else if (st.tone === "warn") {
    title = `${cap(crop)} ${t("app.insights.verdict.moderate")}`;
  } else {
    title = `${cap(crop)} ${t("app.insights.verdict.weak")}`;
  }
  const trendWord = veg.trend === "yüksəlir"
    ? t("app.insights.trend.up")
    : veg.trend === "düşür"
      ? t("app.insights.trend.down")
      : t("app.insights.trend.flat");
  const sub = `${t("app.insights.sub.latestPre")}${labelShort(veg.index)}: ${fmt(veg.latest)} · ${st.status} · ${t("app.insights.sub.trendLabel")}${trendWord}` +
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
    .filter((tr) => tr.delta != null && Math.abs(tr.delta) >= (MOVE_THRESH[tr.index] ?? 0.05))
    .map((tr) => cardFor(tr, crop))
    .filter((c): c is ChangeCard => c != null)
    .sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0))
    .slice(0, 4);

  return { verdict, changes, usedSensor };
}
