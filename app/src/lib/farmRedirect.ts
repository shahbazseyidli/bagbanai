// Shared by the four legacy farm-module routes (/ledger /sales /inventory /equipment), which are
// now redirects into the /farm container. Kept in one place so the four page files stay three
// lines each and cannot drift in how they carry query params across.
import type { FarmSectionKey } from "@/lib/farmSections";

/** Old-route query params + the container's ?tab=. Returns a ready query string (no leading "?"). */
export async function farmQuery(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  tab: FarmSectionKey,
): Promise<string> {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (key === "tab") continue; // the container owns ?tab=
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else if (value !== undefined) sp.set(key, value);
  }
  sp.set("tab", tab);
  return sp.toString();
}
