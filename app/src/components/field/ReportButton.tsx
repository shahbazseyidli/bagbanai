"use client";

// Open this field's printable report in a new tab.
//
// WHY A PLAIN LINK AND NOT A FETCH: the endpoint returns a complete HTML document with its own
// print stylesheet and a print button. Fetching it into the SPA would mean re-hosting that document
// inside our own layout, where our stylesheet, our nav and our @page rules would all fight it. A
// new tab hands the whole page — and the browser's own PDF engine — to the farmer intact.
//
// WHY IT MATTERS: paper is a distribution channel here, not nostalgia. The research corpus is full
// of the same complaint for eight years — you cannot hand a phone screen to a field worker, an
// agronomist visiting three farms wants the season on one sheet, and a bank or a subsidy office
// asks for something printed. The data existed; the sheet did not.
import { FileText } from "lucide-react";
import { t } from "@/lib/i18n";

export default function ReportButton({ fieldId }: { fieldId: string }) {
  return (
    <a
      href={`/api/fields/${fieldId}/report`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t("app.field.report.button")}
    </a>
  );
}
