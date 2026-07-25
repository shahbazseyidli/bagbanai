import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, CloudSun, Database, Fingerprint, Globe, HardDrive, Info, KeyRound,
  Lock, Satellite, Server, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getT } from "@/lib/i18n-server";

// C10 — /status: a plain description of uptime intent, data sources and security posture. Server
// Component so it ships its own metadata; copy is localized via getT() (request-locale aware).
//
// Honesty rules: this is a DESCRIPTIVE page, not a live monitor. It claims no uptime percentage,
// no certification (ISO/SOC2) and no measured number we cannot back. The "uptime intent" section
// states an aim, not an SLA, and the closing note is explicit about what we do NOT promise.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("mkt.status.metaTitle"),
    description: t("mkt.status.metaDescription"),
    alternates: { canonical: "/status" },
  };
}

export default async function StatusPage() {
  const t = await getT();

  const SOURCES: { icon: LucideIcon; title: string; body: string }[] = [
    {
      icon: Satellite,
      title: "NASA HLS (Harmonized Landsat–Sentinel)",
      body: t("mkt.status.src1Body"),
    },
    {
      icon: Satellite,
      title: "Sentinel-2 (Copernicus)",
      body: t("mkt.status.src2Body"),
    },
    {
      icon: CloudSun,
      title: "Open-Meteo",
      body: t("mkt.status.src3Body"),
    },
  ];

  const SECURITY: { icon: LucideIcon; title: string; body: string }[] = [
    {
      icon: KeyRound,
      title: t("mkt.status.sec1Title"),
      body: t("mkt.status.sec1Body"),
    },
    {
      icon: Fingerprint,
      title: t("mkt.status.sec2Title"),
      body: t("mkt.status.sec2Body"),
    },
    {
      icon: Database,
      title: t("mkt.status.sec3Title"),
      body: t("mkt.status.sec3Body"),
    },
    {
      icon: Lock,
      title: t("mkt.status.sec4Title"),
      body: t("mkt.status.sec4Body"),
    },
    {
      icon: ShieldCheck,
      title: t("mkt.status.sec5Title"),
      body: t("mkt.status.sec5Body"),
    },
    {
      icon: HardDrive,
      title: t("mkt.status.sec6Title"),
      body: t("mkt.status.sec6Body"),
    },
  ];

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ---------------------------------------------------------- head */}
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          {t("mkt.status.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          {t("mkt.status.h1")}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
          {t("mkt.status.intro")}
        </p>
      </header>

      <div className="mx-auto max-w-[760px] space-y-8">
        {/* --------------------------------------------- uptime intent */}
        <section className="rounded-xl2 border border-line bg-panel p-6 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]">
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-[color:var(--brand-ink)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep" aria-hidden="true">
              <Activity className="h-5 w-5" />
            </span>
            {t("mkt.status.uptimeTitle")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
            {t("mkt.status.uptimeP1")}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
            {t("mkt.status.uptimeP2")}
          </p>
        </section>

        {/* ------------------------------------------------ data sources */}
        <section>
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-[color:var(--brand-ink)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep" aria-hidden="true">
              <Globe className="h-5 w-5" />
            </span>
            {t("mkt.status.dataSourcesTitle")}
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
            {t("mkt.status.dataSourcesIntro")}
          </p>
          <div className="mt-4 grid gap-3">
            {SOURCES.map((s) => (
              <div
                key={s.title}
                className="flex gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel-2 text-teal" aria-hidden="true">
                  <s.icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">{s.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--brand-muted)]">
            {t("mkt.status.aiNote")}
          </p>
        </section>

        {/* --------------------------------------------------- security */}
        <section>
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-[color:var(--brand-ink)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep" aria-hidden="true">
              <ShieldCheck className="h-5 w-5" />
            </span>
            {t("mkt.status.securityTitle")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-panel-2 text-teal" aria-hidden="true">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-display text-[15.5px] font-bold text-[color:var(--brand-ink)]">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------- what we don't claim */}
        <section className="rounded-xl2 border-[1.5px] border-[#ecdcb0] bg-[#fff8ea] p-6">
          <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold text-[#8a5f08]">
            <Info className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t("mkt.status.dontClaimTitle")}
          </h2>
          <ul className="mt-3 grid gap-2.5">
            {[
              t("mkt.status.dontClaim1"),
              t("mkt.status.dontClaim2"),
              t("mkt.status.dontClaim3"),
            ].map((item) => (
              <li key={item} className="flex gap-2.5 text-[14px] leading-relaxed text-[#7a5407]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c98a12]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------- infra note */}
        <section className="flex gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel-2 text-teal" aria-hidden="true">
            <Server className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">{t("mkt.status.infraTitle")}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {t("mkt.status.infraBody")}
            </p>
          </div>
        </section>
      </div>

      {/* ----------------------------------------------------------- cta */}
      <section className="mx-auto max-w-[760px] pt-11">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            {t("mkt.status.ctaTitle")}
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            {t("mkt.status.ctaSub")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/guide"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
            >
              {t("mkt.status.ctaGuide")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-white/30 px-7 text-[15px] font-bold text-white transition-colors hover:border-white"
            >
              {t("mkt.status.ctaSignup")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
