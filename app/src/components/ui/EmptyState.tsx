"use client";

// C9 — a reusable, purposeful empty state. Instead of a bare "no data" line, an empty module gets
// an icon in a tinted disc, a title, a one-line "why this matters", and an optional CTA that starts
// the first action. Uses the redesign tokens (paper/panel/line/teal/mint/grass) + shadow-soft so an
// empty screen still reads as designed, not broken. Client component (btn CTA + optional onClick).
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** One line on why this module helps the farmer. */
  body?: ReactNode;
  /** Optional CTA — a next/link (href) or a button (onClick). */
  action?: EmptyStateAction;
  /** Extra content under the CTA (e.g. a SupportCard). */
  children?: ReactNode;
}) {
  const ActionIcon = action?.icon;
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-line bg-panel px-6 py-10 text-center shadow-soft">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-mint-soft text-grass">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-bold text-teal">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-slate-600">{body}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className="btn-primary mt-5">
            {ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />}
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn-primary mt-5" onClick={action.onClick}>
            {ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />}
            {action.label}
          </button>
        ))}
      {children && <div className="mt-4 w-full max-w-md">{children}</div>}
    </div>
  );
}

export default EmptyState;
