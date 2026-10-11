"use client";

// t() below needs this directive: in a Server Component it falls back to the az dictionary
// without failing. All six consumers are already client components — this pins it.
// D1.4 — skeletons that match final card geometry, so lists never show a bare centered spinner.
import { t } from "@/lib/i18n";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label={t("app.ui.loading")}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
