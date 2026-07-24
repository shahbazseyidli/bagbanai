"use client";

// W2 / E11 — renders ONE solution segment from the content model (components/solutions/content.ts).
// Page architecture mirrors the approved mockup's SOLUTIONS view, section for section:
//   hero (badge · eyebrow · headline · lead · CTAs · sample visual)
//   → numbered value points → stats band → "Necə işləyir" (4 steps) → feature cards
//   → two-column əvvəl/sonra → proof case → deep-dive → pricing note → FAQ → closing CTA.
// Client component because of the FAQ accordion; copy is inline Azerbaijani (T18 sweep extracts it).
// Every grid collapses to a single column below 1024px, matching the mockup's 920px breakpoint.
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Boxes,
  Brain,
  Camera,
  Check,
  Clock,
  Droplets,
  FileText,
  FlaskConical,
  Globe,
  Handshake,
  Layers,
  LineChart,
  Map as MapIcon,
  MessageSquare,
  Package,
  Plus,
  Satellite,
  Search,
  ShieldCheck,
  Sprout,
  Store,
  Target,
  Upload,
  Users,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  SEGMENT_LIST,
  type IconKey,
  type Segment,
  type VisualKey,
} from "@/components/solutions/content";

const ICONS: Record<IconKey, LucideIcon> = {
  satellite: Satellite,
  brain: Brain,
  camera: Camera,
  droplets: Droplets,
  sprout: Sprout,
  layers: Layers,
  wallet: Wallet,
  boxes: Boxes,
  report: FileText,
  message: MessageSquare,
  handshake: Handshake,
  flask: FlaskConical,
  map: MapIcon,
  target: Target,
  upload: Upload,
  search: Search,
  users: Users,
  chart: LineChart,
  clock: Clock,
  package: Package,
  store: Store,
  bell: Bell,
  shield: ShieldCheck,
  globe: Globe,
  offline: WifiOff,
};

