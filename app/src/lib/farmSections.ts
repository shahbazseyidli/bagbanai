// The farm-management taxonomy, in one place — the same shape as lib/fieldSections.ts.
//
// Dəftər / Satış / Anbar / Texnika used to be four top-level rail destinations. They are four views
// of the same object (the farm business, not a field), and four of thirteen rail entries is a
// disproportionate share of the farmer's attention for records they open weekly at most. They now
// live as ?tab= sections of ONE container route, /farm. Nothing was removed: the four modules are
// the exact same components, one level down.
//
// Section keys are the ?tab= values AND the slugs of the old routes, so /sales → /farm?tab=sales is
// a mechanical mapping and the redirects in app/{ledger,sales,inventory,equipment}/page.tsx cannot
// drift from this list.
import type { I18nKey } from "@/lib/i18n";

export type FarmSectionKey = "ledger" | "sales" | "inventory" | "equipment";

/** Icon name resolved to a component by the page — kept as a string so this file stays pure data. */
export type FarmIconName = "ledger" | "sales" | "inventory" | "equipment";

export interface FarmSection {
  key: FarmSectionKey;
  /** Short chip label ("Dəftər"), reused from the rail vocabulary the farmer already learned. */
  labelKey: I18nKey;
  icon: FarmIconName;
}

// Order is the reading order of the chip row. "ledger" is first and is the default: it is the
// summary view (per-field P&L) the other three feed into.
export const FARM_SECTIONS: FarmSection[] = [
  { key: "ledger", labelKey: "app.shell.appRail.ledger", icon: "ledger" },
  { key: "sales", labelKey: "app.shell.appRail.sales", icon: "sales" },
  { key: "inventory", labelKey: "app.shell.appRail.inventory", icon: "inventory" },
  { key: "equipment", labelKey: "app.shell.appRail.equipment", icon: "equipment" },
];

export const DEFAULT_FARM_SECTION: FarmSectionKey = "ledger";

/** ?tab= → a real section. Anything unrecognised opens the first section rather than erroring. */
export function resolveFarmSection(raw: string | null | undefined): FarmSectionKey {
  return FARM_SECTIONS.some((s) => s.key === raw) ? (raw as FarmSectionKey) : DEFAULT_FARM_SECTION;
}

/** Build a link to a section while preserving every other query param (?org=, ?field=, ?ui=). */
export function farmSectionHref(pathname: string, search: string, key: FarmSectionKey): string {
  const sp = new URLSearchParams(search);
  sp.set("tab", key);
  return `${pathname}?${sp.toString()}`;
}
