"use client";

// D2.1 — "Daha çox": the overflow menu (bottom-nav destination). Large rows, one screen.
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag, Users, Shield, LogOut, ChevronRight, Store, MessageCircle, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import DataSaverToggle from "@/components/DataSaverToggle";
import EmailAlertsToggle from "@/components/EmailAlertsToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function MorePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const items = [
    { href: "/catalog", label: t("nav.catalog"), Icon: Store, authOnly: true },
    { href: "/chat", label: t("nav.community"), Icon: MessageCircle, authOnly: true },
    { href: "/account", label: t("more.account"), Icon: UserCog, authOnly: true },
    { href: "/pricing", label: t("more.pricingPlans"), Icon: Tag, authOnly: false },
    { href: "/team", label: t("nav.team"), Icon: Users, authOnly: true },
    ...(user?.is_admin ? [{ href: "/admin", label: t("nav.admin"), Icon: Shield, authOnly: true }] : []),
  ].filter((i) => !i.authOnly || user);

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">{t("more.title")}</h1>

      <ul className="space-y-2">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 hover:border-emerald-300"
            >
              <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="flex-1 text-base font-medium text-slate-900">{label}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3">
        <span className="text-base font-medium text-slate-900">{t("more.language")}</span>
        <LanguageSwitcher />
      </div>
      <DataSaverToggle />
      {user && <EmailAlertsToggle />}

      {user && (
        <>
          <p className="px-1 pt-2 text-sm text-slate-600">{user.email}</p>
          <button
            onClick={onLogout}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-left hover:border-red-300"
          >
            <LogOut className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <span className="text-base font-medium text-slate-900">{t("nav.logout")}</span>
          </button>
        </>
      )}
    </div>
  );
}
