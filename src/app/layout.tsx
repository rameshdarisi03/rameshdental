import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const signatureFont = Great_Vibes({
  variable: "--font-signature",
  subsets: ["latin"],
  weight: "400",
});

const serifFont = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gait Physio Clinic | Premium Physiotherapy & Gait Analysis",
  description: "Experience specialized physiotherapy, gait analysis, posture correction, and rehabilitation at Gait Physio Clinic. Book your appointment online today.",
  keywords: ["physiotherapy", "gait analysis", "posture correction", "sports injury rehab", "orthotics", "bangalore physiotherapy"],
};

import FloatingSocials from "@/components/public/FloatingSocials";
import PWARegistry from "@/components/PWARegistry";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${signatureFont.variable} ${serifFont.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1b3d2f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
              
              // Capture early PWA install prompts globally
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPrompt = e;
              });
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <PWARegistry />
        <Navbar />
        <main className="flex-grow flex flex-col">{children}</main>
        <FloatingSocials />
        <Footer />
      </body>
    </html>
  );
}

