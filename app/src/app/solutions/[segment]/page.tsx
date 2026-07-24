import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SolutionView from "@/components/solutions/SolutionView";
import { SEGMENT_ORDER, getSegment } from "@/components/solutions/content";

// W2 / E11 — one marketing page per role: /solutions/fermer · laboratoriya · konsultant · techizatci.
// Server Component so each segment ships its own <title>/description; the rendering (and the FAQ
// accordion) lives in the client SolutionView.

export function generateStaticParams() {
  return SEGMENT_ORDER.map((segment) => ({ segment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const seg = getSegment(segment);
  if (!seg) return { title: "Həllər — Bağban AI" };
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
  const seg = getSegment(segment);
  if (!seg) notFound();
  return <SolutionView segment={seg} />;
}
