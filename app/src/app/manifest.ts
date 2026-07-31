import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getT } from "@/lib/i18n-server";

// PWA manifest (T12) — makes Agradex installable + launchable standalone for offline field use.
//
// The description used to be a hardcoded Azerbaijani string, so the install card said
// "Peyk, hava və AI ilə əkin monitorinqi" to a German or Polish farmer at the exact moment they
// were deciding whether to put us on their home screen.
//
// It could not simply call t(): middleware.ts's matcher EXCLUDES manifest.webmanifest, so no
// x-locale header reaches this route. Rather than widen the matcher — which would run the whole
// auth/host pipeline for a static asset — the locale is read from the same cookie middleware
// writes, which is the one signal that survives without it.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const jar = await headers();
  const cookie = jar.get("cookie") || "";
  const locale = /bagban_locale=([a-z]{2})/.exec(cookie)?.[1] || "az";
  const t = await getT(locale);
  return {
    name: "Agradex",
    short_name: "Agradex",
    description: t("landing.metaDescription"),
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7f3",
    theme_color: "#059669",
    lang: locale,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
