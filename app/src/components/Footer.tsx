// B-legal — slim marketing footer for the standalone public pages that have none of their own.
//
// SERVER COMPONENT (async, getT). Do NOT import it from a client component: it would be treated as
// a client module, getT()'s headers() call would fail the build, and the whole reason it exists —
// correct language in the server HTML, for crawlers and for JS-off readers — would be gone.
//
// This is NOT the landing page's footer. That one is components/landing/LandingFooter.tsx, a client
// component with the closing CTA, rendered only by PublicLanding. This one is deliberately smaller:
// no CTA, just orientation and the legal links. The two are separate on purpose; LandingFooter's
// .lp-flink class is defined inside PublicLanding's own <style> block and is not available here,
// hence the explicit link classes below.
import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import type { I18nKey } from "@/lib/i18n";

const FLINK = "block min-h-8 py-1.5 text-[#a9cdbc] transition-colors hover:text-white";

const PRODUCT: Array<[string, I18nKey]> = [
  ["/pricing", "mkt.footer.linkPricing"],
  ["/how-it-works", "mkt.footer.linkHow"],
  ["/guide", "mkt.footer.linkGuide"],
];

const ACCOUNT: Array<[string, I18nKey]> = [
  ["/signup", "mkt.footer.linkSignup"],
  ["/login", "mkt.footer.linkLogin"],
];

const LEGAL: Array<[string, I18nKey]> = [
  ["/privacy", "mkt.footer.linkPrivacy"],
  ["/terms", "mkt.footer.linkTerms"],
];

export default async function Footer() {
  const t = await getT();
  return (
    // -mx-4 escapes the padding of the page wrapper that renders it, so the teal bar reaches both
    // edges the way LandingFooter does.
    <footer className="-mx-4 mt-14 bg-teal text-[#cfe3d8]">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-9 pt-10 sm:px-6">
        <div className="grid gap-6 text-[13.5px] min-[920px]:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
              <img src="/brand/agradex-logo-dark.svg" alt="Agradex" className="h-8 w-auto" />
            </div>
            <p className="max-w-[320px] text-[13px] text-[#9cc3b1]">{t("mkt.footer.tagline")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              {t("mkt.footer.colProduct")}
            </h2>
            {PRODUCT.map(([href, labelKey]) => (
              <Link key={href} href={href} className={FLINK}>
                {t(labelKey)}
              </Link>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              {t("mkt.footer.colAccount")}
            </h2>
            {ACCOUNT.map(([href, labelKey]) => (
              <Link key={href} href={href} className={FLINK}>
                {t(labelKey)}
              </Link>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              {t("mkt.footer.colLegal")}
            </h2>
            {LEGAL.map(([href, labelKey]) => (
              <Link key={href} href={href} className={FLINK}>
                {t(labelKey)}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-8 border-t border-white/10 pt-5 text-[12px] text-[#7fae98]">
          © {new Date().getFullYear()} Agradex · agradex.com
        </p>
      </div>
    </footer>
  );
}
