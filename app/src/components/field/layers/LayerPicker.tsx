"use client";

// W4 — the layer picker.
//
// The problem it solves: the map has ten possible layers and the farmer had a row of three-letter
// codes to choose between. NDVI, NDMI, NDRE are not words. So the picker shows the FIELD ITSELF in
// each index — the same COG the map would paint, rendered as one small PNG — with the plain name
// and the one line that says what the layer answers underneath it. Choosing becomes looking.
//
// Two variants of one component, because the two surfaces that need it are the same list in
// different rooms:
//   sheet — a bottom sheet portalled to document.body, for the phone (and for the fullscreen map).
//   panel — a plain in-flow block inside the caller's card, for a desktop-width stage.
// Which one is NOT decided here and is not a breakpoint: the field page measures its stage once
// (useStageWidth) and passes the answer to both callers, because the app stage is not the viewport
// — it is the viewport minus the rail minus a collapsible field list, and it is narrower at xl than
// at lg. Each caller picking its own would put a fixed inset-0 overlay on a 1440px desktop and
// ~1250px of in-flow tiles on a 375px phone, which is precisely what shipped before.
// No popover positioning anywhere: a floating panel anchored to a trigger is a category of bug
// (clipping, flipping, scroll containers) this file has no reason to enter.
//
// There is no MapLibre in here, so useMapReady is not involved.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ImageOff, X } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { indexLabel, legendFor } from "@/lib/indexStatus";
import { useDataSaver } from "@/lib/dataSaver";
import { lockScroll } from "@/lib/scrollLock";
import { orderLayers, layerGroup, layerGroupLabel, type LayerGroup } from "./layerCatalog";
import { useLayerPreviews, type LayerPreview, type LayerPreviewSeed } from "./useLayerPreviews";
import LayerTile from "./LayerTile";

/** How the pixels are stretched, NOT which quantity is drawn. The layer is the quantity. */
export type RenderMode = "fixed" | "contrast";

/**
 * Which surface the list opens as. The CALLER decides, from a width it has already measured — this
 * component owns no breakpoint of its own, because the two callers sit in boxes whose width is not
 * the viewport's (see useStageWidth: the app stage is narrower at xl than at lg).
 */
export type PickerVariant = "sheet" | "panel";

// Structural, not React's RefObject<T>: it satisfies both `useRef<HTMLButtonElement>(null)` and a
// hand-built holder, and it keeps this file out of forwardRef ceremony for what is one focus call.
type ButtonRef = { current: HTMLButtonElement | null };

/**
 * The control that opens the picker — OneSoil's `layer_button` (measured 198×52dp) at 48px.
 *
 * It is also the answer to "what am I looking at": after the sheet closes, this button is the only
 * thing on screen naming the layer, which is why it carries the swatch and the active render mode
 * rather than just a chevron.
 */
export function LayerButton({
  index,
  mode,
  preview,
  showPicture = true,
  open,
  controlsId,
  onClick,
  buttonRef,
  className = "",
}: {
  index: string;
  mode?: RenderMode;
  preview?: LayerPreview;
  showPicture?: boolean;
  open: boolean;
  controlsId: string;
  onClick: () => void;
  buttonRef?: ButtonRef;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const label = indexLabel(index);
  const legend = legendFor(index);
  const url = preview?.url ?? null;
  const showThumb = showPicture && !!url && !broken;
  const modeLabel = mode === "contrast" ? t("app.field.satelliteTab.contrastBtn") : null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controlsId}
      // The visible text already says both things; aria-label REPLACES it for a screen reader, so
      // the mode has to be folded in here or it disappears.
      aria-label={tf("app.field.layers.triggerAria", {
        layer: modeLabel ? `${label} · ${modeLabel}` : label,
      })}
      className={`flex min-h-12 min-w-0 items-center gap-2 rounded-full border-[1.5px] border-line bg-panel py-1 pl-1 pr-3 text-left hover:border-mint ${className}`}
    >
      <span
        className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10"
        // Without a picture the swatch is the layer's own ramp — the same colour language the map
        // is painted in, never a generic grey circle.
        style={showThumb ? undefined : { background: legend.grad }}
        aria-hidden="true"
      >
        {showThumb && url && (
          <img
            src={url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            style={{ imageRendering: "pixelated" }}
            className="h-full w-full object-cover"
          />
        )}
      </span>
      <span className="min-w-0 truncate text-[12.5px] font-bold leading-tight text-ink">
        {label}
        {modeLabel ? ` · ${modeLabel}` : ""}
      </span>
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
    </button>
  );
}

