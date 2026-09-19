import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specialized Physiotherapy & Rehabilitation Services",
  description:
    "Explore 7 specialized clinical treatments including biomechanical gait analysis, sports injury rehabilitation, post-surgical recovery, and orthopedic care at Gait Physio Clinic, Whitefield, Bengaluru.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/services",
  },
  openGraph: {
    title: "Clinical Physiotherapy Services | Gait Physio Clinic Whitefield",
    description:
      "Targeted rehabilitation for sports injuries, orthopedic recovery, gait correction, and chronic pain by Dr. Madem Kinnera.",
    url: "https://gaitphysioclinic.com/services",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
