"use client";

// "/" — the marketing landing on the apex, the farmer's home on the app host.
//
// There is no longer a second home. The `?ui=v1` console Dashboard that used to live here (a
// ~270-line org/farm/field table with its own subscription strip) was removed at the owner's
// decision on 2026-07-27, together with lib/uiFlag.ts: TodayHome had been the default for every
// signed-in farmer for weeks, the escape hatch had no remaining audience, and keeping it meant
// every layout change to "/" had to be reasoned about twice — the wide-stage work had already
// tripped over exactly that. `?ui=v1` and `?ui=v2` are now inert query params.
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { useIsAppHost } from "@/lib/host";
import TodayHome from "@/components/home/TodayHome";
import PublicLanding from "@/components/landing/PublicLanding";

export default function HomePage() {
  const { user, loading } = useAuth();
  // Panel split: the apex (agradex.com) is ALWAYS marketing — even for signed-in users — so the
  // brand/logo can point here and show the landing, not the app. The app lives on the app host
  // (app.agradex.com). Shared with AppShell/BottomNav via useIsAppHost so they never diverge.
  const appHost = useIsAppHost();
  // The apex is ALWAYS marketing, and the host is known from the request (middleware → x-app-host →
  // AppHostProvider), so this branch is taken during SSR and the landing ends up in the HTML.
  // It used to sit below the `loading` gate: on the server `loading` starts true, so every crawler
  // got a spinner and the most important page on the site had no indexable content at all.
  if (!appHost) return <PublicLanding />;
  if (loading) return <Spinner />;
  if (!user) return <PublicLanding />;
  return <TodayHome />;
}
