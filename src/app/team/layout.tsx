import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinical Specialists & Dental Team | Ramesh Dental Clinic",
  description:
    "Meet Dr. Ramesh Darisi and the specialist dental team at Ramesh Dental Clinic, Whitefield, Bengaluru. Advanced painless dentistry, orthodontics, and implantology.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/team",
  },
  openGraph: {
    title: "Our Clinical Team | Ramesh Dental Clinic Whitefield",
    description:
      "Expert dental surgeons specializing in Painless RCT, Dental Implants, Clear Aligners, and Cosmetic Smile Design led by Dr. Ramesh Darisi.",
    url: "https://rameshdental.vercel.app/team",
  },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
