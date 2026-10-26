// Clean Service Worker for Gait Physio Clinic PWA Standalone App
// All network requests pass through natively to the browser to ensure Next.js chunk loading stability
const CACHE_NAME = "gpc-pwa-v23";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", () => {
  // Automatically activate new service worker in background without prompting
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Purge any old caches from previous versions to eliminate stale chunk errors
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Mandatory fetch handler for Chromium (Chrome/Edge) PWA installability criteria
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
