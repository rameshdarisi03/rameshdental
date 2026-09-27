"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle2, Monitor, Smartphone, X, Sparkles } from "lucide-react";

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export default function InstallManagementAppButton() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop">("desktop");
  const [showAlreadyInstalledModal, setShowAlreadyInstalledModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showDesktopModal, setShowDesktopModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect device type
    const ua = (window.navigator.userAgent || "").toLowerCase();
    if (/iphone|ipad|ipod/.test(ua) && !(window as any).MSStream) {
      setDeviceType("ios");
    } else if (/android/.test(ua)) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }

    // 2. Standalone PWA detection
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");
    setIsStandalone(isStandaloneMode);

    // 3. Check if marked installed or related apps
    if (isStandaloneMode || localStorage.getItem("gpc_staff_pwa_installed") === "true") {
      setIsAlreadyInstalled(true);
    }

    if ("getInstalledRelatedApps" in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          setIsAlreadyInstalled(true);
          try {
            localStorage.setItem("gpc_staff_pwa_installed", "true");
          } catch (e) {}
        }
      }).catch(() => {});
    }

    // 4. Global deferred prompt
    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
      setIsAlreadyInstalled(false);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setInstallPrompt(e);
      // Browser firing beforeinstallprompt indicates app is NOT installed
      setIsAlreadyInstalled(false);
      try {
        localStorage.removeItem("gpc_staff_pwa_installed");
      } catch (err) {}
    };

    const handleAppInstalled = () => {
      setIsAlreadyInstalled(true);
      try {
        localStorage.setItem("gpc_staff_pwa_installed", "true");
      } catch (err) {}
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

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    // 1. If running inside standalone PWA window
    if (isStandalone) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // 2. Direct 1-tap native install prompt (Chrome, Edge, Samsung Internet)
    const promptEvent = installPrompt || (typeof window !== "undefined" && window.deferredPrompt);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === "accepted") {
          setIsAlreadyInstalled(true);
          try {
            localStorage.setItem("gpc_staff_pwa_installed", "true");
          } catch (err) {}
          setInstallPrompt(null);
          if (typeof window !== "undefined") {
            window.deferredPrompt = null;
          }
        }
        return;
      } catch (err) {
        console.warn("Direct install prompt interaction error:", err);
      }
    }

    // 3. If already installed on this device
    if (isAlreadyInstalled) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // 4. On iOS (Safari)
    if (deviceType === "ios") {
      setShowIOSModal(true);
      return;
    }

    // 5. On Android (Firefox/browsers where beforeinstallprompt was not triggered)
    if (deviceType === "android") {
      setShowAndroidModal(true);
      return;
    }

    // 6. Desktop browser fallback
    setShowDesktopModal(true);
  };

  return (
    <>
      {/* Top-Right Install Management App Button */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-green hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/20 hover:shadow-lg hover:scale-102 active:scale-98 transition-all cursor-pointer border border-emerald-400/30 group"
        title="Direct 1-Tap Install Gait Physio Portal App"
      >
        <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
        <span>Gait Physio Portal App</span>
        <Sparkles className="w-3 h-3 text-amber-300 animate-spin-slow opacity-80" />
      </button>

      {/* MODAL 1: App Already Installed Notice */}
      {showAlreadyInstalledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
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
                <strong>Gait Physio Portal</strong> is already installed on your device. You can launch it directly from your Windows Desktop, Start Menu, or mobile home screen anytime!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAlreadyInstalledModal(false)}
                className="w-full py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md cursor-pointer transition-all text-center"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: iOS Direct Add to Home Screen Sheet */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
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
                Install Portal on iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                To install the Gait Physio Portal app on iOS:
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
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Android / Firefox / Other Browser Instructions */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowAndroidModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Install Portal on Android
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                To install the Gait Physio Portal app directly on your browser:
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 text-left space-y-2 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>three dots (⋮ menu)</strong> at the top right of your browser.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <span>Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidModal(false)}
              className="w-full py-2.5 rounded-full bg-brand-green text-white text-xs font-black cursor-pointer shadow-md"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Desktop Browser Install Instructions */}
      {showDesktopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowDesktopModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
              <Monitor className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Install Portal on Desktop
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                Click the <strong>Install icon (⊞)</strong> in the right corner of your browser address bar to install the Gait Physio Portal app on your PC or Mac.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDesktopModal(false)}
              className="w-full py-2.5 rounded-full bg-brand-green text-white text-xs font-black cursor-pointer shadow-md"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
