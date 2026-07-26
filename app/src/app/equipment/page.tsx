import { redirect } from "next/navigation";
import { farmQuery } from "@/lib/farmRedirect";

// Texnika moved into the /farm container (?tab=equipment). Kept as a redirect for bookmarks and any
// link we missed; other query params are carried through.
export default async function EquipmentRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(`/farm?${await farmQuery(searchParams, "equipment")}`);
}
