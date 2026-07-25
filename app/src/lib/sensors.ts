// Satellite sensor model.
//
// Two sensors exist in the DATA layer and both keep running untouched (geo pipeline, crons,
// stored S30/L30 rows, the regional benchmark SQL, A8 backfill and A6 zones all still read HLS):
//   S2  — 10m: the sharp map raster + within-field detail. The ONLY sensor the UI exposes.
//   HLS — 30m (Landsat 8/9 + S2): the denser time series and the long archive (back to 2015).
// DB codes are 'S30'/'L30' (HLS) and 'S2'; the API uses family strings 's2'/'hls'.
//
// HLS was pulled out of the USER INTERFACE. Nothing here was deleted: flip HLS_ENABLED back to
// true and the second sensor becomes selectable again (that is the one-boolean rollback the
// owner asked for). sensorFamily() must keep resolving 'hls'/'s30'/'l30' either way, because
// stored rows tagged with those codes still flow into the app and have to be classified.

import { t } from "@/lib/i18n";

/** Single switch that hides HLS from the UI. Data ingestion is unaffected. */
export const HLS_ENABLED = false;

export type Sensor = "S2" | "HLS";

export const SENSOR_PARAM: Record<Sensor, string> = { S2: "s2", HLS: "hls" };

/** The sensors a user may actually see or pick. Everything UI-facing iterates this. */
export const UI_SENSORS: Sensor[] = HLS_ENABLED ? ["S2", "HLS"] : ["S2"];

/** True when this sensor may be shown to a user at all. */
export function sensorVisible(sensor: Sensor): boolean {
  return sensor === "S2" || HLS_ENABLED;
}

/** Map any DB code ('S30'/'L30'/'S2') or API family ('hls'/'s2') to the UI Sensor. */
export function sensorFamily(code: string | null | undefined): Sensor {
  const c = (code || "").toLowerCase();
  if (c === "hls" || c === "s30" || c === "l30") return "HLS";
  return c === "s2" || (code || "").startsWith("S2") ? "S2" : "HLS";
}

/** Non-textual, locale-independent presentation data. */
const SENSOR_STYLE: Record<Sensor, { res_m: number; color: string }> = {
  S2: { res_m: 10, color: "#2563eb" },
  HLS: { res_m: 30, color: "#059669" },
};

export interface SensorMeta {
  label: string; short: string; res_m: number; color: string; note: string;
}

/**
 * Display strings for a sensor. A FUNCTION (not a frozen const) because the labels go through
 * t() and must be resolved at render time in the active locale — a module-level const would
 * capture whatever locale happened to be loaded first.
 *
 * "Sentinel-2" is called "Peyk görüntüsü" in user-facing text; the Copernicus/ESA credit lives
 * on /status, in the marketing footer data-sources line and in the map attribution.
 */
export function sensorMeta(sensor: Sensor): SensorMeta {
  if (sensor === "S2") {
    return {
      ...SENSOR_STYLE.S2,
      label: t("app.sensor.s2.label"),
      short: t("app.sensor.s2.short"),
      note: t("app.sensor.s2.note"),
    };
  }
  // Unreachable while HLS_ENABLED is false — kept so the rollback is a one-line flip.
  return { ...SENSOR_STYLE.HLS, label: "HLS · 30m", short: "HLS 30m", note: "" };
}

// Minimum field size (ha) for a meaningful within-field pixel distribution.
export const AREA_MIN_S2 = 0.15; // ~15 Sentinel-2 10m pixels
export const AREA_MIN_HLS = 0.5; // ~5 HLS 30m pixels (UI-dormant with HLS_ENABLED=false)

// Indices available per sensor. TVI is HLS-only (S2 TVI magnitude mis-renders under the shared
// colormap). NDRE/CIre are S2-only (E0): they need the red-edge 705 nm band, which Landsat/HLS
// lack — so they only appear when the Sentinel-2 sensor is selected.
const ALL_INDICES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI"];
export const SENSOR_INDICES: Record<Sensor, string[]> = {
  HLS: ALL_INDICES,
  S2: [...ALL_INDICES.filter((i) => i !== "TVI"), "NDRE", "CIre"],
};

export function indexAvailable(sensor: Sensor, index: string): boolean {
  return SENSOR_INDICES[sensor].includes(index);
}
