/* Zephyr Admin – szerviz-munkás: az app héja offline is megnyílik; az adatok mindig frissen a szerverről jönnek. */
const C = "zephyr-admin-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.includes("/api/") || u.origin !== location.origin) return;   /* API: soha nem gyorsítótárazzuk */
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
