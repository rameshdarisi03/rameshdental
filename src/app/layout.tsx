import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import FloatingSocials from "@/components/public/FloatingSocials";
import PWARegistry from "@/components/PWARegistry";

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
  metadataBase: new URL("https://gaitphysioclinic.com"),
  title: {
    default: "Gait Physio Clinic in Whitefield, Bengaluru",
    template: "%s | Gait Physio Clinic",
  },
  description:
    "Specialized physiotherapy, biomechanical gait analysis, posture correction, and sports rehabilitation by Dr. Madem Kinnera in Whitefield, Bengaluru. Book online today.",
  keywords: [
    "physiotherapy clinic Whitefield",
    "physiotherapy clinic Bengaluru",
    "Gait Physio Clinic Whitefield",
    "physiotherapist near Hope Farm Whitefield",
    "gait analysis Bangalore",
    "sports injury rehabilitation ITPL",
    "posture correction Whitefield",
    "orthopedic physio Bangalore",
    "ACL rehabilitation Whitefield",
    "back pain physiotherapy ITPL Bangalore",
    "Dr. Madem Kinnera physiotherapist",
    "Dr. Kinnera Gait Physio Clinic",
  ],
  authors: [{ name: "Dr. Madem Kinnera", url: "https://gaitphysioclinic.com" }],
  creator: "Gait Physio Clinic",
  publisher: "Gait Physio Clinic",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico" },
      { url: "/images/gait_physio_logo.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/images/gait_physio_logo.png" }
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://gaitphysioclinic.com",
    title: "Gait Physio Clinic in Whitefield, Bengaluru",
    description:
      "Specialized physiotherapy, biomechanical gait analysis, sports rehabilitation, and orthopedic recovery by Dr. Madem Kinnera in Whitefield, Bengaluru.",
    siteName: "Gait Physio Clinic",
    images: [
      {
        url: "/images/hero_physio_session.webp",
        width: 1200,
        height: 630,
        alt: "Gait Physio Clinic - Specialized Physiotherapy & Biomechanical Gait Analysis in Whitefield, Bengaluru",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gait Physio Clinic in Whitefield, Bengaluru",
    description:
      "Specialized physiotherapy, biomechanical gait analysis, and rehabilitation in Whitefield, Bengaluru. Book online today.",
    images: ["/images/hero_physio_session.webp"],
  },
  alternates: {
    canonical: "https://gaitphysioclinic.com",
  },
  manifest: "/manifest.json",
};

const clinicStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "PhysiotherapyClinic",
      "@id": "https://gaitphysioclinic.com/#clinic",
      name: "Gait Physio Clinic",
      alternateName: ["Gait Physio & Rehab", "Gait Physio Clinic Whitefield"],
      url: "https://gaitphysioclinic.com",
      logo: "https://gaitphysioclinic.com/images/gait_physio_logo.png",
      image: "https://gaitphysioclinic.com/images/hero_physio_session.webp",
      description:
        "Specialized physiotherapy, biomechanical gait analysis, sports injury rehabilitation, and post-operative orthopedic recovery at Gait Physio Clinic, Whitefield, Bengaluru.",
      telephone: "+91 89044 56243",
      priceRange: "₹₹",
      address: {
        "@type": "PostalAddress",
        streetAddress:
          "Shop No. 26, 2nd Floor & Shop No. 06, 3rd Floor, ITPL Main Road, Prasanth Extension, Near Hope Farm Signal",
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
        "Physiotherapy",
        "Orthopedic Rehabilitation",
        "Sports Medicine",
        "Neurological Rehabilitation",
        "Biomechanical Gait Analysis",
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
          opens: "09:00",
          closes: "20:00",
        },
      ],
      founder: {
        "@type": "Person",
        name: "Dr. Madem Kinnera",
        jobTitle: "Lead Physiotherapist & Gait Specialist",
      },
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://gaitphysioclinic.com/book",
          inLanguage: "en-US",
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
          ],
        },
        result: {
          "@type": "MedicalReservation",
          name: "Book Physiotherapy Consultation",
        },
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://gaitphysioclinic.com/#website",
      url: "https://gaitphysioclinic.com",
      name: "Gait Physio Clinic",
      description: "Specialized Physiotherapy & Gait Analysis in Whitefield, Bengaluru",
      publisher: {
        "@id": "https://gaitphysioclinic.com/#clinic"
      },
      hasPart: [
        {
          "@type": "SiteNavigationElement",
          name: "Our Services",
          description: "Explore 7 specialized clinical treatments including sports rehab and biomechanical gait analysis",
          url: "https://gaitphysioclinic.com/services"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Book Appointment",
          description: "Schedule your consultation online with real-time slot selection",
          url: "https://gaitphysioclinic.com/book"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Patient Hub",
          description: "Access your prescribed home exercise routines, recovery plans, and treatment invoices",
          url: "https://gaitphysioclinic.com/patienthub/login"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Our Team",
          description: "Meet Dr. Madem Kinnera and the certified clinical physiotherapy specialists",
          url: "https://gaitphysioclinic.com/team"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Patient Reviews",
          description: "Read real 5-star patient recovery stories and verified Google testimonials",
          url: "https://gaitphysioclinic.com/testimonials"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Frequently Asked Questions",
          description: "Common questions about physical therapy, gait analysis, and insurance",
          url: "https://gaitphysioclinic.com/faq"
        },
        {
          "@type": "SiteNavigationElement",
          name: "Locate Us",
          description: "Clinic address near Hope Farm Signal Whitefield, map directions, and timings",
          url: "https://gaitphysioclinic.com/locate-us"
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" id="meta-theme-color" content="#0e5e6f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
