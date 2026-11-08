// Workday service worker: keeps the app itself on the phone so it opens instantly.
// Live data (buses, weather, map tiles) always comes fresh from the network.
const CACHE = "workday-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const shellUrls = SHELL.map(s => new URL(s, self.registration.scope).href);
  const isShell = e.request.mode === "navigate" || shellUrls.includes(url.href.split("#")[0]);
  if (!isShell || e.request.method !== "GET") return; // live data: straight to network
  // app shell: try network first (so updates arrive), fall back to the saved copy
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
