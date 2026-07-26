"use client";

/**
 * Local area units — the single source of truth for how a field's size is SHOWN.
 *
 * Everything the platform stores and computes stays in hectares (`fields.area_ha`, the geo
 * pipeline, the fertilizer/water models, the AI context). This module only converts at the last
 * moment, on the way to the screen, because a farmer does not think in the storage unit:
 *
 *   - Turkey counts land in **dönüm** (= dekar). The tapu (land registry) is written in dönüm, so a
 *     Turkish farmer reading "1.36 ha" has to do arithmetic before the number means anything.
 *   - Azerbaijan is officially hectares (EKTİS) but everyday speech uses **sot / sotka** for small
 *     plots — "beş sot bağ", not "0.05 hektar".
 *
 * Showing everyone hectares is a quiet "this app was not built for me" signal, so the unit is a
 * per-user preference (`users.area_unit`, nullable = follow my country's default).
 *
 * Client-only: the labels come from t(), which resolves against the locale registered in
 * LocaleProvider. Server Components must not call formatArea() — pass the number down and format
 * it in a client component, the same rule that applies to t() everywhere else.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getLocale, t, type I18nKey } from "@/lib/i18n";

export type AreaUnit = "ha" | "donum" | "sotka";

/**
 * Exact definitions. All three are metric and exact — no rounding enters the conversion chain.
 *
 *   ha    hectare       = 10 000 m² = 1 ha      SI-derived; the unit everything is stored in and
 *                                               Azerbaijan's official cadastral unit (EKTİS).
 *   donum dönüm / dekar =  1 000 m² = 0.1 ha    The modern Turkish dönüm, defined by law as one
 *                                               dekar and used by the tapu. (The historical
 *                                               Ottoman "eski dönüm" of ~919 m² is NOT used.)
 *   sotka sotka / ar    =    100 m² = 0.01 ha   The post-Soviet everyday unit for small plots
 *                                               (1 sotka = 1 ar = one hundredth of a hectare).
 */
export const M2_PER_UNIT: Record<AreaUnit, number> = { ha: 10_000, donum: 1_000, sotka: 100 };

/** How many of `unit` make one hectare — the multiplier used to convert out of storage. */
export const UNITS_PER_HA: Record<AreaUnit, number> = { ha: 1, donum: 10, sotka: 100 };

/**
 * Decimals per unit, chosen so the displayed number carries roughly the same real precision (~10 m²
 * or better) in every unit. A farmer does not want to read "13.60 dönüm" or "136.00 sotka" — the
 * extra zeros are noise, not accuracy.
 */
export const AREA_DECIMALS: Record<AreaUnit, number> = { ha: 2, donum: 1, sotka: 0 };

/** Ordered list for the settings picker: default first, then smaller units. */
export const AREA_UNITS: AreaUnit[] = ["ha", "donum", "sotka"];

export function isAreaUnit(v: unknown): v is AreaUnit {
  return v === "ha" || v === "donum" || v === "sotka";
}

/* ------------------------------------------------------------------ conversion */

/** Hectares → the given unit. Pure number, no formatting. */
export function toUnit(ha: number, unit: AreaUnit): number {
  return ha * UNITS_PER_HA[unit];
}

/** The given unit → hectares. For input fields: the farmer types dönüm, we store ha. */
export function fromUnit(value: number, unit: AreaUnit): number {
  return value / UNITS_PER_HA[unit];
}

/* ------------------------------------------------------------------ formatting */

const _fmtCache = new Map<string, Intl.NumberFormat>();

function formatter(unit: AreaUnit, decimals: number): Intl.NumberFormat {
  const locale = getLocale();
  const key = `${locale}:${unit}:${decimals}`;
  let f = _fmtCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      f = new Intl.NumberFormat("en", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    _fmtCache.set(key, f);
  }
  return f;
}

/** Shown instead of a number when the area is unknown. */
export const AREA_PLACEHOLDER = "—";

/**
 * The number only, localized (decimal separator follows the active locale: "1,36" in tr/de).
 * Returns AREA_PLACEHOLDER for null/undefined/NaN so callers never render "NaN ha".
 *
 * Guard: a plot small enough to round to zero at the unit's normal precision (e.g. 0.004 ha shown
 * in hectares) gets up to two extra decimals rather than being displayed as "0.00" — a real field
 * must never look like it has no area.
 */
export function formatAreaNumber(ha: number | null | undefined, unit: AreaUnit): string {
  if (ha === null || ha === undefined || !Number.isFinite(ha)) return AREA_PLACEHOLDER;
  const value = toUnit(ha, unit);
  let decimals = AREA_DECIMALS[unit];
  if (value > 0) {
    while (decimals < AREA_DECIMALS[unit] + 2 && Number(value.toFixed(decimals)) === 0) decimals += 1;
  }
  return formatter(unit, decimals).format(value);
}

/**
 * The full display string: number + localized unit label, e.g. "1.36 ha", "13.6 dönüm", "136 sot".
 * This is what almost every call site wants.
 */
export function formatArea(ha: number | null | undefined, unit: AreaUnit): string {
  const n = formatAreaNumber(ha, unit);
  if (n === AREA_PLACEHOLDER) return AREA_PLACEHOLDER; // no unit on an unknown area
  return `${n} ${areaUnitLabel(unit)}`;
}

/** Short suffix shown next to a number ("ha", "dönüm", "sot"). */
export function areaUnitLabel(unit: AreaUnit): string {
  return t(`unit.${unit}` as I18nKey);
}

