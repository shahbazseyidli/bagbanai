"use client";

// "Hava" — the weather tab, built as ONESOIL_MOBILE_TEARDOWN §4.7 measures it: a rain radar as the
// primary object, a precipitation-intensity legend down its left edge, and a time scrubber at the
// bottom where the past is solid and the future is hatched.
//
// Two things make it ours rather than a copy. The radar is drawn OVER THE FARMER'S OWN FIELDS
// (GET /api/fields/geo), so it is weather over a place he recognises instead of an abstract region;
// and tapping a field fills a panel with what we already know about that field — our own rain
// nowcast, the Open-Meteo forecast at its centroid, its regional frost climatology and its spray
// window. Nothing on this screen is a number we made up: a reading Open-Meteo omits renders an
// em-dash that explains itself, a block with no data is omitted entirely, and RainViewer's empty
// forecast list is stated in words rather than drawn as a future.
//
// LAYOUT IS MEASURED, NEVER A MEDIA QUERY — the same rule as the dashboard and the field workbench.
// This component puts useStageWidth's callback ref on its own root and branches on the number it
// gets back, because AppShell's content stage is the viewport minus a sidebar that widens at 2xl,
// inside a stage that is bounded at 1040 for routes not on isWideStage's list (/weather is not, by
// design — see the cross-owner note at the bottom of this file).
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ImageOff, Maximize2, Radar, X } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rainviewerTiles, getSavedBasemap } from "@/lib/basemaps";
import { useDataSaver } from "@/lib/dataSaver";
import { t } from "@/lib/i18n";
import { lockScroll } from "@/lib/scrollLock";
import { ErrorNote } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import RainNowcast from "@/components/field/RainNowcast";
import { useStageWidth, WORKBENCH_MIN } from "@/components/field/workbench/useStageWidth";
import FieldForecast from "./FieldForecast";
import FieldSafety from "./FieldSafety";
import RadarLegend from "./RadarLegend";
import RadarMap from "./RadarMap";
import RadarScrubber from "./RadarScrubber";
import { useRadarFrames } from "./useRadarFrames";
import type { Org } from "@/lib/types";

/**
 * The stage width at which the panel moves BESIDE the radar instead of under it.
 *
 * Deliberately not the same number as the map/stack switch: a 780px stage is wide enough for a
 * bigger map but not for a 340px column plus a map still worth looking at. 1000 is the step the
 * dashboard already uses for exactly this decision, and at the 1040 this route is bounded to it
 * leaves the radar ~680px — a real map, not a strip.
 */
const PANEL_MIN = 1000;

/** The side panel's width when there is room for one. Fixed rather than fractional so the radar
 *  takes every extra pixel of a wider window, which is the object that benefits from them. */
const PANEL_W = "w-[340px]";

/** Radar box heights. TWO declarations, never min(): a min() carrying a unit the browser does not
 *  support is invalid at parse time and the WHOLE height is dropped, leaving a 0-height box that
 *  builds MapLibre at 0×0. dvh is Chrome 108 / Safari 15.4; the px floor covers everything older.
 *  Whole class literals — Tailwind's scanner cannot see a class assembled from fragments. */
const MAP_H_NARROW = "relative h-[62dvh] min-h-[320px] w-full";
const MAP_H_WIDE = "relative h-[70dvh] min-h-[420px] w-full";

/** A row of GET /api/fields/geo, declared structurally here so this new directory takes no build
 *  dependency on a component another wave may be rewriting. */
interface GeoField {
  id: string;
  name: string;
  geom: { type: "Polygon"; coordinates: number[][][] } | null;
  centroid?: { type: string; coordinates: number[] } | null;
}

/** The field's point for the forecast call: PostGIS's centroid when we have it, otherwise the mean
 *  of the outer ring — good enough to ask "what is the weather over there". Returns null rather than
 *  a guessed coordinate, and the panel then says so (app.weather.field.noPoint). */
function pointOf(g: GeoField | undefined | null): { lat: number; lon: number } | null {
  if (!g) return null;
  const c = g.centroid?.coordinates;
  if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
    return { lon: c[0], lat: c[1] };
  }
  const ring = g.geom?.coordinates?.[0];
  if (Array.isArray(ring) && ring.length > 0) {
    let lon = 0;
    let lat = 0;
    let n = 0;
    for (const p of ring) {
      if (typeof p?.[0] === "number" && typeof p?.[1] === "number") {
        lon += p[0];
        lat += p[1];
        n += 1;
      }
    }
    if (n > 0) return { lon: lon / n, lat: lat / n };
  }
  return null;
}

