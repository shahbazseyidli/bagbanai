import type { Metadata } from "next";
import HowItWorks from "@/components/segments/HowItWorks";
import { getT, getServerLocale } from "@/lib/i18n-server";
import { pageAlternates } from "@/lib/seo";

// /how-it-works — general "how Agradex works" page (repurposed from the hazelnut segment). Server
// Component so it ships its own <title>/description; the persuasive page + FAQ accordion live in the
// client component HowItWorks. Copy under mkt.how.* (7 languages).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getServerLocale();
  const title = t("mkt.meta.howTitle");
  return {
    title,
    description: t("mkt.meta.howDesc"),
    alternates: pageAlternates("/how-it-works", locale),
    openGraph: { title, description: t("mkt.meta.howOgDesc"), type: "website" },
  };
}

export default function HowItWorksPage() {
  return <HowItWorks />;
}
