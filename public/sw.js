// Service Worker for Gait Physio Clinic PWA Standalone App
const CACHE_NAME = "gpc-pwa-v12";
const ASSETS_TO_CACHE = [
  "/manifest.json",
  "/images/gait_physio_logo.png",
  "/icon.png",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Strictly pass-through all cross-origin requests, Next.js chunks, API calls, and RSC requests
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  // Only intercept static assets declared in ASSETS_TO_CACHE
  if (ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          return new Response("", { status: 404, statusText: "Not Found" });
        });
      })
    );
  }
  // All other requests pass through natively to the browser network stack
});
