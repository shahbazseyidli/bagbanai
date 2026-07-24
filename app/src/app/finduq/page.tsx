import type { Metadata } from "next";
import NutsSegment from "@/components/segments/NutsSegment";

// C6 — /finduq: the hazelnut / orchard segment landing page (ASCII slug; Next.js route paths must
// be ascii — the Azerbaijani "fındıq" is the surfaced product name, "finduq" is the URL). Server
// Component so it ships its own <title>/description; the persuasive page (and its FAQ accordion)
// lives in the client component NutsSegment. Copy is inline Azerbaijani (T18 sweep extracts later).

export const metadata: Metadata = {
  title: "Fındıq və bağ təsərrüfatları üçün — Bağban AI",
  description:
    "Çoxillik fındıq bağı üçün qurulmuş peyk monitorinqi: örtük NDVI/NDMI, bölgənin şaxta tarixləri, çiləmə pəncərəsi, GDD, məhsuldarlıq zonaları və AI aqronom. Zaqatala, Şəki, Xudat üçün kalibrlənmiş. 1 ay pulsuz.",
  alternates: { canonical: "/finduq" },
  openGraph: {
    title: "Fındıq və bağ təsərrüfatları üçün — Bağban AI",
    description:
      "Çoxillik fındıq bağı üçün örtük peyk analizi, şaxta tarixləri, çiləmə pəncərəsi və AI aqronom. Fındıq üçün ayrıca kalibrlənmiş. 1 ay pulsuz, kart lazım deyil.",
    type: "website",
  },
};

export default function FinduqPage() {
  return <NutsSegment />;
}
