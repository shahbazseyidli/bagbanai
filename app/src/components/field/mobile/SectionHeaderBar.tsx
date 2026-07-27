"use client";

// The back affordance of a phone DETAIL view.
//
// The tabless field screen has two phone modes: the feed (?tab=status) and a detail view for every
// other section. A detail view is a real route — a notification link, a share link and the "Daha
// çox" list all land on one — so it needs a stated way back to the feed. This bar is it.
//
// `xl:hidden` is not decoration: it is the SAME gate the chip row and FieldListPanel share. At xl
// the left panel renders FieldSectionMenu and the content column already carries its own <h2>, so a
// second title plus a back button would be two answers to a question nobody asked.
import { ChevronLeft } from "lucide-react";
import { t } from "@/lib/i18n";

export default function SectionHeaderBar({
  title,
  onBack,
}: {
  title: string;
  /** Returns to the feed. The page decides whether that is router.back() or a fresh push. */
  onBack: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 xl:hidden">
      <button
        type="button"
        onClick={onBack}
        aria-label={t("app.field.feed.backAria")}
        className="inline-flex min-h-[var(--tap)] shrink-0 items-center gap-1 rounded-lg border border-line bg-panel py-2 pl-2 pr-3 text-[13px] font-semibold text-ink-soft hover:border-mint hover:text-grass-deep"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("app.field.section.status")}
      </button>
      {/* The page's own <h2> is `hidden xl:block`, so below xl this is the only place the open
          section is named. */}
      <h2 className="min-w-0 truncate font-display text-[17px] font-bold text-ink">{title}</h2>
    </div>
  );
}
