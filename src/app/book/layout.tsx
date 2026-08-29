import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Physiotherapy Appointment Online",
  description:
    "Schedule your in-clinic physiotherapy consultation, biomechanical gait analysis, or rehabilitation session at Gait Physio Clinic. Instant confirmation available.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/book",
  },
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
