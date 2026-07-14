"use client";

// useFieldInfo — pure client state for the "Sahə haqqında məlumat" form.
// Holds a FieldMetadata object, exposes typed setters, and produces a clean
// payload for PUT /api/fields/{id}/metadata. It performs NO network I/O — the
// consuming component (wizard / MetadataTab) does the fetch and save.

import { useCallback, useMemo, useState } from "react";
import type { FieldMetadata } from "@/lib/types";

/** Metadata keys whose values must be sent to the API as numbers (or null). */
export const NUMERIC_FIELDS: ReadonlyArray<keyof FieldMetadata> = [
  "soil_ph",
  "seeding_density",
  "elevation_m",
  "slope_deg",
  "aspect_deg",
  "target_yield",
];

/** Metadata keys that are stored as JSON arrays (default to []). */
export const ARRAY_FIELDS: ReadonlyArray<keyof FieldMetadata> = [
  "difficulties",
  "rotation_history",
  "fertilizer_history",
  "prior_yields",
  "pest_history",
];

/** Public API of the useFieldInfo hook. */
export interface UseFieldInfo {
  /** The live metadata object (crop_type defaults to ""). */
  data: FieldMetadata;
  /** Set a single field. */
  set: <K extends keyof FieldMetadata>(key: K, value: FieldMetadata[K]) => void;
  /** Merge a partial patch (e.g. terrain auto-fill) in one update. */
  setMany: (patch: Partial<FieldMetadata>) => void;
  /**
   * Serialise to a save-ready payload: empty strings / "Bilmirəm" → null,
   * numeric fields coerced to number|null, array fields defaulted to [].
   */
  toPayload: () => Record<string, unknown>;
}

function coerceNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function useFieldInfo(initial?: Partial<FieldMetadata>): UseFieldInfo {
  const [data, setData] = useState<FieldMetadata>({
    crop_type: "",
    ...initial,
  });

  const set = useCallback(<K extends keyof FieldMetadata>(key: K, value: FieldMetadata[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setMany = useCallback((patch: Partial<FieldMetadata>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const toPayload = useCallback((): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...data };

    for (const key of NUMERIC_FIELDS) {
      out[key as string] = coerceNumber(data[key]);
    }
    for (const key of ARRAY_FIELDS) {
      const v = data[key];
      out[key as string] = Array.isArray(v) ? v : [];
    }
    // Normalise remaining string fields: empty string → null.
    for (const [k, v] of Object.entries(out)) {
      if (v === "") out[k] = null;
    }
    return out;
  }, [data]);

  return useMemo(() => ({ data, set, setMany, toPayload }), [data, set, setMany, toPayload]);
}
