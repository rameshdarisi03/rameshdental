import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinic Facility & Operatory Gallery | Ramesh Dental Clinic",
  description:
    "Explore photo gallery of Ramesh Dental Clinic facility, specialized dental operatories, digital radiography suites, and sterilization labs in Whitefield, Bengaluru.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/gallery",
  },
  openGraph: {
    title: "Clinic Facility Gallery | Ramesh Dental Clinic Whitefield",
    description:
      "Take a virtual tour of our modern dental operatories, ergonomic dental chairs, digital imaging, and comfortable lounge.",
    url: "https://rameshdental.vercel.app/gallery",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
