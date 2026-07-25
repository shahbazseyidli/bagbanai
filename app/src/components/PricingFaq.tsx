"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { t } from "@/lib/i18n";

// C4 — pricing FAQ accordion. Every answer is grounded in services/app/tiers.py (free / Paket 2 /
// Paket 3 gating + quotas) and the C2 1-month Pro trial (new org → 1 month Pro, then free, no card).
// Copy is i18n-driven (keys under mkt.pricingFaq.*). Client component for the expand/collapse.
interface QA {
  q: string;
  a: string;
}

export default function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  // Built at render time so t() reflects the current locale (client-side locale switching).
  const FAQ: QA[] = [
    {
      q: t("mkt.pricingFaq.q1Free"),
      a: t("mkt.pricingFaq.a1Free"),
    },
    {
      q: t("mkt.pricingFaq.q2Trial"),
      a: t("mkt.pricingFaq.a2Trial"),
    },
    {
      q: t("mkt.pricingFaq.q3AfterTrial"),
      a: t("mkt.pricingFaq.a3AfterTrial"),
    },
    {
      q: t("mkt.pricingFaq.q4ProVsBusiness"),
      a: t("mkt.pricingFaq.a4ProVsBusiness"),
    },
    {
      q: t("mkt.pricingFaq.q5FieldCount"),
      a: t("mkt.pricingFaq.a5FieldCount"),
    },
    {
      q: t("mkt.pricingFaq.q6AiQuota"),
      a: t("mkt.pricingFaq.a6AiQuota"),
    },
    {
      q: t("mkt.pricingFaq.q7Sentinel2"),
      a: t("mkt.pricingFaq.a7Sentinel2"),
    },
    {
      q: t("mkt.pricingFaq.q8Hectare"),
      a: t("mkt.pricingFaq.a8Hectare"),
    },
    {
      q: t("mkt.pricingFaq.q9Payment"),
      a: t("mkt.pricingFaq.a9Payment"),
    },
    {
      q: t("mkt.pricingFaq.q10Cancel"),
      a: t("mkt.pricingFaq.a10Cancel"),
    },
    {
      q: t("mkt.pricingFaq.q11Channels"),
      a: t("mkt.pricingFaq.a11Channels"),
    },
    {
      q: t("mkt.pricingFaq.q12BusinessFeatures"),
      a: t("mkt.pricingFaq.a12BusinessFeatures"),
    },
    {
      q: t("mkt.pricingFaq.q13Providers"),
      a: t("mkt.pricingFaq.a13Providers"),
    },
    {
      q: t("mkt.pricingFaq.q14Discounts"),
      a: t("mkt.pricingFaq.a14Discounts"),
    },
    {
      q: t("mkt.pricingFaq.q15Privacy"),
      a: t("mkt.pricingFaq.a15Privacy"),
    },
  ];
  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-teal sm:text-2xl">{t("mkt.pricingFaq.heading")}</h2>
      </div>

      <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-xl2 border border-line bg-panel shadow-soft">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <HelpCircle className="h-4 w-4 shrink-0 text-grass" aria-hidden="true" />
                <span className="flex-1 text-sm font-semibold text-slate-900">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <p className="pb-4 pl-11 pr-4 text-sm leading-relaxed text-slate-600">{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
