import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { availableLocales, getPost } from "@/components/blog";
import { getT, getServerLocale } from "@/lib/i18n-server";
import { pageAlternatesAmong, localeUrl } from "@/lib/seo";
import { AUTHOR, } from "@/lib/author";
import type { Locale } from "@/lib/i18n";

// /blog/[slug] — one article. Locale comes from the x-locale header, so no static prerender (same
// reason as guide/[slug]). A locale without its own variant is served English with the canonical
// pointing at the English URL — never a translated-on-the-fly page.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const hit = getPost(slug, locale);
  if (!hit) return { title: "Agradex" };
  const { post, served } = hit;
  return {
    title: `${post.title} — Agradex`,
    description: post.description,
    alternates: pageAlternatesAmong(`/blog/${slug}`, locale, availableLocales(slug), served as Locale),
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getT();
  const locale = await getServerLocale();
  const { slug } = await params;
  const hit = getPost(slug, locale);
  if (!hit) notFound();
  const { post, served } = hit;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: served,
    author: { "@type": "Person", name: AUTHOR.name, ...(AUTHOR.url ? { url: AUTHOR.url } : {}) },
    publisher: { "@type": "Organization", name: "Agradex", url: localeUrl("/", "az") },
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    mainEntityOfPage: localeUrl(`/blog/${slug}`, served as Locale),
  };

  const fmtDate = new Intl.DateTimeFormat(served, { dateStyle: "medium" });

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, "\\u003c") }}
      />
      <article className="mx-auto max-w-[720px]">
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold text-[color:var(--brand-ink-2)] transition-colors hover:text-teal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("mkt.blog.title")}
        </Link>

        <header className="mt-4">
          <h1 className="font-display text-[clamp(26px,3.6vw,36px)] font-bold leading-[1.15] text-[color:var(--brand-ink)]">
            {post.title}
          </h1>
          <p className="mt-3 text-[13px] text-[color:var(--brand-muted)]">
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
            · {t("mkt.guideSlug.updatedLabel")}: {fmtDate.format(new Date(post.dateModified))}
          </p>
        </header>

        <p className="mt-5 text-[16.5px] leading-relaxed text-[color:var(--brand-ink)]">
          {post.lead}
        </p>

        {post.sections.map((s, i) => (
          <section key={i} className="mt-7">
            {s.heading && (
              <h2 className="font-display text-[20px] font-bold text-[color:var(--brand-ink)]">
                {s.heading}
              </h2>
            )}
            {s.paragraphs?.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-3 grid gap-2">
                {s.bullets.map((b) => (
                  <li key={b.slice(0, 40)} className="flex gap-2.5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--green)]" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {s.table && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-panel">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {s.table.headers.map((h) => (
                        <th key={h} className="px-3.5 py-2.5 font-semibold text-[color:var(--brand-ink)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-line last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3.5 py-2.5 text-[color:var(--brand-ink-2)]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        {post.related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">
              {t("mkt.guideSlug.nextStepHeading")}
            </h2>
            <div className="mt-3 grid gap-2.5">
              {post.related.map((rslug) => {
                const r = getPost(rslug, locale);
                if (!r) return null;
                return (
                  <Link
                    key={rslug}
                    href={`/blog/${rslug}`}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-teal"
                  >
                    <span className="flex-1 text-[14.5px] font-semibold text-[color:var(--brand-ink)]">
                      {r.post.title}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--brand-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl2 border-[1.5px] border-[#bfe6cd] bg-mint-soft p-5">
          <p className="flex-1 text-[14.5px] font-semibold text-grass-deep">
            {t("mkt.guideSlug.ctaText")}
          </p>
          <Link
            href="/demo"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[color:var(--green)] px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
          >
            {t("mkt.footer.linkDemo")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </div>
  );
}
