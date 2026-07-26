// Agradex service worker (T12) — installable + offline field use.
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

// ---------------------------------------------------------------------------
// Web Push (H-push). Purely additive: CACHE and SHELL above are untouched on purpose — bumping the
// cache name to ship these listeners would drop the offline shell of every already-installed user,
// and adding event handlers needs no bump at all.
// ---------------------------------------------------------------------------

self.addEventListener("push", (e) => {
  // Parse defensively. Our own sends are always JSON, but a push service can deliver an empty body
  // (some do this to wake a worker) and the browser must not be left with an un-shown push.
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    try {
      data = { title: e.data ? e.data.text() : "" };
    } catch {
      data = {};
    }
  }

  // "Agradex" is a brand name, not prose — which is why it is safe to hard-code here. The service
  // worker has no access to lib/i18n, so it must never have to compose a sentence; every real
  // string arrives already written, in the reader's language, from the server.
  const title = data.title || "Agradex";
  const body = data.body || "";
  const url = data.url || "/notifications";

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      // One tag per category: a second frost warning replaces the first instead of stacking a pile
      // of banners about the same night.
      tag: data.tag || "agradex",
      data: { url },
      renotify: false,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/notifications";
  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        // Reuse an open window rather than piling up tabs. navigate() is missing on some older
        // engines, so focusing alone is the fallback — the farmer at least lands in the app.
        if (typeof client.navigate === "function") {
          try {
            await client.navigate(url);
          } catch {
            /* cross-origin or a navigation already in flight — focus is still worth doing */
          }
        }
        return client.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});

// Browsers rotate push subscriptions on their own schedule (key refresh, storage pressure). Without
// this handler push simply stops working one day, with no error on the device and nothing in our
// logs — the server keeps sending to an endpoint that has quietly been replaced.
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/push/vapid-public-key", { credentials: "include" });
        const cfg = await res.json();
        if (!cfg || !cfg.key) return;
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(cfg.key),
        });
        const j = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: j.endpoint,
            keys: { p256dh: j.keys && j.keys.p256dh, auth: j.keys && j.keys.auth },
          }),
        });
      } catch {
        // Nothing useful to do here: the settings card re-subscribes the next time it is opened.
      }
    })(),
  );
});

// Duplicated from lib/push.ts on purpose — sw.js is a classic worker script served straight from
// /public and cannot import from the bundled app.
function urlBase64ToBuffer(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = self.atob(normalized);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buf;
}
