import type { Metadata } from "next";
import NutsSegment from "@/components/segments/NutsSegment";
import { getT } from "@/lib/i18n-server";

// C6 — /finduq: the hazelnut / orchard segment landing page (ASCII slug; Next.js route paths must
// be ascii — the Azerbaijani "fındıq" is the surfaced product name, "finduq" is the URL). Server
// Component so it ships its own <title>/description; the persuasive page (and its FAQ accordion)
// lives in the client component NutsSegment. Copy is inline Azerbaijani (T18 sweep extracts later).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = t("mkt.meta.finduqTitle");
  return {
    title,
    description: t("mkt.meta.finduqDesc"),
    alternates: { canonical: "/finduq" },
    openGraph: { title, description: t("mkt.meta.finduqOgDesc"), type: "website" },
  };
}

export default function FinduqPage() {
  return <NutsSegment />;
}
