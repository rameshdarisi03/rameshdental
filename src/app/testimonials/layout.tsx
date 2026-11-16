import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Smile Stories & Testimonials | Ramesh Dental Clinic",
  description:
    "Read real patient reviews and smile transformation stories from individuals who completed root canals, dental implants, aligners, and cosmetic dentistry at Ramesh Dental Clinic.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/testimonials",
  },
};

export default function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
