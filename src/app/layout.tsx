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
    default: "Gait Physio Clinic | Advanced Physiotherapy & Gait Analysis",
    template: "%s | Gait Physio Clinic",
  },
  description:
    "Experience specialized physiotherapy, biomechanical gait analysis, posture correction, and sports rehabilitation at Gait Physio Clinic. Book your session online today.",
  keywords: [
    "physiotherapy clinic Whitefield",
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
    icon: "/images/gait_physio_logo.png",
    shortcut: "/images/gait_physio_logo.png",
    apple: "/images/gait_physio_logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://gaitphysioclinic.com",
    title: "Gait Physio Clinic | Advanced Physiotherapy & Gait Analysis in Whitefield, Bangalore",
    description:
      "Specialized physiotherapy, biomechanical gait analysis, sports rehabilitation, and orthopedic recovery by Dr. Madem Kinnera in Whitefield, Bangalore.",
    siteName: "Gait Physio Clinic",
    images: [
      {
        url: "/images/hero_physio_session.webp",
        width: 1200,
        height: 630,
        alt: "Gait Physio Clinic - Specialized Physiotherapy & Biomechanical Gait Analysis in Whitefield, Bangalore",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gait Physio Clinic | Advanced Physiotherapy & Gait Analysis",
    description:
      "Specialized physiotherapy, biomechanical gait analysis, and rehabilitation in Whitefield, Bangalore. Book online today.",
    images: ["/images/hero_physio_session.webp"],
  },
  alternates: {
    canonical: "https://gaitphysioclinic.com",
  },
};

const clinicStructuredData = {
  "@context": "https://schema.org",
  "@type": "PhysiotherapyClinic",
  name: "Gait Physio Clinic",
  alternateName: "Gait Physio & Rehab",
  url: "https://gaitphysioclinic.com",
  logo: "https://gaitphysioclinic.com/images/gait_physio_logo.png",
  image: "https://gaitphysioclinic.com/images/hero_physio_session.webp",
  description:
    "Specialized physiotherapy, biomechanical gait analysis, sports injury rehabilitation, and post-operative orthopedic recovery at Gait Physio Clinic, Whitefield, Bangalore.",
  telephone: "+91 92066 51295",
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
    "Bangalore",
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
        <meta name="theme-color" id="meta-theme-color" content="#5d7a6d" />
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
                  sage: { primary: '#5d7a6d', dark: '#0f1412' },
                  teal: { primary: '#0e5e6f', dark: '#091316' },
                  royal: { primary: '#1a4b84', dark: '#0a0f1d' },
                  office: { primary: '#0078d4', dark: '#0b1320' }
                };
                var savedTheme = localStorage.getItem('gpc_public_theme') || 'sage';
                document.documentElement.setAttribute('data-theme', savedTheme);

                var isDark = localStorage.getItem('theme') === 'dark';
                if (isDark) {
                  document.documentElement.classList.add('dark');
                }

                var palette = themeColorMap[savedTheme] || themeColorMap.sage;
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
