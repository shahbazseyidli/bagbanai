"use client";

// The /pricing route body as a CLIENT component, so its t() calls re-render in the visitor's
// locale (server components render with the default locale only — see LocaleProvider). The page
// wrapper (app/pricing/page.tsx) stays a server component just to export static metadata.
import Link from "next/link";
import { Leaf } from "lucide-react";
import PricingTable from "@/components/PricingTable";
import { t } from "@/lib/i18n";

export default function PricingView() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 px-6 py-10 text-center text-white">
        <Leaf className="mx-auto mb-3 h-9 w-9" />
        <h1 className="text-2xl font-bold sm:text-3xl">{t("price.hero.title")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-emerald-50">{t("price.hero.sub")}</p>
      </section>

      <PricingTable />

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
