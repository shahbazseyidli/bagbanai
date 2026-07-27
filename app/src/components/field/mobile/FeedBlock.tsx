"use client";

// One titled block of the phone's field feed (OneSoil teardown §3: the field screen is a single
// continuous scroll, not a tab bar).
//
// The heading is deliberately NOT the section name. These blocks are stops inside one page, and
// several of them (health, spraying) do not correspond to a section at all — reusing
// app.field.section.* would tie a page-internal label to a navigation label that is free to change
// on its own.
//
// `action` is the block's hand-off into the full section: the block shows the glance, the link goes
// to the workbench. It is rendered even when the body declines to draw anything, because the
// section behind it exists either way — a farmer whose forecast failed to load still needs the way
// into the weather section.
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export default function FeedBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">{title}</h3>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            // --tap, not the min-h-9 the in-card text links use: this one sits in a bare row with
            // nothing else to hit, so the 48px floor is the whole of its target (globals.css).
            className="ml-auto inline-flex min-h-[var(--tap)] items-center gap-1 text-[12.5px] font-semibold text-grass hover:text-grass-deep"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
