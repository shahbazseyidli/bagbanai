"use client";

// W2 / E12 — the static marketing sections of the approved landing redesign (artifact c5e155e7):
// role cards → stats → module tour → why-us + comparison → testimonials.
// Copy is Azerbaijani; user-visible strings are extracted into the i18n dictionary (mkt.sections.*)
// and resolved via t() at render time (client component). Code/identifiers stay English.
// NOTE: the data arrays (ROLES/STATS/CMP/TESTIS/CHIPS) live INSIDE their components on purpose —
// t() must run at render (after LocaleProvider sets the locale), not at module load.
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  FlaskConical,
  Layers,
  Package,
  Sparkles,
  Sprout,
  TriangleAlert,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n";

/* ------------------------------------------------------------------ shared */

export function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-[660px] text-center">
      {eyebrow && <p className="lp-eyebrow">{eyebrow}</p>}
      <h2 className="lp-ink mt-3 font-display text-[clamp(26px,3.6vw,40px)] font-bold leading-[1.1] tracking-[-0.022em]">
        {title}
      </h2>
      {sub && <p className="lp-ink2 mt-3 text-[17px]">{sub}</p>}
    </div>
  );
}

function Tick() {
  return (
    <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-soft text-grass-deep">
      <Check className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

/* -------------------------------------------------------------- role cards */

export function RoleCards() {
  const ROLES = [
    {
      href: "/solutions/fermer",
      title: t("mkt.sections.roleFermerTitle"),
      body: t("mkt.sections.roleFermerBody"),
      cta: t("mkt.sections.roleFermerCta"),
      gradient: "linear-gradient(165deg,#3c6b45,#1c3d27)",
      Icon: Sprout,
    },
    {
      href: "/solutions/laboratoriya",
      title: t("mkt.sections.roleLabTitle"),
      body: t("mkt.sections.roleLabBody"),
      cta: t("mkt.sections.roleLabCta"),
      gradient: "linear-gradient(165deg,#2f6ca8,#123a5e)",
      Icon: FlaskConical,
    },
    {
      href: "/solutions/konsultant",
      title: t("mkt.sections.roleAgroTitle"),
      body: t("mkt.sections.roleAgroBody"),
      cta: t("mkt.sections.roleAgroCta"),
      gradient: "linear-gradient(165deg,#7a5bd0,#3a2668)",
      Icon: Users,
    },
    {
      href: "/solutions/techizatci",
      title: t("mkt.sections.roleSupplierTitle"),
      body: t("mkt.sections.roleSupplierBody"),
      cta: t("mkt.sections.roleSupplierCta"),
      gradient: "linear-gradient(165deg,#c07a1f,#5e360f)",
      Icon: Package,
    },
  ];

  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead
        eyebrow={t("mkt.sections.rolesEyebrow")}
        title={t("mkt.sections.rolesTitle")}
        sub={t("mkt.sections.rolesSub")}
      />
      <div className="grid gap-4 min-[920px]:grid-cols-4">
        {ROLES.map(({ href, title, body, cta, gradient, Icon }) => (
          <Link
            key={href}
            href={href}
            className="lp-role relative flex min-h-[230px] flex-col justify-end overflow-hidden rounded-xl2 p-6 text-white"
            style={{ backgroundImage: gradient }}
          >
            <span className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="font-display text-[19px] font-semibold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-snug text-white/85">{body}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
              {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
      <p className="lp-muted mt-4 text-center text-[13px]">
        {t("mkt.sections.rolesFreePre")} <b className="text-grass">{t("mkt.sections.rolesFreeWord")}</b>{" "}
        {t("mkt.sections.rolesFreePost")}
      </p>
    </Wrap>
  );
}

/* ------------------------------------------------------------------ stats */

export function StatsStrip() {
  const STATS = [
    { n: "2", l: t("mkt.sections.statSatellites") },
    { n: "10m", l: t("mkt.sections.statResolution") },
    { n: "9", l: t("mkt.sections.statIndices") },
    { n: "4", l: t("mkt.sections.statRolesLangs") },
    { n: t("mkt.sections.statRefreshDays"), l: t("mkt.sections.statRefresh") },
  ];

  return (
    <Wrap>
      <div className="grid gap-4 rounded-xl2 bg-teal px-6 py-8 text-center shadow-soft min-[920px]:grid-cols-5">
        {STATS.map((s) => (
          <div key={s.l}>
            <b className="block font-display text-[30px] font-bold text-white">{s.n}</b>
            <span className="text-[12.5px] text-[#9dc6b3]">{s.l}</span>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* ------------------------------------------------------------ module tour */

function ModText({
  eyebrow,
  title,
  lead,
  points,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  points: string[];
}) {
  return (
    <div>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h3 className="lp-ink mt-2.5 font-display text-[clamp(22px,2.6vw,30px)] font-bold leading-[1.12] tracking-[-0.022em]">
        {title}
      </h3>
      <p className="lp-ink2 mt-3 text-[16.5px]">{lead}</p>
      <ul className="mt-4 grid gap-2.5">
        {points.map((p) => (
          <li key={p} className="lp-ink2 flex items-start gap-2.5 text-[14.5px]">
            <Tick />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Shot({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp-card overflow-hidden">
      <div className="lp-ink2 flex h-[38px] items-center gap-2 border-b border-line bg-panel-2 px-4 text-[12.5px] font-semibold">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ModRow({ reverse, text, shot }: { reverse?: boolean; text: React.ReactNode; shot: React.ReactNode }) {
  return (
    <div className="grid items-center gap-8 py-8 min-[920px]:grid-cols-2 min-[920px]:gap-11">
      <div className={reverse ? "min-[920px]:order-2" : ""}>{text}</div>
      <div className={reverse ? "min-[920px]:order-1" : ""}>{shot}</div>
    </div>
  );
}

export function ModuleRows() {
  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead eyebrow={t("mkt.sections.modulesEyebrow")} title={t("mkt.sections.modulesTitle")} />

      {/* 1 — satellite monitoring */}
      <ModRow
        text={
          <ModText
            eyebrow={t("mkt.sections.mod1Eyebrow")}
            title={t("mkt.sections.mod1Title")}
            lead={t("mkt.sections.mod1Lead")}
            points={[
              "NASA HLS 30m + Sentinel-2 10m",
              t("mkt.sections.mod1Point2"),
              t("mkt.sections.mod1Point3"),
            ]}
          />
        }
        shot={
          <Shot title="Sentinel-2 · NDVI trend">
            <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-[120px] w-full" role="img" aria-label={t("mkt.sections.mod1ChartAria")}>
              <defs>
                <linearGradient id="lpSpark1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#8DE0A9" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#8DE0A9" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 C40,60 60,50 90,52 C130,55 150,40 190,44 C230,48 250,70 290,78 L320,82 L320,120 L0,120Z"
                fill="url(#lpSpark1)"
              />
              <path
                d="M0,80 C40,60 60,50 90,52 C130,55 150,40 190,44 C230,48 250,70 290,78 L320,82"
                stroke="#1E9852"
                strokeWidth="2.4"
                fill="none"
              />
            </svg>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
              <span className="lp-pill lp-pill-warn">{t("mkt.sections.mod1PillTrend")}</span>
              <span className="lp-muted ml-auto text-[13px]">{t("mkt.sections.mod1LatestValue")}</span>
            </div>
          </Shot>
        }
      />

      {/* 2 — AI agronomist */}
      <ModRow
        reverse
        text={
          <ModText
            eyebrow={t("mkt.sections.mod2Eyebrow")}
            title={t("mkt.sections.mod2Title")}
            lead={t("mkt.sections.mod2Lead")}
            points={[
              t("mkt.sections.mod2Point1"),
              t("mkt.sections.mod2Point2"),
              t("mkt.sections.mod2Point3"),
            ]}
          />
        }
        shot={
          <Shot title={t("mkt.sections.mod2ShotTitle")}>
            <div className="lp-verdict mb-3">
              <span className="lp-verdict-ico">
                <TriangleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h4 className="lp-ink font-display text-[15.5px] font-semibold">
                  {t("mkt.sections.mod2Verdict")}
                </h4>
                <p className="lp-ink2 mt-1 text-[13px]">
                  {t("mkt.sections.mod2VerdictDetail")}
                </p>
              </div>
            </div>
            <div className="lp-peer">
              <span className="flex shrink-0">
                <span className="lp-peer-av" style={{ background: "#3c6b45" }}>A</span>
                <span className="lp-peer-av -ml-2" style={{ background: "#c07a1f" }}>R</span>
                <span className="lp-peer-av -ml-2" style={{ background: "#2f6ca8" }}>E</span>
              </span>
              <p className="text-[12.5px] text-[#1c5c39]">
                <b className="text-grass-deep">{t("mkt.sections.aiPeerBold")}</b>{" "}
                {t("mkt.sections.aiPeerRest")}
              </p>
            </div>
            <p className="lp-muted mt-2 flex items-center gap-1.5 text-[11.5px]">
              <Camera className="h-3.5 w-3.5" aria-hidden="true" /> {t("mkt.sections.mod2SampleNote")}
            </p>
          </Shot>
        }
      />

      {/* 3 — farm ledger */}
      <ModRow
        text={
          <ModText
            eyebrow={t("mkt.sections.mod3Eyebrow")}
            title={t("mkt.sections.mod3Title")}
            lead={t("mkt.sections.mod3Lead")}
            points={[
              t("mkt.sections.mod3Point1"),
              t("mkt.sections.mod3Point2"),
              t("mkt.sections.mod3Point3"),
            ]}
          />
        }
        shot={
          <Shot title={t("mkt.sections.mod3ShotTitle")}>
            <div className="lp-callout mb-3">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {t("mkt.sections.fertCalloutPre")} <b>{t("mkt.sections.fertCalloutBold")}</b>{t("mkt.sections.fertCalloutPost")}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-line p-3.5">
                <span className="lp-muted text-[12px]">{t("mkt.sections.mod3ProfitLabel")}</span>
                <b className="mt-1 block font-display text-[22px] font-bold tabular-nums text-grass">
                  580 ₼
                </b>
              </div>
              <div className="rounded-[14px] border border-line p-3.5">
                <span className="lp-muted text-[12px]">{t("mkt.sections.mod3NextFertLabel")}</span>
                <b className="lp-ink mt-1 block font-display text-[15px] font-semibold">28 iyul</b>
              </div>
            </div>
          </Shot>
        }
      />

      {/* 4 — marketplace + community */}
      <ModRow
        reverse
        text={
          <ModText
            eyebrow={t("mkt.sections.mod4Eyebrow")}
            title={t("mkt.sections.mod4Title")}
            lead={t("mkt.sections.mod4Lead")}
            points={[
              t("mkt.sections.mod4Point1"),
              t("mkt.sections.mod4Point2"),
              t("mkt.sections.mod4Point3"),
            ]}
          />
        }
        shot={
          <Shot title={t("mkt.sections.mod4ShotTitle")}>
            <div className="flex gap-3.5">
              <span className="lp-logo" style={{ background: "#2f6ca8" }}>AT</span>
              <div>
                <h4 className="lp-ink flex items-center gap-2 font-display text-[16px] font-semibold">
                  AqroTest Laboratoriya <span className="text-[13px] text-[#e0a83b]">★ 4.8</span>
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="lp-tag">{t("mkt.sections.tagSoilTest")}</span>
                  <span className="lp-tag">Xaçmaz</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3.5">
              <span className="lp-logo" style={{ background: "#c07a1f" }}>GM</span>
              <div>
                <h4 className="lp-ink flex items-center gap-2 font-display text-[16px] font-semibold">
                  GübrəMarket <span className="text-[13px] text-[#e0a83b]">★ 4.6</span>
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="lp-tag">{t("mkt.sections.tagFertilizer")}</span>
                  <span className="lp-tag">{t("mkt.sections.tagSeed")}</span>
                  <span className="lp-tag">Quba</span>
                </div>
              </div>
            </div>
            <Link
              href="/catalog"
              className="lp-link mt-4 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold"
            >
              {t("mkt.sections.mod4CatalogLink")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Shot>
        }
      />
    </Wrap>
  );
}

/* ----------------------------------------------------------------- why us */

function CmpCell({ v }: { v: string }) {
  // v is an enum CODE ("var"/"yox"/"məhdud"/"qismən"); the code stays, only the display is localized.
  if (v === "var")
    return (
      <span className="inline-flex items-center gap-1 font-bold text-grass">
        <Check className="h-4 w-4" aria-hidden="true" /> {t("mkt.sections.cmpYes")}
      </span>
    );
  const label =
    v === "yox" ? t("mkt.sections.cmpNo")
    : v === "məhdud" ? t("mkt.sections.cmpLimited")
    : v === "qismən" ? t("mkt.sections.cmpPartial")
    : v;
  return <span className="lp-muted">{label}</span>;
}

export function WhyUs() {
  // The 2nd–4th tuple values ("yox"/"var"/"məhdud"/"qismən") are ENUM CODES; CmpCell compares the
  // code (v === "var") and localizes the DISPLAY, so the codes stay in the data unchanged.
  const CMP: Array<[string, string, string, string]> = [
    [t("mkt.sections.cmpRow1"), "yox", "yox", "var"],
    [t("mkt.sections.cmpRow2"), "məhdud", "yox", "var"],
    [t("mkt.sections.cmpRow3"), "yox", "var", "var"],
    [t("mkt.sections.cmpRow4"), "qismən", "yox", "var"],
  ];

  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead
        eyebrow={t("mkt.sections.whyEyebrow")}
        title={t("mkt.sections.whyTitle")}
        sub={t("mkt.sections.whySub")}
      />
      <div className="grid gap-4 min-[920px]:grid-cols-3">
        <div className="lp-card p-6">
          <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f1fb] text-[#215a95]">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="lp-ink font-display text-[17px] font-semibold">{t("mkt.sections.whyCard1Title")}</h4>
          <p className="lp-ink2 mt-1.5 text-[13.5px]">
            {t("mkt.sections.whyCard1Body")}
          </p>
        </div>
        <div className="lp-card p-6">
          <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--amber-soft)] text-[#8a5f08]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="lp-ink font-display text-[17px] font-semibold">{t("mkt.sections.whyCard2Title")}</h4>
          <p className="lp-ink2 mt-1.5 text-[13.5px]">
            {t("mkt.sections.whyCard2Body")}
          </p>
        </div>
        <div className="lp-card lp-card-hl p-6">
          <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-grass text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="lp-ink font-display text-[17px] font-semibold">{t("mkt.sections.whyCard3Title")}</h4>
          <p className="lp-ink2 mt-1.5 text-[13.5px]">
            {t("mkt.sections.whyCard3Body")}
          </p>
        </div>
      </div>

      <div className="lp-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="lp-ink2 border-b border-line bg-panel-2 px-4 py-3 text-left text-[13px] font-semibold">
                  {t("mkt.sections.cmpColFeature")}
                </th>
                <th className="lp-ink2 border-b border-line bg-panel-2 px-4 py-3 text-center text-[13px] font-semibold">
                  OneSoil
                </th>
                <th className="lp-ink2 border-b border-line bg-panel-2 px-4 py-3 text-center text-[13px] font-semibold">
                  Farmbrite
                </th>
                <th className="border-b border-line bg-panel-2 px-4 py-3 text-center text-[13px] font-semibold text-grass">
                  Bağban AI
                </th>
              </tr>
            </thead>
            <tbody>
              {CMP.map(([feature, a, b, c]) => (
                <tr key={feature}>
                  <td className="lp-ink2 border-b border-line px-4 py-3">{feature}</td>
                  <td className="border-b border-line px-4 py-3 text-center">
                    <CmpCell v={a} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-center">
                    <CmpCell v={b} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-center">
                    <CmpCell v={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="lp-muted mt-3 text-center text-[12px]">
        {t("mkt.sections.cmpFootnote")}
      </p>
    </Wrap>
  );
}

/* ----------------------------------------------------------- testimonials */

export function Testimonials() {
  const TESTIS = [
    {
      q: t("mkt.sections.testi1Quote"),
      n: "Nail Q.",
      r: t("mkt.sections.testi1Role"),
    },
    {
      q: t("mkt.sections.testi2Quote"),
      n: "Ramil H.",
      r: t("mkt.sections.testi2Role"),
    },
    {
      q: t("mkt.sections.testi3Quote"),
      n: "Gülnar Ə.",
      r: t("mkt.sections.testi3Role"),
    },
  ];

  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead title={t("mkt.sections.testiTitle")} />
      <div className="grid gap-4 min-[920px]:grid-cols-3">
        {TESTIS.map((t2) => (
          <div key={t2.n} className="lp-card p-6">
            <p className="lp-ink text-[15px] leading-[1.55]">“{t2.q}”</p>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="lp-avatar">{t2.n.slice(0, 1)}</span>
              <div>
                <div className="lp-ink text-[14px] font-semibold">{t2.n}</div>
                <div className="lp-muted text-[12px]">{t2.r}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="lp-muted mt-4 text-center text-[12px]">
        {t("mkt.sections.testiFootnote")}
      </p>
    </Wrap>
  );
}

/* --------------------------------------------------------------- marquee */

export function Marquee() {
  const CHIPS = [
    { e: "🛰️", b: t("mkt.sections.chipSat"), t: "NASA + Sentinel-2" },
    { e: "🌰", b: "", t: t("mkt.sections.chipCalib") },
    { e: "🧪", b: t("mkt.sections.chipLabs"), t: "" },
    { e: "👨‍🌾", b: "", t: t("mkt.sections.chipCommunity") },
    { e: "📊", b: "", t: t("mkt.sections.chipLedger") },
    { e: "🤖", b: "", t: t("mkt.sections.chipAi") },
    { e: "🌍", b: t("mkt.sections.chip4lang"), t: "" },
    { e: "📦", b: "", t: t("mkt.sections.chipSupplier") },
  ];

  const row = [...CHIPS, ...CHIPS];
  return (
    <div className="lp-mask overflow-hidden py-4" aria-hidden="true">
      <div className="lp-track flex w-max gap-3.5">
        {row.map((c, i) => (
          <span key={`${c.e}-${i}`} className="lp-mq">
            <span>{c.e}</span>
            {c.b && <b className="text-grass">{c.b}</b>}
            {c.t}
          </span>
        ))}
      </div>
    </div>
  );
}
