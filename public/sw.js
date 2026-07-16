const CACHE_PREFIX = "nocturne-control-";
const PRECACHE_VERSION = "__PRECACHE_VERSION__";
const PRECACHE_URLS = ["__PRECACHE_URLS__"];
const CACHE = `${CACHE_PREFIX}${PRECACHE_VERSION}`;
const SHELL = "./";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(SHELL, response.clone())));
      return response;
    }).catch(() => caches.match(SHELL)));
    return;
  }

  if (!sameOrigin) return;
  event.respondWith(caches.open(CACHE).then((cache) => cache.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
    return response;
  }))));
});
