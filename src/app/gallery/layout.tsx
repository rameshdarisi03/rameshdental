import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinic Facility & Treatment Bays Gallery",
  description:
    "Explore photo gallery of Gait Physio Clinic facility, specialized electrotherapy modalities, private consultation bays, and active rehabilitation gym in Whitefield, Bengaluru.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/gallery",
  },
  openGraph: {
    title: "Clinic Facility Gallery | Gait Physio Clinic Whitefield",
    description:
      "Take a virtual tour of our modern physiotherapy clinic, advanced biomechanical equipment, and private treatment rooms.",
    url: "https://gaitphysioclinic.com/gallery",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
