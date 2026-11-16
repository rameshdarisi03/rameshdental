import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | Dental Care | Ramesh Dental Clinic",
  description:
    "Find answers to common questions about root canals, dental implants, clear aligners, teeth whitening, emergency treatments, and pricing at Ramesh Dental Clinic, Whitefield.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/faq",
  },
  openGraph: {
    title: "Patient FAQs | Ramesh Dental Clinic Whitefield, Bengaluru",
    description:
      "All your questions answered: RCT duration, implant healing times, aligner costs, insurance coverage, and painless laser dentistry.",
    url: "https://rameshdental.vercel.app/faq",
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
