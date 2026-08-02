import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPostList } from "@/components/blog";
import { getT, getServerLocale } from "@/lib/i18n-server";
import { pageAlternates } from "@/lib/seo";
import { AUTHOR } from "@/lib/author";

// /blog — the knowledge-hub index. Server Component, localized chrome; the list shows each post in
// the reader's language when it exists, falling back to English (see blog/index.ts::getPost).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getServerLocale();
  return {
    title: t("mkt.meta.blogTitle"),
    description: t("mkt.meta.blogDesc"),
    alternates: pageAlternates("/blog", locale),
  };
}

export default async function BlogIndexPage() {
  const t = await getT();
  const locale = await getServerLocale();
  const posts = getPostList(locale);
  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          {t("mkt.blog.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          {t("mkt.blog.title")}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
          {t("mkt.blog.lead")}
        </p>
      </header>

      <section className="mx-auto grid max-w-[860px] gap-4">
        {posts.map(({ post }) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-xl2 border border-line bg-panel p-5 transition-colors hover:border-teal shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
          >
            <h2 className="font-display text-[19px] font-bold leading-snug text-[color:var(--brand-ink)]">
              {post.title}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {post.description}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[12.5px] font-semibold text-[color:var(--brand-muted)]">
                {AUTHOR.name} ·{" "}
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                  new Date(post.dateModified),
                )}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-teal">
                {t("mkt.blog.readMore")}
                <ChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
