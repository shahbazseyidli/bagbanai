"use client";

// One tile = this field, in that index, as it actually looks today.
//
// The picker exists because "NDRE" is not a word, and no amount of tooltip prose fixes that. A
// farmer who has never heard of the red edge can still see that one picture is patchy where their
// field is patchy. So the tile leads with the picture, then the plain name, then the one line that
// says what the layer answers — the abstract code appears nowhere.

import { useState } from "react";
import { Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { indexLabel, indexInfo, legendFor } from "@/lib/indexStatus";
import type { LayerPreview } from "./useLayerPreviews";

export default function LayerTile({
  index,
  selected,
  preview,
  showPicture,
  onSelect,
}: {
  index: string;
  selected: boolean;
  preview?: LayerPreview;
  /** False under data-saver until the farmer asks for the pictures. */
  showPicture: boolean;
  onSelect: (index: string) => void;
}) {
  // Own broken state per tile, so one unrenderable COG cannot blank the whole grid (the SceneThumb
  // precedent in FieldMapCard).
  const [broken, setBroken] = useState(false);

  const legend = legendFor(index);
  const info = indexInfo(index);
  const label = indexLabel(index);
  const state = preview?.state ?? "pending";
  const url = preview?.url ?? null;
  const value = preview?.value ?? null;
  const date = preview?.date ?? null;

  // "Empty" and "failed" are different for us and identical for the farmer: there is no picture of
  // this layer right now. Which one it was belongs in a log, not on a tile.
  const meta =
    state === "empty" || state === "failed"
      ? t("app.field.layers.noImage")
      : [value != null ? value.toFixed(2) : null, date ? date.slice(5) : null]
          .filter((s): s is string => s != null)
          .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-pressed={selected}
      className={`flex flex-col overflow-hidden rounded-xl border-[1.5px] text-left ${
        selected ? "border-grass bg-mint-soft" : "border-line bg-panel hover:border-mint"
      }`}
    >
      <div className="relative aspect-square w-full bg-paper-2">
        {showPicture && url && !broken ? (
          <img
            src={url}
            // Decorative: the layer's name is printed directly underneath it.
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            // These PNGs are a few dozen pixels wide on purpose; keep them crisp when upscaled.
            style={{ imageRendering: "pixelated" }}
            className="h-full w-full object-contain"
          />
        ) : showPicture && state === "pending" ? (
          <div className="h-full w-full animate-pulse bg-paper-2" aria-hidden="true" />
        ) : (
          // No picture → the layer's own colour ramp with its name on it. Never a grey icon square,
          // which would imply this field has data it does not have, and never a placeholder image
          // of some other field.
          <div
            className="flex h-full w-full items-end p-1.5"
            style={{ background: legend.grad }}
            aria-hidden="true"
          >
            <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-white">
              {label}
            </span>
          </div>
        )}

        {selected && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-grass text-white">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </div>

      {/* NO `block` on the two clamped lines below. .line-clamp-2 works by setting
          display:-webkit-box, .block sets display:block at the SAME specificity, and Tailwind emits
          the display plugin AFTER lineClamp (corePlugins.js: lineClamp, then display) — so block
          won, -webkit-line-clamp had no box to clamp, and both lines wrapped to full height with no
          build error to show for it. The ten-tile grid grew far past its budget and the
          descriptions buried it. line-clamp already produces a block-level box; the class is
          redundant as well as harmful. */}
      <div className="p-2">
        <b className="line-clamp-2 text-[12.5px] font-bold leading-tight text-ink">{label}</b>
        {info && (
          // title= carries the full sentence for the desktop panel; the clamp keeps ten tiles on
          // one scrollable sheet.
          <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft" title={info}>
            {info}
          </span>
        )}
        {meta && <span className="mt-1 block text-[10.5px] tabular-nums text-ink-soft">{meta}</span>}
      </div>
    </button>
  );
}