function WeatherScreenInner() {
  const router = useRouter();
  const pathname = usePathname() || "/weather";
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [stageRef, stageW] = useStageWidth();

  const [fields, setFields] = useState<GeoField[] | null>(null);
  // A FAILED load is not an empty farm. Collapsing the two would put "you have no fields yet — add
  // one" in front of a farmer with twelve of them whose request timed out, which is the same class
  // of lie as an invented number.
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Radar playback. `frameIdx === null` means "follow the newest observation" — resolved below
  // rather than stored, so a five-minute index refresh moves the default forward on its own.
  const [frameIdx, setFrameIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const dataSaver = useDataSaver();
  const [showRadar, setShowRadar] = useState(false);
  const radarOn = !dataSaver || showRadar;
  const { index, state: radarState } = useRadarFrames(radarOn);

  // document does not exist on the server, and both the fullscreen frame (a portal into body) and
  // the basemap credit (localStorage) would otherwise differ between the server and the first
  // client render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── data ──────────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        if (!active) return;
        if (orgs.length === 0) {
          router.replace("/onboarding");
          return;
        }
        const g = await api.get<{ fields: GeoField[] }>(`/api/fields/geo?org_id=${orgs[0].id}`);
        if (!active) return;
        const rows = g?.fields ?? [];
        setFields(rows);
        setSelectedId((cur) => cur ?? rows.find((f) => pointOf(f) != null)?.id ?? null);
      } catch (err) {
        if (active) {
          setError(azError(err));
          setLoadFailed(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [loading, user, router]);

  // A refreshed index is a different list of frames: the same ordinal now points at a different
  // minute, so the selection goes back to "newest observation" rather than silently sliding.
  const indexSig = index ? `${index.frames.length}:${index.frames[0]?.time ?? 0}` : "";
  useEffect(() => {
    setFrameIdx(null);
  }, [indexSig]);

  // ── fullscreen, driven by ?full=1 ─────────────────────────────────────────────────────────────
  // In the URL for the reason ?map=full is on the field page: the Android back gesture and the
  // browser back button then close it for free, with no popstate listener under the App Router.
  const fullscreen = searchParams.get("full") === "1";
  // Whether the entry on the stack is OURS. A reloaded or shared ?full=1 URL has none, and
  // router.back() there would throw the farmer off the screen entirely.
  const pushedRef = useRef(false);
  function openFullscreen() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("full", "1");
    pushedRef.current = true;
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  function closeFullscreen() {
    if (pushedRef.current) {
      pushedRef.current = false;
      router.back();
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("full");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  // The close handler is rebuilt every render (it reads searchParams), so the effect holds it
  // through a ref — depending on the handler itself would reinstall the key listener, and re-run
  // the scroll lock, on every unrelated render.
  const closeRef = useRef(closeFullscreen);
  closeRef.current = closeFullscreen;
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    // The SHARED ref-counted lock, never a local save/restore of documentElement.style.overflow:
    // the back gesture can pop this overlay while another lock is still held, and a private
    // save/restore would then leave the page frozen for the rest of the session (lib/scrollLock).
    const release = lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      release();
    };
  }, [fullscreen]);

  // ── gates ─────────────────────────────────────────────────────────────────────────────────────
  const header = (
    <div className="mb-3">
      <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">
        {t("app.weather.title")}
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">{t("app.weather.subtitle")}</p>
    </div>
  );

  // Its own branch, above the empty state, for the reason stated where loadFailed is declared.
  if (loadFailed) {
    return (
      <div ref={stageRef}>
        {header}
        <ErrorNote message={error || t("app.weather.loadError")} />
      </div>
    );
  }

  // "Not measured yet" is a real state with its own answer: build NEITHER tree. Guessing the branch
  // for one frame would construct a MapLibre map and tear it straight back down (useStageWidth's
  // header states this). The ref sits on the same <div> in every return, so React reuses the node
  // and the measurement is never re-run.
  if (loading || fields === null || stageW == null) {
    return (
      <div ref={stageRef}>
        <ListSkeleton count={3} />
      </div>
    );
  }

  // Booleans from here down, never the width itself: an invariant split across two variables is not
  // narrowing, and passing `stageW` into a callee is how that trap gets sprung.
  const wide = stageW >= WORKBENCH_MIN;
  const twoCol = stageW >= PANEL_MIN;

  if (fields.length === 0) {
    return (
      <div ref={stageRef}>
        {header}
        {/* Teardown §4.9: icon + ONE sentence + ONE button. Nothing else. */}
        <EmptyState
          icon={Radar}
          title={t("app.weather.radar.heading")}
          body={t("app.weather.empty.body")}
          action={{ label: t("app.weather.empty.cta"), href: "/onboarding" }}
        />
      </div>
    );
  }

  // ── resolved radar frame ──────────────────────────────────────────────────────────────────────
  const frames = index?.frames ?? [];
  // The default is the newest OBSERVATION, never the newest frame: opening the screen must show
  // what the radar has actually seen. A forecast frame is something the farmer chooses to look at.
  const defaultIdx = index
    ? index.lastPastIdx >= 0
      ? index.lastPastIdx
      : frames.length - 1
    : -1;
  const activeIdx = frameIdx != null && frameIdx >= 0 && frameIdx < frames.length ? frameIdx : defaultIdx;
  const activeFrame = activeIdx >= 0 ? frames[activeIdx] : null;
  const frameTiles =
    radarOn && index && activeFrame ? rainviewerTiles(index.host, activeFrame.path) : null;

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const point = pointOf(selected);

  // ── pieces ────────────────────────────────────────────────────────────────────────────────────
  // Plain functions, not nested components: a component declared inside a render is a NEW type on
  // every render, so React would unmount and rebuild its subtree — including the MapLibre canvas.

  function mapFrame() {
    return (
      <>
        <RadarMap
          fields={fields ?? []}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          frameTiles={frameTiles}
        />
        {/* Only claim a scale when the pixels it explains are actually on screen. */}
        {frameTiles && <RadarLegend />}
      </>
    );
  }

  function scrubber() {
    if (!radarOn) {
      return (
        // The data saver's consent gate — same shape as the layer picker's. Radar tiles are the
        // heaviest thing on this screen, so on a metered connection they wait to be asked for. The
        // MAP still renders: the fields are the context, and the copy promises only that the radar
        // frames are held back.
        <button
          type="button"
          onClick={() => setShowRadar(true)}
          className="flex min-h-12 w-full items-center gap-2 rounded-xl border-[1.5px] border-dashed border-line bg-paper-2 px-3 py-2 text-left hover:border-grass"
        >
          <ImageOff className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold leading-tight text-ink">
              {t("app.weather.radar.loadCta")}
            </span>
            <span className="block text-[11px] leading-snug text-ink-soft">
              {t("app.weather.radar.loadHint")}
            </span>
          </span>
        </button>
      );
    }
    if (!index || frames.length === 0) {
      // "failed" is the ONLY state that may say the radar is unavailable. `idle` (the first render,
      // before the hook's effect has run) and `loading` both mean "not yet" — announcing
      // "unavailable" for those would flash a false verdict on every open. Either way the map keeps
      // showing the fields: this screen never depends on RainViewer to be worth opening.
      return (
        <p className="text-[12px] text-ink-soft">
          {t(
            radarState === "failed"
              ? "app.weather.radar.unavailable"
              : "app.weather.radar.loading",
          )}
        </p>
      );
    }
    return (
      <RadarScrubber
        frames={frames}
        lastPastIdx={index.lastPastIdx}
        activeIdx={activeIdx}
        onSelect={(i) => setFrameIdx(i)}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
    );
  }

  // RainViewer's credit is a LICENCE obligation, rendered as VISIBLE TEXT because every map in this
  // app is built with attributionControl:false — a source's own attribution string is painted
  // nowhere. It appears whenever radar pixels are on screen and never when they are not. The
  // basemap's own credit always applies but is read after mount, because it comes from localStorage
  // and would otherwise differ between the server render and the first client one.
  function credits() {
    const parts = [
      frameTiles ? t("app.weather.radar.attribution") : null,
      mounted ? getSavedBasemap().attribution : null,
    ].filter((x): x is string => !!x);
    if (parts.length === 0) return null;
    return (
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-soft">{parts.join(" · ")}</p>
    );
  }

  const fullscreenBtn = (
    <button
      type="button"
      onClick={openFullscreen}
      aria-label={t("app.weather.radar.fullscreen")}
      title={t("app.weather.radar.fullscreen")}
      // 48px, like every other control on a map in this product (ONESOIL_DESIGN_SYSTEM §2.3/§4.2).
      className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink hover:border-mint hover:text-grass-deep"
    >
      <Maximize2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );

  const radarCard = (
    <section
      aria-label={t("app.weather.radar.heading")}
      className="overflow-hidden rounded-xl2 border-[1.5px] border-line bg-panel"
    >
      <div className="flex min-h-[56px] items-center gap-2 px-2 py-1">
        <h2 className="pl-1 text-[13px] font-bold text-ink">{t("app.weather.radar.heading")}</h2>
        {fullscreenBtn}
      </div>

      {/* Sized, relative, in normal flow — never under a sticky/fixed/transformed ancestor, which
          leaves the canvas blank until something forces a resize. The box keeps its height while
          the overlay owns the map, so nothing jumps when it closes. */}
      <div className={wide ? MAP_H_WIDE : MAP_H_NARROW}>
        {fullscreen ? (
          // Exactly ONE live MapLibre context: the overlay's. One WebGL context on a phone, and the
          // fullscreen map is built inside a box that already has its final size.
          <div className="h-full bg-paper-2" aria-hidden="true" />
        ) : (
          mapFrame()
        )}
      </div>

      {/* NOT rendered while the overlay is up, and this is correctness rather than tidiness: the
          scrubber owns the playback timer, and two live copies would advance the frame twice per
          tick. The overlay covers the viewport, so nothing visible moves either way. */}
      {!fullscreen && (
        <div className="px-3 pb-3 pt-2">
          {scrubber()}
          <p className="mt-1.5 text-[11px] text-ink-soft">{t("app.weather.radar.tapHint")}</p>
          {credits()}
        </div>
      )}
    </section>
  );

  const picker = (
    <div>
      <h2 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
        {t("app.weather.field.pickerLabel")}
      </h2>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {fields.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedId(f.id)}
            aria-pressed={f.id === selectedId}
            className={`min-h-[var(--tap)] shrink-0 rounded-full border-[1.5px] px-3 text-[12.5px] font-semibold ${
              f.id === selectedId
                ? "border-grass bg-mint-soft text-grass-deep"
                : "border-line bg-panel text-ink hover:border-mint"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );

  const panel = selected ? (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="min-w-0 truncate font-display text-base font-bold text-ink">
          {selected.name}
        </h2>
        <Link
          href={`/fields/${selected.id}`}
          className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
        >
          {t("app.weather.field.openField")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Rendered, not reimplemented: RainNowcast already reads GET /api/fields/{id}/rain-nowcast,
          already renders the verdict through the backend's code+params, and already returns null
          when there is nothing to say. Copying it would fork the wording of the one sentence a
          farmer reads standing at the sprayer. */}
      <RainNowcast fieldId={selected.id} />

      {point ? (
        <FieldForecast lat={point.lat} lon={point.lon} />
      ) : (
        <p className="text-[13px] text-ink-soft">{t("app.weather.field.noPoint")}</p>
      )}

      <FieldSafety fieldId={selected.id} />
    </div>
  ) : null;

  // ── fullscreen frame ──────────────────────────────────────────────────────────────────────────
  const overlay =
    fullscreen && mounted
      ? createPortal(
          // Portalled to document.body, and that is load-bearing rather than tidiness: a `transform`
          // / `filter` / `backdrop-filter` ancestor turns position:fixed into an ordinary containing
          // block, and inset-0 would then size to THAT ancestor — the map would be built at the
          // wrong size. This route renders inside AppShell's full-bleed track (a negative margin,
          // not a transform) under a blurred header, so the portal is the only place guaranteed
          // free of one. z-50 clears BottomNav (z-40), Nav (z-30) and the rail (z-30).
          //
          // The fixed root IS the sized frame the map hangs in, and there is NO open/close
          // transition: a map measured mid-transition keeps the wrong size for good. Mount/unmount
          // only, never `hidden`, which would give a 0×0 canvas.
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("app.weather.radar.fullscreenAria")}
            className="fixed inset-0 z-50 flex flex-col bg-paper"
          >
            <div className="shrink-0 border-b border-line bg-panel pt-[env(safe-area-inset-top)]">
              <div className="flex h-14 items-center gap-2 px-2">
                <h2 className="pl-1 text-[13px] font-bold text-ink">
                  {t("app.weather.radar.heading")}
                </h2>
                <button
                  type="button"
                  onClick={() => closeRef.current()}
                  aria-label={t("app.weather.radar.exitFullscreen")}
                  title={t("app.weather.radar.exitFullscreen")}
                  className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink hover:border-mint"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">{mapFrame()}</div>

            {/* §5.4 — the scrubber stays pinned at the bottom, which is the whole reason the expand
                button exists: browse two hours of weather without leaving the picture. */}
            <div className="shrink-0 border-t border-line bg-panel px-3 pb-[calc(env(safe-area-inset-bottom)_+_0.5rem)] pt-2">
              {scrubber()}
              {credits()}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={stageRef}>
      {header}
      {twoCol ? (
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">{radarCard}</div>
          <div className={`${PANEL_W} shrink-0 space-y-3`}>
            {picker}
            {panel}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {radarCard}
          {picker}
          {panel}
        </div>
      )}
      {overlay}
    </div>
  );
}

// useSearchParams needs a Suspense boundary under the App Router — the same wrapper the field page
// and /chat use.
export default function WeatherScreen() {
  return (
    <Suspense fallback={<ListSkeleton count={3} />}>
      <WeatherScreenInner />
    </Suspense>
  );
}

// ── CROSS-OWNER NOTE (not actionable from this file) ───────────────────────────────────────────
// /weather is NOT in AppShell's isWideStage() list, so on desktop it renders inside DOC_STAGE's
// 1040px reading column. That is a deliberate default and this screen is built for it — 1040 still
// clears PANEL_MIN, so the two-column layout is reachable on every laptop. If the owner later wants
// the radar to take the full bleed like "/" and the field page do, the change is one entry in
// components/shell/AppShell.tsx (grep `isWideStage`), which this wave does not own.
