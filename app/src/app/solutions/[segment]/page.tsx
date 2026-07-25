import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SolutionView from "@/components/solutions/SolutionView";
import { getSegment, getSegmentList } from "@/components/solutions/content";
import { getServerLocale } from "@/lib/i18n-server";

// W2 / E11 — one marketing page per role: /solutions/fermer · laboratoriya · konsultant · techizatci.
// Server Component so each segment ships its own <title>/description; the rendering (and the FAQ
// accordion) lives in the client SolutionView. Localized per request (locale from the x-locale
// header), so it can't be statically prerendered — same reason as guide/[slug].
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const locale = await getServerLocale();
  const seg = getSegment(segment, locale);
  if (!seg) return { title: "Agradex" };
  return {
    title: seg.metaTitle,
    description: seg.metaDescription,
    alternates: { canonical: `/solutions/${seg.slug}` },
    openGraph: {
      title: seg.metaTitle,
      description: seg.metaDescription,
      type: "website",
    },
  };
}

export default async function SolutionSegmentPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const locale = await getServerLocale();
  const seg = getSegment(segment, locale);
  if (!seg) notFound();
  // Resolve the nav/other-roles list server-side too, so the client SolutionView needs no overlay.
  return <SolutionView segment={seg} allSegments={getSegmentList(locale)} />;
}
