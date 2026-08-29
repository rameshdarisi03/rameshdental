import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency & Urgent Physiotherapy Care",
  description:
    "Immediate clinical guidance and urgent physiotherapy care for acute sports sprains, sudden muscle spasms, and severe neck or back pain at Gait Physio Clinic.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/emergency",
  },
};

export default function EmergencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
