import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Hub Portal Login",
  description:
    "Securely log in to the Gait Physio Clinic Patient Hub. Access your personalized home exercise routines, recovery plans, and treatment invoices online.",
  manifest: "/manifest-patient.json",
  alternates: {
    canonical: "https://gaitphysioclinic.com/patienthub/login",
  },
  openGraph: {
    title: "Patient Hub Portal | Gait Physio Clinic",
    description:
      "Access prescribed physiotherapy exercises with video guides, attendance tracking, and official PDF billing receipts.",
    url: "https://gaitphysioclinic.com/patienthub/login",
  },
};

export default function PatientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
