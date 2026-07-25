"use client";

// C6 — hazelnut / orchard segment landing page.
//
// Bağban AI's sharpest differentiator: the two best-known satellite farm tools are built for annual
// ROW CROPS (wheat, maize), while a hazelnut orchard is a PERENNIAL with a canopy that behaves very
// differently — and Azerbaijani nuts are not their focus. This page argues that case and grounds
// every capability claim in something the product genuinely ships:
//   * canopy NDVI / NDMI / NDRE over a perennial (peyk qatı)
//   * regional frost dates — last-spring p90 / first-autumn p10 over a 20-year archive (frost.py, B18)
//   * spray window + FAO-56 water balance + GDD heat accumulation (weather.py, field_gdd)
//   * wellness score (wellness.py), multi-season productivity zones (A6), yield + ledger P&L
//   * hazelnut-calibrated index norms + growth-stage thresholds (crop_thresholds crop_type='hazelnut')
// No invented statistics: the proof block is explicitly framed as an illustration ("nümunə").
//
// Self-contained (data + rendering here) so it lives entirely in the two files C6 owns. It mirrors
// the /solutions SolutionView visual language section for section. Client component for the FAQ
// accordion; copy is localised via t() (keys under mkt.nuts.*).

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Camera,
  Check,
  Droplets,
  Gauge,
  Layers,
  Leaf,
  LineChart,
  Nut,
  Plus,
  Satellite,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  ThermometerSnowflake,
  Trees,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { t, type I18nKey } from "@/lib/i18n";

