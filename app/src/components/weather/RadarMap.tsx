"use client";

// The rain radar over the farmer's own fields.
//
// It is built on the same skeleton as components/home/DashboardMap (grep "drawSafe" there) rather
// than by extending it, because that one takes a colouring mode and this one takes a time frame.
// The skeleton is copied deliberately and every piece of it is load-bearing:
//   • useMapReady() gates CONSTRUCTION. A map built in a tab that is producing no frames never
//     loads its style and stays a permanently blank grey box with no error at all (lib/useMapReady).
//   • load/styledata/idle listeners are registered BEFORE the first synchronous draw attempt, and
//     the draw is wrapped, because isStyleLoaded() can report true while addSource still throws
//     "style is not done loading" — a throw there escapes the effect before any listener is attached
//     and the map never recovers.
//   • ResizeObserver + rAF + two deferred resizes: the observer fires once with a pre-layout size
//     and then not again, so the first paint needs its own nudges.
//   • fitBounds runs only when the DRAWN FIELD SET changes. A radar frame arriving must never move
//     the farmer's viewport.
//
// The field type is declared HERE, structurally, instead of imported: this file must not take a
// build dependency on a component another wave may be rewriting. Anything with these members fits.
//
// NO SYMBOL LAYER FOR NAMES. lib/basemaps BLANK_STYLE declares no `glyphs` URL and nothing else in
// the app adds one, so a text-field layer renders exactly nothing — silently. Names travel on a
// hover popup instead, set with setText and never setHTML (a field name is user input).
//
// ── WHY TWO RADAR SOURCES ──────────────────────────────────────────────────────────────────────
// Stepping a frame must update the SOURCE, never rebuild the map. But a single source updated with
// setTiles() goes blank while the new tiles are in flight, and on a rain map an empty frame does not
// read as "loading" — it reads as "the rain stopped". So the frames are double-buffered: the new
// frame is written into the HIDDEN source, and the two opacities are swapped only once MapLibre says
// its tiles have landed. A timeout backs that up, because one dead tile must not freeze playback.
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
// Imported BY NAME rather than reached through the default import. `maplibregl.Map` /
// `maplibregl.GeoJSONSource` are used that way throughout this codebase and demonstrably compile,
// but both of these are types this app has never referenced before, and there is no local
// typechecker to find out with — a named import of a real named export cannot be wrong.
import type { MapSourceDataEvent, RasterTileSource } from "maplibre-gl";
import { BLANK_STYLE, RAINVIEWER_ATTRIBUTION, applyBasemap, getSavedBasemap } from "@/lib/basemaps";
import { t } from "@/lib/i18n";
import { useMapReady } from "@/lib/useMapReady";

/** The members of a GET /api/fields/geo row this map reads. A caller may hand over rows with more. */
export interface RadarMapField {
  id: string;
  name: string;
  geom: { type: "Polygon"; coordinates: number[][][] } | null;
}

/** Radar over imagery has to stay readable in both directions: opaque enough to see a shower, sheer
 *  enough that the field underneath is still recognisable as the farmer's field. */
const RADAR_OPACITY = 0.72;

/** How long a frame swap waits for MapLibre to report the hidden source loaded before showing it
 *  anyway. One unreachable tile server must not leave playback stuck on a two-hour-old frame. */
const SWAP_TIMEOUT_MS = 1500;

const SRC_A = "radar-a";
const SRC_B = "radar-b";
const FIELDS_FILL = "fields-fill";

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
  // maxZoom 10, not the 15 the field maps use. A rain nowcast is about what is ARRIVING, so a single
  // small field must not zoom the viewport in until the weather approaching it is off screen.
  if (any) map.fitBounds(b, { padding: 44, maxZoom: 10, duration: 0 });
}

