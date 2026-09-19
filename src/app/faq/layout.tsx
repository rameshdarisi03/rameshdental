import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | Physiotherapy Care",
  description:
    "Find answers to common questions about physical therapy sessions, gait analysis, session costs, doctor referrals, and insurance claims at Gait Physio Clinic, Whitefield.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/faq",
  },
  openGraph: {
    title: "Patient FAQs | Gait Physio Clinic Whitefield, Bengaluru",
    description:
      "All your questions answered: session duration, what to wear, doctor referrals, tailbone treatment, and biomechanical gait testing.",
    url: "https://gaitphysioclinic.com/faq",
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
