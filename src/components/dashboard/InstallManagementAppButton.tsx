"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle2, Monitor, Smartphone, X, ExternalLink, Sparkles } from "lucide-react";

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export default function InstallManagementAppButton() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAlreadyInstalledModal, setShowAlreadyInstalledModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect if running inside the standalone PWA window
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 2. Check if marked as previously installed on this device
    const previouslyInstalled = localStorage.getItem("gpc_staff_pwa_installed") === "true";
    if (previouslyInstalled) {
      setIsAlreadyInstalled(true);
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 4. Check for Chromium getInstalledRelatedApps API if available
    if ("getInstalledRelatedApps" in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          setIsAlreadyInstalled(true);
          localStorage.setItem("gpc_staff_pwa_installed", "true");
        }
      }).catch(() => {});
    }

    // 5. Pick up global or local beforeinstallprompt
    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAlreadyInstalled(true);
      localStorage.setItem("gpc_staff_pwa_installed", "true");
      setInstallPrompt(null);
      window.deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If currently running in the standalone window
    if (isStandalone) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // If previously recorded as installed
    if (isAlreadyInstalled && !installPrompt) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // On iOS Safari, show the direct Add to Home Screen sheet
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // On Windows/Android/Chrome/Edge with native install prompt
    const promptEvent = installPrompt || window.deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === "accepted") {
          setIsAlreadyInstalled(true);
          localStorage.setItem("gpc_staff_pwa_installed", "true");
          setInstallPrompt(null);
          window.deferredPrompt = null;
        }
      } catch (err) {
        console.warn("Direct install prompt interaction error:", err);
      }
    } else {
      // Browser didn't provide beforeinstallprompt (e.g., already installed or desktop browser shortcut)
      setShowAlreadyInstalledModal(true);
    }
  };

  // If running inside the standalone PWA window, display sleek active badge
  if (isStandalone) {
    return (
      <div 
        onClick={() => setShowAlreadyInstalledModal(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-black tracking-wide shadow-2xs cursor-pointer hover:bg-emerald-500/15 transition-all"
        title="Running in Standalone Management App"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        <span>Staff App Active</span>
      </div>
    );
  }

  return (
    <>
      {/* Top-Right Install Management App Button */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-green hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/20 hover:shadow-lg hover:scale-102 active:scale-98 transition-all cursor-pointer border border-emerald-400/30 group"
        title="Direct 1-Tap Install Staff Management Portal App"
      >
        <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
        <span>Install Portal App</span>
        <Sparkles className="w-3 h-3 text-amber-300 animate-spin-slow opacity-80" />
      </button>

      {/* MODAL 1: App Already Installed Notice */}
      {showAlreadyInstalledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setShowAlreadyInstalledModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                App Already Installed!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                <strong>GaitPhysio Staff Portal</strong> is already installed on your device. You can launch it directly from your Windows Desktop, Start Menu, or mobile home screen anytime!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAlreadyInstalledModal(false)}
                className="w-full py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md cursor-pointer transition-all"
              >
                Got It, Thank You!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: iOS Direct Add to Home Screen Sheet */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Install on iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                To install the dedicated Management App on iOS:
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 text-left space-y-2 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> icon at the bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-full bg-brand-green text-white text-xs font-black cursor-pointer shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
