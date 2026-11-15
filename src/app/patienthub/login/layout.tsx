import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Hub Portal Login",
  description:
    "Securely log in to the Ramesh Dental Clinic Patient Hub. Access your personalized home exercise routines, recovery plans, and treatment invoices online.",
  manifest: "/manifest-patient.json",
  alternates: {
    canonical: "https://rameshdental.vercel.app/patienthub/login",
  },
  openGraph: {
    title: "Patient Hub Portal | Ramesh Dental Clinic",
    description:
      "Access prescribed dental exercises with video guides, attendance tracking, and official PDF billing receipts.",
    url: "https://rameshdental.vercel.app/patienthub/login",
  },
};

export default function PatientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
