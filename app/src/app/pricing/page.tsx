import type { Metadata } from "next";
import PricingView from "@/components/PricingView";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("mkt.meta.pricingTitle"), description: t("mkt.meta.pricingDesc") };
}

export default function PricingPage() {
  return <PricingView />;
}
