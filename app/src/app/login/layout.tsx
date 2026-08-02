import type { Metadata } from "next";
import { getT } from "@/lib/i18n-server";

// The page itself is "use client" and cannot export metadata; without this layout it inherited the
// homepage title verbatim, so the login tab and any SERP snippet were indistinguishable from home.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("mkt.meta.loginTitle") };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
