"use client";

// 6.6 — the persistent field map card.
//
// ONE map for the whole field screen. FieldMapSheet mounts this between the header and the section
// nav, so it survives every section change: a farmer walking from "Sahənin vəziyyəti" to "İşlər"
// keeps looking at the same picture of the same field. That is the entire point of "persistent" —
// a card mounted per section would tear down and rebuild its MapLibre context on every tap.
//
// It is also the ONLY satellite read model on the narrow field screen. SatelliteGlance was absorbed
// into this file rather than kept beside it: two components each running their own /scenes fetch
// would let the map paint 11 July while the number underneath reported 23 July, on the ramp of
// whichever index the other one happened to be showing.
//
// The chrome placement deviates from the teardown on purpose. DisplayMap (FieldMap.tsx)
// unconditionally owns the map's top-left (the measure/ruler toolbar at left-2 top-2) and its
// top-right (MapLibre's NavigationControl), and FieldMap.tsx is not ours this phase — floating the
// index chips and the expand button over those corners would bury the ruler and the zoom buttons.
// They sit in a row directly above the map instead: still the card's top-left and top-right.
// SatelliteStage had to work around the same two corners (it moved its chips to top-centre). The
// vertical colour ramp DOES live on the map, on the left edge, which is free between the ruler
// (top) and BasemapControl (bottom-3).
//
// Sensor is always Sentinel-2 — HLS still feeds the data layer, but it is no longer something the
// farmer is asked to think about (E14.3).
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CloudSun, ImageOff, Maximize2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Placeholder } from "@/components/ui";
import { t, tf } from "@/lib/i18n";
import { indexLabel, legendFor } from "@/lib/indexStatus";
import { DisplayMap } from "@/components/FieldMap";
import { useDataSaver } from "@/lib/dataSaver";
import type { FieldDetail, MapPin, RasterScene, RasterScenes } from "@/lib/types";

// Cover, moisture, nitrogen — the three a farmer acts on. All nine live in the satellite section,
// one tap away; offering nine here would rebuild the workbench this card exists to replace.
const CARD_INDICES = ["NDVI", "NDMI", "NDRE"];

type Scene = RasterScene & { value?: number | null };
type ScenesResponse = Omit<RasterScenes, "scenes"> & { scenes: Scene[] };

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(2);
}

// TiTiler serves the same COG either as a tile pyramid or as one finished PNG, so the chip picture
// is a pure string transform of the tile template the map is already using — same COG, same
// colormap, same rescale, therefore the same colours by construction. Derived rather than fetched
// because the alternative is a second server read model for a ~1 KB image we already hold a URL
// for. max_size mirrors indices.py::_THUMB_MAX_SIZE; a field COG is ~30x25px, so it is a ceiling,
// not a resize. An unrecognised URL shape yields null → no picture, never a guessed URL.
const CHIP_MAX_SIZE = 128;

function scenePreview(tileUrl: string | null | undefined): string | null {
  if (!tileUrl) return null;
  const cut = tileUrl.indexOf("/cog/");
  const q = tileUrl.indexOf("?");
  if (cut < 0 || q < 0 || q < cut) return null;
  return `${tileUrl.slice(0, cut)}/cog/preview.png${tileUrl.slice(q)}&max_size=${CHIP_MAX_SIZE}`;
}

function SceneThumb({ url, date }: { url: string | null; date: string }) {
  // Own broken state per chip, so one unrenderable scene does not blank the whole strip.
  const [broken, setBroken] = useState(false);
  if (!url || broken) return null;
  return (
    <img
      src={url}
      // Decorative: the date and the value are printed right above and below it.
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      title={tf("app.fieldsList.thumbTitle", { date: date?.slice(0, 10) ?? "" })}
      onError={() => setBroken(true)}
      // These PNGs are a few dozen pixels wide on purpose; keep them crisp when upscaled.
      style={{ imageRendering: "pixelated" }}
      className="mt-1 h-10 w-full rounded-[6px] border border-line bg-paper-2 object-contain"
    />
  );
}

