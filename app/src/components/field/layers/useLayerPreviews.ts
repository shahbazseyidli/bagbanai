"use client";

// One small picture of THIS field, per index, for the layer picker.
//
// This is N requests for N layers, and that is a property of the API, not a choice: GET
// /api/fields/{id}/scenes is per-index, and no endpoint returns the newest raster of every index
// in one read (/indices/latest and /indices/summary carry the values but no storage_path, and
// /orgs/{id}/thumbs is NDVI-only). The cost is paid down four ways — nothing is fetched until the
// picker opens, a pool of two keeps the first rows painting on 3G, the session cache makes a
// reopen free, and the caller seeds the layer it already holds. When a one-shot
// GET /api/fields/{id}/layers exists (indices.py already has preview_url() and the org_thumbs
// query shape), only the private loadOne() below changes.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { sensorFamily } from "@/lib/sensors";
import { scenePreviewUrl } from "./previewUrl";

export interface LayerPreview {
  url: string | null;
  date: string | null;
  value: number | null;
  state: "pending" | "ready" | "empty" | "failed";
}

/** The layer the caller is already showing — a string it holds in memory, so it costs no request. */
export interface LayerPreviewSeed {
  index: string;
  tileUrl: string | null;
  date: string | null;
  value: number | null;
}

export type LayerPreviews = Record<string, LayerPreview | undefined>;

interface SceneRow {
  date?: string | null;
  value?: number | null;
  tile_url?: string | null;
}
interface ScenesBody {
  /** Which sensor family actually answered — 's2' | 'hls' (indices.py::scenes). */
  sensor?: string | null;
  scenes?: SceneRow[] | null;
}

// Session-lived, deliberately outside React: the card's sheet and the section's panel are two
// component instances asking the same question about the same field, and neither should pay for
// the other's answer. Never invalidated during a session — a satellite pass lands once every few
// days, and a stale-by-minutes thumbnail is not a wrong answer.
const CACHE = new Map<string, LayerPreview>();
const INFLIGHT = new Map<string, Promise<LayerPreview>>();

// Two at a time. Ten parallel requests on a phone would make the LAST tile arrive sooner and the
// first tile arrive later, and the farmer is looking at the first one.
const POOL = 2;

const PENDING: LayerPreview = { url: null, date: null, value: null, state: "pending" };

function cacheKey(fieldId: string, index: string): string {
  return `${fieldId}|${index}`;
}

async function loadOne(fieldId: string, index: string): Promise<LayerPreview> {
  try {
    const r = await api.get<ScenesBody>(
      // Always Sentinel-2: it is the only sensor the UI exposes (E14.3), and the picker's job is
      // to compare layers with each other, not sensors.
      `/api/fields/${fieldId}/scenes?index=${index}&sensor=s2`,
    );
    // ?sensor= is a PREFERENCE, not a filter: when S2 has no raster for this index the endpoint
    // answers with the HLS family instead and says so in body.sensor (indices.py::scenes, "falls
    // back to the other sensor family"). A 30m HLS picture dropped into a grid the header promises
    // is one comparable Sentinel-2 set would mix resolutions tile by tile — NDVI at 10m beside
    // NBR2 at 30m — so a fallback is read as the empty state, which is already built and is the
    // honest answer ("no picture of this layer yet"). SatelliteTab suppresses the same fallback for
    // the same reason.
    if (r?.sensor && sensorFamily(r.sensor) !== "S2") {
      return { url: null, date: null, value: null, state: "empty" };
    }
    // Scenes come newest-first, so [0] is the latest pass for this index. tile_url, NEVER
    // tile_url_auto: every tile in the grid must sit on the same fixed family rescale, or two
    // layers' pictures stop being comparable to each other — which is the entire point of showing
    // them side by side.
    const first = r?.scenes?.[0] ?? null;
    if (!first) return { url: null, date: null, value: null, state: "empty" };
    return {
      url: scenePreviewUrl(first.tile_url),
      date: first.date ?? null,
      value: first.value ?? null,
      state: "ready",
    };
  } catch {
    // Never rejects. A layer whose scenes call failed still has a name and a ramp to draw, and one
    // failed index must not take the grid down with it.
    return { url: null, date: null, value: null, state: "failed" };
  }
}

