"use client";

// The radar time bar — ONESOIL_MOBILE_TEARDOWN §4.7 / ONESOIL_DESIGN_SYSTEM §5.3: "keçmiş bərk,
// gələcək çizgili". Past frames are drawn SOLID, forecast frames HATCHED, and the difference is
// wordless on purpose: it is the trust signal a farmer reads before deciding whether to believe the
// rain on the map.
//
// The distinction is carried in THREE places at once, never only in the fill, because a colour is
// not an accessible claim: the badge under the bar names the active frame Müşahidə or Proqnoz, each
// frame's aria-label says the same, and only then does the hatch repeat it visually. A nowcast frame
// is never presented as an observation in any of the three.
//
// Segments are `flex-1` so every frame owns the same width and the past/future boundary is a real
// position on the bar rather than a decoration. That is also why the "İndi" tick is drawn at the
// boundary and not at the right edge: with a forecast on screen, "now" is genuinely in the middle.
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { getLocale, t, tf } from "@/lib/i18n";
import type { RadarFrame } from "./useRadarFrames";

/**
 * Playback step. 600 ms per frame walks RainViewer's 13 observed frames — two hours of weather — in
 * about eight seconds: slow enough to watch a front move, fast enough that nobody waits for it.
 */
const STEP_MS = 600;

/** How long playback rests on the newest frame before looping, so the sequence ends on a readable
 *  "this is now" instead of snapping straight back to two hours ago. */
const LOOP_HOLD_MS = 1400;

/** Hatch colours for the forecast half: the brand green when the frame is selected, the token line
 *  colour otherwise. Literals rather than classes because the pattern below is an inline gradient —
 *  Tailwind cannot express repeating-linear-gradient and a class must never be built from pieces. */
const HATCH_ON = "#1E9852"; // colors.grass
const HATCH_OFF = "#D7D0C4"; // colors.line-2

/** The frame's own clock time, in the VIEWER's timezone. RainViewer stamps frames in UNIX SECONDS
 *  (UTC), so this is the one place on this screen where building a Date from an API value is right:
 *  an epoch carries no calendar day for a timezone to shift. */
function clock(unixSec: number): string {
  try {
    return new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit" }).format(
      new Date(unixSec * 1000),
    );
  } catch {
    return "—";
  }
}

function kindLabel(kind: RadarFrame["kind"]): string {
  return t(kind === "past" ? "app.weather.radar.observed" : "app.weather.radar.forecast");
}

/** "14:30 · Müşahidə" — one label shape for the segment, its tooltip, and the arrow that lands on
 *  it, so the three can never describe the same frame differently. */
function frameLabel(f: RadarFrame): string {
  return tf("app.weather.radar.frameAria", { time: clock(f.time), kind: kindLabel(f.kind) });
}

