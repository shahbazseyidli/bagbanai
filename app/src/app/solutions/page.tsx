import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Package, Sprout, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { INDEX_COPY, SEGMENT_LIST, type IconKey } from "@/components/solutions/content";

// W2 / E11 — the /solutions index: the four role segments with the approved mockup's pill + card
// treatment. Purely presentational (no state, no t()), so it stays a Server Component and ships
// its own metadata. Copy is inline Azerbaijani; the T18 sweep extracts it later.

export const metadata: Metadata = {
  title: "Həllər — Bağban AI",
  description:
    "Fermer, laboratoriya, aqro-konsultant və təchizatçı üçün ayrı-ayrı həllər. Fermerlərə 1 ay pulsuz, provayderlərə həmişə pulsuz.",
  alternates: { canonical: "/solutions" },
};

const TAB_ICONS: Partial<Record<IconKey, LucideIcon>> = {
  sprout: Sprout,
  flask: FlaskConical,
  users: Users,
  package: Package,
};

const SH_SM = "shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]";

export default function SolutionsIndexPage() {
  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ---------------------------------------------------------- head */}
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          {INDEX_COPY.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          {INDEX_COPY.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">{INDEX_COPY.lead}</p>
      </header>

      {/* ---------------------------------------------------------- tabs */}
      <nav aria-label="Həllər" className="mb-8 flex flex-wrap justify-center gap-2">
        {SEGMENT_LIST.map((s) => {
          const Icon = TAB_ICONS[s.tabIcon] ?? Sprout;
          return (
            <Link
              key={s.slug}
              href={`/solutions/${s.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-line bg-panel px-4 text-sm font-semibold text-[color:var(--brand-ink-2)] transition-colors hover:border-teal hover:text-teal"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      {/* --------------------------------------------------------- cards */}
      <section className="grid gap-5 lg:grid-cols-2">
        {SEGMENT_LIST.map((s) => {
          const Icon = TAB_ICONS[s.tabIcon] ?? Sprout;
          const free = s.badge.tone === "free";
          return (
            <article
              key={s.slug}
              className={`flex flex-col rounded-xl2 border border-line bg-panel p-6 ${SH_SM}`}
            >
              <div className="flex items-start gap-4">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: s.accent }}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[20px] font-bold text-[color:var(--brand-ink)]">{s.label}</h2>
                  <p className="mt-1 text-[13.5px] text-[color:var(--brand-ink-2)]">{s.short}</p>
                </div>
              </div>

              <span
                className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide ${
                  free
                    ? "border-[#bfe6cd] bg-mint-soft text-grass-deep"
                    : "border-[#ecdcb0] bg-[#fff4d6] text-[#8a5f08]"
                }`}
              >
                {s.badge.text}
              </span>

              <p className="mt-4 font-display text-[17px] font-bold leading-snug text-[color:var(--brand-ink)]">
                {s.headline}
              </p>

              <ul className="mt-3 grid gap-2">
                {s.cardBullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[14px] text-[color:var(--brand-ink-2)]">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-soft text-grass-deep"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <Link
                href={`/solutions/${s.slug}`}
                className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[color:var(--green)] px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
              >
                Ətraflı bax
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </section>

      {/* -------------------------------------------------- who pays band */}
      <section className="py-10">
        <div className="mx-auto flex max-w-[860px] flex-col gap-4 rounded-xl2 border-[1.5px] border-[#bfe6cd] bg-mint-soft p-6 sm:flex-row sm:items-center">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-panel text-grass-deep"
            aria-hidden="true"
          >
            <Wallet className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-[18px] font-bold text-grass-deep">{INDEX_COPY.pricingTitle}</h2>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-grass-deep">{INDEX_COPY.pricingBody}</p>
          </div>
          <Link
            href={INDEX_COPY.pricingLink.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-grass-deep px-5 text-sm font-bold text-grass-deep transition-colors hover:bg-panel"
          >
            {INDEX_COPY.pricingLink.label}
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- cta */}
      <section className="pb-6">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">{INDEX_COPY.ctaTitle}</h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">{INDEX_COPY.ctaSub}</p>
          <Link
            href={INDEX_COPY.ctaHref}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
          >
            {INDEX_COPY.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
