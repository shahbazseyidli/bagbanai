"use client";

// /farm — "Təsərrüfat": the single container for the four farm-management modules.
//
// Dəftər / Satış / Anbar / Texnika were four separate top-level rail entries. They are one subject
// (the farm's books, not a field), so they are one destination with four ?tab= sections. The
// modules themselves are untouched — this page only re-parents them.
//
// Same mechanics as the field page: the section lives in the URL (?tab=), so a notification, an
// email or the back button can address a section directly, and every OTHER query param survives a
// section switch (Yığım links into /farm?tab=sales&field=…&lot=…, which SalesSection reads).
//
// Unlike the field page the chip row is NOT xl:hidden: the field page hides its chips above xl
// because FieldListPanel renders the same navigation in the left panel, and no such panel is
// mounted here (AppShell.showsFieldList is false for /farm).
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Package, Receipt, Wrench } from "lucide-react";
import { t } from "@/lib/i18n";
import {
  FARM_SECTIONS, resolveFarmSection, type FarmIconName, type FarmSectionKey,
} from "@/lib/farmSections";
import { Spinner } from "@/components/ui";
import LedgerSection from "@/components/farm/LedgerSection";
import SalesSection from "@/components/farm/SalesSection";
import InventorySection from "@/components/farm/InventorySection";
import EquipmentSection from "@/components/farm/EquipmentSection";

const ICONS: Record<FarmIconName, typeof BookOpen> = {
  ledger: BookOpen,
  sales: Receipt,
  inventory: Package,
  equipment: Wrench,
};

export default function FarmPage() {
  // useSearchParams (tab state) requires a Suspense boundary under the app router.
  return (
    <Suspense fallback={<Spinner />}>
      <FarmInner />
    </Suspense>
  );
}

function FarmInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: FarmSectionKey = resolveFarmSection(searchParams.get("tab"));

  function setTab(key: FarmSectionKey) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", key);
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <nav
        aria-label={t("app.farm.sectionNav")}
        className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
      >
        {FARM_SECTIONS.map((s) => {
          const Icon = ICONS[s.icon];
          const active = tab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${
                active ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(s.labelKey)}
            </button>
          );
        })}
      </nav>

      {/* Each section renders its own heading and its own auth/org guards — they are the exact
          components that used to be the four pages, mounted one level down. */}
      {tab === "ledger" && <LedgerSection />}
      {tab === "sales" && <SalesSection />}
      {tab === "inventory" && <InventorySection />}
      {tab === "equipment" && <EquipmentSection />}
    </div>
  );
}