export default function RadarMap({
  fields,
  selectedId,
  onSelect,
  frameTiles,
}: {
  fields: RadarMapField[];
  /** The field the panel below is showing. Drawn with a heavier outline; not a navigation state. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Tile template for the frame currently on the scrubber, or null for "no radar layer at all" —
   * which covers three honest cases at once: RainViewer had nothing, the request failed, and the
   * farmer has declined the download on a metered connection. In all three the fields stay on
   * screen; this component never depends on the third party to be useful.
   */
  frameTiles: string[] | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useMapReady();
  // The style is drawn ASYNCHRONOUSLY — draw() runs on whichever of load/styledata/idle arrives
  // first, which is always after this component's first render. The radar effect must therefore be
  // able to run AGAIN once the layers exist: without this flag it would find no fields-fill to
  // insert before, return, and never re-run, because the frame it was given had not changed.
  const [drawn, setDrawn] = useState(false);

  const mappable = fields.filter((f) => f.geom != null);
  const fieldsSig = mappable.map((f) => f.id).join(",");

  // The map is constructed once and lives across every frame and selection change, so the closures
  // registered at draw time read the CURRENT values through refs instead of capturing the first
  // render's.
  const fieldsRef = useRef(mappable);
  fieldsRef.current = mappable;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const lastFitRef = useRef("");

  // Radar double-buffer state. `shown` is whichever source is currently at RADAR_OPACITY; `cancel`
  // aborts a swap still waiting on tiles, so stepping frames quickly cannot leave two listeners
  // racing to reveal different frames.
  const radarRef = useRef<{ shown: "a" | "b" | null; cancel: (() => void) | null }>({
    shown: null,
    cancel: null,
  });

  /** Selection is carried as a per-feature LINE WIDTH, precomputed in JS and read back with a
   *  ["get"] paint expression — the pattern components/home/DashboardMap already uses for its fill
   *  colour. Deliberately not a filtered second layer with setFilter(): the expression form of a
   *  MapLibre filter has no precedent in this codebase and there is no local typechecker to find out
   *  with, while ["get", …] inside a typed paint object is proven to compile. */
  const LINE_W = 1.8;
  const LINE_W_SELECTED = 4;

  function buildFeatures() {
    const sel = selectedRef.current;
    return fieldsRef.current.map((f) => ({
      type: "Feature" as const,
      geometry: f.geom as GeoJSON.Polygon,
      properties: { id: f.id, lw: f.id === sel ? LINE_W_SELECTED : LINE_W },
    }));
  }

  // ── construction ──────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BLANK_STYLE,
      center: [48.5, 40.4],
      // Rain systems are regional; a radar opened at field zoom shows one uniform wash of colour.
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
      map.addSource("fields", {
        type: "geojson",
        data: { type: "FeatureCollection", features: feats },
      });
      map.addLayer({
        id: FIELDS_FILL,
        type: "fill",
        source: "fields",
        // Barely-there fill: the radar is the subject here, the field is the place. A saturated
        // polygon would fight the very colours the legend is explaining.
        paint: { "fill-color": "#FFFFFF", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        // White at both widths: on satellite imagery under a blue-to-red rain wash, white is the
        // only outline colour that survives every background. The SELECTED field is the thick one.
        paint: { "line-color": "#FFFFFF", "line-width": ["get", "lw"] },
      });

      if (feats.length) {
        lastFitRef.current = fieldsRef.current.map((f) => f.id).join(",");
        fitTo(map, feats);
      }
      map.resize();

      map.on("click", FIELDS_FILL, (e) => {
        const id = e.features?.[0]?.properties?.id;
        // SELECTS the field for the panel below; it does not navigate. Leaving the radar to open a
        // field page is what the explicit "Sahəyə keç" link in that panel is for.
        if (typeof id === "string") selectRef.current(id);
      });
      map.on("mousemove", FIELDS_FILL, (e) => {
        const id = e.features?.[0]?.properties?.id;
        const f = fieldsRef.current.find((x) => x.id === id);
        map.getCanvas().style.cursor = "pointer";
        if (!f) return;
        // setText, never setHTML: a field name is user input and this popup is not an escape hatch.
        popup.setLngLat(e.lngLat).setText(f.name).addTo(map);
      });
      map.on("mouseleave", FIELDS_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // LAST statement in draw(), after every addLayer above: it is what tells the radar effect the
      // layers it inserts before now exist. Setting it earlier would re-run that effect against a
      // half-built style.
      setDrawn(true);
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
      radarRef.current.cancel?.();
      radarRef.current = { shown: null, cancel: null };
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── field set / selection changed ─────────────────────────────────────────────────────────────
  // ONE effect for both, because both are properties of the same serialised features. fitBounds is
  // still gated on the FIELD SET alone: selecting a field must never move the farmer's viewport, and
  // neither must a radar frame arriving.
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
  }, [fieldsSig, selectedId, drawn]);

  // ── radar frame ───────────────────────────────────────────────────────────────────────────────
  // Keyed on the tile TEMPLATE (and on `drawn`), so this runs once per frame and not once per
  // render.
  const tileKey = frameTiles ? frameTiles.join("|") : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawn) return;
    // The radar layers are inserted BEFORE the field fill, so boundaries stay legible through rain.
    // Until that layer exists the style is not drawn yet and there is nothing to insert before.
    if (!map.getLayer(FIELDS_FILL)) return;

    // Cancel a swap still waiting on the previous frame's tiles before starting another.
    radarRef.current.cancel?.();
    radarRef.current.cancel = null;

    const removeAll = () => {
      for (const id of [SRC_A, SRC_B]) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      }
      radarRef.current.shown = null;
    };

    if (!frameTiles || frameTiles.length === 0) {
      // No radar to show — and no leftover frame pretending to be the current one.
      try {
        removeAll();
      } catch {
        /* style torn down under us */
      }
      return;
    }

    try {
      // First frame: create BOTH buffers, show A. B is created with the same tiles rather than a
      // placeholder URL so it never requests anything that does not exist.
      if (radarRef.current.shown == null) {
        removeAll();
        for (const id of [SRC_A, SRC_B]) {
          map.addSource(id, {
            type: "raster",
            tiles: frameTiles,
            tileSize: 256,
            // OURS, not RainViewer's: they answered 200 at every zoom probed (6 through 14), so
            // this is not their ceiling. Past 12 MapLibre stretches the z12 tile instead of
            // fetching four more per zoom step — on a phone that is the difference that matters,
            // and a radar mosaic does not resolve any finer for the extra bytes.
            maxzoom: 12,
            attribution: RAINVIEWER_ATTRIBUTION,
          });
          map.addLayer(
            {
              id,
              type: "raster",
              source: id,
              paint: { "raster-opacity": id === SRC_A ? RADAR_OPACITY : 0 },
            },
            FIELDS_FILL,
          );
        }
        radarRef.current.shown = "a";
        return;
      }

      // Subsequent frames: write into the HIDDEN buffer and reveal it only once its tiles are in.
      const from = radarRef.current.shown;
      const to = from === "a" ? "b" : "a";
      const toId = to === "a" ? SRC_A : SRC_B;
      const fromId = from === "a" ? SRC_A : SRC_B;
      const src = map.getSource(toId) as RasterTileSource | undefined;
      if (!src || typeof src.setTiles !== "function") {
        // Something removed the buffers (a style swap); rebuild them on the next frame.
        removeAll();
        return;
      }
      src.setTiles(frameTiles);

      // `timer` is a `let` initialised BEFORE the listener is attached, and `finish` is a function
      // declaration rather than a const arrow: if MapLibre ever delivered `sourcedata` during the
      // `.on()` call itself, a const declared below would still be in its temporal dead zone and the
      // swap would throw instead of happening. The `settled` guard makes the ordering irrelevant.
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      function stop() {
        map.off("sourcedata", onData);
        if (timer !== undefined) clearTimeout(timer);
      }
      function finish() {
        if (settled) return;
        settled = true;
        stop();
        radarRef.current.cancel = null;
        try {
          // Reveal the newly loaded buffer and hide the old one IN THAT ORDER — the reverse would
          // show one frame of bare basemap between the two.
          map.setPaintProperty(toId, "raster-opacity", RADAR_OPACITY);
          map.setPaintProperty(fromId, "raster-opacity", 0);
          radarRef.current.shown = to;
        } catch {
          /* the map went away between the timer firing and here */
        }
      }
      const onData = (e: MapSourceDataEvent) => {
        if (e.sourceId === toId && map.isSourceLoaded(toId)) finish();
      };
      map.on("sourcedata", onData);
      timer = setTimeout(finish, SWAP_TIMEOUT_MS);
      // Cancelling leaves the PREVIOUS frame on screen, which is the whole point of the double
      // buffer: a half-loaded frame is never revealed, and the map never flashes empty.
      radarRef.current.cancel = () => {
        if (settled) return;
        settled = true;
        stop();
      };
    } catch {
      /* the style was mid-swap; the next frame retries */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileKey, drawn]);

  return (
    // role="region" + a label, not role="application": MapLibre already labels its own canvas, and
    // "application" would suppress the browsing cursor for everything inside it.
    <div
      ref={ref}
      className="h-full w-full"
      role="region"
      aria-label={t("app.weather.radar.mapAria")}
    />
  );
}