/* --sh-sm from globals.css — the mockup's card shadow (Tailwind only tokens --sh / --sh-lg). */
const SH_SM = "shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]";
const CARD = `rounded-xl2 border border-line bg-panel ${SH_SM}`;

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-7 max-w-[660px] text-center">
      <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold leading-tight text-[color:var(--brand-ink)]">
        {title}
      </h2>
      {sub && <p className="mt-2 text-[16.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------- data */

interface ValuePoint {
  icon: LucideIcon;
  title: I18nKey;
  body: I18nKey;
}
interface Feature {
  icon: LucideIcon;
  title: I18nKey;
  body: I18nKey;
}
interface DeepBlock {
  icon: LucideIcon;
  title: I18nKey;
  body: I18nKey;
  bullets: I18nKey[];
}

const VALUE_POINTS: ValuePoint[] = [
  { icon: Leaf, title: "mkt.nuts.vp1Title", body: "mkt.nuts.vp1Body" },
  { icon: Snowflake, title: "mkt.nuts.vp2Title", body: "mkt.nuts.vp2Body" },
  { icon: ThermometerSnowflake, title: "mkt.nuts.vp3Title", body: "mkt.nuts.vp3Body" },
  { icon: Layers, title: "mkt.nuts.vp4Title", body: "mkt.nuts.vp4Body" },
  { icon: Nut, title: "mkt.nuts.vp5Title", body: "mkt.nuts.vp5Body" },
];

const STATS: { value: I18nKey; label: I18nKey }[] = [
  { value: "mkt.nuts.stat1Value", label: "mkt.nuts.stat1Label" },
  { value: "mkt.nuts.stat2Value", label: "mkt.nuts.stat2Label" },
  { value: "mkt.nuts.stat3Value", label: "mkt.nuts.stat3Label" },
];

const STEPS: { title: I18nKey; body: I18nKey }[] = [
  { title: "mkt.nuts.step1Title", body: "mkt.nuts.step1Body" },
  { title: "mkt.nuts.step2Title", body: "mkt.nuts.step2Body" },
  { title: "mkt.nuts.step3Title", body: "mkt.nuts.step3Body" },
  { title: "mkt.nuts.step4Title", body: "mkt.nuts.step4Body" },
];

const FEATURES: Feature[] = [
  { icon: Satellite, title: "mkt.nuts.feat1Title", body: "mkt.nuts.feat1Body" },
  { icon: Snowflake, title: "mkt.nuts.feat2Title", body: "mkt.nuts.feat2Body" },
  { icon: Sun, title: "mkt.nuts.feat3Title", body: "mkt.nuts.feat3Body" },
  { icon: Droplets, title: "mkt.nuts.feat4Title", body: "mkt.nuts.feat4Body" },
  { icon: ThermometerSnowflake, title: "mkt.nuts.feat5Title", body: "mkt.nuts.feat5Body" },
  { icon: Brain, title: "mkt.nuts.feat6Title", body: "mkt.nuts.feat6Body" },
  { icon: Camera, title: "mkt.nuts.feat7Title", body: "mkt.nuts.feat7Body" },
  { icon: Layers, title: "mkt.nuts.feat8Title", body: "mkt.nuts.feat8Body" },
  { icon: Gauge, title: "mkt.nuts.feat9Title", body: "mkt.nuts.feat9Body" },
  { icon: TrendingUp, title: "mkt.nuts.feat10Title", body: "mkt.nuts.feat10Body" },
  { icon: Wallet, title: "mkt.nuts.feat11Title", body: "mkt.nuts.feat11Body" },
  { icon: LineChart, title: "mkt.nuts.feat12Title", body: "mkt.nuts.feat12Body" },
];

const TWO_COL_LEFT: I18nKey[] = [
  "mkt.nuts.beforeItem1",
  "mkt.nuts.beforeItem2",
  "mkt.nuts.beforeItem3",
  "mkt.nuts.beforeItem4",
  "mkt.nuts.beforeItem5",
  "mkt.nuts.beforeItem6",
];

const TWO_COL_RIGHT: I18nKey[] = [
  "mkt.nuts.afterItem1",
  "mkt.nuts.afterItem2",
  "mkt.nuts.afterItem3",
  "mkt.nuts.afterItem4",
  "mkt.nuts.afterItem5",
  "mkt.nuts.afterItem6",
];

const DEEP: DeepBlock[] = [
  {
    icon: Satellite,
    title: "mkt.nuts.deep1Title",
    body: "mkt.nuts.deep1Body",
    bullets: [
      "mkt.nuts.deep1Bullet1",
      "mkt.nuts.deep1Bullet2",
      "mkt.nuts.deep1Bullet3",
      "mkt.nuts.deep1Bullet4",
    ],
  },
  {
    icon: Snowflake,
    title: "mkt.nuts.deep2Title",
    body: "mkt.nuts.deep2Body",
    bullets: [
      "mkt.nuts.deep2Bullet1",
      "mkt.nuts.deep2Bullet2",
      "mkt.nuts.deep2Bullet3",
      "mkt.nuts.deep2Bullet4",
    ],
  },
  {
    icon: Wallet,
    title: "mkt.nuts.deep3Title",
    body: "mkt.nuts.deep3Body",
    bullets: [
      "mkt.nuts.deep3Bullet1",
      "mkt.nuts.deep3Bullet2",
      "mkt.nuts.deep3Bullet3",
      "mkt.nuts.deep3Bullet4",
    ],
  },
];

const FAQ: { q: I18nKey; a: I18nKey }[] = [
  { q: "mkt.nuts.faq1Q", a: "mkt.nuts.faq1A" },
  { q: "mkt.nuts.faq2Q", a: "mkt.nuts.faq2A" },
  { q: "mkt.nuts.faq3Q", a: "mkt.nuts.faq3A" },
  { q: "mkt.nuts.faq4Q", a: "mkt.nuts.faq4A" },
  { q: "mkt.nuts.faq5Q", a: "mkt.nuts.faq5A" },
  { q: "mkt.nuts.faq6Q", a: "mkt.nuts.faq6A" },
  { q: "mkt.nuts.faq7Q", a: "mkt.nuts.faq7A" },
];

/* ------------------------------------------------------------- hero visual
 * A static, clearly-labelled orchard preview. Stands in for a screenshot; nothing here is
 * presented as live data or a real customer.
 */
function OrchardVisual() {
  return (
    <div className="relative h-full min-h-[340px] w-full">
      <span className="absolute right-3 top-3 z-10 rounded-full bg-panel/90 px-2.5 py-1 text-[11px] font-bold text-[color:var(--brand-muted)] shadow-sm">
        {t("mkt.nuts.visualSampleBadge")}
      </span>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(125deg,var(--ndvi-5) 0%,var(--ndvi-4) 32%,var(--ndvi-3) 56%,var(--ndvi-4) 78%,var(--ndvi-5) 100%)",
        }}
        aria-hidden="true"
      />
      {/* orchard "rows" — a hint of a planted canopy grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.16) 0 3px, transparent 3px 22px)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute left-[15%] top-[18%] h-[46%] w-[52%] rounded-[10px] border-2 border-white/80"
        style={{ background: "rgba(255,255,255,0.08)" }}
        aria-hidden="true"
      />
      <div className="absolute left-3 top-3 rounded-xl bg-panel/95 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-muted)]">
          {t("mkt.nuts.visualCanopyNdviLabel")}
        </p>
        <p className="font-display text-xl font-bold text-[color:var(--brand-ink)]">0.71</p>
      </div>
      <div className="absolute right-3 top-14 flex items-center gap-2 rounded-xl bg-panel/95 px-3 py-2 shadow-sm">
        <Snowflake className="h-4 w-4 text-sky-600" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[color:var(--brand-ink-2)]">
          {t("mkt.nuts.visualLastFrostLabel")}
        </span>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-line bg-panel p-3 shadow-soft sm:left-auto sm:right-3 sm:max-w-[268px]">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--green)]">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" /> {t("mkt.nuts.visualAiAgronomLabel")}
        </p>
        <p className="text-[12.5px] leading-snug text-[color:var(--brand-ink-2)]">
          {t("mkt.nuts.visualAiAdvice")}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export default function NutsSegment() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ------------------------------------------------------------ hero */}
      <section className="grid items-center gap-8 py-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ecdcb0] bg-[#fff4d6] px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-wide text-[#8a5f08]">
            <Sprout className="h-4 w-4" aria-hidden="true" />
            {t("mkt.nuts.heroBadge")}
          </span>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
            <Nut className="h-4 w-4" aria-hidden="true" />
            {t("mkt.nuts.heroEyebrow")}
          </p>
          <h1 className="mt-3 font-display text-[clamp(28px,4vw,46px)] font-bold leading-[1.08] text-[color:var(--brand-ink)]">
            {t("mkt.nuts.heroTitle")}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
            {t("mkt.nuts.heroBody")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[color:var(--green)] px-6 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
            >
              {t("mkt.nuts.heroCtaPrimary")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-line-2 px-6 text-[15px] font-bold text-[color:var(--brand-ink)] transition-colors hover:border-[color:var(--brand-ink)]"
            >
              {t("mkt.nuts.heroCtaSecondary")}
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl2 border border-line-2 bg-panel shadow-lift">
          <OrchardVisual />
        </div>
      </section>

      {/* ------------------------------------------------- differentiator */}
      <section className="py-6">
        <div className={`overflow-hidden rounded-xl2 border-[1.5px] border-line ${SH_SM}`}>
          <div className="border-b border-line bg-teal px-6 py-5">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#9dc6b3]">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> {t("mkt.nuts.diffEyebrow")}
            </p>
            <h2 className="mt-1.5 font-display text-[clamp(20px,2.6vw,28px)] font-bold leading-snug text-white">
              {t("mkt.nuts.diffTitle")}
            </h2>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-3">
            {[
              {
                icon: Trees,
                title: t("mkt.nuts.diffCard1Title"),
                body: t("mkt.nuts.diffCard1Body"),
              },
              {
                icon: Snowflake,
                title: t("mkt.nuts.diffCard2Title"),
                body: t("mkt.nuts.diffCard2Body"),
              },
              {
                icon: Nut,
                title: t("mkt.nuts.diffCard3Title"),
                body: t("mkt.nuts.diffCard3Body"),
              },
            ].map((c) => (
              <div key={c.title} className="bg-panel p-6">
                <span
                  className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">{c.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- value points */}
      <section className="py-10">
        <SectionHead
          title={t("mkt.nuts.valueHeading")}
          sub={t("mkt.nuts.valueSub")}
        />
        <ol className="grid gap-4 lg:grid-cols-2">
          {VALUE_POINTS.map((p, i) => (
            <li key={p.title} className={`${CARD} flex gap-4 p-5`}>
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                aria-hidden="true"
              >
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-[16.5px] font-bold text-[color:var(--brand-ink)]">
                  <span className="mr-1.5 text-[color:var(--green)]">{i + 1}.</span>
                  {t(p.title)}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t(p.body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------- stats band */}
      <section className="py-6">
        <div className="grid gap-3.5 lg:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className={`rounded-xl2 bg-teal p-6 text-center ${SH_SM}`}>
              <b className="block font-display text-[32px] font-bold leading-none text-white">{t(s.value)}</b>
              <span className="mt-2 block text-[13px] leading-snug text-[#9dc6b3]">{t(s.label)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- steps */}
      <section className="scroll-mt-24 py-10" id="nece-isleyir">
        <SectionHead
          title={t("mkt.nuts.stepsHeading")}
          sub={t("mkt.nuts.stepsSub")}
        />
        <div className="grid gap-4 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`${CARD} p-5`}>
              <span
                className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-[color:var(--green)] font-extrabold text-white"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-[15.5px] font-bold text-[color:var(--brand-ink)]">{t(s.title)}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t(s.body)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- features */}
      <section className="py-10">
        <SectionHead
          title={t("mkt.nuts.featuresHeading")}
          sub={t("mkt.nuts.featuresSub")}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`${CARD} p-5`}>
              <span
                className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                aria-hidden="true"
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-base font-bold text-[color:var(--brand-ink)]">{t(f.title)}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t(f.body)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- two-col */}
      <section className="py-10">
        <SectionHead
          title={t("mkt.nuts.beforeAfterHeading")}
          sub={t("mkt.nuts.beforeAfterSub")}
        />
        <div className={`grid overflow-hidden rounded-xl2 border border-line lg:grid-cols-2 ${SH_SM}`}>
          <div className="border-b border-line bg-panel-2 p-6 lg:border-b-0 lg:border-r">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              {t("mkt.nuts.beforeColTitle")}
            </h3>
            <ul className="grid gap-2.5">
              {TWO_COL_LEFT.map((it) => (
                <li key={it} className="flex gap-2.5 text-sm text-[color:var(--brand-ink-2)]">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--red-soft)] text-[color:var(--brand-red)]"
                    aria-hidden="true"
                  >
                    <X className="h-3 w-3" />
                  </span>
                  {t(it)}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-panel p-6">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              {t("mkt.nuts.afterColTitle")}
            </h3>
            <ul className="grid gap-2.5">
              {TWO_COL_RIGHT.map((it) => (
                <li key={it} className="flex gap-2.5 text-sm text-[color:var(--brand-ink-2)]">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-soft text-grass-deep"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  {t(it)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- proof */}
      <section className="py-10">
        <div className={`overflow-hidden rounded-xl2 border border-line bg-panel ${SH_SM}`}>
          <div className="border-b border-line bg-panel-2 px-5 py-3">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-[color:var(--brand-muted)]">
              {t("mkt.nuts.proofBadge")}
            </p>
          </div>
          <div className="p-6">
            <h2 className="font-display text-[clamp(20px,2.4vw,27px)] font-bold text-[color:var(--brand-ink)]">
              {t("mkt.nuts.proofTitle")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {t("mkt.nuts.proofBody")}
            </p>
            <ol className="mt-6 space-y-4 border-l-2 border-line pl-5">
              {[
                { when: t("mkt.nuts.proofT1When"), what: t("mkt.nuts.proofT1What") },
                { when: t("mkt.nuts.proofT2When"), what: t("mkt.nuts.proofT2What") },
                { when: t("mkt.nuts.proofT3When"), what: t("mkt.nuts.proofT3What") },
                { when: t("mkt.nuts.proofT4When"), what: t("mkt.nuts.proofT4What") },
                { when: t("mkt.nuts.proofT5When"), what: t("mkt.nuts.proofT5What") },
              ].map((row) => (
                <li key={row.when} className="relative">
                  <span
                    className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-panel bg-[color:var(--green)]"
                    aria-hidden="true"
                  />
                  <p className="text-[13px] font-bold uppercase tracking-wide text-[color:var(--green)]">
                    {row.when}
                  </p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{row.what}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-xl bg-panel-2 p-4 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {t("mkt.nuts.proofDisclaimer")}
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- deep dive */}
      <section className="py-10">
        <SectionHead
          title={t("mkt.nuts.deepHeading")}
          sub={t("mkt.nuts.deepSub")}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {DEEP.map((d) => (
            <div key={d.title} className={`${CARD} p-6`}>
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <d.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[17px] font-bold text-[color:var(--brand-ink)]">{t(d.title)}</h3>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t(d.body)}</p>
              <ul className="mt-4 grid gap-2">
                {d.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[13.5px] text-[color:var(--brand-ink-2)]">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-soft text-grass-deep"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {t(b)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- pricing note */}
      <section className="py-4">
        <div className="flex flex-col gap-4 rounded-xl2 border-[1.5px] border-[#bfe6cd] bg-mint-soft p-6 sm:flex-row sm:items-center">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel text-grass-deep"
            aria-hidden="true"
          >
            <Wallet className="h-5 w-5" />
          </span>
          <p className="flex-1 text-[14.5px] leading-relaxed text-grass-deep">
            {t("mkt.nuts.pricingNote")}
          </p>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-grass-deep px-5 text-sm font-bold text-grass-deep transition-colors hover:bg-panel"
          >
            {t("mkt.nuts.pricingCta")}
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section className="scroll-mt-24 py-10" id="suallar">
        <SectionHead title={t("mkt.nuts.faqHeading")} />
        <div className="mx-auto max-w-[760px]">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`nut-faq-a-${i}`}
                  className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-[16.5px] font-semibold text-[color:var(--brand-ink)]">{t(item.q)}</span>
                  <Plus
                    className={`h-5 w-5 shrink-0 text-[color:var(--brand-muted)] transition-transform duration-200 motion-reduce:transition-none ${
                      open ? "rotate-45" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`nut-faq-a-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-4 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t(item.a)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------- final CTA */}
      <section className="py-8">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            {t("mkt.nuts.ctaTitle")}
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            {t("mkt.nuts.ctaSub")}
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
          >
            {t("mkt.nuts.heroCtaPrimary")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- other roles */}
      <section className="pb-4">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-muted)]">
          {t("mkt.nuts.otherRolesEyebrow")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/solutions"
            className={`${CARD} inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-[color:var(--brand-ink)] transition-colors hover:border-line-2`}
          >
            <Leaf className="h-4 w-4 text-grass-deep" aria-hidden="true" />
            {t("mkt.nuts.otherRolesLink")}
            <ArrowRight className="h-4 w-4 text-[color:var(--brand-muted)]" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