/**
 * @param enabled false ⇒ fetches NOTHING but still returns whatever the session already knows.
 *   That single flag is both the "picker is closed" gate and the data-saver gate.
 */
export function useLayerPreviews(
  fieldId: string,
  indices: string[],
  enabled: boolean,
  seed?: LayerPreviewSeed | null,
): LayerPreviews {
  const [previews, setPreviews] = useState<LayerPreviews>({});

  // Destructured to primitives, not passed as an object: the caller rebuilds `seed` on every
  // render, so an effect depending on the object would re-run (and re-setState) forever.
  const seedIndex = seed?.index ?? null;
  const seedTile = seed?.tileUrl ?? null;
  const seedDate = seed?.date ?? null;
  const seedValue = seed?.value ?? null;

  useEffect(() => {
    if (!seedIndex) return;
    const url = scenePreviewUrl(seedTile);
    if (!url) return;
    const entry: LayerPreview = { url, date: seedDate, value: seedValue, state: "ready" };
    // Written regardless of `enabled`: it is a transform of a string already in memory, so the
    // active layer's tile is free even on a metered connection.
    CACHE.set(cacheKey(fieldId, seedIndex), entry);
    setPreviews((p) => ({ ...p, [seedIndex]: entry }));
  }, [fieldId, seedIndex, seedTile, seedDate, seedValue]);

  // The caller passes a fresh array literal every render; the join is what makes this effect fire
  // on a real change of the LIST rather than on every parent render.
  const signature = indices.join(",");

  useEffect(() => {
    let active = true;
    const list = signature ? signature.split(",") : [];

    // Publish what the session already holds. When `enabled` is false this is the whole answer.
    const cached: LayerPreviews = {};
    for (const ix of list) {
      const hit = CACHE.get(cacheKey(fieldId, ix));
      if (hit) cached[ix] = hit;
    }
    if (Object.keys(cached).length > 0) setPreviews((p) => ({ ...p, ...cached }));
    if (!enabled) return;

    const queue = list.filter((ix) => !CACHE.has(cacheKey(fieldId, ix)));
    if (queue.length === 0) return;

    // PENDING is written UNCONDITIONALLY, never "only if this index has nothing yet". `previews`
    // survives a fieldId change — the callers re-render rather than remount when the farmer walks
    // from field A to field B (the desktop field list, a notification deep link) — and the old
    // guard refused to overwrite field A's READY entries, so A's pictures were painted under B's
    // name with no pending shimmer to say otherwise. A preview that is not of that field is the
    // one thing this grid may never show.
    //
    // This is exact rather than a blunt reset: the queue is every index of THIS field that the
    // cache cannot answer, and the indices it does answer were just published from the cache above
    // — between them they cover the whole list, so no correct entry is thrown away.
    setPreviews((p) => {
      const next = { ...p };
      for (const ix of queue) next[ix] = PENDING;
      return next;
    });

    let cursor = 0;
    const runner = async () => {
      while (active && cursor < queue.length) {
        const ix = queue[cursor];
        cursor += 1;
        const key = cacheKey(fieldId, ix);
        let pending = INFLIGHT.get(key);
        if (!pending) {
          // loadOne never rejects, so this chain cannot produce an unhandled rejection.
          pending = loadOne(fieldId, ix).then((r) => {
            CACHE.set(key, r);
            INFLIGHT.delete(key);
            return r;
          });
          INFLIGHT.set(key, pending);
        }
        const result = await pending;
        // api.get takes no AbortSignal, so this is the codebase's `active` flag rather than a
        // real cancellation. The result is already in the cache by now — closing the picker
        // mid-flight throws away the setState, not the byte.
        if (!active) return;
        setPreviews((p) => ({ ...p, [ix]: result }));
      }
    };

    const runners: Promise<void>[] = [];
    for (let i = 0; i < Math.min(POOL, queue.length); i += 1) runners.push(runner());
    void Promise.all(runners);

    return () => {
      active = false;
    };
  }, [fieldId, signature, enabled]);

  return previews;
}
