import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Boxes, Brain, Camera, CloudSun, Droplets, FileText, Globe, Handshake,
  Layers, MapPin, Satellite, Snowflake, Sprout, Volume2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getT } from "@/lib/i18n-server";

// C10 — /whats-new: a public changelog of the major capabilities that now exist. Server Component
// (async, translated via getT()) so it ships its own metadata.
//
// Honesty rules: entries are framed as "əlavə edildi" and grouped into COARSE periods (season-
// level, not fake day precision) — the transparency note at the top says the dates are approximate.
// Every entry maps to a capability the product actually ships today; nothing forward-looking is
// listed as done.

type Entry = { icon: IconKey; title: string; body: string };
type IconKey =
  | "satellite" | "map-pin" | "clipboard" | "brain" | "camera" | "droplets" | "cloud" | "snow"
  | "sprout" | "wallet" | "boxes" | "report" | "handshake" | "layers" | "globe" | "offline" | "bell";

const ICONS: Record<IconKey, LucideIcon> = {
  satellite: Satellite,
  "map-pin": MapPin,
  clipboard: FileText,
  brain: Brain,
  camera: Camera,
  droplets: Droplets,
  cloud: CloudSun,
  snow: Snowflake,
  sprout: Sprout,
  wallet: Wallet,
  boxes: Boxes,
  report: FileText,
  handshake: Handshake,
  layers: Layers,
  globe: Globe,
  offline: Volume2,
  bell: Bell,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("mkt.news.metaTitle"),
    description: t("mkt.news.metaDescription"),
    alternates: { canonical: "/whats-new" },
  };
}

export default async function ChangelogPage() {
  const t = await getT();

  const CHANGELOG: { period: string; entries: Entry[] }[] = [
    {
      period: t("mkt.news.periodSummer"),
      entries: [
        {
          icon: "handshake",
          title: t("mkt.news.marketplaceTitle"),
          body: t("mkt.news.marketplaceBody"),
        },
        {
          icon: "layers",
          title: t("mkt.news.yieldZonesTitle"),
          body: t("mkt.news.yieldZonesBody"),
        },
        {
          icon: "report",
          title: t("mkt.news.reportsTitle"),
          body: t("mkt.news.reportsBody"),
        },
        {
          icon: "wallet",
          title: t("mkt.news.farmLedgerTitle"),
          body: t("mkt.news.farmLedgerBody"),
        },
        {
          icon: "globe",
          title: t("mkt.news.multilangTitle"),
          body: t("mkt.news.multilangBody"),
        },
        {
          icon: "camera",
          title: t("mkt.news.soilOcrTitle"),
          body: t("mkt.news.soilOcrBody"),
        },
      ],
    },
    {
      period: t("mkt.news.periodSpring"),
      entries: [
        {
          icon: "brain",
          title: t("mkt.news.aiAdviceTitle"),
          body: t("mkt.news.aiAdviceBody"),
        },
        {
          icon: "camera",
          title: t("mkt.news.photoDiagnosisTitle"),
          body: t("mkt.news.photoDiagnosisBody"),
        },
        {
          icon: "droplets",
          title: t("mkt.news.waterBalanceTitle"),
          body: t("mkt.news.waterBalanceBody"),
        },
        {
          icon: "snow",
          title: t("mkt.news.weatherAlertsTitle"),
          body: t("mkt.news.weatherAlertsBody"),
        },
        {
          icon: "sprout",
          title: t("mkt.news.fertilizerTitle"),
          body: t("mkt.news.fertilizerBody"),
        },
        {
          icon: "offline",
          title: t("mkt.news.offlineTitle"),
          body: t("mkt.news.offlineBody"),
        },
      ],
    },
    {
      period: t("mkt.news.periodInitial"),
      entries: [
        {
          icon: "satellite",
          title: t("mkt.news.satelliteTitle"),
          body: t("mkt.news.satelliteBody"),
        },
        {
          icon: "map-pin",
          title: t("mkt.news.fieldRegTitle"),
          body: t("mkt.news.fieldRegBody"),
        },
        {
          icon: "clipboard",
          title: t("mkt.news.taskLogTitle"),
          body: t("mkt.news.taskLogBody"),
        },
      ],
    },
  ];

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ---------------------------------------------------------- head */}
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          {t("mkt.news.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          {t("mkt.news.h1")}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
          {t("mkt.news.intro")}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--brand-muted)]">
          {t("mkt.news.dateNote")}
        </p>
      </header>

      {/* ------------------------------------------------------ timeline */}
      <div className="mx-auto max-w-[760px] space-y-10">
        {CHANGELOG.map((group) => (
          <section key={group.period}>
            <h2 className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-1.5 font-display text-[15px] font-bold text-[color:var(--brand-ink)]">
              {group.period}
            </h2>
            <ul className="space-y-3">
              {group.entries.map((e) => {
                const Icon = ICONS[e.icon] ?? Satellite;
                return (
                  <li
                    key={e.title}
                    className="flex gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                      aria-hidden="true"
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[17px] font-bold text-[color:var(--brand-ink)]">
                          {e.title}
                        </h3>
                        <span className="rounded-full border border-[#bfe6cd] bg-mint-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-grass-deep">
                          {t("mkt.news.addedBadge")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
                        {e.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* ----------------------------------------------------------- cta */}
      <section className="mx-auto max-w-[760px] pt-11">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            {t("mkt.news.ctaTitle")}
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            {t("mkt.news.ctaSubtitle")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
            >
              {t("mkt.news.ctaPrimary")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/guide"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-white/30 px-7 text-[15px] font-bold text-white transition-colors hover:border-white"
            >
              {t("mkt.news.ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
