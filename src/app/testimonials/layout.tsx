import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Recovery Stories & Testimonials",
  description:
    "Read real patient reviews and recovery stories from individuals who transformed their mobility, cured chronic pain, and regained strength at Gait Physio Clinic.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/testimonials",
  },
};

export default function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
