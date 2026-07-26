// Renderers for backend-generated, machine-coded prose.
//
// The backend (services/app/ai/{wellness,pest,weather}.py) emits, alongside the legacy Azerbaijani
// sentence, a stable `*_code` + a `*_params` dict of raw numbers/enums. These helpers turn that
// code+params into a sentence in the viewer's active locale via tf(). Every function falls back to
// the supplied AZ prose string when no code is present (older payloads / unknown codes), so nothing
// ever breaks — the localization is purely additive.
import { tf } from "@/lib/i18n";

type Params = Record<string, unknown> | null | undefined;

// ── Field Wellness ─────────────────────────────────────────────────────────────────────────────

/**
 * Localized label for a wellness component key (ndvi | water | pest | gdd).
 *
 * `labelCode` overrides the key when the backend scored the component from a STAND-IN signal
 * instead of its real measurement (PROXY RULE #2 in services/app/ai/wellness.py): NDMI substituting
 * for the FAO-56 soil-water balance is labelled "Peyk nəmlik siqnalı", never "Su balansı", so the
 * card never claims a measurement the platform did not make.
 */
export function wellnessLabel(key: string, fallback?: string | null, labelCode?: string | null): string {
  const k = `app.wl.label.${labelCode || key}`;
  const s = tf(k);
  if (s !== k) return s;
  // Unknown proxy code (older payload / newer backend): fall back to the plain component label
  // rather than the raw code, but keep the backend's own AZ prose ahead of the bare key.
  if (labelCode) return wellnessLabel(key, fallback);
  return fallback || key;
}

/**
 * Render a component reason. `veg` is a COMPOSITE assembled from base + optional parts (crop
 * calibration, baseline position, trend direction derived from delta). All others map directly to
 * one key. `fallback` is the backend AZ prose used when there is no code.
 */
export function wellnessReason(
  code: string | null | undefined,
  params: Params,
  extra: Record<string, unknown> | null | undefined,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";

  if (code === "veg") {
    let s = tf("app.wl.veg.base", params ?? {});
    if (extra?.calibrated && (params as Record<string, unknown> | null)?.crop) {
      s += tf("app.wl.veg.calibrated", params ?? {});
    }
    const bl = extra?.baseline;
    if (bl === "below" || bl === "above" || bl === "within") {
      s += tf(`app.wl.veg.baseline.${bl}`);
    }
    const d = extra?.delta;
    if (typeof d === "number") {
      const dir = d > 0.03 ? "up" : d < -0.03 ? "down" : "flat";
      s += tf(`app.wl.veg.trend.${dir}`);
    }
    return `${s}.`;
  }

  if (code === "water.sufficient" || code === "water.critical") {
    let s = tf(`app.wl.${code}`, params ?? {});
    if ((params as Record<string, unknown> | null)?.reco != null) {
      s += tf("app.wl.water.recoSuffix", params ?? {});
    }
    return s;
  }

  if (code === "water.ndmi") {
    // A proxy has to say so out loud. The sentence names the signal and adds the caveat that it is
    // an approximation of the soil-water balance, not the balance itself.
    return `${tf("app.wl.water.ndmi", params ?? {})} ${tf("app.wl.water.ndmiProxyNote")}`;
  }

  // pest.*, gdd.* — direct one-key mappings.
  return tf(`app.wl.${code}`, params ?? {});
}

/** Render the overall wellness headline from its code+params (worst_key → localized label). */
export function wellnessHeadline(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  const p = (params ?? {}) as Record<string, unknown>;
  if (code === "headline.warn.worst" || code === "headline.bad.worst") {
    // `worst_label_code` is set when the named component was scored from a proxy — it gets its own
    // name in the verdict too (PROXY RULE #2), so the headline can never say "water balance" about
    // a balance that was never computed.
    const lc = p.worst_label_code ? String(p.worst_label_code) : String(p.worst_key);
    let label = tf(`app.wl.labelLower.${lc}`);
    if (label === `app.wl.labelLower.${lc}`) label = tf(`app.wl.labelLower.${String(p.worst_key)}`);
    return tf(`app.wl.${code}`, { ...p, label });
  }
  return tf(`app.wl.${code}`, p);
}

