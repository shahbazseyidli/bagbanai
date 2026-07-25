"use client";

// E14 — the field's second-level navigation, rendered in the left panel once a field is open.
//
// Above xl this replaces the horizontal tab rows entirely: the field list collapses to a single row
// and these sections take the panel. Below xl the panel does not exist at all (FieldListPanel is
// `hidden xl:flex`), so the field page keeps its horizontal chip row for phones and laptops — the
// two navigations are never visible at the same time.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity, Calendar, Camera, Check, Cloud, FileText, FlaskConical, Info, Layers, Map,
  Mountain, Package, ScanEye, Sparkles, TrendingUp, Wrench,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { SECTION_GROUPS, resolveSection, sectionHref, type IconName } from "@/lib/fieldSections";

const ICONS: Record<IconName, typeof Sparkles> = {
  pulse: Sparkles,
  satellite: Layers,
  analysis: Activity,
  weather: Cloud,
  zones: Map,
  tasks: Check,
  fertilizer: FlaskConical,
  photos: Camera,
  scouting: ScanEye,
  operations: Wrench,
  yields: TrendingUp,
  harvest: Package,
  season: Calendar,
  soil: Mountain,
  metadata: Info,
  documents: FileText,
};

export default function FieldSectionMenu({ fieldId }: { fieldId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The menu is rendered from the panel, which can be mounted on a non-field route while a field is
  // still "active" — always build hrefs against this field, never against the current pathname.
  const base = `/fields/${fieldId}`;
  const onThisField = pathname === base;
  const current = resolveSection(onThisField ? searchParams.get("tab") : null);
  const search = onThisField ? searchParams.toString() : "";

  return (
    <div className="px-2 pb-3">
      {SECTION_GROUPS.map((g) => (
        <div key={g.key} className="mb-1.5">
          <p className="px-2 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">
            {t(g.labelKey)}
          </p>
          {g.sections.map((s) => {
            const Icon = ICONS[s.icon];
            const active = onThisField && current === s.key;
            return (
              <Link
                key={s.key}
                href={sectionHref(base, search, s.key)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold transition-colors motion-reduce:transition-none ${
                  active
                    ? "bg-mint-soft text-grass-deep"
                    : "text-ink-soft hover:bg-paper-2 hover:text-ink"
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
                <span className="truncate">{t(s.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
