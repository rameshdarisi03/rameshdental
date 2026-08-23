const CACHE_NAME = "gpc-patient-hub-v5";
const ASSETS_TO_CACHE = [
  "/images/gait_physio_logo.png",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Service worker asset pre-cache error (non-fatal):", err);
      });
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
  // Only handle GET requests
  if (e.request.method !== "GET") {
    return;
  }

  const url = new URL(e.request.url);

  // 1. Bypass all cross-origin requests (Firebase Auth, APIs, Firestore, Google Drive)
  const isSameOrigin = e.request.url.startsWith(self.location.origin);
  if (!isSameOrigin) {
    return;
  }

  // 2. IMPORTANT: Completely bypass admin dashboard, APIs, emergency, and static Next.js build internals
  // This guarantees admin dashboard NEVER experiences intermittent service-worker offline errors!
  if (
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/emergency") ||
    url.pathname.includes("/_next/webpack-hmr")
  ) {
    return; // Pass directly to network
  }

  // 3. Navigation requests for public / patient hub pages
  const isNavigation = e.request.mode === "navigate" || e.request.headers.get("accept")?.includes("text/html");
  
  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // If offline, attempt cache match or fallback
          const cached = await caches.match(e.request);
          if (cached) return cached;
          const fallback = await caches.match("/patienthub/dashboard");
          if (fallback) return fallback;
          return new Response("You are currently offline. Please reconnect to load fresh clinical updates.", {
            headers: { "Content-Type": "text/plain" }
          });
        })
    );
  } else {
    // 4. Cache-First for static assets (images, icons)
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request).then((response) => {
          return response;
        }).catch(() => {
          // Fail gracefully without crashing
          return new Response("", { status: 408 });
        });
      })
    );
  }
});
