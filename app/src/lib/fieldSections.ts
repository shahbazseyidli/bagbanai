// E14 — the field's section taxonomy, in one place.
//
// Replaces the old TabKey/TABS/GROUPS/GROUP_OF quartet that lived inside the field page. Two things
// forced the move: the desktop left panel now renders this menu (and the shell must not import a
// page), and GROUP_OF used to be a hand-maintained inverse of GROUPS — one forgotten line and
// `GROUPS.find(...)!` threw on render. Here the inverse is derived.
//
// Section keys are the ?tab= values. They were renamed with the redesign (overview→status,
// sentinel2→satellite, ai→analysis, nasa deleted) and there is deliberately NO alias table for the
// old names: the product has only test users, every internal link builder was updated with the
// rename, and a compatibility shim for a compatibility problem we do not have would outlive anyone
// who remembers why it exists. An unknown value still resolves to the first section — that is
// ordinary robustness against a truncated or hand-edited URL, not legacy support.
import type { I18nKey } from "@/lib/i18n";

export type SectionKey =
  | "status" | "satellite" | "analysis" | "weather" | "zones"
  | "tasks" | "fertilizer" | "photos" | "scouting" | "operations" | "yields" | "harvest"
  | "season" | "soil" | "metadata" | "documents";

export type GroupKey = "monitoring" | "work" | "records";

/** Icon name resolved to a component by the menu — kept as a string so this file stays pure data. */
export type IconName =
  | "pulse" | "satellite" | "analysis" | "weather" | "zones" | "tasks" | "fertilizer" | "photos"
  | "scouting" | "operations" | "yields" | "harvest" | "season" | "soil" | "metadata" | "documents";

export interface Section {
  key: SectionKey;
  labelKey: I18nKey;
  icon: IconName;
}

export interface SectionGroup {
  key: GroupKey;
  labelKey: I18nKey;
  sections: Section[];
}

// Order is the reading order of the menu. "status" is first and is the default.
export const SECTION_GROUPS: SectionGroup[] = [
  {
    key: "monitoring",
    labelKey: "app.field.group.monitoring",
    sections: [
      { key: "status", labelKey: "app.field.section.status", icon: "pulse" },
      { key: "satellite", labelKey: "app.field.section.satellite", icon: "satellite" },
      { key: "analysis", labelKey: "app.field.section.analysis", icon: "analysis" },
      { key: "weather", labelKey: "field.tab.weather", icon: "weather" },
      { key: "zones", labelKey: "field.tab.zones", icon: "zones" },
    ],
  },
  {
    key: "work",
    labelKey: "app.field.group.work",
    sections: [
      { key: "tasks", labelKey: "field.tab.tasks", icon: "tasks" },
      { key: "fertilizer", labelKey: "field.tab.fertilizer", icon: "fertilizer" },
      { key: "photos", labelKey: "field.tab.photos", icon: "photos" },
      { key: "scouting", labelKey: "field.tab.scouting", icon: "scouting" },
      { key: "operations", labelKey: "field.tab.operations", icon: "operations" },
      { key: "yields", labelKey: "field.tab.yields", icon: "yields" },
      { key: "harvest", labelKey: "field.tab.harvest", icon: "harvest" },
    ],
  },
  {
    key: "records",
    labelKey: "app.field.group.records",
    sections: [
      { key: "season", labelKey: "field.tab.season", icon: "season" },
      { key: "soil", labelKey: "field.tab.soil", icon: "soil" },
      { key: "metadata", labelKey: "field.tab.metadata", icon: "metadata" },
      { key: "documents", labelKey: "field.tab.documents", icon: "documents" },
    ],
  },
];

export const DEFAULT_SECTION: SectionKey = "status";

export const ALL_SECTIONS: Section[] = SECTION_GROUPS.flatMap((g) => g.sections);

/** Derived, never hand-written — the old hand-maintained inverse was a crash waiting to happen. */
export const GROUP_OF: Record<SectionKey, GroupKey> = Object.fromEntries(
  SECTION_GROUPS.flatMap((g) => g.sections.map((s) => [s.key, g.key])),
) as Record<SectionKey, GroupKey>;

export function sectionOf(key: SectionKey): Section {
  return ALL_SECTIONS.find((s) => s.key === key) ?? ALL_SECTIONS[0];
}

export function groupSections(key: GroupKey): Section[] {
  return SECTION_GROUPS.find((g) => g.key === key)?.sections ?? [];
}

/** ?tab= → a real section. Anything unrecognised opens the first section rather than erroring. */
export function resolveSection(raw: string | null | undefined): SectionKey {
  return ALL_SECTIONS.some((s) => s.key === raw) ? (raw as SectionKey) : DEFAULT_SECTION;
}

/** Build a link to a section while preserving every other query param (the sticky ?ui= flag). */
export function sectionHref(pathname: string, search: string, key: SectionKey): string {
  const sp = new URLSearchParams(search);
  sp.set("tab", key);
  return `${pathname}?${sp.toString()}`;
}
