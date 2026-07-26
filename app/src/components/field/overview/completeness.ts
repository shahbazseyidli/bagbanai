// Field-passport completeness — the one place that decides WHICH missing metadata is worth asking
// for, in WHICH order, and WHAT it unlocks.
//
// The AI's whole value depends on this metadata: without a planting date it cannot reason about the
// growth stage, without an irrigation method it cannot size a water recommendation, without a soil
// type it cannot put a number on a fertilizer dose, and without a district it cannot resolve the
// local knowledge zone (services/app/ai/knowledge.py resolve_zone) that carries frost dates and pest
// models. Only crop_type is mandatory (enforced in the wizard at step 2 and in PUT /metadata); the
// rest is optional BY DESIGN — a farmer must never be walled in — so the product asks for it later,
// quietly, ranked by impact, at most two at a time.
//
// Shared by MetadataNudge (the strip on the field-status section), FieldOnboarding (the step-4
// "still empty" note) and OnboardingChecklist (the profile-completeness step) so the wording and the
// ranking can never drift apart.
import type { FieldMetadata } from "@/lib/types";

/** The metadata keys worth nudging for. Anything else is genuinely nice-to-have. */
export type GapKey = "planting_date" | "irrigation_method" | "soil_type" | "region";

export interface MetaGap {
  key: GapKey;
  /** i18n key: the imperative one-liner ("Əkin tarixini əlavə et"). */
  actionKey: string;
  /** i18n key: what filling it unlocks, in the farmer's terms — never a feature name. */
  unlockKey: string;
  /** Honest time estimate for the inline control, in seconds. Shown as "≈15 saniyə". */
  seconds: number;
}

/**
 * Ranked by how much the AI actually gains, highest impact first. Do not reorder without a reason:
 * the strip shows only the first MAX_GAPS entries that are still empty.
 */
export const META_GAPS: MetaGap[] = [
  {
    key: "planting_date",
    actionKey: "app.field.meta.gap.planting_date.action",
    unlockKey: "app.field.meta.gap.planting_date.unlock",
    seconds: 15,
  },
  {
    key: "irrigation_method",
    actionKey: "app.field.meta.gap.irrigation_method.action",
    unlockKey: "app.field.meta.gap.irrigation_method.unlock",
    seconds: 10,
  },
  {
    key: "soil_type",
    actionKey: "app.field.meta.gap.soil_type.action",
    unlockKey: "app.field.meta.gap.soil_type.unlock",
    seconds: 10,
  },
  {
    key: "region",
    actionKey: "app.field.meta.gap.region.action",
    unlockKey: "app.field.meta.gap.region.unlock",
    seconds: 5,
  },
];

/** Never ask for more than this at once — a list of everything missing reads as a chore list. */
export const MAX_GAPS = 2;

function isEmpty(v: unknown): boolean {
  return v == null || (typeof v === "string" && v.trim() === "");
}

/**
 * Which ranked gaps are still open, highest impact first.
 * A field with no metadata row at all (meta === null) has every gap open.
 */
export function missingMetaGaps(meta: FieldMetadata | null | undefined): MetaGap[] {
  if (!meta) return [...META_GAPS];
  return META_GAPS.filter((g) => isEmpty(meta[g.key]));
}

/** The two (at most) gaps the UI should actually surface. */
export function topMetaGaps(meta: FieldMetadata | null | undefined): MetaGap[] {
  return missingMetaGaps(meta).slice(0, MAX_GAPS);
}