export default function RadarScrubber({
  frames,
  lastPastIdx,
  activeIdx,
  onSelect,
  playing,
  onTogglePlay,
}: {
  frames: RadarFrame[];
  /** Index of the newest OBSERVED frame; -1 when RainViewer sent none. */
  lastPastIdx: number;
  activeIdx: number;
  onSelect: (i: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  // The timer reads the CURRENT index through refs, so advancing a frame does not tear down and
  // rebuild the interval — which at 600 ms would drift the step by however long the render took.
  const idxRef = useRef(activeIdx);
  idxRef.current = activeIdx;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const next = idxRef.current + 1 >= frames.length ? 0 : idxRef.current + 1;
      selectRef.current(next);
      // The hold is charged to the LAST frame, so the newest picture is the one that lingers.
      timer = setTimeout(tick, next === frames.length - 1 ? LOOP_HOLD_MS : STEP_MS);
    };
    timer = setTimeout(tick, STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, frames.length]);

  if (frames.length === 0) return null;

  const idx = Math.max(0, Math.min(frames.length - 1, activeIdx));
  const active = frames[idx];
  const hasForecast = lastPastIdx >= 0 && lastPastIdx < frames.length - 1;
  // The boundary sits at the end of the last observed segment. Segments are equal-width, so this is
  // just "how many of them are behind us" — no measurement required.
  const nowPct = hasForecast ? ((lastPastIdx + 1) / frames.length) * 100 : null;

  const prevFrame = idx > 0 ? frames[idx - 1] : null;
  const nextFrame = idx < frames.length - 1 ? frames[idx + 1] : null;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={t(playing ? "app.weather.radar.pause" : "app.weather.radar.play")}
          title={t(playing ? "app.weather.radar.pause" : "app.weather.radar.play")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-panel text-ink hover:border-mint hover:text-grass-deep"
        >
          {playing ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* The equal-width frame track. Thirteen frames on a 375px phone give each segment about
            24px of width — too narrow to be the only way in, which is exactly why the two arrows to
            the right of it exist. Height still meets the --tap floor. */}
        <div
          className="relative flex min-w-0 flex-1 gap-[2px]"
          role="group"
          aria-label={t("app.weather.radar.timelineAria")}
        >
          {frames.map((f, i) => {
            const isPast = f.kind === "past";
            const on = i === idx;
            const label = frameLabel(f);
            return (
              <button
                key={`${f.time}-${f.path}`}
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={on}
                aria-label={label}
                title={label}
                className="relative min-h-[var(--tap)] min-w-0 flex-1 py-3"
              >
                <span
                  className={`block h-2.5 w-full rounded-sm ring-1 ${
                    on ? "ring-grass-deep" : "ring-black/10"
                  } ${isPast ? (on ? "bg-grass" : "bg-line-2") : ""}`}
                  style={
                    isPast
                      ? undefined
                      : {
                          backgroundImage: `repeating-linear-gradient(45deg, ${
                            on ? HATCH_ON : HATCH_OFF
                          } 0 3px, transparent 3px 6px)`,
                        }
                  }
                />
              </button>
            );
          })}

          {/* "Now" only exists as a POSITION when there is something on the other side of it. With
              an empty nowcast the newest observation IS the right-hand edge, and a tick there would
              mark the boundary between the data and nothing at all. */}
          {nowPct != null && (
            <>
              <span
                className="pointer-events-none absolute inset-y-2 z-10 w-[2px] -translate-x-1/2 rounded-full bg-ink"
                style={{ left: `${nowPct}%` }}
                aria-hidden="true"
              />
              {/* Sits in the track's own top padding, so it labels the tick without covering a
                  segment. */}
              <span
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 text-[9px] font-bold uppercase leading-none tracking-[0.06em] text-ink"
                style={{ left: `${nowPct}%` }}
                aria-hidden="true"
              >
                {t("app.weather.radar.now")}
              </span>
            </>
          )}
        </div>

        {/* Labelled by the frame they LAND ON, not by a direction: "13:50 · Müşahidə" tells a screen
            reader what pressing this does, and reuses the one frame-label shape above. */}
        <button
          type="button"
          onClick={() => prevFrame && onSelect(idx - 1)}
          disabled={prevFrame == null}
          aria-label={prevFrame ? frameLabel(prevFrame) : t("app.weather.radar.timelineAria")}
          className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:text-grass-deep disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => nextFrame && onSelect(idx + 1)}
          disabled={nextFrame == null}
          aria-label={nextFrame ? frameLabel(nextFrame) : t("app.weather.radar.timelineAria")}
          className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:text-grass-deep disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* The active frame, named in words. aria-live so stepping or playing announces the change for
          a reader who cannot watch the bar move. */}
      <p
        className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-soft"
        aria-live="polite"
      >
        <span className="font-bold tabular-nums text-ink">{clock(active.time)}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            active.kind === "past" ? "bg-mint-soft text-grass-deep" : "bg-info-tint text-info"
          }`}
        >
          {kindLabel(active.kind)}
        </span>
      </p>

      {/* RainViewer really does send an empty nowcast list — say so, rather than leaving the farmer
          to wonder why the bar stops at the present. */}
      {!hasForecast && (
        <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">
          {t("app.weather.radar.noForecast")}
        </p>
      )}
    </div>
  );
}
