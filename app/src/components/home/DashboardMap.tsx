"use client";

// The dashboard's primary object: every field of the org on one map, painted three different ways.
// The segmented strip above it (TodayInstrument) chooses which question the colour answers —
// "how healthy", "what has an open alert", "what is the sky doing in the next two hours".
//
// It is built on the same skeleton as components/FieldsOverviewMap (grep "drawSafe" there) rather
// than by extending it, because the two answer different questions and this one takes a mode. The
// skeleton is copied deliberately and every piece of it is load-bearing:
//   • useMapReady() gates CONSTRUCTION. A map built in a tab that is producing no frames never
//     loads its style and stays a permanently blank grey box with no error at all (lib/useMapReady).
//   • load/styledata/idle listeners are registered BEFORE the first synchronous draw attempt, and
//     the draw is wrapped, because isStyleLoaded() can report true while addSource still throws
//     "style is not done loading" — a throw there escapes the effect before any listener is attached
//     and the panel never recovers.
//   • ResizeObserver + rAF + two deferred resizes: the observer fires once with a pre-layout size
//     and then not again, so the first paint needs its own nudges.
//   • fitBounds runs only when the DRAWN FIELD SET changes. A colour arriving must never move the
//     farmer's viewport.
//
// The field type is declared HERE, structurally, instead of importing GeoField from
// FieldsOverviewMap: this file must not take a build dependency on a component another wave may be
// rewriting. Anything with these members satisfies it.
//
// NO SYMBOL LAYER FOR NAMES. lib/basemaps BLANK_STYLE declares no `glyphs` URL and nothing else in
// the app adds one, so a text-field layer renders exactly nothing — silently. Names travel on a
// hover popup instead, which also gives us room for the mode's own value.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { api } from "@/lib/api";
import { BLANK_STYLE, applyBasemap, getSavedBasemap } from "@/lib/basemaps";
import { t, tf } from "@/lib/i18n";
import { useMapReady } from "@/lib/useMapReady";

export type DashMode = "health" | "alerts" | "weather";

/** The members of a GET /api/fields/geo row this map actually reads — see the note above on why the
 *  type is declared here instead of imported. A caller may hand over rows with more on them. */
export interface DashMapField {
  id: string;
  name: string;
  data_status?: string;
  geom: { type: "Polygon"; coordinates: number[][][] } | null;
}

/** The stored wellness row this map needs. A field without one is simply absent from the record. */
export interface DashMapScore {
  field_id: string;
  score: number;
  tone?: string | null;
}

/** The unread critical/warning rows already in TodayHome state — no request of our own. */
export interface DashMapAlert {
  field_id: string | null;
  severity: string;
}

type Band = "good" | "warn" | "bad";
type StatusKey = "ready" | "partial" | "pending";
type AlertClass = "critical" | "warning" | "none";
type WeatherClass = "rain" | "dry" | "unknown";

// Health palette — IDENTICAL to FieldsOverviewMap, deliberately. Two maps in one product that paint
// the same wellness bands in different greens teach the farmer two vocabularies for one fact.
const BAND_COLOR: Record<Band, string> = { good: "#15803D", warn: "#B45309", bad: "#B91C1C" };
const STATUS_COLOR: Record<StatusKey, string> = {
  ready: "#10b981",
  partial: "#f59e0b",
  pending: "#94a3b8",
};

// Alerts palette. NEUTRAL is never green: the notification read is capped (see alertNoneNote), so
// "no alert in the rows we looked at" is not a health claim and must not be painted like one.
const NEUTRAL = "#94A3B8";
const ALERT_COLOR: Record<AlertClass, string> = {
  critical: "#B91C1C",
  warning: "#B45309",
  none: NEUTRAL,
};

// Weather palette — the info blue from the token layer for rain, brand green for a dry window.
const WEATHER_COLOR: Record<WeatherClass, string> = {
  rain: "#0369A1",
  dry: "#15803D",
  unknown: NEUTRAL,
};