// ── Pest risk candidates ───────────────────────────────────────────────────────────────────────

export function pestRiskTitle(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  return tf(`app.${code}`, params ?? {});
}

export function pestRiskBody(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  const p = (params ?? {}) as Record<string, unknown>;
  const kind = tf(`app.pestrisk.kind.${String(p.kind_key)}`);
  return tf(`app.${code}`, { ...p, kind });
}

// ── Weather recommendations / spray reasons / alerts ─────────────────────────────────────────────

/**
 * Water-need recommendation sentence — the coarse 7-day one (weather.py) or the FAO-56 one that
 * replaces it (irrigation.py), plus the NDMI cross-check line.
 */
export function weatherRecommendation(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  const key = `app.weatherrec.${code}`;
  const s = tf(key, params ?? {});
  // A code this build has no copy for must show the server's sentence, never the raw key.
  return s === key ? fallback ?? "" : s;
}

/** One spray-suitability reason (from a graded hour's reason_codes). */
export function sprayReason(code: string, fallback?: string | null): string {
  const s = tf(`app.weatherrec.${code}`);
  return s === `app.weatherrec.${code}` ? fallback ?? code : s;
}

/** A frost/heat/wind alert detail line (compute_alerts). */
export function weatherAlert(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  return tf(`app.weatherrec.${code}`, params ?? {});
}

// ── Rain nowcast ───────────────────────────────────────────────────────────────────────────────

/** The spray verdict of the rain-nowcast strip (routers/nowcast.py). */
export function nowcastVerdict(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  const key = `app.${code}`;
  const s = tf(key, params ?? {});
  // An unknown code must never leak a raw key onto the strip — show the server sentence instead.
  return s === key ? fallback ?? "" : s;
}

// ── Season comparison (A5) ─────────────────────────────────────────────────────────────────────

/** The same-DOY verdict against last season (routers/analytics.py `_verdict`). */
export function seasonCompareSentence(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  const key = `app.${code}`;
  const s = tf(key, params ?? {});
  return s === key ? fallback ?? "" : s;
}

// ── Frost climatology (B18) ────────────────────────────────────────────────────────────────────

type FrostParams = {
  years?: number;
  thr?: number;
  spring_mmdd?: string;
  safe_mmdd?: string;
  autumn_mmdd?: string;
  window_start_mmdd?: string;
  window_end_mmdd?: string;
  window_days?: number;
  frost_free_days?: number;
};

/** 'MM-DD' → '12 apr' using the active locale's short month names. */
function mmdd(value: string | undefined): string {
  if (!value || value.length < 5) return "—";
  const m = Number(value.slice(0, 2));
  const d = Number(value.slice(3, 5));
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return "—";
  const months = tf("app.date.monthsShort").split(",");
  return `${d} ${(months[m - 1] ?? "").trim()}`;
}

/**
 * The frost-climatology summary. `frost.summary` is a composite: the spring clause is always
 * present and the optional clauses are appended only when the backend sent their params.
 */
export function frostSentence(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  if (code === "frost.unavailable") return tf("app.frostclim.unavailable");
  const p = (params ?? {}) as FrostParams;
  if (code === "frost.none") return tf("app.frostclim.none", { years: p.years, thr: p.thr });
  if (code !== "frost.summary") return fallback ?? "";

  const clauses = [tf("app.frostclim.spring", {
    years: p.years, thr: p.thr, date: mmdd(p.spring_mmdd),
  })];
  if (p.safe_mmdd) clauses.push(tf("app.frostclim.safe", { date: mmdd(p.safe_mmdd) }));
  if (p.autumn_mmdd) clauses.push(tf("app.frostclim.autumn", { date: mmdd(p.autumn_mmdd) }));
  let out = `${clauses.join(", ")}.`;
  if (p.window_start_mmdd && p.window_end_mmdd) {
    out += ` ${tf("app.frostclim.window", {
      start: mmdd(p.window_start_mmdd), end: mmdd(p.window_end_mmdd), days: p.window_days,
    })}`;
  }
  if (p.frost_free_days) {
    out += ` ${tf("app.frostclim.frostFree", { days: p.frost_free_days })}`;
  }
  return out;
}
