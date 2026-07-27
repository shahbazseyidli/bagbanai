"use client";

// THE FIELD CONTEXT PANEL — the slim second column that appears beside an open field at xl+.
//
// WHAT IT USED TO BE, AND WHY THAT WENT. This file was a 336px browsable field list: an org header,
// a season line, search + sort, score-dot cards, a collapse chevron and a support link, fed by three
// org-wide requests (/api/fields/geo, /api/orgs/{id}/wellness, /api/orgs/{id}/thumbs). All of that
// is now redundant. The home page is the dashboard and carries its own field selector over its own
// map; /fields is the browsable list. A third copy of the list, permanently parked beside every
// field page, cost the stage 356px of chrome to duplicate two other surfaces — and made the stage a
// function of a PERSISTED COLLAPSE PREFERENCE, which the two stage-measuring layouts then branched
// on. The panel is now 224px, network-free, and does exactly one thing.
//
// WHY IT SURVIVES AT ALL: FieldSectionMenu is the ONLY section navigation above xl. The field page's
// horizontal chip row is `xl:hidden` (grep `xl:hidden` in app/fields/[id]/page.tsx), on the explicit
// understanding that this panel renders the menu instead. Deleting this column would leave a 1920px
// desktop with no way to move between a field's twelve sections at all.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import { stripLocale } from "@/lib/stripLocale";
import FieldSectionMenu from "@/components/shell/FieldSectionMenu";

// Middleware rewrites the locale prefix away but the browser URL — and usePathname() — still
// carries it, so the pathname must be stripped before it is matched. A local copy of that logic
// once matched only /(en|tr|de), and on ru/hu/it/pl this returned null for /ru/fields/{id}: the open
// field silently lost its whole FieldSectionMenu. It now comes from lib/stripLocale.ts, the single
// implementation, which derives its prefix set from LOCALES.
export function activeFieldId(pathname: string): string | null {
  const m = stripLocale(pathname || "/").match(/^\/fields\/([^/?#]+)/);
  return m ? m[1] : null;
}

export default function FieldListPanel() {
  const pathname = usePathname() || "/";
  const fieldId = activeFieldId(pathname);

  // AppShell only mounts this on /fields/{id} (showsFieldPanel), so this is belt-and-braces — but a
  // panel with no field would render a heading over an empty box, which is worse than nothing.
  if (!fieldId) return null;

  return (
    // sticky top-[76px] — and this offset DOES legitimately encode the top bar's height, unlike the
    // sidebar's old geometry: an in-flow column that must stop under a `sticky top-0` header has no
    // other way to express that. 76 = Nav's aligned bar (a 48px --tap control inside py-3, plus its
    // 1px border-b) with 2px of air. max-h keeps the menu scrolling inside itself instead of
    // running past the bottom of the window.
    //
    // z-30 keeps the panel above page content that paints itself `fixed inset-0`; the sidebar's
    // z-40 is one layer higher and they never overlap anyway.
    <nav
      aria-label={t("app.shell.fieldPanel.aria")}
      className="sticky top-[76px] z-30 hidden max-h-[calc(100vh_-_92px)] w-56 shrink-0 flex-col overflow-hidden rounded-xl2 border border-line bg-panel shadow-soft xl:flex"
    >
      <Link
        href="/fields"
        className="flex min-h-[var(--tap)] shrink-0 items-center gap-1.5 border-b border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:text-grass motion-reduce:transition-none"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{t("app.shell.fieldListPanel.allFields")}</span>
      </Link>

      {/* min-h-0 is load-bearing: without it a flex child keeps its automatic content minimum and
          the menu would overflow the panel's max-height instead of scrolling inside it. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FieldSectionMenu fieldId={fieldId} />
      </div>
    </nav>
  );
}
