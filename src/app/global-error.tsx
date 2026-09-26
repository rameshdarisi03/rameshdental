"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root GlobalError caught:", error);
    // Auto-clean stale service workers and old caches if a root boundary error was encountered
    if (typeof window !== "undefined") {
      try {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const reg of registrations) {
              reg.unregister().catch(() => {});
            }
          });
        }
        if ("caches" in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key).catch(() => {});
            }
          });
        }
      } catch (e) {}
    }
  }, [error]);

  const handleFullRefresh = async () => {
    if (typeof window !== "undefined") {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
      } catch (e) {}
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9F9F7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[28px] border border-slate-200 text-center space-y-5 shadow-sm">
          <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-[#062e36]">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#062e36]">Portal Connection Restored</h2>
            <p className="text-xs text-slate-500">
              A temporary network interruption occurred. Please tap refresh to reload the active view.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleFullRefresh}
              className="w-full bg-[#062e36] text-white py-3 rounded-full text-xs font-bold cursor-pointer hover:bg-[#0a4552] flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Portal</span>
            </button>
            <a
              href="/"
              className="block w-full py-2.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Return to Website
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
