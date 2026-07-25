import { permanentRedirect } from "next/navigation";

// The changelog moved from the Azerbaijani slug /yenilikler to /whats-new (all public routes are
// English). Keep this route as a 308 so old links, bookmarks and search results don't 404.
export default function YeniliklerPage() {
  permanentRedirect("/whats-new");
}
