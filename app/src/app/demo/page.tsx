import type { Metadata } from "next";
import DemoPage from "@/components/demo/DemoPage";
import { getT, getServerLocale } from "@/lib/i18n-server";
import { pageAlternates } from "@/lib/seo";

// /demo — the public demo-field tour. The page header (eyebrow + h1 + subtitle) and the SEO prose
// below the tour are rendered HERE, in a Server Component, because the interactive DemoPage is
// client-only and its body used to reach crawlers as a 173-character loading spinner: the flagship
// anonymous page was invisible to any bot that doesn't run JS (SEO_PLAN.md K5). DemoPage keeps the
// data-dependent parts (field chips, map, timeline, CTA) and no longer renders its own h1.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getServerLocale();
  const title = t("mkt.meta.demoTitle");
  return {
    title,
    description: t("mkt.meta.demoDesc"),
    alternates: pageAlternates("/demo", locale),
    openGraph: { title, description: t("mkt.meta.demoOgDesc"), type: "website" },
  };
}

export default async function DemoRoute() {
  const t = await getT();
  return (
    <>
      {/* Same container + type treatment the client header used, so the page looks unchanged. */}
      <header className="mx-auto max-w-4xl space-y-3 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grass">
          {t("mkt.demo.eyebrow")}
        </p>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight text-ink">
          {t("mkt.demo.title")}
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          {t("mkt.demo.subtitle")}
        </p>
      </header>

      <DemoPage />

      {/* Crawlable prose under the tour: what the demo shows, the honest satellite cadence, and how
          the free tier works. This is the "free NDVI map" landing content — keep it truthful. */}
      <section className="mx-auto max-w-4xl space-y-6 border-t border-line pt-8">
        <div>
          <h2 className="font-display text-[19px] font-bold text-ink">{t("mkt.demo.seoH2a")}</h2>
          <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-soft">
            {t("mkt.demo.seoP1")}
          </p>
        </div>
        <div>
          <h2 className="font-display text-[19px] font-bold text-ink">{t("mkt.demo.seoH2b")}</h2>
          <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-soft">
            {t("mkt.demo.seoP2")}
          </p>
        </div>
        <div>
          <h2 className="font-display text-[19px] font-bold text-ink">{t("mkt.demo.seoH2c")}</h2>
          <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-soft">
            {t("mkt.demo.seoP3")}
          </p>
        </div>
      </section>
    </>
  );
}
