"use client";

// How-it-works page — a general explanation of how Agradex works for any crop (formerly the
// hazelnut segment page; repurposed 2026-07-25). Same visual language as SolutionView; copy under
// mkt.how.* (7 languages). Client component for the FAQ accordion.
//
// Agradex's sharpest differentiator: the two best-known satellite farm tools are built for annual
// ROW CROPS (wheat, maize), while a hazelnut orchard is a PERENNIAL with a canopy that behaves very
// differently — and Azerbaijani nuts are not their focus. This page argues that case and grounds
// every capability claim in something the product genuinely ships:
//   * canopy NDVI / NDMI / NDRE over a perennial (peyk qatı)
//   * regional frost dates — last-spring p90 / first-autumn p10 over a 20-year archive (frost.py, B18)
//   * spray window + FAO-56 water balance + GDD heat accumulation (weather.py, field_gdd)
//   * wellness score (wellness.py), fertilizer dose suggestion, soil passport from a lab upload
//   * crop-calibrated index norms + growth-stage thresholds (crop_thresholds)
// The zones / yield / ledger P&L claims this list used to make were removed with those modules
// (81660df) — feat8/feat10/feat11 and the third deep-dive block now describe what actually ships.
// No invented statistics: the proof block is explicitly framed as an illustration ("nümunə").
//
// Self-contained (data + rendering here) so it lives entirely in the two files C6 owns. It mirrors
// the /solutions SolutionView visual language section for section. Client component for the FAQ
// accordion; copy is localised via t() (keys under mkt.how.*).

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Camera,
  Check,
  Droplets,
  FlaskConical,
  Gauge,
  Layers,
  Leaf,
  LineChart,
  Plus,
  Satellite,
  Share2,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  ThermometerSnowflake,
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
  { icon: Leaf, title: "mkt.how.vp1Title", body: "mkt.how.vp1Body" },
  { icon: Snowflake, title: "mkt.how.vp2Title", body: "mkt.how.vp2Body" },
  { icon: ThermometerSnowflake, title: "mkt.how.vp3Title", body: "mkt.how.vp3Body" },
  { icon: Layers, title: "mkt.how.vp4Title", body: "mkt.how.vp4Body" },
  { icon: Sprout, title: "mkt.how.vp5Title", body: "mkt.how.vp5Body" },
];

const STATS: { value: I18nKey; label: I18nKey }[] = [
  { value: "mkt.how.stat1Value", label: "mkt.how.stat1Label" },
  { value: "mkt.how.stat2Value", label: "mkt.how.stat2Label" },
  { value: "mkt.how.stat3Value", label: "mkt.how.stat3Label" },
];

const STEPS: { title: I18nKey; body: I18nKey }[] = [
  { title: "mkt.how.step1Title", body: "mkt.how.step1Body" },
  { title: "mkt.how.step2Title", body: "mkt.how.step2Body" },
  { title: "mkt.how.step3Title", body: "mkt.how.step3Body" },
  { title: "mkt.how.step4Title", body: "mkt.how.step4Body" },
];

const FEATURES: Feature[] = [
  { icon: Satellite, title: "mkt.how.feat1Title", body: "mkt.how.feat1Body" },
  { icon: Snowflake, title: "mkt.how.feat2Title", body: "mkt.how.feat2Body" },
  { icon: Sun, title: "mkt.how.feat3Title", body: "mkt.how.feat3Body" },
  { icon: Droplets, title: "mkt.how.feat4Title", body: "mkt.how.feat4Body" },
  { icon: ThermometerSnowflake, title: "mkt.how.feat5Title", body: "mkt.how.feat5Body" },
  { icon: Brain, title: "mkt.how.feat6Title", body: "mkt.how.feat6Body" },
  { icon: Camera, title: "mkt.how.feat7Title", body: "mkt.how.feat7Body" },
  { icon: Sprout, title: "mkt.how.feat8Title", body: "mkt.how.feat8Body" },
  { icon: Gauge, title: "mkt.how.feat9Title", body: "mkt.how.feat9Body" },
  { icon: FlaskConical, title: "mkt.how.feat10Title", body: "mkt.how.feat10Body" },
  { icon: Share2, title: "mkt.how.feat11Title", body: "mkt.how.feat11Body" },
  { icon: LineChart, title: "mkt.how.feat12Title", body: "mkt.how.feat12Body" },
];

