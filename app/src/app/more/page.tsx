"use client";

// D2.1 — "Daha çox": the overflow menu (bottom-nav destination). Large rows, one screen.
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag, Users, Shield, LogOut, ChevronRight, Store, MessageCircle, UserCog,
  Bell, GraduationCap, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { t, tf } from "@/lib/i18n";
import { SHOW_MARKETPLACE_NAV } from "@/lib/navFlags";
// The rail owns the "sum the per-thread unread counts" rule; this screen borrows it rather than
// re-deriving it. On a phone /more is the ONLY route to Messages — the bottom bar has five fixed
// slots and none of them is /chat — so without a badge here a farmer has no unread signal at all.
import { useUnreadMessages } from "@/components/shell/AppRail";
import DataSaverToggle from "@/components/DataSaverToggle";
import EmailLifecycleToggle from "@/components/EmailLifecycleToggle";
import AreaUnitSetting from "@/components/AreaUnitSetting";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type MoreItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  authOnly: boolean;
  /** Unread count rendered as a pill on the row. Absent or 0 = no pill. */
  badge?: number;
};

export default function MorePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const unread = useUnreadMessages(SHOW_MARKETPLACE_NAV && !!user);

  // This list is the safety net for the trimmed navigation: everything the rail and the bottom nav
  // do not show has to be one tap away from here.
  //
  // The Dəftər/Satış/Anbar/Texnika row this comment used to describe is GONE — the ERP strip
  // deleted those modules and the /farm container that held them, so there is nothing to collapse.
  //
  // Annotated, and annotated on the LITERAL rather than on the filtered result: that is what gives
  // every row one shape. Left to inference the array is a union of two shapes — with and without
  // `badge` — and destructuring `badge` in the render below would not typecheck.
  const allItems: MoreItem[] = [
    { href: "/notifications", label: t("nav.notifications"), Icon: Bell, authOnly: true },
    { href: "/guide", label: t("app.more.howToStart"), Icon: GraduationCap, authOnly: false },
    ...(SHOW_MARKETPLACE_NAV
      ? [
          { href: "/catalog", label: t("nav.catalog"), Icon: Store, authOnly: true },
          // nav.community — the KEY still says "community", the VALUE says "Mesajlar". See the
          // note on that key in lib/i18n.ts for why only one of the two was renamed.
          { href: "/chat", label: t("nav.community"), Icon: MessageCircle, authOnly: true, badge: unread },
        ]
      : []),
    // /provider is the provider's OWN profile + catalog editor, not somewhere a farmer buys
    // anything — showing it to a farmer would offer to edit a profile they do not have. Role, not
    // SHOW_MARKETPLACE_NAV, is the right gate: it stays correct whichever way that flag moves.
    ...(user && user.role && user.role !== "farmer"
      ? [{ href: "/provider", label: t("app.provider.title"), Icon: Store, authOnly: true }]
      : []),
    { href: "/account", label: t("more.account"), Icon: UserCog, authOnly: true },
    { href: "/pricing", label: t("more.pricingPlans"), Icon: Tag, authOnly: false },
    { href: "/team", label: t("nav.team"), Icon: Users, authOnly: true },
    ...(user?.is_admin ? [{ href: "/admin", label: t("nav.admin"), Icon: Shield, authOnly: true }] : []),
  ];
  const items = allItems.filter((i) => !i.authOnly || user);

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">{t("more.title")}</h1>

      <ul className="space-y-2">
        {items.map(({ href, label, Icon, badge }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 hover:border-emerald-300"
            >
              <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="flex-1 text-base font-medium text-slate-900">{label}</span>
              {/* The digit is aria-hidden and paired with a sentence: "7" on its own tells a
                  screen reader nothing about what is unread. */}
              {badge ? (
                <>
                  <span
                    aria-hidden="true"
                    className="grid h-6 min-w-[24px] shrink-0 place-items-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold leading-none text-white"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                  <span className="sr-only">{tf("app.chat.unreadAria", { n: badge })}</span>
                </>
              ) : null}
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
      {user && <AreaUnitSetting />}
      {user && <EmailLifecycleToggle />}

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