/** Full name for the settings picker ("Hektar", "Dönüm", "Sot"). */
export function areaUnitName(unit: AreaUnit): string {
  return t(`unit.${unit}.name` as I18nKey);
}

/** One-line explanation under the picker option ("1 000 m² (dekar) — …"). */
export function areaUnitHint(unit: AreaUnit): string {
  return t(`unit.${unit}.hint` as I18nKey);
}

/* ------------------------------------------------------------------ defaults */

/**
 * The unit to use when the farmer has expressed no preference.
 *
 * Turkey (country "TR" or the tr locale) → dönüm, because the land registry itself is in dönüm.
 * Everything else → hectares: Azerbaijan, Georgia, Kazakhstan and the EU all keep official records
 * in hectares, and hectares is what the platform stores.
 *
 * **sotka is deliberately never a default.** It only reads well below roughly one hectare — a 40 ha
 * wheat field rendered as "4000 sot" is worse than useless — so it stays an explicit opt-in for
 * farmers whose plots are genuinely small (orchards, greenhouses, household plots).
 */
export function defaultAreaUnit(country?: string | null, locale?: string): AreaUnit {
  const c = (country || "").trim().toUpperCase();
  if (c === "TR" || c === "TUR" || c === "TURKEY" || c === "TÜRKIYE" || c === "TÜRKİYE") return "donum";
  if (c) return "ha"; // an explicit country other than Turkey wins over the interface language
  if ((locale || "").slice(0, 2).toLowerCase() === "tr") return "donum";
  return "ha";
}

/* ------------------------------------------------------------------ preference */

const CACHE_KEY = "agradex_area_unit";
/** Fired on the window whenever the preference changes, so every mounted hook re-renders. */
export const AREA_UNIT_EVENT = "agradex-area-unit";

// In-memory mirror of the cache. Set on the first read of a page load and kept in sync afterwards,
// so the SECOND and every later component to mount already has the right unit in its initial state
// and never paints hectares for a frame.
let _mem: AreaUnit | null = null;
let _fetched = false;

function readCache(): AreaUnit | null {
  if (_mem) return _mem;
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CACHE_KEY);
    if (isAreaUnit(v)) {
      _mem = v;
      return v;
    }
  } catch {
    /* private mode / disabled storage */
  }
  return null;
}

function writeCache(unit: AreaUnit): void {
  _mem = unit;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, unit);
  } catch {
    /* ignore */
  }
}

/** Forget the cached unit — call on logout so the next account does not inherit it. */
export function clearAreaUnitCache(): void {
  _mem = null;
  _fetched = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Best-known unit RIGHT NOW, synchronously: the cached preference, else the locale default.
 * For non-React code (chart tooltips, CSV/report builders, map popups) that cannot use the hook.
 */
export function currentAreaUnit(): AreaUnit {
  return readCache() ?? defaultAreaUnit(null, getLocale());
}

interface AreaUnitResponse {
  /** What the user explicitly chose, or null = "follow my country". */
  unit: AreaUnit | null;
  /** What to actually display — the choice, or the server-computed country default. */
  effective: AreaUnit;
}

/** Pull the preference from the account and refresh the cache. Silent on 401 (signed out). */
export async function refreshAreaUnit(): Promise<AreaUnit> {
  try {
    const res = await api.get<AreaUnitResponse>("/api/auth/area-unit");
    const eff = isAreaUnit(res?.effective) ? res.effective : currentAreaUnit();
    if (eff !== _mem) {
      writeCache(eff);
      if (typeof window !== "undefined") window.dispatchEvent(new Event(AREA_UNIT_EVENT));
    }
    return eff;
  } catch {
    return currentAreaUnit();
  }
}

/**
 * Save the farmer's choice. `null` means "use the default for my country" — the server clears the
 * column and answers with the effective unit. The cache and every mounted hook update immediately
 * (optimistically) so the settings toggle feels instant.
 */
export async function setAreaUnit(unit: AreaUnit | null): Promise<AreaUnit> {
  if (unit) {
    writeCache(unit);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(AREA_UNIT_EVENT));
  }
  try {
    const res = await api.post<AreaUnitResponse>("/api/auth/area-unit", { unit });
    const eff = isAreaUnit(res?.effective) ? res.effective : (unit ?? currentAreaUnit());
    writeCache(eff);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(AREA_UNIT_EVENT));
    return eff;
  } catch {
    return currentAreaUnit();
  }
}

/**
 * The unit to render with. Re-renders when the preference changes anywhere in the app.
 *
 * First mount of a page load: paints the locale default, then swaps in the cached value and
 * reconciles with the account once. Every later mount starts from the in-memory cache, so switching
 * screens never flashes the wrong unit.
 */
export function useAreaUnit(): AreaUnit {
  const [unit, setUnit] = useState<AreaUnit>(() => _mem ?? "ha");

  useEffect(() => {
    const sync = () => setUnit(currentAreaUnit());
    sync();
    if (!_fetched) {
      _fetched = true;
      void refreshAreaUnit();
    }
    window.addEventListener(AREA_UNIT_EVENT, sync);
    return () => window.removeEventListener(AREA_UNIT_EVENT, sync);
  }, []);

  return unit;
}

/**
 * Convenience for the common `useAreaUnit()` + `formatArea()` pair.
 * `const fmt = useFormatArea(); … fmt(field.area_ha)`
 */
export function useFormatArea(): (ha: number | null | undefined) => string {
  const unit = useAreaUnit();
  return (ha) => formatArea(ha, unit);
}