// The numeric domain of the ramp is not in legendFor() — it is the `rescale` string TiTiler
// coloured the pixels with, which the scenes response already carries. Parsing it keeps one copy
// of _raster_style in the system; hard-coding a second one here would let the tick and the pixels
// disagree the day a family range changes.
function parseRange(rescale: string | null | undefined): [number, number] | null {
  if (!rescale) return null;
  const p = rescale.split(",");
  if (p.length !== 2) return null;
  const lo = Number(p[0]);
  const hi = Number(p[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  return [lo, hi];
}

function pos(v: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
}

// The ramp with the reading marked on it — this is what turns a printed number into a judgement.
// aria-hidden on the wrapper is the whole accessibility contract: the value is already announced
// two lines above, and a screen reader cannot read a colour ramp. No role, no aria-valuenow.
function ValueBar({
  grad,
  pct,
  ghostPct,
  title,
  ghostTitle,
}: {
  grad: string;
  pct: number | null;
  ghostPct: number | null;
  title?: string;
  ghostTitle?: string;
}) {
  return (
    <div
      className="relative mt-2.5 h-2 rounded"
      style={{ background: grad }}
      aria-hidden="true"
      title={title}
    >
      {/* Where the value stood four weeks ago, so the movement the delta states in numbers is also
          visible in space. */}
      {ghostPct != null && (
        <span
          className="absolute top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 ring-1 ring-black/25"
          style={{ left: `${ghostPct}%` }}
          title={ghostTitle}
        />
      )}
      {/* White with a dark ring is the only treatment legible on every stop of both ramps — the
          hard cases are #fee08b in the middle of the vegetation ramp and #f7f7f7 in the water one.
          Deliberately not animated: a transition on `left` would need motion-reduce handling. */}
      {pct != null && (
        <span
          className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(15,23,42,0.6)]"
          style={{ left: `${pct}%` }}
        />
      )}
    </div>
  );
}

// legendFor() hands back one horizontal CSS gradient. The vertical ramp is that same string turned
// 90°, never a second hand-written stop list: CSS `0deg` points UP, so the low stop lands at the
// bottom and the ramp reads bad→good upwards (ONESOIL_DESIGN_SYSTEM §1.5). If the string ever stops
// carrying "90deg" this returns null and only the horizontal ramp renders — a plausible-looking
// gradient with invented colours would be worse than no gradient.
function verticalGrad(grad: string): string | null {
  return grad.includes("90deg") ? grad.replace("90deg", "0deg") : null;
}

export default function FieldMapCard({
  field,
  onOpenSatellite,
  fullscreen,
  onOpenFullscreen,
  onCloseFullscreen,
  pins,
  onPinClick,
  reticle = false,
  onCenterChange,
  flyTo,
}: {
  field: FieldDetail;
  onOpenSatellite: () => void;
  /** Driven by ?map=full on the field URL, so the Android back gesture closes it for free. */
  fullscreen: boolean;
  onOpenFullscreen: () => void;
  onCloseFullscreen: () => void;
  // 6.5 — the section currently on screen can put its own points on this map. Five optional props,
  // passed straight through to DisplayMap, which owns the layer: the alternative was a second map
  // for the scouting section, and two MapLibre contexts on a phone is not a trade worth making.
  // Scouting is the only caller today.
  pins?: MapPin[];
  onPinClick?: (id: string) => void;
  reticle?: boolean;
  onCenterChange?: (lng: number, lat: number) => void;
  flyTo?: { lng: number; lat: number; seq: number } | null;
}) {
  const [index, setIndex] = useState("NDVI");
  const [data, setData] = useState<ScenesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  // What the loaded scenes actually MEASURE. `index` is what the farmer just tapped; until the
  // response lands the two differ, and labelling the previous index's numbers with the new index's
  // name and colour ramp is simply wrong — NDMI's water ramp over NDVI values inverts the meaning.
  const [shownIndex, setShownIndex] = useState("NDVI");
  const dataSaver = useDataSaver();
  // On a metered connection the raster is not fetched until the farmer asks for it (D4.5). Because
  // the card lives above the section nav, this answer is remembered for the whole field visit —
  // tapped once, not once per section.
  const [showRaster, setShowRaster] = useState(false);
  // document does not exist on the server, and the overlay is a portal into document.body.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Asking to place a point ON THE MAP is itself a request for the map, so the data saver's
  // withheld state steps aside for it. Without this the farmer taps "pick the spot on the map" and
  // gets a placement bar over a grey box with a "load the picture" button in it.
  useEffect(() => {
    if (reticle) setShowRaster(true);
  }, [reticle]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    api
      .get<ScenesResponse>(`/api/fields/${field.id}/scenes?index=${index}&sensor=s2`)
      .then((r) => {
        if (!active) return;
        setData(r ?? null);
        setSceneIdx(0);
        setShownIndex(index);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [field.id, index]);

  // The page rebuilds its close handler every render (it reads searchParams), so the effect below
  // holds it through a ref. Depending on the handler itself would reinstall the key listener — and
  // re-run the body-overflow save/restore — on every keystroke elsewhere on the page.
  const closeRef = useRef(onCloseFullscreen);
  closeRef.current = onCloseFullscreen;

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    // Restore the PREVIOUS inline value, not "": another overlay (the undo bar's page, a modal)
    // may already have locked the body, and blanking it would silently unlock theirs.
    // documentElement, NOT body. globals.css sets `html, body { overflow-x: hidden }`, which makes
    // html's computed overflow-y `auto` — and body's overflow only propagates to the viewport while
    // html's is `visible`. Locking body here clipped nothing and the page scrolled behind the
    // overlay.
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const scenes = useMemo(() => data?.scenes ?? [], [data]);
  const active: Scene | null = scenes[sceneIdx] ?? scenes[0] ?? null;
  // Scenes come newest-first, so the "4 weeks ago" comparison is simply four entries further down.
  const olderIdx = Math.min(scenes.length - 1, sceneIdx + 4);
  const older = scenes[olderIdx];
  const delta =
    active?.value != null && older?.value != null && olderIdx !== sceneIdx
      ? active.value - older.value
      : null;

  const legend = legendFor(shownIndex);
  const rasterVisible = !dataSaver || showRaster;

  // The card paints `tile_url` (the fixed family rescale), never `tile_url_auto`, so the tick and
  // the pixel colours always share one domain. Without a usable range the ramp still renders — as
  // a plain legend, with no tick: a mark on an invented scale would be a lie.
  const range = parseRange(data?.rescale);
  const activeValue = active?.value ?? null;
  const olderValue = older?.value ?? null;
  const pct = range && activeValue != null ? pos(activeValue, range[0], range[1]) : null;
  const ghostPct =
    range && delta != null && olderValue != null ? pos(olderValue, range[0], range[1]) : null;
  // Mouse-only hints; nothing here is announced (the bars are aria-hidden).
  const barTitle = range
    ? tf("app.field.glance.scaleRange", { lo: range[0].toFixed(2), hi: range[1].toFixed(2) })
    : undefined;
  const ghostTitle =
    ghostPct != null && olderValue != null
      ? tf("app.field.glance.previousMark", { value: olderValue.toFixed(2) })
      : undefined;

  // 6.5 — pins are the SECTION's own data, not satellite data. A field whose scenes failed or have
  // not been processed yet still has scouting notes, and a placement reticle needs something to
  // aim at, so either one keeps the map where the satellite empty state would have taken it. The
  // data-saver gate is untouched: withholding tiles is a consent decision, not a content one.
  const needMap = (pins?.length ?? 0) > 0 || reticle;
  const emptyState = (failed || (!loading && scenes.length === 0)) && !needMap;
  const mapShown = !emptyState && rasterVisible && scenes.length > 0;
  const vGrad = verticalGrad(legend.grad);

  // --- shared pieces ---------------------------------------------------------
  // Plain functions, not nested components: a component declared inside a render is a NEW type on
  // every render, so React would unmount and rebuild its subtree — including the MapLibre canvas.

  function indexChips() {
    return (
      <div
        role="group"
        aria-label={t("app.field.workbench.indexGroupAria")}
        className="flex gap-1"
      >
        {CARD_INDICES.map((ix) => (
          <button
            key={ix}
            type="button"
            onClick={() => setIndex(ix)}
            aria-pressed={index === ix}
            className={`min-h-9 rounded-full border-[1.5px] px-3 text-[12.5px] font-semibold ${
              index === ix
                ? "border-grass bg-mint-soft text-grass-deep"
                : "border-line bg-panel text-ink-soft hover:border-mint"
            }`}
          >
            {indexLabel(ix)}
          </button>
        ))}
      </div>
    );
  }

  // The map area for BOTH frames. The parent must be `relative` and already sized: DisplayMap in
  // `fill` mode builds itself once, at the size of that box, and exposes no resize().
  function mapFrame() {
    return (
      <>
        {emptyState ? (
          // Fills the frame instead of collapsing it: the card keeps its height whether or not
          // there are scenes, so the sections below it do not jump when the response lands.
          <div className="flex h-full items-center justify-center bg-paper-2 px-6">
            <Placeholder>
              {failed ? t("app.field.glance.failed") : t("app.field.glance.preparing")}
            </Placeholder>
          </div>
        ) : rasterVisible && (scenes.length > 0 || needMap) ? (
          <DisplayMap
            polygon={field.geom}
            rasterUrl={active?.tile_url ?? null}
            fill
            pins={pins}
            onPinClick={onPinClick}
            reticle={reticle}
            onCenterChange={onCenterChange}
            flyTo={flyTo}
          />
        ) : (
          // Basemap tiles are bytes too, so the saver withholds the whole map, not just the index
          // raster. Pressing "full screen" is a request for a bigger view, not consent to download:
          // the fullscreen frame renders this identical gate.
          <button
            type="button"
            onClick={() => setShowRaster(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-line bg-paper-2 text-[13px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep"
          >
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            {t("app.field.glance.loadRaster")}
          </button>
        )}

        {/* Vertical, numberless ramp on the map's free left edge — the reading's colour language,
            without a second set of numbers competing with the value below. pointer-events-none is
            not decoration: a 10px-wide strip sitting over the map would otherwise swallow pan
            gestures started near the left bezel. That also means no `title` here — a tooltip needs
            the pointer; the numeric domain is on the horizontal ValueBar below, which does take it. */}
        {mapShown && vGrad && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 z-20 h-40 w-2.5 -translate-y-1/2 rounded-full ring-1 ring-black/15"
            style={{ background: vGrad }}
            aria-hidden="true"
          />
        )}

        {loading && (
          <div
            // pointer-events-none, or the map cannot be panned for the length of every /scenes
            // round-trip — and in placement mode this sits ABOVE the reticle, so the farmer gets a
            // crosshair they cannot aim.
            className="pointer-events-none absolute inset-0 z-30 animate-pulse bg-paper-2/85"
            aria-hidden="true"
          />
        )}
      </>
    );
  }

  function metrics() {
    return (
      <>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <b className="font-display text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
            {fmt(activeValue)}
          </b>
          {delta != null && (
            <span
              className={`text-[12.5px] font-bold tabular-nums ${
                delta >= 0 ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(2)} · {t("app.field.glance.fourWeeks")}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenSatellite}
            className="ml-auto inline-flex min-h-9 items-center gap-1 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
          >
            {t("app.field.glance.openFull")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Fixed ramp — the same value means the same colour on every date — with the field mean
            marked on it, and a ghost tick where it stood four weeks ago. */}
        <ValueBar
          grad={legend.grad}
          pct={pct}
          ghostPct={ghostPct}
          title={barTitle}
          ghostTitle={ghostTitle}
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-ink-soft">
          <span>{legend.low}</span>
          <span>{legend.mid}</span>
          <span>{legend.high}</span>
        </div>

        {/* Naming the number matters once it has a mark on a scale: the tick is where the FIELD
            MEAN sits, not any one pixel. The date says WHICH picture is on the map above. */}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-[12px] text-ink-soft">
          <span>
            {indexLabel(shownIndex)} · {t("app.field.glance.fieldAverage")}
          </span>
          {active && (
            <span className="tabular-nums">
              {active.date}
              {active.cloud_pct != null
                ? ` · ${t("app.field.glance.cloud")} ${Math.round(active.cloud_pct)}%`
                : ""}
            </span>
          )}
        </div>
      </>
    );
  }

  // `frame` only scopes the scroll-hint id. Both frames are in the DOM at once while the overlay is
  // open (the card keeps its metrics so nothing jumps when it closes), and two elements sharing one
  // id is invalid — aria-describedby would resolve to whichever came first, which is the hidden one.
  function dateStrip(frame: "card" | "full") {
    if (scenes.length === 0) return null;
    const scrollHintId = `card-scroll-hint-${frame}-${field.id}`;
    return (
      <>
        <p className="mb-1.5 mt-3 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
          {t("app.field.glance.dates")}
        </p>
        {/* aria-description is not in React's typed ARIA set, so the scroll hint below is
            referenced by id instead — same announcement, no cast. */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          aria-describedby={scenes.length > 6 ? scrollHintId : undefined}
        >
          {scenes.slice(0, 12).map((s, i) => {
            const sv = s.value ?? null;
            const sp = range && sv != null ? pos(sv, range[0], range[1]) : null;
            return (
              <button
                key={s.scene_id}
                type="button"
                onClick={() => setSceneIdx(i)}
                aria-pressed={i === sceneIdx}
                className={`min-w-[84px] shrink-0 rounded-[10px] border-[1.5px] px-2 py-1.5 text-center ${
                  i === sceneIdx ? "border-grass bg-mint-soft" : "border-line bg-panel hover:border-mint"
                }`}
              >
                <b className="block text-[11.5px] font-bold text-ink">{s.date.slice(5)}</b>
                {/* Withheld together with the big raster: while the farmer has declined that one on
                    a metered connection, painting twelve small ones would be incoherent. */}
                {rasterVisible && <SceneThumb url={scenePreview(s.tile_url)} date={s.date} />}
                <span className="block text-[10.5px] tabular-nums text-ink-soft">{fmt(s.value)}</span>
                {/* Same ramp, same domain as the bar above, so the ticks drifting across the chips
                    read as a small time series. */}
                {sp != null && (
                  <div
                    className="relative mt-1 h-[3px] rounded"
                    style={{ background: legend.grad }}
                    aria-hidden="true"
                  >
                    <span
                      className="absolute top-1/2 h-[7px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.55)]"
                      style={{ left: `${sp}%` }}
                    />
                  </div>
                )}
                {s.cloud_pct != null && (
                  <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[9.5px] text-ink-soft">
                    <CloudSun className="h-2.5 w-2.5" aria-hidden="true" />
                    {Math.round(s.cloud_pct)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {scenes.length > 6 && (
          <p id={scrollHintId} className="text-[10.5px] text-ink-soft">
            {t("app.field.workbench.scrollDates")}
          </p>
        )}
      </>
    );
  }

  // --- frames ----------------------------------------------------------------

  const overlay =
    fullscreen && mounted
      ? createPortal(
          // Portalled to document.body, and that is load-bearing rather than tidiness: a `transform`
          // / `filter` / `backdrop-filter` ancestor turns position:fixed into an ordinary containing
          // block, and inset-0 would then size to THAT ancestor — the map would be built at the
          // wrong size and never resized (DisplayMap exposes no resize()). The field page sits
          // inside AppShell's flex row with its xl:-mx-14 full-bleed step, under a backdrop-blur
          // header. z-50 clears BottomNav (z-40), Nav (z-30) and the rail/list panel (z-30).
          //
          // The fixed root IS the sized frame the map hangs in — no sticky ancestor, and no
          // open/close animation: a map built during a size transition keeps the wrong size for
          // good. Mount/unmount only, never `hidden`, which would give a 0×0 canvas.
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("app.field.card.fullscreenAria")}
            className="fixed inset-0 z-50 flex flex-col bg-paper"
          >
            <div className="shrink-0 border-b border-line bg-panel pt-[env(safe-area-inset-top)]">
              <div className="flex h-14 items-center gap-2 px-2">
                {indexChips()}
                <span className="ml-auto hidden text-[11.5px] text-ink-soft sm:inline">
                  {t("app.field.card.escHint")}
                </span>
                <button
                  type="button"
                  onClick={() => closeRef.current()}
                  aria-label={t("app.field.card.exitFullscreen")}
                  title={t("app.field.card.exitFullscreen")}
                  className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink hover:border-mint sm:ml-0"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">{mapFrame()}</div>

            {/* §5.4 — the date strip stays pinned at the bottom, which is the whole reason the
                expand button exists: browse the season without leaving the picture. */}
            <div className="shrink-0 border-t border-line bg-panel px-3 pb-[calc(env(safe-area-inset-bottom)_+_0.5rem)] pt-2">
              {metrics()}
              {dateStrip("full")}
              <p className="mt-1 text-[10.5px] text-ink-soft">{t("app.field.glance.attribution")}</p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section
        id="field-map-card"
        aria-label={t("app.field.card.aria")}
        className="overflow-hidden rounded-xl border-[1.5px] border-line bg-panel"
      >
        {/* Control row — chips left, expand right. See the file header for why this is a row above
            the map rather than chrome floated on its corners. */}
        <div className="flex h-11 items-center gap-2 px-2">
          {indexChips()}
          <button
            type="button"
            onClick={onOpenFullscreen}
            aria-label={t("app.field.card.fullscreen")}
            title={t("app.field.card.fullscreen")}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink-soft hover:border-mint hover:text-grass-deep"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Sized, relative, in normal flow — never under a sticky ancestor, which leaves the canvas
            blank until something forces a resize (see FieldMapSheet's history). The box keeps its
            height while the overlay owns the map, so nothing jumps when it closes. */}
        {/* Two declarations, never min(): a min() carrying an unsupported unit is invalid at parse
            time and the browser drops the WHOLE height, leaving a 0-height box that builds MapLibre
            at 0x0. dvh is Chrome 108 / Safari 15.4 — exactly the budget-Android population this
            product is for. FieldWorkbench pairs its dvh with a px floor for the same reason. */}
        <div className="relative h-[360px] max-h-[46dvh]">
          {fullscreen ? (
            // Exactly one live MapLibre context: the overlay's. One WebGL context on a phone, and
            // the fullscreen map is built inside a box that already has its final size. The price
            // is a rebuild + fitBounds + a (normally HTTP-cached) tile re-request on close.
            <div className="h-full bg-paper-2" aria-hidden="true" />
          ) : (
            mapFrame()
          )}
        </div>

        <div className="px-3 pb-3 pt-2.5">
          {metrics()}
          {dateStrip("card")}
          {/* Licence obligation, not a caption. */}
          <p className="mt-1 text-[10.5px] text-ink-soft">{t("app.field.glance.attribution")}</p>
        </div>
      </section>

      {overlay}
    </>
  );
}
