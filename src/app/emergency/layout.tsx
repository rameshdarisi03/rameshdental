import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency & Urgent Dental Care | Ramesh Dental Clinic",
  description:
    "Immediate dental guidance and urgent care for acute toothaches, dental trauma, knocked-out teeth, and facial swelling at Ramesh Dental Clinic, Whitefield.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/emergency",
  },
};

export default function EmergencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
