// Service Worker for Gait Physio Clinic PWA & Standalone App
// Clean, Non-Poisoning Network-First Architecture (Powered by TenoPilot Strategy)
const CACHE_NAME = "gpc-pwa-v6";
const ASSETS_TO_CACHE = [
  "/images/gait_physio_logo.png",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("PWA pre-cache warning (non-fatal):", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // 1. Bypass all cross-origin requests (Firebase Auth, Firestore, Google APIs, External CDN)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 2. Bypass API endpoints and development HMR
  if (url.pathname.startsWith("/api") || url.pathname.includes("/_next/webpack-hmr")) {
    return;
  }

  // 3. Network-First Strategy for all same-origin requests (Next.js chunks, HTML, Static Assets)
  // NEVER return dummy 408 responses which corrupt Next.js chunk loaders!
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for offline recovery
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic" &&
          (url.pathname.startsWith("/images") || url.pathname === "/manifest.json" || event.request.mode === "navigate")
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Offline Fallback
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === "navigate") {
          const offlinePage = await caches.match("/patienthub/dashboard");
          if (offlinePage) {
            return offlinePage;
          }
        }

        return new Response("You are currently offline. Please reconnect to continue.", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        });
      })
  );
});
