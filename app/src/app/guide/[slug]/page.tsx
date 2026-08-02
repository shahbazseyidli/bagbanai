import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Brain, ChevronRight, Clipboard, FileText, FlaskConical, Lightbulb,
  MapPin, Monitor, Satellite, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getGuide, type GuideIcon } from "@/components/guide/content";
import { getT, getServerLocale } from "@/lib/i18n-server";
import { pageAlternates, localeUrl } from "@/lib/seo";
import { AUTHOR, GUIDES_PUBLISHED, GUIDES_MODIFIED } from "@/lib/author";

// The article body is localized via getT() (reads the per-request x-locale header), so it can't be
// statically prerendered — the locale isn't known at build time. Render on demand. (No
// generateStaticParams: with it present Next prerenders the slugs as az and ignores the header,
// which would leave /de/guide/… showing Azerbaijani.)
export const dynamic = "force-dynamic";

// C8 — one article per how-to guide: /guide/sahe-elave-et, /guide/peyk-melumatini-oxu, … Server
// Component so each ships its own <title>/description. Steps, described "screens", tips and
// cross-links all come from guide/content.ts. No external images — the "screen" blocks are
// text descriptions rendered in a faux-UI box (CSP + offline PWA forbid remote assets).

const ICONS: Record<GuideIcon, LucideIcon> = {
  "map-pin": MapPin,
  satellite: Satellite,
  brain: Brain,
  clipboard: Clipboard,
  sprout: Sprout,
  "file-text": FileText,
  flask: FlaskConical,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = await getT();
  const g = getGuide(slug, locale);
  if (!g) return { title: "Agradex" };
  return {
    title: `${g.title} — ${t("mkt.meta.guideItemSuffix")}`,
    description: g.summary,
    alternates: pageAlternates(`/guide/${g.slug}`, locale),
  };
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getT();
  const locale = await getServerLocale();
  const { slug } = await params;
  const g = getGuide(slug, locale);
  if (!g) notFound();

  const Icon = ICONS[g.icon] ?? MapPin;

  // Article structured data — the byline below and this block must always agree (same author,
  // same dates), or the page claims one identity to readers and another to crawlers.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.summary,
    inLanguage: locale,
    author: { "@type": "Person", name: AUTHOR.name, ...(AUTHOR.url ? { url: AUTHOR.url } : {}) },
    publisher: { "@type": "Organization", name: "Agradex", url: localeUrl("/", "az") },
    datePublished: GUIDES_PUBLISHED,
    dateModified: GUIDES_MODIFIED,
    mainEntityOfPage: localeUrl(`/guide/${g.slug}`, locale),
  };

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, "\\u003c") }}
      />
      <article className="mx-auto max-w-[720px]">
        {/* --------------------------------------------------- breadcrumb */}
        <Link
          href="/guide"
          className="inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold text-[color:var(--brand-ink-2)] transition-colors hover:text-teal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("mkt.guideSlug.allGuides")}
        </Link>

        {/* -------------------------------------------------------- header */}
        <header className="mt-4 flex items-start gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
            aria-hidden="true"
          >
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[clamp(24px,3.4vw,34px)] font-bold leading-[1.15] text-[color:var(--brand-ink)]">
              {g.title}
            </h1>
            <p className="mt-1.5 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--brand-muted)]">
              {g.meta}
            </p>
            <p className="mt-1.5 text-[13px] text-[color:var(--brand-muted)]">
              {t("mkt.guideSlug.authorLabel")}:{" "}
              {AUTHOR.url ? (
                <a
                  href={AUTHOR.url}
                  rel="author noopener"
                  target="_blank"
                  className="underline decoration-dotted underline-offset-2 hover:text-teal"
                >
                  {AUTHOR.name}
                </a>
              ) : (
                AUTHOR.name
              )}{" "}
              · {t("mkt.guideSlug.updatedLabel")}:{" "}
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(GUIDES_MODIFIED))}
            </p>
          </div>
        </header>

        <p className="mt-5 text-[16.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
          {g.intro}
        </p>

        {/* --------------------------------------------------------- where */}
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#bfe6cd] bg-mint-soft px-4 py-2 text-[13.5px] font-semibold text-grass-deep">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {t("mkt.guideSlug.whereLabel")} {g.where}
        </p>

        {/* --------------------------------------------------------- steps */}
        <ol className="mt-8 space-y-6">
          {g.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--green)] text-[15px] font-bold text-white"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="font-display text-[18px] font-bold text-[color:var(--brand-ink)]">
                  {s.title}
                </h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
                  {s.body}
                </p>
                {s.screen && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line border-dashed bg-panel-2 px-4 py-3">
                    <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-muted)]" aria-hidden="true" />
                    <p className="text-[13px] leading-relaxed text-[color:var(--brand-ink-2)]">
                      {s.screen}
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* ---------------------------------------------------------- tips */}
        {g.tips.length > 0 && (
          <section className="mt-9 rounded-xl2 border border-line bg-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-[color:var(--brand-ink)]">
              <Lightbulb className="h-5 w-5 text-[color:var(--amber)]" aria-hidden="true" />
              {t("mkt.guideSlug.tipsHeading")}
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {g.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--green)]" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------- related */}
        {g.related.length > 0 && (
          <section className="mt-9">
            <h2 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">
              {t("mkt.guideSlug.nextStepHeading")}
            </h2>
            <div className="mt-3 grid gap-2.5">
              {g.related.map((rslug) => {
                const r = getGuide(rslug, locale);
                if (!r) return null;
                const RIcon = ICONS[r.icon] ?? MapPin;
                return (
                  <Link
                    key={rslug}
                    href={`/guide/${r.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-teal"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint-soft text-grass-deep"
                      aria-hidden="true"
                    >
                      <RIcon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-[14.5px] font-semibold text-[color:var(--brand-ink)]">
                      {r.title}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--brand-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------- cta */}
        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl2 border-[1.5px] border-[#bfe6cd] bg-mint-soft p-5">
          <p className="flex-1 text-[14.5px] font-semibold text-grass-deep">
            {t("mkt.guideSlug.ctaText")}
          </p>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[color:var(--green)] px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
          >
            {t("mkt.guideSlug.ctaButton")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </div>
  );
}
