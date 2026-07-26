const CACHE_NAME = "gpc-patient-hub-v3";
const ASSETS_TO_CACHE = [
  "/logo-icon.svg",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Only handle GET requests and ignore Firebase/Firestore API requests
  if (e.request.method !== "GET" || e.request.url.includes("firestore.googleapis.com") || e.request.url.includes("identitytoolkit.googleapis.com")) {
    return;
  }

  // Network-First strategy for pages/documents (navigations) to ensure fresh code updates on refresh
  const isNavigation = e.request.mode === "navigate" || e.request.headers.get("accept")?.includes("text/html");
  
  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Cache the fresh page for offline access
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If offline, serve from cache
          return caches.match(e.request);
        })
    );
  } else {
    // Cache-First strategy for static assets (images, logos, fonts, files)
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request).then((response) => {
          // Dynamically cache non-critical assets if needed
          return response;
        }).catch(() => {
          // Fail silently or handle fallback
        });
      })
    );
  }
});
