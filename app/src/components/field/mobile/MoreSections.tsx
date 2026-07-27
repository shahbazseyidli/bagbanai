"use client";

// The tail of the phone feed: every section the feed does NOT already carry, as a plain list.
//
// This is the half of the hybrid that keeps the promise "no feature is removed". The six blocks
// above answer the daily questions; these eight are the record-keeping the farmer opens on purpose,
// and each row is an ordinary link to that section's ?tab= URL — the same URL the desktop menu, a
// notification and a bookmark use. Nothing here is a modal or a sheet, so lib/scrollLock.ts is not
// involved and the Android back gesture behaves like it does on any other page.
//
// The list is DERIVED from lib/fieldSections (secondaryGroups()), never enumerated here: a second
// hand-maintained list of sections is exactly the drift that file exists to prevent.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { secondaryGroups, sectionHref } from "@/lib/fieldSections";
import { SECTION_ICONS } from "./sectionIcons";

export default function MoreSections({
  pathname,
  search,
  onNavigate,
}: {
  /** The field page's own pathname — the hrefs must preserve every other query param. */
  pathname: string;
  /** searchParams.toString() from the page, so ?ui= / ?focus= and friends survive the hop. */
  search: string;
  /**
   * Called before the push. The page uses it to record that the history entry about to be created
   * is ours, so the detail view's back bar can pop it instead of pushing a second feed entry.
   */
  onNavigate?: () => void;
}) {
  const groups = secondaryGroups();
  if (groups.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border-[1.5px] border-line bg-panel">
      <div className="px-4 pb-2.5 pt-3">
        <h3 className="font-display text-[15px] font-bold text-ink">{t("app.field.feed.moreTitle")}</h3>
        <p className="mt-0.5 text-[12px] text-ink-soft">{t("app.field.feed.moreHint")}</p>
      </div>

      {groups.map((g) => (
        <div key={g.key}>
          <p className="border-t border-line bg-paper-2/60 px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t(g.labelKey)}
          </p>
          <ul>
            {g.sections.map((s) => {
              const Icon = SECTION_ICONS[s.icon];
              return (
                <li key={s.key} className="border-t border-line first:border-t-0">
                  <Link
                    href={sectionHref(pathname, search, s.key)}
                    onClick={onNavigate}
                    className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-paper-2"
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
                    <span className="min-w-0 truncate">{t(s.labelKey)}</span>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
