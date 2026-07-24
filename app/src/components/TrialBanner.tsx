"use client";

// C2 — free 1-month Pro trial banner.
//
// Every NEWLY created organisation is opened on a Pro trial (backend: routers/orgs.py +
// tiers.trial_state), which is what the marketing copy has been promising all along
// ("1 ay pulsuz sınaq · kart lazım deyil"). This banner is the only place in the app that tells the
// farmer where they stand:
//   • trial running  → "Pro sınağı: N gün qalıb"      (amber, calm, links to /pricing)
//   • trial finished → "Sınaq bitdi — pulsuz rejimdəsiniz" (upgrade CTA)
//   • no trial at all (every org that predates the feature, or a manual/paid subscription) → null
//
// Rules it must obey: never block the page, never throw, never nag. Any failure — offline, 403,
// old backend without the `trial` key — renders nothing at all.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Clock, ArrowRight, X } from "lucide-react";
import { api } from "@/lib/api";

type TrialInfo = {
  active?: boolean;
  expired?: boolean;
  days_left?: number;
  ends_at?: string | null;
  tier?: string | null;
};

type SubscriptionResponse = { trial?: TrialInfo | null };

// Dismissal is per org AND per phase, so closing the banner during the trial does not also swallow
// the "sınaq bitdi" message a month later. "active-ending" is a separate phase on purpose: the
// farmer gets exactly one gentle reminder in the final week even if they dismissed it on day one.
function dismissKey(orgId: string, phase: string): string {
  return `bagban_trial_dismissed:${orgId}:${phase}`;
}

function phaseOf(trial: TrialInfo): "active" | "active-ending" | "expired" | null {
  if (trial.active) return (trial.days_left ?? 0) <= 7 ? "active-ending" : "active";
  if (trial.expired) return "expired";
  return null;
}

export default function TrialBanner({ orgId }: { orgId: string }) {
  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setTrial(null);
    setDismissed(false);
    (async () => {
      try {
        const sub = await api.get<SubscriptionResponse>(`/api/orgs/${orgId}/subscription`);
        if (cancelled) return;
        const info = sub?.trial ?? null;
        setTrial(info);
        const phase = info ? phaseOf(info) : null;
        if (phase) {
          try {
            if (localStorage.getItem(dismissKey(orgId, phase)) === "1") setDismissed(true);
          } catch {
            /* private mode / storage disabled — just show the banner */
          }
        }
      } catch {
        if (!cancelled) setTrial(null); // silent: the banner is never load-bearing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (!trial) return null;
  const phase = phaseOf(trial);
  if (!phase || dismissed) return null;

  function close() {
    setDismissed(true);
    try {
      if (phase) localStorage.setItem(dismissKey(orgId, phase), "1");
    } catch {
      /* noop */
    }
  }

  const isActive = phase === "active" || phase === "active-ending";
  const daysLeft = Math.max(0, Math.round(trial.days_left ?? 0));
  const title = isActive
    ? daysLeft <= 1
      ? "Pro sınağı: son gün"
      : `Pro sınağı: ${daysLeft} gün qalıb`
    : "Sınaq bitdi — pulsuz rejimdəsiniz";
  const body = isActive
    ? "Bütün Pro imkanları açıqdır — kart tələb olunmur."
    : "Pro imkanlarını geri qaytarmaq üçün paket seçin. Peyk xəritəsi və hava pulsuz qalır.";

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-2xl border p-3 shadow-soft sm:p-4 ${
        isActive ? "border-amber-200 bg-amber-50" : "border-line bg-panel"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isActive ? "bg-amber-100 text-amber-800" : "bg-mint-soft text-emerald-700"
        }`}
        aria-hidden="true"
      >
        {isActive ? <Gift className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{body}</p>
      </div>

      <Link
        href="/pricing"
        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${
          isActive
            ? "bg-white text-emerald-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
            : "bg-emerald-600 text-white hover:bg-brand-dark"
        }`}
      >
        {isActive ? "Paketlər" : "Paket seç"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={close}
        aria-label="Bağla"
        className="-mr-1 shrink-0 rounded-lg p-2 text-ink-soft hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
