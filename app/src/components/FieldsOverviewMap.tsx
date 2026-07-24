"use client";

// D4.3 — desktop agronomist workspace: ALL of an org's fields on one map. The map fits every field
// and a click opens that field. Reuses the shared basemap machinery (lib/basemaps).
//
// A3 — the polygon colour now carries the 0-100 field wellness score (green 70+, amber 45-69, red
// below 45). A field with NO stored score keeps the original processing-status colouring (green
// ready / amber partial / grey pending) as the fallback, and the legend lists ONLY the classes that
// are actually drawn, so it can never claim a meaning the map is not showing.
//
// Scores come from ONE org-wide read-model request (GET /api/orgs/{id}/wellness → latest STORED row
// per field) — never one request per field, and never an on-demand computation.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { api } from "@/lib/api";
import { BLANK_STYLE, applyBasemap, getSavedBasemap } from "@/lib/basemaps";
import type { Polygon } from "@/lib/types";

export interface GeoField {
  id: string;
  name: string;
  area_ha: number | null;
  data_status?: string;
  geom: Polygon | null;
}

/** One row of GET /api/orgs/{org_id}/wellness. Fields without a stored score are simply absent. */
export interface FieldScoreLite {
  field_id: string;
  score: number;
  tone?: string | null;
}

type Band = "good" | "warn" | "bad";
type StatusKey = "ready" | "partial" | "pending";

// Score bands — deliberately deeper hues than the status palette below, so the two classifications
// cannot be confused on the same map. Single source of truth for BOTH the paint and the legend.
const BAND_COLOR: Record<Band, string> = { good: "#15803D", warn: "#B45309", bad: "#B91C1C" };
const BAND_LABEL: Record<Band, string> = {
  good: "70+ (yaxşı)",
  warn: "45-69 (orta)",
  bad: "45-dən aşağı (risk)",
};
// Unchanged D4.3 processing-status palette — the fallback for fields that have no score yet.
const STATUS_COLOR: Record<StatusKey, string> = {
  ready: "#10b981",
  partial: "#f59e0b",
  pending: "#94a3b8",
};
const STATUS_LABEL: Record<StatusKey, string> = {
  ready: "hazır",
  partial: "qismən",
  pending: "gözləyir",
};

const BAND_ORDER: Band[] = ["good", "warn", "bad"];
const STATUS_ORDER: StatusKey[] = ["ready", "partial", "pending"];

function statusKey(status?: string): StatusKey {
  return status === "ready" ? "ready" : status === "partial" ? "partial" : "pending";
}

// Trust the server's tone; fall back to the same cut-offs as services/app/ai/wellness.py.
function bandOf(s: FieldScoreLite): Band {
  if (s.tone === "good" || s.tone === "warn" || s.tone === "bad") return s.tone;
  return s.score >= 70 ? "good" : s.score >= 45 ? "warn" : "bad";
}

function scoreOf(scores: Record<string, FieldScoreLite>, id: string): FieldScoreLite | undefined {
  const s = scores[id];
  return s && typeof s.score === "number" ? s : undefined;
}

/** Colour is resolved here (not in a paint expression) so the legend below draws from the very
 *  same decision — the two cannot drift apart. */
function colorOf(f: GeoField, scores: Record<string, FieldScoreLite>): string {
  const s = scoreOf(scores, f.id);
  return s ? BAND_COLOR[bandOf(s)] : STATUS_COLOR[statusKey(f.data_status)];
}

function buildFeatures(fields: GeoField[], scores: Record<string, FieldScoreLite>) {
  return fields
    .filter((f) => f.geom)
    .map((f) => {
      const s = scoreOf(scores, f.id);
      return {
        type: "Feature" as const,
        geometry: f.geom as GeoJSON.Polygon,
        properties: {
          id: f.id,
          status: f.data_status ?? "none",
          score: s ? s.score : null,
          color: colorOf(f, scores),
        },
      };
    });
}

type FieldFeature = ReturnType<typeof buildFeatures>[number];

/** Fit to the drawn rings, skipping anything malformed — one bad geometry must not throw and leave
 *  the whole map blank. */
function fitTo(map: maplibregl.Map, feats: FieldFeature[]) {
  const b = new maplibregl.LngLatBounds();
  let any = false;
  feats.forEach((f) => {
    const ring = f.geometry?.coordinates?.[0];
    if (!Array.isArray(ring)) return;
    ring.forEach((c) => {
      if (Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        b.extend(c as [number, number]);
        any = true;
      }
    });
  });
  if (any) map.fitBounds(b, { padding: 44, maxZoom: 15, duration: 0 });
}

function sigOf(fields: GeoField[]): string {
  return fields.map((f) => f.id).join(",");
}

