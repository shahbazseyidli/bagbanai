"use client";

// Detailed account/settings page (HYBRID_PLAN §E W1/E13), OneSoil-style card grid. Reuses the
// existing language / data-saver / email controls and surfaces role + country/region. Inline AZ.
import { useRouter } from "next/navigation";
import { Mail, Lock, Globe, MapPin, Download, UserCog, LogOut, Store } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DataSaverToggle from "@/components/DataSaverToggle";
import EmailLifecycleToggle from "@/components/EmailLifecycleToggle";
import AreaUnitSetting from "@/components/AreaUnitSetting";
import NamePublicToggle from "@/components/NamePublicToggle";
import NotifyMatrix from "@/components/NotifyMatrix";
import ProfileForm from "@/components/account/ProfileForm";
import ChangePassword from "@/components/account/ChangePassword";
import CloseAccount from "@/components/account/CloseAccount";
import { t } from "@/lib/i18n";

// Role code → localized label. Resolved at render time (not module load) so the active locale applies.
function roleLabel(role?: string): string {
  switch (role) {
    case "lab": return t("app.account.roleLab");
    case "consultant": return t("app.account.roleConsultant");
    case "supplier": return t("app.account.roleSupplier");
    default: return t("app.account.roleFarmer");
  }
}

function Card({ Icon, title, value, action }: { Icon: typeof Mail; title: string; value?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border-[1.5px] border-slate-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-emerald-700"><Icon className="h-4 w-4" aria-hidden="true" /></span>
        {action}
      </div>
      <h4 className="mt-3 text-sm font-semibold text-slate-900">{title}</h4>
      {value && <p className="mt-0.5 text-xs text-slate-500">{value}</p>}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isProvider = user?.role && user.role !== "farmer";

  async function onLogout() { await logout(); router.push("/login"); }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">{t("app.account.title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card Icon={Mail} title={t("app.account.emailTitle")} value={user?.email} />
        {/* Was a decorative <span>: the card advertised "Dəyiş" and did nothing. Now it jumps to the
            form below, which is why ChangePassword/ProfileForm carry #password / #profile. */}
        <Card Icon={Lock} title={t("app.account.passwordTitle")} value={t("app.account.passwordValue")} action={<a href="#password" className="text-xs font-semibold text-emerald-700">{t("app.account.change")}</a>} />
        <Card Icon={Globe} title={t("app.account.languageTitle")} action={<LanguageSwitcher />} />
        <Card Icon={MapPin} title={t("app.account.countryRegionTitle")} value={[user?.country, user?.region].filter(Boolean).join(" · ") || t("app.account.notSet")} action={<a href="#profile" className="text-xs font-semibold text-emerald-700">{t("app.account.change")}</a>} />
        <Card Icon={Download} title={t("app.account.downloadTitle")} value={t("app.account.downloadValue")} action={<span className="text-xs font-semibold text-emerald-700">{t("app.account.downloadCta")}</span>} />
        <Card Icon={UserCog} title={t("app.account.roleTitle")} value={roleLabel(user?.role)} />
        {isProvider && (
          <Link href="/provider" className="rounded-xl border-[1.5px] border-emerald-300 bg-emerald-50 p-4 hover:border-emerald-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Store className="h-4 w-4" aria-hidden="true" /></span>
            <h4 className="mt-3 text-sm font-semibold text-slate-900">{t("app.account.providerTitle")}</h4>
            <p className="mt-0.5 text-xs text-slate-600">{t("app.account.providerBody")}</p>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <DataSaverToggle />
        {user && <AreaUnitSetting />}
        {user && <EmailLifecycleToggle />}
        {/* Directly under the master email switch: its digest column refers to that switch. */}
        {user && <NotifyMatrix />}
        {user && <NamePublicToggle />}
        {user && <ProfileForm />}
        {user && <ChangePassword />}
      </div>

      {user && (
        <button onClick={onLogout} className="flex min-h-12 w-full items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-left hover:border-red-300">
          <LogOut className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <span className="text-base font-medium text-slate-900">{t("app.account.logout")} ({user.email})</span>
        </button>
      )}

      {/* Last, below the logout row: closing the account is the final exit, not a setting. */}
      {user && <CloseAccount />}
    </div>
  );
}
