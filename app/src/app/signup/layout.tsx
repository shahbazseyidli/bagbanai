import type { Metadata } from "next";
import { getT } from "@/lib/i18n-server";

// Same reason as login/layout.tsx: the "use client" page cannot title itself.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("mkt.meta.signupTitle") };
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
