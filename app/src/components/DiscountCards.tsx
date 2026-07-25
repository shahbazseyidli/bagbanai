"use client";

import { Sprout, Users2, GraduationCap, Mail, Info } from "lucide-react";
import { t } from "@/lib/i18n";

// C3 — three farmer discount programmes shown under the plans. These are MARKETING cards only:
// there is NO discount-code system in the backend, so the CTA is a plain mailto to support and the
// discount is applied by hand after review (see the honest note under the cards). Rendered inside
// the client PricingView, so this is a client component and uses the synchronous t(); the programme
// list is built inside the body so it re-reads the active locale on each render.
const SUPPORT_EMAIL = "info@agradex.com";

interface Programme {
  icon: typeof Sprout;
  title: string;
  badge: string;
  who: string;
  body: string;
  subject: string; // mailto subject — the operator applies the discount manually after review
}

export default function DiscountCards() {
  const programmes: Programme[] = [
    {
      icon: Sprout,
      title: t("mkt.discount.youngTitle"),
      badge: "−50%",
      who: t("mkt.discount.youngWho"),
      body: t("mkt.discount.youngBody"),
      subject: t("mkt.discount.youngSubject"),
    },
    {
      icon: Users2,
      title: t("mkt.discount.coopTitle"),
      badge: t("mkt.discount.coopBadge"),
      who: t("mkt.discount.coopWho"),
      body: t("mkt.discount.coopBody"),
      subject: t("mkt.discount.coopSubject"),
    },
    {
      icon: GraduationCap,
      title: t("mkt.discount.studentTitle"),
      badge: t("mkt.discount.studentBadge"),
      who: t("mkt.discount.studentWho"),
      body: t("mkt.discount.studentBody"),
      subject: t("mkt.discount.studentSubject"),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-teal sm:text-2xl">{t("mkt.discount.heading")}</h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600">
          {t("mkt.discount.intro")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {programmes.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="flex flex-col rounded-xl2 border border-line bg-panel p-5 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-grass">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-mint-soft px-2.5 py-0.5 text-xs font-bold text-grass">
                  {p.badge}
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{p.title}</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{p.who}</p>
              <p className="mt-2 flex-1 text-sm text-slate-600">{p.body}</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(p.subject)}`}
                className="btn-primary mt-4"
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> {t("mkt.discount.apply")}
              </a>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-panel-2 px-4 py-3 text-xs text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          {t("mkt.discount.note")}
        </span>
      </div>
    </section>
  );
}
