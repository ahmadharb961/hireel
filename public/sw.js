// Hireel service worker: makes the app installable and shows an offline page.
// It never caches API calls, account pages or videos, so nothing private is stored on the phone.
const CACHE = "hireel-v3";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Static build files are fingerprinted, so they are safe to cache.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
  }
});

// Notifications (only after the person tapped Allow). The message says where to go when tapped.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "Hireel", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Hireel", {
    body: d.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: d.tag || undefined,
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  // Open exactly the page the notification is about (e.g. the chat), never just the last page.
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = list.find((c) => c.url.startsWith(self.location.origin));
    if (!win) return self.clients.openWindow(url);
    if (win.url === url) return win.focus();
    // Focus first (browsers allow it only right after the tap), then move that window to the page.
    const focused = await win.focus().catch(() => win);
    if ("navigate" in win) {
      try {
        const moved = await win.navigate(url);
        if (moved) return;
      } catch (e) { /* some phones (iPhone) don't allow this: ask the page itself below */ }
    }
    (focused || win).postMessage({ type: "hireel-open", url });
  })());
});