export default function LayerPicker({
  fieldId,
  indices,
  index,
  onSelect,
  open,
  onClose,
  variant = "sheet",
  seed,
  mode,
  onModeChange,
  contrastAvailable = false,
  triggerRef,
  id,
}: {
  fieldId: string;
  indices: string[];
  index: string;
  onSelect: (index: string) => void;
  open: boolean;
  onClose: () => void;
  variant?: PickerVariant;
  seed?: LayerPreviewSeed | null;
  mode?: RenderMode;
  onModeChange?: (mode: RenderMode) => void;
  contrastAvailable?: boolean;
  triggerRef?: ButtonRef;
  /** Must match the LayerButton's aria-controls. */
  id?: string;
}) {
  // EVERY hook runs unconditionally; only the RETURN below is conditional. An early return above
  // these would change the hook count between open and closed and crash on the transition.
  const [mounted, setMounted] = useState(false);
  const [showPictures, setShowPictures] = useState(false);
  const dataSaver = useDataSaver();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // The caller rebuilds its close handler every render (it reads searchParams), so the effect
  // below holds it through a ref instead of reinstalling the key listener on every keystroke.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => setMounted(true), []);

  const picturesOn = !dataSaver || showPictures;

  // The caller passes a fresh array literal every render; the join makes this memo (and the
  // loader's effect below it) fire on a real change of the LIST.
  const indexSig = indices.join(",");
  const ordered = useMemo(
    () => orderLayers(indexSig ? indexSig.split(",") : []),
    [indexSig],
  );

  const previews = useLayerPreviews(fieldId, ordered, open && picturesOn, seed);

  // Keyboard and focus — BOTH variants. Only the scroll lock and the portal are sheet-specific, so
  // hanging these off the same `variant === "sheet"` guard silently regressed the desktop panel
  // against the <select> it replaced: that <select> closed on Escape and kept focus on itself,
  // while the panel could only be dismissed with the mouse, and choosing a tile unmounted the
  // focused button and dropped focus to <body>.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // CAPTURE phase on document, not a window listener: FieldMapCard's fullscreen overlay also
      // closes on Escape via a window (bubble) listener, and the sheet can be opened from inside
      // it. Capture runs first, so stopPropagation here closes the sheet WITHOUT also tearing
      // down the map behind it.
      e.stopPropagation();
      closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Back to the control that opened it. Null (the card unmounted) is a no-op, not a throw.
      triggerRef?.current?.focus();
    };
  }, [open, triggerRef]);

  useEffect(() => {
    // Sheet only: the panel is an in-flow block inside the caller's card, so there is nothing to
    // lock and no close button to reach for. `mounted` is part of the condition, not just a
    // dependency: the portal does not exist on the first client render, so locking the page before
    // it is there would lock a page that has no sheet on it.
    if (!open || variant !== "sheet" || !mounted) return;

    // The SHARED ref-counted lock, never a local save/restore of documentElement.style.overflow:
    // this sheet and FieldMapCard's fullscreen frame can be open together, and the Android back
    // gesture pops the FRAME first — release order is not LIFO, which is exactly the case a
    // private save/restore gets permanently wrong. See lib/scrollLock.ts.
    const release = lockScroll();
    closeBtnRef.current?.focus();

    return () => {
      release();
    };
  }, [open, variant, mounted]);

  if (!open) return null;
  if (variant === "sheet" && !mounted) return null;

  const rootId = id ?? `layer-picker-${fieldId}`;
  const titleId = `${rootId}-title`;

  const gridClass = `grid grid-cols-2 gap-2 sm:grid-cols-3${
    variant === "panel" ? " lg:grid-cols-4" : ""
  }`;

  const choose = (ix: string) => {
    onSelect(ix);
    // One tap: pick, and the surface gets out of the way of the map it just changed.
    onClose();
  };

  const grid = (list: string[], labelledBy?: string) => (
    <div className={gridClass} role={labelledBy ? "group" : undefined} aria-labelledby={labelledBy}>
      {list.map((ix) => (
        <LayerTile
          key={ix}
          index={ix}
          selected={ix === index}
          preview={previews[ix]}
          showPicture={picturesOn}
          onSelect={choose}
        />
      ))}
    </div>
  );

  const ALL_GROUPS: LayerGroup[] = ["veg", "water", "burn"];
  const present = ALL_GROUPS.filter((g) => ordered.some((ix) => layerGroup(ix) === g));
  // A three-index list is a list, not a taxonomy: headings only earn their vertical space once
  // there is more than one group to tell apart.
  const grouped = present.length > 1;

  const body = (
    <>
      {dataSaver && !showPictures && (
        // Same consent pattern as the card's "load the picture" gate, and honest about the size:
        // ten layers is ten small PNGs, not a raster download.
        <button
          type="button"
          onClick={() => setShowPictures(true)}
          className="mb-3 flex min-h-12 w-full items-center gap-2 rounded-xl border-[1.5px] border-dashed border-line bg-paper-2 px-3 py-2 text-left hover:border-grass"
        >
          <ImageOff className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold leading-tight text-ink">
              {t("app.field.layers.showPictures")}
            </span>
            <span className="block text-[11px] leading-snug text-ink-soft">
              {t("app.field.layers.showPicturesHint")}
            </span>
          </span>
        </button>
      )}

      {grouped ? (
        <div className="space-y-4">
          {present.map((g) => {
            const headingId = `${rootId}-${g}`;
            return (
              <div key={g}>
                <p
                  id={headingId}
                  className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft"
                >
                  {layerGroupLabel(g)}
                </p>
                {grid(ordered.filter((ix) => layerGroup(ix) === g), headingId)}
              </div>
            );
          })}
        </div>
      ) : (
        grid(ordered)
      )}

      {/* Render mode. Absent — not disabled — when this field's scenes carry no per-scene stretch:
          never offer a choice we cannot honour.
          The only prose here is the OFF answer to "why would I tap this". What range the map is
          actually on belongs to IndexLegend, which sits under the map and says it for compare mode
          too; printing fixedRangeHint / contrastOnHint here as well put the same two sentences on
          screen twice at once whenever the desktop panel was open. */}
      {mode && onModeChange && contrastAvailable && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t("app.field.layers.mode")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <button
                type="button"
                onClick={() => onModeChange("fixed")}
                aria-pressed={mode === "fixed"}
                className={`min-h-12 w-full rounded-xl border-[1.5px] px-3 text-[12.5px] font-bold ${
                  mode === "fixed"
                    ? "border-grass bg-mint-soft text-grass-deep"
                    : "border-line bg-panel text-ink-soft hover:border-mint"
                }`}
              >
                {t("app.field.layers.mode.fixed")}
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => onModeChange("contrast")}
                aria-pressed={mode === "contrast"}
                className={`min-h-12 w-full rounded-xl border-[1.5px] px-3 text-[12.5px] font-bold ${
                  mode === "contrast"
                    ? "border-grass bg-mint-soft text-grass-deep"
                    : "border-line bg-panel text-ink-soft hover:border-mint"
                }`}
              >
                {t("app.field.satelliteTab.contrastBtn")}
              </button>
              {/* Off: why anyone would turn it on. On: the pressed state says it is on and the
                  legend under the map says what it did — this line would only repeat the legend. */}
              {mode !== "contrast" && (
                <p className="mt-1 text-[11px] leading-snug text-ink-soft">
                  {t("app.field.satelliteTab.contrastWhy")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (variant === "panel") {
    // Desktop has the room, so there is no overlay, no scroll lock and no portal — the list simply
    // appears under the button that opened it.
    return (
      <div
        id={rootId}
        role="group"
        aria-labelledby={titleId}
        className="mt-2 rounded-xl border-[1.5px] border-line bg-paper-2 p-3"
      >
        <p id={titleId} className="text-[13px] font-bold text-ink">
          {t("app.field.layers.title")}
        </p>
        <p className="mb-3 mt-0.5 text-[11.5px] leading-snug text-ink-soft">
          {t("app.field.layers.hint")}
        </p>
        {body}
      </div>
    );
  }

  return createPortal(
    // z-[60], not z-50: FieldMapCard's fullscreen overlay is a SIBLING of this node on body, not an
    // ancestor, so a sheet opened from inside it would otherwise render behind the map it belongs
    // to. One thing in the app IS higher — DemoTour's spotlight at z-[80] — and it is
    // pointer-events-none, so it tints this sheet rather than blocking it. Anything new that wants
    // to sit above z-50 has those two facts to reconcile, not an empty field.
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        id={rootId}
        onClick={(e) => e.stopPropagation()}
        // No transform/scale animation: this surface opens over a MapLibre canvas, and a map that
        // is measured during a transition keeps the wrong size for good.
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-panel pb-[calc(env(safe-area-inset-bottom)_+_1rem)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-start gap-2 px-3 pt-2">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[15px] font-bold text-ink">
              {t("app.field.layers.title")}
            </h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
              {t("app.field.layers.hint")}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink hover:border-mint"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-3 pb-3 pt-3">{body}</div>
      </div>
    </div>,
    document.body,
  );
}
