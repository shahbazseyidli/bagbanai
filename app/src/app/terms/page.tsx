import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { getT, getServerLocale } from "@/lib/i18n-server";
// One cross-folder import, on purpose: this wave owns the two route folders and nothing shared, and
// duplicating the renderer plus sixteen documents would be far worse. `app/privacy/legal/` holds no
// page.tsx or route.ts, so it is a plain module folder and creates no /privacy/legal route. If a
// shared app/src/components/legal/ is ever authorised, move the folder as-is and change this line.
import { LegalArticle, getTermsDoc, TERMS_IDS } from "../privacy/legal";
import type { TermsId } from "../privacy/legal";

// B-legal — /terms. Server Component for the same reason as /privacy: the document is chosen by the
// request's locale, so it must not be prerendered as Azerbaijani.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // No `alternates` — the root layout owns the canonical + hreflang set. See /privacy/page.tsx.
  return { title: t("mkt.meta.termsTitle"), description: t("mkt.meta.termsDesc") };
}

export default async function TermsPage() {
  const locale = await getServerLocale();
  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 md:-mb-6">
      {/* Explicit type argument — see /privacy/page.tsx. */}
      <LegalArticle<TermsId> doc={getTermsDoc(locale)} ids={TERMS_IDS} kind="terms" />
      <Footer />
    </div>
  );
}
