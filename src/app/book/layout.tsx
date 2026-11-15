import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Dental Appointment Online",
  description:
    "Schedule your in-clinic dental consultation, root canal treatment, dental implant, or clear aligner checkup at Ramesh Dental Clinic. Instant confirmation available.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/book",
  },
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
