import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, ChevronRight, Clipboard, FileText, FlaskConical, MapPin,
  Satellite, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getGuideIndexCopy, getGuideList, type GuideIcon } from "@/components/guide/content";
import { getT, getServerLocale } from "@/lib/i18n-server";

// C8 — the /guide index: the "Necə başlamalı" hub. Purely presentational (no state, no t()), so it
// stays a Server Component and ships its own metadata. Copy is inline Azerbaijani (guide/content.ts);
// the T18 sweep extracts it later. Cards mirror the approved mockup's paper/teal card treatment.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("mkt.meta.guideTitle"),
    description: t("mkt.meta.guideDesc"),
    alternates: { canonical: "/guide" },
  };
}

const ICONS: Record<GuideIcon, LucideIcon> = {
  "map-pin": MapPin,
  satellite: Satellite,
  brain: Brain,
  clipboard: Clipboard,
  sprout: Sprout,
  "file-text": FileText,
  flask: FlaskConical,
};

const SH_SM = "shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]";

export default async function GuideIndexPage() {
  const t = await getT();
  const locale = await getServerLocale();
  const GUIDE_INDEX_COPY = getGuideIndexCopy(locale);
  const GUIDE_LIST = getGuideList(locale);
  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ---------------------------------------------------------- head */}
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          {GUIDE_INDEX_COPY.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          {GUIDE_INDEX_COPY.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
          {GUIDE_INDEX_COPY.lead}
        </p>
      </header>

      {/* --------------------------------------------------------- cards */}
      <section className="mx-auto grid max-w-[980px] gap-4 sm:grid-cols-2">
        {GUIDE_LIST.map((g, i) => {
          const Icon = ICONS[g.icon] ?? MapPin;
          return (
            <Link
              key={g.slug}
              href={`/guide/${g.slug}`}
              className={`group flex flex-col rounded-xl2 border border-line bg-panel p-5 transition-colors hover:border-teal ${SH_SM}`}
            >
              <div className="flex items-start gap-4">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[color:var(--brand-muted)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-display text-[17px] font-bold leading-snug text-[color:var(--brand-ink)]">
                      {g.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
                    {g.summary}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-[12.5px] font-semibold text-[color:var(--brand-muted)]">
                  {g.meta}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-teal">
                  {t("mkt.guide.cardReadMore")}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* ----------------------------------------------------------- cta */}
      <section className="mx-auto max-w-[980px] pt-10">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            {t("mkt.guide.ctaHeading")}
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            {t("mkt.guide.ctaSubtitle")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
            >
              {t("mkt.guide.ctaStartFree")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/solutions"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-white/30 px-7 text-[15px] font-bold text-white transition-colors hover:border-white"
            >
              {t("mkt.guide.ctaViewSolutions")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