export default function FieldsOverviewMap({
  fields,
  heightClass = "h-full",
  orgId,
  scores,
}: {
  fields: GeoField[];
  heightClass?: string;
  /** When given (and `scores` is not), the map fetches that org's stored scores ONCE by itself. */
  orgId?: string;
  /** Pre-fetched scores keyed by field id — wins over `orgId` when both are supplied. */
  scores?: Record<string, FieldScoreLite>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();
  const [fetched, setFetched] = useState<Record<string, FieldScoreLite>>({});
  const effective = scores ?? fetched;

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const scoresRef = useRef(effective);
  scoresRef.current = effective;
  const lastFitRef = useRef("");

  // A3 — one request for the whole org. Best-effort: on failure the map keeps the status colouring.
  useEffect(() => {
    if (!orgId || scores) return;
    let active = true;
    api
      .get<{ fields: FieldScoreLite[] }>(`/api/orgs/${orgId}/wellness`)
      .then((r) => {
        if (!active) return;
        const next: Record<string, FieldScoreLite> = {};
        for (const s of r?.fields ?? []) {
          if (s && s.field_id && typeof s.score === "number") next[s.field_id] = s;
        }
        setFetched(next);
      })
      .catch(() => {
        /* scores are a garnish on this map — the status colouring stands on its own */
      });
    return () => {
      active = false;
    };
  }, [orgId, scores]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BLANK_STYLE,
      center: [48.5, 40.4],
      zoom: 6,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    function draw() {
      if (map.getSource("basemap")) return; // already drawn
      applyBasemap(map, getSavedBasemap());
      const feats = buildFeatures(fieldsRef.current, scoresRef.current);
      map.addSource("fields", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        // Colour is precomputed per feature (score band, else data_status) — see colorOf.
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        paint: { "line-color": "#facc15", "line-width": 2 },
      });

      if (feats.length) {
        lastFitRef.current = sigOf(fieldsRef.current);
        fitTo(map, feats);
      }
      map.resize();

      map.on("click", "fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) router.push(`/fields/${id}`);
      });
      map.on("mouseenter", "fields-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "fields-fill", () => { map.getCanvas().style.cursor = ""; });
    }
    // Draw when the style is ready; `idle` is a safety net if `load` was missed.
    if (map.isStyleLoaded()) draw();
    else map.on("load", draw);
    map.on("idle", draw);

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repaint when the scores land (or when the field set changes, e.g. the org switcher). Refits the
  // viewport only for a NEW field set — a score arriving must not move the farmer's map.
  const fieldsSig = sigOf(fields);
  const scoreSig = Object.keys(effective)
    .sort()
    .map((k) => `${k}:${effective[k]?.score}`)
    .join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("fields") as maplibregl.GeoJSONSource | undefined;
    if (!src) return; // not drawn yet — draw() reads the refs when the style becomes ready
    const feats = buildFeatures(fieldsRef.current, scoresRef.current);
    src.setData({ type: "FeatureCollection", features: feats });
    if (lastFitRef.current !== fieldsSig && feats.length) {
      lastFitRef.current = fieldsSig;
      fitTo(map, feats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsSig, scoreSig]);

  // Legend = exactly the classes present on screen, nothing more.
  const bandsShown: Band[] = [];
  const statusesShown: StatusKey[] = [];
  for (const f of fields) {
    if (!f.geom) continue;
    const s = scoreOf(effective, f.id);
    if (s) {
      const b = bandOf(s);
      if (!bandsShown.includes(b)) bandsShown.push(b);
    } else {
      const k = statusKey(f.data_status);
      if (!statusesShown.includes(k)) statusesShown.push(k);
    }
  }
  const bandItems = BAND_ORDER.filter((b) => bandsShown.includes(b));
  const statusItems = STATUS_ORDER.filter((s) => statusesShown.includes(s));

  return (
    <div
      className={`relative ${heightClass} w-full overflow-hidden rounded-2xl border-[1.5px] border-slate-200`}
    >
      <div ref={ref} className="h-full w-full" />
      {(bandItems.length > 0 || statusItems.length > 0) && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[75%] rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-[11px] leading-tight text-slate-700 shadow-soft">
          {bandItems.length > 0 && (
            <>
              <p className="font-bold text-slate-800">Sağlamlıq balı</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {bandItems.map((b) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: BAND_COLOR[b] }}
                      aria-hidden="true"
                    />
                    {BAND_LABEL[b]}
                  </span>
                ))}
              </div>
            </>
          )}
          {statusItems.length > 0 && (
            <>
              <p className={`font-bold text-slate-800 ${bandItems.length > 0 ? "mt-2" : ""}`}>
                {bandItems.length > 0 ? "Balı olmayan sahələr" : "Peyk emalı"}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {statusItems.map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: STATUS_COLOR[s] }}
                      aria-hidden="true"
                    />
                    {STATUS_LABEL[s]}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
