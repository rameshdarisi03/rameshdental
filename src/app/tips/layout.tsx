import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Physiotherapy & Ergonomic Wellness Tips",
  description:
    "Expert physiotherapy advice on daily posture correction, desk ergonomics, joint pain relief, and dynamic stretching routines from Gait Physio Clinic specialists.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/tips",
  },
};

export default function TipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
