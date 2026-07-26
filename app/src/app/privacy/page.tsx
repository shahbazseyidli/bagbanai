import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { getT, getServerLocale } from "@/lib/i18n-server";
import { LegalArticle, getPrivacyDoc, PRIVACY_IDS } from "./legal";
import type { PrivacyId } from "./legal";

// B-legal — /privacy. Server Component: the whole document is chosen by the request's locale, so it
// has to render on the server or a crawler (and a reader with JS off) would get the Azerbaijani
// text under a /de URL. Same reason as /guide/[slug]: no generateStaticParams, no prerender.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // Deliberately NO `alternates` here. The root layout already emits a locale-correct canonical
  // plus eight hreflang entries built from the x-pathname header; a page-level relative canonical
  // (as /guide has) would overwrite that with a locale-blind "/privacy" for all eight languages.
  return { title: t("mkt.meta.privacyTitle"), description: t("mkt.meta.privacyDesc") };
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  return (
    // Full-bleed paper background, matching /guide. -mb-24 cancels the root <main>'s bottom padding
    // (which clears the mobile BottomNav) so the footer can sit flush at the end of the page.
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 md:-mb-6">
      {/* Explicit type argument rather than inference: with no local typechecker, pinning Id here
          means a mismatch between the document and the id list is reported on this line. */}
      <LegalArticle<PrivacyId> doc={getPrivacyDoc(locale)} ids={PRIVACY_IDS} kind="privacy" />
      <Footer />
    </div>
  );
}
