import { redirect } from "next/navigation";
import { farmQuery } from "@/lib/farmRedirect";

// Dəftər moved one level down: it is now a section of the /farm container (?tab=ledger). The route
// stays as a redirect so bookmarks, notification deep links and any link we missed still land on
// the right section, with every other query param carried through untouched.
//
// 307 (redirect), not 308 (permanentRedirect): a permanent redirect is cached by the browser
// forever, so reverting the consolidation would strand anyone who had visited the old URL.
export default async function LedgerRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(`/farm?${await farmQuery(searchParams, "ledger")}`);
}