/**
 * How many fields the weather mode will ask about, and how long an answer stays usable.
 *
 * The nowcast is one request per field, so this mode is the only new traffic the dashboard adds —
 * which is why it is opt-in by click rather than loaded with the page. Twelve is the cap; beyond it
 * the extra polygons stay grey and the legend SAYS SO (weatherCoverage), because a grey polygon
 * that silently means "never asked" reads as "dry".
 *
 * Ten minutes is a ceiling on the lie, not a cache policy: the endpoint answers for the next two
 * hours, and a two-hour forecast still on screen ninety minutes later is simply wrong.
 */
const NOWCAST_MAX_FIELDS = 12;
const NOWCAST_TTL_MS = 10 * 60 * 1000;
const NOWCAST_CONCURRENCY = 4;

/** Subset of GET /api/fields/{id}/rain-nowcast we read (services/app/routers/nowcast.py). */
interface NowcastLite {
  available: boolean;
  rain_expected?: boolean;
  spray_safe?: boolean;
}

function statusKey(status?: string): StatusKey {
  return status === "ready" ? "ready" : status === "partial" ? "partial" : "pending";
}

/** Trust the server's tone; fall back to the same cut-offs as services/app/ai/wellness.py. */
function bandOf(s: DashMapScore): Band {
  if (s.tone === "good" || s.tone === "warn" || s.tone === "bad") return s.tone;
  return s.score >= 70 ? "good" : s.score >= 45 ? "warn" : "bad";
}

function bandLabel(b: Band): string {
  return t(
    b === "good"
      ? "app.fieldsOverviewMap.bandGood"
      : b === "warn"
        ? "app.fieldsOverviewMap.bandWarn"
        : "app.fieldsOverviewMap.bandBad",
  );
}

function statusLabel(s: StatusKey): string {
  return t(
    s === "ready"
      ? "app.fieldsOverviewMap.statusReady"
      : s === "partial"
        ? "app.fieldsOverviewMap.statusPartial"
        : "app.fieldsOverviewMap.statusPending",
  );
}

interface LegendItem {
  color: string;
  label: string;
}

interface LegendBlock {
  title: string;
  items: LegendItem[];
}

/** Fit to the drawn rings, skipping anything malformed — one bad geometry must not throw and leave
 *  the whole map blank. */
