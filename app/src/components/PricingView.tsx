"use client";

// The /pricing route body as a CLIENT component, so its t() calls re-render in the visitor's
// locale (server components render with the default locale only — see LocaleProvider). The page
// wrapper (app/pricing/page.tsx) stays a server component just to export static metadata.
import Link from "next/link";
import { Leaf, Gift } from "lucide-react";
import PricingTable from "@/components/PricingTable";
import DiscountCards from "@/components/DiscountCards";
import PricingCompare from "@/components/PricingCompare";
import PricingFaq from "@/components/PricingFaq";
import { t } from "@/lib/i18n";

export default function PricingView() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 px-6 py-10 text-center text-white">
        <Leaf className="mx-auto mb-3 h-9 w-9" />
        <h1 className="text-2xl font-bold sm:text-3xl">{t("price.hero.title")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-emerald-50">{t("price.hero.sub")}</p>
      </section>

      {/* C2 trial — one consistent "1 ay pulsuz Pro" line across the pricing surface. */}
      <div className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
        <Gift className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-sm font-medium text-emerald-900">
          {t("mkt.pkg.trialPre")}<b>{t("mkt.pkg.trialBold")}</b>{t("mkt.pkg.trialPost")}
        </p>
      </div>

      <PricingTable />

      {/* C3 — farmer discount programmes (marketing only; no backend discount code). */}
      <DiscountCards />

      {/* C4 — "Bütün paketlərə daxildir" block + tiers.py-grounded comparison matrix. */}
      <PricingCompare />

      {/* C4 — pricing FAQ (grounded in tiers.py + the 1-month Pro trial). */}
      <PricingFaq />

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center">
        <p className="text-sm text-slate-600">{t("price.contact")}</p>
        <Link
          href="/signup"
          className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t("landing.ctaSignup")}
        </Link>
      </div>
    </div>
  );
}
