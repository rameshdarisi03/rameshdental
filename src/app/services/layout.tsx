import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specialized Dental Treatments & Services | Ramesh Dental Clinic",
  description:
    "Explore advanced dental treatments including Painless Root Canal, Dental Implants, Clear Aligners, Laser Gum Therapy, Teeth Whitening, and Pediatric Dentistry at Ramesh Dental Clinic, Whitefield, Bengaluru.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/services",
  },
  openGraph: {
    title: "Clinical Dental Services | Ramesh Dental Clinic Whitefield",
    description:
      "Advanced dental care including Painless RCT, Dental Implants, Clear Aligners, and Cosmetic Dentistry led by Dr. Ramesh Darisi.",
    url: "https://rameshdental.vercel.app/services",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
