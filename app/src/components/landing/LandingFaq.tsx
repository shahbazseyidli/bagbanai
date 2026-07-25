"use client";

// W2 / E12 — FAQ accordion from the approved landing redesign. Answers stay factual: the prices
// mirror app/src/lib/pricing.ts (10 / 25 AZN per month), providers join free, trial is one month.
import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionHead, Wrap } from "./LandingSections";
import { t, type I18nKey } from "@/lib/i18n";

const QA: Array<{ q: I18nKey; a: I18nKey }> = [
  { q: "mkt.faq.q1Question", a: "mkt.faq.q1Answer" },
  { q: "mkt.faq.q2Question", a: "mkt.faq.q2Answer" },
  { q: "mkt.faq.q3Question", a: "mkt.faq.q3Answer" },
  { q: "mkt.faq.q4Question", a: "mkt.faq.q4Answer" },
];

export default function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead title={t("mkt.faq.heading")} />
      <div className="mx-auto max-w-[760px]">
        {QA.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="border-b border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="lp-ink flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-[16.5px] font-semibold"
              >
                {t(item.q)}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-2 transition-transform duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden="true"
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <div
                className={`lp-ink2 overflow-hidden text-[14.5px] transition-[max-height] duration-300 ${
                  isOpen ? "max-h-72 pb-4" : "max-h-0"
                }`}
              >
                {t(item.a)}
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}
