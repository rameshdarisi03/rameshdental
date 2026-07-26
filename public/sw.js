const CACHE_NAME = "gpc-patient-hub-v1";
const ASSETS_TO_CACHE = [
  "/patienthub/login",
  "/logo-icon.svg",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
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
    })
  );
});

self.addEventListener("fetch", (e) => {
  // Only cache GET requests and bypass Firebase/Firestore API requests
  if (e.request.method !== "GET" || e.request.url.includes("firestore.googleapis.com") || e.request.url.includes("identitytoolkit.googleapis.com")) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback or dynamic offline handling if needed
      });
    })
  );
});
