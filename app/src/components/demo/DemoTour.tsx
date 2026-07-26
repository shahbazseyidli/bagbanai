"use client";

// The five-step guided tour on /demo. No library: a coach-mark overlay is ~140 lines of DOM maths,
// and shipping a tour dependency to the most-public page in the funnel would cost a farmer on 3G
// more than the whole page does.
//
// The backdrop and the highlight ring are ONE element: a fixed div sitting exactly on the target
// rect with a 9999px box-shadow spread. That dims everything outside it and rings what is inside it
// without any cut-out geometry, and it is pointer-transparent so the page underneath stays readable.
//
// Anchors are a typed union rather than free strings, so renaming a block on the page is a compile
// error instead of a step that silently points at nothing. A block that renders conditionally (the
// weather strip has no data yet, for instance) can still be missing at runtime — those steps are
// dropped when the tour opens rather than shown pinned to the top-left corner.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { t, tf, type I18nKey } from "@/lib/i18n";

export type TourAnchor = "map" | "timeline" | "pulse" | "signals" | "cta";

export interface TourStep {
  anchor: TourAnchor;
  titleKey: I18nKey;
  bodyKey: I18nKey;
}

/** Mark the element a step points at: `<section {...tourAnchor("pulse")}>`. Going through this
 *  helper instead of writing the attribute by hand is what makes the union above load-bearing. */
export function tourAnchor(anchor: TourAnchor): { "data-tour": TourAnchor } {
  return { "data-tour": anchor };
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_W = 340;
const GAP = 12;
const EDGE = 8;

function anchorRect(anchor: TourAnchor): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function DemoTour({
  steps,
  open,
  ctaHref,
  ctaLabel,
  onClose,
  onFinish,
}: {
  steps: TourStep[];
  open: boolean;
  ctaHref: string;
  ctaLabel: string;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);
  // Steps whose anchor actually exists in the DOM, resolved when the tour opens.
  const [live, setLive] = useState<TourStep[]>([]);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Whatever had focus when the tour opened, so closing hands it back (the replay button).
  const returnRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    returnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLive(steps.filter((s) => anchorRect(s.anchor) !== null));
    setI(0);
    return () => {
      returnRef.current?.focus();
    };
  }, [open, steps]);

  const step: TourStep | null = live[i] ?? null;

  // Rect + card placement. Recomputed on step change and, throttled through rAF, whenever the page
  // scrolls or resizes — a village phone must not repaint the 9999px shadow on every scroll event.
  const measure = useCallback(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const r = anchorRect(step.anchor);
    setRect(r);
    if (!r) {
      setPos(null);
      return;
    }
    const cardH = cardRef.current?.offsetHeight ?? 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(CARD_W, vw - EDGE * 2);
    const below = r.top + r.height + GAP;
    const top = below + cardH < vh ? below : Math.max(EDGE, r.top - GAP - cardH);
    const left = Math.min(Math.max(r.left, EDGE), Math.max(EDGE, vw - w - EDGE));
    setPos({ top: Math.min(top, Math.max(EDGE, vh - cardH - EDGE)), left });
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
    el?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    measure();
    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [open, step, measure]);

  // Focus follows the step so a screen reader announces the new card, and so the trap below has
  // something inside the dialog to wrap around.
  useEffect(() => {
    if (open && step) cardRef.current?.focus();
  }, [open, step, i]);

  const last = i >= live.length - 1;

  const finish = useCallback(() => {
    onFinish();
    onClose();
  }, [onFinish, onClose]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onFinish();
      onClose();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (last) finish();
      else setI((n) => n + 1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setI((n) => Math.max(0, n - 1));
      return;
    }
    if (e.key !== "Tab") return;
    // Trap: the tour dims the page, so tabbing out of it would land focus on things the visitor
    // cannot see.
    const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || activeEl === cardRef.current)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && activeEl === lastEl) {
      e.preventDefault();
      first.focus();
    }
  };

  const reduced = useMemo(() => (mounted ? prefersReducedMotion() : true), [mounted]);

  if (!mounted || !open || !step) return null;

  return createPortal(
    // NOT aria-modal, and pointer-transparent at the root: this tour explains the page while the
    // page stays usable — step 2 literally asks the visitor to tap a date on the timeline. A
    // full-screen container with default pointer-events would swallow that tap (and every other
    // one) while claiming to be modal. Only the card below takes pointer events back.
    <div
      role="dialog"
      aria-label={t("mkt.demo.tour.aria")}
      aria-labelledby="demo-tour-title"
      onKeyDown={onKeyDown}
      className="pointer-events-none fixed inset-0 z-[80]"
    >
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[14px] outline outline-2 outline-grass"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(15,23,42,.55)",
          }}
        />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        style={{
          position: "fixed",
          top: pos?.top ?? EDGE,
          left: pos?.left ?? EDGE,
          maxWidth: CARD_W,
          width: `calc(100vw - ${EDGE * 2}px)`,
        }}
        className={`pointer-events-auto rounded-2xl border-[1.5px] border-line bg-panel p-4 shadow-xl outline-none ${
          reduced ? "" : "transition-[top,left] duration-200"
        }`}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {tf("mkt.demo.tour.step", { n: i + 1, total: live.length })}
          </span>
          <button
            type="button"
            onClick={() => {
              onFinish();
              onClose();
            }}
            aria-label={t("mkt.demo.tour.closeAria")}
            className="ml-auto -mr-1 grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-black/[.05] hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <h3 id="demo-tour-title" className="font-display text-[15.5px] font-bold text-ink">
          {t(step.titleKey)}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t(step.bodyKey)}</p>

        {/* The CTA rides along on every step: the tour exists to end here. */}
        <Link
          href={ctaHref}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>

        <div className="mt-3 flex items-center gap-2 border-t border-dashed border-line pt-3">
          <button
            type="button"
            onClick={() => {
              onFinish();
              onClose();
            }}
            className="min-h-9 rounded-lg px-2 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
          >
            {t("mkt.quiz.skip")}
          </button>
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI((n) => Math.max(0, n - 1))}
              className="ml-auto min-h-9 rounded-lg border-[1.5px] border-line bg-panel px-3 text-[12.5px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep"
            >
              {t("common.back")}
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? finish() : setI((n) => n + 1))}
            className={`min-h-9 rounded-lg bg-grass px-3.5 text-[12.5px] font-semibold text-white hover:bg-grass-deep ${
              i > 0 ? "" : "ml-auto"
            }`}
          >
            {last ? t("common.finish") : t("common.next")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
