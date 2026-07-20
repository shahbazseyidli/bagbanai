// Satellite sensor model. Two sensors feed the field analysis:
//   S2  — Sentinel-2 10m: the sharp map raster + within-field detail (default source).
//   HLS — NASA HLS 30m: the denser time series (Landsat 8/9 + S2, ~2-3 day revisit).
// DB codes are 'S30'/'L30' (HLS) and 'S2'; the API uses family strings 's2'/'hls'.

export type Sensor = "S2" | "HLS";

export const SENSOR_PARAM: Record<Sensor, string> = { S2: "s2", HLS: "hls" };

/** Map any DB code ('S30'/'L30'/'S2') or API family ('hls'/'s2') to the UI Sensor. */
export function sensorFamily(code: string | null | undefined): Sensor {
  const c = (code || "").toLowerCase();
  if (c === "hls" || c === "s30" || c === "l30") return "HLS";
  return c === "s2" || (code || "").startsWith("S2") ? "S2" : "HLS";
}

export const SENSOR_META: Record<Sensor, {
  label: string; short: string; res_m: number; color: string; note: string;
}> = {
  S2: {
    label: "Sentinel-2 · 10m", short: "S2 10m", res_m: 10, color: "#2563eb",
    note: "Kəskin xəritə — sahədaxili detal",
  },
  HLS: {
    label: "HLS · 30m", short: "HLS 30m", res_m: 30, color: "#059669",
    note: "Daha sıx zaman seriyası",
  },
};

// Minimum field size (ha) for a meaningful within-field pixel distribution.
export const AREA_MIN_S2 = 0.15; // ~15 Sentinel-2 10m pixels
export const AREA_MIN_HLS = 0.5; // ~5 HLS 30m pixels

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
