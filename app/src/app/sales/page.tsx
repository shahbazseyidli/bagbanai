import { redirect } from "next/navigation";
import { farmQuery } from "@/lib/farmRedirect";

// Satış moved into the /farm container (?tab=sales). This route matters more than the other three:
// the field's Yığım tab deep-links here as /sales?field=…&lot=…&org=… to prefill the sale form, and
// those params must survive the hop (farmQuery carries them). Those in-app links were updated to
// point at /farm directly; this redirect covers bookmarks and anything already sent out.
export default async function SalesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(`/farm?${await farmQuery(searchParams, "sales")}`);
}
