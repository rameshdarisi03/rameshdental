"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";

export default function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    // Reload window once the new service worker has taken over
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.ready
      .then((registration) => {
        // 1. Check if a new worker is already waiting in background
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowPrompt(true);
        }

        // 2. Listen for newly discovered updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // If installed and an existing controller already exists, it is an update
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowPrompt(true);
            }
          });
        });

        // 3. Periodic check for updates (every 20 minutes)
        const intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 20 * 60 * 1000);

        // 4. Check for updates when user returns to app/tab
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
          clearInterval(intervalId);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
      })
      .catch((err) => {
        console.debug("PWA service worker registration check:", err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      // Clear browser caches to ensure 100% fresh assets
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn("Failed to purge caches:", e);
    }

    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }

    // Safety fallback: if controllerchange doesn't trigger reload within 1.2s, force reload
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }, [waitingWorker]);

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[99999] animate-in slide-in-from-bottom duration-300"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-4 shadow-2xl shadow-emerald-950/20 flex items-start gap-3.5">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-[#062e36] flex items-center justify-center text-white shadow-md">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>Update Available</span>
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-full">
              New
            </span>
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
            A new version of Gait Physio Clinic is ready with the latest performance and clinical improvements.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-[#0e5e6f] hover:from-emerald-700 hover:to-[#09414e] active:scale-95 transition-all rounded-lg shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? "animate-spin" : ""}`} />
              <span>{isUpdating ? "Updating..." : "Update Now"}</span>
            </button>

            <button
              onClick={() => setShowPrompt(false)}
              disabled={isUpdating}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-lg"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          aria-label="Close update notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
