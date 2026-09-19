import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinical Specialists & Physiotherapy Team",
  description:
    "Meet Dr. Madem Kinnera and the certified clinical physiotherapy team at Gait Physio Clinic, Whitefield, Bengaluru. Evidence-based care and sports rehabilitation.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/team",
  },
  openGraph: {
    title: "Our Clinical Team | Gait Physio Clinic Whitefield",
    description:
      "Expert physical therapists specializing in biomechanical gait analysis, sports medicine, orthopedic rehab, and posture correction.",
    url: "https://gaitphysioclinic.com/team",
  },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
