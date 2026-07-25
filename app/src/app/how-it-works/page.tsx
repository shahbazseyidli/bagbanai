import type { Metadata } from "next";
import HowItWorks from "@/components/segments/HowItWorks";
import { getT } from "@/lib/i18n-server";

// /how-it-works — general "how Agradex works" page (repurposed from the hazelnut segment). Server
// Component so it ships its own <title>/description; the persuasive page + FAQ accordion live in the
// client component HowItWorks. Copy under mkt.how.* (7 languages).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = t("mkt.meta.howTitle");
  return {
    title,
    description: t("mkt.meta.howDesc"),
    alternates: { canonical: "/how-it-works" },
    openGraph: { title, description: t("mkt.meta.howOgDesc"), type: "website" },
  };
}

export default function HowItWorksPage() {
  return <HowItWorks />;
}
