import { permanentRedirect } from "next/navigation";

// The hazelnut segment page was repurposed into the general /how-it-works page. Keep this route as a
// 308 redirect so old links / bookmarks / search results don't 404.
export default function FinduqPage() {
  permanentRedirect("/how-it-works");
}