function fitTo(map: maplibregl.Map, feats: { geometry: GeoJSON.Polygon }[]) {
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

export default function DashboardMap({
  fields,
  scores,
  alerts,
  alertsCapped,
  mode,
  heightClass = "h-full",
}: {
  /** Already filtered to the fields this map should DRAW (the scope dropdown does that upstream). */
  fields: DashMapField[];
  scores: Record<string, DashMapScore>;
  /** null = the notifications request failed; the alerts mode then paints everything neutral. */
  alerts: DashMapAlert[] | null;
  /** The notifications response came back at its row ceiling — forces the legend's caveat. */
  alertsCapped: boolean;
  mode: DashMode;
  heightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();
  const ready = useMapReady();

  // Nowcast state for the weather mode. `sig` pins the cache to the field set it was fetched for,
  // so switching the scope dropdown cannot leave one field's forecast painted on another's polygon.
  const [wx, setWx] = useState<Record<string, WeatherClass>>({});
  const [wxLoading, setWxLoading] = useState(false);
  const wxRef = useRef<{ sig: string; at: number | null; busy: boolean }>({ sig: "", at: null, busy: false });

  const mappable = fields.filter((f) => f.geom != null);
  const fieldsSig = mappable.map((f) => f.id).join(",");

  // Worst severity per field, from the list the page already holds. `null` alerts (a failed request)
  // is NOT "no alerts": every field then falls to neutral and the legend keeps its caveat.
  const alertClassOf = (id: string): AlertClass => {
    if (!alerts) return "none";
    let seen: AlertClass = "none";
    for (const a of alerts) {
      if (a.field_id !== id) continue;
      if (a.severity === "critical") return "critical";
      if (a.severity === "warning") seen = "warning";
    }
    return seen;
  };

  /** The one place a polygon's colour is decided — the legend below reads the same function, so the
   *  two cannot drift apart, and the paint is precomputed in JS rather than in a GL expression. */
  const colorOf = (f: DashMapField): string => {
    if (mode === "alerts") return ALERT_COLOR[alertClassOf(f.id)];
    if (mode === "weather") return WEATHER_COLOR[wx[f.id] ?? "unknown"];
    const s = scores[f.id];
    return s && typeof s.score === "number"
      ? BAND_COLOR[bandOf(s)]
      : STATUS_COLOR[statusKey(f.data_status)];
  };

  /** Hover text: the field name plus whatever the ACTIVE mode is actually colouring by. */
  const popupTextOf = (f: DashMapField): string => {
    if (mode === "alerts") {
      // The SAME null test the legend makes, for the same reason. `alertClassOf` collapses "we
      // asked and there was nothing" and "we could not ask" into one "none", which is fine for a
      // neutral POLYGON but not for a sentence: without this branch a failed /api/notifications
      // made every field claim "açıq xəbərdarlıq yoxdur" — the exact reading the legend refuses.
      if (!alerts) return `${f.name} · ${t("app.home.stats.alertsUnknown")}`;
      const c = alertClassOf(f.id);
      const word =
        c === "critical"
          ? t("app.home.dash.alertCritical")
          : c === "warning"
            ? t("app.home.dash.alertWarning")
            : t("app.home.dash.alertNone");
      return `${f.name} · ${word}`;
    }
    if (mode === "weather") {
      const c = wx[f.id] ?? "unknown";
      const word =
        c === "rain"
          ? t("app.home.dash.weatherRain")
          : c === "dry"
            ? t("app.home.dash.weatherDry")
            : t("app.home.dash.weatherUnknown");
      return `${f.name} · ${word}`;
    }
    const s = scores[f.id];
    return s && typeof s.score === "number"
      ? `${f.name} · ${s.score}/100`
      : `${f.name} · ${t("app.home.dash.popupNoScore")}`;
  };

  // The map is constructed once and lives across mode changes, so the draw/hover closures below read
  // the CURRENT decision through refs rather than capturing the first render's.
  const fieldsRef = useRef(mappable);
  fieldsRef.current = mappable;
  const colorRef = useRef(colorOf);
  colorRef.current = colorOf;
  const popupRef = useRef(popupTextOf);
  popupRef.current = popupTextOf;
  const lastFitRef = useRef("");

  function buildFeatures() {
    return fieldsRef.current.map((f) => ({
      type: "Feature" as const,
      geometry: f.geom as GeoJSON.Polygon,
      properties: { id: f.id, color: colorRef.current(f) },
    }));
  }

  // ── weather mode: lazy, capped, user-initiated ────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "weather" || mappable.length === 0) return;
    // A new field set invalidates the cache outright — a stale colour on a re-scoped map is worse
    // than a grey one. The cache record is captured as a TOKEN: a fetch that is still in flight when
    // the scope changes then writes its "done" flags into an object nobody reads any more, instead
    // of clearing `busy` on the run that replaced it.
    let token = wxRef.current;
    if (token.sig !== fieldsSig) {
      token = { sig: fieldsSig, at: null, busy: false };
      wxRef.current = token;
      setWx({});
    }
    if (token.busy) return;
    if (token.at != null && Date.now() - token.at < NOWCAST_TTL_MS) return;

    token.busy = true;
    let active = true;
    setWxLoading(true);
    const targets = fieldsRef.current.slice(0, NOWCAST_MAX_FIELDS);

    (async () => {
      const out: Record<string, WeatherClass> = {};
      let next = 0;
      const worker = async () => {
        for (;;) {
          const i = next;
          next += 1;
          if (i >= targets.length) return;
          const f = targets[i];
          try {
            const n = await api.get<NowcastLite>(`/api/fields/${f.id}/rain-nowcast?window=120`);
            // available:false (Open-Meteo down, empty block) leaves the field OUT of the record, so
            // it paints as "məlumat yoxdur" instead of inheriting a neighbour's answer.
            if (n && n.available) out[f.id] = n.rain_expected ? "rain" : n.spray_safe ? "dry" : "unknown";
          } catch {
            /* stays absent → unknown */
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(NOWCAST_CONCURRENCY, targets.length) }, () => worker()),
      );
      token.busy = false;
      // Cleared before the `active` check on purpose: a mode switch mid-flight must not leave the
      // legend saying "loading" forever. On an unmounted component this is a no-op.
      setWxLoading(false);
      // `at` is stamped ONLY when the answers are actually applied. Marking the cache fresh on a
      // run whose result was discarded would leave the map grey for the next ten minutes with no
      // way to ask again.
      if (!active) return;
      token.at = Date.now();
      setWx(out);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fieldsSig]);

  // ── construction ──────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BLANK_STYLE,
      center: [48.5, 40.4],
      zoom: 6,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(ref.current);
    const raf = requestAnimationFrame(() => map.resize());
    const t1 = setTimeout(() => map.resize(), 250);
    const t2 = setTimeout(() => map.resize(), 800);

    function draw() {
      if (map.getSource("fields")) return; // already drawn
      applyBasemap(map, getSavedBasemap());
      const feats = buildFeatures();
      map.addSource("fields", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        // Precomputed per feature (see colorOf) — never a paint expression, so the legend and the
        // map are literally the same decision.
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.42 },
      });
      map.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        paint: { "line-color": "#FFFFFF", "line-width": 2 },
      });

      if (feats.length) {
        lastFitRef.current = fieldsRef.current.map((f) => f.id).join(",");
        fitTo(map, feats);
      }
      map.resize();

      map.on("click", "fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) router.push(`/fields/${id}`);
      });
      map.on("mousemove", "fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        const f = fieldsRef.current.find((x) => x.id === id);
        map.getCanvas().style.cursor = "pointer";
        if (!f) return;
        // setText, never setHTML: a field name is user input and this popup is not an escape hatch.
        popup.setLngLat(e.lngLat).setText(popupRef.current(f)).addTo(map);
      });
      map.on("mouseleave", "fields-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    }

    const drawSafe = () => {
      try {
        draw();
      } catch {
        /* the style wasn't ready — the next load/styledata/idle retries */
      }
    };
    map.on("load", drawSafe);
    map.on("styledata", drawSafe);
    map.on("idle", drawSafe);
    if (map.isStyleLoaded()) drawSafe();
    map.once("idle", () => map.resize());

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── repaint ───────────────────────────────────────────────────────────────────────────────────
  // The signature carries the resolved COLOURS, so it changes for a mode switch, a score landing, an
  // alert arriving and a nowcast returning alike — one effect covers every input.
  const paintSig = mappable.map((f) => `${f.id}:${colorOf(f)}`).join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("fields") as maplibregl.GeoJSONSource | undefined;
    if (!src) return; // not drawn yet — draw() reads the refs when the style becomes ready
    const feats = buildFeatures();
    src.setData({ type: "FeatureCollection", features: feats });
    if (lastFitRef.current !== fieldsSig && feats.length) {
      lastFitRef.current = fieldsSig;
      fitTo(map, feats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintSig, fieldsSig]);

  // ── legend: exactly the classes on screen, nothing more ───────────────────────────────────────
  const blocks: LegendBlock[] = [];
  let note: string | null = null;

  if (mode === "health") {
    const bands: Band[] = [];
    const statuses: StatusKey[] = [];
    for (const f of mappable) {
      const s = scores[f.id];
      if (s && typeof s.score === "number") {
        const b = bandOf(s);
        if (!bands.includes(b)) bands.push(b);
      } else {
        const k = statusKey(f.data_status);
        if (!statuses.includes(k)) statuses.push(k);
      }
    }
    const bandItems = (["good", "warn", "bad"] as Band[])
      .filter((b) => bands.includes(b))
      .map((b) => ({ color: BAND_COLOR[b], label: bandLabel(b) }));
    const statusItems = (["ready", "partial", "pending"] as StatusKey[])
      .filter((s) => statuses.includes(s))
      .map((s) => ({ color: STATUS_COLOR[s], label: statusLabel(s) }));
    if (bandItems.length) blocks.push({ title: t("app.fieldsOverviewMap.legendScoreTitle"), items: bandItems });
    if (statusItems.length) {
      blocks.push({
        title: bandItems.length
          ? t("app.fieldsOverviewMap.legendNoScore")
          : t("app.fieldsOverviewMap.legendSatProcessing"),
        items: statusItems,
      });
    }
  } else if (mode === "alerts") {
    if (!alerts) {
      // The request FAILED, so every polygon is neutral because we could not ask — not because the
      // fields are clear. A grey swatch labelled "açıq xəbərdarlıq yoxdur" is exactly the reading
      // that must not happen here, so the legend drops to the failure note alone.
      note = t("app.home.stats.alertsUnknown");
    } else {
      const seen = new Set<AlertClass>(mappable.map((f) => alertClassOf(f.id)));
      const items = (["critical", "warning", "none"] as AlertClass[])
        .filter((c) => seen.has(c))
        .map((c) => ({
          color: ALERT_COLOR[c],
          label:
            c === "critical"
              ? t("app.home.dash.alertCritical")
              : c === "warning"
                ? t("app.home.dash.alertWarning")
                : t("app.home.dash.alertNone"),
        }));
      if (items.length) blocks.push({ title: t("app.home.dash.viewAlerts"), items });
      // Mandatory whenever a grey polygon is on screen, and mandatory again when the read was
      // capped: "no alert" means "nothing in the rows we were given", which is much weaker than
      // healthy, and the endpoint's 60-row SQL cut is invisible from the response.
      if (seen.has("none") || alertsCapped) note = t("app.home.dash.alertNoneNote");
    }
  } else {
    const seen = new Set<WeatherClass>(mappable.map((f) => wx[f.id] ?? "unknown"));
    const items = (["rain", "dry", "unknown"] as WeatherClass[])
      .filter((c) => seen.has(c))
      .map((c) => ({
        color: WEATHER_COLOR[c],
        label:
          c === "rain"
            ? t("app.home.dash.weatherRain")
            : c === "dry"
              ? t("app.home.dash.weatherDry")
              : t("app.home.dash.weatherUnknown"),
      }));
    blocks.push({ title: t("app.home.dash.weatherTitle"), items });
    if (wxLoading) note = t("app.home.dash.weatherLoading");
    else if (mappable.length > NOWCAST_MAX_FIELDS) {
      // The uncovered polygons are grey and grey means "unknown" — say how many were actually asked
      // about, so grey is never read as "dry".
      note = tf("app.home.dash.weatherCoverage", { n: NOWCAST_MAX_FIELDS });
    }
  }

  const hasLegend = blocks.some((b) => b.items.length > 0) || note != null;

  return (
    <div
      className={`relative ${heightClass} w-full overflow-hidden rounded-2xl border-[1.5px] border-slate-200`}
    >
      <div ref={ref} className="h-full w-full" />
      {hasLegend && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[75%] rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-[11px] leading-tight text-slate-700 shadow-soft">
          {blocks.map((b, i) =>
            b.items.length === 0 ? null : (
              <div key={b.title} className={i > 0 ? "mt-2" : ""}>
                <p className="font-bold text-slate-800">{b.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {b.items.map((it) => (
                    <span key={it.label} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: it.color }}
                        aria-hidden="true"
                      />
                      {it.label}
                    </span>
                  ))}
                </div>
              </div>
            ),
          )}
          {note && <p className="mt-1.5 max-w-[46ch] text-[10px] leading-snug text-slate-500">{note}</p>}
        </div>
      )}
    </div>
  );
}
