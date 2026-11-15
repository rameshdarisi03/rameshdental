import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import FloatingSocials from "@/components/public/FloatingSocials";
import PWAGuardrail from "@/components/PWAGuardrail";
import DynamicManifest from "@/components/DynamicManifest";

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
  metadataBase: new URL("https://rameshdental.vercel.app"),
  title: {
    default: "Ramesh Dental Clinic | Multispeciality Dental & Implant Centre",
    template: "%s | Ramesh Dental Clinic",
  },
  description:
    "Advanced painless dental care, dental implants, single-visit root canal treatment (RCT), invisible clear aligners, teeth whitening, and pediatric dentistry by Dr. Ramesh Darisi in Whitefield, Bengaluru. Book your consultation online today.",
  keywords: [
    "dental clinic Whitefield",
    "dentist in Whitefield Bengaluru",
    "Ramesh Dental Clinic",
    "dental implants Bangalore",
    "root canal treatment Whitefield",
    "clear aligners Whitefield Bangalore",
    "invisalign dentist ITPL",
    "cosmetic dentistry Bangalore",
    "teeth whitening Whitefield",
    "pediatric dentist Whitefield",
    "Dr. Ramesh Darisi dentist",
    "best dental hospital Whitefield",
  ],
  authors: [{ name: "Dr. Ramesh Darisi", url: "https://rameshdental.vercel.app" }],
  creator: "Ramesh Dental Clinic",
  publisher: "Ramesh Dental Clinic",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/images/dental-emblem.jpg", sizes: "192x192", type: "image/jpeg" },
      { url: "/favicon.ico" },
      { url: "/images/dental-emblem.jpg", sizes: "512x512", type: "image/jpeg" }
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/images/dental-emblem.jpg", sizes: "180x180", type: "image/jpeg" },
      { url: "/images/dental-emblem.jpg" }
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://rameshdental.vercel.app",
    title: "Ramesh Dental Clinic | Multispeciality Dental & Implant Centre",
    description:
      "Advanced painless dental care, dental implants, root canal treatment, invisible clear aligners, and smile design by Dr. Ramesh Darisi in Whitefield, Bengaluru.",
    siteName: "Ramesh Dental Clinic",
    images: [
      {
        url: "/images/hero_dental_desktop.webp",
        width: 1200,
        height: 630,
        alt: "Ramesh Dental Clinic - Multispeciality Dental & Implant Centre in Whitefield, Bengaluru",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ramesh Dental Clinic | Multispeciality Dental & Implant Centre",
    description:
      "Advanced painless dental care, dental implants, and smile makeovers in Whitefield, Bengaluru. Book online today.",
    images: ["/images/hero_dental_desktop.webp"],
  },
  alternates: {
    canonical: "https://rameshdental.vercel.app",
  },
};

const clinicStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Dentist",
      "@id": "https://rameshdental.vercel.app/#clinic",
      name: "Ramesh Dental Clinic",
      alternateName: ["Ramesh Multispeciality Dental & Implant Centre", "Ramesh Dental Whitefield"],
      url: "https://rameshdental.vercel.app",
      logo: "https://rameshdental.vercel.app/images/dental_logo.png",
      image: "https://rameshdental.vercel.app/images/hero_dental_desktop.webp",
      description:
        "Modern dental care, painless root canal treatments, titanium dental implants, clear aligners, and cosmetic smile designing at Ramesh Dental Clinic, Whitefield, Bengaluru.",
      telephone: "+91 98765 43210",
      priceRange: "₹₹",
      address: {
        "@type": "PostalAddress",
        streetAddress:
          "Metro Pillar 142, ITPL Main Road, Prasanth Extension, Near Hope Farm Signal",
        addressLocality: "Whitefield",
        addressRegion: "Bangalore, Karnataka",
        postalCode: "560066",
        addressCountry: "IN",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 12.9847,
        longitude: 77.7523,
      },
      areaServed: [
        "Whitefield",
        "ITPL",
        "Hope Farm",
        "Kadugodi",
        "Hoodi",
        "Brookefield",
        "Mahadevapura",
        "Bengaluru",
      ],
      medicalSpecialty: [
        "Dentistry",
        "Implantology",
        "Orthodontics",
        "Endodontics",
        "Pediatric Dentistry",
        "Periodontics",
        "Cosmetic Dentistry"
      ],
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          opens: "09:30",
          closes: "20:00",
        },
      ],
      founder: {
        "@type": "Person",
        name: "Dr. Ramesh Darisi",
        jobTitle: "Chief Dental Surgeon & Implantologist",
      },
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://rameshdental.vercel.app/book",
          inLanguage: "en-US",
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
          ],
        },
        result: {
          "@type": "MedicalReservation",
          name: "Book Dental Consultation",
        },
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://rameshdental.vercel.app/#website",
      url: "https://rameshdental.vercel.app",
      name: "Ramesh Dental Clinic",
      description: "Multispeciality Dental & Implant Centre in Whitefield, Bengaluru",
      publisher: {
        "@id": "https://rameshdental.vercel.app/#clinic"
      },
      hasPart: [
        {
          "@type": "SiteNavigationElement",
          name: "Dental Services",
          description: "Explore advanced dental procedures including implants, root canals, and invisible aligners",
          url: "https://rameshdental.vercel.app/services"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Book Appointment",
          description: "Schedule your dental consultation online with instant slot booking",
          url: "https://rameshdental.vercel.app/book"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Patient Hub",
          description: "Access your prescribed home exercise routines, recovery plans, and treatment invoices",
          url: "https://rameshdental.vercel.app/patienthub/login"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Our Doctors",
          description: "Meet Dr. Ramesh Darisi and our certified dental specialists",
          url: "https://rameshdental.vercel.app/team"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Patient Reviews",
          description: "Read real 5-star patient smile transformation stories and verified Google reviews",
          url: "https://rameshdental.vercel.app/testimonials"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Frequently Asked Questions",
          description: "Common questions about root canals, invisible aligners, dental implants, and pricing",
          url: "https://rameshdental.vercel.app/faq"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Locate Us",
          description: "Clinic address near Hope Farm Signal Whitefield, Google map directions, and timings",
          url: "https://rameshdental.vercel.app/locate-us"
        }
      ]
    }
  ]
};

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
        <link rel="manifest" href="/manifest-patient.json" />
        <meta name="theme-color" id="meta-theme-color" content="#0e5e6f" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.deferredPrompt = e;
                });
              }
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(clinicStructuredData),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `

              try {
                var themeColorMap = {
                  teal: { primary: '#0e5e6f', dark: '#091316' },
                  sage: { primary: '#5d7a6d', dark: '#0f1412' },
                  royal: { primary: '#1a4b84', dark: '#0a0f1d' },
                  office: { primary: '#0078d4', dark: '#0b1320' }
                };
                var savedTheme = localStorage.getItem('gpc_public_theme') || 'teal';
                document.documentElement.setAttribute('data-theme', savedTheme);

                var isDark = false;
                var savedDark = localStorage.getItem('theme');
                if (savedDark === 'dark') {
                  isDark = true;
                } else if (savedDark === 'light') {
                  isDark = false;
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  isDark = true;
                }

                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                var palette = themeColorMap[savedTheme] || themeColorMap.teal;
                var meta = document.getElementById('meta-theme-color');
                if (meta) {
                  meta.setAttribute('content', isDark ? palette.dark : palette.primary);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <DynamicManifest />
        <PWAGuardrail />
        <Navbar />
        <main className="flex-grow flex flex-col">{children}</main>
        <FloatingSocials />
        <Footer />
      </body>
    </html>
  );
}
