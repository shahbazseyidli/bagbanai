import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import SolutionView from "@/components/solutions/SolutionView";
import { getSegment, getSegmentList } from "@/components/solutions/content";
import { getServerLocale } from "@/lib/i18n-server";
import { pageAlternates } from "@/lib/seo";

// Old Azerbaijani slugs → new English slugs (aligned with the user_role enum). Kept so existing
// links / bookmarks / search results 308-redirect instead of 404ing.
const LEGACY_SLUGS: Record<string, string> = {
  fermer: "farmer",
  laboratoriya: "lab",
  konsultant: "consultant",
  techizatci: "supplier",
};

// W2 / E11 — one marketing page per role: /solutions/farmer · lab · consultant · supplier.
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
    alternates: pageAlternates(`/solutions/${seg.slug}`, locale),
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
  if (LEGACY_SLUGS[segment]) permanentRedirect(`/solutions/${LEGACY_SLUGS[segment]}`);
  const locale = await getServerLocale();
  const seg = getSegment(segment, locale);
  if (!seg) notFound();
  // Resolve the nav/other-roles list server-side too, so the client SolutionView needs no overlay.
  return <SolutionView segment={seg} allSegments={getSegmentList(locale)} />;
}
