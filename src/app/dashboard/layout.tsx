"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Clock,
  Users,
  LogOut,
  Menu,
  X,
  UserCheck,
  Loader2,
  Lock,
  LayoutGrid,
  Settings,
  BarChart3,
  PlusCircle,
  Dumbbell,
  Receipt,
  Video
} from "lucide-react";
import { FEATURES } from "@/lib/features";
import InstallManagementAppButton from "@/components/dashboard/InstallManagementAppButton";
import { auth } from "@/lib/firebase";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/dashboard/login";
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;
    // Check if user is logged in
    const userJson = localStorage.getItem("gpc_user");
    if (!userJson) {
      router.replace("/dashboard/login");
    } else {
      const parsedUser = JSON.parse(userJson);
      setUser(parsedUser);
      const role = parsedUser.role || "staff";
      document.cookie = "gpc_session=" + role + "; path=/; max-age=2592000; SameSite=Lax";
      setLoading(false);
    }
  }, [router, isLoginPage]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("gpc_user");
      document.cookie = "gpc_session=; Max-Age=-99999999; path=/";
      try {
        await auth.signOut();
      } catch (e) {}
      router.replace("/dashboard/login");
    } catch (err) {
      console.error("Staff logout failed:", err);
      router.replace("/dashboard/login");
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 gap-4">
        <img 
          src="/images/gait_pwa_splash.png" 
          alt="Gait Physio Clinic" 
          className="h-36 w-36 object-contain drop-shadow-sm animate-pulse"
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          <span>Loading portal session...</span>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: "Overview", href: "/dashboard", icon: Activity, role: "all" },
    { name: "Appointments", href: "/dashboard/appointments", icon: Calendar, role: "all" },
    { name: "Day Snapshot", href: "/dashboard/snapshot", icon: LayoutGrid, role: "all" },
    { name: "Walk-in Bookings", href: "/dashboard/walkin", icon: PlusCircle, role: "all" },
    { name: "Patients Database", href: "/dashboard/patients", icon: Users, role: "all" },
    { name: "Schedule Blocks", href: "/dashboard/blocks", icon: Clock, role: "all" },
    { name: "Exercise Library", href: "/dashboard/exercises", icon: Dumbbell, role: "all" },
    { name: "Recovery Stories", href: "/dashboard/stories", icon: Video, role: "all" },
    ...(FEATURES.enableModularInvoicing
      ? [{ name: "Invoices & Billing", href: "/dashboard/invoices", icon: Receipt, role: "admin" }]
      : []),
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, role: "admin" },
    { name: "Staff Management", href: "/dashboard/staff", icon: UserCheck, role: "admin" },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, role: "admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      <link rel="manifest" href="/manifest-staff.json" />
      <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-100 dark:border-slate-850 text-brand-green font-semibold">
          <img
            src="/images/gait_physio_logo.png"
            alt="Gait Physio Clinic"
            className="h-7 w-7 object-contain shrink-0"
          />
          <span className="text-base font-black tracking-tight text-brand-green">
            Gait Physio Clinic
          </span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navLinks.map((link) => {
            if (link.role === "admin" && user?.role !== "admin") return null;
            const isLinkActive = isActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  isLinkActive
                    ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-brand-bg/60 dark:hover:bg-slate-900/50 hover:text-brand-green dark:hover:text-white"
                }`}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout bottom */}
        <div className="border-t border-slate-100 dark:border-slate-850 p-4 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-9 w-9 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-brand-charcoal dark:text-white truncate">{user?.name}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold truncate">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile Toggle Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-955/55 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transform transition-transform duration-300 md:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2 text-brand-green font-semibold">
            <Activity className="h-6 w-6" />
            <span className="text-lg font-black text-brand-charcoal dark:text-white">GPC Portal</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navLinks.map((link) => {
            if (link.role === "admin" && user?.role !== "admin") return null;
            const isLinkActive = isActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  isLinkActive
                    ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-brand-bg/60 dark:hover:bg-slate-900/50 hover:text-brand-green dark:hover:text-white"
                }`}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-850 p-4 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-9 w-9 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-black text-brand-charcoal dark:text-white">{user?.name}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 md:px-8 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 focus:outline-none hover:text-slate-700 md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <InstallManagementAppButton />
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
                Live Connection
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 bg-brand-bg dark:bg-slate-955">
          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-page-fade {
              animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div key={pathname} className="animate-page-fade">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
