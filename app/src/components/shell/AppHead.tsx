"use client";

// MOCK-app-apphead — the per-screen header bar of the approved mockup (`.apphead`):
//
//   Gübrə   [Xudat fındıq]  ....................................  [Gübrələmə əlavə et]
//   ^title  ^context chip                                          ^actions (children)
//
// Deliberately NOT included: the mockup's global "Axtar…" box. There is no global search endpoint
// yet, and a search field that swallows what the farmer types is worse than no search field. When
// one exists, add it here (one place) rather than per screen.
//
// Layout notes: full-bleed on mobile (every host container in the app pads with px-4), inset on
// desktop so the bar lines up with the content column under the left rail. It is a plain block —
// not sticky — because the app already has a sticky top Nav and a sticky rail; stacking a third
// sticky layer inside the scroll container caused overlap in the map-first views. It carries NO
// bottom margin either: host pages already stack their children with `space-y-*`.
import type { ReactNode } from "react";

interface Props {
  /** Screen title — rendered as the page's <h1> in the display face. */
  title: string;
  /** Optional second line: a short explanation of the screen (AZ copy). */
  subtitle?: ReactNode;
  /** Optional context chip next to the title (mockup: "Xudat fındıq", "Mövsüm 2026"). */
  chip?: ReactNode;
  /** Right-hand actions (buttons, selects, filters). Omitted entirely when absent. */
  children?: ReactNode;
  className?: string;
}

export default function AppHead({ title, subtitle, chip, children, className = "" }: Props) {
  return (
    <header
      className={`-mx-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-paper/70 px-4 py-3 backdrop-blur md:mx-0 md:px-0 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-bold leading-tight text-ink">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[13px] leading-snug text-ink-soft">{subtitle}</div>}
      </div>

      {chip && (
        <span className="inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 truncate rounded-full border border-line bg-panel px-3 text-[13px] font-semibold text-ink-soft">
          {chip}
        </span>
      )}

      {children && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{children}</div>
      )}
    </header>
  );
}
