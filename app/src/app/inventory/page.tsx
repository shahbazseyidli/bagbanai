import { redirect } from "next/navigation";
import { farmQuery } from "@/lib/farmRedirect";

// Anbar moved into the /farm container (?tab=inventory). Kept as a redirect for bookmarks and any
// link we missed; other query params are carried through.
export default async function InventoryRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(`/farm?${await farmQuery(searchParams, "inventory")}`);
}
