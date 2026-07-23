"use client";

// Detailed account/settings page (HYBRID_PLAN §E W1/E13), OneSoil-style card grid. Reuses the
// existing language / data-saver / email-alert controls and surfaces role + country/region. Inline AZ.
import { useRouter } from "next/navigation";
import { Mail, Lock, Globe, Ruler, MapPin, Download, UserCog, LogOut, Store } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DataSaverToggle from "@/components/DataSaverToggle";
import EmailAlertsToggle from "@/components/EmailAlertsToggle";

const ROLE_AZ: Record<string, string> = { farmer: "Fermer", lab: "Laboratoriya", consultant: "Aqro-konsultant", supplier: "Təchizatçı" };

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
      <h1 className="text-2xl font-bold text-slate-900">Parametrlər</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card Icon={Mail} title="E-poçt" value={user?.email} />
        <Card Icon={Lock} title="Parol" value="Hesabınızı qoruyun" action={<span className="text-xs font-semibold text-emerald-700">Dəyiş</span>} />
        <Card Icon={Globe} title="Dil" action={<LanguageSwitcher />} />
        <Card Icon={Ruler} title="Ölçü sistemi" value="Metrik (ha, mm, °C)" />
        <Card Icon={MapPin} title="Ölkə & region" value={[user?.country, user?.region].filter(Boolean).join(" · ") || "Təyin olunmayıb"} />
        <Card Icon={Download} title="Məlumatı endir" value="Sahə və sərhədlər" action={<span className="text-xs font-semibold text-emerald-700">Yüklə</span>} />
        <Card Icon={UserCog} title="Rol" value={user?.role ? ROLE_AZ[user.role] : "Fermer"} />
        {isProvider && (
          <Link href="/provider" className="rounded-xl border-[1.5px] border-emerald-300 bg-emerald-50 p-4 hover:border-emerald-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Store className="h-4 w-4" aria-hidden="true" /></span>
            <h4 className="mt-3 text-sm font-semibold text-slate-900">Provayder profili</h4>
            <p className="mt-0.5 text-xs text-slate-600">Kataloq və xidmətləri redaktə et →</p>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <DataSaverToggle />
        {user && <EmailAlertsToggle />}
      </div>

      {user && (
        <button onClick={onLogout} className="flex min-h-12 w-full items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-left hover:border-red-300">
          <LogOut className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <span className="text-base font-medium text-slate-900">Çıxış ({user.email})</span>
        </button>
      )}
    </div>
  );
}
