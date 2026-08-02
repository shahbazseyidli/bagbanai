import Link from "next/link";
import { Compass } from "lucide-react";
import { getT } from "@/lib/i18n-server";

// Branded, localized 404. Before this file existed every miss rendered Next's default error page —
// unstyled, English-only, no navigation — while inheriting the site title, so it looked like a
// broken product page. The HTTP status stays a real 404 (Next sets it), which is what keeps these
// URLs out of the index; no robots meta is needed or possible here.
export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-xl space-y-5 py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint-soft text-grass-deep">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-bold text-ink">{t("mkt.notFound.title")}</h1>
      <p className="text-[15px] leading-relaxed text-ink-soft">{t("mkt.notFound.body")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full bg-grass px-5 text-sm font-bold text-white hover:bg-grass-deep"
        >
          {t("mkt.notFound.cta")}
        </Link>
        <Link
          href="/guide"
          className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-teal hover:text-teal"
        >
          {t("mkt.footer.linkGuide")}
        </Link>
        <Link
          href="/demo"
          className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-teal hover:text-teal"
        >
          {t("mkt.footer.linkDemo")}
        </Link>
      </div>
    </div>
  );
}
