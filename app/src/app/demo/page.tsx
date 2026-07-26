import type { Metadata } from "next";
import DemoPage from "@/components/demo/DemoPage";
import { getT } from "@/lib/i18n-server";

// /demo — the public demo-field tour. A Server Component so the page ships its own title,
// description and OG tags to crawlers; the interactive page is the client component below. It calls
// no t() itself — a Server Component's t() would render Azerbaijani forever (see lib/i18n-server).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = t("mkt.meta.demoTitle");
  return {
    title,
    description: t("mkt.meta.demoDesc"),
    alternates: { canonical: "/demo" },
    openGraph: { title, description: t("mkt.meta.demoOgDesc"), type: "website" },
  };
}

export default function DemoRoute() {
  return <DemoPage />;
}