/** --sh-sm from globals.css — the mockup's card shadow (Tailwind only tokens --sh / --sh-lg). */
const SH_SM = "shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]";
const CARD = `rounded-xl2 border border-line bg-panel ${SH_SM}`;

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-7 max-w-[640px] text-center">
      <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold leading-tight text-[color:var(--brand-ink)]">
        {title}
      </h2>
      {sub && <p className="mt-2 text-[16.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------- sample hero visuals
 * Static, clearly-labelled product previews. They stand in for the mockup's fake
 * screenshots; nothing here is presented as live data or a real customer.
 */

function SampleTag() {
  return (
    <span className="absolute right-3 top-3 z-10 rounded-full bg-panel/90 px-2.5 py-1 text-[11px] font-bold text-[color:var(--brand-muted)] shadow-sm">
      nümunə
    </span>
  );
}

function FieldVisual() {
  return (
    <div className="relative h-full min-h-[320px] w-full">
      <SampleTag />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(125deg,var(--ndvi-5) 0%,var(--ndvi-4) 34%,var(--ndvi-3) 58%,var(--ndvi-2) 78%,var(--ndvi-1) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute left-[16%] top-[20%] h-[42%] w-[46%] rounded-[10px] border-2 border-white/80"
        style={{ background: "rgba(255,255,255,0.10)" }}
        aria-hidden="true"
      />
      <div className="absolute left-3 top-3 rounded-xl bg-panel/95 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-muted)]">NDVI</p>
        <p className="font-display text-xl font-bold text-[color:var(--brand-ink)]">0.62</p>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-line bg-panel p-3 shadow-soft sm:left-auto sm:right-3 sm:max-w-[260px]">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--green)]">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" /> AI Aqronom
        </p>
        <p className="text-[12.5px] leading-snug text-[color:var(--brand-ink-2)]">
          Şimal-qərb zonasında nəmlik düşüb — suvarma və yerində yoxlama tövsiyə olunur.
        </p>
      </div>
    </div>
  );
}

function ProviderVisual({
  initials,
  accent,
  name,
  tags,
  meta,
  actions,
}: {
  initials: string;
  accent: string;
  name: string;
  tags: string[];
  meta: string[];
  actions: string[];
}) {
  return (
    <div className="relative h-full min-h-[320px] w-full bg-panel-2 p-5">
      <SampleTag />
      <div className="flex h-full items-center">
        <div className={`w-full ${CARD} flex gap-4 p-4`}>
          <span
            className="grid shrink-0 place-items-center rounded-[13px] text-lg font-extrabold text-white"
            style={{ background: accent, height: 52, width: 52 }}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-[color:var(--brand-ink)]">{name}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-ink-2)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] text-[color:var(--brand-muted)]">{meta.join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <span
                  key={a}
                  className={`inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold ${
                    i === 0
                      ? "bg-[color:var(--green)] text-white"
                      : "border-[1.5px] border-line-2 text-[color:var(--brand-ink-2)]"
                  }`}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsVisual() {
  const rows = [
    { score: 38, color: "var(--ndvi-1)", name: "Müştəri C · üzüm", note: "diqqət" },
    { score: 54, color: "var(--ndvi-2)", name: "Müştəri A · fındıq", note: "" },
    { score: 82, color: "var(--ndvi-5)", name: "Müştəri B · buğda", note: "" },
  ];
  return (
    <div className="relative h-full min-h-[320px] w-full bg-panel-2 p-5">
      <SampleTag />
      <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[color:var(--brand-ink-2)]">
        <Users className="h-4 w-4" aria-hidden="true" /> Müştəri sahələri · ən pis birinci
      </p>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.name} className={`${CARD} flex items-center gap-3 p-3`}>
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[12.5px] font-extrabold text-white"
              style={{ background: r.color }}
              aria-hidden="true"
            >
              {r.score}
            </span>
            <span className="flex-1 text-sm font-semibold text-[color:var(--brand-ink)]">{r.name}</span>
            {r.note && (
              <span className="rounded-full bg-[color:var(--amber-soft)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--amber)]">
                {r.note}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-[color:var(--brand-muted)]">
        Sağlamlıq balı sahənin indeks, hava və qeyd məlumatından hesablanır.
      </p>
    </div>
  );
}

function CatalogVisual() {
  const items = [
    { name: "Karbamid (N 46%)", cat: "Gübrə" },
    { name: "Fındıq üçün yarpaq gübrəsi", cat: "Gübrə" },
    { name: "Damcı suvarma dəsti", cat: "Avadanlıq" },
  ];
  return (
    <div className="relative h-full min-h-[320px] w-full bg-panel-2 p-5">
      <SampleTag />
      <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[color:var(--brand-ink-2)]">
        <Boxes className="h-4 w-4" aria-hidden="true" /> Kataloq · təchizatçı profili
      </p>
      <div className="space-y-2.5">
        {items.map((it) => (
          <div key={it.name} className={`${CARD} flex items-center gap-3 p-3`}>
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-white"
              style={{ background: "#C07A1F" }}
              aria-hidden="true"
            >
              <Package className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-semibold text-[color:var(--brand-ink)]">{it.name}</span>
            <span className="rounded-md bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-ink-2)]">
              {it.cat}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-[color:var(--brand-muted)]">
        Fermer region və kateqoriya üzrə filtrləyir, sonra birbaşa yazır.
      </p>
    </div>
  );
}

function HeroVisual({ visual, accent }: { visual: VisualKey; accent: string }) {
  if (visual === "field") return <FieldVisual />;
  if (visual === "clients") return <ClientsVisual />;
  if (visual === "catalog") return <CatalogVisual />;
  return (
    <ProviderVisual
      initials="La"
      accent={accent}
      name="Laboratoriya profili"
      tags={["Torpaq analizi", "NPK · pH", "Region: Quba, Xaçmaz"]}
      meta={["Kataloqda belə görünür", "Fermer birbaşa yazır"]}
      actions={["Müraciət et", "Profil"]}
    />
  );
}

/* ------------------------------------------------------------------- page */

export default function SolutionView({ segment }: { segment: Segment }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const badgeFree = segment.badge.tone === "free";

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* segment switcher — the mockup's .soltabs, as real links */}
      <nav aria-label="Həllər" className="mb-2 flex flex-wrap justify-center gap-2">
        {SEGMENT_LIST.map((s) => {
          const Icon = ICONS[s.tabIcon];
          const on = s.slug === segment.slug;
          return (
            <Link
              key={s.slug}
              href={`/solutions/${s.slug}`}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${
                on
                  ? "border-teal bg-teal text-white"
                  : "border-line bg-panel text-[color:var(--brand-ink-2)] hover:border-line-2"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      {/* ---------------------------------------------------------- hero */}
      <section className="grid items-center gap-8 py-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span
            className={`mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-wide ${
              badgeFree
                ? "border-[#bfe6cd] bg-mint-soft text-grass-deep"
                : "border-[#ecdcb0] bg-[#fff4d6] text-[#8a5f08]"
            }`}
          >
            {badgeFree ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sprout className="h-4 w-4" aria-hidden="true" />
            )}
            {segment.badge.text}
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
            {segment.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[clamp(28px,4vw,46px)] font-bold leading-[1.08] text-[color:var(--brand-ink)]">
            {segment.headline}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">{segment.lead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={segment.primaryCta.href}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[color:var(--green)] px-6 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
            >
              {segment.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={segment.secondaryCta.href}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-line-2 px-6 text-[15px] font-bold text-[color:var(--brand-ink)] transition-colors hover:border-[color:var(--brand-ink)]"
            >
              {segment.secondaryCta.label}
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl2 border border-line-2 bg-panel shadow-lift">
          <HeroVisual visual={segment.visual} accent={segment.accent} />
        </div>
      </section>

      {/* -------------------------------------------------- value points */}
      <section className="py-10">
        <SectionHead title={segment.valueTitle} sub={segment.valueSub} />
        <ol className="grid gap-4 lg:grid-cols-2">
          {segment.valuePoints.map((p, i) => (
            <li key={p.title} className={`${CARD} flex gap-4 p-5`}>
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-mint-soft text-sm font-extrabold text-grass-deep"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-[16.5px] font-bold text-[color:var(--brand-ink)]">{p.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------- stats band */}
      <section className="py-6">
        <div className="grid gap-3.5 lg:grid-cols-3">
          {segment.stats.map((s) => (
            <div key={s.label} className={`rounded-xl2 bg-teal p-6 text-center ${SH_SM}`}>
              <b className="block font-display text-[32px] font-bold leading-none text-white">{s.value}</b>
              <span className="mt-2 block text-[13px] leading-snug text-[#9dc6b3]">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- steps */}
      <section className="scroll-mt-24 py-10" id="nece-isleyir">
        <SectionHead title={segment.stepsTitle} sub={segment.stepsSub} />
        <div className="grid gap-4 lg:grid-cols-4">
          {segment.steps.map((s, i) => (
            <div key={s.title} className={`${CARD} p-5`}>
              <span
                className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-[color:var(--green)] font-extrabold text-white"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-[15.5px] font-bold text-[color:var(--brand-ink)]">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- features */}
      <section className="py-10">
        <SectionHead title={segment.featuresTitle} sub={segment.featuresSub} />
        <div className="grid gap-4 lg:grid-cols-3">
          {segment.features.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <div key={f.title} className={`${CARD} p-5`}>
                <span
                  className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-[color:var(--brand-ink)]">
                  {f.title}
                  {f.soon && (
                    <span className="rounded-full bg-[color:var(--amber-soft)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[color:var(--amber)]">
                      Yaxında
                    </span>
                  )}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- two-col */}
      <section className="py-10">
        <SectionHead title={segment.twoCol.title} sub={segment.twoCol.sub} />
        <div className={`grid overflow-hidden rounded-xl2 border border-line lg:grid-cols-2 ${SH_SM}`}>
          <div className="border-b border-line bg-panel-2 p-6 lg:border-b-0 lg:border-r">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              {segment.twoCol.leftTitle}
            </h3>
            <ul className="grid gap-2.5">
              {segment.twoCol.leftItems.map((it) => (
                <li key={it} className="flex gap-2.5 text-sm text-[color:var(--brand-ink-2)]">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--red-soft)] text-[color:var(--brand-red)]"
                    aria-hidden="true"
                  >
                    <X className="h-3 w-3" />
                  </span>
                  {it}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-panel p-6">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              {segment.twoCol.rightTitle}
            </h3>
            <ul className="grid gap-2.5">
              {segment.twoCol.rightItems.map((it) => (
                <li key={it} className="flex gap-2.5 text-sm text-[color:var(--brand-ink-2)]">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-soft text-grass-deep"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  {it}
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
              {segment.proof.label}
            </p>
          </div>
          <div className="p-6">
            <h2 className="font-display text-[clamp(20px,2.4vw,27px)] font-bold text-[color:var(--brand-ink)]">
              {segment.proof.title}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">{segment.proof.body}</p>
            <ol className="mt-6 space-y-4 border-l-2 border-line pl-5">
              {segment.proof.timeline.map((t) => (
                <li key={t.when} className="relative">
                  <span
                    className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-panel bg-[color:var(--green)]"
                    aria-hidden="true"
                  />
                  <p className="text-[13px] font-bold uppercase tracking-wide text-[color:var(--green)]">{t.when}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t.what}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-xl bg-panel-2 p-4 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {segment.proof.note}
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- deep dive */}
      <section className="py-10">
        <SectionHead title={segment.deepTitle} sub={segment.deepSub} />
        <div className="grid gap-4 lg:grid-cols-2">
          {segment.deep.map((d) => {
            const Icon = ICONS[d.icon];
            return (
              <div key={d.title} className={`${CARD} p-6`}>
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-[17px] font-bold text-[color:var(--brand-ink)]">{d.title}</h3>
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{d.body}</p>
                <ul className="mt-4 grid gap-2">
                  {d.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[13.5px] text-[color:var(--brand-ink-2)]">
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
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------- pricing note */}
      <section className="py-4">
        <div className="flex flex-col gap-4 rounded-xl2 border-[1.5px] border-[#bfe6cd] bg-mint-soft p-6 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel text-grass-deep" aria-hidden="true">
            <Wallet className="h-5 w-5" />
          </span>
          <p className="flex-1 text-[14.5px] leading-relaxed text-grass-deep">{segment.pricingNote}</p>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-grass-deep px-5 text-sm font-bold text-grass-deep transition-colors hover:bg-panel"
          >
            Paketlərə bax
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section className="scroll-mt-24 py-10" id="suallar">
        <SectionHead title={segment.faqTitle} />
        <div className="mx-auto max-w-[760px]">
          {segment.faq.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-a-${i}`}
                  className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-[16.5px] font-semibold text-[color:var(--brand-ink)]">{item.q}</span>
                  <Plus
                    className={`h-5 w-5 shrink-0 text-[color:var(--brand-muted)] transition-transform duration-200 motion-reduce:transition-none ${
                      open ? "rotate-45" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`faq-a-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-4 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{item.a}</p>
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
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">{segment.cta.title}</h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">{segment.cta.sub}</p>
          <Link
            href={segment.cta.href}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
          >
            {segment.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- other roles */}
      <section className="pb-4">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-muted)]">
          digər rollar
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {SEGMENT_LIST.filter((s) => s.slug !== segment.slug).map((s) => {
            const Icon = ICONS[s.tabIcon];
            return (
              <Link
                key={s.slug}
                href={`/solutions/${s.slug}`}
                className={`${CARD} flex items-center gap-3 p-4 transition-colors hover:border-line-2`}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[15px] font-bold text-[color:var(--brand-ink)]">
                    {s.label}
                  </span>
                  <span className="block text-[13px] text-[color:var(--brand-ink-2)]">{s.short}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--brand-muted)]" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
