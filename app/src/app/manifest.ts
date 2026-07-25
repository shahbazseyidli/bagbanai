import type { MetadataRoute } from "next";

// PWA manifest (T12) — makes Agradex installable + launchable standalone for offline field use.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agradex",
    short_name: "Agradex",
    description: "Peyk, hava və AI ilə əkin monitorinqi",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7f3",
    theme_color: "#059669",
    lang: "az",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
