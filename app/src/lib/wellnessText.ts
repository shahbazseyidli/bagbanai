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

/** Localized label for a wellness component key (ndvi | water | pest | gdd). */
export function wellnessLabel(key: string, fallback?: string | null): string {
  const s = tf(`app.wl.label.${key}`);
  return s === `app.wl.label.${key}` ? fallback || key : s;
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

  // pest.*, gdd.*, water.ndmi — direct one-key mappings.
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
    const label = tf(`app.wl.labelLower.${String(p.worst_key)}`);
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

/** Water-need recommendation sentence (weather.py water_requirements block). */
export function weatherRecommendation(
  code: string | null | undefined,
  params: Params,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? "";
  return tf(`app.weatherrec.${code}`, params ?? {});
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