const TWO_COL_LEFT: I18nKey[] = [
  "mkt.how.beforeItem1",
  "mkt.how.beforeItem2",
  "mkt.how.beforeItem3",
  "mkt.how.beforeItem4",
  "mkt.how.beforeItem5",
  "mkt.how.beforeItem6",
];

const TWO_COL_RIGHT: I18nKey[] = [
  "mkt.how.afterItem1",
  "mkt.how.afterItem2",
  "mkt.how.afterItem3",
  "mkt.how.afterItem4",
  "mkt.how.afterItem5",
  "mkt.how.afterItem6",
];

const DEEP: DeepBlock[] = [
  {
    icon: Satellite,
    title: "mkt.how.deep1Title",
    body: "mkt.how.deep1Body",
    bullets: [
      "mkt.how.deep1Bullet1",
      "mkt.how.deep1Bullet2",
      "mkt.how.deep1Bullet3",
      "mkt.how.deep1Bullet4",
    ],
  },
  {
    icon: Snowflake,
    title: "mkt.how.deep2Title",
    body: "mkt.how.deep2Body",
    bullets: [
      "mkt.how.deep2Bullet1",
      "mkt.how.deep2Bullet2",
      "mkt.how.deep2Bullet3",
      "mkt.how.deep2Bullet4",
    ],
  },
  {
    icon: Brain,
    title: "mkt.how.deep3Title",
    body: "mkt.how.deep3Body",
    bullets: [
      "mkt.how.deep3Bullet1",
      "mkt.how.deep3Bullet2",
      "mkt.how.deep3Bullet3",
      "mkt.how.deep3Bullet4",
    ],
  },
];

const FAQ: { q: I18nKey; a: I18nKey }[] = [
  { q: "mkt.how.faq1Q", a: "mkt.how.faq1A" },
  { q: "mkt.how.faq2Q", a: "mkt.how.faq2A" },
  { q: "mkt.how.faq3Q", a: "mkt.how.faq3A" },
  { q: "mkt.how.faq4Q", a: "mkt.how.faq4A" },
  { q: "mkt.how.faq5Q", a: "mkt.how.faq5A" },
  { q: "mkt.how.faq6Q", a: "mkt.how.faq6A" },
  { q: "mkt.how.faq7Q", a: "mkt.how.faq7A" },
];

/* ------------------------------------------------------------- hero visual
 * A static, clearly-labelled orchard preview. Stands in for a screenshot; nothing here is
 * presented as live data or a real customer.
 */
