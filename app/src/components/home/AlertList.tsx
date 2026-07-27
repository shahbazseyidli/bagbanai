"use client";

// The "Bu gün" attention strip — the unread critical/warning notifications, each deep-linking to its
// field. Extracted from TodayHome so the narrow stack and the wide instrument rail render the SAME
// rows from one implementation instead of quietly drifting apart.
//
// `compact` changes DENSITY ONLY (tighter padding, a one-line body) so the rows fit a 340px rail.
// Everything that carries meaning — the severity icon, the tint pair, the chevron that appears only
// when the row actually has a field to open — is identical in both, because a farmer must not have
// to learn two alert vocabularies inside one screen.
import Link from "next/link";
import { AlertTriangle, ChevronRight, OctagonAlert } from "lucide-react";
import { t } from "@/lib/i18n";

/** One unread critical/warning row of GET /api/notifications, as this screen renders it. */
export interface TodayAlert {
  id: string;
  field_id: string | null;
  severity: string;
  title: string;
  body: string;
}

const SEV_ICON: Record<string, typeof AlertTriangle> = {
  critical: OctagonAlert,
  warning: AlertTriangle,
};

export default function AlertList({
  alerts,
  compact = false,
  more = 0,
}: {
  alerts: TodayAlert[];
  compact?: boolean;
  /** How many unread alerts were withheld from this list. > 0 renders the "see all" link. */
  more?: number;
}) {
  if (alerts.length === 0) return null;
  const pad = compact ? "px-3 py-2.5" : "px-4 py-3";
  const clamp = compact ? "line-clamp-1" : "line-clamp-2";

  return (
    <div className="space-y-2">
      {alerts.map((n) => {
        const Icon = SEV_ICON[n.severity] ?? AlertTriangle;
        const tint = n.severity === "critical" ? "bg-bad-tint text-bad" : "bg-warn-tint text-warn";
        const inner = (
          <div className={`flex items-start gap-3 rounded-2xl border-[1.5px] border-slate-300 bg-white ${pad}`}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tint}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{n.title}</p>
              <p className={`mt-0.5 ${clamp} text-sm text-slate-600`}>{n.body}</p>
            </div>
            {n.field_id && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />}
          </div>
        );
        return n.field_id ? (
          <Link key={n.id} href={`/fields/${n.field_id}`}>{inner}</Link>
        ) : (
          <div key={n.id}>{inner}</div>
        );
      })}

      {more > 0 && (
        <Link
          href="/notifications"
          // Hit area grown to the 48px floor without changing the visual box — see the same pattern
          // on TodayHome's add link for why it is a pseudo-element and not padding.
          className="relative inline-flex items-center gap-1 text-sm font-bold text-emerald-700 after:absolute after:inset-x-[-8px] after:-inset-y-3.5 after:content-['']"
        >
          {t("app.home.alerts.seeAll")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
