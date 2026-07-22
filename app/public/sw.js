// Bağban AI service worker (T12) — installable + offline field use.
// Strategy: cache-first for static assets + satellite tiles; network-first (with cache fallback)
// for API GETs and navigations, so the app shell and last-seen data stay usable offline.
const CACHE = "bagban-v1";
const SHELL = ["/"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Static assets + satellite tiles → cache-first.
  if (
    url.pathname.includes("/titiler/") ||
    url.pathname.startsWith("/_next/static") ||
    /\.(png|jpg|jpeg|webp|svg|woff2?|css|js)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) c.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  // API GETs → network-first, fall back to cached response when offline.
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const c = await caches.open(CACHE);
          c.put(req, res.clone());
          return res;
        } catch {
          const hit = await caches.match(req);
          return hit || new Response(JSON.stringify({ offline: true }), {
            status: 503, headers: { "Content-Type": "application/json" },
          });
        }
      })(),
    );
    return;
  }

  // Navigations → network-first, fall back to the cached app shell.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          return (await caches.match(req)) || (await caches.match("/")) || Response.error();
        }
      })(),
    );
  }
});
