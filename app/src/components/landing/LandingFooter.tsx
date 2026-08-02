"use client";

// W2 / E12 — closing CTA + footer of the approved landing redesign. Only routes that actually
// exist AND are public are linked (no 404s, no login walls): /signup, /login, /pricing, /privacy,
// /terms, the four /solutions/* pages, /guide and the in-page anchors.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { t, type I18nKey } from "@/lib/i18n";
import { AUTHOR } from "@/lib/author";

const SOLUTIONS: Array<[string, I18nKey]> = [
  ["/solutions/farmer", "mkt.footer.solutionFermer"],
  ["/solutions/lab", "mkt.footer.solutionLaboratoriya"],
  ["/solutions/consultant", "mkt.footer.solutionKonsultant"],
  ["/solutions/supplier", "mkt.footer.solutionTechizatci"],
];

export default function LandingFooter() {
  return (
    <footer className="mt-14 bg-teal text-[#cfe3d8]">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-9 pt-12 sm:px-6">
        {/* closing CTA */}
        <div className="border-b border-white/10 pb-9 text-center">
          <h2 className="font-display text-[clamp(24px,3.4vw,30px)] font-bold text-white">
            {t("mkt.footer.ctaHeading")}
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14.5px] text-[#a9cdbc]">
            {t("mkt.footer.ctaSubtitle")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="lp-btn lp-btn-white">
              {t("mkt.footer.ctaSignup")} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/login" className="lp-btn lp-btn-teal-ghost">
              {t("mkt.footer.ctaLogin")}
            </Link>
          </div>
        </div>

        {/* link grid */}
        <div className="grid gap-6 pt-8 text-[13.5px] min-[920px]:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
              <img src="/brand/agradex-logo-dark.svg" alt="Agradex" className="h-8 w-auto" />
            </div>
            <p className="text-[13px] text-[#9cc3b1]">
              {t("mkt.footer.tagline")}
            </p>
            <p className="mt-3 text-[12px] text-[#7fae98]">
              {t("mkt.footer.dataSources")}
            </p>
            {/* E-E-A-T: a human behind the product, wired to the same identity the Article JSON-LD
                and bylines carry — one name everywhere, or the signal is noise. */}
            <p className="mt-3 text-[12px] text-[#7fae98]">
              {t("mkt.footer.whoBuilt")}{" "}
              <a
                href={AUTHOR.url}
                rel="author noopener"
                target="_blank"
                className="underline decoration-dotted underline-offset-2 hover:text-white"
              >
                {AUTHOR.name}
              </a>
            </p>
          </div>

          <div>
            <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              {t("mkt.footer.colProduct")}
            </h5>
            <a href="#features" className="lp-flink">{t("mkt.footer.linkImkanlar")}</a>
            <a href="#live-demo" className="lp-flink">{t("mkt.footer.linkDemo")}</a>
            <Link href="/pricing" className="lp-flink">{t("mkt.footer.linkPricing")}</Link>
            <Link href="/how-it-works" className="lp-flink">{t("mkt.footer.linkHow")}</Link>
            <Link href="/guide" className="lp-flink">{t("mkt.footer.linkGuide")}</Link>
            <Link href="/blog" className="lp-flink">{t("mkt.footer.linkBlog")}</Link>
          </div>

          <div>
            <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              {t("mkt.footer.colSolutions")}
            </h5>
            {SOLUTIONS.map(([href, labelKey]) => (
              <Link key={href} href={href} className="lp-flink">
                {t(labelKey)}
              </Link>
            ))}
          </div>

          <div>
            <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              {t("mkt.footer.colAccount")}
            </h5>
            <Link href="/signup" className="lp-flink">{t("mkt.footer.linkSignup")}</Link>
            <Link href="/login" className="lp-flink">{t("mkt.footer.linkLogin")}</Link>
            {/* /catalog was here — an app-host route: the link marched every marketing visitor
                (and crawler) into the login wall, and robots.txt disallows it anyway. */}
            <Link href="/privacy" className="lp-flink">{t("mkt.footer.linkPrivacy")}</Link>
            <Link href="/terms" className="lp-flink">{t("mkt.footer.linkTerms")}</Link>
          </div>
        </div>

        <p className="mt-8 border-t border-white/10 pt-5 text-[12px] text-[#7fae98]">
          © {new Date().getFullYear()} Agradex · agradex.com
        </p>
      </div>
    </footer>
  );
}
