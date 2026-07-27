// Which map layers exist, in which order a farmer meets them, and which heading they sit under.
//
// The ORDER is not alphabetical and not the sensor's declaration order: it is the order in which
// the three layers a farmer actually acts on come first (cover, nitrogen, moisture — exactly the
// trio FieldMapCard used to hard-code as chips), then the rest of the vegetation family, then the
// water and burn indices. A picker is a list someone reads top-down; the first row must be the one
// they wanted.

import { t } from "@/lib/i18n";

export const LAYER_ORDER = [
  "NDVI", "NDRE", "NDMI", "NDWI", "EVI", "SAVI", "MSAVI", "CIre", "NBR", "NBR2",
];

/**
 * The caller's index list, sorted by LAYER_ORDER. Anything this file has not heard of is APPENDED
 * in the caller's own order, never dropped: SENSOR_INDICES is the source of truth for what exists
 * (TVI is HLS-only and deliberately absent above), and a new index must show up in the picker even
 * on the day it ships, before anyone remembers to rank it here.
 */
export function orderLayers(indices: string[]): string[] {
  const known: string[] = [];
  const unranked: string[] = [];
  for (const ix of indices) {
    if (LAYER_ORDER.includes(ix)) known.push(ix);
    else unranked.push(ix);
  }
  known.sort((a, b) => LAYER_ORDER.indexOf(a) - LAYER_ORDER.indexOf(b));
  return [...known, ...unranked];
}

export type LayerGroup = "veg" | "water" | "burn";

/**
 * The heading a layer belongs under.
 *
 * This mirrors legendFor()'s veg|water split in indexStatus.ts — the same question asked for a
 * different reason (which colour ramp vs which heading), which is why it is a second function and
 * not a re-use. They must move together: if NDWI ever stops using the water ramp it also stops
 * belonging under "Su və nəmlik". The burn group has no counterpart there because NBR/NBR2 share
 * the vegetation RAMP while meaning something else entirely.
 */
export function layerGroup(index: string): LayerGroup {
  if (index === "NDMI" || index === "NDWI") return "water";
  if (index === "NBR" || index === "NBR2") return "burn";
  return "veg";
}

/**
 * A FUNCTION, not a frozen const map, for the sensorMeta() reason: a module-level const resolves
 * t() once, against whichever locale happened to be loaded first, and then never changes.
 */
export function layerGroupLabel(group: LayerGroup): string {
  if (group === "water") return t("app.field.layers.group.water");
  if (group === "burn") return t("app.field.layers.group.burn");
  return t("app.field.layers.group.veg");
}