function FieldVisual() {
  return (
    <div className="relative h-full min-h-[340px] w-full">
      <span className="absolute right-3 top-3 z-10 rounded-full bg-panel/90 px-2.5 py-1 text-[11px] font-bold text-[color:var(--brand-muted)] shadow-sm">
        {t("mkt.how.visualSampleBadge")}
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
          {t("mkt.how.visualCanopyNdviLabel")}
        </p>
        <p className="font-display text-xl font-bold text-[color:var(--brand-ink)]">0.71</p>
      </div>
      <div className="absolute right-3 top-14 flex items-center gap-2 rounded-xl bg-panel/95 px-3 py-2 shadow-sm">
        <Snowflake className="h-4 w-4 text-sky-600" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[color:var(--brand-ink-2)]">
          {t("mkt.how.visualLastFrostLabel")}
        </span>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-line bg-panel p-3 shadow-soft sm:left-auto sm:right-3 sm:max-w-[268px]">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--green)]">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" /> {t("mkt.how.visualAiAgronomLabel")}
        </p>
        <p className="text-[12.5px] leading-snug text-[color:var(--brand-ink-2)]">
          {t("mkt.how.visualAiAdvice")}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export default function HowItWorks() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ------------------------------------------------------------ hero */}
      <section className="grid items-center gap-8 py-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ecdcb0] bg-[#fff4d6] px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-wide text-[#8a5f08]">
            <Sprout className="h-4 w-4" aria-hidden="true" />
            {t("mkt.how.heroBadge")}
          </span>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
            <Sprout className="h-4 w-4" aria-hidden="true" />
            {t("mkt.how.heroEyebrow")}
          </p>
          <h1 className="mt-3 font-display text-[clamp(28px,4vw,46px)] font-bold leading-[1.08] text-[color:var(--brand-ink)]">
            {t("mkt.how.heroTitle")}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
            {t("mkt.how.heroBody")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[color:var(--green)] px-6 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
            >
              {t("mkt.how.heroCtaPrimary")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-line-2 px-6 text-[15px] font-bold text-[color:var(--brand-ink)] transition-colors hover:border-[color:var(--brand-ink)]"
            >
              {t("mkt.how.heroCtaSecondary")}
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl2 border border-line-2 bg-panel shadow-lift">
          <FieldVisual />
        </div>
      </section>

      {/* ------------------------------------------------- differentiator */}
      <section className="py-6">
        <div className={`overflow-hidden rounded-xl2 border-[1.5px] border-line ${SH_SM}`}>
          <div className="border-b border-line bg-teal px-6 py-5">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#9dc6b3]">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> {t("mkt.how.diffEyebrow")}
            </p>
            <h2 className="mt-1.5 font-display text-[clamp(20px,2.6vw,28px)] font-bold leading-snug text-white">
              {t("mkt.how.diffTitle")}
            </h2>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-3">
            {[
              {
                icon: Layers,
                title: t("mkt.how.diffCard1Title"),
                body: t("mkt.how.diffCard1Body"),
              },
              {
                icon: Snowflake,
                title: t("mkt.how.diffCard2Title"),
                body: t("mkt.how.diffCard2Body"),
              },
              {
                icon: Sprout,
                title: t("mkt.how.diffCard3Title"),
                body: t("mkt.how.diffCard3Body"),
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
          title={t("mkt.how.valueHeading")}
          sub={t("mkt.how.valueSub")}
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
          title={t("mkt.how.stepsHeading")}
          sub={t("mkt.how.stepsSub")}
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
          title={t("mkt.how.featuresHeading")}
          sub={t("mkt.how.featuresSub")}
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
          title={t("mkt.how.beforeAfterHeading")}
          sub={t("mkt.how.beforeAfterSub")}
        />
        <div className={`grid overflow-hidden rounded-xl2 border border-line lg:grid-cols-2 ${SH_SM}`}>
          <div className="border-b border-line bg-panel-2 p-6 lg:border-b-0 lg:border-r">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              {t("mkt.how.beforeColTitle")}
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
              {t("mkt.how.afterColTitle")}
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
              {t("mkt.how.proofBadge")}
            </p>
          </div>
          <div className="p-6">
            <h2 className="font-display text-[clamp(20px,2.4vw,27px)] font-bold text-[color:var(--brand-ink)]">
              {t("mkt.how.proofTitle")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {t("mkt.how.proofBody")}
            </p>
            <ol className="mt-6 space-y-4 border-l-2 border-line pl-5">
              {[
                { when: t("mkt.how.proofT1When"), what: t("mkt.how.proofT1What") },
                { when: t("mkt.how.proofT2When"), what: t("mkt.how.proofT2What") },
                { when: t("mkt.how.proofT3When"), what: t("mkt.how.proofT3What") },
                { when: t("mkt.how.proofT4When"), what: t("mkt.how.proofT4What") },
                { when: t("mkt.how.proofT5When"), what: t("mkt.how.proofT5What") },
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
              {t("mkt.how.proofDisclaimer")}
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- deep dive */}
      <section className="py-10">
        <SectionHead
          title={t("mkt.how.deepHeading")}
          sub={t("mkt.how.deepSub")}
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
            {t("mkt.how.pricingNote")}
          </p>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-grass-deep px-5 text-sm font-bold text-grass-deep transition-colors hover:bg-panel"
          >
            {t("mkt.how.pricingCta")}
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section className="scroll-mt-24 py-10" id="suallar">
        <SectionHead title={t("mkt.how.faqHeading")} />
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
            {t("mkt.how.ctaTitle")}
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            {t("mkt.how.ctaSub")}
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
          >
            {t("mkt.how.heroCtaPrimary")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- other roles */}
      <section className="pb-4">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-muted)]">
          {t("mkt.how.otherRolesEyebrow")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/solutions"
            className={`${CARD} inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-[color:var(--brand-ink)] transition-colors hover:border-line-2`}
          >
            <Leaf className="h-4 w-4 text-grass-deep" aria-hidden="true" />
            {t("mkt.how.otherRolesLink")}
            <ArrowRight className="h-4 w-4 text-[color:var(--brand-muted)]" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
