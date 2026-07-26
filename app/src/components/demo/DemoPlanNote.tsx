"use client";

// The small print of the /demo tour: which package the demo field runs on, which part of what the
// visitor just scrolled through is not in the free package, and what signing up actually gives them.
//
// The tour deliberately shows the WHOLE product rather than a free-tier mock-up — the 10 m rasters,
// the score and a monthly AI analysis really are free, and capping the page would under-sell them.
// What that costs is honesty about the rest, and this card is that honesty, stated in words from
// the published price list rather than in a paywall.
//
// It also owns the tier→name lookup for the whole /demo folder (pkgShort/pkgFull) so the badge on
// DemoPulse, the line under DemoSignals and this card can never name the same package differently.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { t, tf, tp, type I18nKey } from "@/lib/i18n";
import { wellnessLabel } from "@/lib/wellnessText";

export interface DemoPlan {
  demo_tier: string | null;
  signup_tier: string | null;
  lapsed_tier: string | null;
  gated: string[] | null;
  advice_per_month: { signup: number | null; lapsed: number | null } | null;
  max_fields: { signup: number | null; lapsed: number | null } | null;
}

// Package naming is reused, never re-invented: /pricing and the gated cards already say "Paket 3",
// the app header already says "Business". A tier this build has no name for renders NOTHING rather
// than a raw code, and every line that needs the name is skipped with it.
const PKG_KEY: Record<string, I18nKey | undefined> = {
  free: "mkt.pkg.name1",
  pro: "mkt.pkg.name2",
  business: "mkt.pkg.name3",
};
const PLAN_KEY: Record<string, I18nKey | undefined> = {
  free: "app.plan.free",
  pro: "app.plan.pro",
  business: "app.plan.business",
};

/** "Paket 3" — the compact form, for a chip with no room for anything longer. */
export function pkgShort(tier: string | null | undefined): string {
  const key = tier ? PKG_KEY[tier] : undefined;
  return key ? t(key) : "";
}

/** "Paket 3 (Business)" — the prose form: the price-list number plus the name the app itself uses. */
export function pkgFull(tier: string | null | undefined): string {
  const short = pkgShort(tier);
  if (!short) return "";
  const key = tier ? PLAN_KEY[tier] : undefined;
  const name = key ? t(key) : "";
  return name ? `${short} (${name})` : short;
}

// business is max_fields 100000 — the same threshold app/fields/page.tsx uses to stop drawing a
// "0 / 100000" track and say "limitsiz" instead.
const UNLIMITED_FROM = 1000;

function fieldsPhrase(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= UNLIMITED_FROM) return t("app.fieldsList.usage.unlimited");
  return `${n} ${tp("app.plural.fields", n)}`;
}

function advicePhrase(n: number | null | undefined): string {
  if (n == null) return "";
  return `${n} ${tp("app.plural.aiAnalysis", n)}`;
}

export default function DemoPlanNote({ plan }: { plan: DemoPlan | null }) {
  if (!plan) return null;

  const demoPkg = pkgFull(plan.demo_tier);
  const gated = plan.gated ?? [];

  const trialPkg = pkgFull(plan.signup_tier);
  const lapsedPkg = pkgFull(plan.lapsed_tier);
  const trialFields = fieldsPhrase(plan.max_fields?.signup);
  const lapsedFields = fieldsPhrase(plan.max_fields?.lapsed);
  const trialQuota = advicePhrase(plan.advice_per_month?.signup);
  const lapsedQuota = advicePhrase(plan.advice_per_month?.lapsed);
  // Half a sentence about a package would be worse than no sentence: the whole line stands or falls
  // on having every one of its six pieces.
  const showSignup = Boolean(
    trialPkg && lapsedPkg && trialFields && lapsedFields && trialQuota && lapsedQuota,
  );

  const lines: string[] = [];
  if (demoPkg) lines.push(tf("mkt.demo.plan.demoTier", { pkg: demoPkg }));
  if (demoPkg && gated.length > 0) {
    lines.push(tf("mkt.demo.plan.gated", {
      labels: gated.map((k) => wellnessLabel(k)).join(", "),
      pkg: demoPkg,
    }));
  }
  if (showSignup) {
    lines.push(tf("mkt.demo.plan.afterSignup", {
      trialPkg, trialFields, trialQuota, lapsedPkg, lapsedFields, lapsedQuota,
    }));
  }
  if (lines.length === 0) return null;

  return (
    <section className="card">
      <h3 className="mb-2 font-display text-[15px] font-bold text-ink">
        {t("mkt.demo.plan.title")}
      </h3>
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-soft">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-soft" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/pricing"
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-[12.5px] font-semibold text-grass underline-offset-2 hover:text-grass-deep hover:underline"
      >
        {t("upgrade.viewPlans")}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
